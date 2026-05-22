"use client"
import { useState } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Copy, Check, ThumbsUp, ThumbsDown } from "lucide-react"
import { useTheme } from "@/components/layout/Sidebar"

export type Message = {
  id: string
  role: "user" | "assistant"
  content: string
  sources?: string[]
}

export function MessageBubble({ msg, streaming = false }: { msg: Message; streaming?: boolean }) {
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
    <div style={{
      display: "flex", gap: 12, padding: "6px 0",
      justifyContent: isUser ? "flex-end" : "flex-start"
    }}>
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
            <p style={{ whiteSpace: "pre-wrap", lineHeight: 1.65, margin: 0, color: T.accentText }}>
              {msg.content}
            </p>
          ) : (
            <div style={{ color: T.text }}>
              {/* Plain text during streaming to avoid ReactMarkdown delay */}
              {streaming ? (
                <p style={{ whiteSpace: "pre-wrap", lineHeight: 1.65, margin: 0, color: T.text }}>
                  {msg.content}
                  <span style={{
                    display: "inline-block", width: 6, height: "1.1em",
                    marginLeft: 2, borderRadius: 2, verticalAlign: "middle",
                    background: T.accent, animation: "blink .9s step-end infinite"
                  }} />
                </p>
              ) : (
                <div className="md-wrap" style={{ color: T.text }}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {msg.content}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          )}
        </div>

        {!isUser && !streaming && msg.sources && msg.sources.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {msg.sources.map(src => (
              <span key={src} style={{
                fontSize: 10, padding: "2px 8px", borderRadius: 20,
                background: `${T.accent}15`, color: T.accent, border: `1px solid ${T.accent}30`
              }}>{src}</span>
            ))}
          </div>
        )}

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