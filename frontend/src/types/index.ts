export interface User {
  id: number;
  username: string;
  email: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
}

export interface AnimeResult {
  id: string;
  title: string;
  episodes: number;
}

export interface EpisodeList {
  episodes: string[];
}

export interface SourceLinks {
  links: Record<number, string>;
}

export interface HistoryEntry {
  id: number;
  anime_id: string;
  anime_title: string;
  episode: string;
  progress: number;
  total_duration: number;
  last_watched: string;
}

export interface UserPreferences {
  default_quality: number;
  default_mode: string;
}

export type WatchStatus = "watching" | "completed" | "planning" | "on-hold" | "dropped";

export interface LibraryEntry {
  id: number;
  anime_id: string;
  anime_title: string;
  anime_title_jp: string;
  total_episodes: number;
  episodes_watched: number;
  status: WatchStatus;
  user_score: number | null;
  genre: string;
  year: number | null;
  studio: string;
  synopsis: string;
  image: string;
  banner: string;
  type: string;
  duration: string;
  season: string;
  last_updated: string | null;
  added_date: string | null;
}

export interface LibraryStats {
  total_entries: number;
  total_episodes: number;
  total_hours: number;
  avg_score: number | null;
  status_counts: Record<string, number>;
  genre_top: [string, number][];
  score_distribution: Record<string, number>;
  recent_activity: {
    id: number;
    anime_title: string;
    anime_title_jp: string;
    status: string;
    last_updated: string | null;
  }[];
}
