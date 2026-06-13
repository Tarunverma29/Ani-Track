import { useEffect, useState } from "react";
import { api } from "../api/client";
import { AnsiArt } from "../components/AnsiArt";

export default function SettingsPage() {
  const [defaultQuality, setDefaultQuality] = useState(0);
  const [defaultMode, setDefaultMode] = useState("sub");
  const [saved, setSaved] = useState(false);

  useEffect(() => { api.preferences.get().then((p) => { setDefaultQuality(p.default_quality); setDefaultMode(p.default_mode); }).catch(() => {}); }, []);

  async function handleSave() {
    setSaved(false);
    await api.preferences.update({ default_quality: defaultQuality, default_mode: defaultMode });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div style={{ maxWidth: 520 }}>
      <AnsiArt variant="settings" className="opacity-80 mb-6" />
      <div className="flex items-center gap-3 mb-6">
        <span style={{ fontFamily: "'JetBrains Mono', monospace", color: "#b83040", fontSize: "0.7rem" }}>┌─</span>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", color: "#4a5a6e", fontSize: "0.7rem", letterSpacing: "0.12em" }}>SETTINGS</span>
        <span style={{ fontFamily: "'Noto Sans JP', sans-serif", color: "#2a3545", fontSize: "0.75rem" }}>設定</span>
        <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
      </div>

      <div className="border p-8" style={{ borderColor: "rgba(255,255,255,0.07)", background: "#0c0f14" }}>
        {/* Default Mode */}
        <div className="mb-6">
          <label style={{ display: "block", marginBottom: 8 }}>DEFAULT MODE</label>
          <div className="flex border" style={{ borderColor: "rgba(255,255,255,0.1)", width: "fit-content" }}>
            {["SUB", "DUB"].map((l) => {
              const m = l.toLowerCase();
              return (
                <button key={l} onClick={() => setDefaultMode(m)}
                  className="px-5 py-2.5 text-sm border-none cursor-pointer"
                  style={{ fontFamily: "'JetBrains Mono', monospace", background: defaultMode === m ? "#111520" : "transparent", color: defaultMode === m ? "#e0e8f0" : "#4a5a6e" }}>
                  {l}
                </button>
              );
            })}
          </div>
        </div>

        {/* Default Quality */}
        <div className="mb-6">
          <label style={{ display: "block", marginBottom: 8 }}>DEFAULT QUALITY</label>
          <select value={defaultQuality} onChange={(e) => setDefaultQuality(Number(e.target.value))}
            className="border px-4 py-2.5 bg-transparent outline-none w-full text-sm"
            style={{ borderColor: "rgba(255,255,255,0.1)", color: "#b0bcc8", fontFamily: "'JetBrains Mono', monospace" }}>
            <option value={0}>AUTO (highest available)</option>
            {[360, 480, 720, 1080].map((q) => <option key={q} value={q}>{q}p</option>)}
          </select>
        </div>

        <button onClick={handleSave}
          className="w-full py-2.5 text-sm font-semibold border-none cursor-pointer tracking-wider"
          style={{ background: "#b83040", color: "#f0f2f4", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.1em" }}>
          SAVE SETTINGS
        </button>

        {saved && (
          <p className="text-center mt-4" style={{ fontFamily: "'JetBrains Mono', monospace", color: "#4c7a50", fontSize: "0.75rem" }}>
            Settings saved!
          </p>
        )}
      </div>
    </div>
  );
}
