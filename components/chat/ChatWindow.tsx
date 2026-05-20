"use client"
import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { HardHat, FileBarChart2, DollarSign, MapPin, Layers } from "lucide-react"
import { MessageBubble, type Message } from "./MessageBubble"
import { MessageInput } from "./MessageInput"
import { TypingIndicator } from "./TypingIndicator"
import { ContextPanel } from "@/components/layout/ContextPanel"

const CHIPS = [
  { icon: FileBarChart2, text: "Summarize the cost breakdown from our uploaded project files" },
  { icon: DollarSign, text: "What were the labor and material costs in our recent projects?" },
  { icon: Layers, text: "Compare total project costs across all uploaded documents" },
  { icon: MapPin, text: "What permits and fees appear in our project files?" },
]

export function ChatWindow({ chatId: initId, messages: initMsgs }: {
  chatId: string | null
  messages: Message[]
}) {
  const [msgs, setMsgs] = useState<Message[]>(initMsgs)
  const [chatId, setChatId] = useState<string | null>(initId)
  const [streaming, setStreaming] = useState(false)
  const [streamText, setStreamText] = useState("")
  const [sources, setSources] = useState<string[]>([])
  const [panelOpen, setPanelOpen] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }) }, [msgs, streamText])

  async function send(text: string) {
    if (!text.trim() || streaming) return
    setMsgs(p => [...p, { id: Date.now().toString(), role: "user", content: text }])
    setStreaming(true)
    setStreamText("")
    setSources([])

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, chatId }),
      })
      if (!res.ok) throw new Error("Request failed")

      const reader = res.body!.getReader()
      const dec = new TextDecoder()
      let full = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        for (const line of dec.decode(value).split("\n")) {
          if (!line.startsWith("data: ")) continue
          try {
            const ev = JSON.parse(line.slice(6))
            if (ev.type === "init") {
              setChatId(ev.chatId)
              if (!initId) router.replace(`/chat/${ev.chatId}`, { scroll: false })
            } else if (ev.type === "token") {
              full += ev.text
              setStreamText(full)
            } else if (ev.type === "done") {
              setSources(ev.sources ?? [])
              if (ev.sources?.length) setPanelOpen(true)
            }
          } catch { }
        }
      }

      setMsgs(p => [...p, { id: Date.now() + "_ai", role: "assistant", content: full, sources }])
      setStreamText("")
    } catch (err: any) {
      console.error("Chat error:", err)
      setMsgs(p => [...p, {
        id: Date.now() + "_err", role: "assistant",
        content: `Error: ${err?.message ?? "Request failed"}. Check the terminal for details.`,
      }])
      setStreamText("")
    } finally {
      setStreaming(false)
    }
  }

  const empty = msgs.length === 0 && !streaming

  return (
    <div className="flex h-full overflow-hidden">
      {/* Main chat column */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          {empty ? (
            <div className="flex flex-col items-center justify-center h-full px-6 py-12">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
                style={{ background: "rgba(245,158,11,.1)", border: "1px solid rgba(245,158,11,.2)" }}>
                <HardHat size={20} color="#f59e0b" />
              </div>
              <h2 className="text-base font-semibold mb-1" style={{ color: "#e8e8e8" }}>
                What can I help you estimate?
              </h2>
              <p className="text-sm text-center max-w-sm mb-8" style={{ color: "#8b8fa8" }}>
                Ask anything about your past projects — costs, labor rates, materials, taxes, permits.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-xl">
                {CHIPS.map(({ icon: Icon, text }) => (
                  <button key={text} onClick={() => send(text)}
                    className="flex items-start gap-3 px-4 py-3 rounded-xl text-left transition-colors"
                    style={{ background: "#161b27", border: "1px solid rgba(255,255,255,.08)" }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(255,255,255,.14)"}
                    onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(255,255,255,.08)"}>
                    <Icon size={14} color="#f59e0b" className="mt-0.5 shrink-0" />
                    <span className="text-sm" style={{ color: "#8b8fa8" }}>{text}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto px-4 py-6 space-y-0.5">
              {msgs.map(m => <MessageBubble key={m.id} msg={m} />)}
              {streaming && (
                streamText
                  ? <MessageBubble msg={{ id: "s", role: "assistant", content: streamText }} streaming />
                  : <TypingIndicator />
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Input bar */}
        <div className="shrink-0" style={{ borderTop: "1px solid rgba(255,255,255,.07)", background: "rgba(13,17,23,.8)" }}>
          <div className="max-w-3xl mx-auto px-4 py-4">
            <MessageInput onSend={send} disabled={streaming} />
            <p className="text-center text-[11px] mt-2" style={{ color: "#4a5068" }}>
              Responses are based on internal company project data only.
            </p>
          </div>
        </div>
      </div>

      {/* Context panel */}
      <ContextPanel open={panelOpen} onToggle={() => setPanelOpen(!panelOpen)} sources={sources} />
    </div>
  )
}
