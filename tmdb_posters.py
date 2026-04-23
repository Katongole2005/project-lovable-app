from __future__ import annotations

import os
import re
import time
from dataclasses import dataclass
from typing import Any, Optional
from difflib import SequenceMatcher
from datetime import datetime

import requests

TMDB_API_BASE = "https://api.themoviedb.org/3"
TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p"
TMDB_DEFAULT_IMAGE_SIZE = "w780"
TMDB_DEFAULT_PROFILE_SIZE = "w185"
TMDB_DEFAULT_BACKDROP_SIZE = "original"
TMDB_DEFAULT_LANGUAGE = "en-US"


@dataclass(frozen=True)
class TmdbPoster:
    url: str
    tmdb_id: int
    title: str
    year: Optional[int]
    media_type: str  # "movie" | "tv"


def _extract_year(date_str: Optional[str]) -> Optional[int]:
    if not date_str:
        return None
    try:
        return int(date_str.split("-", 1)[0])
    except Exception:
        return None


_STOPWORDS = {
    "vj",
    "luganda",
    "translated",
    "translation",
    "movie",
    "movies",
    "film",
    "series",
    "season",
    "episode",
    "full",
    "hd",
    "hq",
}


def _normalize_title(value: str) -> str:
    s = (value or "").strip().lower()
    if not s:
        return ""

    s = re.sub(r"\([^)]*\)", " ", s)
    s = re.sub(r"\bvj\b.*$", " ", s)  # strip trailing "VJ <name>" patterns
    s = re.sub(r"\b(episode|season)\s*\d+\b", " ", s)
    # Strip trailing numbers or parts if preceded by a title (e.g. "The Batman 2", "Title A")
    # This helps when the local title adds a suffix that TMDB doesn't use for that year
    s = re.sub(r"\s+(?:part\s+)?[a-d\d]+$", " ", s)
    s = re.sub(r"[^a-z0-9]+", " ", s)
    tokens = [t for t in s.split() if t and t not in _STOPWORDS]
    return " ".join(tokens).strip()


def _similarity(a: str, b: str) -> float:
    if not a or not b:
        return 0.0
    return SequenceMatcher(a=a, b=b).ratio()


class TmdbPosterFetcher:
    def __init__(
        self,
        api_key: str,
        *,
        image_size: str = TMDB_DEFAULT_IMAGE_SIZE,
        profile_size: str = TMDB_DEFAULT_PROFILE_SIZE,
        backdrop_size: str = TMDB_DEFAULT_BACKDROP_SIZE,
        language: str = TMDB_DEFAULT_LANGUAGE,
        timeout_sec: int = 10,
    ) -> None:
        self.api_key = api_key
        self.image_size = image_size or TMDB_DEFAULT_IMAGE_SIZE
        self.profile_size = profile_size or TMDB_DEFAULT_PROFILE_SIZE
        self.backdrop_size = backdrop_size or TMDB_DEFAULT_BACKDROP_SIZE
        self.language = language or TMDB_DEFAULT_LANGUAGE
        self.timeout_sec = timeout_sec
        self.session = requests.Session()

    @classmethod
    def from_env(cls) -> Optional["TmdbPosterFetcher"]:
        api_key = os.getenv("TMDB_API_KEY")
        if not api_key:
            return None
        image_size = os.getenv("TMDB_IMAGE_SIZE", TMDB_DEFAULT_IMAGE_SIZE)
        profile_size = os.getenv("TMDB_PROFILE_SIZE", TMDB_DEFAULT_PROFILE_SIZE)
        backdrop_size = os.getenv("TMDB_BACKDROP_SIZE", TMDB_DEFAULT_BACKDROP_SIZE)
        language = os.getenv("TMDB_LANGUAGE", TMDB_DEFAULT_LANGUAGE)
        timeout_sec = int(os.getenv("TMDB_TIMEOUT_SEC", "10") or "10")
        return cls(
            api_key,
            image_size=image_size,
            profile_size=profile_size,
            backdrop_size=backdrop_size,
            language=language,
            timeout_sec=timeout_sec,
        )

    def poster_url(self, poster_path: Optional[str]) -> Optional[str]:
        if not poster_path:
            return None
        return f"{TMDB_IMAGE_BASE}/{self.image_size}{poster_path}"

    def profile_url(self, profile_path: Optional[str]) -> Optional[str]:
        if not profile_path:
            return None
        return f"{TMDB_IMAGE_BASE}/{self.profile_size}{profile_path}"

    def backdrop_url(self, backdrop_path: Optional[str]) -> Optional[str]:
        if not backdrop_path:
            return None
        return f"{TMDB_IMAGE_BASE}/{self.backdrop_size}{backdrop_path}"

    def _request(self, path: str, params: dict[str, Any], *, retries: int = 3) -> dict[str, Any]:
        url = f"{TMDB_API_BASE}/{path.lstrip('/')}"
        merged = {"api_key": self.api_key, "language": self.language, **params}

        last_err: Exception | None = None
        for attempt in range(1, retries + 1):
            try:
                resp = self.session.get(url, params=merged, timeout=self.timeout_sec)
                if resp.status_code == 429:
                    retry_after = resp.headers.get("Retry-After")
                    try:
                        wait_s = max(int(retry_after or "1"), 1)
                    except Exception:
                        wait_s = 1
                    time.sleep(wait_s)
                    continue
                if resp.ok:
                    return resp.json()
                if resp.status_code >= 500:
                    time.sleep(0.5 * attempt)
                    continue
                return {}
            except Exception as exc:
                last_err = exc
                time.sleep(0.5 * attempt)

        if last_err:
            raise last_err
        return {}

    def find_poster(
        self,
        title: str,
        year: Optional[int],
        *,
        media_type: str,
        include_adult: bool = False,
    ) -> Optional[TmdbPoster]:
        query = (title or "").strip()
        if not query:
            return None

        media = media_type.strip().lower()
        if media not in {"movie", "tv"}:
            raise ValueError("media_type must be 'movie' or 'tv'")

        effective_year = year
        current_year = datetime.now().year
        if effective_year is not None:
            try:
                effective_year = int(effective_year)
            except Exception:
                effective_year = None

        # Some scraped series use a placeholder year (current year). Avoid biasing TMDB search with that.
        if media == "tv" and effective_year and effective_year >= current_year and not re.search(r"\b(19|20)\d{2}\b", query):
            effective_year = None

        query_variants = [query]
        # Variant 1: Normalized
        norm = _normalize_title(query)
        if norm and norm != query.lower():
            query_variants.append(norm)
            
        # Variant 2: Strip trailing digits or Part A/B/C if they exist (e.g. "Title A" -> "Title")
        clean_name = re.sub(r"\s+(?:Part\s+)?[A-D\d]+\s*$", "", query, flags=re.IGNORECASE).strip()
        if clean_name and clean_name != query:
            query_variants.append(clean_name)

        # Variant 3: If there's a " - " suffix (common in scraped names), try the left side.
        if " - " in query:
            query_variants.append(query.split(" - ", 1)[0].strip())

        query_variants = list(dict.fromkeys([q for q in query_variants if q]))

        all_results: list[dict[str, Any]] = []
        for q in query_variants[:3]:
            params: dict[str, Any] = {
                "query": q,
                "include_adult": "true" if include_adult else "false",
            }
            if effective_year:
                if media == "movie":
                    params["year"] = effective_year
                else:
                    params["first_air_date_year"] = effective_year

            data = self._request(f"search/{media}", params)
            results = data.get("results") or []
            if isinstance(results, list):
                for item in results:
                    if isinstance(item, dict):
                        all_results.append(item)

        if not all_results:
            return None

        seen_ids: set[int] = set()
        uniq_results: list[dict[str, Any]] = []
        for item in all_results:
            try:
                item_id = int(item.get("id"))
            except Exception:
                continue
            if item_id in seen_ids:
                continue
            seen_ids.add(item_id)
            uniq_results.append(item)

        best: dict[str, Any] | None = None
        best_score = -1.0

        target_norm = _normalize_title(query)
        for item in uniq_results:
            poster_path = item.get("poster_path") or item.get("backdrop_path")
            if not poster_path:
                continue

            item_title = item.get("title") if media == "movie" else item.get("name")
            item_title = (item_title or "").strip()
            item_norm = _normalize_title(item_title)
            sim = _similarity(target_norm, item_norm) if target_norm and item_norm else _similarity(query.lower(), item_title.lower())

            item_year = _extract_year(item.get("release_date") if media == "movie" else item.get("first_air_date"))
            year_bonus = 0.0
            year_bonus = 0.0
            if effective_year and item_year:
                if item_year == effective_year:
                    year_bonus = 0.40 # Heavy weight for exact year
                elif abs(item_year - effective_year) <= 1:
                    year_bonus = 0.20
                else:
                    year_bonus = -0.20 # Penalize year mismatch

            popularity = item.get("popularity") or 0.0
            try:
                pop_bonus = min(float(popularity) / 1000.0, 0.05)
            except Exception:
                pop_bonus = 0.0

            vote_count = item.get("vote_count") or 0
            try:
                vote_bonus = min(float(vote_count) / 5000.0, 0.05)
            except Exception:
                vote_bonus = 0.0

            score = sim + year_bonus + pop_bonus + vote_bonus
            if score > best_score:
                best_score = score
                best = item

        if not best:
            return None

        poster_path = best.get("poster_path") or best.get("backdrop_path")
        if not poster_path:
            return None

        tmdb_id = int(best.get("id"))
        chosen_title = best.get("title") if media == "movie" else best.get("name")
        chosen_title = (chosen_title or query).strip() or query
        chosen_year = _extract_year(best.get("release_date") if media == "movie" else best.get("first_air_date"))

        image_url = self.poster_url(poster_path) or ""
        return TmdbPoster(url=image_url, tmdb_id=tmdb_id, title=chosen_title, year=chosen_year, media_type=media)

    def fetch_overview(self, tmdb_id: int, *, media_type: str) -> str:
        media = media_type.strip().lower()
        if media not in {"movie", "tv"}:
            raise ValueError("media_type must be 'movie' or 'tv'")
        data = self._request(f"{media}/{tmdb_id}", params={})
        overview = (data.get("overview") or "").strip()
        return overview

    def fetch_details(self, tmdb_id: int, *, media_type: str) -> dict[str, Any]:
        """
        Returns extra metadata used by the UI:
        - runtime_minutes (movie: runtime, tv: first element of episode_run_time)
        - release_date (movie: release_date, tv: first_air_date)
        - backdrop_url (from backdrop_path, using TMDB_IMAGE_SIZE)
        - genres (list of genre names, e.g. ["Action", "Drama"])
        """
        media = media_type.strip().lower()
        if media not in {"movie", "tv"}:
            raise ValueError("media_type must be 'movie' or 'tv'")

        data = self._request(f"{media}/{tmdb_id}", params={})

        runtime_minutes: Optional[int] = None
        release_date: Optional[str] = None
        backdrop_url: Optional[str] = None
        genres: list[str] = []

        if media == "movie":
            release_date = (data.get("release_date") or "").strip() or None
            try:
                rt = data.get("runtime")
                runtime_minutes = int(rt) if rt is not None else None
            except Exception:
                runtime_minutes = None
        else:
            release_date = (data.get("first_air_date") or "").strip() or None
            try:
                runtimes = data.get("episode_run_time") or []
                if isinstance(runtimes, list) and runtimes:
                    runtime_minutes = int(runtimes[0])
            except Exception:
                runtime_minutes = None

        backdrop_url = self.backdrop_url(data.get("backdrop_path"))
        raw_genres = data.get("genres") or []
        if isinstance(raw_genres, list):
            for g in raw_genres:
                if not isinstance(g, dict):
                    continue
                name = (g.get("name") or "").strip()
                if name:
                    genres.append(name)

        result: dict[str, Any] = {}
        if runtime_minutes and runtime_minutes > 0:
            result["runtime_minutes"] = runtime_minutes
        if release_date:
            result["release_date"] = release_date
        if backdrop_url:
            result["backdrop_url"] = backdrop_url
        if genres:
            result["genres"] = genres
        
        overview = (data.get("overview") or "").strip()
        if overview:
            result["overview"] = overview
            
        try:
            vote_average = float(data.get("vote_average") or 0.0)
            if vote_average > 0:
                result["vote_average"] = vote_average
        except Exception:
            pass
            
        return result

    def fetch_certification(self, tmdb_id: int, *, media_type: str, region: str = "US") -> Optional[str]:
        """
        Returns the MPAA/TV rating (e.g. PG-13, TV-MA) for a region.
        """
        media = media_type.strip().lower()
        region = (region or "US").strip().upper()
        if media not in {"movie", "tv"}:
            raise ValueError("media_type must be 'movie' or 'tv'")

        if media == "movie":
            data = self._request(f"movie/{tmdb_id}/release_dates", params={})
            results = data.get("results") or []
            if not isinstance(results, list):
                return None
            chosen = next((r for r in results if isinstance(r, dict) and (r.get("iso_3166_1") == region)), None)
            if not chosen and results:
                chosen = results[0] if isinstance(results[0], dict) else None
            if not chosen:
                return None
            rels = chosen.get("release_dates") or []
            if not isinstance(rels, list):
                return None
            for entry in rels:
                if not isinstance(entry, dict):
                    continue
                cert = (entry.get("certification") or "").strip()
                if cert:
                    return cert
            return None

        data = self._request(f"tv/{tmdb_id}/content_ratings", params={})
        results = data.get("results") or []
        if not isinstance(results, list):
            return None
        chosen = next((r for r in results if isinstance(r, dict) and (r.get("iso_3166_1") == region)), None)
        if not chosen and results:
            chosen = results[0] if isinstance(results[0], dict) else None
        if not chosen:
            return None
        rating = (chosen.get("rating") or "").strip()
        return rating or None

    def fetch_cast(
        self,
        tmdb_id: int,
        *,
        media_type: str,
        limit: int = 10,
    ) -> list[dict[str, Any]]:
        media = media_type.strip().lower()
        if media not in {"movie", "tv"}:
            raise ValueError("media_type must be 'movie' or 'tv'")

        data = self._request(f"{media}/{tmdb_id}/credits", params={})
        cast_items = data.get("cast") or []
        if not isinstance(cast_items, list):
            return []

        cast_items.sort(key=lambda c: (c.get("order") if isinstance(c, dict) else 9999))

        cast: list[dict[str, Any]] = []
        for item in cast_items:
            if not isinstance(item, dict):
                continue
            name = (item.get("name") or "").strip()
            if not name:
                continue
            cast.append(
                {
                    "id": item.get("id"),
                    "name": name,
                    "character": (item.get("character") or "").strip() or None,
                    "profile_url": self.profile_url(item.get("profile_path")),
                }
            )
            if len(cast) >= max(limit, 0):
                break

        return cast
    def still_url(self, still_path: Optional[str]) -> Optional[str]:
        if not still_path:
            return None
        return f"{TMDB_IMAGE_BASE}/{self.image_size}{still_path}"

    def fetch_season_stills(self, tmdb_id: int, season_number: int = 1) -> dict[int, str]:
        """
        Returns a map of {episode_number: still_url} for a specific season.
        """
        data = self._request(f"tv/{tmdb_id}/season/{season_number}", params={})
        episodes = data.get("episodes") or []
        if not isinstance(episodes, list):
            return {}

        stills: dict[int, str] = {}
        for ep in episodes:
            if not isinstance(ep, dict):
                continue
            ep_num = ep.get("episode_number")
            still_path = ep.get("still_path")
            if ep_num and still_path:
                stills[int(ep_num)] = self.still_url(still_path)
        
        return stills
