from scraper import MobifliksMirrorScraper
from config import USERNAME, PHONE_NUMBER, COUNTRY_CODE
from bs4 import BeautifulSoup

def debug_season_page():
    scraper = MobifliksMirrorScraper(
        username=USERNAME,
        phone=PHONE_NUMBER,
        country_code=COUNTRY_CODE
    )
    
    if not scraper.login_success:
        print("Login failed")
        return

    url = "https://www.mobifliks.com/series-season.php?season_name=1&cat_id=2156&series_id=1452&series_name=The Night Agent Season 2 (2026 - VJ Junior - Luganda)"
    print(f"Fetching season page: {url}")
    resp = scraper.get(url)
    
    with open("debug_season_page.html", "w", encoding="utf-8") as f:
        f.write(resp.text)
    print("Saved debug_season_page.html")

if __name__ == "__main__":
    debug_season_page()
