"use client"
import { FileText, ChevronLeft, ChevronRight } from "lucide-react"
import { useTheme } from "@/components/layout/Sidebar"

export function ContextPanel({ open, onToggle, sources }: { open: boolean; onToggle: () => void; sources: string[] }) {
  const { T } = useTheme()
  return (
    <div className="relative flex shrink-0">
      <button onClick={onToggle}
        className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-9 rounded-l-lg flex items-center justify-center z-10 transition-colors"
        style={{ background: T.sidebar, border: `1px solid ${T.border}`, borderRight: "none", color: T.faint }}
        onMouseEnter={e => (e.currentTarget.style.color = T.muted)}
        onMouseLeave={e => (e.currentTarget.style.color = T.faint)}>
        {open ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>
      <div className="overflow-hidden transition-all duration-200"
        style={{ width: open ? 272 : 0, background: T.sidebar, borderLeft: open ? `1px solid ${T.border}` : "none" }}>
        <div style={{ width: 272 }} className="p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider mb-3" style={{ color: T.faint }}>
            Project Context
          </p>
          {sources.length === 0 ? (
            <p className="text-xs leading-relaxed" style={{ color: T.faint }}>
              Source documents will appear here when referenced in a response.
            </p>
          ) : (
            <div className="space-y-2">
              {sources.map(src => (
                <div key={src} className="flex items-start gap-2 p-2.5 rounded-lg"
                  style={{ background: T.surface, border: `1px solid ${T.border}` }}>
                  <FileText size={13} color={T.accent} className="shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium leading-snug" style={{ color: T.text }}>{src}</p>
                    <p className="text-[10px] mt-0.5" style={{ color: T.faint }}>Internal project document</p>
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