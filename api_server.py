from fastapi import FastAPI, HTTPException, Query, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, StreamingResponse, FileResponse
from pydantic import BaseModel
from starlette.background import BackgroundTask
from typing import List, Optional, Dict, Any
from datetime import datetime
from pathlib import Path
import sys
import platform
import os
import time
from urllib.parse import urlparse

import requests
from bs4 import BeautifulSoup

try:
    from dotenv import load_dotenv
except Exception:
    load_dotenv = None

if load_dotenv:
    # Important for Passenger/cPanel where `config.py` isn't imported.
    load_dotenv()

from database import MovieDatabase
from tmdb_posters import TmdbPosterFetcher

app = FastAPI(
    title="Mobifliks Mirror API", 
    version="1.1.0",
    description="API for accessing Mobifliks movies and series with download links and file sizes"
)

PROJECT_ROOT = Path(__file__).resolve().parent
FRONTEND_DIST_PATH = PROJECT_ROOT / "templates" / "dist"
FRONTEND_INDEX_PATH = FRONTEND_DIST_PATH / "index.html"
LEGACY_INDEX_PATH = PROJECT_ROOT / "templates" / "index.html"
FRONTEND_NO_CACHE_HEADERS = {
    "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
    "Pragma": "no-cache",
    "Expires": "0",
}

# CORS configuration (set ALLOWED_ORIGINS as comma-separated list in .env)
allowed_origins_env = os.getenv("ALLOWED_ORIGINS", "*")
ALLOWED_ORIGINS = ["*"] if allowed_origins_env.strip() in {"*", ""} else [
    origin.strip() for origin in allowed_origins_env.split(",") if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = MovieDatabase()
    try:
        yield db
    finally:
        db.close()

def clean_image_url(value: Optional[str]) -> Optional[str]:
    if not value:
        return value
    cleaned = value.strip()
    if "\"" in cleaned:
        cleaned = cleaned.split("\"", 1)[0]
    if "'" in cleaned:
        cleaned = cleaned.split("'", 1)[0]
    cleaned = cleaned.rstrip(">")
    return cleaned

def normalize_movie(movie: Dict[str, Any]) -> Dict[str, Any]:
    movie["image_url"] = clean_image_url(movie.get("image_url"))
    return movie

def normalize_movies(items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    return [normalize_movie(item) for item in items]


def clean_env(name: str) -> str:
    value = (os.getenv(name) or "").strip()
    if len(value) >= 2 and value[0] == value[-1] and value[0] in {"'", '"'}:
        value = value[1:-1].strip()
    return value


def create_scraper():
    from scraper import MobifliksMirrorScraper

    username = clean_env("MOBIFLIKS_USERNAME")
    phone = clean_env("MOBIFLIKS_PHONE")
    country_code = clean_env("MOBIFLIKS_COUNTRY_CODE")

    if not username or not phone or not country_code:
        raise HTTPException(status_code=500, detail="Mobifliks credentials are not configured on the backend")

    scraper = MobifliksMirrorScraper(username=username, phone=phone, country_code=country_code)
    if not scraper.login_success:
        raise HTTPException(status_code=502, detail="Failed to authenticate with Mobifliks")
    return scraper


def is_probably_media_response(response: requests.Response) -> bool:
    content_type = (response.headers.get("Content-Type") or "").lower()
    if response.status_code not in {200, 206}:
        return False
    if content_type.startswith("text/html") or content_type.startswith("application/json"):
        return False
    return True


def try_open_media(scraper, target_url: str, range_header: Optional[str] = None) -> Optional[requests.Response]:
    headers = {
        "User-Agent": scraper.session.headers.get("User-Agent", "Mozilla/5.0"),
        "Referer": "https://www.mobifliks.com/",
        "Accept": "*/*",
    }
    parsed = urlparse(target_url)
    if parsed.netloc:
        headers["Referer"] = f"{parsed.scheme}://{parsed.netloc}/"
    if range_header:
        headers["Range"] = range_header

    try:
        response = scraper.session.get(
            target_url,
            headers=headers,
            timeout=45,
            stream=True,
            allow_redirects=True,
        )
    except Exception:
        return None

    if not is_probably_media_response(response):
        response.close()
        return None
    return response


def collect_media_candidates(scraper, target_url: str, resolved_details_url: Optional[str]) -> List[str]:
    candidate_urls: List[str] = []
    if resolved_details_url:
        try:
            details_response = scraper.get(resolved_details_url, require_login=True)
            details_soup = BeautifulSoup(details_response.text, "html.parser")
            candidate_urls.extend(scraper.extract_direct_media_sources(details_soup))
        except Exception as exc:
            print(f"[WARN] Failed to resolve media from details page {resolved_details_url}: {exc}")

    if target_url not in candidate_urls:
        candidate_urls.append(target_url)
    return candidate_urls


def resolve_media_candidate(
    scraper,
    target_url: str,
    resolved_details_url: Optional[str],
    range_header: Optional[str] = None,
) -> tuple[List[str], Optional[str], Optional[requests.Response]]:
    candidate_urls = collect_media_candidates(scraper, target_url, resolved_details_url)
    for candidate in candidate_urls:
        upstream = try_open_media(scraper, candidate, range_header=range_header)
        if upstream is not None:
            return candidate_urls, candidate, upstream
    return candidate_urls, None, None


def build_media_response(upstream: requests.Response, filename: str, inline: bool) -> StreamingResponse:
    safe_filename = (filename or "video.mp4").replace('"', "").replace("\r", "").replace("\n", "")[:200]
    headers = {
        "Content-Disposition": f'{"inline" if inline else "attachment"}; filename="{safe_filename}"',
        "Accept-Ranges": upstream.headers.get("Accept-Ranges", "bytes"),
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Expose-Headers": "Content-Length, Content-Range, Accept-Ranges, Content-Disposition",
    }
    if upstream.headers.get("Content-Length"):
        headers["Content-Length"] = upstream.headers["Content-Length"]
    if upstream.headers.get("Content-Range"):
        headers["Content-Range"] = upstream.headers["Content-Range"]

    media_type = upstream.headers.get("Content-Type") or "application/octet-stream"
    status_code = upstream.status_code if upstream.status_code in {200, 206} else 200
    return StreamingResponse(
        upstream.iter_content(chunk_size=1024 * 1024),
        status_code=status_code,
        media_type=media_type,
        headers=headers,
        background=BackgroundTask(upstream.close),
    )

def extract_tmdb_cast(movie: Dict[str, Any]) -> List[Dict[str, Any]]:
    raw_data = movie.get("raw_data")
    if not isinstance(raw_data, dict):
        return []
    tmdb = raw_data.get("tmdb")
    if not isinstance(tmdb, dict):
        return []
    cast = tmdb.get("cast")
    if not isinstance(cast, list):
        return []

    cleaned: List[Dict[str, Any]] = []
    for member in cast:
        if not isinstance(member, dict):
            continue
        name = (member.get("name") or "").strip()
        if not name:
            continue
        cleaned.append(
            {
                "name": name,
                "character": (member.get("character") or "").strip() or None,
                "profile_url": clean_image_url(member.get("profile_url")),
            }
        )

    return cleaned

def extract_tmdb_ui_details(movie: Dict[str, Any]) -> Dict[str, Any]:
    raw_data = movie.get("raw_data")
    if not isinstance(raw_data, dict):
        return {}
    tmdb = raw_data.get("tmdb")
    if not isinstance(tmdb, dict):
        return {}

    details = tmdb.get("details")
    if not isinstance(details, dict):
        details = {}

    result: Dict[str, Any] = {}
    runtime_minutes = details.get("runtime_minutes")
    if isinstance(runtime_minutes, int) and runtime_minutes > 0:
        result["runtime_minutes"] = runtime_minutes

    release_date = details.get("release_date")
    if isinstance(release_date, str) and release_date.strip():
        result["release_date"] = release_date.strip()

    backdrop_url = details.get("backdrop_url")
    if isinstance(backdrop_url, str) and backdrop_url.strip():
        result["backdrop_url"] = clean_image_url(backdrop_url)

    cert = tmdb.get("certification")
    if isinstance(cert, str) and cert.strip():
        result["certification"] = cert.strip()

    return result

class CastMemberResponse(BaseModel):
    name: str
    character: Optional[str] = None
    profile_url: Optional[str] = None

class MovieResponse(BaseModel):
    id: int
    mobifliks_id: str
    title: str
    year: Optional[int] = None
    vj_name: Optional[str] = None
    language: Optional[str] = None
    genres: List[str] = []
    stars: List[str] = []
    director: Optional[str] = None
    price: Optional[str] = None
    views: int = 0
    file_size: Optional[str] = None
    image_url: Optional[str] = None
    details_url: Optional[str] = None
    download_url: Optional[str] = None
    video_page_url: Optional[str] = None
    description: Optional[str] = None
    server2_url: Optional[str] = None
    cast: List[CastMemberResponse] = []
    runtime_minutes: Optional[int] = None
    certification: Optional[str] = None
    release_date: Optional[str] = None
    backdrop_url: Optional[str] = None
    type: str = "movie"
    total_episodes: int = 0
    series_id: Optional[str] = None
    episode_number: Optional[int] = None
    last_updated: Optional[str] = None
    created_at: Optional[str] = None

class SearchResponse(BaseModel):
    query: str
    total_results: int
    page: int
    limit: int
    results: List[MovieResponse]

class StatisticsResponse(BaseModel):
    total_movies: int
    total_series: int
    total_episodes: int
    total_vjs: int
    total_directors: int
    total_searches: int
    total_views: int
    downloadmp4_links: int
    movies_with_file_size: int
    series_with_episodes: int
    popular_searches: List[str]
    last_updated: datetime

class SeriesWithEpisodesResponse(MovieResponse):
    episodes: List[MovieResponse] = []

@app.get("/", response_class=HTMLResponse, include_in_schema=False)
async def root():
    if FRONTEND_INDEX_PATH.exists():
        return HTMLResponse(
            FRONTEND_INDEX_PATH.read_text(encoding="utf-8"),
            headers=FRONTEND_NO_CACHE_HEADERS,
        )
    if LEGACY_INDEX_PATH.exists():
        return HTMLResponse(
            LEGACY_INDEX_PATH.read_text(encoding="utf-8"),
            headers=FRONTEND_NO_CACHE_HEADERS,
        )
    return "<h1>Mobifliks Mirror API</h1>"

@app.get("/api", tags=["Meta"])
async def api_root():
    return {
        "message": "Mobifliks Mirror API",
        "version": "1.1.0",
        "endpoints": {
            "popular": "/api/popular",
            "search": "/api/search?q=query",
            "movie": "/api/movie/{mobifliks_id}",
            "statistics": "/api/stats",
            "health": "/api/health",
            "random": "/api/random",
            "recent": "/api/recent",
            "series": "/api/series",
            "series_with_episodes": "/api/series/{series_id}?include_episodes=true",
            "series_episodes": "/api/series/{series_id}/episodes",
            "by_vj": "/api/movies/by-vj/{vj_name}",
            "by_director": "/api/movies/by-director/{director}",
            "by_genre": "/api/movies/by-genre/{genre}",
            "with_file_size": "/api/movies/with-file-size"
        }
    }

@app.get("/api/popular", response_model=List[MovieResponse], tags=["Movies"])
async def popular_movies(
    limit: int = Query(20, ge=1, le=100),
    content_type: str = Query("all", description="Filter by content type: all, movie, series, episode"),
    db: MovieDatabase = Depends(get_db),
):
    """Get most popular movies/series by views"""
    try:
        return normalize_movies(db.get_popular_movies(limit=limit, content_type=content_type))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.get("/api/search", response_model=SearchResponse, tags=["Search"])
async def search_movies(
    q: str = Query(..., min_length=1, description="Search query"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    content_type: str = Query("all", description="Filter by content type: all, movie, series, episode"),
    title_only: bool = Query(False, description="Match only against title"),
    db: MovieDatabase = Depends(get_db),
):
    """Search movies by title, genre, actor, or director"""
    query = q.strip()
    if query in {"*", ""}:
        raise HTTPException(status_code=400, detail="Use /api/popular for homepage results.")

    try:
        offset = (page - 1) * limit
        results, total_results = db.search_movies(
            query,
            limit=limit,
            offset=offset,
            title_only=title_only
        )
        
        # Filter by content type if needed
        if content_type != "all":
            results = [r for r in results if r.get("type") == content_type]
        
        return {
            "query": query,
            "total_results": total_results,
            "page": page,
            "limit": limit,
            "results": [normalize_movie(r) for r in results]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search error: {str(e)}")

@app.get("/api/movie/{mobifliks_id}", response_model=MovieResponse, tags=["Movies"])
async def get_movie(mobifliks_id: str, db: MovieDatabase = Depends(get_db)):
    """Get movie details by Mobifliks ID"""
    movie = db.get_movie_by_id(mobifliks_id)
    if not movie:
        raise HTTPException(status_code=404, detail="Movie not found")
    movie = normalize_movie(movie)
    movie["cast"] = extract_tmdb_cast(movie)
    movie.update(extract_tmdb_ui_details(movie))
    if movie.get("episodes"):
        movie["episodes"] = [normalize_movie(ep) for ep in movie["episodes"]]
    return movie


@app.get("/api/media", tags=["Movies"])
async def proxy_media(
    request: Request,
    url: str = Query(..., description="Original media URL from the dataset"),
    title: str = Query("video", description="Preferred filename/title"),
    play: bool = Query(False, description="Serve inline for playback instead of attachment"),
    details_url: Optional[str] = Query(None, description="Mobifliks details/video page URL used to resolve broken links"),
    mobifliks_id: Optional[str] = Query(None, description="Movie or episode id used to look up details_url when not provided"),
    db: MovieDatabase = Depends(get_db),
):
    """Proxy media through the backend so playback/download works for protected or stale Mobifliks links."""
    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"}:
        raise HTTPException(status_code=400, detail="Only http/https media URLs are allowed")

    resolved_details_url = details_url
    if not resolved_details_url and mobifliks_id:
        movie = db.get_movie_by_id(mobifliks_id)
        if movie:
            resolved_details_url = movie.get("video_page_url") or movie.get("details_url")

    scraper = create_scraper()
    range_header = request.headers.get("range")
    candidate_urls, resolved_url, upstream = resolve_media_candidate(
        scraper,
        url,
        resolved_details_url,
        range_header=range_header,
    )

    if upstream is None or not resolved_url:
        raise HTTPException(
            status_code=502,
            detail={
                "message": "No candidate media URL returned a playable response",
                "candidate_urls": candidate_urls,
            },
        )

    suffix = Path(urlparse(resolved_url).path).suffix or ".mp4"
    filename = f"{title}{suffix}" if not title.lower().endswith(suffix.lower()) else title
    return build_media_response(upstream, filename, play)


@app.get("/api/resolve-media", tags=["Movies"])
async def resolve_media(
    url: str = Query(..., description="Original media URL from the dataset"),
    details_url: Optional[str] = Query(None, description="Mobifliks details/video page URL used to resolve broken links"),
    mobifliks_id: Optional[str] = Query(None, description="Movie or episode id used to look up details_url when not provided"),
    db: MovieDatabase = Depends(get_db),
):
    """Resolve whether a media URL has a currently playable/downloadable upstream source."""
    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"}:
        raise HTTPException(status_code=400, detail="Only http/https media URLs are allowed")

    resolved_details_url = details_url
    if not resolved_details_url and mobifliks_id:
        movie = db.get_movie_by_id(mobifliks_id)
        if movie:
            resolved_details_url = movie.get("video_page_url") or movie.get("details_url")

    scraper = create_scraper()
    candidate_urls, resolved_url, upstream = resolve_media_candidate(scraper, url, resolved_details_url)
    if upstream is not None:
        upstream.close()

    return {
        "available": resolved_url is not None,
        "resolved_url": resolved_url,
        "candidate_urls": candidate_urls,
    }

@app.get("/api/stats", response_model=StatisticsResponse, tags=["Statistics"])
async def get_statistics(db: MovieDatabase = Depends(get_db)):
    """Get system statistics"""
    try:
        stats = db.get_statistics()

        return {
            "total_movies": stats.get("total_movies", 0),
            "total_series": stats.get("total_series", 0),
            "total_episodes": stats.get("total_episodes", 0),
            "total_vjs": stats.get("total_vjs", 0),
            "total_directors": stats.get("total_directors", 0),
            "total_searches": stats.get("total_searches", 0),
            "total_views": stats.get("total_views", 0),
            "downloadmp4_links": stats.get("downloadmp4_links", 0),
            "movies_with_file_size": stats.get("movies_with_file_size", 0),
            "series_with_episodes": db.count_series_with_episodes(),
            "popular_searches": [f"{q} ({c} searches)" for q, c in stats.get("popular_searches", [])],
            "last_updated": datetime.now()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Statistics error: {str(e)}")

@app.get("/api/random", response_model=List[MovieResponse], tags=["Movies"])
async def random_movies(
    limit: int = Query(10, ge=1, le=50),
    content_type: str = Query("movie", description="Filter by content type: movie, series, episode"),
    db: MovieDatabase = Depends(get_db),
):
    """Get random movies/series"""
    try:
        return normalize_movies(db.get_random_movies(limit=limit, content_type=content_type))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.get("/api/recent", response_model=List[MovieResponse], tags=["Movies"])
async def recent_movies(
    limit: int = Query(20, ge=1, le=100),
    page: int = Query(1, ge=1),
    content_type: str = Query("all", description="Filter by content type: all, movie, series, episode"),
    db: MovieDatabase = Depends(get_db),
):
    """Get recently added movies/series"""
    try:
        offset = (page - 1) * limit
        return normalize_movies(db.get_recent_movies(limit=limit, offset=offset, content_type=content_type))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.get("/api/series", response_model=List[MovieResponse], tags=["Series"])
async def get_all_series(
    limit: int = Query(20, ge=1, le=100),
    page: int = Query(1, ge=1),
    language: Optional[str] = Query(None, description="Filter by language"),
    min_episodes: int = Query(0, ge=0, description="Minimum number of episodes"),
    db: MovieDatabase = Depends(get_db),
):
    """Get all series"""
    try:
        offset = (page - 1) * limit
        return normalize_movies(
            db.get_all_series(limit=limit, offset=offset, language=language, min_episodes=min_episodes)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error loading series: {str(e)}")

@app.get("/api/series/{series_id}/episodes", response_model=List[MovieResponse], tags=["Series"])
async def get_series_episodes(
    series_id: str,
    limit: int = Query(100, ge=1, le=200),
    db: MovieDatabase = Depends(get_db),
):
    """Get all episodes for a series"""
    try:
        episodes = db.get_series_episodes(series_id)
        
        # Limit episodes if needed
        if len(episodes) > limit:
            episodes = episodes[:limit]
            
        return [normalize_movie(ep) for ep in episodes]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error loading episodes: {str(e)}")

@app.get("/api/series/{series_id}", response_model=SeriesWithEpisodesResponse, tags=["Series"])
async def get_series_details(
    series_id: str,
    include_episodes: bool = Query(False, description="Include episodes in response"),
    db: MovieDatabase = Depends(get_db),
):
    """Get series details with optional episodes"""
    try:
        series = db.get_movie_by_id(series_id)
        if not series or series.get("type") != "series":
            raise HTTPException(status_code=404, detail="Series not found")
        series = normalize_movie(series)
        series["cast"] = extract_tmdb_cast(series)
        series.update(extract_tmdb_ui_details(series))
         
        if include_episodes:
            episodes = db.get_series_episodes(series_id)
            series["episodes"] = [normalize_movie(ep) for ep in episodes]
        
        return series
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error loading series: {str(e)}")

@app.get("/api/movies/by-vj/{vj_name}", response_model=List[MovieResponse], tags=["Movies"])
async def movies_by_vj(
    vj_name: str,
    limit: int = Query(50, ge=1, le=100),
    content_type: str = Query("all", description="Filter by content type: all, movie, series"),
    db: MovieDatabase = Depends(get_db),
):
    """Get movies by VJ name"""
    try:
        return normalize_movies(
            db.get_movies_by_vj(vj_name, limit=limit, content_type=content_type)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.get("/api/movies/by-director/{director}", response_model=List[MovieResponse], tags=["Movies"])
async def movies_by_director(
    director: str,
    limit: int = Query(50, ge=1, le=100),
    db: MovieDatabase = Depends(get_db),
):
    """Get movies by director"""
    try:
        return normalize_movies(db.get_movies_by_director(director, limit=limit))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.get("/api/movies/by-genre/{genre}", response_model=List[MovieResponse], tags=["Movies"])
async def movies_by_genre(
    genre: str,
    limit: int = Query(50, ge=1, le=100),
    content_type: str = Query("all", description="Filter by content type: all, movie, series"),
    db: MovieDatabase = Depends(get_db),
):
    """Get movies by genre"""
    try:
        return normalize_movies(
            db.get_movies_by_genre(genre, limit=limit, content_type=content_type)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.get("/api/movies/with-file-size", response_model=List[MovieResponse], tags=["Movies"])
async def movies_with_file_size(
    limit: int = Query(50, ge=1, le=100),
    content_type: str = Query("movie", description="Filter by content type: movie, episode"),
    db: MovieDatabase = Depends(get_db),
):
    """Get movies that have file size information"""
    try:
        return normalize_movies(db.get_movies_with_file_size(limit=limit, content_type=content_type))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.get("/api/health", tags=["Health"])
async def health_check(
    full: bool = Query(False, description="Include full DB statistics (slower)"),
    db: MovieDatabase = Depends(get_db),
):
    """Check API and database health"""
    try:
        if not db.ping():
            raise RuntimeError("Supabase ping failed")

        result = {
            "status": "healthy",
            "database": "connected",
            "timestamp": datetime.now().isoformat(),
            "system": {
                "python_version": sys.version,
                "platform": platform.platform(),
            },
        }

        if full:
            stats = db.get_statistics()

            result["statistics"] = {
                "total_items": stats.get("total_movies", 0),
                "movies": stats.get("total_movies", 0) - stats.get("total_series", 0) - stats.get("total_episodes", 0),
                "series": stats.get("total_series", 0),
                "episodes": stats.get("total_episodes", 0),
                "movies_with_file_size": stats.get("movies_with_file_size", 0),
                "movies_with_downloadmp4": stats.get("downloadmp4_links", 0),
                "total_views": stats.get("total_views", 0),
                "total_vjs": stats.get("total_vjs", 0),
                "recent_additions_24h": db.count_recent_additions(24),
            }

        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Health check failed: {str(e)}")

@app.get("/api/top-series", response_model=List[MovieResponse], tags=["Series"])
async def top_series(
    limit: int = Query(10, ge=1, le=50),
    min_episodes: int = Query(5, ge=1, description="Minimum episodes"),
    db: MovieDatabase = Depends(get_db),
):
    """Get top series by episode count"""
    try:
        return normalize_movies(db.get_top_series(limit=limit, min_episodes=min_episodes))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error loading top series: {str(e)}")

@app.get("/api/latest-episodes", response_model=List[MovieResponse], tags=["Series"])
async def latest_episodes(
    limit: int = Query(20, ge=1, le=100),
    db: MovieDatabase = Depends(get_db),
):
    """Get latest episodes added"""
    try:
        return normalize_movies(db.get_latest_episodes(limit=limit))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error loading latest episodes: {str(e)}")

@app.get("/api/types/count", tags=["Statistics"])
async def count_by_type(db: MovieDatabase = Depends(get_db)):
    """Get count of items by type"""
    try:
        counts = db.get_type_counts()
        return {
            "counts": counts,
            "total": sum(counts.values()),
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting type counts: {str(e)}")

@app.get("/api/originals", response_model=List[MovieResponse], tags=["Movies"])
async def english_originals(
    limit: int = Query(50, ge=1, le=200),
    page: int = Query(1, ge=1),
    db: MovieDatabase = Depends(get_db),
):
    """Get English movies and series ordered by year desc"""
    try:
        offset = (page - 1) * limit
        return normalize_movies(db.get_english_originals(limit=limit, offset=offset))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@app.get("/{full_path:path}", include_in_schema=False)
async def frontend_routes(full_path: str):
    if not FRONTEND_DIST_PATH.exists():
        raise HTTPException(status_code=404, detail="Frontend build not found")

    requested_path = (full_path or "").strip("/")
    if not requested_path:
        if FRONTEND_INDEX_PATH.exists():
            return FileResponse(FRONTEND_INDEX_PATH, headers=FRONTEND_NO_CACHE_HEADERS)
        raise HTTPException(status_code=404, detail="Frontend index not found")

    candidate = (FRONTEND_DIST_PATH / requested_path).resolve()
    try:
        candidate.relative_to(FRONTEND_DIST_PATH.resolve())
    except ValueError:
        raise HTTPException(status_code=404, detail="Not found")

    if candidate.exists() and candidate.is_file():
        return FileResponse(candidate, headers=FRONTEND_NO_CACHE_HEADERS)

    if FRONTEND_INDEX_PATH.exists():
        return FileResponse(FRONTEND_INDEX_PATH, headers=FRONTEND_NO_CACHE_HEADERS)

    raise HTTPException(status_code=404, detail="Frontend index not found")
