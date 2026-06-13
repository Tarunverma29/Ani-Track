import { useState, useEffect, useMemo, useCallback } from "react";
import { api } from "../api/client";
import type { LibraryEntry, WatchStatus } from "../types";

const MONO = "'JetBrains Mono', monospace";

const STATUS_COLORS: Record<WatchStatus, string> = {
  watching: "#3a7a8c",
  completed: "#4c7a50",
  planning: "#5a6a7a",
  "on-hold": "#c8991a",
  dropped: "#6a3040",
};

const ALL_STATUSES: WatchStatus[] = ["watching", "completed", "planning", "on-hold", "dropped"];

const COL_WIDTHS = {
  cursor: 20,
  num: 32,
  title: "1fr",
  ep: 100,
  score: 64,
  status: 88,
  type: 52,
  updated: 88,
};

function timeAgo(iso: string | null): string {
  if (!iso) return "–";
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

function EpBar({ watched, total }: { watched: number; total: number }) {
  const pct = total > 0 ? Math.round((watched / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 h-px relative" style={{ background: "#1a2235" }}>
        {pct > 0 && (
          <div className="absolute left-0 top-0 h-full" style={{ width: `${pct}%`, background: "#b83040", transition: "width 0.2s" }} />
        )}
      </div>
      <span className="tabular-nums flex-shrink-0" style={{ color: "#4a5870", fontSize: "0.6rem", minWidth: 56, textAlign: "right" }}>
        {watched}/{total}
      </span>
    </div>
  );
}

function Field({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-baseline gap-3 py-1 border-b" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
      <span style={{ color: "#3d4e62", fontSize: "0.6rem", letterSpacing: "0.08em", minWidth: 72, flexShrink: 0 }}>{label}</span>
      <span style={{ color: accent ? "#c8991a" : "#8a96a4", fontSize: "0.68rem", fontFamily: MONO }}>{value}</span>
    </div>
  );
}

function DetailPanel({
  entry,
  onClose,
  onUpdate,
  onDelete,
}: {
  entry: LibraryEntry;
  onClose: () => void;
  onUpdate: (id: number, data: { episodes_watched?: number; status?: WatchStatus; user_score?: number | null }) => void;
  onDelete: (id: number) => void;
}) {
  const pct = entry.total_episodes > 0 ? Math.round((entry.episodes_watched / entry.total_episodes) * 100) : 0;
  const genres = entry.genre ? entry.genre.split(",").map((g) => g.trim()).filter(Boolean) : [];

  return (
    <div className="flex-shrink-0 flex flex-col border-l overflow-hidden" style={{ width: 280, borderColor: "rgba(255,255,255,0.07)", background: "#090b0e", fontFamily: MONO }}>
      <div className="flex items-center justify-between px-3 border-b flex-shrink-0" style={{ height: 26, borderColor: "rgba(255,255,255,0.07)", background: "#0c0f14" }}>
        <span style={{ color: "#3d4e62", fontSize: "0.6rem", letterSpacing: "0.1em" }}>DETAIL</span>
        <button onClick={onClose} style={{ color: "#3d4e62", fontSize: "0.65rem", cursor: "pointer", letterSpacing: "0.05em", background: "none", border: "none", fontFamily: MONO }}>[esc]</button>
      </div>

      <div className="flex-shrink-0 relative overflow-hidden" style={{ height: 130, background: "#0c0f14" }}>
        {entry.banner && (
          <img src={entry.banner} alt={entry.anime_title} className="w-full h-full object-cover" style={{ filter: "brightness(0.3) saturate(0.4)" }} />
        )}
        <div className="absolute inset-0 flex flex-col justify-end px-3 pb-2">
          {entry.anime_title_jp && (
            <div style={{ fontFamily: "'Noto Sans JP', sans-serif", fontSize: "0.75rem", color: "#b83040", letterSpacing: "0.08em", marginBottom: 2 }}>
              {entry.anime_title_jp}
            </div>
          )}
          <div style={{ color: "#c8d0da", fontSize: "0.78rem", fontWeight: 600, letterSpacing: "0.04em" }}>
            {entry.anime_title}
          </div>
        </div>
        <div className="absolute left-0 top-0 bottom-0 w-px" style={{ background: "#b83040" }} />
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2">
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <span style={{ color: "#3d4e62", fontSize: "0.58rem", letterSpacing: "0.1em" }}>PROGRESS</span>
            <span className="tabular-nums" style={{ color: "#4a5870", fontSize: "0.6rem" }}>
              {entry.episodes_watched} / {entry.total_episodes}  {pct}%
            </span>
          </div>
          <div className="relative h-px w-full" style={{ background: "#1a2235" }}>
            <div className="absolute left-0 top-0 h-full" style={{ width: `${pct}%`, background: "#b83040", transition: "width 0.2s" }} />
          </div>
          {entry.status !== "completed" && entry.status !== "planning" && (
            <div className="flex gap-2 mt-2">
              <button onClick={() => onUpdate(entry.id, { episodes_watched: Math.max(0, entry.episodes_watched - 1) })}
                className="flex-1 py-1 text-center border transition hover:opacity-80"
                style={{ borderColor: "rgba(255,255,255,0.08)", color: "#b83040", fontSize: "0.65rem", cursor: "pointer", fontFamily: MONO, background: "none" }}>
                − ep
              </button>
              <button onClick={() => onUpdate(entry.id, { episodes_watched: Math.min(entry.total_episodes, entry.episodes_watched + 1) })}
                className="flex-1 py-1 text-center border transition hover:opacity-80"
                style={{ borderColor: "rgba(255,255,255,0.08)", color: "#3a7a8c", fontSize: "0.65rem", cursor: "pointer", fontFamily: MONO, background: "none" }}>
                + ep
              </button>
            </div>
          )}
        </div>

        <div className="mb-4">
          <div style={{ color: "#3d4e62", fontSize: "0.58rem", letterSpacing: "0.1em", marginBottom: 6 }}>STATUS</div>
          <div className="flex flex-wrap gap-1">
            {ALL_STATUSES.map((s) => {
              const active = entry.status === s;
              return (
                <button key={s} onClick={() => onUpdate(entry.id, { status: s })}
                  className="px-2 py-0.5 text-xs transition"
                  style={{
                    fontFamily: MONO, fontSize: "0.58rem", letterSpacing: "0.06em",
                    background: active ? STATUS_COLORS[s] : "transparent",
                    color: active ? "#0a0c10" : STATUS_COLORS[s],
                    border: `1px solid ${STATUS_COLORS[s]}`,
                    cursor: "pointer", fontWeight: active ? 700 : 400, opacity: active ? 1 : 0.6,
                  }}>
                  {s.toUpperCase()}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mb-4">
          <div style={{ color: "#3d4e62", fontSize: "0.58rem", letterSpacing: "0.1em", marginBottom: 6 }}>YOUR SCORE</div>
          <div className="flex gap-1 flex-wrap">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
              <button key={n} onClick={() => onUpdate(entry.id, { user_score: entry.user_score === n ? null : n })}
                className="w-6 h-6 flex items-center justify-center border transition"
                style={{
                  fontFamily: MONO, fontSize: "0.58rem",
                  background: entry.user_score !== null && n <= entry.user_score ? "rgba(200,153,26,0.15)" : "transparent",
                  color: entry.user_score !== null && n <= entry.user_score ? "#c8991a" : "#2a3545",
                  borderColor: entry.user_score !== null && n <= entry.user_score ? "rgba(200,153,26,0.4)" : "rgba(255,255,255,0.06)",
                  cursor: "pointer",
                }}>
                {n}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <Field label="STUDIO" value={entry.studio || "–"} />
          <Field label="YEAR" value={entry.year ? String(entry.year) : "–"} />
          <Field label="SEASON" value={entry.season || "–"} />
          <Field label="TYPE" value={entry.type || "–"} />
          <Field label="DURATION" value={entry.duration || "–"} />
          <Field label="ADDED" value={entry.added_date ? new Date(entry.added_date).toLocaleDateString() : "–"} />
          <Field label="UPDATED" value={timeAgo(entry.last_updated)} />
        </div>

        {genres.length > 0 && (
          <div className="mb-4">
            <div style={{ color: "#3d4e62", fontSize: "0.58rem", letterSpacing: "0.1em", marginBottom: 6 }}>GENRES</div>
            <div className="flex flex-wrap gap-1">
              {genres.map((g) => (
                <span key={g} className="px-2 py-0.5" style={{ fontFamily: MONO, fontSize: "0.58rem", color: "#3d4e62", border: "1px solid rgba(255,255,255,0.07)", letterSpacing: "0.06em" }}>
                  {g}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="mb-4">
          <div style={{ color: "#3d4e62", fontSize: "0.58rem", letterSpacing: "0.1em", marginBottom: 6 }}>ACTIONS</div>
          <button onClick={() => onDelete(entry.id)}
            className="w-full py-1 text-center border transition hover:opacity-80"
            style={{ borderColor: "#6a3040", color: "#b83040", fontSize: "0.65rem", cursor: "pointer", fontFamily: MONO, background: "none" }}>
            REMOVE FROM LIBRARY
          </button>
        </div>

        {entry.synopsis && (
          <div>
            <div style={{ color: "#3d4e62", fontSize: "0.58rem", letterSpacing: "0.1em", marginBottom: 6 }}>SYNOPSIS</div>
            <p style={{ color: "#4a5870", fontSize: "0.65rem", lineHeight: 1.7, fontFamily: MONO }}>
              {entry.synopsis}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function Sidebar({
  library,
  activeStatus,
  onStatusChange,
}: {
  library: LibraryEntry[];
  activeStatus: WatchStatus | "all";
  onStatusChange: (s: WatchStatus | "all") => void;
}) {
  const countFor = (s: WatchStatus | "all") =>
    s === "all" ? library.length : library.filter((a) => a.status === s).length;

  const totalEp = library.reduce((n, a) => n + a.episodes_watched, 0);
  const totalHours = Math.floor(
    library.reduce((n, a) => {
      const m = parseInt(a.duration) || 24;
      return n + a.episodes_watched * m;
    }, 0) / 60
  );

  const items: (WatchStatus | "all")[] = ["all", ...ALL_STATUSES];

  return (
    <div className="flex-shrink-0 flex flex-col border-r overflow-hidden" style={{ width: 192, borderColor: "rgba(255,255,255,0.07)", background: "#090b0e", fontFamily: MONO }}>
      <div className="px-3 py-2 border-b flex items-center gap-2" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
        <span style={{ color: "#2a3545", fontSize: "0.6rem" }}>┌─</span>
        <span style={{ color: "#3d4e62", fontSize: "0.6rem", letterSpacing: "0.1em" }}>STATUS FILTER</span>
      </div>
      <div className="flex-1 py-1">
        {items.map((s) => {
          const active = activeStatus === s;
          const count = countFor(s);
          const color = s === "all" ? "#8a96a4" : STATUS_COLORS[s as WatchStatus];
          return (
            <button key={s} onClick={() => onStatusChange(s)}
              className="w-full flex items-center justify-between px-3 py-1.5 relative"
              style={{ background: active ? "#111520" : "transparent", cursor: "pointer", fontFamily: MONO, border: "none", textAlign: "left" }}>
              {active && <span className="absolute left-0 top-0 bottom-0 w-px" style={{ background: "#b83040" }} />}
              <div className="flex items-center gap-2">
                <span style={{ color: active ? "#b83040" : "#2a3545", fontSize: "0.58rem" }}>{active ? "▶" : " "}</span>
                <span style={{ color: active ? "#c8d0da" : color, fontSize: "0.67rem", letterSpacing: "0.06em", fontWeight: active ? 600 : 400 }}>
                  {s === "all" ? "ALL" : s.toUpperCase()}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span style={{ color: "#3d4e62", fontSize: "0.58rem" }}>[{s === "all" ? "a" : s[0]}]</span>
                <span className="tabular-nums" style={{ color: count > 0 ? color : "#2a3545", fontSize: "0.65rem", minWidth: 14, textAlign: "right" }}>
                  {count}
                </span>
              </div>
            </button>
          );
        })}
      </div>
      <div className="border-t px-3 py-1.5" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
        <span style={{ color: "#2a3545", fontSize: "0.6rem" }}>── TOTALS</span>
      </div>
      <div className="px-3 py-2 flex flex-col gap-2 border-t" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
        {[
          { label: "entries", value: library.length },
          { label: "episodes", value: totalEp },
          { label: "hours", value: totalHours },
        ].map(({ label, value }) => (
          <div key={label} className="flex justify-between items-baseline">
            <span style={{ color: "#3d4e62", fontSize: "0.6rem", letterSpacing: "0.06em" }}>{label}</span>
            <span className="tabular-nums" style={{ color: "#8a96a4", fontSize: "0.68rem", fontWeight: 600 }}>{value}</span>
          </div>
        ))}
      </div>
      <div className="px-3 py-2 border-t" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
        <div style={{ fontFamily: "'Noto Sans JP', sans-serif", fontSize: "0.75rem", color: "#1e2a38", letterSpacing: "0.08em" }}>
          アニメ追跡
        </div>
      </div>
    </div>
  );
}

export default function LibraryPage() {
  const [library, setLibrary] = useState<LibraryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeStatus, setActiveStatus] = useState<WatchStatus | "all">("all");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const fetchLibrary = useCallback(async () => {
    try {
      const data = await api.library.list(activeStatus === "all" ? undefined : activeStatus);
      setLibrary(data);
    } catch {
      setLibrary([]);
    } finally {
      setLoading(false);
    }
  }, [activeStatus]);

  useEffect(() => { fetchLibrary(); }, [fetchLibrary]);

  const filtered = useMemo(() => library, [library]);

  const selected = library.find((e) => e.id === selectedId) ?? null;

  // Keyboard navigation
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === "Escape") { setSelectedId(null); return; }

      const idx = filtered.findIndex((a) => a.id === selectedId);
      if (e.key === "j" || e.key === "ArrowDown") {
        e.preventDefault();
        if (idx < filtered.length - 1) setSelectedId(filtered[idx + 1].id);
        else if (filtered.length > 0) setSelectedId(filtered[0].id);
      }
      if (e.key === "k" || e.key === "ArrowUp") {
        e.preventDefault();
        if (idx > 0) setSelectedId(filtered[idx - 1].id);
        else if (filtered.length > 0) setSelectedId(filtered[filtered.length - 1].id);
      }
      if (e.key === "w") setActiveStatus("watching");
      if (e.key === "c") setActiveStatus("completed");
      if (e.key === "p") setActiveStatus("planning");
      if (e.key === "h") setActiveStatus("on-hold");
      if (e.key === "d") setActiveStatus("dropped");
      if (e.key === "a") setActiveStatus("all");
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [filtered, selectedId]);

  const handleUpdate = useCallback(async (id: number, data: { episodes_watched?: number; status?: WatchStatus; user_score?: number | null }) => {
    try {
      const updated = await api.library.update(id, data);
      setLibrary((prev) => prev.map((e) => (e.id === id ? updated : e)));
      setSelectedId(id);
    } catch {}
  }, []);

  const handleDelete = useCallback(async (id: number) => {
    try {
      await api.library.remove(id);
      setLibrary((prev) => prev.filter((e) => e.id !== id));
      setSelectedId(null);
    } catch {}
  }, []);

  if (loading) {
    return (
      <div className="text-center py-12" style={{ fontFamily: MONO, color: "#4a5a6e", fontSize: "0.75rem" }}>
        Loading library...
      </div>
    );
  }

  return (
    <div className="flex" style={{ height: "100%", fontFamily: MONO }}>
      <Sidebar library={library} activeStatus={activeStatus} onStatusChange={(s) => { setActiveStatus(s); setSelectedId(null); }} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3" style={{ fontFamily: MONO }}>
            <div style={{ color: "#1e2a38", fontSize: "2.5rem", fontFamily: "'Noto Sans JP', sans-serif" }}>
              見つかりません
            </div>
            <div style={{ color: "#3d4e62", fontSize: "0.7rem", letterSpacing: "0.1em" }}>
              {library.length === 0 ? "YOUR LIBRARY IS EMPTY — SEARCH AND ADD ANIME" : "NO ENTRIES FOUND"}
            </div>
          </div>
        ) : (
          <>
            <div className="flex-shrink-0 flex items-center border-b px-3" style={{ height: 26, borderColor: "rgba(255,255,255,0.07)", background: "#0a0c10" }}>
              <div style={{ width: COL_WIDTHS.cursor }} />
              <div style={{ width: COL_WIDTHS.num, color: "#2a3545", fontSize: "0.58rem", letterSpacing: "0.08em" }}>#</div>
              <div style={{ flex: 1, color: "#3d4e62", fontSize: "0.6rem", letterSpacing: "0.08em" }}>TITLE</div>
              <div style={{ width: COL_WIDTHS.ep, color: "#3d4e62", fontSize: "0.6rem", letterSpacing: "0.08em" }}>PROGRESS</div>
              <div style={{ width: COL_WIDTHS.score, color: "#3d4e62", fontSize: "0.6rem", letterSpacing: "0.08em", textAlign: "right" }}>SCORE</div>
              <div style={{ width: COL_WIDTHS.status, color: "#3d4e62", fontSize: "0.6rem", letterSpacing: "0.08em", paddingLeft: 12 }}>STATUS</div>
              <div style={{ width: COL_WIDTHS.type, color: "#3d4e62", fontSize: "0.6rem", letterSpacing: "0.08em" }}>TYPE</div>
              <div style={{ width: COL_WIDTHS.updated, color: "#3d4e62", fontSize: "0.6rem", letterSpacing: "0.08em", textAlign: "right" }}>UPDATED</div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {filtered.map((entry, idx) => {
                const selected = selectedId === entry.id;
                const statusColor = STATUS_COLORS[entry.status as WatchStatus] || "#5a6a7a";
                return (
                  <div key={entry.id} onClick={() => setSelectedId(selected ? null : entry.id)}
                    className="flex items-center px-3 border-b relative cursor-pointer group"
                    style={{ height: 36, borderColor: "rgba(255,255,255,0.04)", background: selected ? "#111520" : "transparent", transition: "background 0.1s" }}>
                    {selected && <span className="absolute left-0 top-0 bottom-0 w-px" style={{ background: "#b83040" }} />}

                    <div style={{ width: COL_WIDTHS.cursor, color: selected ? "#b83040" : "transparent", fontSize: "0.65rem" }}>▶</div>
                    <div className="tabular-nums" style={{ width: COL_WIDTHS.num, color: "#2a3545", fontSize: "0.6rem" }}>
                      {String(idx + 1).padStart(2, "0")}
                    </div>

                    <div style={{ flex: 1, overflow: "hidden", paddingRight: 12 }}>
                      <div className="flex items-baseline gap-2 overflow-hidden">
                        <span className="truncate" style={{ color: selected ? "#e0e8f0" : "#8a96a4", fontSize: "0.72rem", fontWeight: selected ? 500 : 400 }}>
                          {entry.anime_title}
                        </span>
                        {entry.anime_title_jp && (
                          <span className="truncate flex-shrink-0" style={{ fontFamily: "'Noto Sans JP', sans-serif", color: "#2a3545", fontSize: "0.65rem" }}>
                            {entry.anime_title_jp}
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={{ width: COL_WIDTHS.ep, paddingRight: 8 }}>
                      {entry.status === "planning" ? (
                        <span style={{ color: "#2a3545", fontSize: "0.6rem" }}>–</span>
                      ) : (
                        <EpBar watched={entry.episodes_watched} total={entry.total_episodes} />
                      )}
                    </div>

                    <div className="tabular-nums" style={{ width: COL_WIDTHS.score, textAlign: "right", paddingRight: 12 }}>
                      {entry.user_score !== null ? (
                        <span style={{ color: "#c8991a", fontSize: "0.7rem", fontWeight: 600 }}>
                          {entry.user_score}<span style={{ color: "#3d4e62", fontWeight: 400 }}>/10</span>
                        </span>
                      ) : (
                        <span style={{ color: "#2a3545", fontSize: "0.68rem" }}>–</span>
                      )}
                    </div>

                    <div style={{ width: COL_WIDTHS.status, paddingLeft: 12 }}>
                      <span style={{ color: statusColor, fontSize: "0.6rem", letterSpacing: "0.06em", fontWeight: 500 }}>
                        {entry.status.toUpperCase()}
                      </span>
                    </div>

                    <div style={{ width: COL_WIDTHS.type }}>
                      <span style={{ color: "#3d4e62", fontSize: "0.6rem" }}>{entry.type}</span>
                    </div>

                    <div className="tabular-nums" style={{ width: COL_WIDTHS.updated, textAlign: "right", color: "#3d4e62", fontSize: "0.6rem" }}>
                      {timeAgo(entry.last_updated)}
                    </div>

                    {entry.status !== "planning" && entry.status !== "completed" && (
                      <div className="absolute right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" style={{ pointerEvents: "none" }}>
                        <button onClick={(e) => { e.stopPropagation(); handleUpdate(entry.id, { episodes_watched: Math.max(0, entry.episodes_watched - 1) }); }}
                          style={{ pointerEvents: "all", background: "#111520", border: "1px solid rgba(255,255,255,0.08)", color: "#b83040", fontSize: "0.65rem", width: 18, height: 18, cursor: "pointer", fontFamily: MONO, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          −
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleUpdate(entry.id, { episodes_watched: Math.min(entry.total_episodes, entry.episodes_watched + 1) }); }}
                          style={{ pointerEvents: "all", background: "#111520", border: "1px solid rgba(255,255,255,0.08)", color: "#3a7a8c", fontSize: "0.65rem", width: 18, height: 18, cursor: "pointer", fontFamily: MONO, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          +
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {selected && <DetailPanel entry={selected} onClose={() => setSelectedId(null)} onUpdate={handleUpdate} onDelete={handleDelete} />}
    </div>
  );
}
