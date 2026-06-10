import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { api } from "../api/client";

export default function WatchPage() {
  const { id, episode } = useParams<{ id: string; episode: string }>();
  const [searchParams] = useSearchParams();
  const title = searchParams.get("title") || "Anime";
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [qualities, setQualities] = useState<number[]>([]);
  const [selectedQuality, setSelectedQuality] = useState(0);
  const [loading, setLoading] = useState(true);
  const progressRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  useEffect(() => {
    if (!id || !episode) return;
    setLoading(true);
    api.anime
      .sources(id, episode)
      .then((data) => {
        const links = data.links;
        const qs = Object.keys(links)
          .map(Number)
          .sort((a, b) => b - a);
        setQualities(qs);
        const best = qs[0] || 0;
        setSelectedQuality(best);
        setVideoUrl(api.stream.proxyUrl(links[best]));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id, episode]);

  useEffect(() => {
    return () => {
      if (progressRef.current) clearInterval(progressRef.current);
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
          )
            .toString()
            .padStart(2, "0")}?`
        );
        if (resume) video.currentTime = entry.progress;
      }
    });

    video.addEventListener("timeupdate", () => {
      saveProgress();
    });

    if (progressRef.current) clearInterval(progressRef.current);
    progressRef.current = setInterval(saveProgress, 30000);

    return () => {
      if (progressRef.current) clearInterval(progressRef.current);
    };
  }, [videoUrl]);

  if (loading) {
    return <p className="text-gray-500 text-center mt-8">Loading stream...</p>;
  }

  if (!videoUrl) {
    return (
      <div className="text-center mt-8">
        <p className="text-red-400 mb-4">Failed to load video sources</p>
        <Link
          to={`/anime/${id}?title=${encodeURIComponent(title)}`}
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
            to={`/anime/${id}?title=${encodeURIComponent(title)}`}
            className="text-purple-400 hover:text-purple-300 text-sm"
          >
            &larr; {title}
          </Link>
          <h1 className="text-xl font-bold text-gray-100 mt-1">
            Episode {episode}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Quality:</span>
          <select
            value={selectedQuality}
            onChange={(e) => {
              const q = Number(e.target.value);
              setSelectedQuality(q);
              setVideoUrl("");
              api.anime.sources(id!, episode!).then((data) => {
                if (data.links[q]) {
                  setVideoUrl(api.stream.proxyUrl(data.links[q]));
                }
              });
            }}
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

      <div className="bg-black rounded-lg overflow-hidden">
        <video
          ref={videoRef}
          controls
          className="w-full aspect-video"
          onError={() => setVideoUrl("")}
        />
      </div>
    </div>
  );
}
