"use client"
import { useState, useRef, useEffect, useCallback } from "react"
import { ArrowUp, Paperclip, X, ImageIcon, Loader2 } from "lucide-react"
import { useTheme } from "@/components/layout/Sidebar"
import { compressExcelFile } from "@/lib/compressFile"

export type AttachedFile =
  | { type: "excel"; file: File }
  | { type: "image"; file: File; previewUrl: string }

export function MessageInput({
  onSend,
  onFilesSelected,
  disabled,
}: {
  onSend: (text: string, images?: AttachedFile[]) => void
  onFilesSelected: (files: File[]) => void
  disabled: boolean
}) {
  const [val, setVal] = useState("")
  const [focused, setFocused] = useState(false)
  const [compressing, setCompressing] = useState(false)
  const [attachedImages, setAttachedImages] = useState<AttachedFile[]>([])
  const textRef = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const imageRef = useRef<HTMLInputElement>(null)
  const { T } = useTheme()

  useEffect(() => {
    if (!textRef.current) return
    textRef.current.style.height = "auto"
    textRef.current.style.height = Math.min(textRef.current.scrollHeight, 144) + "px"
  }, [val])

  // Paste handler — catches Cmd+V / Ctrl+V with images
  const handlePaste = useCallback((e: ClipboardEvent) => {
    const items = e.clipboardData?.items
    if (!items) return
    for (const item of Array.from(items)) {
      if (item.type.startsWith("image/")) {
        e.preventDefault()
        const file = item.getAsFile()
        if (!file) continue
        const previewUrl = URL.createObjectURL(file)
        const named = new File([file], `screenshot-${Date.now()}.png`, { type: file.type })
        setAttachedImages(p => [...p, { type: "image", file: named, previewUrl }])
      }
    }
  }, [])

  useEffect(() => {
    const el = textRef.current
    if (!el) return
    el.addEventListener("paste", handlePaste)
    return () => el.removeEventListener("paste", handlePaste)
  }, [handlePaste])

  function removeImage(idx: number) {
    setAttachedImages(p => {
      const next = [...p]
      URL.revokeObjectURL((next[idx] as any).previewUrl)
      next.splice(idx, 1)
      return next
    })
  }

  function submit() {
    if ((!val.trim() && attachedImages.length === 0) || disabled) return
    onSend(val.trim(), attachedImages.length > 0 ? attachedImages : undefined)
    setVal("")
    setAttachedImages([])
  }

  async function handleExcelChange(e: React.ChangeEvent<HTMLInputElement>) {
    const rawFiles = Array.from(e.target.files ?? []).filter(f =>
      f.name.toLowerCase().match(/\.(xlsm|xlsx|xls|csv)$/)
    )
    if (rawFiles.length === 0) return
    setCompressing(true)
    const processed: File[] = []
    for (const f of rawFiles) {
      const { file } = await compressExcelFile(f)
      processed.push(file)
    }
    setCompressing(false)
    onFilesSelected(processed)
    e.target.value = ""
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).filter(f => f.type.startsWith("image/"))
    for (const file of files) {
      const previewUrl = URL.createObjectURL(file)
      setAttachedImages(p => [...p, { type: "image", file, previewUrl }])
    }
    e.target.value = ""
  }

  const canSend = (!!val.trim() || attachedImages.length > 0) && !disabled && !compressing

  return (
    <div className="flex flex-col gap-2">
      {/* Image previews */}
      {attachedImages.length > 0 && (
        <div className="flex flex-wrap gap-2 px-1">
          {attachedImages.map((img, idx) => (
            <div key={idx} className="relative group">
              <img
                src={(img as any).previewUrl}
                alt="attachment"
                style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 8, border: `1px solid ${T.border}` }}
              />
              <button
                onClick={() => removeImage(idx)}
                className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center"
                style={{ background: "#ef4444", border: "none", cursor: "pointer" }}>
                <X size={9} color="#fff" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2 rounded-xl px-3 py-2 transition-all"
        style={{ background: T.surface, border: `1px solid ${focused ? T.accent + "60" : T.border}` }}>

        {/* Hidden Excel file input */}
        <input ref={fileRef} type="file" multiple accept=".xlsx,.xlsm,.xls,.csv" className="hidden" onChange={handleExcelChange} />
        {/* Hidden image file input */}
        <input ref={imageRef} type="file" multiple accept="image/*" className="hidden" onChange={handleImageChange} />

        {/* Paperclip — opens Excel picker */}
        <button
          className="p-1.5 shrink-0 mb-0.5 rounded-md transition-colors"
          style={{ color: compressing ? T.accent : T.faint, background: "none", border: "none", cursor: "pointer" }}
          onClick={() => !compressing && fileRef.current?.click()}
          title="Attach Excel file"
          disabled={compressing}>
          {compressing ? <Loader2 size={15} className="animate-spin" /> : <Paperclip size={15} />}
        </button>

        {/* Image icon — opens image picker */}
        <button
          className="p-1.5 shrink-0 mb-0.5 rounded-md transition-colors"
          style={{ color: T.faint, background: "none", border: "none", cursor: "pointer" }}
          onClick={() => imageRef.current?.click()}
          title="Attach image (or paste with Cmd+V)">
          <ImageIcon size={15} />
          <span
            onMouseEnter={e => (e.currentTarget.parentElement!.style.color = T.accent)}
            onMouseLeave={e => (e.currentTarget.parentElement!.style.color = T.faint)}
            style={{ display: "none" }} />
        </button>

        {/* Text input */}
        <textarea
          ref={textRef}
          value={val}
          onChange={e => setVal(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit() }
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          disabled={disabled}
          rows={1}
          placeholder={compressing ? "Compressing…" : attachedImages.length > 0 ? "Ask about this image…" : "Ask about project costs, labor rates, permits…"}
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
            border: "none",
            cursor: canSend ? "pointer" : "not-allowed",
          }}>
          <ArrowUp size={15} />
        </button>
      </div>
    </div>
  )
}