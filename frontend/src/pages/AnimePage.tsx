import { useEffect, useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { api } from "../api/client";

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
    api.anime
      .episodes(id, mode)
      .then((data) => setEpisodes(data.episodes))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id, mode]);

  function handleModeChange(newMode: string) {
    setMode(newMode);
    setSearchParams({ title, mode: newMode });
  }

  if (loading) return <p className="text-gray-500 text-center">Loading episodes...</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-100">{title}</h1>
        <div className="flex gap-1 bg-gray-900 border border-gray-700 rounded-lg p-1">
          <button
            onClick={() => handleModeChange("sub")}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
              mode === "sub" ? "bg-purple-600 text-white" : "text-gray-400 hover:text-gray-200"
            }`}
          >
            Sub
          </button>
          <button
            onClick={() => handleModeChange("dub")}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
              mode === "dub" ? "bg-purple-600 text-white" : "text-gray-400 hover:text-gray-200"
            }`}
          >
            Dub
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
        {episodes.map((ep) => (
          <Link
            key={ep}
            to={`/watch/${id}/${ep}?title=${encodeURIComponent(title)}&mode=${mode}`}
            className="bg-gray-900 hover:bg-gray-800 border border-gray-800 rounded p-3 text-center transition"
          >
            <span className="text-sm text-gray-300">
              {ep.includes(".") ? `Ep ${ep}` : `Episode ${ep}`}
            </span>
          </Link>
        ))}
      </div>
      {episodes.length === 0 && (
        <p className="text-gray-500 text-center">No episodes available</p>
      )}
    </div>
  );
}
