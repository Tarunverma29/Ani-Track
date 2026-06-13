import { useEffect, useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { api } from "../api/client";
import { ArrowLeft, BookMarked } from "lucide-react";

export default function AnimePage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const title = searchParams.get("title") || "Anime";
  const [mode, setMode] = useState(searchParams.get("mode") || "sub");
  const [episodes, setEpisodes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api.anime.episodes(id, mode).then((data) => setEpisodes(data.episodes)).catch(() => {}).finally(() => setLoading(false));
  }, [id, mode]);

  function handleModeChange(m: string) { setMode(m); setSearchParams({ title, mode: m }); }

  async function addToLibrary() {
    if (!id) return;
    try {
      await api.library.add({
        anime_id: id,
        anime_title: title,
        total_episodes: episodes.length,
        status: "planning",
      });
    } catch {}
  }

  return (
    <div>
      {/* Header bar */}
      <div className="flex items-center gap-4 mb-6">
        <Link to="/" className="flex items-center gap-1.5 no-underline" style={{ fontFamily: "'JetBrains Mono', monospace", color: "#4a5a6e", fontSize: "0.75rem" }}>
          <ArrowLeft size={15} /> back
        </Link>
        <div className="flex-1" />
        <button onClick={addToLibrary}
          className="flex items-center gap-1.5 px-3 py-1.5 border cursor-pointer mr-3"
          style={{ borderColor: "rgba(255,255,255,0.1)", background: "none", color: "#3a7a8c", fontFamily: "'JetBrains Mono', monospace", fontSize: "0.65rem", letterSpacing: "0.06em" }}>
          <BookMarked size={13} /> ADD TO LIBRARY
        </button>
        <div className="flex border" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
          {["SUB", "DUB"].map((l) => {
            const m = l.toLowerCase();
            return (
              <button key={l} onClick={() => handleModeChange(m)}
                className="px-4 py-2 text-xs border-none cursor-pointer"
                style={{ fontFamily: "'JetBrains Mono', monospace", background: mode === m ? "#111520" : "transparent", color: mode === m ? "#e0e8f0" : "#4a5a6e" }}>
                {l}
              </button>
            );
          })}
        </div>
      </div>

      {/* Title section header */}
      <div className="flex items-center gap-4 mb-6">
        <span style={{ color: "#b83040", fontFamily: "'JetBrains Mono', monospace", fontSize: "0.7rem" }}>┌─</span>
        <h2>{title}</h2>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", color: "#4a5a6e", fontSize: "0.7rem", letterSpacing: "0.1em" }}>EPISODES</span>
        <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
      </div>

      {loading ? (
        <div className="text-center py-12" style={{ fontFamily: "'JetBrains Mono', monospace", color: "#4a5a6e", fontSize: "0.75rem" }}>
          Loading episodes...
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
            {episodes.map((ep) => (
              <Link key={ep}
                to={`/watch/${id}/${ep}?title=${encodeURIComponent(title)}&mode=${mode}`}
                className="border text-center py-3.5 px-3 hover:opacity-80 transition no-underline"
                style={{ borderColor: "rgba(255,255,255,0.07)", background: "#0c0f14" }}>
                <span style={{ fontFamily: "'DM Sans', sans-serif", color: "#b0bcc8", fontSize: "0.85rem", fontWeight: 500 }}>
                  {ep.includes(".") ? `Ep ${ep}` : ep}
                </span>
              </Link>
            ))}
          </div>
          {episodes.length === 0 && (
            <div className="text-center py-12" style={{ fontFamily: "'JetBrains Mono', monospace", color: "#4a5a6e", fontSize: "0.75rem" }}>
              No episodes available
            </div>
          )}
        </>
      )}
    </div>
  );
}
