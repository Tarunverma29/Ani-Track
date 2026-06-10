import { useState, useEffect, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import type { AnimeResult, HistoryEntry } from "../types";

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [results, setResults] = useState<AnimeResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState(searchParams.get("mode") || "sub");
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    api.stream.getHistory().then(setHistory).catch(() => {});
  }, []);

  const continueWatching = Object.values(
    history.reduce(
      (acc, e) => {
        if (!acc[e.anime_id] || new Date(e.last_watched) > new Date(acc[e.anime_id].last_watched)) {
          acc[e.anime_id] = e;
        }
        return acc;
      },
      {} as Record<string, HistoryEntry>
    )
  ).slice(0, 10);

  const doSearch = useCallback(async (q: string, m: string) => {
    if (!q.trim()) return;
    setLoading(true);
    try {
      const data = await api.anime.search(q, m);
      setResults(data);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const q = searchParams.get("q");
    const m = searchParams.get("mode") || "sub";
    if (q) doSearch(q, m);
  }, [searchParams, doSearch]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) {
      setSearchParams({ q: query.trim(), mode });
    }
  }

  function handleModeChange(newMode: string) {
    setMode(newMode);
    const q = searchParams.get("q");
    if (q) {
      setSearchParams({ q, mode: newMode });
    }
  }

  return (
    <div>
      {continueWatching.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-100 mb-3">Continue Watching</h2>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {continueWatching.map((e) => {
              const pct = e.total_duration > 0 ? Math.round((e.progress / e.total_duration) * 100) : 0;
              return (
                <Link
                  key={`${e.anime_id}-${e.episode}`}
                  to={`/watch/${e.anime_id}/${e.episode}?title=${encodeURIComponent(e.anime_title)}&mode=${mode}`}
                  className="flex-shrink-0 w-48 bg-gray-900 hover:bg-gray-800 border border-gray-800 rounded-lg p-3 transition"
                >
                  <div className="text-sm font-medium text-gray-200 truncate">{e.anime_title}</div>
                  <div className="text-xs text-gray-500 mt-1">Episode {e.episode}</div>
                  <div className="mt-2 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="text-xs text-gray-500 mt-1">{pct}%</div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex gap-3 mb-6 items-end">
        <form onSubmit={handleSubmit} className="flex-1">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search anime..."
            className="w-full bg-gray-900 border border-gray-700 rounded-lg p-4 text-gray-100 placeholder-gray-500 focus:outline-none focus:border-purple-500 text-lg"
            autoFocus
          />
        </form>
        <div className="flex gap-1 bg-gray-900 border border-gray-700 rounded-lg p-1">
          <button
            onClick={() => handleModeChange("sub")}
            className={`px-3 py-2 rounded-md text-sm font-medium transition ${
              mode === "sub" ? "bg-purple-600 text-white" : "text-gray-400 hover:text-gray-200"
            }`}
          >
            Sub
          </button>
          <button
            onClick={() => handleModeChange("dub")}
            className={`px-3 py-2 rounded-md text-sm font-medium transition ${
              mode === "dub" ? "bg-purple-600 text-white" : "text-gray-400 hover:text-gray-200"
            }`}
          >
            Dub
          </button>
        </div>
      </div>

      {loading && <p className="text-gray-500 text-center">Searching...</p>}

      <div className="grid gap-3">
        {results.map((r) => (
          <Link
            key={r.id}
            to={`/anime/${r.id}?title=${encodeURIComponent(r.title)}&mode=${mode}`}
            className="block bg-gray-900 hover:bg-gray-800 border border-gray-800 rounded-lg p-4 transition"
          >
            <h2 className="text-lg font-medium text-gray-100">{r.title}</h2>
            <p className="text-sm text-gray-500 mt-1">{r.episodes} episodes</p>
          </Link>
        ))}
        {!loading && searchParams.has("q") && results.length === 0 && (
          <p className="text-gray-500 text-center">No results found</p>
        )}
      </div>
    </div>
  );
}
