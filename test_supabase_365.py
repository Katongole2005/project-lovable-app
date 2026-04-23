from database import MovieDatabase

def check_365_days():
    db = MovieDatabase()
    
    # query supabase using their REST client
    try:
        response = db._request("GET", "/movies", params={"title": "ilike.*365*Days*"})
        if response and response.status_code == 200:
            movies = response.json()
            if not movies:
                print("No movies found matching '365 Days'")
            for movie in movies:
                print(f"ID: {movie.get('id')}")
                print(f"Title: {movie.get('title')}")
                print(f"Type: {movie.get('type')}")
                print(f"Mobifliks ID: {movie.get('mobifliks_id')}")
                print(f"Download URL: {movie.get('download_url')}")
                print("-" * 40)
        else:
            print(f"Failed to fetch: {response.status_code if response else 'No response'} - {response.text if response else ''}")
    except Exception as e:
        print(f"Error querying supabase: {e}")

if __name__ == "__main__":
    check_365_days()
