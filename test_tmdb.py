"""Quick TMDB health check before scraping."""
from tmdb_posters import TmdbPosterFetcher
import os
from dotenv import load_dotenv
load_dotenv()

api_key = os.getenv("TMDB_API_KEY", "")
print(f"TMDB API Key: {api_key[:10]}..." if api_key else "TMDB_API_KEY not set!")

tmdb = TmdbPosterFetcher.from_env()
if not tmdb:
    print("ERROR: TmdbPosterFetcher.from_env() returned None — check TMDB_API_KEY in .env")
    exit(1)

print("TmdbPosterFetcher initialized OK\n")

# Test 1: Movie poster
tests = [
    {"title": "365 Days", "year": 2020, "type": "movie"},
    {"title": "Sikandar 2", "year": 2025, "type": "movie"},
    {"title": "Game of Thrones", "year": None, "type": "tv"},
]

for t in tests:
    print(f"Searching: [{t['type']}] {t['title']} ({t['year'] or 'any year'})")
    try:
        result = tmdb.find_poster(t["title"], t["year"], media_type=t["type"])
        if result:
            print(f"  [OK] Found: {result.title} ({result.year})")
            print(f"       Poster: {result.url[:80]}...")
            print(f"       TMDB ID: {result.tmdb_id}")
        else:
            print(f"  [MISS] No result found for {t['title']}")
    except Exception as e:
        print(f"  [ERROR] {e}")
    print()

# Test 2: Fetch full details for a known movie
print("Testing fetch_details (full metadata)...")
try:
    details = tmdb.fetch_details(550, media_type="movie")  # Fight Club TMDB ID
    if details:
        print(f"  [OK] Fight Club details: {details.get('overview', '')[:80]}...")
        print(f"       Genres: {details.get('genres', [])}")
        print(f"       Runtime: {details.get('runtime_minutes')} min")
    else:
        print("  [MISS] No details returned")
except Exception as e:
    print(f"  [ERROR] {e}")

print("\nTMDB is READY to scrape!")
