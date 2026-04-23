import requests
import os
from dotenv import load_dotenv

load_dotenv()

url = os.getenv("SUPABASE_URL", "").strip().strip('"\'')
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip().strip('"\'')

if not key:
    key = os.getenv("SUPABASE_KEY", "").strip().strip('"\'')

print(f"URL: {url}")
print(f"Key starts with: {key[:30]}...")

headers = {
    "apikey": key,
    "Authorization": f"Bearer {key}",
    "Content-Type": "application/json"
}

response = requests.get(
    f"{url}/rest/v1/movies",
    params={"title": "ilike.*365*", "limit": "5"},
    headers=headers,
    timeout=15
)

print(f"Status: {response.status_code}")
if response.status_code == 200:
    movies = response.json()
    print(f"Found {len(movies)} movies matching '365':")
    for m in movies:
        print(f"  - {m.get('title')} | URL: {m.get('download_url', '')[:60]}")
else:
    print(f"Error: {response.text[:300]}")
