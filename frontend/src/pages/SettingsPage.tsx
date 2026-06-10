import { useEffect, useState } from "react";
import { api } from "../api/client";

export default function SettingsPage() {
  const [defaultQuality, setDefaultQuality] = useState(0);
  const [defaultMode, setDefaultMode] = useState("sub");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.preferences.get().then((p) => {
      setDefaultQuality(p.default_quality);
      setDefaultMode(p.default_mode);
    }).catch(() => {});
  }, []);

  async function handleSave() {
    setSaved(false);
    await api.preferences.update({
      default_quality: defaultQuality,
      default_mode: defaultMode,
    });
    setSaved(true);
  }

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold text-gray-100 mb-6">Settings</h1>

      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Default Mode</label>
          <div className="flex gap-1 bg-gray-800 border border-gray-700 rounded-lg p-1 w-fit">
            <button
              onClick={() => setDefaultMode("sub")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                defaultMode === "sub" ? "bg-purple-600 text-white" : "text-gray-400 hover:text-gray-200"
              }`}
            >
              Sub
            </button>
            <button
              onClick={() => setDefaultMode("dub")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                defaultMode === "dub" ? "bg-purple-600 text-white" : "text-gray-400 hover:text-gray-200"
              }`}
            >
              Dub
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Default Quality</label>
          <select
            value={defaultQuality}
            onChange={(e) => setDefaultQuality(Number(e.target.value))}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-gray-200"
          >
            <option value={0}>Auto (highest available)</option>
            <option value={360}>360p</option>
            <option value={480}>480p</option>
            <option value={720}>720p</option>
            <option value={1080}>1080p</option>
          </select>
        </div>

        <button
          onClick={handleSave}
          className="w-full bg-purple-600 hover:bg-purple-500 text-white font-medium py-2.5 rounded-lg transition"
        >
          Save Settings
        </button>

        {saved && (
          <p className="text-green-400 text-sm text-center">Settings saved!</p>
        )}
      </div>
    </div>
  );
}
