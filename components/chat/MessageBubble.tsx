"use client"
import { useState } from "react"
import { Copy, Check, ThumbsUp, ThumbsDown, X, ZoomIn, FileSpreadsheet, Eye } from "lucide-react"
import { useTheme } from "@/components/layout/Sidebar"

export type Message = {
  id: string
  role: "user" | "assistant"
  content: string
  sources?: string[]
  imagePreviews?: string[]
  fileAttachments?: { type: string; name: string }[]
}

// ── Image Lightbox ─────────────────────────────────────────────
function ImageLightbox({ src, onClose }: { src: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.9)" }} onClick={onClose}>
      <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full"
        style={{ background: "rgba(255,255,255,0.1)", border: "none", cursor: "pointer", color: "#fff" }}>
        <X size={20} />
      </button>
      <img src={src} alt="Preview" onClick={e => e.stopPropagation()}
        style={{ maxWidth: "90vw", maxHeight: "90vh", objectFit: "contain", borderRadius: 12, boxShadow: "0 25px 60px rgba(0,0,0,0.5)" }} />
    </div>
  )
}

// ── File Preview Modal ─────────────────────────────────────────
type SheetData = { name: string; rows: string[][] }

function parseCSVContent(content: string): SheetData[] {
  const sheets: SheetData[] = []
  const sections = content.split(/=== Sheet: (.+?) ===\n/)
  if (sections.length <= 1) {
    const rows = content.split("\n").filter(Boolean).slice(0, 50).map(r => r.split(","))
    sheets.push({ name: "Sheet 1", rows })
  } else {
    for (let i = 1; i < sections.length; i += 2) {
      const rows = (sections[i + 1] ?? "").split("\n").filter(Boolean).slice(0, 50).map(r => r.split(","))
      if (rows.length > 0) sheets.push({ name: sections[i], rows })
    }
  }
  return sheets
}

function FilePreviewModal({ fileName, onClose }: { fileName: string; onClose: () => void }) {
  const [sheets, setSheets] = useState<SheetData[] | null>(null)
  const [activeSheet, setActiveSheet] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const { T } = useTheme()

  // Load on mount
  useState(() => {
    fetch(`/api/documents/preview?name=${encodeURIComponent(fileName)}`)
      .then(r => r.json())
      .then(d => {
        if (d.content) setSheets(parseCSVContent(d.content))
        else setError("Could not load file preview")
      })
      .catch(() => setError("Could not load file preview"))
      .finally(() => setLoading(false))
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.85)" }} onClick={onClose}>
      <div className="w-full max-w-4xl rounded-2xl overflow-hidden shadow-2xl flex flex-col"
        style={{ background: "#1a1f2e", border: "1px solid rgba(255,255,255,0.14)", maxHeight: "85vh" }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "rgba(34,197,94,.15)" }}>
            <FileSpreadsheet size={15} color="#22c55e" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: T.text }}>{fileName}</p>
            <p className="text-xs" style={{ color: T.faint }}>
              {sheets ? `${sheets.length} sheet${sheets.length !== 1 ? "s" : ""} · first 50 rows shown` : "Loading…"}
            </p>
          </div>
          <button onClick={onClose} style={{ color: T.faint, background: "none", border: "none", cursor: "pointer", padding: 4 }}>
            <X size={16} />
          </button>
        </div>

        {/* Sheet tabs */}
        {sheets && sheets.length > 1 && (
          <div className="flex gap-1 px-4 pt-3 shrink-0 overflow-x-auto" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            {sheets.map((s, i) => (
              <button key={i} onClick={() => setActiveSheet(i)}
                className="px-3 py-1.5 rounded-t-lg text-xs font-medium whitespace-nowrap mb-0"
                style={{
                  background: activeSheet === i ? "#22c55e" : "rgba(255,255,255,0.06)",
                  color: activeSheet === i ? "#fff" : T.muted,
                  border: "none", cursor: "pointer",
                }}>
                {s.name}
              </button>
            ))}
          </div>
        )}

        {/* Table content */}
        <div className="flex-1 overflow-auto p-4">
          {loading && (
            <div className="flex items-center justify-center py-12" style={{ color: T.faint }}>
              Loading preview…
            </div>
          )}
          {error && (
            <div className="flex items-center justify-center py-12" style={{ color: "#ef4444" }}>
              {error}
            </div>
          )}
          {sheets && sheets[activeSheet] && (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr>
                  {sheets[activeSheet].rows[0]?.map((cell, i) => (
                    <th key={i} style={{
                      background: "rgba(34,197,94,.12)", color: "#22c55e", fontWeight: 600,
                      textAlign: "left", padding: "6px 10px",
                      border: "1px solid rgba(255,255,255,0.08)", whiteSpace: "nowrap",
                    }}>{cell || `Col ${i + 1}`}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sheets[activeSheet].rows.slice(1).map((row, ri) => (
                  <tr key={ri}>
                    {row.map((cell, ci) => (
                      <td key={ci} style={{
                        padding: "5px 10px", border: "1px solid rgba(255,255,255,0.06)",
                        color: T.muted, whiteSpace: "nowrap",
                        background: ri % 2 === 0 ? "transparent" : "rgba(255,255,255,.02)",
                      }}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main MessageBubble ─────────────────────────────────────────
export function MessageBubble({ msg, streaming = false }: { msg: Message; streaming?: boolean }) {
  const [copied, setCopied] = useState(false)
  const [vote, setVote] = useState<"up" | "down" | null>(null)
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)
  const [previewFile, setPreviewFile] = useState<string | null>(null)
  const { T } = useTheme()
  const isUser = msg.role === "user"

  async function copy() {
    await navigator.clipboard.writeText(msg.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  return (
    <>
      {lightboxSrc && <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}
      {previewFile && <FilePreviewModal fileName={previewFile} onClose={() => setPreviewFile(null)} />}

      <div style={{ display: "flex", gap: 12, padding: "6px 0", justifyContent: isUser ? "flex-end" : "flex-start" }}>
        {!isUser && (
          <div style={{
            width: 28, height: 28, borderRadius: 8, flexShrink: 0, marginTop: 2,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 10, fontWeight: 700,
            background: `${T.accent}15`, border: `1px solid ${T.accent}30`, color: T.accent
          }}>Esti</div>
        )}

        <div style={{ maxWidth: "84%", display: "flex", flexDirection: "column", gap: 6, alignItems: isUser ? "flex-end" : "flex-start" }}>

          {/* Clickable image previews */}
          {isUser && msg.imagePreviews && msg.imagePreviews.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "flex-end" }}>
              {msg.imagePreviews.map((src, i) => (
                <div key={i} className="group relative" style={{ cursor: "pointer" }} onClick={() => setLightboxSrc(src)}>
                  <img src={src} alt="attachment"
                    style={{ maxWidth: 200, maxHeight: 200, borderRadius: 10, border: `1px solid ${T.border}`, objectFit: "cover", display: "block" }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
                    onMouseLeave={e => (e.currentTarget.style.opacity = "1")} />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ borderRadius: 10, background: "rgba(0,0,0,0.3)", pointerEvents: "none" }}>
                    <ZoomIn size={20} color="#fff" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Clickable file attachment cards */}
          {!isUser && msg.fileAttachments && msg.fileAttachments.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {msg.fileAttachments.map((f, i) => (
                <button key={i}
                  onClick={() => setPreviewFile(f.name)}
                  className="group flex items-center gap-2"
                  style={{
                    padding: "6px 12px", borderRadius: 10, cursor: "pointer",
                    background: `${T.accent}12`, border: `1px solid ${T.accent}30`,
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = `${T.accent}22`; e.currentTarget.style.borderColor = `${T.accent}60` }}
                  onMouseLeave={e => { e.currentTarget.style.background = `${T.accent}12`; e.currentTarget.style.borderColor = `${T.accent}30` }}>
                  <FileSpreadsheet size={14} color={T.accent} />
                  <span style={{ fontSize: 12, color: T.text, fontWeight: 500 }}>{f.name}</span>
                  <Eye size={11} style={{ color: T.faint, marginLeft: 2 }} />
                </button>
              ))}
            </div>
          )}

          {/* Message bubble */}
          <div style={{
            borderRadius: 16, padding: "10px 16px", fontSize: 14,
            ...(isUser ? {
              background: T.accent, color: T.accentText,
              fontWeight: 500, borderBottomRightRadius: 4,
            } : {
              background: T.surface, border: `1px solid ${T.border}`,
              color: T.text, borderBottomLeftRadius: 4,
            })
          }}>
            {isUser ? (
              <p style={{ whiteSpace: "pre-wrap", lineHeight: 1.65, margin: 0 }}>{msg.content}</p>
            ) : (
              <div style={{ color: T.text }}>
                {streaming ? (
                  <p style={{ whiteSpace: "pre-wrap", lineHeight: 1.65, margin: 0 }}>
                    {msg.content}
                    <span style={{ display: "inline-block", width: 6, height: "1.1em", marginLeft: 2, borderRadius: 2, verticalAlign: "middle", background: T.accent, animation: "blink .9s step-end infinite" }} />
                  </p>
                ) : (
                  <MarkdownText text={msg.content} T={T} />
                )}
              </div>
            )}
          </div>

          {/* Action buttons */}
          {!isUser && !streaming && msg.content && (
            <div style={{ display: "flex", gap: 2 }}>
              {[
                { icon: copied ? <Check size={13} color="#22c55e" /> : <Copy size={13} />, fn: copy, title: "Copy", active: copied, col: "#22c55e" },
                { icon: <ThumbsUp size={13} />, fn: () => setVote("up"), title: "Good", active: vote === "up", col: "#22c55e" },
                { icon: <ThumbsDown size={13} />, fn: () => setVote("down"), title: "Poor", active: vote === "down", col: "#ef4444" },
              ].map(({ icon, fn, title, active, col }, idx) => (
                <button key={idx} onClick={fn} title={title} style={{
                  padding: 6, borderRadius: 6, border: "none", cursor: "pointer",
                  color: active ? col : T.faint, background: active ? `${col}15` : "transparent"
                }}>{icon}</button>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

function MarkdownText({ text, T }: { text: string; T: any }) {
  const lines = text.split("\n")
  const elements: React.ReactNode[] = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (line.includes("|") && lines[i + 1]?.match(/^\s*\|?[-:]+\|/)) {
      const headers = line.split("|").map(h => h.trim()).filter(Boolean)
      i += 2
      const rows: string[][] = []
      while (i < lines.length && lines[i].includes("|")) {
        rows.push(lines[i].split("|").map(c => c.trim()).filter(Boolean))
        i++
      }
      elements.push(
        <div key={`t${i}`} style={{ overflowX: "auto", margin: "8px 0" }}>
          <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 12 }}>
            <thead><tr>{headers.map((h, j) => <th key={j} style={{ padding: "5px 10px", textAlign: "left", background: "rgba(34,197,94,.12)", color: "#22c55e", border: "1px solid rgba(255,255,255,.1)", fontWeight: 600 }}>{h}</th>)}</tr></thead>
            <tbody>{rows.map((row, ri) => <tr key={ri}>{row.map((cell, ci) => <td key={ci} style={{ padding: "4px 10px", border: "1px solid rgba(255,255,255,.06)", color: T.text, background: ri % 2 === 1 ? "rgba(255,255,255,.02)" : "transparent" }}>{cell}</td>)}</tr>)}</tbody>
          </table>
        </div>
      )
      continue
    }
    if (line.startsWith("### ")) elements.push(<p key={i} style={{ fontWeight: 700, fontSize: 13, margin: "6px 0 2px", color: T.text }}>{renderInline(line.slice(4))}</p>)
    else if (line.startsWith("## ")) elements.push(<p key={i} style={{ fontWeight: 700, fontSize: 14, margin: "8px 0 3px", color: T.text }}>{renderInline(line.slice(3))}</p>)
    else if (line.startsWith("# ")) elements.push(<p key={i} style={{ fontWeight: 700, fontSize: 15, margin: "10px 0 4px", color: T.text }}>{renderInline(line.slice(2))}</p>)
    else if (line.startsWith("- ") || line.startsWith("* ")) elements.push(
      <div key={i} style={{ display: "flex", gap: 6, marginBottom: 2 }}>
        <span style={{ color: "#22c55e", flexShrink: 0 }}>•</span>
        <span style={{ color: T.text }}>{renderInline(line.slice(2))}</span>
      </div>
    )
    else if (line.startsWith("```")) {
      const codeLines: string[] = []; i++
      while (i < lines.length && !lines[i].startsWith("```")) { codeLines.push(lines[i]); i++ }
      elements.push(<pre key={i} style={{ background: "#0d1117", border: "1px solid rgba(255,255,255,.08)", borderRadius: 8, padding: "10px 14px", overflowX: "auto", margin: "6px 0", fontSize: 12, color: "#e8e8e8" }}>{codeLines.join("\n")}</pre>)
    }
    else if (line.trim() === "") elements.push(<div key={i} style={{ height: 5 }} />)
    else elements.push(<p key={i} style={{ margin: "2px 0", lineHeight: 1.65, color: T.text }}>{renderInline(line)}</p>)
    i++
  }
  return <div>{elements}</div>
}

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/)
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={i}>{part.slice(2, -2)}</strong>
    if (part.startsWith("`") && part.endsWith("`")) return <code key={i} style={{ background: "rgba(34,197,94,.12)", color: "#22c55e", padding: "1px 5px", borderRadius: 4, fontSize: "0.9em" }}>{part.slice(1, -1)}</code>
    return part
  })
}