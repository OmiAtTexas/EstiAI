"use client"
import { useState, useEffect } from "react"
import { X, GitCompare, Loader2 } from "lucide-react"

type Doc = { id: string; name: string; projectName?: string }

export function CompareButton() {
    const [open, setOpen] = useState(false)
    const [docs, setDocs] = useState<Doc[]>([])
    const [docA, setDocA] = useState("")
    const [docB, setDocB] = useState("")
    const [result, setResult] = useState("")
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (open) {
            fetch("/api/documents").then(r => r.json()).then(d =>
                setDocs((d.documents ?? []).filter((x: any) => !x.temporary))
            )
        }
    }, [open])

    async function compare() {
        if (!docA || !docB || docA === docB) return
        setLoading(true)
        setResult("")
        try {
            const res = await fetch("/api/compare", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ docAId: docA, docBId: docB }),
            })
            const data = await res.json()
            setResult(data.comparison)
        } catch {
            setResult("Comparison failed. Please try again.")
        }
        setLoading(false)
    }

    return (
        <>
            <button
                onClick={() => setOpen(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{
                    background: "var(--surf-hover)", color: "var(--muted)",
                    border: "1px solid var(--border)", cursor: "pointer",
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.color = "var(--accent)" }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--muted)" }}
            >
                <GitCompare size={14} /> Compare Projects
            </button>

            {open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{ background: "rgba(0,0,0,0.7)" }}>
                    <div className="w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl"
                        style={{ background: "var(--surface)", border: "1px solid var(--border-hover)" }}>

                        <div className="flex items-center justify-between px-6 py-4"
                            style={{ borderBottom: "1px solid var(--border)" }}>
                            <div>
                                <h2 className="text-base font-semibold" style={{ color: "var(--text)" }}>Compare Projects</h2>
                                <p className="text-xs mt-0.5" style={{ color: "var(--faint)" }}>
                                    Select two uploaded documents to compare side by side
                                </p>
                            </div>
                            <button onClick={() => { setOpen(false); setResult("") }}
                                style={{ color: "var(--faint)", background: "none", border: "none", cursor: "pointer", padding: 4 }}>
                                <X size={16} />
                            </button>
                        </div>

                        <div className="p-6">
                            {/* Document selectors */}
                            <div className="grid grid-cols-2 gap-4 mb-5">
                                {[
                                    { label: "Project A", value: docA, onChange: setDocA },
                                    { label: "Project B", value: docB, onChange: setDocB },
                                ].map(({ label, value, onChange }) => (
                                    <div key={label}>
                                        <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--muted)" }}>
                                            {label}
                                        </label>
                                        <select
                                            value={value}
                                            onChange={e => onChange(e.target.value)}
                                            className="w-full rounded-lg px-3 py-2 text-sm"
                                            style={{
                                                background: "var(--surf-hover)", color: "var(--text)",
                                                border: "1px solid var(--border)", outline: "none",
                                            }}
                                        >
                                            <option value="">Select document…</option>
                                            {docs.map(d => (
                                                <option key={d.id} value={d.id}>
                                                    {d.projectName || d.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={compare}
                                disabled={!docA || !docB || docA === docB || loading}
                                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold mb-5"
                                style={{
                                    background: (!docA || !docB || docA === docB) ? "var(--faint)" : "var(--accent)",
                                    color: "var(--accent-text)", border: "none",
                                    cursor: (!docA || !docB || docA === docB) ? "not-allowed" : "pointer",
                                }}
                                onMouseEnter={e => { if (docA && docB && docA !== docB) e.currentTarget.style.background = "var(--accent-dark)" }}
                                onMouseLeave={e => { if (docA && docB && docA !== docB) e.currentTarget.style.background = "var(--accent)" }}
                            >
                                {loading ? <><Loader2 size={15} className="animate-spin" /> Comparing…</> : <><GitCompare size={15} /> Compare Now</>}
                            </button>

                            {/* Result */}
                            {result && (
                                <div className="rounded-xl p-4 overflow-auto"
                                    style={{ background: "var(--surf-hover)", border: "1px solid var(--border)", maxHeight: 300 }}>
                                    <pre className="text-xs whitespace-pre-wrap" style={{ color: "var(--text)", fontFamily: "inherit" }}>
                                        {result}
                                    </pre>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}