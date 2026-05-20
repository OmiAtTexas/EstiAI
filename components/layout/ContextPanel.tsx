"use client"
import { FileText, ChevronLeft, ChevronRight } from "lucide-react"

export function ContextPanel({ open, onToggle, sources }: { open: boolean; onToggle: () => void; sources: string[] }) {
  const S = { bg: "#161b27", border: "rgba(255,255,255,0.08)", text: "#e8e8e8", muted: "#8b8fa8", faint: "#4a5068", accent: "#f59e0b" }

  return (
    <div className="relative flex shrink-0">
      {/* Toggle tab */}
      <button
        onClick={onToggle}
        className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-9 rounded-l-lg flex items-center justify-center z-10 transition-colors"
        style={{ background: S.bg, border: `1px solid ${S.border}`, borderRight: "none", color: S.faint }}
        onMouseEnter={e => e.currentTarget.style.color = S.muted}
        onMouseLeave={e => e.currentTarget.style.color = S.faint}
      >
        {open ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>

      {/* Panel */}
      <div className="overflow-hidden transition-all duration-200"
           style={{ width: open ? 272 : 0, background: S.bg, borderLeft: open ? `1px solid ${S.border}` : "none" }}>
        <div style={{ width: 272 }} className="p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider mb-3" style={{ color: S.faint }}>
            Project Context
          </p>
          {sources.length === 0 ? (
            <p className="text-xs leading-relaxed" style={{ color: S.faint }}>
              Source documents will appear here when the AI references them in a response.
            </p>
          ) : (
            <div className="space-y-2">
              {sources.map(src => (
                <div key={src} className="flex items-start gap-2 p-2.5 rounded-lg"
                     style={{ background: "#1e2538", border: `1px solid ${S.border}` }}>
                  <FileText size={13} color={S.accent} className="shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium leading-snug" style={{ color: S.text }}>{src}</p>
                    <p className="text-[10px] mt-0.5" style={{ color: S.faint }}>Internal project document</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
