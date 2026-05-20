"use client"
import { useTheme } from "@/components/layout/Sidebar"

export function TypingIndicator() {
  const { T } = useTheme()
  return (
    <div className="flex gap-3 py-2">
      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-[10px] font-bold"
        style={{ background: `${T.accent}15`, border: `1px solid ${T.accent}30`, color: T.accent }}>
        AI
      </div>
      <div className="px-4 py-3 rounded-2xl rounded-bl-sm flex items-center gap-1.5"
        style={{ background: T.surface, border: `1px solid ${T.border}` }}>
        {[0, 1, 2].map(i => (
          <span key={i} className="w-1.5 h-1.5 rounded-full animate-dot"
            style={{ background: T.faint, animationDelay: `${i * 0.15}s` }} />
        ))}
      </div>
    </div>
  )
}