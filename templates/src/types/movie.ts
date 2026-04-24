export interface CastMember {
  name: string;
  character?: string | null;
  profile_url?: string | null;
}

export interface SubtitleTrack {
  id: string;
  label: string;
  language: string;
  url: string;
}

export interface SkipSegment {
  label: string;
  startTime: number;
  endTime: number;
}

export interface Movie {
  mobifliks_id: string;
  title: string;
  year?: number;
  created_at?: string | null;
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
  server2_url?: string;
  views?: number;
  vj_name?: string;
  file_size?: string;
  stars?: string[];
  details_url?: string;
  subtitles?: SubtitleTrack[];
  skip_segments?: SkipSegment[];
  video_page_url?: string;
  vj_count?: number;
  vj_versions?: Movie[];
}

export interface Episode {
  mobifliks_id: string;
  episode_number: number;
  season_number?: number;
  title?: string;
  download_url?: string;
  server2_url?: string;
  file_size?: string;
  views?: number;
  description?: string;
  video_page_url?: string;
  subtitles?: SubtitleTrack[];
  skip_segments?: SkipSegment[];
}

export interface Series extends Movie {
  episodes?: Episode[];
  total_episodes?: number;
  relatedSeasonIds?: string[];
}

export interface SearchResult {
  results: Movie[];
  total_results: number;
  page: number;
}

export interface ContinueWatching {
  id: string;
  contentId: string;
  title: string;
  image: string;
  type: 'movie' | 'series';
  progress: number;
  duration: number;
  url: string;
  updatedAt?: string;
  seriesId?: string;
  episodeId?: string;
  episodeTitle?: string;
  seasonNumber?: number;
  episodeNumber?: number;
  episodeInfo?: string;
}

export interface RecentMovie {
  id: string;
  title: string;
  image: string;
  type: 'movie' | 'series';
  time: string;
}
