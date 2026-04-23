from scraper import MobifliksMirrorScraper
from config import USERNAME, PHONE_NUMBER, COUNTRY_CODE
import urllib.parse
from bs4 import BeautifulSoup
import re

def run_targeted_test():
    scraper = MobifliksMirrorScraper(
        username=USERNAME,
        phone=PHONE_NUMBER,
        country_code=COUNTRY_CODE
    )
    
    if not scraper.login_success:
        print("Login failed, aborting test.")
        return
        
    title = "Sikandar 2 (2025 - VJ Emmy - Luganda)"
    mid = "9636"
    
    # URL without vid_name and cat_id
    video_page_url = f"https://www.mobifliks.com/downloadvideo2.php?vid_id={mid}"
    print(f"Testing URL: {video_page_url}")
    
    resp = scraper.get(video_page_url)
    if resp:
        soup = BeautifulSoup(resp.text, 'html.parser')
        dl_url = scraper.extract_download_url(soup)
        
        print("\n--- RESULTS ---")
        print(f"Movie: {title}")
        print(f"Extracted Download URL: {dl_url}")
            
if __name__ == "__main__":
    run_targeted_test()
