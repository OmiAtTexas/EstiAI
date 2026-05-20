export function TypingIndicator() {
  return (
    <div className="flex gap-3 py-2">
      <AiAvatar />
      <div className="px-4 py-3 rounded-2xl rounded-bl-sm flex items-center gap-1.5"
           style={{ background: "#161b27", border: "1px solid rgba(255,255,255,0.08)" }}>
        {[0, 1, 2].map(i => (
          <span key={i} className="w-1.5 h-1.5 rounded-full animate-dot"
                style={{ background: "#4a5068", animationDelay: `${i * 0.15}s` }} />
        ))}
      </div>
    </div>
  )
}

export function AiAvatar() {
  return (
    <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold"
         style={{ background: "rgba(245,158,11,.12)", border: "1px solid rgba(245,158,11,.22)", color: "#f59e0b" }}>
      AI
    </div>
  )
}
