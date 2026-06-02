import os
import sys
import requests
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..')))

from database import MovieDatabase

def get_content_length(url):
    if not url:
        return "No URL"
    try:
        resp = requests.head(url, timeout=10, allow_redirects=True)
        size = resp.headers.get('Content-Length')
        if size:
            return f"{int(size) / (1024*1024):.2f} MB"
        return "Unknown size (no Content-Length)"
    except Exception as e:
        return f"Error: {e}"

def main():
    db = MovieDatabase()
    movies, count = db.search_movies("Baahubali")
    for m in movies:
        print("=============================================")
        print(f"ID: {m.get('id')}")
        print(f"Title: {m.get('title')}")
        print(f"Download URL: {m.get('download_url')}")
        print(f"Download URL Size: {get_content_length(m.get('download_url'))}")
        print(f"Server 2 URL: {m.get('server2_url')}")
        print(f"Server 2 URL Size: {get_content_length(m.get('server2_url'))}")
    db.close()

if __name__ == '__main__':
    main()
