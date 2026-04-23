import urllib.parse
from bs4 import BeautifulSoup
from scraper import MobifliksMirrorScraper
from config import USERNAME, PHONE_NUMBER, COUNTRY_CODE

def fix_365_days():
    scraper = MobifliksMirrorScraper(
        username=USERNAME,
        phone=PHONE_NUMBER,
        country_code=COUNTRY_CODE
    )
    
    if not scraper.login_success:
        print("Login failed, aborting.")
        return
        
    targets = [
        {"mid": "6883", "title": "365 Days: This Day (2022 - English)"},
        {"mid": "3879", "title": "365 Days (2020)"}
    ]
    
    for target in targets:
        title = target["title"]
        mid = target["mid"]
        
        # We assume category English -> cat_id = 2
        encoded_title = urllib.parse.quote(title)
        cat_id = "2"
        
        video_page_url = f"https://www.mobifliks.com/downloadvideo2.php?vid_id={mid}&vid_name={encoded_title}&cat_id={cat_id}"
        print(f"Scraping details for {title}...")
        
        dl_url, desc, meta = scraper.scrape_movie_details(video_page_url)
        print(f"New Download URL found: {dl_url}")
        
        if dl_url and 'downloadmp4.php' in dl_url:
            # Save the fixed version to the database
            movie_data = {
                "mobifliks_id": mid,
                "title": title,
                "type": "movie",
                "download_url": dl_url,
                "description": desc,
                "video_page_url": video_page_url,
                "genres": meta.get("genres", []),
                "stars": meta.get("stars", []),
                "director": meta.get("director", ""),
                "views": meta.get("views", 0),
                "file_size": meta.get("file_size", "")
            }
            # We just want to fix the download_url
            scraper.db.save_movie(movie_data)
            print(f"Successfully verified and patched {title}")
        else:
            print(f"Failed to extract valid proxy link for {title}")

if __name__ == "__main__":
    fix_365_days()
