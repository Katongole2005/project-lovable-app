import os
import sys
import json
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..')))

from database import MovieDatabase

def main():
    db = MovieDatabase()
    print("Querying detailed database fields for 'Baahubali'...")
    movies, count = db.search_movies("Baahubali")
    
    for m in movies:
        print("=============================================")
        print(f"Title: {m.get('title')}")
        print(f"ID: {m.get('id')}")
        print(f"Mobifliks ID: {m.get('mobifliks_id')}")
        print(f"Year: {m.get('year')}")
        print(f"Release Date: {m.get('release_date')}")
        print(f"VJ: {m.get('vj_name')}")
        print(f"TMDB ID: {m.get('tmdb_id')}")
        print(f"Download URL: {m.get('download_url')}")
        print(f"Server 2 URL: {m.get('server2_url')}")
        print(f"Video Page URL: {m.get('video_page_url')}")
        print(f"Starring: {m.get('stars')}")
        
    db.close()

if __name__ == '__main__':
    main()
