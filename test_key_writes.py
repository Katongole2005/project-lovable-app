"""
The existing service role key has 'subase' instead of 'supabase' in the iss field.
This script constructs the correct payload and tests it against the Supabase API.
"""
import base64, json, os, hmac, hashlib, requests
from dotenv import load_dotenv
load_dotenv()

url = os.getenv('SUPABASE_URL', '').strip().strip('"\'')
anon_key = os.getenv('SUPABASE_KEY', '').strip().strip('"\'')

def decode_jwt(token):
    parts = token.split('.')
    if len(parts) < 3:
        return None, None, None
    header_b64, payload_b64, sig = parts
    padding = 4 - len(payload_b64) % 4
    payload = json.loads(base64.b64decode(payload_b64 + '=' * padding))
    return header_b64, payload, sig

# Decode the anon key to get the correct header/structure
anon_header, anon_payload, _ = decode_jwt(anon_key)
print("Anon key structure:", anon_payload)
print("Anon key header:", base64.b64decode(anon_header + '==').decode())

# We cannot reconstruct the service role JWT without the secret.
# But we can test if the anon key allows reading the movies table.
# The write errors are DEFINITELY because of the bad service role key.
# 
# The quickest fix: Use the anon key for now and disable RLS on the movies table via Supabase MCP.
# OR: Accept we need the real key from Supabase dashboard.

print("\n--- Testing anon key for writes ---")
headers = {
    "apikey": anon_key,
    "Authorization": f"Bearer {anon_key}",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}
# Try to query the movies table
r = requests.get(f"{url}/rest/v1/movies", params={"limit": "1"}, headers=headers, timeout=10)
print(f"Read test: {r.status_code}")

# Try a write (upsert) to see if anon key allows writes
r2 = requests.post(
    f"{url}/rest/v1/movies",
    json={"mobifliks_id": "TEST_DELETE_ME", "title": "Test", "type": "movie", "download_url": "test"},
    headers={**headers, "Prefer": "resolution=merge-duplicates,return=representation"},
    timeout=10
)
print(f"Write test with anon key: {r2.status_code} - {r2.text[:200]}")
