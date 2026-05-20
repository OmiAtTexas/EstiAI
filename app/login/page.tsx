"use client"
import { signIn } from "next-auth/react"
import { useSearchParams } from "next/navigation"
import { HardHat } from "lucide-react"
import { useState } from "react"

const ERRORS: Record<string, string> = {
  domain: "Access denied — only company email addresses are permitted.",
  OAuthCallback: "Sign-in failed. Please try again.",
  default: "Something went wrong. Please try again.",
}

export default function LoginPage() {
  const params = useSearchParams()
  const err = params.get("error")
  const errMsg = err ? (ERRORS[err] ?? ERRORS.default) : null
  const [isDark, setIsDark] = useState(true)

  const T = isDark ? {
    bg: "#0d120d",
    card: "#161b27",
    border: "rgba(255,255,255,0.08)",
    text: "#e8f5e8",
    muted: "#7ab87a",
    faint: "#4a6a4a",
    accent: "#22c55e",
    accentText: "#0d120d",
  } : {
    bg: "#f0f9f0",
    card: "#ffffff",
    border: "rgba(0,0,0,0.08)",
    text: "#1a2e1a",
    muted: "#4a7a4a",
    faint: "#8aaa8a",
    accent: "#16a34a",
    accentText: "#ffffff",
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 transition-colors"
      style={{ background: T.bg }}>
      {/* Grid background */}
      <div className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: "linear-gradient(rgba(34,197,94,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(34,197,94,.04) 1px,transparent 1px)",
          backgroundSize: "48px 48px",
        }} />

      <div className="relative w-full max-w-[340px]">
        {/* Theme toggle */}
        <div className="flex justify-end mb-3">
          <button
            onClick={() => setIsDark(!isDark)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-all"
            style={{ background: T.card, border: `1px solid ${T.border}`, color: T.faint }}
          >
            {isDark ? "☀️ Light" : "🌙 Dark"}
          </button>
        </div>

        <div className="rounded-2xl p-8" style={{ background: T.card, border: `1px solid ${T.border}` }}>
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3"
              style={{ background: `${T.accent}15`, border: `1px solid ${T.accent}30` }}>
              <HardHat size={22} color={T.accent} />
            </div>
            <h1 className="text-lg font-semibold" style={{ color: T.text }}>Esti-Mate AI</h1>
            <p className="text-xs mt-1" style={{ color: T.muted }}>Cost Intelligence Platform</p>
          </div>

          {/* Error */}
          {errMsg && (
            <div className="mb-5 rounded-lg px-4 py-3 text-sm text-center"
              style={{ background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.2)", color: "#f87171" }}>
              {errMsg}
            </div>
          )}

          {/* Microsoft SSO */}
          <button
            onClick={() => signIn("azure-ad", { callbackUrl: "/chat" })}
            className="w-full flex items-center justify-center gap-3 py-3 rounded-xl font-semibold text-sm transition-all"
            style={{ background: T.accent, color: T.accentText }}
            onMouseEnter={e => (e.currentTarget.style.filter = "brightness(0.9)")}
            onMouseLeave={e => (e.currentTarget.style.filter = "brightness(1)")}
          >
            <svg width="18" height="18" viewBox="0 0 21 21">
              <rect x="1" y="1" width="9" height="9" fill="#f25022" />
              <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
              <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
              <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
            </svg>
            Sign in with Microsoft
          </button>

          <p className="text-center text-xs mt-5" style={{ color: T.faint }}>
            Access restricted to{" "}
            <span style={{ color: T.muted }}>
              {process.env.NEXT_PUBLIC_ALLOWED_DOMAIN ?? "@yourcompany.com"}
            </span>
          </p>
        </div>

        <p className="text-center text-xs mt-4" style={{ color: T.faint }}>
          Powered for <span style={{ color: T.muted }}> OCMI </span> · Internal use only
        </p>
      </div>
    </div>
  )
}