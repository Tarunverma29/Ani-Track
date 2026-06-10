import { useEffect, useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { api } from "../api/client";

export default function AnimePage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const title = searchParams.get("title") || "Anime";
  const [episodes, setEpisodes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    api.anime
      .episodes(id)
      .then((data) => setEpisodes(data.episodes))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p className="text-gray-500 text-center">Loading episodes...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-100 mb-6">{title}</h1>
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
        {episodes.map((ep) => (
          <Link
            key={ep}
            to={`/watch/${id}/${ep}?title=${encodeURIComponent(title)}`}
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
