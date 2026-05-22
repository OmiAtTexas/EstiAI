"use client"
import { useState, useEffect } from "react"
import { FileText, ChevronDown, Check } from "lucide-react"
import { useTheme } from "@/components/layout/Sidebar"

type Doc = { id: string; name: string; projectName?: string }

export function DocSelector({
    onSelectionChange,
}: {
    onSelectionChange: (selectedIds: string[]) => void
}) {
    const [docs, setDocs] = useState<Doc[]>([])
    const [selected, setSelected] = useState<Set<string>>(new Set())
    const [open, setOpen] = useState(false)
    const { T } = useTheme()

    useEffect(() => {
        fetch("/api/documents")
            .then(r => r.json())
            .then(d => {
                const permanent = (d.documents ?? []).filter((doc: any) => !doc.temporary)
                setDocs(permanent)
                // Select all by default
                const allIds = new Set<string>(permanent.map((doc: Doc) => doc.id))
                setSelected(allIds)
                onSelectionChange(permanent.map((doc: Doc) => doc.id))
            })
    }, [])

    if (docs.length <= 1) return null // no need to show if only 1 or 0 docs

    function toggle(id: string) {
        setSelected(prev => {
            const next = new Set(prev)
            if (next.has(id)) {
                // Don't allow deselecting all
                if (next.size === 1) return prev
                next.delete(id)
            } else {
                next.add(id)
            }
            onSelectionChange(Array.from(next))
            return next
        })
    }

    const selectedDocs = docs.filter(d => selected.has(d.id))
    const allSelected = selected.size === docs.length

    return (
        <div className="relative">
            <button
                onClick={() => setOpen(!open)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all"
                style={{
                    background: T.surface,
                    border: `1px solid ${open ? T.accent + "60" : T.border}`,
                    color: T.muted,
                }}
            >
                <FileText size={11} color={T.accent} />
                <span style={{ color: T.text }}>
                    {allSelected
                        ? `All ${docs.length} docs`
                        : `${selected.size} of ${docs.length} docs`}
                </span>
                <ChevronDown
                    size={11}
                    style={{
                        color: T.faint,
                        transform: open ? "rotate(180deg)" : "rotate(0deg)",
                        transition: "transform 0.2s",
                    }}
                />
            </button>

            {open && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setOpen(false)}
                    />

                    {/* Dropdown */}
                    <div
                        className="absolute bottom-9 left-0 z-50 rounded-xl overflow-hidden shadow-2xl"
                        style={{
                            background: T.surface,
                            border: `1px solid ${T.borderHover}`,
                            minWidth: 220,
                        }}
                    >
                        <div className="px-3 py-2" style={{ borderBottom: `1px solid ${T.border}` }}>
                            <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: T.faint }}>
                                Active documents
                            </p>
                            <p className="text-[10px] mt-0.5" style={{ color: T.faint }}>
                                Toggle which files the AI uses
                            </p>
                        </div>

                        <div className="py-1">
                            {docs.map(doc => {
                                const isSelected = selected.has(doc.id)
                                return (
                                    <button
                                        key={doc.id}
                                        onClick={() => toggle(doc.id)}
                                        className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors"
                                        style={{ background: "transparent", border: "none", cursor: "pointer" }}
                                        onMouseEnter={e => (e.currentTarget.style.background = T.surfHover)}
                                        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                                    >
                                        {/* Checkbox */}
                                        <div
                                            className="w-4 h-4 rounded flex items-center justify-center shrink-0"
                                            style={{
                                                background: isSelected ? T.accent : "transparent",
                                                border: `1.5px solid ${isSelected ? T.accent : T.faint}`,
                                            }}
                                        >
                                            {isSelected && <Check size={10} color="#fff" strokeWidth={3} />}
                                        </div>

                                        {/* Doc icon + name */}
                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                            <FileText size={12} color={isSelected ? T.accent : T.faint} className="shrink-0" />
                                            <div className="min-w-0">
                                                <p className="text-xs truncate" style={{ color: isSelected ? T.text : T.muted }}>
                                                    {doc.projectName || doc.name}
                                                </p>
                                                {doc.projectName && doc.projectName !== doc.name && (
                                                    <p className="text-[10px] truncate" style={{ color: T.faint }}>
                                                        {doc.name}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                )
                            })}
                        </div>

                        {/* Select all / none */}
                        <div className="px-3 py-2 flex gap-2" style={{ borderTop: `1px solid ${T.border}` }}>
                            <button
                                onClick={() => {
                                    const allIds = docs.map(d => d.id)
                                    setSelected(new Set(allIds))
                                    onSelectionChange(allIds)
                                }}
                                className="text-[10px] px-2 py-1 rounded"
                                style={{ color: T.accent, background: `${T.accent}15`, border: "none", cursor: "pointer" }}
                            >
                                Select all
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}