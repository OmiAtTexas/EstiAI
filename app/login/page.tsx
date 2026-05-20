"use client"
import { signIn } from "next-auth/react"
import { useSearchParams } from "next/navigation"
import { HardHat } from "lucide-react"

const ERRORS: Record<string, string> = {
  domain: "Access denied — only company email addresses are permitted.",
  OAuthCallback: "Sign-in failed. Please try again.",
  default: "Something went wrong. Please try again.",
}

export default function LoginPage() {
  const params = useSearchParams()
  const err = params.get("error")
  const errMsg = err ? (ERRORS[err] ?? ERRORS.default) : null

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4"
         style={{ background: "#0d1117" }}>
      {/* Subtle grid background */}
      <div className="fixed inset-0 pointer-events-none"
           style={{
             backgroundImage: "linear-gradient(rgba(255,255,255,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.03) 1px,transparent 1px)",
             backgroundSize: "48px 48px",
           }} />

      <div className="relative w-full max-w-[360px]">
        <div className="rounded-2xl border p-8"
             style={{ background: "#161b27", borderColor: "rgba(255,255,255,.08)" }}>

          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3"
                 style={{ background: "rgba(245,158,11,.12)", border: "1px solid rgba(245,158,11,.25)" }}>
              <HardHat size={22} color="#f59e0b" />
            </div>
            <h1 className="text-lg font-semibold" style={{ color: "#e8e8e8" }}>EstimateAI</h1>
            <p className="text-xs mt-1" style={{ color: "#8b8fa8" }}>Cost Intelligence Platform</p>
          </div>

          {/* Error */}
          {errMsg && (
            <div className="mb-5 rounded-lg px-4 py-3 text-sm text-center"
                 style={{ background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.2)", color: "#f87171" }}>
              {errMsg}
            </div>
          )}

          {/* Microsoft SSO - primary */}
          <button
            onClick={() => signIn("azure-ad", { callbackUrl: "/chat" })}
            className="w-full flex items-center justify-center gap-3 py-3 rounded-xl font-semibold text-sm transition-all duration-150"
            style={{ background: "#f59e0b", color: "#0d1117" }}
            onMouseEnter={e => (e.currentTarget.style.background = "#d97706")}
            onMouseLeave={e => (e.currentTarget.style.background = "#f59e0b")}
          >
            <MicrosoftIcon />
            Sign in with Microsoft
          </button>

          <p className="text-center text-xs mt-5" style={{ color: "#4a5068" }}>
            Access restricted to{" "}
            <span style={{ color: "#8b8fa8" }}>@yourcompany.com</span>
          </p>
        </div>

        <p className="text-center text-xs mt-4" style={{ color: "#4a5068" }}>
          Powered by <span style={{ color: "#8b8fa8" }}>Claude AI</span> · Internal use only
        </p>
      </div>
    </div>
  )
}

function MicrosoftIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 21 21">
      <rect x="1" y="1" width="9" height="9" fill="#f25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
      <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
    </svg>
  )
}
