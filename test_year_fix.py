"""Test year extraction + TMDB fix for 'Tow (2022 - English)'"""
from scraper import MobifliksMirrorScraper
from config import USERNAME, PHONE_NUMBER, COUNTRY_CODE

scraper = MobifliksMirrorScraper(USERNAME, PHONE_NUMBER, COUNTRY_CODE)

test_titles = [
    "Tow (2022 - English)",
    "Tow (2022 - VJ Soul - Luganda)",
    "365 Days (2020 - VJ Junior - Luganda)",
    "Game of Thrones",             # No year in title — should still work
    "Money Heist (2017 - Luganda)",
    "Blue Eyed Girl (2025 - VJ Ulio - Luganda)",
    "Wild Hogs (2007 - VJ Junior - Luganda)",
]

print("=== Year Extraction & Title Cleaning Tests ===\n")
for raw in test_titles:
    year = scraper.extract_year_from_title(raw)
    clean = scraper.clean_title_for_tmdb(raw)
    print(f"Raw:   {raw!r}")
    print(f"Year:  {year}")
    print(f"Clean: {clean!r}")
    
    # Search TMDB with extracted data
    if scraper.tmdb:
        mtype = "tv" if "thrOne" in raw.lower() or "heist" in raw.lower() else "movie"
        result = scraper.tmdb.find_poster(clean, year, media_type=mtype)
        if result:
            print(f"TMDB:  [{result.year}] {result.title} — {result.url[:60]}...")
        else:
            print(f"TMDB:  [MISS] No match found")
    print()
