import { useState, useEffect, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import type { AnimeResult } from "../types";

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [results, setResults] = useState<AnimeResult[]>([]);
  const [loading, setLoading] = useState(false);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) return;
    setLoading(true);
    try {
      const data = await api.anime.search(q);
      setResults(data);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const q = searchParams.get("q");
    if (q) doSearch(q);
  }, [searchParams, doSearch]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) {
      setSearchParams({ q: query.trim() });
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (query.trim()) {
        setSearchParams({ q: query.trim() });
      }
    }
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="mb-6">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search anime..."
          className="w-full bg-gray-900 border border-gray-700 rounded-lg p-4 text-gray-100 placeholder-gray-500 focus:outline-none focus:border-purple-500 text-lg"
          autoFocus
        />
      </form>

      {loading && <p className="text-gray-500 text-center">Searching...</p>}

      <div className="grid gap-3">
        {results.map((r) => (
          <Link
            key={r.id}
            to={`/anime/${r.id}?title=${encodeURIComponent(r.title)}`}
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
