import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useSearchParams, Link, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { ArrowLeft, Download } from "lucide-react";

export default function WatchPage() {
  const { id, episode } = useParams<{ id: string; episode: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const title = searchParams.get("title") || "Anime";
  const mode = searchParams.get("mode") || "sub";
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [links, setLinks] = useState<Record<number, string>>({});
  const [qualities, setQualities] = useState<number[]>([]);
  const [selectedQuality, setSelectedQuality] = useState(0);
  const [loading, setLoading] = useState(true);
  const [episodes, setEpisodes] = useState<string[]>([]);
  const [showEndOverlay, setShowEndOverlay] = useState(false);
  const [countdown, setCountdown] = useState(10);
  const countdownRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const lastSaveRef = useRef(0);

  const currentIdx = episodes.indexOf(episode || "");
  const nextEp = currentIdx >= 0 && currentIdx < episodes.length - 1 ? episodes[currentIdx + 1] : null;

  useEffect(() => { if (!id) return; api.anime.episodes(id, mode).then((d) => setEpisodes(d.episodes)).catch(() => {}); }, [id, mode]);

  // Auto-add to library when page loads
  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const lib = await api.library.list();
        if (!lib.some((e) => e.anime_id === id)) {
          await api.library.add({
            anime_id: id,
            anime_title: title,
            total_episodes: episodes.length || 0,
            status: "watching",
          });
        } else {
          // Update status to watching if it's planning
          const entry = lib.find((e) => e.anime_id === id);
          if (entry && entry.status === "planning") {
            await api.library.update(entry.id, { status: "watching" });
          }
        }
      } catch {}
    })();
  }, [id, title, episodes.length]);

  const referrersRef = useRef<Record<number, string | null>>({});

  useEffect(() => {
    if (!id || !episode) return;
    setLoading(true); setShowEndOverlay(false); setCountdown(10);
    api.anime.sources(id, episode, mode).then((data) => {
      const rawLinks = data.links;
      referrersRef.current = data.referrers || {};
      setLinks(rawLinks);
      const qs = Object.keys(rawLinks).map(Number).sort((a, b) => b - a);
      setQualities(qs);
      const best = qs[0] || 0;
      setSelectedQuality(best);
      setVideoUrl(api.stream.proxyUrl(rawLinks[best], referrersRef.current[best] || undefined));
    }).catch(() => {}).finally(() => setLoading(false));
  }, [id, episode, mode]);

  useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
      saveProgressNow();
    };
  }, []);

  const saveProgressNow = useCallback(() => {
    const video = videoRef.current;
    if (!video || !id || !episode) return;
    api.stream.saveProgress(id, title, episode, video.currentTime, video.duration || 0).catch(() => {});
    lastSaveRef.current = Date.now();
  }, [id, episode, title]);

  // Save on unload
  useEffect(() => {
    const handleUnload = () => {
      const video = videoRef.current;
      if (!video || !id || !episode) return;
      try {
        const payload = JSON.stringify({
          anime_id: id,
          anime_title: title,
          episode,
          progress: video.currentTime,
          total_duration: video.duration || 0,
        });
        navigator.sendBeacon(
          "/api/stream/history",
          new Blob([payload], { type: "application/json" })
        );
      } catch {}
    };
    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, [id, episode, title]);

  useEffect(() => {
    if (!videoUrl) return;
    const video = videoRef.current;
    if (!video) return;
    video.src = videoUrl;
    video.load();

    // Restore progress once metadata is loaded so duration is available
    const onLoaded = async () => {
      try {
        const entries = await api.stream.getHistory();
        const entry = entries.find((e) => e.anime_id === id && e.episode === episode);
        if (entry && entry.progress > 1) {
          video.currentTime = entry.progress;
        }
      } catch {}
    };
    video.addEventListener("loadedmetadata", onLoaded, { once: true });

    // Save on timeupdate (throttled to ~5s)
    const onTimeupdate = () => {
      if (Date.now() - lastSaveRef.current < 5000) return;
      saveProgressNow();
    };
    video.addEventListener("timeupdate", onTimeupdate);

    const onEnded = () => {
      saveProgressNow();
      // Mark episode as watched completely in library
      if (id) {
        api.library.list().then((lib) => {
          const entry = lib.find((e) => e.anime_id === id);
          if (entry && entry.status !== "completed") {
            const watched = entry.episodes_watched + 1;
            const status = watched >= entry.total_episodes ? "completed" : entry.status;
            api.library.update(entry.id, { episodes_watched: watched, status }).catch(() => {});
          }
        }).catch(() => {});
      }
      if (nextEp) {
        setShowEndOverlay(true); setCountdown(10);
        countdownRef.current = setInterval(() => setCountdown((c) => {
          if (c <= 1) {
            if (countdownRef.current) clearInterval(countdownRef.current);
            navigate(`/watch/${id}/${nextEp}?title=${encodeURIComponent(title)}&mode=${mode}`);
            return 0;
          }
          return c - 1;
        }), 1000);
      } else setShowEndOverlay(true);
    };
    video.addEventListener("ended", onEnded);

    // Save every 15s as backup
    const interval = setInterval(saveProgressNow, 15000);

    return () => {
      video.removeEventListener("timeupdate", onTimeupdate);
      video.removeEventListener("ended", onEnded);
      video.removeEventListener("loadedmetadata", onLoaded);
      clearInterval(interval);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [videoUrl]);

  function changeQuality(q: number) {
    setSelectedQuality(q);
    if (links[q]) setVideoUrl(api.stream.proxyUrl(links[q], referrersRef.current[q] || undefined));
  }

  if (loading) return (
    <div className="flex items-center justify-center" style={{ minHeight: "60vh", fontFamily: "'JetBrains Mono', monospace", color: "#4a5a6e", fontSize: "0.75rem" }}>
      Loading stream...
    </div>
  );

  if (!videoUrl) return (
    <div className="text-center" style={{ paddingTop: 40 }}>
      <p style={{ fontFamily: "'JetBrains Mono', monospace", color: "#b83040", fontSize: "0.85rem", marginBottom: 16 }}>Failed to load video sources</p>
      <Link to={`/anime/${id}?title=${encodeURIComponent(title)}&mode=${mode}`} style={{ fontFamily: "'DM Sans', sans-serif", color: "#3a7a8c", textDecoration: "underline", fontSize: "0.9rem" }}>
        Back to episodes
      </Link>
    </div>
  );

  return (
    <div>
      <div className="flex items-center gap-4 mb-4 flex-wrap">
        <Link to={`/anime/${id}?title=${encodeURIComponent(title)}&mode=${mode}`}
          className="flex items-center gap-1.5 no-underline"
          style={{ fontFamily: "'JetBrains Mono', monospace", color: "#4a5a6e", fontSize: "0.75rem" }}>
          <ArrowLeft size={15} /> {title}
        </Link>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", color: "#4a5a6e", fontSize: "0.7rem" }}>/</span>
        <span style={{ fontFamily: "'DM Sans', sans-serif", color: "#c8d4e0", fontSize: "1rem", fontWeight: 600 }}>Episode {episode}</span>
        <span className="px-2 py-0.5" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.65rem", background: "#111520", color: "#4a5a6e", border: "1px solid rgba(255,255,255,0.07)" }}>
          {mode.toUpperCase()}
        </span>
        <div className="flex-1" />
        <div className="flex items-center gap-4">
          {links[selectedQuality] && (
            <a href={api.stream.downloadUrl(links[selectedQuality], referrersRef.current[selectedQuality] || undefined)}
              className="flex items-center gap-1.5 no-underline"
              style={{ fontFamily: "'JetBrains Mono', monospace", color: "#4a5a6e", fontSize: "0.7rem" }}>
              <Download size={14} /> download
            </a>
          )}
          <span style={{ fontFamily: "'JetBrains Mono', monospace", color: "#4a5a6e", fontSize: "0.7rem" }}>QUALITY</span>
          <select value={selectedQuality} onChange={(e) => changeQuality(Number(e.target.value))}
            className="border px-3 py-1.5 bg-transparent outline-none text-sm"
            style={{ borderColor: "rgba(255,255,255,0.1)", color: "#b0bcc8", fontFamily: "'JetBrains Mono', monospace" }}>
            {qualities.map((q) => <option key={q} value={q}>{q}p</option>)}
          </select>
        </div>
      </div>

      <div className="relative bg-black overflow-hidden" style={{ aspectRatio: "16/9" }}>
        <video ref={videoRef} controls className="w-full h-full" onError={() => setVideoUrl("")} />

        {showEndOverlay && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-5" style={{ background: "rgba(0,0,0,0.85)" }}>
            {nextEp ? (
              <>
                <p style={{ fontFamily: "'DM Sans', sans-serif", color: "#b0bcc8", fontSize: "0.95rem" }}>
                  Next episode in <span style={{ color: "#b83040", fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: "1.1rem" }}>{countdown}</span>s
                </p>
                <div className="flex gap-4">
                  <button onClick={() => { if (countdownRef.current) clearInterval(countdownRef.current); navigate(`/watch/${id}/${nextEp}?title=${encodeURIComponent(title)}&mode=${mode}`); }}
                    className="px-6 py-2.5 text-sm border-none cursor-pointer"
                    style={{ background: "#b83040", color: "#f0f2f4", fontFamily: "'JetBrains Mono', monospace" }}>
                    NEXT EPISODE
                  </button>
                  <button onClick={() => { if (countdownRef.current) clearInterval(countdownRef.current); setShowEndOverlay(false); const v = videoRef.current; if (v) v.currentTime = 0; }}
                    className="px-6 py-2.5 text-sm border cursor-pointer"
                    style={{ borderColor: "rgba(255,255,255,0.15)", color: "#b0bcc8", background: "transparent", fontFamily: "'JetBrains Mono', monospace" }}>
                    REPLAY
                  </button>
                  <button onClick={() => { if (countdownRef.current) clearInterval(countdownRef.current); navigate(`/anime/${id}?title=${encodeURIComponent(title)}&mode=${mode}`); }}
                    className="px-6 py-2.5 text-sm border cursor-pointer"
                    style={{ borderColor: "rgba(255,255,255,0.15)", color: "#b0bcc8", background: "transparent", fontFamily: "'JetBrains Mono', monospace" }}>
                    EPISODES
                  </button>
                </div>
              </>
            ) : (
              <div className="flex gap-4">
                <button onClick={() => { setShowEndOverlay(false); const v = videoRef.current; if (v) v.currentTime = 0; }}
                  className="px-6 py-2.5 text-sm border-none cursor-pointer"
                  style={{ background: "#b83040", color: "#f0f2f4", fontFamily: "'JetBrains Mono', monospace" }}>
                  REPLAY
                </button>
                <button onClick={() => navigate(`/anime/${id}?title=${encodeURIComponent(title)}&mode=${mode}`)}
                  className="px-6 py-2.5 text-sm border cursor-pointer"
                  style={{ borderColor: "rgba(255,255,255,0.15)", color: "#b0bcc8", background: "transparent", fontFamily: "'JetBrains Mono', monospace" }}>
                  EPISODES
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
