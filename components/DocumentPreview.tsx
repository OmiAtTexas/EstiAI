"use client"
import { useState } from "react"
import { Eye, X, FileText, ChevronDown, ChevronRight } from "lucide-react"

type Sheet = { name: string; rows: string[][] }

function parseCSVToSheets(content: string): Sheet[] {
    const sheets: Sheet[] = []
    const sections = content.split(/=== Sheet: (.+?) ===\n/)

    if (sections.length <= 1) {
        // Single sheet without header
        const rows = content.split("\n").filter(Boolean).map(r => r.split(","))
        sheets.push({ name: "Sheet 1", rows: rows.slice(0, 20) })
    } else {
        for (let i = 1; i < sections.length; i += 2) {
            const name = sections[i]
            const csv = sections[i + 1] ?? ""
            const rows = csv.split("\n").filter(Boolean).map(r => r.split(",")).slice(0, 20)
            if (rows.length > 0) sheets.push({ name, rows })
        }
    }
    return sheets
}

export function DocumentPreviewButton({ content, filename }: { content: string; filename: string }) {
    const [open, setOpen] = useState(false)
    const [activeSheet, setActiveSheet] = useState(0)
    const sheets = parseCSVToSheets(content)

    return (
        <>
            <button
                onClick={() => setOpen(true)}
                className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded transition-colors"
                style={{
                    color: "var(--accent)", background: "rgba(34,197,94,.1)",
                    border: "1px solid rgba(34,197,94,.2)", cursor: "pointer",
                }}
            >
                <Eye size={10} /> Preview
            </button>

            {open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{ background: "rgba(0,0,0,0.7)" }}>
                    <div className="w-full max-w-4xl rounded-2xl overflow-hidden shadow-2xl flex flex-col"
                        style={{ background: "var(--surface)", border: "1px solid var(--border-hover)", maxHeight: "80vh" }}>

                        {/* Header */}
                        <div className="flex items-center gap-3 px-5 py-4 shrink-0"
                            style={{ borderBottom: "1px solid var(--border)" }}>
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                                style={{ background: "rgba(34,197,94,.15)" }}>
                                <FileText size={15} color="var(--accent)" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold truncate" style={{ color: "var(--text)" }}>{filename}</p>
                                <p className="text-xs" style={{ color: "var(--faint)" }}>{sheets.length} sheet{sheets.length > 1 ? "s" : ""} · showing first 20 rows</p>
                            </div>
                            <button onClick={() => setOpen(false)}
                                style={{ color: "var(--faint)", background: "none", border: "none", cursor: "pointer", padding: 4 }}>
                                <X size={16} />
                            </button>
                        </div>

                        {/* Sheet tabs */}
                        {sheets.length > 1 && (
                            <div className="flex gap-1 px-4 pt-3 shrink-0 overflow-x-auto">
                                {sheets.map((s, i) => (
                                    <button key={i} onClick={() => setActiveSheet(i)}
                                        className="px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap"
                                        style={{
                                            background: activeSheet === i ? "var(--accent)" : "var(--surf-hover)",
                                            color: activeSheet === i ? "var(--accent-text)" : "var(--muted)",
                                            border: "none", cursor: "pointer",
                                        }}>
                                        {s.name}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Table */}
                        <div className="flex-1 overflow-auto p-4">
                            {sheets[activeSheet] && (
                                <table className="w-full text-xs border-collapse">
                                    <thead>
                                        <tr>
                                            {sheets[activeSheet].rows[0]?.map((cell, i) => (
                                                <th key={i} className="px-3 py-2 text-left whitespace-nowrap"
                                                    style={{
                                                        background: "rgba(34,197,94,.1)", color: "var(--accent)",
                                                        border: "1px solid var(--border)", fontWeight: 600,
                                                    }}>
                                                    {cell || `Col ${i + 1}`}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sheets[activeSheet].rows.slice(1).map((row, ri) => (
                                            <tr key={ri}>
                                                {row.map((cell, ci) => (
                                                    <td key={ci} className="px-3 py-1.5 whitespace-nowrap"
                                                        style={{
                                                            border: "1px solid var(--border)",
                                                            color: "var(--muted)",
                                                            background: ri % 2 === 0 ? "transparent" : "rgba(255,255,255,.02)",
                                                        }}>
                                                        {cell}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}