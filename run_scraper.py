#!/usr/bin/env python3
# run_scraper.py
from scraper import MobifliksMirrorScraper
from config import USERNAME, PHONE_NUMBER, COUNTRY_CODE
import schedule
import time
import os

def run_scraping_job():
    print("[INFO] Starting scheduled scraping job...")
    scraper = MobifliksMirrorScraper(
        username=USERNAME,
        phone=PHONE_NUMBER,
        country_code=COUNTRY_CODE
    )
    scraper.run_full_scrape()
    print("[OK] Scraping job completed")

if __name__ == "__main__":
    run_scraping_job()
    schedule.every(6).hours.do(run_scraping_job)
    print("[INFO] Scraper scheduled to run every 6 hours")
    while True:
        schedule.run_pending()
        time.sleep(60)
