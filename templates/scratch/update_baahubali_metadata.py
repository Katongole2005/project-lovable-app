import os
import sys
import json
from datetime import datetime
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..')))

from database import MovieDatabase
from tmdb_posters import TmdbPosterFetcher

def main():
    db = MovieDatabase()
    fetcher = TmdbPosterFetcher.from_env()
    if not fetcher:
        print("ERROR: TMDB_API_KEY is not set.")
        return

    tmdb_id = 256040  # Baahubali: The Beginning (2015)
    print(f"Fetching TMDB details for ID {tmdb_id}...")
    
    details = fetcher.fetch_details(tmdb_id, media_type="movie")
    cast = fetcher.fetch_cast(tmdb_id, media_type="movie", limit=15)
    cert = fetcher.fetch_certification(tmdb_id, media_type="movie", region="US")
    logo = fetcher.fetch_logo(tmdb_id, media_type="movie")
    
    print("Fetched Details:")
    print("- Title:", details.get("title") or "Baahubali: The Beginning")
    print("- Release Date:", details.get("release_date"))
    print("- Runtime:", details.get("runtime_minutes"))
    print("- Genres:", details.get("genres"))
    print("- Certification:", cert)
    print("- Logo URL:", logo)

    # Compile TMDB payload inside raw_data
    tmdb_payload = {
        "id": tmdb_id,
        "media_type": "movie",
        "title": details.get("title") or "Baahubali: The Beginning",
        "year": 2015,
        "poster_url": details.get("poster_url"),
        "cast": cast,
        "details": details,
        "certification": cert
    }
    if logo:
        if "details" not in tmdb_payload or tmdb_payload["details"] is None:
            tmdb_payload["details"] = {}
        tmdb_payload["details"]["logo_url"] = logo

    # Fetch rows to update
    target_ids = [3674, 182326]
    for row_id in target_ids:
        # Get existing movie to preserve raw_data structure
        # (since get_movie_by_id takes mobifliks_id, we search instead)
        movies, _ = db.search_movies("Baahubali")
        movie = next((m for m in movies if m.get("id") == row_id), None)
        if not movie:
            print(f"WARNING: Movie row ID {row_id} not found in database.")
            continue
            
        print(f"\nUpdating row ID {row_id} ({movie.get('title')})...")
        
        # Load and update raw_data
        raw_data = db._load(movie.get("raw_data"), {})
        if not isinstance(raw_data, dict):
            raw_data = {}
        raw_data["tmdb"] = tmdb_payload
        raw_data["tmdb_id"] = tmdb_id
        
        stars = [c.get("name") for c in cast if c.get("name")]
        
        payload = {
            "title": "Baahubali: The Beginning",
            "year": 2015,
            "release_date": details.get("release_date") or "2015-07-10",
            "description": details.get("overview") or movie.get("description"),
            "stars": stars,
            "cast": cast,
            "genres": details.get("genres") or movie.get("genres"),
            "backdrop_url": details.get("backdrop_url") or movie.get("backdrop_url"),
            "image_url": details.get("poster_url") or movie.get("image_url"),
            "certification": cert or movie.get("certification"),
            "runtime_minutes": details.get("runtime_minutes") or movie.get("runtime_minutes"),
            "raw_data": raw_data,
            "last_updated": datetime.now().isoformat()
        }
        
        success = db.update_movie(row_id, payload)
        if success:
            print(f"SUCCESS: Updated row ID {row_id} successfully.")
        else:
            print(f"FAILED: Could not update row ID {row_id}.")
            
    db.close()

if __name__ == '__main__':
    main()
