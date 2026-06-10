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
      request<{ links: Record<number, string> }>(
        `/anime/sources?id=${id}&episode=${episode}&mode=${mode}`
      ),
  },
  stream: {
    proxyUrl: (url: string) => `/api/stream/proxy?url=${encodeURIComponent(url)}`,
    downloadUrl: (url: string) => `/api/stream/download?url=${encodeURIComponent(url)}`,
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
