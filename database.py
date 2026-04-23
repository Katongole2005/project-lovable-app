import json
import os
import random
from datetime import datetime, timedelta
from typing import Any, Dict, Iterable, List, Optional

import requests
from dotenv import load_dotenv

load_dotenv()


def _clean_env(name: str) -> str:
    value = os.getenv(name, "")
    value = value.strip()
    if len(value) >= 2 and value[0] == value[-1] and value[0] in {"'", '"'}:
        value = value[1:-1].strip()
    return value


class MovieDatabase:
    """Supabase PostgREST client for the movies dataset."""

    def __init__(self, db_name: str = "ignored"):
        self.url = _clean_env("SUPABASE_URL")
        self.key = (
            _clean_env("SUPABASE_SERVICE_ROLE_KEY")
            or _clean_env("SUPABASE_KEY")
            or _clean_env("SUPABASE_ANON_KEY")
        )

        if not self.url or not self.key:
            print(
                "WARNING: SUPABASE_URL and a Supabase key must be set in .env "
                "(prefer SUPABASE_SERVICE_ROLE_KEY for backend writes)"
            )
        elif not _clean_env("SUPABASE_SERVICE_ROLE_KEY"):
            print(
                "WARNING: SUPABASE_SERVICE_ROLE_KEY is not set. "
                "Read operations may work, but RLS can block backend writes."
            )

        self.rest_url = f"{self.url.rstrip('/')}/rest/v1"
        self.headers = {
            "apikey": self.key,
            "Authorization": f"Bearer {self.key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation",
        }
        self.session = requests.Session()
        self.session.headers.update(self.headers)

    def close(self):
        self.session.close()

    def create_tables(self):
        pass

    def _request(
        self,
        method: str,
        path: str,
        *,
        params: Optional[Any] = None,
        json_body: Optional[Any] = None,
        headers: Optional[Dict[str, str]] = None,
    ) -> Optional[requests.Response]:
        try:
            url = f"{self.rest_url}{path}"
            # Use the persistent session
            response = self.session.request(
                method=method,
                url=url,
                params=params,
                json=json_body,
                headers=headers, # Headers from session are merged automatically
                timeout=30,
            )
            return response
        except Exception as exc:
            print(f"Supabase request error {method} {path}: {exc}")
            return None

    def _json(self, response: Optional[requests.Response], default: Any) -> Any:
        if response is None or response.status_code >= 400:
            return default
        try:
            return response.json()
        except Exception:
            return default

    def _quote_ilike(self, value: str) -> str:
        return f"*{value.strip()}*"

    def _count(self, table: str, filters: Optional[Any] = None) -> int:
        headers = {**self.headers, "Prefer": "count=exact"}
        params: List[tuple[str, str]] = [("select", "id"), ("limit", "1")]
        if isinstance(filters, dict):
            params.extend((key, value) for key, value in filters.items())
        elif isinstance(filters, Iterable):
            params.extend(filters)

        response = self._request("GET", f"/{table}", params=params, headers=headers)
        if response is None or response.status_code >= 400:
            return 0

        content_range = response.headers.get("Content-Range", "")
        if "/" not in content_range:
            return 0
        try:
            return int(content_range.rsplit("/", 1)[1])
        except Exception:
            return 0

    def _dump(self, value: Any) -> str:
        return json.dumps(value, ensure_ascii=True)

    def _load(self, value: Any, default: Any = None) -> Any:
        if value is None:
            return default
        if isinstance(value, (dict, list)):
            return value
        try:
            return json.loads(value)
        except Exception:
            return default if default is not None else value

    def ping(self) -> bool:
        response = self._request("GET", "/movies", params={"select": "id", "limit": "1"})
        return response is not None and response.status_code < 400

    def save_movie(self, movie_data: Dict[str, Any]) -> Optional[int]:
        mobifliks_id = movie_data.get("mobifliks_id")
        title = movie_data.get("title")
        if not mobifliks_id or not title:
            return None

        now = datetime.now().isoformat()
        payload = {
            "mobifliks_id": mobifliks_id,
            "title": title,
            "year": movie_data.get("year"),
            "vj_name": movie_data.get("vj_name"),
            "language": movie_data.get("language"),
            "genres": movie_data.get("genres", []),
            "stars": movie_data.get("stars", []),
            "director": movie_data.get("director", ""),
            "price": movie_data.get("price"),
            "views": int(movie_data.get("views", 0) or 0),
            "file_size": movie_data.get("file_size", ""),
            "image_url": movie_data.get("image_url"),
            "backdrop_url": movie_data.get("backdrop_url"),
            "cast": movie_data.get("cast", []),
            "certification": movie_data.get("certification"),
            "runtime_minutes": movie_data.get("runtime_minutes"),
            "release_date": movie_data.get("release_date"),
            "details_url": movie_data.get("details_url"),
            "download_url": movie_data.get("download_url"),
            "server2_url": movie_data.get("server2_url"),
            "video_page_url": movie_data.get("video_page_url"),
            "description": movie_data.get("description"),
            "type": movie_data.get("type", "movie"),
            "total_episodes": movie_data.get("total_episodes", 0),
            "series_id": movie_data.get("series_id"),
            "episode_number": movie_data.get("episode_number"),
            "raw_data": movie_data.get("raw_data", {}),
            "last_updated": now,
        }

        headers = {**self.headers, "Prefer": "resolution=merge-duplicates,return=representation"}
        try:
            series_id = payload.get("series_id")
            if series_id and payload.get("type") == "episode":
                check_resp = self._request(
                    "GET",
                    "/movies",
                    params={"mobifliks_id": f"eq.{series_id}", "type": "eq.series", "select": "id"},
                )
                if check_resp is not None and check_resp.status_code < 400 and not self._json(check_resp, []):
                    placeholder = {
                        "mobifliks_id": series_id,
                        "title": series_id.replace("series_", "Series "),
                        "type": "series",
                        "total_episodes": 1,
                        "language": movie_data.get("language", "English"),
                        "last_updated": now,
                    }
                    self._request(
                        "POST",
                        "/movies",
                        params={"on_conflict": "mobifliks_id"},
                        json_body=placeholder,
                        headers=headers,
                    )

            response = self._request(
                "POST",
                "/movies",
                params={"on_conflict": "mobifliks_id"},
                json_body=payload,
                headers=headers,
            )
            if response is None or response.status_code >= 400:
                if response is not None:
                    print(f"Error saving movie {title}: {response.text}")
                return None

            data = self._json(response, [])
            if data:
                return data[0].get("id")
        except Exception as exc:
            print(f"Exception saving movie to Supabase: {exc}")
        return None

    def update_movie(self, row_id: int, payload: Dict[str, Any]) -> bool:
        if not payload:
            return True
        response = self._request(
            "PATCH",
            "/movies",
            params={"id": f"eq.{row_id}"},
            json_body=payload,
            headers={**self.headers, "Prefer": "return=representation"},
        )
        if response is None or response.status_code >= 400:
            return False
        return bool(self._json(response, []))

    def update_movie_by_mobifliks_id(self, mobifliks_id: str, payload: Dict[str, Any]) -> bool:
        if not mobifliks_id or not payload:
            return False
        response = self._request(
            "PATCH",
            "/movies",
            params={"mobifliks_id": f"eq.{mobifliks_id}"},
            json_body=payload,
            headers={**self.headers, "Prefer": "return=representation"},
        )
        if response is None or response.status_code >= 400:
            return False
        return bool(self._json(response, []))

    def list_movies_for_enrichment(self, content_types: List[str]) -> List[Dict[str, Any]]:
        if not content_types:
            return []
        params = {
            "select": "id,mobifliks_id,title,year,type,image_url,description,stars,genres,raw_data",
            "type": f"in.({','.join(content_types)})",
            "order": "id.asc",
            "limit": "5000",
        }
        response = self._request("GET", "/movies", params=params)
        return self._json(response, [])

    def list_movies_needing_media_repair(self, limit: int = 100, offset: int = 0) -> List[Dict[str, Any]]:
        params: List[tuple[str, str]] = [
            ("select", "id,mobifliks_id,title,download_url,video_page_url,details_url,type"),
            ("type", "in.(movie,episode)"),
            ("or", "(download_url.is.null,download_url.eq.,download_url.ilike.*downloadmp4.php*)"),
            ("order", "id.asc"),
            ("limit", str(limit)),
            ("offset", str(offset)),
        ]
        response = self._request("GET", "/movies", params=params)
        return self._json(response, [])

    def save_episode(self, series_id: str, episode_data: Dict[str, Any]) -> Optional[int]:
        episode_data["type"] = "episode"
        episode_data["series_id"] = series_id
        return self.save_movie(episode_data)

    def search_movies(
        self,
        query: str,
        limit: int = 50,
        offset: int = 0,
        title_only: bool = False,
    ) -> tuple[List[Dict[str, Any]], int]:
        try:
            self._request("POST", "/search_history", json_body={"query": query}, headers=self.headers)
        except Exception:
            pass

        params: Dict[str, str] = {
            "select": "*",
            "limit": str(limit),
            "offset": str(offset),
        }
        safe_query = self._quote_ilike(query)
        if title_only:
            params["title"] = f"ilike.{safe_query}"
        else:
            or_filter = ",".join(
                [
                    f"title.ilike.{safe_query}",
                    f"director.ilike.{safe_query}",
                    f"vj_name.ilike.{safe_query}",
                ]
            )
            params["or"] = f"({or_filter})"

        response = self._request("GET", "/movies", params=params)
        data = self._json(response, [])
        return data, len(data)

    def get_movie_by_id(self, mobifliks_id: str) -> Optional[Dict[str, Any]]:
        response = self._request(
            "GET",
            "/movies",
            params={"mobifliks_id": f"eq.{mobifliks_id}", "select": "*"},
        )
        data = self._json(response, [])
        if not data:
            return None

        movie = data[0]
        if movie.get("type") == "series":
            movie["episodes"] = self.get_series_episodes(mobifliks_id)
        return movie

    def get_series_episodes(self, series_id: str, limit: Optional[int] = None) -> List[Dict[str, Any]]:
        params = {
            "series_id": f"eq.{series_id}",
            "type": "eq.episode",
            "order": "episode_number.asc",
            "select": "*",
        }
        if limit:
            params["limit"] = str(limit)
        response = self._request("GET", "/movies", params=params)
        return self._json(response, [])

    def get_statistics(self) -> Dict[str, Any]:
        response = self._request("POST", "/rpc/get_statistics", headers=self.headers)
        stats = self._json(response, {})
        if not stats:
            return {}

        if stats.get("total_views") is None:
            stats["total_views"] = 0

        type_counts = stats.get("type_counts") or []
        for row in type_counts:
            stats[f"total_{row.get('type', 'movie')}s"] = row.get("count", 0)

        popular = stats.get("popular_searches") or []
        stats["popular_searches"] = [(row.get("query"), row.get("count")) for row in popular]
        return stats

    def get_popular_movies(self, limit: int = 50, content_type: Optional[str] = None) -> List[Dict[str, Any]]:
        params: Dict[str, str] = {
            "select": "*",
            "limit": str(limit),
            "order": "views.desc,created_at.desc",
        }
        if content_type and content_type != "all":
            params["type"] = f"eq.{content_type}"
        response = self._request("GET", "/movies", params=params)
        return self._json(response, [])

    def get_random_movies(self, limit: int = 10, content_type: str = "movie") -> List[Dict[str, Any]]:
        params: List[tuple[str, str]] = [
            ("select", "*"),
            ("limit", "250"),
            ("order", "created_at.desc"),
        ]
        if content_type in {"movie", "series", "episode"}:
            params.append(("type", f"eq.{content_type}"))
        if content_type in {"movie", "episode"}:
            params.append(("download_url", "not.is.null"))
            params.append(("download_url", "neq."))
        if content_type == "series":
            params.append(("total_episodes", "gt.0"))

        response = self._request("GET", "/movies", params=params)
        items = self._json(response, [])
        if len(items) <= limit:
            return items
        return random.sample(items, limit)

    def get_recent_movies(
        self,
        limit: int = 50,
        offset: int = 0,
        content_type: Optional[str] = "movie",
    ) -> List[Dict[str, Any]]:
        params: Dict[str, str] = {
            "select": "*",
            "limit": str(limit),
            "offset": str(offset),
            "order": "year.desc.nullslast,created_at.desc,id.desc",
        }
        if content_type and content_type != "all":
            params["type"] = f"eq.{content_type}"
        response = self._request("GET", "/movies", params=params)
        return self._json(response, [])

    def get_all_series(
        self,
        limit: int = 50,
        offset: int = 0,
        language: Optional[str] = None,
        min_episodes: int = 0,
    ) -> List[Dict[str, Any]]:
        params: Dict[str, str] = {
            "select": "*",
            "limit": str(limit),
            "offset": str(offset),
            "type": "eq.series",
            "order": "year.desc.nullslast,created_at.desc,id.desc",
        }
        if language:
            params["language"] = f"eq.{language}"
        if min_episodes > 0:
            params["total_episodes"] = f"gte.{min_episodes}"
        response = self._request("GET", "/movies", params=params)
        return self._json(response, [])

    def get_movies_by_vj(
        self,
        vj_name: str,
        limit: int = 50,
        offset: int = 0,
        content_type: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        params: Dict[str, str] = {
            "select": "*",
            "limit": str(limit),
            "offset": str(offset),
            "vj_name": f"ilike.{self._quote_ilike(vj_name)}",
            "order": "views.desc",
        }
        if content_type and content_type != "all":
            params["type"] = f"eq.{content_type}"
        response = self._request("GET", "/movies", params=params)
        return self._json(response, [])

    def get_movies_by_director(self, director: str, limit: int = 50) -> List[Dict[str, Any]]:
        params = {
            "select": "*",
            "limit": str(limit),
            "director": f"ilike.{self._quote_ilike(director)}",
            "order": "views.desc",
        }
        response = self._request("GET", "/movies", params=params)
        return self._json(response, [])

    def get_movies_by_genre(
        self,
        genre: str,
        limit: int = 50,
        content_type: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        params: Dict[str, str] = {
            "select": "*",
            "limit": str(limit),
            "genres": 'cs.{"' + genre.replace('"', "") + '"}',
            "order": "views.desc",
        }
        if content_type and content_type != "all":
            params["type"] = f"eq.{content_type}"
        response = self._request("GET", "/movies", params=params)
        return self._json(response, [])

    def get_movies_with_file_size(
        self,
        limit: int = 100,
        content_type: Optional[str] = "movie",
    ) -> List[Dict[str, Any]]:
        params: List[tuple[str, str]] = [
            ("select", "*"),
            ("limit", str(limit)),
            ("order", "created_at.desc"),
            ("file_size", "not.is.null"),
            ("file_size", "neq."),
        ]
        if content_type and content_type != "all":
            params.append(("type", f"eq.{content_type}"))
        response = self._request("GET", "/movies", params=params)
        return self._json(response, [])

    def get_top_series(self, limit: int = 10, min_episodes: int = 5) -> List[Dict[str, Any]]:
        params = {
            "select": "*",
            "limit": str(limit),
            "type": "eq.series",
            "total_episodes": f"gte.{min_episodes}",
            "order": "total_episodes.desc,views.desc",
        }
        response = self._request("GET", "/movies", params=params)
        return self._json(response, [])

    def get_latest_episodes(self, limit: int = 20) -> List[Dict[str, Any]]:
        params = {
            "select": "*",
            "limit": str(limit),
            "type": "eq.episode",
            "order": "created_at.desc",
        }
        response = self._request("GET", "/movies", params=params)
        return self._json(response, [])

    def get_type_counts(self) -> Dict[str, int]:
        stats = self.get_statistics()
        raw_counts = stats.get("type_counts") or []
        counts: Dict[str, int] = {}
        for row in raw_counts:
            counts[str(row.get("type"))] = int(row.get("count", 0))
        return counts

    def get_originals(self, limit: int = 50, offset: int = 0) -> List[Dict[str, Any]]:
        params = {
            "select": "*",
            "limit": str(limit),
            "offset": str(offset),
            "type": "eq.movie",
            "vj_name": "is.null",
            "order": "year.desc.nullslast,created_at.desc,id.desc",
        }
        response = self._request("GET", "/movies", params=params)
        return self._json(response, [])

    def get_english_originals(self, limit: int = 50, offset: int = 0) -> List[Dict[str, Any]]:
        params = {
            "select": "*",
            "limit": str(limit),
            "offset": str(offset),
            "type": "in.(movie,series)",
            "or": "(language.ilike.*english*,language.eq.en,language.eq.eng,title.ilike.*english*,description.ilike.*english*)",
            "order": "year.desc.nullslast,created_at.desc,id.desc",
        }
        response = self._request("GET", "/movies", params=params)
        return self._json(response, [])

    def count_series_with_episodes(self) -> int:
        return self._count("movies", [("type", "eq.series"), ("total_episodes", "gt.0")])

    def count_recent_additions(self, hours: int = 24) -> int:
        since = (datetime.utcnow() - timedelta(hours=hours)).replace(microsecond=0)
        since_iso = since.isoformat()
        return self._count("movies", [("created_at", f"gte.{since_iso}")])
