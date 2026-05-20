"use client"
import { useState, useRef, useEffect } from "react"
import { ArrowUp, Paperclip } from "lucide-react"

export function MessageInput({ onSend, disabled }: { onSend: (t: string) => void; disabled: boolean }) {
  const [val, setVal] = useState("")
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!ref.current) return
    ref.current.style.height = "auto"
    ref.current.style.height = Math.min(ref.current.scrollHeight, 144) + "px"
  }, [val])

  function submit() {
    if (!val.trim() || disabled) return
    onSend(val.trim())
    setVal("")
  }

  const canSend = !!val.trim() && !disabled

  return (
    <div className="flex items-end gap-2 rounded-xl px-3 py-2 transition-all"
         style={{ background: "#161b27", border: `1px solid ${canSend ? "rgba(245,158,11,.35)" : "rgba(255,255,255,.08)"}` }}>
      <button className="p-1.5 shrink-0 mb-0.5 transition-colors"
              style={{ color: "#4a5068" }}
              onClick={() => alert("Upload documents via the Documents page in the sidebar.")}
              title="Documents page">
        <Paperclip size={15} />
      </button>

      <textarea
        ref={ref}
        value={val}
        onChange={e => setVal(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit() } }}
        disabled={disabled}
        rows={1}
        placeholder="Ask about project costs, labor rates, permits…"
        className="flex-1 bg-transparent resize-none text-sm leading-relaxed focus:outline-none py-1 min-h-[28px]"
        style={{ color: "#e8e8e8" }}
      />

      <button
        onClick={submit}
        disabled={!canSend}
        className="p-1.5 rounded-lg shrink-0 mb-0.5 transition-all"
        style={{
          background: canSend ? "#f59e0b" : "#1e2538",
          color: canSend ? "#0d1117" : "#4a5068",
          cursor: canSend ? "pointer" : "not-allowed",
        }}
        title="Send (Enter)"
      >
        <ArrowUp size={15} />
      </button>
    </div>
  )
}
