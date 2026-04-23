from scraper import MobifliksMirrorScraper
from config import USERNAME, PHONE_NUMBER, COUNTRY_CODE
from bs4 import BeautifulSoup

scraper = MobifliksMirrorScraper(USERNAME, PHONE_NUMBER, COUNTRY_CODE)

path = "displayvideos2.php?cat_id=4&category=Luganda%20Translated%20Movies"
page_url = scraper.make_absolute_url(path)
print(f"Page 1 URL: {page_url}")

resp = scraper.get(page_url)
soup = BeautifulSoup(resp.text, "html.parser")

# Check what page links exist
next_url = scraper.get_next_page_url(soup, page_url, current_page=1)
print(f"Next page URL detected: {next_url}")

built = scraper.build_paged_url(page_url, 2)
print(f"Built page 2 URL: {built}")

# Count movies found on page 1
containers = scraper.extract_movie_containers(soup)
print(f"Containers on page 1: {len(containers)}")

# Show all pagination links found
all_links = soup.find_all("a", href=True)
print(f"\nAll links with 'page' in href:")
for link in all_links:
    href = link.get("href", "")
    if "page=" in href:
        print(f"  {link.get_text(strip=True)!r}: {href}")
