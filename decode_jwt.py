import base64, json, os
from dotenv import load_dotenv
load_dotenv()

def decode_jwt(token):
    token = token.strip().strip('"\'')
    parts = token.split('.')
    if len(parts) >= 2:
        padding = 4 - len(parts[1]) % 4
        try:
            return json.loads(base64.b64decode(parts[1] + '=' * padding))
        except Exception as e:
            return {"error": str(e)}
    return {}

anon = os.getenv('SUPABASE_KEY', '')
svc = os.getenv('SUPABASE_SERVICE_ROLE_KEY', '')

print("Anon key payload:", decode_jwt(anon))
print()
print("Service role key payload:", decode_jwt(svc))
print()
print("Service role key (full):", repr(svc))
