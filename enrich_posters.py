#!/usr/bin/env python3
from __future__ import annotations

import argparse
import os
import time
from datetime import datetime

from dotenv import load_dotenv

from database import MovieDatabase
from tmdb_posters import TmdbPosterFetcher


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Enrich movies/series using TMDB (posters, backdrops, descriptions, and cast). "
            "Requires TMDB_API_KEY in your environment or .env."
        )
    )
    parser.add_argument("--db", default="mobifliks_mirror.db", help="SQLite DB file")
    parser.add_argument(
        "--content-type",
        default="all",
        choices=["all", "movie", "series"],
        help="Which content types to update",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Update even if image_url already points to TMDB",
    )
    parser.add_argument(
        "--only-missing",
        action="store_true",
        help="Only process rows where image_url is empty",
    )
    parser.add_argument("--limit", type=int, default=0, help="Max items to process (0 = all)")
    parser.add_argument(
        "--sleep",
        type=float,
        default=0.25,
        help="Seconds to sleep between TMDB requests (helps avoid rate limits)",
    )
    parser.add_argument(
        "--update-description",
        action="store_true",
        help="Update movie/series descriptions from TMDB overview",
    )
    parser.add_argument(
        "--force-description",
        action="store_true",
        help="Overwrite existing non-empty descriptions",
    )
    parser.add_argument(
        "--update-cast",
        action="store_true",
        help="Update stars + store rich cast info (names + profile images) from TMDB credits",
    )
    parser.add_argument(
        "--force-cast",
        action="store_true",
        help="Overwrite existing stars / TMDB cast data",
    )
    parser.add_argument("--cast-limit", type=int, default=10, help="Max cast members to store")
    parser.add_argument(
        "--update-details",
        action="store_true",
        help="Update runtime, release date, certification, and backdrop image from TMDB",
    )
    parser.add_argument(
        "--force-details",
        action="store_true",
        help="Overwrite existing TMDB detail fields in raw_data",
    )
    parser.add_argument(
        "--update-genres",
        action="store_true",
        help="Update genres/categories (e.g. Action, Drama) from TMDB",
    )
    parser.add_argument(
        "--force-genres",
        action="store_true",
        help="Overwrite existing genres in the DB",
    )
    parser.add_argument(
        "--region",
        default="US",
        help="Region to use for certification (default: US)",
    )
    parser.add_argument("--dry-run", action="store_true", help="Print changes without writing to DB")
    return parser.parse_args()


def main() -> int:
    load_dotenv()
    fetcher = TmdbPosterFetcher.from_env()
    if not fetcher:
        raise SystemExit(
            "TMDB_API_KEY is not set. Add it to your environment (or .env) before running this script."
        )

    args = parse_args()
    types: list[str]
    if args.content_type == "movie":
        types = ["movie"]
    elif args.content_type == "series":
        types = ["series"]
    else:
        types = ["movie", "series"]

    db = MovieDatabase(db_name=args.db)
    try:
        rows = db.list_movies_for_enrichment(types)

        processed = 0
        updated = 0
        skipped = 0

        for row in rows:
            if args.limit and processed >= args.limit:
                break

            processed += 1
            row_id = row["id"]
            mobifliks_id = row["mobifliks_id"]
            title = row["title"] or ""
            year = row["year"]
            row_type = row["type"]
            image_url = row["image_url"] or ""
            description = row["description"] or ""
            stars = db._load(row.get("stars"), [])
            genres = db._load(row.get("genres"), [])
            raw_data = db._load(row.get("raw_data"), {})
            if not isinstance(stars, list):
                stars = []
            if not isinstance(genres, list):
                genres = []
            if not isinstance(raw_data, dict):
                raw_data = {}

            if args.only_missing and image_url.strip():
                skipped += 1
                continue

            is_tmdb = "image.tmdb.org/t/p/" in image_url
            should_update_image = (not is_tmdb) or args.force
            if args.only_missing:
                should_update_image = not image_url.strip()

            media_type = "movie" if row_type == "movie" else "tv"

            try:
                poster = fetcher.find_poster(title, year, media_type=media_type)
            except Exception as exc:
                print(f"[WARN] TMDB lookup failed for {mobifliks_id} ({title}): {exc}")
                time.sleep(max(args.sleep, 0))
                continue

            if not poster:
                skipped += 1
                time.sleep(max(args.sleep, 0))
                continue

            should_update_description = False
            if args.update_description:
                if args.force_description:
                    should_update_description = True
                else:
                    should_update_description = not description.strip() or len(description.strip()) < 40

            existing_tmdb = raw_data.get("tmdb") if isinstance(raw_data.get("tmdb"), dict) else {}
            existing_cast = existing_tmdb.get("cast") if isinstance(existing_tmdb.get("cast"), list) else []
            existing_details = existing_tmdb.get("details") if isinstance(existing_tmdb.get("details"), dict) else {}
            existing_cert = (existing_tmdb.get("certification") or "").strip() if isinstance(existing_tmdb, dict) else ""

            should_update_cast = False
            if args.update_cast:
                if args.force_cast:
                    should_update_cast = True
                else:
                    should_update_cast = not stars or not existing_cast

            should_update_details = False
            if args.update_details:
                if args.force_details:
                    should_update_details = True
                else:
                    should_update_details = not existing_details or not existing_cert
            else:
                # If we're already updating the poster, also grab the backdrop/details so the
                # frontend can show a TMDB backdrop background when tapping an item.
                if should_update_image and not (existing_details.get("backdrop_url") if isinstance(existing_details, dict) else None):
                    should_update_details = True

            should_update_genres = False
            if args.update_genres:
                if args.force_genres:
                    should_update_genres = True
                else:
                    should_update_genres = not genres or genres in (["Drama", "Series"], ["Drama", "Series", "Drama"])

            new_image_url = poster.url if should_update_image else image_url
            new_description = description
            new_stars = stars
            new_genres = genres
            new_cast: list[dict[str, Any]] | None = None
            new_details: dict[str, Any] | None = None
            new_certification: str | None = None

            if should_update_description:
                try:
                    overview = fetcher.fetch_overview(poster.tmdb_id, media_type=media_type)
                    if overview:
                        new_description = overview
                except Exception as exc:
                    print(f"[WARN] TMDB overview failed for {mobifliks_id} ({title}): {exc}")

            if should_update_cast:
                try:
                    cast = fetcher.fetch_cast(poster.tmdb_id, media_type=media_type, limit=args.cast_limit)
                    new_cast = cast
                    cast_names = [c.get("name") for c in cast if isinstance(c, dict) and c.get("name")]
                    if cast_names:
                        new_stars = cast_names
                except Exception as exc:
                    print(f"[WARN] TMDB cast failed for {mobifliks_id} ({title}): {exc}")

            tmdb_payload: dict[str, Any] = dict(existing_tmdb) if isinstance(existing_tmdb, dict) else {}
            tmdb_payload.update(
                {
                    "id": poster.tmdb_id,
                    "media_type": poster.media_type,
                    "title": poster.title,
                    "year": poster.year,
                    "poster_url": poster.url,
                }
            )
            if new_cast is not None:
                tmdb_payload["cast"] = new_cast

            if should_update_details:
                try:
                    fetched_details = fetcher.fetch_details(poster.tmdb_id, media_type=media_type)
                    if fetched_details:
                        if args.force_details or not isinstance(existing_details, dict) or not existing_details:
                            new_details = fetched_details
                        else:
                            merged = dict(existing_details)
                            for k, v in fetched_details.items():
                                if k not in merged or merged.get(k) in (None, "", [], {}):
                                    merged[k] = v
                            new_details = merged
                        tmdb_payload["details"] = new_details
                        if should_update_genres:
                            detail_genres = (new_details or {}).get("genres")
                            if isinstance(detail_genres, list) and detail_genres:
                                cleaned = [str(g).strip() for g in detail_genres if str(g).strip()]
                                if cleaned:
                                    new_genres = cleaned
                except Exception as exc:
                    print(f"[WARN] TMDB details failed for {mobifliks_id} ({title}): {exc}")
                try:
                    cert = fetcher.fetch_certification(poster.tmdb_id, media_type=media_type, region=args.region)
                    if cert:
                        new_certification = cert
                        tmdb_payload["certification"] = cert
                except Exception as exc:
                    print(f"[WARN] TMDB certification failed for {mobifliks_id} ({title}): {exc}")

            raw_data["tmdb"] = tmdb_payload

            changed = (
                new_image_url != image_url
                or new_description != description
                or new_stars != stars
                or new_genres != genres
                or raw_data.get("tmdb") != existing_tmdb
            )

            if not changed:
                skipped += 1
                time.sleep(max(args.sleep, 0))
                continue

            if args.dry_run:
                parts = []
                if new_image_url != image_url:
                    parts.append("poster")
                if new_description != description:
                    parts.append("description")
                if new_stars != stars:
                    parts.append("cast")
                if args.update_details and (tmdb_payload.get("details") != existing_details or tmdb_payload.get("certification") != existing_cert):
                    parts.append("details")
                if new_genres != genres:
                    parts.append("genres")
                print(f"[DRY] {mobifliks_id} | {title} -> updated: {', '.join(parts)}")
            else:
                now = datetime.now().isoformat(timespec="seconds")
                saved = db.update_movie(
                    row_id,
                    {
                        "image_url": new_image_url,
                        "description": new_description,
                        "stars": new_stars,
                        "genres": new_genres,
                        "raw_data": raw_data,
                        "last_updated": now,
                    },
                )
                if not saved:
                    print(f"[WARN] Failed to update {mobifliks_id} | {title}")
                    time.sleep(max(args.sleep, 0))
                    continue
                flags = []
                if new_image_url != image_url:
                    flags.append("poster")
                if new_description != description:
                    flags.append("description")
                if new_stars != stars:
                    flags.append("cast")
                if args.update_details and (tmdb_payload.get("details") != existing_details or tmdb_payload.get("certification") != existing_cert):
                    flags.append("details")
                if new_genres != genres:
                    flags.append("genres")
                print(f"[OK] {mobifliks_id} | {title} -> TMDB:{poster.tmdb_id} ({', '.join(flags)})")

            updated += 1
            time.sleep(max(args.sleep, 0))

        print(
            f"\nDone. processed={processed} updated={updated} skipped={skipped} "
            f"poster_size={os.getenv('TMDB_IMAGE_SIZE', 'w780')} profile_size={os.getenv('TMDB_PROFILE_SIZE', 'w185')}"
        )
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
