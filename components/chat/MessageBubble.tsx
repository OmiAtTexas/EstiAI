"use client"
import { useState } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Copy, Check, ThumbsUp, ThumbsDown } from "lucide-react"
import { AiAvatar } from "./TypingIndicator"

export type Message = {
  id: string
  role: "user" | "assistant"
  content: string
  sources?: string[]
}

const S = {
  border: "rgba(255,255,255,0.08)",
  faint: "#4a5068",
  muted: "#8b8fa8",
  accent: "#f59e0b",
}

export function MessageBubble({ msg, streaming = false }: { msg: Message; streaming?: boolean }) {
  const [copied, setCopied] = useState(false)
  const [vote, setVote] = useState<"up" | "down" | null>(null)
  const isUser = msg.role === "user"

  async function copy() {
    await navigator.clipboard.writeText(msg.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  return (
    <div className={`flex gap-3 py-1.5 animate-fadein ${isUser ? "justify-end" : ""}`}>
      {!isUser && <AiAvatar />}

      <div className={`max-w-[84%] space-y-1.5 ${isUser ? "items-end flex flex-col" : ""}`}>
        {/* Bubble */}
        <div
          className="rounded-2xl px-4 py-3 text-sm"
          style={
            isUser
              ? { background: "#f59e0b", color: "#0d1117", fontWeight: 500, borderBottomRightRadius: 4 }
              : { background: "#161b27", border: `1px solid ${S.border}`, color: "#e8e8e8", borderBottomLeftRadius: 4 }
          }
        >
          {isUser ? (
            <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
          ) : (
            <div className="md">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
              {streaming && (
                <span className="inline-block w-1.5 h-[1.1em] ml-0.5 animate-blink rounded-sm align-middle"
                      style={{ background: S.accent }} />
              )}
            </div>
          )}
        </div>

        {/* Source badges */}
        {!isUser && msg.sources && msg.sources.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-1">
            {msg.sources.map(src => (
              <span key={src} className="text-[10px] px-2 py-0.5 rounded-full"
                    style={{ background: "rgba(245,158,11,.1)", color: S.accent, border: "1px solid rgba(245,158,11,.2)" }}>
                {src}
              </span>
            ))}
          </div>
        )}

        {/* Actions */}
        {!isUser && !streaming && (
          <div className="flex items-center gap-0.5 px-1">
            <Btn onClick={copy} title="Copy">
              {copied ? <Check size={13} color="#22c55e" /> : <Copy size={13} />}
            </Btn>
            <Btn onClick={() => setVote("up")} title="Good response"
                 active={vote === "up"} activeColor="#22c55e">
              <ThumbsUp size={13} />
            </Btn>
            <Btn onClick={() => setVote("down")} title="Poor response"
                 active={vote === "down"} activeColor="#ef4444">
              <ThumbsDown size={13} />
            </Btn>
          </div>
        )}
      </div>
    </div>
  )
}

function Btn({ children, onClick, title, active, activeColor }: {
  children: React.ReactNode; onClick: () => void; title: string; active?: boolean; activeColor?: string
}) {
  return (
    <button onClick={onClick} title={title}
            className="p-1.5 rounded-md transition-colors"
            style={{ color: active ? activeColor : "#4a5068", background: active ? `${activeColor}15` : "transparent" }}
            onMouseEnter={e => { if (!active) e.currentTarget.style.color = "#8b8fa8" }}
            onMouseLeave={e => { if (!active) e.currentTarget.style.color = "#4a5068" }}>
      {children}
    </button>
  )
}
