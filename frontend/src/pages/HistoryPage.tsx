import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { HistoryEntry } from "../types";
import { AnsiArt } from "../components/AnsiArt";

export default function HistoryPage() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { api.stream.getHistory().then(setEntries).catch(() => {}).finally(() => setLoading(false)); }, []);

  // Group by anime_id, sorted by most recent
  const grouped: Record<string, HistoryEntry[]> = {};
  for (const e of entries) {
    if (!grouped[e.anime_id]) grouped[e.anime_id] = [];
    grouped[e.anime_id].push(e);
  }

  // Sort episodes within each group by episode number (natural sort)
  for (const key of Object.keys(grouped)) {
    grouped[key].sort((a, b) => {
      const aNum = parseFloat(a.episode) || 0;
      const bNum = parseFloat(b.episode) || 0;
      return aNum - bNum;
    });
  }

  // Sort groups by most recent watch
  const sortedGroups = Object.entries(grouped).sort(([, a], [, b]) => {
    const aLatest = Math.max(...a.map((e) => new Date(e.last_watched).getTime()));
    const bLatest = Math.max(...b.map((e) => new Date(e.last_watched).getTime()));
    return bLatest - aLatest;
  });

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <span style={{ fontFamily: "'JetBrains Mono', monospace", color: "#b83040", fontSize: "0.7rem" }}>┌─</span>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", color: "#4a5a6e", fontSize: "0.7rem", letterSpacing: "0.12em" }}>WATCH HISTORY</span>
        <span style={{ fontFamily: "'Noto Sans JP', sans-serif", color: "#2a3545", fontSize: "0.75rem" }}>視聴履歴</span>
        <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
        {entries.length > 0 && (
          <span style={{ fontFamily: "'JetBrains Mono', monospace", color: "#3d4e62", fontSize: "0.65rem" }}>
            {entries.length} ep
          </span>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12" style={{ fontFamily: "'JetBrains Mono', monospace", color: "#4a5a6e", fontSize: "0.75rem" }}>
          Loading history...
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-8">
          <AnsiArt variant="history" className="opacity-80 mb-4" />
          <p style={{ fontFamily: "'Noto Sans JP', sans-serif", color: "#1e2a38", fontSize: "2.5rem", marginBottom: 8 }}>履歴なし</p>
          <p style={{ fontFamily: "'JetBrains Mono', monospace", color: "#4a5a6e", fontSize: "0.8rem", letterSpacing: "0.1em" }}>NO WATCH HISTORY</p>
          <Link to="/" className="inline-block mt-6" style={{ fontFamily: "'DM Sans', sans-serif", color: "#3a7a8c", textDecoration: "underline", fontSize: "0.9rem" }}>
            Start watching
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {sortedGroups.map(([animeId, eps]) => {
            const totalWatched = eps.filter((e) => e.progress > 0).length;
            const latest = eps.reduce((a, b) =>
              new Date(a.last_watched) > new Date(b.last_watched) ? a : b
            );
            // Find the most recent partial episode to continue
            const toContinue = eps.filter((e) => e.progress > 0 && e.progress < (e.total_duration - 5)).sort(
              (a, b) => new Date(b.last_watched).getTime() - new Date(a.last_watched).getTime()
            )[0];

            return (
              <div key={animeId} className="border" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
                {/* Anime header */}
                <div className="flex items-center gap-3 px-5 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.07)", background: "#0c0f14" }}>
                  <span style={{ color: "#b83040", fontFamily: "'JetBrains Mono', monospace", fontSize: "0.65rem" }}>▶</span>
                  <div className="flex-1 min-w-0">
                    <span style={{ fontFamily: "'DM Sans', sans-serif", color: "#c8d4e0", fontSize: "0.95rem", fontWeight: 600 }}>
                      {eps[0].anime_title}
                    </span>
                  </div>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", color: "#3d4e62", fontSize: "0.6rem", letterSpacing: "0.06em" }}>
                    {totalWatched}/{eps.length} EP
                  </span>
                  {toContinue && (
                    <Link to={`/watch/${animeId}/${toContinue.episode}?title=${encodeURIComponent(eps[0].anime_title)}`}
                      className="flex items-center gap-1.5 px-2.5 py-1 no-underline transition hover:opacity-80"
                      style={{ border: "1px solid rgba(255,255,255,0.1)", color: "#3a7a8c", fontFamily: "'JetBrains Mono', monospace", fontSize: "0.6rem", letterSpacing: "0.06em" }}>
                      CONTINUE
                    </Link>
                  )}
                </div>

                {/* Episodes grid */}
                <div className="flex flex-wrap gap-2 px-5 py-3">
                  {eps.map((e) => {
                    const pct = e.total_duration > 0 ? Math.round((e.progress / e.total_duration) * 100) : 0;
                    const isComplete = pct >= 95;
                    return (
                      <Link key={e.id}
                        to={`/watch/${animeId}/${e.episode}?title=${encodeURIComponent(e.anime_title)}`}
                        className="border flex flex-col items-center py-2.5 px-3 no-underline hover:opacity-80 transition"
                        style={{
                          minWidth: 72,
                          borderColor: isComplete ? "rgba(76,122,80,0.3)" : pct > 0 ? "rgba(184,48,64,0.3)" : "rgba(255,255,255,0.06)",
                          background: isComplete ? "rgba(76,122,80,0.06)" : pct > 0 ? "rgba(184,48,64,0.04)" : "#0c0f14",
                        }}>
                        <span style={{ fontFamily: "'DM Sans', sans-serif", color: "#b0bcc8", fontSize: "0.78rem", fontWeight: 500 }}>
                          {e.episode.includes(".") ? `Ep ${e.episode}` : e.episode}
                        </span>
                        <div className="mt-1.5 relative h-px w-full" style={{ background: "#1a2235" }}>
                          <div className="absolute left-0 top-0 h-full" style={{
                            width: `${pct}%`,
                            background: isComplete ? "#4c7a50" : "#b83040",
                            transition: "width 0.3s",
                          }} />
                        </div>
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", color: "#4a5a6e", fontSize: "0.6rem", marginTop: 2 }}>
                          {isComplete ? "DONE" : `${pct}%`}
                        </span>
                      </Link>
                    );
                  })}
                </div>

                {/* Last watched */}
                <div className="px-5 py-1.5 border-t" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", color: "#2a3545", fontSize: "0.58rem" }}>
                    last watched: {timeAgo(latest.last_watched)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}
