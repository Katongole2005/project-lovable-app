from scraper import MobifliksMirrorScraper
from config import USERNAME, PHONE_NUMBER, COUNTRY_CODE
from bs4 import BeautifulSoup
import os

def run_targeted_test():
    scraper = MobifliksMirrorScraper(
        username=USERNAME,
        phone=PHONE_NUMBER,
        country_code=COUNTRY_CODE
    )
    
    if not scraper.login_success:
        print("Login failed, aborting test.")
        return
        
    # Specifically target "The Night Agent Season 2" which we know has season links
    series_url = "https://www.mobifliks.com/downloadseries2.php?series_id=1452&series_name=The Night Agent Season 2 (2026 - VJ Junior - Luganda)"
    print(f"\n--- TARGETED TEST: {series_url} ---")
    
    series_data = {
        "mobifliks_id": "series_1452",
        "title": "The Night Agent Season 2",
        "details_url": series_url,
        "category": "series_luganda"
    }
    
    # We call scrape_series_episodes which now includes season diving
    results = scraper.scrape_series_episodes(series_data, force_update=True)
    
    print("\n--- TEST RESULTS ---")
    if results:
        main_series = results[0]
        print(f"Series: {main_series.get('title')}")
        print(f"Description: {main_series.get('description')[:100]}...")
        
        # Check database for episodes (scrape_series_episodes saves them directly)
        episodes = scraper.db.get_series_episodes("series_1452")
        print(f"Found {len(episodes)} episodes in database.")
        
        for ep in sorted(episodes, key=lambda x: x.get('episode_number', 0))[:5]:
            print(f"  E{ep.get('episode_number')}: {ep.get('title')}")
            print(f"    Download: {ep.get('download_url')}")
            print(f"    Playable: {'Yes' if 'file=' in ep.get('download_url', '') or '.mp4' in ep.get('download_url', '') else 'No'}")
    else:
        print("No results found.")

if __name__ == "__main__":
    run_targeted_test()
