from scraper import MobifliksMirrorScraper
from config import USERNAME, PHONE_NUMBER, COUNTRY_CODE
import os

def debug_series_page():
    scraper = MobifliksMirrorScraper(
        username=USERNAME,
        phone=PHONE_NUMBER,
        country_code=COUNTRY_CODE
    )
    
    if not scraper.login_success:
        print("Login failed")
        return

    # Let's try to get the first series from the series page
    resp = scraper.get("https://www.mobifliks.com/displayseries2.php")
    from bs4 import BeautifulSoup
    soup = BeautifulSoup(resp.text, 'html.parser')
    
    # Find a series link
    link = soup.find("a", href=True, string=lambda s: s and "Season" in s)
    if not link:
        link = soup.find("a", href=re.compile(r"series_id="))
    
    if link:
        series_url = scraper.make_absolute_url(link['href'])
        print(f"Fetching series page: {series_url}")
        resp = scraper.get(series_url)
        
        with open("debug_series_page.html", "w", encoding="utf-8") as f:
            f.write(resp.text)
        print("Saved debug_series_page.html")
    else:
        print("Could not find a series link")

if __name__ == "__main__":
    debug_series_page()
