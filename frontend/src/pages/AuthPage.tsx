import { useState, FormEvent } from "react";
import { AnsiArt } from "../components/AnsiArt";

interface Props {
  onLogin: (username: string, password: string) => Promise<void>;
  onRegister: (username: string, email: string, password: string) => Promise<void>;
}

export default function AuthPage({ onLogin, onRegister }: Props) {
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const [registerUsername, setRegisterUsername] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerError, setRegisterError] = useState("");

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setLoginError("");
    try { await onLogin(loginUsername, loginPassword); }
    catch (err: any) { setLoginError(err.message || "Login failed"); }
  }

  async function handleRegister(e: FormEvent) {
    e.preventDefault();
    setRegisterError("");
    try { await onRegister(registerUsername, registerEmail, registerPassword); }
    catch (err: any) { setRegisterError(err.message || "Registration failed"); }
  }

  const inputStyle = "w-full bg-transparent border px-4 py-2.5 outline-none text-sm";
  const inputInline = { borderColor: "rgba(255,255,255,0.1)", color: "#b0bcc8", fontFamily: "'JetBrains Mono', monospace", caretColor: "#b83040" } as const;
  const labelStyle = { display: "block", marginBottom: 6 };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6" style={{ background: "#090b0e" }}>
      <div className="w-full max-w-4xl">
        <div className="text-center mb-6 sm:mb-8">
          <AnsiArt variant="deer" className="flex justify-center mb-4 opacity-70" />
          <span style={{ color: "#b83040", fontSize: "1rem", letterSpacing: "0.15em" }}>■</span>
          <h1 className="mt-3" style={{ fontFamily: "'Cinzel', serif", fontSize: "1.5rem", fontWeight: 700, color: "#e0e8f0", letterSpacing: "0.1em" }}>
            ANI-TRACK
          </h1>
          <p style={{ fontFamily: "'Noto Sans JP', sans-serif", color: "#4a5a6e", fontSize: "0.75rem", marginTop: 4, letterSpacing: "0.08em" }}>
            アニメ追跡
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-4 sm:gap-6">
          {/* Login Form */}
          <form
            onSubmit={handleLogin}
            className="flex-1 border p-6 sm:p-8"
            style={{ borderColor: "rgba(255,255,255,0.07)", background: "#0c0f14" }}
          >
            <h2 className="text-center mb-5" style={{ fontFamily: "'Cinzel', serif", fontSize: "1.1rem", fontWeight: 700, color: "#e0e8f0", letterSpacing: "0.1em" }}>
              SIGN IN
            </h2>

            {loginError && (
              <div className="mb-4 p-2.5 border text-sm" style={{ borderColor: "#b83040", color: "#b83040", background: "rgba(184,48,64,0.1)", fontFamily: "'JetBrains Mono', monospace" }}>
                {loginError}
              </div>
            )}

            <div className="mb-4">
              <label style={labelStyle}>USERNAME</label>
              <input type="text" value={loginUsername} onChange={(e) => setLoginUsername(e.target.value)}
                className={inputStyle} style={inputInline} required />
            </div>

            <div className="mb-6">
              <label style={labelStyle}>PASSWORD</label>
              <input type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)}
                className={inputStyle} style={inputInline} required />
            </div>

            <button type="submit"
              className="w-full py-2.5 text-sm font-semibold border-none cursor-pointer tracking-wider"
              style={{ background: "#b83040", color: "#f0f2f4", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.1em" }}>
              SIGN IN
            </button>
          </form>

          {/* Register Form */}
          <form
            onSubmit={handleRegister}
            className="flex-1 border p-6 sm:p-8"
            style={{ borderColor: "rgba(255,255,255,0.07)", background: "#0c0f14" }}
          >
            <h2 className="text-center mb-5" style={{ fontFamily: "'Cinzel', serif", fontSize: "1.1rem", fontWeight: 700, color: "#e0e8f0", letterSpacing: "0.1em" }}>
              REGISTER
            </h2>

            {registerError && (
              <div className="mb-4 p-2.5 border text-sm" style={{ borderColor: "#b83040", color: "#b83040", background: "rgba(184,48,64,0.1)", fontFamily: "'JetBrains Mono', monospace" }}>
                {registerError}
              </div>
            )}

            <div className="mb-4">
              <label style={labelStyle}>USERNAME</label>
              <input type="text" value={registerUsername} onChange={(e) => setRegisterUsername(e.target.value)}
                className={inputStyle} style={inputInline} required />
            </div>

            <div className="mb-4">
              <label style={labelStyle}>EMAIL</label>
              <input type="email" value={registerEmail} onChange={(e) => setRegisterEmail(e.target.value)}
                className={inputStyle} style={inputInline} required />
            </div>

            <div className="mb-6">
              <label style={labelStyle}>PASSWORD</label>
              <input type="password" value={registerPassword} onChange={(e) => setRegisterPassword(e.target.value)}
                className={inputStyle} style={inputInline} required />
            </div>

            <button type="submit"
              className="w-full py-2.5 text-sm font-semibold border-none cursor-pointer tracking-wider"
              style={{ background: "#b83040", color: "#f0f2f4", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.1em" }}>
              REGISTER
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
