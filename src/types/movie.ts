export interface CastMember {
  name: string;
  character?: string | null;
  profile_url?: string | null;
}

export interface Movie {
  mobifliks_id: string;
  title: string;
  year?: number;
  language?: string;
  type: 'movie' | 'series';
  image_url?: string;
  backdrop_url?: string;
  genres?: string[];
  description?: string;
  cast?: CastMember[];
  runtime_minutes?: number;
  certification?: string;
  release_date?: string;
  download_url?: string;
  views?: number;
  vj_name?: string;
  file_size?: string;
  stars?: string[];
  details_url?: string;
}

export interface Episode {
  mobifliks_id: string;
  episode_number: number;
  title?: string;
  download_url?: string;
  file_size?: string;
  views?: number;
  description?: string;
  video_page_url?: string;
}

export interface Series extends Movie {
  episodes?: Episode[];
  total_episodes?: number;
}

export interface SearchResult {
  results: Movie[];
  total_results: number;
  page: number;
}

export interface ContinueWatching {
  id: string;
  title: string;
  image: string;
  type: 'movie' | 'series';
  progress: number;
  duration: number;
  url: string;
  episodeInfo?: string;
}

export interface RecentMovie {
  id: string;
  title: string;
  image: string;
  type: 'movie' | 'series';
  time: string;
}
