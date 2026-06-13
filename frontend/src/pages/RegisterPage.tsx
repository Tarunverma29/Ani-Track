import { useState, FormEvent } from "react";
import { Link } from "react-router-dom";
import { AnsiArt } from "../components/AnsiArt";

interface Props { onRegister: (username: string, email: string, password: string) => Promise<void> }

export default function RegisterPage({ onRegister }: Props) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    try { await onRegister(username, email, password); }
    catch (err: any) { setError(err.message || "Registration failed"); }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#090b0e" }}>
      <form
        onSubmit={handleSubmit}
        className="border w-full max-w-sm"
        style={{ borderColor: "rgba(255,255,255,0.07)", background: "#0c0f14", padding: "2.5rem 2rem" }}
      >
        <div className="text-center mb-8">
          <AnsiArt variant="deer" className="flex justify-center mb-4 opacity-70" />
          <span style={{ color: "#b83040", fontSize: "1rem", letterSpacing: "0.15em" }}>■</span>
          <h1 className="mt-3" style={{ fontFamily: "'Cinzel', serif", fontSize: "1.5rem", fontWeight: 700, color: "#e0e8f0", letterSpacing: "0.1em" }}>
            REGISTER
          </h1>
          <p style={{ fontFamily: "'Noto Sans JP', sans-serif", color: "#4a5a6e", fontSize: "0.75rem", marginTop: 4, letterSpacing: "0.08em" }}>
            アカウント作成 — NEW ACCOUNT
          </p>
        </div>

        {error && (
          <div className="mb-4 p-2.5 border text-sm" style={{ borderColor: "#b83040", color: "#b83040", background: "rgba(184,48,64,0.1)", fontFamily: "'JetBrains Mono', monospace" }}>
            {error}
          </div>
        )}

        <div className="mb-4">
          <label style={{ display: "block", marginBottom: 6 }}>USERNAME</label>
          <input type="text" value={username} onChange={(e) => setUsername(e.target.value)}
            className="w-full bg-transparent border px-4 py-2.5 outline-none text-sm"
            style={{ borderColor: "rgba(255,255,255,0.1)", color: "#b0bcc8", fontFamily: "'JetBrains Mono', monospace", caretColor: "#b83040" }}
            required />
        </div>

        <div className="mb-4">
          <label style={{ display: "block", marginBottom: 6 }}>EMAIL</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-transparent border px-4 py-2.5 outline-none text-sm"
            style={{ borderColor: "rgba(255,255,255,0.1)", color: "#b0bcc8", fontFamily: "'JetBrains Mono', monospace", caretColor: "#b83040" }}
            required />
        </div>

        <div className="mb-6">
          <label style={{ display: "block", marginBottom: 6 }}>PASSWORD</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-transparent border px-4 py-2.5 outline-none text-sm"
            style={{ borderColor: "rgba(255,255,255,0.1)", color: "#b0bcc8", fontFamily: "'JetBrains Mono', monospace", caretColor: "#b83040" }}
            required />
        </div>

        <button type="submit"
          className="w-full py-2.5 text-sm font-semibold border-none cursor-pointer tracking-wider"
          style={{ background: "#b83040", color: "#f0f2f4", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.1em" }}>
          REGISTER
        </button>

        <p className="text-center mt-5" style={{ fontFamily: "'DM Sans', sans-serif", color: "#4a5a6e", fontSize: "0.85rem" }}>
          Already have an account?{" "}
          <Link to="/login" style={{ color: "#3a7a8c", textDecoration: "underline" }}>
            Sign In
          </Link>
        </p>
      </form>
    </div>
  );
}
