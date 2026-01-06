import json
import os
import psycopg2
from psycopg2.extras import RealDictCursor

def handler(event: dict, context) -> dict:
    """API для получения публичной ленты активности всех пользователей"""
    
    method = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    if method != 'GET':
        return {
            'statusCode': 405,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Method not allowed'}),
            'isBase64Encoded': False
        }
    
    try:
        params = event.get('queryStringParameters') or {}
        limit = int(params.get('limit', '50'))
        offset = int(params.get('offset', '0'))
        
        conn = psycopg2.connect(os.environ['DATABASE_URL'])
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        try:
            cur.execute("""
                SELECT 
                    af.id,
                    af.activity_type,
                    af.created_at,
                    u.id as user_id,
                    u.first_name,
                    u.last_name,
                    u.username,
                    u.photo_url,
                    p.id as promise_id,
                    p.title as promise_title,
                    p.category as promise_category,
                    p.is_public
                FROM activity_feed af
                JOIN users u ON af.user_id = u.id
                LEFT JOIN promises p ON af.promise_id = p.id
                WHERE p.is_public = true OR p.is_public IS NULL
                ORDER BY af.created_at DESC
                LIMIT %s OFFSET %s
            """, (limit, offset))
            
            activities = cur.fetchall()
            
            result = []
            for activity in activities:
                result.append({
                    'id': activity['id'],
                    'type': activity['activity_type'],
                    'created_at': activity['created_at'].isoformat(),
                    'user': {
                        'id': activity['user_id'],
                        'first_name': activity['first_name'],
                        'last_name': activity['last_name'],
                        'username': activity['username'],
                        'photo_url': activity['photo_url']
                    },
                    'promise': {
                        'id': activity['promise_id'],
                        'title': activity['promise_title'],
                        'category': activity['promise_category']
                    } if activity['promise_id'] else None
                })
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({
                    'activities': result,
                    'limit': limit,
                    'offset': offset,
                    'count': len(result)
                }),
                'isBase64Encoded': False
            }
            
        finally:
            cur.close()
            conn.close()
            
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': str(e)}),
            'isBase64Encoded': False
        }
