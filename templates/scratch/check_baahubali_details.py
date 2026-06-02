import os
import sys
import json
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..')))

from database import MovieDatabase

def main():
    db = MovieDatabase()
    movies, count = db.search_movies("Baahubali")
    
    print(f"Found {len(movies)} movies.")
    for m in movies:
        print("=============================================")
        print(f"ID: {m.get('id')}")
        print(f"Title: {m.get('title')}")
        print(f"Mobifliks ID: {m.get('mobifliks_id')}")
        print(f"Year: {m.get('year')}")
        print(f"Release Date: {m.get('release_date')}")
        print(f"VJ: {m.get('vj_name')}")
        print(f"TMDB ID: {m.get('tmdb_id')}")
        print(f"Download URL: {m.get('download_url')}")
        print(f"Server 2 URL: {m.get('server2_url')}")
        print(f"Description: {m.get('description')}")
        print(f"Genres: {m.get('genres')}")
        print(f"Stars: {m.get('stars')}")
        print("Raw Data Keys:", list(m.get('raw_data', {}).keys()) if m.get('raw_data') else "None")
        if m.get('raw_data'):
            # Pretty print raw_data excluding large items if any
            raw = dict(m.get('raw_data'))
            print("Raw Data:", json.dumps(raw, indent=2))
        
    db.close()

if __name__ == '__main__':
    main()
