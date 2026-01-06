import json
import os
from datetime import datetime
import psycopg2
from psycopg2.extras import RealDictCursor

def handler(event: dict, context) -> dict:
    """API для работы с обещаниями пользователей"""
    
    method = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    try:
        user_id = get_user_id_from_token(event)
        
        if method == 'GET':
            return get_promises(user_id, event)
        elif method == 'POST':
            return create_promise(user_id, event)
        elif method == 'PUT':
            return update_promise(user_id, event)
        else:
            return {
                'statusCode': 405,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Method not allowed'}),
                'isBase64Encoded': False
            }
            
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': str(e)}),
            'isBase64Encoded': False
        }

def get_user_id_from_token(event: dict) -> int:
    """Извлечение user_id из токена (упрощенная версия)"""
    auth_header = event.get('headers', {}).get('Authorization', '')
    if not auth_header:
        raise Exception('Authorization required')
    
    token = auth_header.replace('Bearer ', '')
    parts = token.split(':')
    if len(parts) < 2:
        raise Exception('Invalid token')
    
    telegram_id = int(parts[0])
    
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        cur.execute("SELECT id FROM users WHERE telegram_id = %s", (telegram_id,))
        user = cur.fetchone()
        if not user:
            raise Exception('User not found')
        return user['id']
    finally:
        cur.close()
        conn.close()

def get_promises(user_id: int, event: dict) -> dict:
    """Получение обещаний пользователя"""
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        cur.execute("""
            SELECT * FROM promises 
            WHERE user_id = %s 
            ORDER BY created_at DESC
        """, (user_id,))
        
        promises = cur.fetchall()
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps([dict(p) for p in promises], default=str),
            'isBase64Encoded': False
        }
    finally:
        cur.close()
        conn.close()

def create_promise(user_id: int, event: dict) -> dict:
    """Создание нового обещания"""
    body = json.loads(event.get('body', '{}'))
    
    title = body.get('title', '').strip()
    description = body.get('description', '').strip()
    deadline = body.get('deadline')
    category = body.get('category', 'personal')
    is_public = body.get('is_public', True)
    
    if not title or not deadline:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'title and deadline are required'}),
            'isBase64Encoded': False
        }
    
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        cur.execute("""
            INSERT INTO promises (user_id, title, description, deadline, category, is_public)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING *
        """, (user_id, title, description, deadline, category, is_public))
        
        promise = cur.fetchone()
        
        cur.execute("""
            INSERT INTO activity_feed (user_id, promise_id, activity_type)
            VALUES (%s, %s, 'created')
        """, (user_id, promise['id']))
        
        check_and_unlock_achievement(cur, user_id, 'first_promise')
        
        conn.commit()
        
        return {
            'statusCode': 201,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps(dict(promise), default=str),
            'isBase64Encoded': False
        }
    finally:
        cur.close()
        conn.close()

def update_promise(user_id: int, event: dict) -> dict:
    """Обновление обещания"""
    body = json.loads(event.get('body', '{}'))
    
    promise_id = body.get('id')
    status = body.get('status')
    progress = body.get('progress')
    
    if not promise_id:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'promise id is required'}),
            'isBase64Encoded': False
        }
    
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        updates = []
        params = []
        
        if status:
            updates.append("status = %s")
            params.append(status)
            if status == 'completed':
                updates.append("completed_at = NOW()")
                updates.append("progress = 100")
        
        if progress is not None:
            updates.append("progress = %s")
            params.append(progress)
        
        updates.append("updated_at = NOW()")
        params.extend([promise_id, user_id])
        
        cur.execute(f"""
            UPDATE promises 
            SET {', '.join(updates)}
            WHERE id = %s AND user_id = %s
            RETURNING *
        """, params)
        
        promise = cur.fetchone()
        
        if not promise:
            conn.rollback()
            return {
                'statusCode': 404,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Promise not found'}),
                'isBase64Encoded': False
            }
        
        if status == 'completed':
            cur.execute("""
                INSERT INTO activity_feed (user_id, promise_id, activity_type)
                VALUES (%s, %s, 'completed')
            """, (user_id, promise_id))
            
            check_and_unlock_achievement(cur, user_id, 'first_complete')
        
        conn.commit()
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps(dict(promise), default=str),
            'isBase64Encoded': False
        }
    finally:
        cur.close()
        conn.close()

def check_and_unlock_achievement(cur, user_id: int, achievement_key: str):
    """Проверка и разблокировка достижения"""
    cur.execute("SELECT id FROM achievements WHERE key = %s", (achievement_key,))
    achievement = cur.fetchone()
    
    if achievement:
        cur.execute("""
            INSERT INTO user_achievements (user_id, achievement_id)
            VALUES (%s, %s)
            ON CONFLICT (user_id, achievement_id) DO NOTHING
        """, (user_id, achievement['id']))
