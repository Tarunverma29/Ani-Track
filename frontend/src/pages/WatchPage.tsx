import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useSearchParams, Link, useNavigate } from "react-router-dom";
import { api } from "../api/client";

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
  const progressRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const [episodes, setEpisodes] = useState<string[]>([]);
  const [showEndOverlay, setShowEndOverlay] = useState(false);
  const [countdown, setCountdown] = useState(10);
  const countdownRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  const currentIdx = episodes.indexOf(episode || "");
  const nextEp = currentIdx >= 0 && currentIdx < episodes.length - 1 ? episodes[currentIdx + 1] : null;

  useEffect(() => {
    if (!id) return;
    api.anime.episodes(id, mode).then((data) => setEpisodes(data.episodes)).catch(() => {});
  }, [id, mode]);

  useEffect(() => {
    if (!id || !episode) return;
    setLoading(true);
    setShowEndOverlay(false);
    setCountdown(10);
    api.anime
      .sources(id, episode, mode)
      .then((data) => {
        const rawLinks = data.links;
        setLinks(rawLinks);
        const qs = Object.keys(rawLinks)
          .map(Number)
          .sort((a, b) => b - a);
        setQualities(qs);
        const best = qs[0] || 0;
        setSelectedQuality(best);
        setVideoUrl(api.stream.proxyUrl(rawLinks[best]));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id, episode, mode]);

  useEffect(() => {
    return () => {
      if (progressRef.current) clearInterval(progressRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  const saveProgress = useCallback(() => {
    const video = videoRef.current;
    if (!video || !id || !episode) return;
    api.stream.saveProgress(
      id,
      title,
      episode,
      video.currentTime,
      video.duration || 0
    );
  }, [id, episode, title]);

  useEffect(() => {
    if (!videoUrl) return;
    const video = videoRef.current;
    if (!video) return;
    video.src = videoUrl;
    video.load();

    api.stream.getHistory().then((entries) => {
      const entry = entries.find(
        (e) => e.anime_id === id && e.episode === episode
      );
      if (entry && entry.progress > 0 && video.duration) {
        const resume = confirm(
          `Continue from ${Math.floor(entry.progress / 60)}:${Math.floor(
            entry.progress % 60
          ).toString().padStart(2, "0")}?`
        );
        if (resume) video.currentTime = entry.progress;
      }
    });

    video.addEventListener("timeupdate", () => {
      saveProgress();
    });

    video.addEventListener("ended", () => {
      saveProgress();
      if (nextEp) {
        setShowEndOverlay(true);
        setCountdown(10);
        countdownRef.current = setInterval(() => {
          setCountdown((c) => {
            if (c <= 1) {
              if (countdownRef.current) clearInterval(countdownRef.current);
              navigate(`/watch/${id}/${nextEp}?title=${encodeURIComponent(title)}&mode=${mode}`);
              return 0;
            }
            return c - 1;
          });
        }, 1000);
      } else {
        setShowEndOverlay(true);
      }
    });

    if (progressRef.current) clearInterval(progressRef.current);
    progressRef.current = setInterval(saveProgress, 30000);

    return () => {
      if (progressRef.current) clearInterval(progressRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [videoUrl]);

  function changeQuality(q: number) {
    setSelectedQuality(q);
    if (links[q]) {
      setVideoUrl(api.stream.proxyUrl(links[q]));
    }
  }

  if (loading) {
    return <p className="text-gray-500 text-center mt-8">Loading stream...</p>;
  }

  if (!videoUrl) {
    return (
      <div className="text-center mt-8">
        <p className="text-red-400 mb-4">Failed to load video sources</p>
        <Link
          to={`/anime/${id}?title=${encodeURIComponent(title)}&mode=${mode}`}
          className="text-purple-400 hover:text-purple-300"
        >
          Back to episodes
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <Link
            to={`/anime/${id}?title=${encodeURIComponent(title)}&mode=${mode}`}
            className="text-purple-400 hover:text-purple-300 text-sm"
          >
            &larr; {title}
          </Link>
          <h1 className="text-xl font-bold text-gray-100 mt-1">
            Episode {episode} <span className="text-sm font-normal text-gray-500 ml-2">{mode.toUpperCase()}</span>
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {links[selectedQuality] && (
            <a
              href={api.stream.downloadUrl(links[selectedQuality])}
              download
              className="text-sm text-purple-400 hover:text-purple-300"
            >
              Download
            </a>
          )}
          <span className="text-sm text-gray-500">Quality:</span>
          <select
            value={selectedQuality}
            onChange={(e) => changeQuality(Number(e.target.value))}
            className="bg-gray-800 border border-gray-700 rounded px-3 py-1 text-sm text-gray-200"
          >
            {qualities.map((q) => (
              <option key={q} value={q}>
                {q}p
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="relative bg-black rounded-lg overflow-hidden">
        <video
          ref={videoRef}
          controls
          className="w-full aspect-video"
          onError={() => setVideoUrl("")}
        />

        {showEndOverlay && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-4">
            {nextEp ? (
              <>
                <p className="text-white text-lg">
                  Next episode in <span className="text-purple-400 font-bold">{countdown}</span>s
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      if (countdownRef.current) clearInterval(countdownRef.current);
                      navigate(`/watch/${id}/${nextEp}?title=${encodeURIComponent(title)}&mode=${mode}`);
                    }}
                    className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-2 rounded-lg font-medium transition"
                  >
                    Next Episode
                  </button>
                  <button
                    onClick={() => {
                      if (countdownRef.current) clearInterval(countdownRef.current);
                      setShowEndOverlay(false);
                      const video = videoRef.current;
                      if (video) video.currentTime = 0;
                    }}
                    className="bg-gray-700 hover:bg-gray-600 text-gray-200 px-6 py-2 rounded-lg font-medium transition"
                  >
                    Replay
                  </button>
                  <button
                    onClick={() => {
                      if (countdownRef.current) clearInterval(countdownRef.current);
                      navigate(`/anime/${id}?title=${encodeURIComponent(title)}&mode=${mode}`);
                    }}
                    className="bg-gray-700 hover:bg-gray-600 text-gray-200 px-6 py-2 rounded-lg font-medium transition"
                  >
                    Episodes
                  </button>
                </div>
              </>
            ) : (
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowEndOverlay(false);
                    const video = videoRef.current;
                    if (video) video.currentTime = 0;
                  }}
                  className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-2 rounded-lg font-medium transition"
                >
                  Replay
                </button>
                <button
                  onClick={() => {
                    navigate(`/anime/${id}?title=${encodeURIComponent(title)}&mode=${mode}`);
                  }}
                  className="bg-gray-700 hover:bg-gray-600 text-gray-200 px-6 py-2 rounded-lg font-medium transition"
                >
                  Episodes
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
