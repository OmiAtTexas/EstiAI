"use client"
import { useState, useRef, useEffect } from "react"
import { ArrowUp, Paperclip } from "lucide-react"
import { useTheme } from "@/components/layout/Sidebar"

export function MessageInput({
  onSend,
  onFilesSelected,
  disabled,
}: {
  onSend: (t: string) => void
  onFilesSelected: (files: File[]) => void
  disabled: boolean
}) {
  const [val, setVal] = useState("")
  const [focused, setFocused] = useState(false)
  const textRef = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const { T } = useTheme()

  useEffect(() => {
    if (!textRef.current) return
    textRef.current.style.height = "auto"
    textRef.current.style.height = Math.min(textRef.current.scrollHeight, 144) + "px"
  }, [val])

  function submit() {
    if (!val.trim() || disabled) return
    onSend(val.trim())
    setVal("")
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).filter(f =>
      f.name.toLowerCase().match(/\.(xlsm|xlsx|xls|csv)$/)
    )
    if (files.length === 0) {
      alert("Only Excel files (.xlsx, .xlsm, .xls, .csv) are supported.")
      return
    }
    onFilesSelected(files)
    e.target.value = "" // reset so same file can be re-uploaded
  }

  const canSend = !!val.trim() && !disabled

  return (
    <div
      className="flex items-end gap-2 rounded-xl px-3 py-2 transition-all"
      style={{
        background: T.surface,
        border: `1px solid ${focused ? T.accent + "60" : T.border}`,
      }}
    >
      {/* Hidden file input — Excel only */}
      <input
        ref={fileRef}
        type="file"
        multiple
        accept=".xlsx,.xlsm,.xls,.csv"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Paperclip button — opens file picker */}
      <button
        className="p-1.5 shrink-0 mb-0.5 transition-colors rounded-md"
        style={{ color: T.faint }}
        onClick={() => fileRef.current?.click()}
        title="Attach Excel file (.xlsx, .xls, .csv)"
        onMouseEnter={e => (e.currentTarget.style.color = T.accent)}
        onMouseLeave={e => (e.currentTarget.style.color = T.faint)}
      >
        <Paperclip size={15} />
      </button>

      {/* Text input */}
      <textarea
        ref={textRef}
        value={val}
        onChange={e => setVal(e.target.value)}
        onKeyDown={e => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            submit()
          }
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        disabled={disabled}
        rows={1}
        placeholder="Ask about project costs, labor rates, permits…"
        className="flex-1 bg-transparent resize-none text-sm leading-relaxed focus:outline-none py-1 min-h-[28px]"
        style={{ color: T.text, caretColor: T.accent }}
      />

      {/* Send button */}
      <button
        onClick={submit}
        disabled={!canSend}
        className="p-1.5 rounded-lg shrink-0 mb-0.5 transition-all"
        style={{
          background: canSend ? T.accent : T.surfHover,
          color: canSend ? T.accentText : T.faint,
          cursor: canSend ? "pointer" : "not-allowed",
        }}
        title="Send (Enter)"
      >
        <ArrowUp size={15} />
      </button>
    </div>
  )
}