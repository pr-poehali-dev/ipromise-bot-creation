import json
import os
import hashlib
import hmac
from datetime import datetime, timedelta
import psycopg2
from psycopg2.extras import RealDictCursor

def handler(event: dict, context) -> dict:
    """API для авторизации через Telegram WebApp"""
    
    method = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    if method != 'POST':
        return {
            'statusCode': 405,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Method not allowed'}),
            'isBase64Encoded': False
        }
    
    try:
        body = json.loads(event.get('body', '{}'))
        init_data = body.get('initData', '')
        
        if not init_data:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'initData is required'}),
                'isBase64Encoded': False
            }
        
        bot_token = os.environ.get('TELEGRAM_BOT_TOKEN', '')
        if not bot_token:
            return {
                'statusCode': 500,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Bot token not configured'}),
                'isBase64Encoded': False
            }
        
        user_data = parse_init_data(init_data)
        is_valid = verify_telegram_data(init_data, bot_token)
        
        if not is_valid:
            return {
                'statusCode': 401,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Invalid Telegram data'}),
                'isBase64Encoded': False
            }
        
        user = save_or_update_user(user_data)
        token = generate_token(user['telegram_id'])
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({
                'success': True,
                'token': token,
                'user': {
                    'id': user['id'],
                    'telegram_id': user['telegram_id'],
                    'username': user.get('username'),
                    'first_name': user.get('first_name'),
                    'last_name': user.get('last_name'),
                    'photo_url': user.get('photo_url')
                }
            }),
            'isBase64Encoded': False
        }
        
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': str(e)}),
            'isBase64Encoded': False
        }

def parse_init_data(init_data: str) -> dict:
    """Парсинг Telegram initData"""
    params = {}
    for item in init_data.split('&'):
        if '=' in item:
            key, value = item.split('=', 1)
            params[key] = value
    
    user_json = params.get('user', '{}')
    import urllib.parse
    user_json = urllib.parse.unquote(user_json)
    user_data = json.loads(user_json)
    
    return user_data

def verify_telegram_data(init_data: str, bot_token: str) -> bool:
    """Проверка подлинности данных от Telegram"""
    try:
        params = {}
        for item in init_data.split('&'):
            if '=' in item:
                key, value = item.split('=', 1)
                params[key] = value
        
        received_hash = params.pop('hash', '')
        
        data_check_string = '\n'.join(f'{k}={v}' for k, v in sorted(params.items()))
        
        secret_key = hmac.new(
            key=b'WebAppData',
            msg=bot_token.encode(),
            digestmod=hashlib.sha256
        ).digest()
        
        calculated_hash = hmac.new(
            key=secret_key,
            msg=data_check_string.encode(),
            digestmod=hashlib.sha256
        ).hexdigest()
        
        return calculated_hash == received_hash
    except:
        return False

def save_or_update_user(user_data: dict) -> dict:
    """Сохранение или обновление пользователя в БД"""
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        cur.execute("""
            INSERT INTO users (telegram_id, username, first_name, last_name, photo_url, updated_at)
            VALUES (%s, %s, %s, %s, %s, NOW())
            ON CONFLICT (telegram_id) 
            DO UPDATE SET 
                username = EXCLUDED.username,
                first_name = EXCLUDED.first_name,
                last_name = EXCLUDED.last_name,
                photo_url = EXCLUDED.photo_url,
                updated_at = NOW()
            RETURNING *
        """, (
            user_data.get('id'),
            user_data.get('username'),
            user_data.get('first_name'),
            user_data.get('last_name'),
            user_data.get('photo_url')
        ))
        
        user = cur.fetchone()
        conn.commit()
        
        return dict(user)
    finally:
        cur.close()
        conn.close()

def generate_token(telegram_id: int) -> str:
    """Генерация JWT-подобного токена"""
    secret = os.environ.get('TELEGRAM_BOT_TOKEN', 'secret')
    expires = int((datetime.now() + timedelta(days=30)).timestamp())
    data = f"{telegram_id}:{expires}"
    signature = hmac.new(secret.encode(), data.encode(), hashlib.sha256).hexdigest()
    return f"{data}:{signature}"
