import { useState, useEffect } from "react";
import { api } from "../api/client";
import type { LibraryStats } from "../types";

const MONO = "'JetBrains Mono', monospace";

const STATUS_COLORS: Record<string, string> = {
  watching: "#3a7a8c",
  completed: "#4c7a50",
  planning: "#5a6a7a",
  "on-hold": "#c8991a",
  dropped: "#6a3040",
};

const ALL_STATUSES = ["watching", "completed", "planning", "on-hold", "dropped"];

function StatBox({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="flex flex-col border p-4 gap-1" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
      <span style={{ color: "#2a3545", fontSize: "0.6rem", letterSpacing: "0.1em" }}>{label}</span>
      <span className="tabular-nums" style={{ color: "#c8d0da", fontSize: "1.4rem", fontWeight: 600, lineHeight: 1 }}>
        {value}
      </span>
      {sub && <span style={{ color: "#3d4e62", fontSize: "0.6rem" }}>{sub}</span>}
    </div>
  );
}

function ScoreBar({ value, maxCount }: { value: number; maxCount: number }) {
  const pct = maxCount > 0 ? (value / maxCount) * 100 : 0;
  return (
    <div className="flex items-center gap-2">
      <span className="tabular-nums" style={{ color: "#4a5870", fontSize: "0.58rem", minWidth: 16, textAlign: "right" }}>{value}</span>
      <div className="flex-1 h-2 relative" style={{ background: "#111520" }}>
        <div className="absolute left-0 top-0 h-full" style={{ width: `${pct}%`, background: value >= 7 ? "#c8991a" : value >= 4 ? "#3a7a8c" : "#2a3545", transition: "width 0.3s" }} />
      </div>
    </div>
  );
}

export default function StatsPage() {
  const [stats, setStats] = useState<LibraryStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.library.stats()
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="text-center py-12" style={{ fontFamily: MONO, color: "#4a5a6e", fontSize: "0.75rem" }}>
        Loading stats...
      </div>
    );
  }

  if (!stats || stats.total_entries === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3" style={{ fontFamily: MONO }}>
        <div style={{ color: "#1e2a38", fontSize: "2.5rem", fontFamily: "'Noto Sans JP', sans-serif" }}>
          データがありません
        </div>
        <div style={{ color: "#3d4e62", fontSize: "0.7rem", letterSpacing: "0.1em" }}>
          NO DATA — ADD ANIME TO YOUR LIBRARY FIRST
        </div>
      </div>
    );
  }

  const maxScoreCount = Math.max(1, ...Object.values(stats.score_distribution).map(Number));

  const statusData = ALL_STATUSES.map((s) => ({
    status: s.toUpperCase(),
    count: stats.status_counts[s] || 0,
    color: STATUS_COLORS[s],
  }));

  return (
    <div className="overflow-y-auto" style={{ fontFamily: MONO }}>
      <div className="flex items-center gap-3 mb-6">
        <span style={{ color: "#2a3545", fontSize: "0.6rem" }}>┌─</span>
        <span style={{ color: "#3d4e62", fontSize: "0.65rem", letterSpacing: "0.12em" }}>STATISTICS 統計</span>
        <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <StatBox label="ENTRIES" value={stats.total_entries} sub="in library" />
        <StatBox label="EPISODES" value={stats.total_episodes} sub="watched" />
        <StatBox label="HOURS" value={stats.total_hours} sub="time spent" />
        <StatBox label="AVG SCORE" value={stats.avg_score ?? "–"} sub="from rated" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="border p-4" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
          <div style={{ color: "#3d4e62", fontSize: "0.6rem", letterSpacing: "0.1em", marginBottom: 16 }}>
            STATUS BREAKDOWN
          </div>
          <div className="space-y-2">
            {statusData.map(({ status, count, color }) => {
              const pct = stats.total_entries > 0 ? (count / stats.total_entries) * 100 : 0;
              return (
                <div key={status} className="flex items-center gap-3">
                  <span style={{ color, fontSize: "0.6rem", minWidth: 72, letterSpacing: "0.06em" }}>{status}</span>
                  <div className="flex-1 h-px relative" style={{ background: "#111520" }}>
                    <div className="absolute left-0 top-0 h-full" style={{ width: `${pct}%`, background: color }} />
                  </div>
                  <span className="tabular-nums" style={{ color: "#4a5870", fontSize: "0.6rem", minWidth: 16, textAlign: "right" }}>{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="border p-4" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
          <div style={{ color: "#3d4e62", fontSize: "0.6rem", letterSpacing: "0.1em", marginBottom: 12 }}>
            SCORE DISTRIBUTION
          </div>
          <div className="space-y-1.5">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((score) => (
              <div key={score} className="flex items-center gap-2">
                <span className="tabular-nums" style={{ color: "#3d4e62", fontSize: "0.58rem", minWidth: 12 }}>{score}</span>
                <ScoreBar value={Number(stats.score_distribution[String(score)] || 0)} maxCount={maxScoreCount} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {stats.genre_top.length > 0 && (
        <div className="border p-4 mb-6" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
          <div style={{ color: "#3d4e62", fontSize: "0.6rem", letterSpacing: "0.1em", marginBottom: 12 }}>
            TOP GENRES
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {stats.genre_top.map(([genre, count]) => (
              <div key={genre} className="flex items-baseline justify-between border-b py-1" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                <span style={{ color: "#5a6a7a", fontSize: "0.62rem" }}>{genre}</span>
                <span className="tabular-nums" style={{ color: "#8a96a4", fontSize: "0.68rem", fontWeight: 600 }}>{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {stats.recent_activity.length > 0 && (
        <div className="border p-4" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
          <div style={{ color: "#3d4e62", fontSize: "0.6rem", letterSpacing: "0.1em", marginBottom: 12 }}>
            RECENT ACTIVITY
          </div>
          <div>
            {stats.recent_activity.map((a) => (
              <div key={a.id} className="flex items-center gap-4 py-1.5 border-b" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                <span style={{ color: STATUS_COLORS[a.status] || "#5a6a7a", fontSize: "0.58rem", minWidth: 8 }}>■</span>
                <span style={{ color: "#8a96a4", fontSize: "0.68rem", flex: 1 }}>{a.anime_title}</span>
                {a.anime_title_jp && (
                  <span style={{ fontFamily: "'Noto Sans JP', sans-serif", color: "#2a3545", fontSize: "0.65rem" }}>
                    {a.anime_title_jp}
                  </span>
                )}
                <span style={{ color: "#3d4e62", fontSize: "0.6rem", minWidth: 60, textAlign: "right" }}>
                  {a.last_updated ? timeAgo(a.last_updated) : "–"}
                </span>
              </div>
            ))}
          </div>
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
