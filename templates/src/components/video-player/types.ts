"use client";
import type { Movie, Series, SkipSegment, SubtitleTrack } from "@/types/movie";

export interface CinematicVideoPlayerProps {
  isOpen: boolean;
  onClose: () => void;
  videoUrl: string;
  title: string;
  movie?: Movie | Series | null;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  startTime?: number;
  subtitles?: SubtitleTrack[];
  skipSegments?: SkipSegment[];
  onPlayNext?: () => void;
  hasNextEpisode?: boolean;
}

export type PlayerLayout = "mobile-portrait" | "mobile-landscape" | "desktop";

export type GestureFlash = {
  side: "left" | "right" | "center";
  label: string;
  id: number;
};

export type PosterGradient = {
  top: string;
  middle: string;
  bottom: string;
  surface: string;
};
