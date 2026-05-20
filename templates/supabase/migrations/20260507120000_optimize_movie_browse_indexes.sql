-- Speed up the homepage hero, latest movies, series, and originals feeds.
-- These match the common filters and ordering used by the React app.

CREATE INDEX IF NOT EXISTS idx_movies_type_release_created
ON public.movies (type, release_date DESC NULLS LAST, created_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_movies_type_release_year_created
ON public.movies (type, release_date DESC NULLS LAST, year DESC NULLS LAST, created_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_movies_series_release_views
ON public.movies (release_date DESC NULLS LAST, views DESC NULLS LAST)
WHERE type = 'series';

CREATE INDEX IF NOT EXISTS idx_movies_originals_created
ON public.movies (created_at DESC)
WHERE type = 'movie' AND vj_name IS NULL;
