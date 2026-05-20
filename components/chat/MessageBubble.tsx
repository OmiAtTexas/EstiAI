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
    <div className={`flex gap-3 py-1.5 animate-fadein ${isUser ? "justify-end" : ""}`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold"
          style={{ background: `${T.accent}15`, border: `1px solid ${T.accent}30`, color: T.accent }}>
          Esti
        </div>
      )}

      <div className={`max-w-[84%] space-y-1.5 ${isUser ? "items-end flex flex-col" : ""}`}>
        {/* Bubble */}
        <div className="rounded-2xl px-4 py-3 text-sm"
          style={isUser ? {
            background: T.accent,
            color: T.accentText,
            fontWeight: 500,
            borderBottomRightRadius: 4,
          } : {
            background: T.surface,
            border: `1px solid ${T.border}`,
            color: T.text,
            borderBottomLeftRadius: 4,
          }}>
          {isUser ? (
            <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
          ) : (
            <div className="md-wrap" style={{ color: T.text }}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
              {streaming && (
                <span className="inline-block w-1.5 h-[1.1em] ml-0.5 rounded-sm align-middle animate-blink"
                  style={{ background: T.accent }} />
              )}
            </div>
          )}
        </div>

        {/* Source badges */}
        {!isUser && msg.sources && msg.sources.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-1">
            {msg.sources.map(src => (
              <span key={src} className="text-[10px] px-2 py-0.5 rounded-full"
                style={{ background: `${T.accent}15`, color: T.accent, border: `1px solid ${T.accent}30` }}>
                {src}
              </span>
            ))}
          </div>
        )}

        {/* Actions */}
        {!isUser && !streaming && (
          <div className="flex items-center gap-0.5 px-1">
            <Btn onClick={copy} title="Copy" active={copied} activeColor="#22c55e" T={T}>
              {copied ? <Check size={13} color="#22c55e" /> : <Copy size={13} />}
            </Btn>
            <Btn onClick={() => setVote("up")} title="Good response" active={vote === "up"} activeColor="#22c55e" T={T}>
              <ThumbsUp size={13} />
            </Btn>
            <Btn onClick={() => setVote("down")} title="Poor response" active={vote === "down"} activeColor="#ef4444" T={T}>
              <ThumbsDown size={13} />
            </Btn>
          </div>
        )}
      </div>
    </div>
  )
}

function Btn({ children, onClick, title, active, activeColor, T }: any) {
  return (
    <button onClick={onClick} title={title}
      className="p-1.5 rounded-md transition-colors"
      style={{ color: active ? activeColor : T.faint, background: active ? `${activeColor}15` : "transparent" }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.color = T.muted }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.color = T.faint }}>
      {children}
    </button>
  )
}