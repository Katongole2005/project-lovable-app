# MovieBay — Replit Project

## Overview
MovieBay is a movie streaming discovery app built with React, Vite, TypeScript, Tailwind CSS, and shadcn/ui. It uses Supabase for authentication, database, and edge functions.

## Architecture
- **Frontend**: Pure React/Vite SPA (no separate backend server on Replit)
- **Auth**: Supabase Auth (email/password + Google/Apple OAuth)
- **Database**: Supabase Postgres (hosted at qiwwokfqunzgnbmfvgxo.supabase.co)
- **Edge Functions**: Supabase Edge Functions (send-email, send-push, admin-users, api-proxy)
- **State**: React Query + React Context

## Key Files
- `src/integrations/supabase/client.ts` — Supabase client (uses VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY)
- `src/integrations/supabase/types.ts` — Generated database types
- `src/integrations/lovable/index.ts` — OAuth helper (wraps Supabase native OAuth)
- `src/lib/api.ts` — All data-fetching functions (queries Supabase directly)
- `src/hooks/useAuth.tsx` — Auth context provider
- `src/hooks/useSiteSettings.tsx` — Feature flags from Supabase site_settings table
- `src/pages/` — Route pages (Index, Auth, Profile, Admin, NotFound, Maintenance)

## Environment Variables
- `VITE_SUPABASE_URL` — Supabase project URL (env var, shared)
- `VITE_SUPABASE_ANON_KEY` — Supabase anonymous key (secret)

## Development
- Run: `npm run dev` (starts Vite on port 5000)
- Build: `npm run build`
- Deploy: Static site (`deploymentTarget = "static"`, `publicDir = "dist"`)

## Filters (DB-level)
- `FilterOptions { vj?, year?, genre? }` in api.ts; `applyFilters()` chains them onto Supabase queries
- `fetchTrending`, `fetchMoviesSorted`, `fetchSeries`, `fetchByGenre` all accept `FilterOptions`
- `fetchByGenre` supports pagination (`page` param) with deterministic ordering (views→year→created_at)
- `handleLoadMore` passes `nextPage` to `fetchByGenre` for genre-filtered views
- `handleTabChange` resets both `activeFilters` and `activeCategory` to avoid stale state

## Performance
- **Code splitting**: Vendor chunks split via `manualChunks` in vite.config.ts (react, react-query, framer-motion, radix-ui)
- **Image optimization**: Posters use `/w500/`, backdrops use `/w1280/` (never `/original/`)
- **Lazy loading**: MovieModal, CinematicVideoPlayer, FilterModal are lazy-loaded; movie cards use `loading="lazy"` with priority for first visible items
- **Reduced GPU load**: DynamicBackground simplified to static + noise overlay (removed blur blob animations); hero animations use CSS transitions instead of per-element framer-motion where possible
- **Network**: VJ list extracted from already-fetched query data instead of separate 300-item fetch

## Series Grouping
- Multi-season series (e.g., "Show Season 1", "Show Season 2") are grouped into a single card in browse/search
- `getSeriesBaseName()` strips "Season X" patterns from titles for grouping
- `groupSeriesList()` merges related season entries, preserving original sort order
- `fetchSeriesDetails()` finds all related seasons by base name, fetches episodes from all, assigns proper `season_number`
- Both mobile and desktop views have season selector tabs (Season 1, Season 2, etc.)
- Season selection resets to first available season when series changes

## Supabase Tables
- `movies` — Main content table (movies, series, episodes); `series_id` links episodes to parent series; multi-season shows may have separate `type=series` rows with "Season X" in title
- `search_history` — Search query tracking
- `categories` — Genre/category data
- `site_settings` — Feature flags and admin settings
- `user_roles` — Admin/moderator roles
- `active_sessions` — Single-session enforcement per user
- `push_subscriptions` — Web push notification subscriptions

## Design System
- **Light mode**: Soft blue-gray palette with radial gradient backgrounds
- **Dark mode**: Deep cinematic theme (230 18% 5% base) with blue/teal primary accents
- **Fonts**: Plus Jakarta Sans (display), Inter (body)
- **Hero Carousel**: Desktop/tablet: full-bleed cinematic backdrop with left-side info (rank number, title, star rating, IMDB badge, genres, description, Watch Now/More buttons), right-side poster card strip (lg+ only), prev/next arrows + dot indicators; Mobile: 3D stacked card layout with Ken Burns animation, cinematic gradient background (navy-to-purple)
- **Category Chips**: Lime green (#c8f547) animated sliding pill via framer-motion layoutId
- **Movie Cards**: 3D tilt on hover with glossy light reflection, heart flip animation for watchlist, card-rim-light (gradient border glow on hover), play-ring-pulse (expanding ring animation on hover only), layered shadows (ambient + directional + inner light)
- **Bottom Nav**: Floating dark pill with spring-animated lime green active indicator, top-edge glow line, refined glass morphism (bg-black/70 + backdrop-blur-2xl)
- **Top 10 Row**: Metallic gold gradient rank numbers (Georgia serif) with multi-drop-shadow, Crown icon float animation on rank #1
- **Section Headers**: section-title class adds vertical gradient accent bar (primary→secondary) before title text; section-divider gradient lines between major sections
- **Header Nav**: border-beam animated conic-gradient border on nav pill, glass-card-premium on Profile button
- **Progress bars**: Gradient fill (primary → secondary) with glow effect
- **IMDB badges**: Gold gradient with glow shadow
- **Glow effects**: Cards and interactive elements feature subtle primary-colored glow on hover
- **Mobile Movie Detail**: Per-movie accentHue (derived from mobifliks_id hash), cinematic hero with Ken Burns + parallax scroll (separated layers), floating glass poster with accent glow, spring-physics tab indicator (framer-motion layoutId), color-adaptive genre pills/metadata/cast avatar rings, gradient play button with glow, glass morphism bottom bar with accent gradient line, collapsing header with title reveal on scroll. **Series episode timeline**: vertical timeline layout with connecting gradient line + circular numbered nodes (active episode pulses), staggered reveal animation per card, full-width widescreen thumbnails with progress bar overlay, "Continue" badge on resume target, per-episode download link. **Horizontal season pills**: inline scroll chips (S1, S2...) with active pill gradient + layoutId animation, replacing old bottom-sheet drawer. Continue-watching progress lookup lifted to parent useMemo (Map keyed by season-episode) for perf, regex-parsed episode matching (no substring false matches).
- **CSS Keyframes**: `liquidFloat` (floating ambient blobs), `kenBurnsMobile` (hero backdrop slow zoom/pan)
- **Mobile Video Player**: Touch-draggable progress bar with scrub-time preview, always-visible thumb on mobile (hover-only on desktop), swipe-vs-tap conflict resolved (swipeEnd runs before tap handler), info panel hidden on mobile for full video area, safe-area bottom padding for gesture-bar phones, controls stay visible while scrubbing, `onTouchCancel` resets scrub state
- **Auth Page**: Full-screen cinematic backdrop (random trending movie, fades in over 2s), centered glass card (145deg gradient, layered shadows, top gradient line), gradient CTA (primary→cyan), custom AuthInput with focus glow ring, social buttons in 2-col grid, animated view transitions (login/signup/forgot via AnimatePresence), left-side brand section (desktop) with gradient headline "Ugandan cinema", movie quote, stats row; mobile shows card-only with logo; canvas floating particles, Ken Burns backdrop, animated gradient text, border beam, staggered form entrances
- **Profile Page**: Redesigned with tabbed layout (Activity/Watchlist/Settings) with spring tab indicator (framer-motion layoutId), parallax hero header (useScroll/useTransform for zero-rerender perf), animated avatar ring (conic-gradient rotation), collapsing sticky nav with avatar reveal on scroll, stats grid with spring pop-in, horizontal scroll content rows (continue watching/recently viewed/watchlist) with card hover lift animations, settings section with colored icon tiles, theme switch with spring-animated knob, responsive (desktop horizontal avatar+info layout, mobile centered vertical stack, tablet adaptive), proper ARIA (role=tablist/tab/tabpanel/switch, aria-selected/checked/label)
- **Accessibility**: `prefers-reduced-motion: reduce` disables all animations globally
