"use client"
import { useState } from "react"
import { Copy, Check, ThumbsUp, ThumbsDown } from "lucide-react"
import { useTheme } from "@/components/layout/Sidebar"

export type Message = {
  id: string
  role: "user" | "assistant"
  content: string
  sources?: string[]
}

export function MessageBubble({
  msg,
  streaming = false,
}: {
  msg: Message
  streaming?: boolean
}) {
  const [copied, setCopied] = useState(false)
  const [vote, setVote] = useState<"up" | "down" | null>(null)
  const { T } = useTheme()
  const isUser = msg.role === "user"

  async function copy() {
    await navigator.clipboard.writeText(msg.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  return (
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

        {/* Action buttons — no source badges */}
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