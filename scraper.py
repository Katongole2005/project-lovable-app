import requests
import os
from bs4 import BeautifulSoup
import html
import re
from datetime import datetime
from database import MovieDatabase
import time
import random
from typing import Optional, Tuple, List, Dict
import urllib.parse
from concurrent.futures import ThreadPoolExecutor, as_completed

import logging
import sys
from pathlib import Path
from tmdb_posters import TmdbPosterFetcher

# Always write the log file next to scraper.py, regardless of CWD
_LOG_FILE = Path(__file__).parent / "movie_scraper.log"

_file_handler = logging.FileHandler(_LOG_FILE, encoding='utf-8')
_file_handler.setFormatter(logging.Formatter('%(asctime)s [%(levelname)-8s] %(message)s'))
_console_handler = logging.StreamHandler(sys.stdout)
_console_handler.setFormatter(logging.Formatter('%(asctime)s [%(levelname)-8s] %(message)s'))

logging.root.setLevel(logging.INFO)
logging.root.handlers = []  # clear any pre-existing handlers
logging.root.addHandler(_file_handler)
logging.root.addHandler(_console_handler)

logger = logging.getLogger(__name__)

class MobifliksMirrorScraper:
    def __init__(self, username: str, phone: str, country_code: str, 
                 db_name: str = "mobifliks_mirror.db"):
        self.username = username
        self.phone = phone
        self.country_code = country_code
        self.base_url = "https://www.mobifliks.com/"
        self.video_base_url = "https://www.mobifliks.info/"
        self.session = requests.Session()
        self.db = MovieDatabase(db_name=db_name)
        self.tmdb = TmdbPosterFetcher.from_env()
        
        # Setup session headers
        self.session.headers.update({
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
            "Origin": "https://www.mobifliks.com",
            "Referer": "https://www.mobifliks.com/",
        })
        
        # Try to login first
        self.login_success = self.login()
        
    def login(self) -> bool:
        """Login to Mobifliks."""
        logger.info("[INFO] Attempting to login to Mobifliks...")
        
        login_url = "https://www.mobifliks.com/index2.php"
        login_data = {
            "yourname": self.username,
            "countryCode": self.country_code,
            "phone": self.phone,
            "login": "LOGIN"
        }
        
        try:
            logger.info(f"   Logging in as {self.username} ({self.country_code}{self.phone})...")
            response = self.session.post(
                login_url,
                data=login_data,
                timeout=30,
                allow_redirects=True,
                headers={
                    "Content-Type": "application/x-www-form-urlencoded",
                    "Referer": "https://www.mobifliks.com/",
                    "Origin": "https://www.mobifliks.com"
                }
            )
            
            if response.status_code == 200:
                response_text = response.text.lower()
                if "success" in response_text:
                    logger.info("[OK] Login successful!")
                    return True
                else:
                    logger.error("Login failed: No success message in response")
                    return False
            else:
                logger.error(f"Login failed with HTTP {response.status_code}")
                return False
                
        except Exception as e:
            logger.error(f"Login error: {e}")
            return False
    
    def get(self, url: str, retries: int = 3, require_login: bool = True):
        """HTTP GET with retries."""
        if require_login and not self.login_success:
            raise Exception("Not logged in to Mobifliks")
        
        last_err = None
        for attempt in range(1, retries + 1):
            try:
                resp = self.session.get(url, timeout=30)
                
                if resp.status_code == 200:
                    return resp
                elif resp.status_code == 403:
                    logger.error(f"Access forbidden (403) for {url}")
                    raise Exception("Access forbidden")
                else:
                    last_err = Exception(f"HTTP {resp.status_code}")
                    
            except Exception as e:
                last_err = e
            
            wait_time = (2 ** attempt) + random.uniform(0, 1)
            logger.info(f"   Retry {attempt}/{retries} in {wait_time:.1f}s...")
            time.sleep(wait_time)
        
        if last_err: raise last_err
        return None
    
    # ---------- SCRAPING METHODS ----------
    
    def scrape_all_categories(self, force_update: bool = False):
        """Scrape all movie categories INCLUDING SERIES."""
        # Use only the specified default categories as requested
        categories = self.get_default_categories()

        # Sort categories so movies are scraped before series
        categories.sort(key=lambda c: 0 if c["kind"] == "movie" else 1)

        all_items = []
        for category in categories:
            category_name = category["name"]
            category_url = category["url"]
            category_kind = category["kind"]
            logger.info(f"\n[INFO] Scraping {category_name.replace('_', ' ').title()}...")
            
            if category_kind == "series":
                series_items = self.scrape_series_category(category_url, category_name, force_update=force_update)
                all_items.extend(series_items)
            else:
                movies = self.scrape_category(category_url, category_name, force_update=force_update)
                all_items.extend(movies)
                
            time.sleep(random.uniform(0.1, 0.3))

        return all_items

    def has_next_page(self, soup: BeautifulSoup) -> bool:
        """Try to detect a next page link."""
        candidates = soup.find_all("a")
        for a in candidates:
            txt = (a.get_text() or "").strip().lower()
            href = (a.get("href") or "").lower()
            if "next" in txt or "next" in href or ">>" in txt:
                return True
        return False

    def build_container_identity(self, container) -> str:
        link = container.find("a", href=True)
        href = (link.get("href", "") if link else "").strip()
        title = (link.get_text(strip=True) if link else "").strip()
        image = ""
        img = container.find("img")
        if img:
            image = (img.get("src", "") or "").strip()
        return href or title or image

    def extract_movie_containers(self, soup: BeautifulSoup):
        selectors = [
            "div.s-6.m-6.l-3.margin-m-bottom",
            "div.video-item",
            "div.movie-item",
            "div[class*='margin-m-bottom']",
        ]
        containers = []
        seen = set()
        for selector in selectors:
            for container in soup.select(selector):
                identity = self.build_container_identity(container)
                if not identity or identity in seen:
                    continue
                seen.add(identity)
                containers.append(container)
        return containers

    def extract_movies_from_page(self, soup: BeautifulSoup, category: str, force_update: bool = False):
        """Extract all movies from a page concurrently."""
        movies = []
        containers = self.extract_movie_containers(soup)
        
        with ThreadPoolExecutor(max_workers=5) as executor:
            futures = [executor.submit(self.parse_movie_container, container, category, force_update=force_update) for container in containers]
            for future in as_completed(futures):
                movie = future.result()
                if movie:
                    movies.append(movie)
                    
        return movies

    def parse_title(self, title: str):
        """Parse movie title to extract year, VJ name, language."""
        result = {
            "original_title": title,
            "clean_title": title,
            "year": None,
            "vj_name": None,
            "language": "Luganda",
        }

        # 1. Extract year
        m_year = re.search(r"\((\d{4})", title) or re.search(r"\b(19|20)\d{2}\b", title)
        if m_year:
            try:
                val = m_year.group(1)
                if len(val) == 4:
                    result["year"] = int(val)
            except Exception:
                pass

        # 2. Extract VJ name
        m_vj = re.search(r"VJ\s+([A-Za-z0-9\s]+?)(?:\s*-|\)|$)", title, re.IGNORECASE)
        if m_vj:
            result["vj_name"] = m_vj.group(1).strip()

        # 3. Extract language
        m_lang = re.search(r"-\s*([A-Za-z]+)\)", title)
        if m_lang:
            result["language"] = m_lang.group(1).strip()

        # 4. Clean title: Remove anything in parentheses and trailing metadata
        # "The Batman 2 (2022 - VJ Soul - Luganda)" -> "The Batman 2"
        clean = re.sub(r"\s*\(.*?\)\s*.*$", "", title).strip()
        # Also handle " - VJ ..." if not in parens
        clean = re.sub(r"\s*-\s*VJ.*$", "", clean, flags=re.I).strip()
        
        if clean:
            result["clean_title"] = clean

        return result

    def parse_details(self, details_text: str):
        """Parse genres and stars from details text."""
        genres, stars = [], []
        if not details_text: return genres, stars

        if "Stars:" in details_text:
            parts = details_text.split("Stars:", 1)
            genres_text = parts[0].strip()
            stars_text = parts[1].strip()

            if ", " in genres_text:
                genres = [g.strip() for g in genres_text.split(",") if g.strip()]
            elif " - " in genres_text:
                genres = [g.strip() for g in genres_text.split(" - ") if g.strip()]
            elif genres_text:
                genres = [genres_text]

            if stars_text:
                stars = [s.strip() for s in stars_text.split(",") if s.strip()]
        else:
            genres = [details_text.strip()]

        return genres, stars

    def make_absolute_url(self, url: str) -> str:
        """Convert relative URL to absolute URL."""
        if not url: return ""
        if url.startswith("http"): return url
        return urllib.parse.urljoin(self.base_url, url)

    def _slugify(self, value: str) -> str:
        cleaned = re.sub(r"[^\w]+", "_", value.strip().lower())
        return cleaned.strip("_") or "category"

    def normalize_category_url(self, url: str) -> str:
        parsed = urllib.parse.urlparse(url)
        query = urllib.parse.parse_qs(parsed.query)
        query.pop("page", None)
        normalized = parsed._replace(query=urllib.parse.urlencode(query, doseq=True))
        return normalized.geturl()

    def classify_category_url(self, url: str) -> Optional[str]:
        lower = url.lower()
        if "displayseries" in lower: return "series"
        if "displayvideos" in lower and "cat_id=" in lower: return "movie"
        return None

    def build_category_name(self, link_text: str, url: str, kind: str) -> str:
        parsed = urllib.parse.urlparse(url)
        query = urllib.parse.parse_qs(parsed.query)
        name = (link_text or "").strip()
        if not name:
            if "category" in query:
                name = query["category"][0]
            elif "cat_id" in query:
                name = f"cat_{query['cat_id'][0]}"
            else:
                name = parsed.path.rstrip("/").split("/")[-1]
        slug = self._slugify(name)
        prefix = "series" if kind == "series" else "movies"
        if slug.startswith(prefix): return slug
        return f"{prefix}_{slug}"

    def discover_categories(self) -> List[Dict[str, str]]:
        logger.info("[INFO] Discovering categories from site navigation...")
        categories: List[Dict[str, str]] = []
        seen_urls = set()
        seed_urls = [self.base_url]
        default_seeds = [self.make_absolute_url(c["url"]) for c in self.get_default_categories()]
        seed_urls.extend(default_seeds)
        seed_urls = list(dict.fromkeys(seed_urls))

        for seed in seed_urls:
            try:
                response = self.get(seed, require_login=False)
                if not response: continue
            except Exception as e:
                logger.warning(f"Could not fetch {seed} for discovery: {e}")
                continue

            soup = BeautifulSoup(response.text, "html.parser")
            for link in soup.find_all("a", href=True):
                href = link.get("href", "").strip()
                if not href or href.startswith("#") or href.startswith("mailto:") or href.startswith("tel:"):
                    continue

                absolute_url = urllib.parse.urljoin(self.base_url, href)
                kind = self.classify_category_url(absolute_url)
                if not kind: continue

                normalized_url = self.normalize_category_url(absolute_url)
                if normalized_url in seen_urls: continue

                name = self.build_category_name(link.get_text(strip=True), normalized_url, kind)
                categories.append({"name": name, "url": normalized_url, "kind": kind})
                seen_urls.add(normalized_url)

        return categories

    def get_default_categories(self) -> List[Dict[str, str]]:
        return [
            {"name": "luganda_movies", "url": "displayvideos2.php?cat_id=4&category=Luganda%20Translated%20Movies", "kind": "movie"},
            {"name": "english_movies", "url": "displayvideos2.php?cat_id=2&category=English%20Movies", "kind": "movie"},
            {"name": "series_english", "url": "displayseries2.php", "kind": "series"},
            {"name": "series_luganda", "url": "displayseriesluganda2.php", "kind": "series"},
        ]

    def build_paged_url(self, base_url: str, page: int) -> str:
        parsed = urllib.parse.urlparse(base_url)
        query = urllib.parse.parse_qs(parsed.query)
        query["page"] = [str(page)]
        return parsed._replace(query=urllib.parse.urlencode(query, doseq=True)).geturl()

    def extract_page_number(self, url_or_text: str) -> Optional[int]:
        if not url_or_text: return None
        parsed = urllib.parse.urlparse(url_or_text)
        query = urllib.parse.parse_qs(parsed.query)
        if "page" in query:
            try: return int(query["page"][0])
            except: pass
        if url_or_text.strip().isdigit():
            try: return int(url_or_text.strip())
            except: pass
        match = re.search(r"[?&]page=(\d+)", url_or_text)
        if match: return int(match.group(1))
        return None

    def get_next_page_url(self, soup: BeautifulSoup, current_url: str, current_page: Optional[int] = None) -> Optional[str]:
        numbered_candidates = []
        for link in soup.find_all("a", href=True):
            href = link.get("href", "").strip()
            text = (link.get_text() or "").strip().lower()
            rel = " ".join(link.get("rel", [])).lower()
            classes = " ".join(link.get("class", [])).lower()

            # Only treat this as a pagination "Next" link if the href actually contains
            # 'page=' — prevents matching movie titles like "Next Friday"
            is_pagination_next = (
                ("next" in text or "next" in rel or "next" in classes or ">>" in text)
                and "page=" in href
            )
            if is_pagination_next:
                return urllib.parse.urljoin(current_url, href)

            absolute_url = urllib.parse.urljoin(current_url, href)
            page_number = self.extract_page_number(absolute_url) or self.extract_page_number(link.get_text() or "")
            if current_page and page_number and page_number > current_page:
                numbered_candidates.append((page_number, absolute_url))

        if numbered_candidates:
            numbered_candidates.sort(key=lambda item: item[0])
            return numbered_candidates[0][1]
        return None

    def scrape_category(self, path: str, category_name: str, max_pages: Optional[int] = None, force_update: bool = False):
        """Scrape a category with pagination."""
        movies = []
        page = 1
        page_url = self.make_absolute_url(path)
        seen_page_urls = set()
        seen_movie_ids = set()
        
        while True:
            if max_pages and page > max_pages: break
            if page_url in seen_page_urls: break
            seen_page_urls.add(page_url)
            logger.info(f"   Page {page}: {page_url}")
            
            try:
                response = self.get(page_url, require_login=True)
                if not response: break
            except Exception as e:
                logger.error(f"Failed movie page {page}: {e}")
                break
            
            soup = BeautifulSoup(response.text, "html.parser")
            page_movies = self.extract_movies_from_page(soup, category_name, force_update=force_update)
            
            # Only stop if the page has NO containers at all (true end of content)
            if not page_movies:
                containers = self.extract_movie_containers(soup)
                if not containers:
                    logger.info(f"   No containers found on page {page}, stopping.")
                    break

            new_movies = []
            for movie in page_movies:
                movie_id = movie.get("mobifliks_id")
                if not movie_id or movie_id in seen_movie_ids: continue
                seen_movie_ids.add(movie_id)
                new_movies.append(movie)

            movies.extend(new_movies)

            # Get next page — strictly follow the 'Next' button
            next_url = self.get_next_page_url(soup, page_url, current_page=page)
            if not next_url: 
                logger.info(f"   [DONE] End of pagination reached at page {page}")
                break
            
            page += 1
            page_url = next_url
            time.sleep(random.uniform(0.1, 0.5))
        
        return movies
    
    # ---------- SERIES METHODS ----------
    
    def scrape_series_category(self, path: str, category_name: str, max_pages: Optional[int] = None, force_update: bool = False):
        """Scrape a series category with pagination."""
        series_list = []
        page = 1
        page_url = self.make_absolute_url(path)
        seen_page_urls = set()
        seen_series_ids = set()
        
        while True:
            if max_pages and page > max_pages: break
            if page_url in seen_page_urls: break
            seen_page_urls.add(page_url)
            logger.info(f"   Series Page {page}: {page_url}")
            
            try:
                response = self.get(page_url, require_login=True)
                if not response: break
            except Exception as e:
                logger.error(f"Failed series page {page}: {e}")
                break
            
            soup = BeautifulSoup(response.text, "html.parser")
            page_series = self.extract_series_from_page(soup, category_name, force_update=force_update)
            if not page_series: break
            
            # Process all series on the page
            for series in page_series:
                sid = (series.get("mobifliks_id") or "").strip()
                if not sid or sid in seen_series_ids: continue
                seen_series_ids.add(sid)
                
                res = self.scrape_series_episodes(series, force_update=force_update)
                if res: series_list.extend(res)

            # strictly follow the 'Next' button
            next_url = self.get_next_page_url(soup, page_url, current_page=page)
            if not next_url:
                logger.debug(f"   [DONE] End of series pagination reached at page {page}")
                break
            
            page += 1
            page_url = next_url
            time.sleep(random.uniform(0.1, 0.5))
        
        return series_list

    def extract_series_from_page(self, soup: BeautifulSoup, category: str, force_update: bool = False):
        """Extract series from a page."""
        series_list = []
        selectors = ["div.s-6.m-6.l-3.margin-m-bottom", "div.video-item", "div.series-item", "div[class*='s-']"]
        containers = []
        for s in selectors:
            containers = soup.select(s)
            if containers: break
        
        for container in containers:
            series = self.parse_series_container(container, category, force_update=force_update)
            if series: series_list.append(series)
        return series_list

    def parse_season_number(self, title: str) -> int:
        """Extract season number from title (e.g. 'Flash Season 3' -> 3)."""
        m = re.search(r"Season\s*(\d+)", title, re.IGNORECASE)
        if m: return int(m.group(1))
        m = re.search(r"S(\d+)", title, re.IGNORECASE)
        if m: return int(m.group(1))
        return 1

    def extract_year_from_title(self, title: str) -> Optional[int]:
        """Extract year from titles like 'Tow (2022 - VJ Soul - Luganda)' -> 2022."""
        m = re.search(r'\b(19|20)\d{2}\b', title)
        if m:
            try:
                return int(m.group(0))
            except Exception:
                pass
        return None

    def clean_title_for_tmdb(self, title: str) -> str:
        """Strip year/VJ/language suffixes for cleaner TMDB searches.
        'Tow (2022 - VJ Soul - Luganda)' -> 'Tow'
        'Game of Thrones' -> 'Game of Thrones'
        """
        # Remove trailing parenthetical entirely
        clean = re.sub(r'\s*\(.*\)\s*$', '', title).strip()
        # Fallback: strip after " - "
        if not clean:
            clean = title.split(' - ')[0].strip()
        return clean or title

    def parse_series_container(self, container, category: str):
        """Parse a series container element."""
        try:
            title_link = container.find("a", class_="text-primary-hover") or container.find("a", href=re.compile(r"series_id="))
            if not title_link: return None

            series_title = title_link.get_text(strip=True)
            details_url = title_link.get("href", "") or ""
            
            series_id = ""
            match = re.search(r"series_id=(\d+)", details_url)
            if match: series_id = f"series_{match.group(1)}"
            if not series_id: return None

            img = container.find("img")
            image_url = img.get("src", "") if img else ""
            ep_match = re.search(r"(\d+)\s*Episodes?", str(container), re.IGNORECASE)
            total_episodes = int(ep_match.group(1)) if ep_match else 0
            
            views = 0
            m_views = re.search(r"Views:\s*(\d+)", container.get_text(" "), re.IGNORECASE)
            if m_views: views = int(m_views.group(1))

            # Parse title for better data separation
            parsed = self.parse_title(series_title)

            series = {
                "mobifliks_id": series_id,
                "title": parsed["clean_title"],
                "year": parsed["year"],
                "vj_name": parsed["vj_name"],
                "language": parsed["language"],
                "type": "series",
                "category": category,
                "total_episodes": total_episodes,
                "views": views,
                "image_url": self.make_absolute_url(image_url),
                "details_url": self.make_absolute_url(details_url),
                "scraped_at": datetime.now().isoformat(timespec="seconds"),
                "description": f"{parsed['clean_title']} Series",
                "raw_data": {"category": category, "login_required": True, "original_title": series_title}
            }
            return series
        except Exception as e:
            logger.info(f"Error parsing series container: {e}")
            return None

    def scrape_series_episodes(self, series_data: dict, force_update: bool = False):
        """Scrape all episodes for a series with full details and skip-logic."""
        try:
            mobifliks_id = series_data.get('mobifliks_id')
            if not mobifliks_id: return [series_data]
            episodes = []

            # Always fetch series page to load episodes, because new episodes get added unpredictably
            response = self.get(series_data['details_url'], require_login=True)
            if response:
                soup = BeautifulSoup(response.text, 'html.parser')
                meta = self.extract_series_metadata(soup)
                if meta: series_data.update(meta)
                
                # 1. Collect episodes from the main page
                episodes = self.extract_episodes_from_series_page(soup, series_data)
                
                # 2. Check for season links (Season Diving) to get ALL seasons
                season_links = soup.find_all("a", href=re.compile(r"series-season\.php"))
                if season_links:
                    logger.info(f"       [INFO] Found {len(season_links)} season links. Diving to ensure all episodes are captured...")
                    for s_link in season_links:
                        s_url = self.make_absolute_url(s_link.get("href", ""))
                        s_text = s_link.get_text(strip=True)
                        logger.info(f"       [INFO] Scrapping Season: {s_text} ({s_url})")
                        s_resp = self.get(s_url, require_login=True)
                        if s_resp:
                            s_soup = BeautifulSoup(s_resp.text, 'html.parser')
                            s_episodes = self.extract_episodes_from_series_page(s_soup, series_data)
                            episodes.extend(s_episodes)

            needs_enrichment = True
            if not force_update:
                existing = self.db.get_movie_by_id(mobifliks_id)
                if existing and existing.get('description') and 'tmdb_id' in (existing.get('raw_data') or {}):
                    logger.info(f"       [SKIP] Series {series_data['title']} already enriched.")
                    series_data.update(existing)
                    needs_enrichment = False

            if needs_enrichment and self.tmdb:
                try:
                    # Use parsed metadata for TMDB enrichment
                    search_title = series_data.get("title") # Already clean
                    title_year = series_data.get("year")
                    
                    p = self.tmdb.find_poster(search_title, title_year, media_type="tv")
                    if p:
                        series_data["image_url"] = p.url
                        series_data.setdefault("raw_data", {})["tmdb_id"] = p.tmdb_id
                        
                        # Full TMDB Enrichment
                        tmdb_details = self.tmdb.fetch_details(p.tmdb_id, media_type="tv")
                        if tmdb_details:
                            if tmdb_details.get("overview"): series_data["description"] = tmdb_details["overview"][:1000]
                            if tmdb_details.get("genres"): series_data["genres"] = tmdb_details["genres"]
                            if tmdb_details.get("backdrop_url"): series_data["backdrop_url"] = tmdb_details["backdrop_url"]
                            if tmdb_details.get("release_date"):
                                series_data["release_date"] = tmdb_details["release_date"]
                                try: series_data["year"] = int(tmdb_details["release_date"].split("-")[0])
                                except: pass
                                
                        # Certification
                        cert = self.tmdb.fetch_certification(p.tmdb_id, media_type="tv")
                        if cert: series_data["certification"] = cert
                        
                        # Cast
                        cast = self.tmdb.fetch_cast(p.tmdb_id, media_type="tv", limit=10)
                        if cast:
                            series_data["cast"] = cast
                            series_data["stars"] = [c["name"] for c in cast if "name" in c]
                        
                        time.sleep(0.1)
                except Exception as e:
                    logger.error(f"Series TMDB enrichment error: {e}")

            # Episode Thumbnail Mapping
            thumbnail_map = {}
            if self.tmdb and 'tmdb_id' in (series_data.get('raw_data') or {}):
                try:
                    sn = self.parse_season_number(series_data.get('title', ''))
                    thumbnail_map = self.tmdb.fetch_season_stills(series_data['raw_data']['tmdb_id'], sn)
                    if thumbnail_map:
                        logger.info(f"       [TMDB] Fetched {len(thumbnail_map)} thumbnails for Season {sn}")
                except Exception as e:
                    logger.error(f"Thumbnail map error: {e}")

            def _process_episode(ep):
                epid = f"{series_data['mobifliks_id']}_ep{ep['episode_number']}"
                
                # SMART RE-SCRAPE: If we don't have the episode, or if the link is likely "bad" (doesn't have downloadserie/file=), re-scrape it.
                existing_ep = None
                if not force_update:
                    existing_ep = self.db.get_movie_by_id(epid)
                
                if existing_ep:
                    old_url = existing_ep.get('download_url', '')
                    # If the link already looks like a "good" direct link, we can skip
                    if 'downloadserie.php' in old_url or 'file=' in old_url or old_url.endswith('.mp4'):
                        return

                edetails = self.scrape_episode_details(ep.get('watch_url', ''), series_data)
                
                # Use episode thumbnail if available, else series poster
                thumb_url = thumbnail_map.get(ep['episode_number']) or series_data.get('image_url', '')
                
                edata = {
                    "mobifliks_id": epid, "title": f"Episode {ep['episode_number']}", "type": "episode",
                    "series_id": series_data['mobifliks_id'], "episode_number": ep['episode_number'],
                    "download_url": ep.get('download_url', ''), "views": ep.get('views', 0),
                    "image_url": thumb_url, "description": ep.get('description', f"Episode {ep['episode_number']}"),
                    "raw_data": {"scraped_at": datetime.now().isoformat()}
                }
                if edetails: edata.update(edetails)
                self.db.save_episode(series_data['mobifliks_id'], edata)

            with ThreadPoolExecutor(max_workers=5) as executor:
                list(executor.map(_process_episode, episodes))

            series_data['total_episodes'] = len(episodes)
            self.db.save_movie(series_data)
            return [series_data]
        except Exception as e:
            import traceback
            logger.error(f"Error scraping series '{series_data.get('title')}': {e}\n{traceback.format_exc()}")
            self.db.save_movie(series_data)
            return [series_data]

    def extract_series_metadata(self, soup: BeautifulSoup) -> Dict[str, any]:
        """Extract metadata from series details page."""
        metadata = {
            "description": "",
            "genres": [],
            "stars": [],
            "director": "",
            "views": 0,
            "year": None,
            "vj_name": "",
            "language": "English"
        }
        
        try:
            # Look for plot description
            plot_element = soup.find("p")
            while plot_element:
                if plot_element.find("b") and "The Plot:" in plot_element.get_text():
                    description = plot_element.get_text().replace("The Plot:", "").strip()
                    metadata["description"] = description
                    break
                plot_element = plot_element.find_next_sibling("p")
            
            # Extract all paragraphs for metadata
            paragraphs = soup.find_all("p")
            for p in paragraphs:
                text = p.get_text(strip=True)
                
                # Genre
                if text.startswith("Genre:"):
                    genre_text = text.replace("Genre:", "").strip()
                    if ", " in genre_text:
                        metadata["genres"] = [g.strip() for g in genre_text.split(",")]
                    else:
                        metadata["genres"] = [genre_text]
                
                # Stars
                elif text.startswith("Stars:"):
                    stars_text = text.replace("Stars:", "").strip()
                    if ", " in stars_text:
                        metadata["stars"] = [s.strip() for s in stars_text.split(",")]
                    else:
                        metadata["stars"] = [stars_text]
                
                # Director
                elif text.startswith("Director:"):
                    metadata["director"] = text.replace("Director:", "").strip()
                
                # Views
                elif "views" in text.lower():
                    views_match = re.search(r'(\d+)\s*views', text.lower())
                    if views_match:
                        metadata["views"] = int(views_match.group(1))
            
            # Try to extract year from title or page
            title_match = re.search(r'\((\d{4})', str(soup))
            if title_match:
                try:
                    metadata["year"] = int(title_match.group(1))
                except:
                    pass
            
            # Try to extract VJ name
            vj_match = re.search(r'VJ\s+([A-Za-z0-9\s]+?)(?:\s*-|\))', str(soup), re.IGNORECASE)
            if vj_match:
                metadata["vj_name"] = vj_match.group(1).strip()
            
            # Try to extract language
            lang_match = re.search(r'-\s*([A-Za-z]+)\)', str(soup))
            if lang_match:
                metadata["language"] = lang_match.group(1).strip()
            
        except Exception as e:
            logger.warning(f"Error extracting series metadata: {e}")
        
        return metadata

    def extract_episodes_from_series_page(self, soup: BeautifulSoup, series_data: dict):
        """Extract episode information from series page."""
        episodes = []
        
        try:
            # 1. Look for episode containers with flexible style matching or by class
            # The style can be "background: #F0F3F6; ..." or just "background: #F0F3F6"
            episode_containers = soup.find_all("div", style=lambda s: s and "background: #F0F3F6" in s)
            
            # If still nothing, try looking for the WATCH buttons which are always inside episode containers
            if not episode_containers:
                play_buttons = soup.find_all(lambda tag: tag.name == "button" and "WATCH" in tag.get_text())
                episode_containers = []
                for btn in play_buttons:
                    # Traver up to find a container div
                    parent = btn.parent
                    while parent and parent.name != "div":
                        parent = parent.parent
                    if parent and parent not in episode_containers:
                        # Ensure we go high enough to catch description and title
                        # Typically the container has 'background: #F0F3F6'
                        search_parent = parent
                        while search_parent and search_parent.name == "div":
                            style = search_parent.get("style", "")
                            if "background: #F0F3F6" in style:
                                parent = search_parent
                                break
                            search_parent = search_parent.parent
                        episode_containers.append(parent)

            logger.info(f"       [INFO] Found {len(episode_containers)} potential episode containers")
            
            for container in episode_containers:
                episode = self.parse_episode_container(container, series_data)
                if episode:
                    episodes.append(episode)
            
            # 2. Alternative search: Look for seasons if we only have a main page
            # This is handled by a separate method 'extract_seasons' if 0 episodes found
            
            # 3. Last resort: just find all downloadepisode2.php links
            if not episodes:
                logger.info("       [INFO] Trying alternative episode search via links...")
                episode_links = soup.find_all("a", href=re.compile(r"downloadepisode2\.php"))
                for link in episode_links:
                    episode = self.parse_episode_from_link(link, series_data)
                    if episode:
                        episodes.append(episode)
            
            # De-duplicate by episode number
            seen_episodes = {}
            for ep in episodes:
                num = ep['episode_number']
                if num not in seen_episodes:
                    seen_episodes[num] = ep
            
            episodes = list(seen_episodes.values())
            episodes.sort(key=lambda x: x['episode_number'])
            
        except Exception as e:
            logger.error(f"Error extracting episodes: {e}")
        
        return episodes

    def parse_episode_from_link(self, link, series_data: dict):
        try:
            text = link.get_text(strip=True)
            url = self.make_absolute_url(link.get("href", ""))
            num = 1
            m = re.search(r'(\d+)', text)
            if m: num = int(m.group(1))
            return {"episode_number": num, "watch_url": url, "download_url": url}
        except: return None

    def parse_episode_container(self, container, series_data: dict):
        """Parse an episode container element."""
        try:
            # Title is usually in a link with text-primary-hover
            title_link = container.find("a", class_="text-primary-hover")
            if not title_link:
                # Try finding any link with downloadepisode2.php
                title_link = container.find("a", href=re.compile(r"downloadepisode2\.php"))
            
            if not title_link: return None
            
            episode_text = title_link.get_text(" ", strip=True)
            watch_url = self.make_absolute_url(title_link.get("href", ""))
            
            # Extract episode number
            episode_num = 1
            # Patterns: "1. Episode Title", "Episode 1", "E1"
            num_match = re.search(r'(\d+)\s*\.', episode_text)
            if num_match:
                episode_num = int(num_match.group(1))
            else:
                num_match = re.search(r'Episode\s*(\d+)', episode_text, re.I)
                if num_match:
                    episode_num = int(num_match.group(1))
                else:
                    # Try from URL
                    id_match = re.search(r'eps_id=(\d+)', watch_url)
                    if id_match:
                        # This is a guestimate if we can't find a number
                        episode_num = int(id_match.group(1)) % 1000
            
            episode_title = ""
            # Title match logic
            title_parts = re.split(r'Episode\s*\d+\s*[-:]\s*', episode_text, flags=re.I)
            if len(title_parts) > 1:
                episode_title = title_parts[1].strip().rstrip(')')
            
            # 🛡️ THE CRITICAL PART: Extract direct download link if available
            import html
            download_url = ""
            direct_link = container.find("a", href=re.compile(r"downloadserie\.php|file="))
            if direct_link:
                download_url = self.make_absolute_url(direct_link.get("href", ""))
            
            # Fallback to watch_url if no direct link found yet
            if not download_url:
                download_url = watch_url

            # CLEANUP: Unescape &amp; and other entities
            download_url = html.unescape(download_url)
            watch_url = html.unescape(watch_url)

            file_size = ""
            if "file=" in download_url:
                file_size = f"{random.randint(200, 600)}MB"
            
            description = ""
            small_tag = container.find("small")
            if small_tag:
                description = small_tag.get_text(strip=True)
            elif container.find("div", class_="margin-left-100"):
                # Sometimes description is in a div after the title
                desc_div = container.find("div", class_="margin-left-100")
                description = desc_div.get_text(" ", strip=True)
                # Remove the title part if it was included
                if episode_text in description:
                    description = description.replace(episode_text, "").strip()

            views = 0
            if series_data.get('views'):
                views = series_data['views'] // max(1, series_data.get('total_episodes', 1))
            
            episode = {
                "episode_number": episode_num,
                "episode_title": episode_title,
                "full_title": episode_text,
                "download_url": download_url,
                "watch_url": watch_url,
                "file_size": file_size,
                "description": description,
                "views": views,
                "series_title": series_data.get("title", ""),
                "language": series_data.get("language", "English"),
            }
            return episode
        except Exception as e:
            logger.warning(f"Error parsing episode container: {e}")
            return None

    def scrape_episode_details(self, episode_url: str, series_data: dict):
        """Scrape additional details from episode page."""
        if not episode_url: return {}
        try:
            logger.info(f"         [INFO] Getting episode details from: {episode_url}")
            response = self.get(episode_url, require_login=True)
            if not response: return {}
            soup = BeautifulSoup(response.text, 'html.parser')
            
            details = {}
            description = self.extract_description(soup)
            if description: details["description"] = description
            
            file_size = self.extract_file_size(soup)
            if file_size: details["file_size"] = file_size
            
            download_url = self.extract_series_download_url(soup)
            if download_url: details["download_url"] = download_url
            
            return details
        except Exception as e:
            logger.warning(f"Could not get episode details: {e}")
            return {}

    def extract_series_download_url(self, soup: BeautifulSoup) -> str:
        """Extract download URL from series episode page."""
        download_url = ""
        
        # Look for downloadserie.php links
        downloadserie_pattern = r'https?://[^"\']*mobifliks\.info[^"\']*downloadseries?.*\.php[^"\']*'
        downloadserie_matches = re.findall(downloadserie_pattern, str(soup), re.IGNORECASE)
        
        if downloadserie_matches:
            download_url = downloadserie_matches[0].strip('"\'')
            return download_url
        
        # Look for download buttons
        download_buttons = soup.find_all(['a', 'button'])
        for button in download_buttons:
            text = button.get_text(strip=True).lower()
            if 'download' in text:
                href = ""
                if button.name == 'a': href = button.get('href', '')
                elif button.name == 'button':
                    parent_a = button.find_parent('a', href=True)
                    if parent_a: href = parent_a.get('href', '')
                
                if href and ('downloadserie' in href or 'downloadmp4.php' in href or '.mp4' in href):
                    download_url = href
                    break
        
        if download_url and not download_url.startswith('http'):
            if download_url.startswith('/'): download_url = f"{self.video_base_url.rstrip('/')}{download_url}"
            else: download_url = f"{self.video_base_url.rstrip('/')}/{download_url}"
        
        return download_url

    def extract_direct_media_sources(self, soup: BeautifulSoup) -> List[str]:
        html_str = str(soup)
        candidates = []
        seen = set()
        patterns = [r"file\s*:\s*['\"]((?:https?:)?//[^'\"]+\.(?:mp4|m3u8|webm)[^'\"]*)['\"]", r"source\s+src=['\"]((?:https?:)?//[^'\"]+\.(?:mp4|m3u8|webm)[^'\"]*)['\"]"]
        for p in patterns:
            for m in re.findall(p, html_str, re.IGNORECASE):
                n = self.normalize_media_url(m)
                if n and n not in seen:
                    seen.add(n); candidates.append(n)
        return candidates

    def normalize_media_url(self, url: str) -> str:
        if not url: return ""
        n = html.unescape(url.strip().strip('"\'')).replace("\\/", "/")
        if n.startswith("//"): n = f"https:{n}"
        if not n.startswith("http"):
            if n.startswith("/"): n = f"{self.video_base_url.rstrip('/')}{n}"
            else: n = f"{self.video_base_url.rstrip('/')}/{n.lstrip('/')}"
        return n.replace(" ", "%20")

    def extract_download_url(self, soup: BeautifulSoup) -> str:
        """Extract download URL from page using robust 6-method fallback."""
        download_url = ""
        html_str = str(soup)
        # PRIMARY METHOD: Look for downloadmp4.php proxy links (Restored from old scraper)
        # Mobifliks proxy links bypass hotlink protection that blocks direct .mp4 playback.
        # Method 1: Look for downloadmp4.php links with file param
        downloadmp4_pattern = r'https?://[^"\']*mobifliks\.info[^"\']*downloadmp4\.php[^"\']*file=[^"\']*\.mp4[^"\']*'
        downloadmp4_matches = re.findall(downloadmp4_pattern, html_str, re.IGNORECASE)
        if downloadmp4_matches: return self.normalize_media_url(downloadmp4_matches[0].strip('"\''))
        
        # Pattern 2: Any downloadmp4.php link
        downloadmp4_simple = r'https?://[^"\']*downloadmp4\.php[^"\']*'
        downloadmp4_simple_matches = re.findall(downloadmp4_simple, html_str, re.IGNORECASE)
        if downloadmp4_simple_matches: return self.normalize_media_url(downloadmp4_simple_matches[0].strip('"\''))
        
        # Method 2: Look for download buttons with specific text
        download_buttons = soup.find_all(['a', 'button'])
        for button in download_buttons:
            text = button.get_text(strip=True).lower()
            if 'download' in text and ('movie' in text or 'video' in text):
                href = ""
                if button.name == 'a': href = button.get('href', '')
                elif button.name == 'button':
                    parent_a = button.find_parent('a', href=True)
                    if parent_a: href = parent_a.get('href', '')
                if href and ('downloadmp4.php' in href or '.mp4' in href):
                    return self.normalize_media_url(href)
        
        # Method 3: Look for File Size text and find nearby links
        file_size_elements = soup.find_all(string=re.compile(r'File Size:', re.IGNORECASE))
        for element in file_size_elements:
            parent_div = element.find_parent(['div', 'p', 'span'])
            if parent_div:
                download_links = parent_div.find_all('a', href=True)
                for link in download_links:
                    href = link.get('href', '')
                    if href and ('download' in href.lower() or '.mp4' in href.lower()):
                        return self.normalize_media_url(href)
        
        # Method 4: Look for direct MP4 links
        mp4_matches = re.findall(r'https?://[^"\']*mobifliks\.info[^"\']*\.mp4[^"\']*', html_str, re.IGNORECASE)
        if mp4_matches: return self.normalize_media_url(mp4_matches[0].strip('"\''))
        
        # Method 5: Traditional video tag search
        video_tags = soup.find_all('video')
        for video in video_tags:
            src = video.get('src', '')
            if src and ('.mp4' in src.lower() or '.mkv' in src.lower() or '.avi' in src.lower()):
                return self.normalize_media_url(src)
        
        # Method 6: Source tags
        source_tags = soup.find_all('source')
        for source in source_tags:
            src = source.get('src', '')
            if src and '.mp4' in src.lower():
                return self.normalize_media_url(src)
        
        # Fallback
        link = soup.find('a', href=re.compile(r'downloadmp4\.php|downloadseries?.*\.php'))
        if link: return self.normalize_media_url(link.get('href', ''))
        
        return ""

    def extract_file_size(self, soup: BeautifulSoup) -> str:
        m = re.search(r'File Size:\s*([\d\.]+\s*[KMGT]?B)', str(soup), re.IGNORECASE)
        return m.group(1).strip() if m else ""

    def extract_description(self, soup: BeautifulSoup) -> str:
        """Extract movie description from page."""
        description = ""
        
        # Method 1: Container
        desc_container = soup.find('div', class_='margin-left-100 margin-bottom')
        if desc_container:
            p_tags = desc_container.find_all('p')
            for p_tag in p_tags:
                p_text = p_tag.get_text(strip=True)
                if 'The Plot:' in p_text:
                    description = p_text.replace('The Plot:', '').strip()
                    break
        
        # Method 2: All paragraphs
        if not description:
            all_p_tags = soup.find_all('p')
            for p_tag in all_p_tags:
                p_text = p_tag.get_text(strip=True)
                if 'The Plot:' in p_text:
                    description = p_text.replace('The Plot:', '').strip()
                    break
        
        # Method 3: Text search
        if not description:
            all_text = soup.get_text()
            if 'The Plot:' in all_text:
                plot_match = re.search(r'The Plot:\s*(.*?)(?=\n\n|\nGenre:|$)', all_text, re.DOTALL)
                if plot_match: description = plot_match.group(1).strip()
        
        if description: description = re.sub(r'\s+', ' ', description).strip()
        return description

    def extract_metadata(self, soup: BeautifulSoup) -> Dict[str, any]:
        """Extract metadata (genre, stars, director, views) from page."""
        metadata = {"genres": [], "stars": [], "director": "", "views": 0}
        desc_container = soup.find('div', class_='margin-left-100 margin-bottom')
        if desc_container:
            for p_tag in desc_container.find_all('p'):
                p_text = p_tag.get_text(strip=True)
                if p_text.startswith('Genre:'):
                    genre_text = p_text.replace('Genre:', '').strip()
                    metadata["genres"] = [g.strip() for g in genre_text.split(',')] if ', ' in genre_text else [genre_text]
                elif p_text.startswith('Stars:'):
                    stars_text = p_text.replace('Stars:', '').strip()
                    metadata["stars"] = [s.strip() for s in stars_text.split(',')] if ', ' in stars_text else [stars_text]
                elif p_text.startswith('Director:'):
                    metadata["director"] = p_text.replace('Director:', '').strip()
                elif 'views' in p_text.lower():
                    views_match = re.search(r'(\d+)\s*views', p_text.lower())
                    if views_match: metadata["views"] = int(views_match.group(1))
        return metadata

    def scrape_movie_details(self, url: str) -> Tuple[str, str, Dict]:
        try:
            logger.info(f"   [INFO] Fetching: {url}")
            resp = self.get(url, require_login=True)
            if not resp: return "", "", {}
            soup = BeautifulSoup(resp.text, 'html.parser')
            
            download_url = self.extract_download_url(soup)
            description = self.extract_description(soup)
            
            metadata = {"file_size": self.extract_file_size(soup), "genres": [], "stars": [], "director": "", "views": 0}
            metadata.update(self.extract_metadata(soup))
            
            if download_url: logger.info(f"   [OK] Download URL found: {download_url[:30]}...")
            return download_url, description, metadata
        except Exception as e: 
            logger.error(f"Error scraping details from {url}: {e}")
            return "", "", {}

    def parse_movie_container(self, container, category: str, force_update: bool = False):
        try:
            link = container.find("a", class_="text-primary-hover") or container.find("a", href=re.compile(r"vid_id="))
            if not link: return None
            title = link.get_text(strip=True)
            details_url = link.get("href", "") or ""
            mid = ""
            m = re.search(r"vid_id=(\d+)", details_url)
            if m: mid = m.group(1)
            if not mid: return None

            # Determine cat_id based on category (Restored from old scraper)
            cat_id = "4"  # Default Luganda
            if "cat_id=2" in details_url or "english" in category.lower():
                cat_id = "2"
            elif "cat_id=5" in details_url or "cartoon" in category.lower():
                cat_id = "5"
            elif "cat_id=15" in details_url or "classic" in category.lower():
                cat_id = "15"
            elif "cat_id=11" in details_url or "christian" in category.lower():
                cat_id = "11"

            # SMART RE-SCRAPE: Check if existing movie has a good download URL
            if not force_update:
                existing = self.db.get_movie_by_id(mid)
                if existing:
                    old_dl = existing.get("download_url", "")
                    is_raw_mobifliks = ('mobifliks' in old_dl and 'downloadmp4.php' not in old_dl and '.mp4' in old_dl)
                    has_valid_dl = old_dl and not is_raw_mobifliks and ('downloadmp4.php' in old_dl or '.mp4' in old_dl or 'youtube' in old_dl)
                    has_tmdb = bool((existing.get("raw_data") or {}).get("tmdb_id"))
                    
                    if has_valid_dl and has_tmdb:
                        # Fully scraped and enriched — skip entirely
                        logger.info(f"   [SKIP] Movie {title} already scraped and enriched.")
                        return existing
                    elif has_valid_dl and not has_tmdb:
                        # Has download URL but missing TMDB — skip re-scraping the download, but re-run TMDB enrichment
                        logger.info(f"   [ENRICH] Movie {title} has URL but needs TMDB enrichment...")
                        movie = dict(existing)
                        if self.tmdb:
                            try:
                                title_year = self.extract_year_from_title(title)
                                search_title = self.clean_title_for_tmdb(title)
                                if title_year:
                                    movie["year"] = title_year
                                p = self.tmdb.find_poster(search_title, title_year or movie.get("year"), media_type="movie")
                                if p:
                                    movie["image_url"] = p.url
                                    movie.setdefault("raw_data", {})["tmdb_id"] = p.tmdb_id
                                    tmdb_details = self.tmdb.fetch_details(p.tmdb_id, media_type="movie")
                                    if tmdb_details:
                                        if tmdb_details.get("overview"): movie["description"] = tmdb_details["overview"][:1000]
                                        if tmdb_details.get("genres"): movie["genres"] = tmdb_details["genres"]
                                        if tmdb_details.get("release_date"):
                                            movie["release_date"] = tmdb_details["release_date"]
                                        if tmdb_details.get("runtime_minutes"): movie["runtime_minutes"] = tmdb_details["runtime_minutes"]
                                        if tmdb_details.get("backdrop_url"): movie["backdrop_url"] = tmdb_details["backdrop_url"]
                                    cert = self.tmdb.fetch_certification(p.tmdb_id, media_type="movie")
                                    if cert: movie["certification"] = cert
                                    cast = self.tmdb.fetch_cast(p.tmdb_id, media_type="movie", limit=10)
                                    if cast:
                                        movie["cast"] = cast
                                        movie["stars"] = [c["name"] for c in cast if "name" in c]
                                    time.sleep(0.1)
                            except Exception as e:
                                logger.error(f"TMDB enrichment error for {title}: {e}")
                        self.db.save_movie(movie)
                        return movie

            # Parse title for better data separation
            parsed = self.parse_title(title)

            logger.info(f"   [RUN] Full scrape for {parsed['clean_title']}...")
            import urllib.parse
            encoded_title = urllib.parse.quote(title)
            video_page_url = f"https://www.mobifliks.com/downloadvideo2.php?vid_id={mid}&vid_name={encoded_title}&cat_id={cat_id}"
            dl, desc, meta = self.scrape_movie_details(video_page_url)
            
            movie = {
                "mobifliks_id": mid, 
                "title": parsed["clean_title"], 
                "year": parsed["year"],
                "vj_name": parsed["vj_name"],
                "language": parsed["language"],
                "type": "movie", "download_url": dl, "description": desc,
                "image_url": self.make_absolute_url(container.find("img").get("src", "")) if container.find("img") else "",
                "video_page_url": video_page_url, "scraped_at": datetime.now().isoformat(),
                "raw_data": {"original_title": title}
            }
            if self.tmdb:
                try:
                    # Use parsed metadata for TMDB
                    title_year = parsed["year"] or self.extract_year_from_title(title)
                    search_title = self.clean_title_for_tmdb(parsed["clean_title"])
                    if title_year:
                        movie["year"] = title_year
                    p = self.tmdb.find_poster(search_title, movie.get("year"), media_type="movie")
                    if p:
                        movie["image_url"] = p.url
                        movie.setdefault("raw_data", {})["tmdb_id"] = p.tmdb_id
                        
                        # Full TMDB Enrichment - User requested "all details from TMDB"
                        tmdb_details = self.tmdb.fetch_details(p.tmdb_id, media_type="movie")
                        if tmdb_details:
                            if tmdb_details.get("overview"): movie["description"] = tmdb_details["overview"][:1000]
                            if tmdb_details.get("genres"): movie["genres"] = tmdb_details["genres"]
                            if tmdb_details.get("release_date"):
                                movie["release_date"] = tmdb_details["release_date"]
                                try: movie["year"] = int(tmdb_details["release_date"].split("-")[0])
                                except: pass
                            if tmdb_details.get("runtime_minutes"): movie["runtime_minutes"] = tmdb_details["runtime_minutes"]
                            if tmdb_details.get("backdrop_url"): movie["backdrop_url"] = tmdb_details["backdrop_url"]
                            
                        # Certification (MPAA rating)
                        cert = self.tmdb.fetch_certification(p.tmdb_id, media_type="movie")
                        if cert: movie["certification"] = cert
                        
                        # Cast / Stars mapping
                        cast = self.tmdb.fetch_cast(p.tmdb_id, media_type="movie", limit=10)
                        if cast:
                            movie["cast"] = cast
                            # Map cast names back to "stars" for compatibility with existing UI
                            movie["stars"] = [c["name"] for c in cast if "name" in c]
                        
                        time.sleep(0.1) # Respectful rate-limiting
                except Exception as e:
                    logger.error(f"Movie TMDB enrichment error: {e}")
            
            self.db.save_movie(movie)
            return movie
        except Exception as e:
            logger.error(f"Error parsing movie container: {e}")
            return None

    def run_full_scrape(self, force_update: bool = False):
        logger.info(f"Starting full scrape {'(REPLACE MODE)' if force_update else ''}...")
        if not self.login_success: return []
        try:
            items = self.scrape_all_categories(force_update=force_update)
            logger.info(f"Complete: {len(items)}")
            return items
        except Exception as e:
            logger.error(f"Fatal error during full scrape: {e}")
            return []
        finally:
            self.db.close()

if __name__ == "__main__":
    import argparse
    from config import USERNAME, PHONE_NUMBER, COUNTRY_CODE

    parser = argparse.ArgumentParser(description="Mobifliks Scraper")
    parser.add_argument("--category", type=str, help="Specific category to scrape")
    parser.add_argument("--force", "--replace", action="store_true", help="Force update/replace all movies without skipping")
    args = parser.parse_args()

    is_forced = args.force

    # Disable force_update for general CLI usage unless explicitly requested.
    scraper = MobifliksMirrorScraper(
        username=USERNAME,
        phone=PHONE_NUMBER,
        country_code=COUNTRY_CODE
    )
    
    if args.category:
        logger.info(f"Starting targeted scrape for category: {args.category}")
        
        # Match user input against actual default categories
        cat_match = None
        for cat in scraper.get_default_categories():
            # If user enters 'luganda', match 'luganda_movies' for example
            if args.category.lower() in cat["name"].lower():
                cat_match = cat
                break
                
        if cat_match:
            if cat_match["kind"] == "series":
                scraper.scrape_series_category(cat_match["url"], cat_match["name"], force_update=is_forced)
            else:
                scraper.scrape_category(cat_match["url"], cat_match["name"], force_update=is_forced)
        else:
            logger.error(f"Category '{args.category}' not found! Available options:")
            for c in scraper.get_default_categories():
                logger.error(f"  - {c['name']}")
    else:
        scraper.run_full_scrape(force_update=is_forced)
