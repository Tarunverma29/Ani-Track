const BASE = "/api";

function getToken(): string | null {
  return localStorage.getItem("token");
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  auth: {
    register: (username: string, email: string, password: string) =>
      request<{ access_token: string; token_type: string }>("/auth/register", {
        method: "POST",
        body: JSON.stringify({ username, email, password }),
      }),
    login: (username: string, password: string) =>
      request<{ access_token: string; token_type: string }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      }),
    me: () => request<{ id: number; username: string; email: string }>("/auth/me"),
  },
  anime: {
    search: (q: string, mode = "sub") =>
      request<{ id: string; title: string; episodes: number }[]>(
        `/anime/search?q=${encodeURIComponent(q)}&mode=${mode}`
      ),
    episodes: (id: string, mode = "sub") =>
      request<{ episodes: string[] }>(`/anime/episodes?id=${id}&mode=${mode}`),
    sources: (id: string, episode: string, mode = "sub") =>
      request<{ links: Record<number, string>; referrers: Record<number, string | null> }>(
        `/anime/sources?id=${id}&episode=${episode}&mode=${mode}`
      ),
  },
  stream: {
    proxyUrl: (url: string, ref?: string) => {
      let path = `/api/stream/proxy?url=${encodeURIComponent(url)}`;
      if (ref) path += `&ref=${encodeURIComponent(ref)}`;
      return path;
    },
    downloadUrl: (url: string, ref?: string) => {
      let path = `/api/stream/download?url=${encodeURIComponent(url)}`;
      if (ref) path += `&ref=${encodeURIComponent(ref)}`;
      return path;
    },
    getHistory: () =>
      request<
        {
          id: number;
          anime_id: string;
          anime_title: string;
          episode: string;
          progress: number;
          total_duration: number;
          last_watched: string;
        }[]
      >("/stream/history"),
    saveProgress: (
      anime_id: string,
      anime_title: string,
      episode: string,
      progress: number,
      total_duration: number
    ) =>
      request<{ status: string }>("/stream/history", {
        method: "POST",
        body: JSON.stringify({
          anime_id,
          anime_title,
          episode,
          progress,
          total_duration,
        }),
      }),
  },
  library: {
    list: (statusFilter?: string) => {
      const params = statusFilter && statusFilter !== "all" ? `?status_filter=${statusFilter}` : "";
      return request<import("../types").LibraryEntry[]>(`/library${params}`);
    },
    add: (data: {
      anime_id: string;
      anime_title: string;
      anime_title_jp?: string;
      total_episodes?: number;
      genre?: string;
      year?: number | null;
      studio?: string;
      synopsis?: string;
      image?: string;
      banner?: string;
      type?: string;
      duration?: string;
      season?: string;
      status?: string;
    }) => request<import("../types").LibraryEntry>("/library", {
      method: "POST",
      body: JSON.stringify(data),
    }),
    update: (id: number, data: { episodes_watched?: number; status?: string; user_score?: number | null }) =>
      request<import("../types").LibraryEntry>(`/library/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    remove: (id: number) => request<{ status: string }>(`/library/${id}`, { method: "DELETE" }),
    stats: () => request<import("../types").LibraryStats>("/library/stats"),
  },
  preferences: {
    get: () =>
      request<{ default_quality: number; default_mode: string }>("/preferences"),
    update: (data: { default_quality?: number; default_mode?: string }) =>
      request<{ default_quality: number; default_mode: string }>("/preferences", {
        method: "PUT",
        body: JSON.stringify(data),
      }),
  },
};
