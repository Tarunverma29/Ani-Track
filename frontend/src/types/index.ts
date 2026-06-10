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
