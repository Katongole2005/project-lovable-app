#!/usr/bin/env python3
import os
import re
import time
import random
import logging
from datetime import datetime
import hashlib

import requests
from bs4 import BeautifulSoup
import urllib3

from config import USERNAME, PHONE_NUMBER, COUNTRY_CODE
from database import MovieDatabase
from tmdb_posters import TmdbPosterFetcher

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# We want these logs next to the main scraper logs, or separate
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("server2_scraper.log", encoding="utf-8"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Re-use the existing parse_title utility to maintain consistent matching
def parse_title(title: str):
    result = {
        "original_title": title,
        "clean_title": title,
        "year": None,
        "vj_name": None,
        "language": "Luganda",
    }
    m_year = re.search(r"\((\d{4})", title) or re.search(r"\b(19|20)\d{2}\b", title)
    if m_year:
        try:
            val = m_year.group(1)
            if len(val) == 4: result["year"] = int(val)
        except: pass
    m_vj = re.search(r"VJ\s+([A-Za-z0-9\s]+?)(?:\s*-|\)|$)", title, re.IGNORECASE)
    if m_vj: result["vj_name"] = m_vj.group(1).strip()
    m_lang = re.search(r"-\s*([A-Za-z]+)\)", title)
    if m_lang: result["language"] = m_lang.group(1).strip()
    
    clean = re.sub(r"\s*\(.*?\)\s*.*$", "", title).strip()
    clean = re.sub(r"\s*-\s*VJ.*$", "", clean, flags=re.I).strip()
    if clean: result["clean_title"] = clean
    return result

class Server2Scraper:
    def __init__(self, email, password):
        self.email = email
        self.password = password
        self.base_url = "https://zflix.click"
        self.login_url = f"{self.base_url}/login"
        self.session = requests.Session()
        self.db = MovieDatabase("movies.db")
        self.tmdb = TmdbPosterFetcher.from_env()

        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            'Upgrade-Insecure-Requests': '1'
        })
        
    def login(self) -> bool:
        logger.info("Server 2: Initiating login sequence...")
        try:
            response = self.session.get(self.login_url, verify=False, timeout=15)
            soup = BeautifulSoup(response.text, 'html.parser')
            csrf_token = None
            meta_token = soup.find('meta', {'name': 'csrf-token'})
            if meta_token: csrf_token = meta_token.get('content')
            if not csrf_token:
                input_token = soup.find('input', {'name': '_token'})
                if input_token: csrf_token = input_token.get('value')
            if not csrf_token:
                logger.error("Failed to find CSRF token on the login page.")
                return False
                
            login_data = {
                '_token': csrf_token, 'action': 'login',
                'email': self.email, 'password': self.password, 'remember': 'on'
            }
            
            post_response = self.session.post(
                self.login_url, data=login_data, verify=False, allow_redirects=True, timeout=15
            )
            
            is_logged_in = False
            if 'dashboard' in post_response.url or 'home' in post_response.url or post_response.url == self.base_url + '/':
                is_logged_in = True
            for cookie in self.session.cookies:
                if cookie.name.startswith('remember_web_'):
                    is_logged_in = True
                    break
                    
            if is_logged_in:
                logger.info("Login successful!")
                return True
            else:
                logger.error("Login failed. URL: " + post_response.url)
                return False
        except Exception as e:
            logger.error(f"Network error during login: {e}")
            return False

    def generate_id_for_server2(self, clean_title: str, year: int=None, vj_name: str=None):
        base = clean_title.lower().replace(" ", "_")
        hash_str = hashlib.md5(f"{clean_title}_{year}_{vj_name}".encode('utf-8')).hexdigest()[:6]
        return f"s2_{base}_{hash_str}"

    def match_or_create_movie(self, title: str, video_url: str):
        parsed = parse_title(title)
        clean_title = parsed["clean_title"]
        vj_name = parsed["vj_name"]
        
        # 1. Broad search for movies with this title
        results, count = self.db.search_movies(clean_title, limit=50, title_only=True)
        movie_matches = [m for m in results if m.get("type") == "movie"]
        
        exact_match = None
        for m in movie_matches:
            # We enforce exact vj name match or both None
            db_vj = m.get("vj_name")
            if (db_vj or "").lower() == (vj_name or "").lower():
                # We found a match
                exact_match = m
                break
                
        if exact_match:
            logger.info(f"   [MATCH] Existing movie '{clean_title}' VJ: '{vj_name}'. Updating server2_url...")
            payload = {"server2_url": video_url, "last_updated": datetime.now().isoformat()}
            
            # Auto-repair missing poster or extended metadata
            if not exact_match.get("image_url") or not exact_match.get("backdrop_url") or not exact_match.get("cast"):
                try:
                    if self.tmdb:
                        logger.info(f"   [REPAIR] Missing poster for '{clean_title}'. Attempting TMDB fetch...")
                        p = self.tmdb.find_poster(clean_title, parsed["year"], media_type="movie")
                        if p:
                            payload["image_url"] = p.url
                            logger.info(f"   [REPAIR SUCCESS] Found poster for '{clean_title}'!")
                            details = self.tmdb.fetch_details(p.tmdb_id, media_type="movie")
                            payload.setdefault("raw_data", exact_match.get("raw_data") or {})
                            if details:
                                payload["description"] = details.get("overview", "")
                                if "genres" in details: payload["genres"] = details["genres"]
                                if "backdrop_url" in details: payload["backdrop_url"] = details["backdrop_url"]
                                if "release_date" in details: payload["release_date"] = details["release_date"]
                                if "runtime_minutes" in details: payload["runtime_minutes"] = details["runtime_minutes"]
                                if "vote_average" in details: payload["raw_data"]["vote_average"] = details["vote_average"]
                            try:
                                cast = self.tmdb.fetch_cast(p.tmdb_id, media_type="movie", limit=15)
                                if cast: payload["cast"] = cast
                            except Exception as ce:
                                logger.error(f"  Cast enrich failed during repair: {ce}")
                except Exception as e:
                    logger.error(f"  TMDB enrich failed during repair: {e}")
            
            self.db.update_movie(exact_match["id"], payload)
        else:
            logger.info(f"   [NEW] No exact VJ match for '{clean_title}' VJ: '{vj_name}'. Creating isolated Server 2 Entry.")
            mobi_id = self.generate_id_for_server2(clean_title, parsed["year"], vj_name)
            payload = {
                "mobifliks_id": mobi_id,
                "title": clean_title,
                "year": parsed["year"],
                "vj_name": vj_name,
                "language": parsed["language"],
                "type": "movie",
                "server2_url": video_url,
                "raw_data": {"source": "server2"}
            }
            # Add basic tmdb info if possible
            try:
                if self.tmdb:
                    p = self.tmdb.find_poster(clean_title, parsed["year"], media_type="movie")
                    if p:
                        payload["image_url"] = p.url
                        details = self.tmdb.fetch_details(p.tmdb_id, media_type="movie")
                        if details:
                            payload["description"] = details.get("overview", "")
                            if "genres" in details: payload["genres"] = details["genres"]
                            if "backdrop_url" in details: payload["backdrop_url"] = details["backdrop_url"]
                            if "release_date" in details: payload["release_date"] = details["release_date"]
                            if "runtime_minutes" in details: payload["runtime_minutes"] = details["runtime_minutes"]
                            if "vote_average" in details: payload["raw_data"]["vote_average"] = details["vote_average"]
                        try:
                            cast = self.tmdb.fetch_cast(p.tmdb_id, media_type="movie", limit=15)
                            if cast: payload["cast"] = cast
                        except Exception as ce:
                            logger.error(f"  Cast enrich failed for new movie: {ce}")
            except Exception as e:
                logger.error(f"  TMDB enrich failed: {e}")
                
            self.db.save_movie(payload)

    def scrape_movies(self, start=1, end=2):
        logger.info("=== Starting Server 2 Movies Scrape ===")
        for page in range(start, end + 1):
            page_url = f"{self.base_url}/movies" if page == 1 else f"{self.base_url}/movies/page/{page}"
            response = self.session.get(page_url, verify=False, timeout=15)
            soup = BeautifulSoup(response.text, 'html.parser')
            
            cards = soup.find_all('div', class_='browse-card')
            logger.info(f"Found {len(cards)} movies on page {page}.")
            
            for index, card in enumerate(cards, 1):
                link_tag = card.find('a', class_='browse-card-link')
                if not link_tag: continue
                details_url = link_tag.get('href')
                if not details_url.startswith("http"):
                    details_url = self.base_url + details_url if details_url.startswith("/") else f"{self.base_url}/{details_url}"
                
                title_tag = card.find('div', class_='browse-card-title')
                title = title_tag.text.strip() if title_tag else "Unknown Title"
                
                watch_url = details_url.replace("/details/", "/watch/")
                
                try:
                    detail_resp = self.session.get(watch_url, verify=False, timeout=15)
                    detail_soup = BeautifulSoup(detail_resp.text, 'html.parser')
                    download_btn = detail_soup.find('a', onclick=lambda t: t and 'downloadVideo' in t)
                    if download_btn:
                        match = re.search(r"downloadVideo\(['\"]([^,]+?)['\"]\s*,", download_btn.get('onclick', ''))
                        if match:
                            video_url = match.group(1)
                            logger.info(f"[{index}/{len(cards)}] Scraped: {title}")
                            self.match_or_create_movie(title, video_url)
                except Exception as e:
                    logger.error(f"Failed scraping watch page for {title}: {e}")

    def scrape_series(self, start=1, end=1):
        logger.info("=== Starting Server 2 Series Scrape ===")
        for page in range(start, end + 1):
            page_url = f"{self.base_url}/series" if page == 1 else f"{self.base_url}/series/page/{page}"
            response = self.session.get(page_url, verify=False, timeout=15)
            soup = BeautifulSoup(response.text, 'html.parser')
            
            cards = soup.find_all('div', class_='browse-card')
            logger.info(f"Found {len(cards)} series on page {page}.")
            
            for index, card in enumerate(cards, 1):
                link_tag = card.find('a', class_='browse-card-link')
                if not link_tag: continue
                series_url = link_tag.get('href')
                if not series_url.startswith("http"):
                    series_url = self.base_url + series_url if series_url.startswith("/") else f"{self.base_url}/{series_url}"
                
                title_tag = card.find('div', class_='browse-card-title')
                series_title = title_tag.text.strip() if title_tag else "Unknown Series"
                
                parsed = parse_title(series_title)
                clean_title = parsed["clean_title"]
                vj_name = parsed["vj_name"]
                
                # Try to map Series to DB
                results, _ = self.db.search_movies(clean_title, limit=50, title_only=True)
                series_matches = [m for m in results if m.get("type") == "series"]
                
                exact_series = None
                for m in series_matches:
                    if (m.get("vj_name") or "").lower() == (vj_name or "").lower():
                        exact_series = m
                        break
                        
                serie_id = None
                if exact_series:
                    serie_id = exact_series["mobifliks_id"]
                    logger.info(f"   [MATCH] Series '{clean_title}'. Fetching seasons...")
                else:
                    logger.info(f"   [NEW] Series '{clean_title}'. Creating root entry...")
                    serie_id = self.generate_id_for_server2(clean_title, parsed["year"], vj_name)
                    payload = {
                        "mobifliks_id": serie_id,
                        "title": clean_title,
                        "vj_name": vj_name,
                        "language": parsed["language"],
                        "type": "series",
                        "raw_data": {"source": "server2"}
                    }
                    if self.tmdb:
                        p = self.tmdb.find_poster(clean_title, parsed["year"], media_type="tv")
                        if p:
                            payload["image_url"] = p.url
                            payload["raw_data"]["tmdb_id"] = p.tmdb_id
                            details = self.tmdb.fetch_details(p.tmdb_id, media_type="tv")
                            if details:
                                payload["description"] = details.get("overview", "")
                                if "genres" in details: payload["genres"] = details["genres"]
                                if "backdrop_url" in details: payload["backdrop_url"] = details["backdrop_url"]
                                if "release_date" in details: payload["release_date"] = details["release_date"]
                                if "runtime_minutes" in details: payload["runtime_minutes"] = details["runtime_minutes"]
                                if "vote_average" in details: payload["raw_data"]["vote_average"] = details["vote_average"]
                            try:
                                cast = self.tmdb.fetch_cast(p.tmdb_id, media_type="tv", limit=15)
                                if cast: payload["cast"] = cast
                            except Exception as ce:
                                logger.error(f"  Cast enrich failed for new series: {ce}")
                    self.db.save_movie(payload)
                
                # Fetch seasons
                try:
                    s_resp = self.session.get(series_url, verify=False, timeout=15)
                    s_soup = BeautifulSoup(s_resp.text, 'html.parser')
                    season_cards = s_soup.find_all('a', class_='season-card')
                    
                    for s_card in season_cards:
                        season_url = s_card.get('href')
                        s_name = s_card.find('h3', class_='season-name')
                        season_name = s_name.text.strip() if s_name else "S1"
                        # Extract season number
                        m_season = re.search(r'\d+', season_name)
                        s_num = int(m_season.group(0)) if m_season else 1
                        
                        ep_resp = self.session.get(season_url, verify=False, timeout=15)
                        ep_soup = BeautifulSoup(ep_resp.text, 'html.parser')
                        blocks = ep_soup.find_all('div', class_='single-video')
                        for ep_index, ep_block in enumerate(blocks, 1):
                            ep_link = ep_block.find('a')
                            if not ep_link: continue
                            ep_title_tag = ep_block.find('h3')
                            ep_title = ep_title_tag.text.strip() if ep_title_tag else f"Episode {ep_index}"
                            
                            m_ep = re.search(r'(?i)episode\s+(\d+)', ep_title)
                            e_num = int(m_ep.group(1)) if m_ep else ep_index
                            
                            watch_resp = self.session.get(ep_link.get('href'), verify=False, timeout=15)
                            watch_soup = BeautifulSoup(watch_resp.text, 'html.parser')
                            d_btn = watch_soup.find('a', onclick=lambda t: t and 'downloadVideo' in t)
                            if d_btn:
                                m_url = re.search(r"downloadVideo\(['\"]([^,]+?)['\"]\s*,", d_btn.get('onclick'))
                                if m_url:
                                    video_url = m_url.group(1)
                                    epid = f"{serie_id}_S{s_num}E{e_num}"
                                    
                                    # Attempt to update if exists by epid (unlikely but safe)
                                    exists = self.db.get_movie_by_id(epid)
                                    if exists:
                                        self.db.update_movie_by_mobifliks_id(epid, {"server2_url": video_url})
                                    else:
                                        edata = {
                                            "mobifliks_id": epid,
                                            "series_id": serie_id,
                                            "title": f"Episode {e_num}",
                                            "type": "episode",
                                            "episode_number": e_num,
                                            "server2_url": video_url,
                                            "raw_data": {"season": s_num}
                                        }
                                        self.db.save_episode(serie_id, edata)
                                    logger.info(f"      [OK] Saved episode {e_num} for season {s_num}")
                except Exception as e:
                    logger.error(f"Error traversing series {clean_title}: {e}")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--movies', action='store_true', help='Only scrape movies')
    parser.add_argument('--series', action='store_true', help='Only scrape series')
    parser.add_argument('--pages', type=int, default=1, help='Number of pages to scrape in total')
    parser.add_argument('--start-page', type=int, default=1, help='Page number to start scraping from')
    args = parser.parse_args()
    
    # We use basic config for Server2 demo, the user should provide valid ones
    PASSWORD = "Testpen1234"
    EMAIL = "shelvinjoel28@gmail.com" # user's string from file

    scraper = Server2Scraper(EMAIL, PASSWORD)
    if scraper.login():
        if args.movies or not args.series:
            scraper.scrape_movies(args.start_page, args.pages)
        if args.series or not args.movies:
            scraper.scrape_series(args.start_page, args.pages)
    else:
        logger.error("Authentication failed. Aborting.")
