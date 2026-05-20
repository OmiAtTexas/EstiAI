"use client"
import { useState, useRef, useEffect } from "react"
import { ArrowUp, Paperclip } from "lucide-react"
import { useTheme } from "@/components/layout/Sidebar"

export function MessageInput({ onSend, disabled }: { onSend: (t: string) => void; disabled: boolean }) {
  const [val, setVal] = useState("")
  const [focused, setFocused] = useState(false)
  const ref = useRef<HTMLTextAreaElement>(null)
  const { T } = useTheme()

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
      style={{
        background: T.surface,
        border: `1px solid ${focused ? T.accent + "60" : T.border}`,
      }}>
      <button className="p-1.5 shrink-0 mb-0.5 transition-colors"
        style={{ color: T.faint }}
        onClick={() => alert("Upload documents via the Documents page in the sidebar.")}
        title="Documents page">
        <Paperclip size={15} />
      </button>

      <textarea
        ref={ref}
        value={val}
        onChange={e => setVal(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit() } }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        disabled={disabled}
        rows={1}
        placeholder="Ask about project costs, labor rates, permits…"
        className="flex-1 bg-transparent resize-none text-sm leading-relaxed focus:outline-none py-1 min-h-[28px]"
        style={{ color: T.text, caretColor: T.accent }}
      />

      <button onClick={submit} disabled={!canSend}
        className="p-1.5 rounded-lg shrink-0 mb-0.5 transition-all"
        style={{
          background: canSend ? T.accent : T.surfHover,
          color: canSend ? T.accentText : T.faint,
          cursor: canSend ? "pointer" : "not-allowed",
        }}
        title="Send (Enter)">
        <ArrowUp size={15} />
      </button>
    </div>
  )
}