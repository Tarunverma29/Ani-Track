import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { HistoryEntry } from "../types";

export default function HistoryPage() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.stream
      .getHistory()
      .then(setEntries)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-gray-500 text-center">Loading history...</p>;

  if (entries.length === 0) {
    return (
      <div className="text-center mt-12">
        <p className="text-gray-500 text-lg mb-4">No watch history yet</p>
        <Link to="/" className="text-purple-400 hover:text-purple-300">
          Start watching
        </Link>
      </div>
    );
  }

  const grouped: Record<string, HistoryEntry[]> = {};
  for (const e of entries) {
    if (!grouped[e.anime_id]) grouped[e.anime_id] = [];
    grouped[e.anime_id].push(e);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-100 mb-6">Watch History</h1>
      {Object.entries(grouped).map(([animeId, eps]) => (
        <div key={animeId} className="mb-6">
          <h2 className="text-lg font-medium text-gray-200 mb-2">
            {eps[0].anime_title}
          </h2>
          <div className="flex flex-wrap gap-2">
            {eps.map((e) => {
              const pct =
                e.total_duration > 0
                  ? Math.round((e.progress / e.total_duration) * 100)
                  : 0;
              return (
                <Link
                  key={e.id}
                  to={`/watch/${animeId}/${e.episode}?title=${encodeURIComponent(
                    e.anime_title
                  )}`}
                  className="bg-gray-900 hover:bg-gray-800 border border-gray-800 rounded-lg p-3 transition min-w-[120px]"
                >
                  <div className="text-sm text-gray-300">
                    Episode {e.episode}
                  </div>
                  <div className="mt-2 h-1 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-500 rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="text-xs text-gray-500 mt-1">{pct}%</div>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
