"use client"
import { signIn } from "next-auth/react"
import { HardHat, FileSpreadsheet, MessageSquare, Zap, Shield, BarChart3, ArrowRight, Check } from "lucide-react"
import { useState } from "react"

export default function LandingPage() {
    const [isDark, setIsDark] = useState(true)

    const features = [
        { icon: FileSpreadsheet, title: "Excel Intelligence", desc: "Upload your cost sheets and the AI reads every number instantly." },
        { icon: MessageSquare, title: "Plain English Queries", desc: "Ask questions like you'd ask a colleague. No formulas needed." },
        { icon: BarChart3, title: "Project Comparisons", desc: "Compare costs across projects side by side in seconds." },
        { icon: Shield, title: "Company Data Only", desc: "Your documents stay private. No data sent to public AI models." },
        { icon: Zap, title: "Instant Answers", desc: "Get labor rates, material costs, and permit fees in one click." },
        { icon: HardHat, title: "Built for Estimators", desc: "Designed specifically for construction cost management workflows." },
    ]

    const T = isDark ? {
        bg: "#0d1117", card: "#161b27", border: "rgba(255,255,255,0.08)",
        text: "#e8e8e8", muted: "#8b8fa8", faint: "#4a5068",
        accent: "#22c55e", accentDark: "#16a34a", accentText: "#ffffff",
    } : {
        bg: "#ffffff", card: "#f0fdf4", border: "rgba(0,0,0,0.08)",
        text: "#111827", muted: "#4b7a4b", faint: "#86a886",
        accent: "#16a34a", accentDark: "#15803d", accentText: "#ffffff",
    }

    return (
        <div style={{ background: T.bg, color: T.text, minHeight: "100vh", fontFamily: "'DM Sans', system-ui, sans-serif" }}>

            {/* Nav */}
            <nav className="flex items-center justify-between px-8 py-4 max-w-6xl mx-auto">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ background: `${T.accent}20`, border: `1px solid ${T.accent}30` }}>
                        <HardHat size={16} color={T.accent} />
                    </div>
                    <span className="font-bold text-lg" style={{ color: T.text }}>EstimateAI</span>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={() => setIsDark(!isDark)}
                        className="px-3 py-1.5 rounded-lg text-xs"
                        style={{ background: T.card, border: `1px solid ${T.border}`, color: T.muted, cursor: "pointer" }}>
                        {isDark ? "☀ Light" : "🌙 Dark"}
                    </button>
                    <button onClick={() => signIn("azure-ad", { callbackUrl: "/chat" })}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold"
                        style={{ background: T.accent, color: T.accentText, border: "none", cursor: "pointer" }}
                        onMouseEnter={e => (e.currentTarget.style.background = T.accentDark)}
                        onMouseLeave={e => (e.currentTarget.style.background = T.accent)}>
                        Sign in <ArrowRight size={14} />
                    </button>
                </div>
            </nav>

            {/* Hero */}
            <div className="text-center px-6 py-20 max-w-3xl mx-auto">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-6"
                    style={{ background: `${T.accent}15`, color: T.accent, border: `1px solid ${T.accent}25` }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: T.accent }} />
                    Internal use only — company employees
                </div>

                <h1 className="text-4xl md:text-5xl font-bold mb-5 leading-tight" style={{ color: T.text }}>
                    Your construction data,<br />
                    <span style={{ color: T.accent }}>instantly searchable</span>
                </h1>

                <p className="text-lg mb-8 leading-relaxed" style={{ color: T.muted }}>
                    Stop digging through spreadsheets. Ask EstimateAI questions about your project costs,
                    labor rates, and estimates — and get answers in seconds.
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                    <button onClick={() => signIn("azure-ad", { callbackUrl: "/chat" })}
                        className="flex items-center gap-3 px-6 py-3.5 rounded-xl font-semibold text-base"
                        style={{ background: T.accent, color: T.accentText, border: "none", cursor: "pointer" }}
                        onMouseEnter={e => (e.currentTarget.style.background = T.accentDark)}
                        onMouseLeave={e => (e.currentTarget.style.background = T.accent)}>
                        <svg width="18" height="18" viewBox="0 0 21 21">
                            <rect x="1" y="1" width="9" height="9" fill="#f25022" />
                            <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
                            <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
                            <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
                        </svg>
                        Sign in with Microsoft
                    </button>
                </div>

                <p className="text-xs mt-4" style={{ color: T.faint }}>
                    Restricted to @yourcompany emails only
                </p>
            </div>

            {/* Features */}
            <div className="max-w-5xl mx-auto px-6 py-12">
                <h2 className="text-2xl font-bold text-center mb-10" style={{ color: T.text }}>
                    Everything your estimators need
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {features.map(({ icon: Icon, title, desc }) => (
                        <div key={title} className="p-5 rounded-xl"
                            style={{ background: T.card, border: `1px solid ${T.border}` }}>
                            <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3"
                                style={{ background: `${T.accent}15` }}>
                                <Icon size={17} color={T.accent} />
                            </div>
                            <h3 className="font-semibold mb-1.5 text-sm" style={{ color: T.text }}>{title}</h3>
                            <p className="text-xs leading-relaxed" style={{ color: T.muted }}>{desc}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* CTA */}
            <div className="max-w-2xl mx-auto px-6 py-16 text-center">
                <div className="p-8 rounded-2xl" style={{ background: T.card, border: `1px solid ${T.border}` }}>
                    <h2 className="text-2xl font-bold mb-3" style={{ color: T.text }}>Ready to get started?</h2>
                    <p className="mb-6 text-sm" style={{ color: T.muted }}>
                        Sign in with your company Microsoft account to access the platform.
                    </p>
                    {[
                        "Upload your project Excel files",
                        "Ask questions in plain English",
                        "Get instant data-driven answers",
                    ].map(item => (
                        <div key={item} className="flex items-center gap-2 text-sm mb-2 justify-center" style={{ color: T.muted }}>
                            <Check size={14} color={T.accent} /> {item}
                        </div>
                    ))}
                    <button onClick={() => signIn("azure-ad", { callbackUrl: "/chat" })}
                        className="mt-6 flex items-center gap-2 px-6 py-3 rounded-xl font-semibold mx-auto"
                        style={{ background: T.accent, color: T.accentText, border: "none", cursor: "pointer" }}
                        onMouseEnter={e => (e.currentTarget.style.background = T.accentDark)}
                        onMouseLeave={e => (e.currentTarget.style.background = T.accent)}>
                        Get Started <ArrowRight size={15} />
                    </button>
                </div>
            </div>

            {/* Footer */}
            <div className="text-center py-6 text-xs" style={{ color: T.faint, borderTop: `1px solid ${T.border}` }}>
                EstimateAI · Internal platform · Powered for your company
            </div>
        </div>
    )
}