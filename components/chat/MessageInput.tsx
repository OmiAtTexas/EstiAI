"use client"
import { useState, useRef, useEffect } from "react"
import { ArrowUp, Paperclip, Loader2 } from "lucide-react"
import { useTheme } from "@/components/layout/Sidebar"
import { compressExcelFile } from "@/lib/compressFile"

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
  const [compressing, setCompressing] = useState(false)
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

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const rawFiles = Array.from(e.target.files ?? []).filter(f =>
      f.name.toLowerCase().match(/\.(xlsm|xlsx|xls|csv)$/)
    )
    if (rawFiles.length === 0) {
      alert("Only Excel files (.xlsx, .xlsm, .xls, .csv) are supported.")
      return
    }

    setCompressing(true)
    const processedFiles: File[] = []

    for (const f of rawFiles) {
      const { file, wasCompressed } = await compressExcelFile(f)
      if (wasCompressed) {
        console.log(`${f.name}: compressed from ${(f.size / 1024 / 1024).toFixed(1)}MB to ${(file.size / 1024).toFixed(0)}KB`)
      }
      processedFiles.push(file)
    }

    setCompressing(false)
    onFilesSelected(processedFiles)
    e.target.value = ""
  }

  const canSend = !!val.trim() && !disabled && !compressing
  const isDisabled = disabled || compressing

  return (
    <div
      className="flex items-end gap-2 rounded-xl px-3 py-2 transition-all"
      style={{
        background: T.surface,
        border: `1px solid ${focused ? T.accent + "60" : T.border}`,
      }}
    >
      <input
        ref={fileRef}
        type="file"
        multiple
        accept=".xlsx,.xlsm,.xls,.csv"
        className="hidden"
        onChange={handleFileChange}
      />

      <button
        className="p-1.5 shrink-0 mb-0.5 transition-colors rounded-md"
        style={{ color: compressing ? T.accent : T.faint }}
        onClick={() => !compressing && fileRef.current?.click()}
        title={compressing ? "Compressing file..." : "Attach Excel file"}
        disabled={compressing}
      >
        {compressing
          ? <Loader2 size={15} className="animate-spin" />
          : <Paperclip size={15} />
        }
      </button>

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
        disabled={isDisabled}
        rows={1}
        placeholder={compressing ? "Compressing file..." : "Ask about project costs, labor rates, permits…"}
        className="flex-1 bg-transparent resize-none text-sm leading-relaxed focus:outline-none py-1 min-h-[28px]"
        style={{ color: T.text, caretColor: T.accent }}
      />

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