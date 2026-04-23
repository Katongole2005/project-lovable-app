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
    category = "Luganda Translated Movies"
    
    encoded_title = urllib.parse.quote(title)
    cat_id = "4" # luggage
    video_page_url = f"https://www.mobifliks.com/downloadvideo2.php?vid_id={mid}&vid_name={encoded_title}&cat_id={cat_id}"
    print(f"Testing URL: {video_page_url}")
    
    resp = scraper.get(video_page_url)
    if resp:
        soup = BeautifulSoup(resp.text, 'html.parser')
        dl_url = scraper.extract_download_url(soup)
        
        print("\n--- RESULTS ---")
        print(f"Movie: {title}")
        print(f"Extracted Download URL: {dl_url}")
        if 'downloadmp4.php' in dl_url or '.mp4' in dl_url:
            print("Status: VALID (Link should play correctly)")
            
            # Additional check: get the actual raw .mp4 link from the downloadmp4.php page
            if 'downloadmp4.php' in dl_url:
                dl_page_resp = scraper.get(dl_url)
                if dl_page_resp:
                    dl_soup = BeautifulSoup(dl_page_resp.text, 'html.parser')
                    buttons = dl_soup.find_all('a')
                    for btn in buttons:
                        href = btn.get('href', '')
                        if href.endswith('.mp4'):
                            print(f"Resolved raw file: {href}")
                            break
        else:
            print("Status: INVALID (Link missing or not a direct media format)")
            
if __name__ == "__main__":
    run_targeted_test()
