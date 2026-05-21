"use client"
import { useState } from "react"
import { Upload, MessageSquare, Zap, X, ChevronRight, ChevronLeft } from "lucide-react"

const STEPS = [
    {
        icon: Upload,
        color: "#22c55e",
        title: "Upload your project files",
        description: "Go to Documents in the sidebar and upload your Excel cost sheets, estimates, and rate cards. Files are stored securely and only accessible to your team.",
        tip: "Supports .xlsx, .xls, and .csv files",
    },
    {
        icon: MessageSquare,
        color: "#818cf8",
        title: "Ask questions in plain English",
        description: "No need to search through spreadsheets manually. Just ask — \"What were the labor costs on the Houston project?\" or \"Compare material rates between our last two jobs.\"",
        tip: "The AI reads your actual data, not generic answers",
    },
    {
        icon: Zap,
        color: "#f59e0b",
        title: "Get instant, data-driven answers",
        description: "EstimateAI pulls exact numbers from your uploaded files and presents comparisons in clear tables. Ideal for project planning, client proposals, and cost reviews.",
        tip: "Upload a file using 📎 in the chat to use it just for that conversation",
    },
]

export function OnboardingModal({ onClose }: { onClose: () => void }) {
    const [step, setStep] = useState(0)
    const current = STEPS[step]
    const Icon = current.icon
    const isLast = step === STEPS.length - 1

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.7)" }}>
            <div className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl"
                style={{ background: "var(--surface)", border: "1px solid var(--border-hover)" }}>

                {/* Header */}
                <div className="flex items-center justify-between px-6 pt-5 pb-2">
                    <div className="flex gap-1.5">
                        {STEPS.map((_, i) => (
                            <div key={i} className="h-1.5 rounded-full transition-all"
                                style={{
                                    width: i === step ? 20 : 6,
                                    background: i === step ? "var(--accent)" : "var(--surf-active)",
                                }} />
                        ))}
                    </div>
                    <button onClick={onClose} className="p-1 rounded-lg"
                        style={{ color: "var(--faint)", background: "none", border: "none", cursor: "pointer" }}>
                        <X size={16} />
                    </button>
                </div>

                {/* Content */}
                <div className="px-6 py-4 text-center">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
                        style={{ background: `${current.color}15`, border: `1px solid ${current.color}30` }}>
                        <Icon size={28} color={current.color} />
                    </div>
                    <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--text)" }}>
                        {current.title}
                    </h2>
                    <p className="text-sm leading-relaxed mb-4" style={{ color: "var(--muted)" }}>
                        {current.description}
                    </p>
                    <div className="px-4 py-2.5 rounded-xl text-xs" style={{ background: "var(--surf-hover)", color: "var(--faint)" }}>
                        💡 {current.tip}
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-6 py-4"
                    style={{ borderTop: "1px solid var(--border)" }}>
                    <button
                        onClick={() => step > 0 && setStep(s => s - 1)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm"
                        style={{
                            color: step === 0 ? "var(--faint)" : "var(--muted)",
                            background: "none", border: "none",
                            cursor: step === 0 ? "default" : "pointer",
                        }}
                    >
                        <ChevronLeft size={15} /> Back
                    </button>

                    <span className="text-xs" style={{ color: "var(--faint)" }}>
                        {step + 1} of {STEPS.length}
                    </span>

                    <button
                        onClick={() => isLast ? onClose() : setStep(s => s + 1)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold"
                        style={{ background: "var(--accent)", color: "var(--accent-text)", border: "none", cursor: "pointer" }}
                        onMouseEnter={e => (e.currentTarget.style.background = "var(--accent-dark)")}
                        onMouseLeave={e => (e.currentTarget.style.background = "var(--accent)")}
                    >
                        {isLast ? "Get started" : "Next"}
                        {!isLast && <ChevronRight size={15} />}
                    </button>
                </div>
            </div>
        </div>
    )
}