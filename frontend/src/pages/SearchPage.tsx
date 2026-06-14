import { useState, useEffect, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import type { AnimeResult, HistoryEntry } from "../types";
import { AnsiArt } from "../components/AnsiArt";
import { BookMarked } from "lucide-react";

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [results, setResults] = useState<AnimeResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState(searchParams.get("mode") || "sub");
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => { api.stream.getHistory().then(setHistory).catch(() => {}); }, []);

  const continueWatching = Object.values(
    history.reduce((acc, e) => {
      if (!acc[e.anime_id] || new Date(e.last_watched) > new Date(acc[e.anime_id].last_watched)) acc[e.anime_id] = e;
      return acc;
    }, {} as Record<string, HistoryEntry>)
  ).slice(0, 10);

  const doSearch = useCallback(async (q: string, m: string) => {
    if (!q.trim()) return;
    setLoading(true);
    try { setResults(await api.anime.search(q, m)); }
    catch { setResults([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const sq = searchParams.get("q"), sm = searchParams.get("mode") || "sub";
    if (sq) doSearch(sq, sm);
  }, [searchParams.get("q"), searchParams.get("mode"), doSearch]);

  function handleSubmit(e: React.FormEvent) { e.preventDefault(); if (query.trim()) setSearchParams({ q: query.trim(), mode }); }
  function handleModeChange(m: string) { setMode(m); const q = searchParams.get("q"); if (q) setSearchParams({ q, mode: m }); }

  async function addToLibrary(r: AnimeResult) {
    try {
      await api.library.add({
        anime_id: r.id,
        anime_title: r.title,
        total_episodes: r.episodes,
        status: "planning",
      });
    } catch {}
  }

  return (
    <div>
      {/* ASCII art banner */}
      {!query && !searchParams.has("q") && continueWatching.length === 0 && (
        <div className="flex justify-center mb-6 overflow-hidden py-2">
          <AnsiArt variant="deer" className="opacity-90" />
        </div>
      )}

      {/* Continue watching */}
      {continueWatching.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <span style={{ color: "#b83040", fontFamily: "'JetBrains Mono', monospace", fontSize: "0.7rem" }}>▶</span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", color: "#4a5a6e", fontSize: "0.7rem", letterSpacing: "0.12em" }}>CONTINUE WATCHING</span>
            <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
          </div>
          <div className="flex gap-4 overflow-x-auto pb-3" style={{ scrollbarWidth: "none" }}>
            {continueWatching.map((e) => {
              const pct = e.total_duration > 0 ? Math.round((e.progress / e.total_duration) * 100) : 0;
              return (
                <Link key={`${e.anime_id}-${e.episode}`}
                  to={`/watch/${e.anime_id}/${e.episode}?title=${encodeURIComponent(e.anime_title)}&mode=${mode}`}
                  className="flex-shrink-0 border p-4 hover:opacity-80 transition no-underline"
                  style={{ width: 220, borderColor: "rgba(255,255,255,0.07)", background: "#0c0f14" }}>
                  <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.9rem", fontWeight: 600, color: "#c8d4e0" }} className="truncate">{e.anime_title}</div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", color: "#4a5a6e", fontSize: "0.7rem", marginTop: 6 }}>Episode {e.episode}</div>
                  <div className="mt-3 relative h-1 w-full" style={{ background: "#1a2235" }}>
                    <div className="absolute left-0 top-0 h-full" style={{ width: `${pct}%`, background: "#b83040" }} />
                  </div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", color: "#4a5a6e", fontSize: "0.65rem", marginTop: 4 }}>{pct}%</div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Search bar */}
      <div className="flex items-center gap-4 mb-8">
        <form onSubmit={handleSubmit} className="flex-1">
          <div className="flex items-center border" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", color: "#4a5a6e", fontSize: "0.85rem", padding: "0 12px" }}>/</span>
            <input type="text" value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="search anime..."
              className="flex-1 bg-transparent py-3 outline-none text-sm"
              style={{ fontFamily: "'JetBrains Mono', monospace", color: "#b0bcc8", caretColor: "#b83040" }}
              autoFocus />
          </div>
        </form>
        <div className="flex border" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
          {["SUB", "DUB"].map((l) => {
            const m = l.toLowerCase();
            return (
              <button key={l} onClick={() => handleModeChange(m)}
                className="px-4 py-2.5 text-xs border-none cursor-pointer"
                style={{ fontFamily: "'JetBrains Mono', monospace", background: mode === m ? "#111520" : "transparent", color: mode === m ? "#e0e8f0" : "#4a5a6e" }}>
                {l}
              </button>
            );
          })}
        </div>
      </div>

      {loading && (
        <div className="text-center py-12" style={{ fontFamily: "'JetBrains Mono', monospace", color: "#4a5a6e", fontSize: "0.75rem" }}>
          Searching...
        </div>
      )}

      {/* Results */}
      <div className="flex flex-col gap-1">
        {results.map((r) => (
          <div key={r.id}
            className="flex items-center border px-5 py-3.5 group"
            style={{ borderColor: "rgba(255,255,255,0.04)" }}>
            <Link
              to={`/anime/${r.id}?title=${encodeURIComponent(r.title)}&mode=${mode}`}
              className="flex items-center flex-1 no-underline min-w-0">
              <span style={{ fontFamily: "'JetBrains Mono', monospace", color: "#b83040", fontSize: "0.7rem", minWidth: 28 }}>▶</span>
              <span className="flex-1 truncate" style={{ fontFamily: "'DM Sans', sans-serif", color: "#b0bcc8", fontSize: "0.95rem" }}>{r.title}</span>
            </Link>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", color: "#4a5a6e", fontSize: "0.7rem", marginRight: 12 }}>{r.episodes} ep</span>
            <button onClick={() => addToLibrary(r)}
              className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 px-2 py-1 border cursor-pointer"
              style={{ borderColor: "rgba(255,255,255,0.1)", background: "none", color: "#3a7a8c", fontFamily: "'JetBrains Mono', monospace", fontSize: "0.6rem", letterSpacing: "0.06em" }}>
              <BookMarked size={12} /> ADD
            </button>
          </div>
        ))}
        {!loading && searchParams.has("q") && results.length === 0 && (
          <div className="text-center py-12" style={{ fontFamily: "'JetBrains Mono', monospace", color: "#4a5a6e", fontSize: "0.75rem" }}>
            No results found
          </div>
        )}
      </div>
    </div>
  );
}
