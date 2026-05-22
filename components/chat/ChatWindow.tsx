"use client"
import { useState, useRef, useEffect } from "react"
import { HardHat } from "lucide-react"
import { MessageBubble, type Message } from "./MessageBubble"
import { MessageInput } from "./MessageInput"
import { TypingIndicator } from "./TypingIndicator"
import { useTheme } from "@/components/layout/Sidebar"
import { OnboardingModal } from "@/components/OnboardingModal"
import { useToast } from "@/components/Toast"

type DocInfo = { id: string; name: string; projectName?: string }

export function ChatWindow({ chatId: initId, messages: initMsgs }: {
  chatId: string | null; messages: Message[]
}) {
  const [msgs, setMsgs] = useState<Message[]>(initMsgs)
  const [chatId, setChatId] = useState<string | null>(initId)
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamText, setStreamText] = useState("")
  const [uploading, setUploading] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [allDocs, setAllDocs] = useState<DocInfo[]>([])
  const [activeDocIds, setActiveDocIds] = useState<string[] | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const { T } = useTheme()
  const { toast } = useToast()

  // Load permanent docs on mount for badge toggling
  useEffect(() => {
    fetch("/api/documents")
      .then(r => r.json())
      .then(d => {
        const docs: DocInfo[] = (d.documents ?? [])
          .filter((doc: any) => !doc.temporary)
          .map((doc: any) => ({ id: doc.id, name: doc.name, projectName: doc.projectName }))
        setAllDocs(docs)
        setActiveDocIds(docs.map(d => d.id))
      })
      .catch(() => setActiveDocIds([]))
  }, [])

  useEffect(() => {
    if (typeof window !== "undefined" && !localStorage.getItem("onboarded")) {
      setTimeout(() => setShowOnboarding(true), 800)
    }
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [msgs, streamText])

  // All uploads are chat-only — no modal, no permanent storage
  async function handleFiles(files: File[]) {
    if (files.length === 0) return
    setUploading(true)

    const uploadingId = Date.now().toString() + "_upload"
    setMsgs(p => [...p, { id: uploadingId, role: "assistant", content: `⏳ Uploading **${files.map(f => f.name).join(", ")}**…` }])

    const uploaded: string[] = []
    const failed: string[] = []

    for (const f of files) {
      const fd = new FormData()
      fd.append("file", f)
      fd.append("temporary", "true") // always temporary — chat only
      if (chatId) fd.append("chatId", chatId)
      try {
        const r = await fetch("/api/upload", { method: "POST", body: fd })
        let data: any = {}
        try { data = await r.json() } catch { }
        if (r.ok) uploaded.push(f.name)
        else failed.push(`${f.name}: ${data.error ?? `Server error ${r.status}`}`)
      } catch (err: any) {
        failed.push(`${f.name}: ${err?.message ?? "Network error"}`)
      }
    }

    setUploading(false)
    if (uploaded.length > 0) toast(`${uploaded.join(", ")} ready — ask me anything about it`, "success")
    if (failed.length > 0) toast(`Upload failed: ${failed.join(", ")}`, "error")

    const lines: string[] = []
    if (uploaded.length > 0) {
      lines.push(`✅ **${uploaded.join(", ")}** uploaded successfully.`)
      lines.push("Ask me anything about it.")
    }
    if (failed.length > 0) lines.push(`❌ Failed: ${failed.join(", ")}`)
    setMsgs(p => p.map(m => m.id === uploadingId ? { ...m, content: lines.join("\n\n") } : m))
  }

  function toggleDocByName(docName: string) {
    if (!activeDocIds) return
    const doc = allDocs.find(d => d.name === docName || d.projectName === docName)
    if (!doc) return
    const isActive = activeDocIds.includes(doc.id)
    if (isActive) {
      if (activeDocIds.length === 1) { toast("At least one document must be selected", "warning"); return }
      const newIds = activeDocIds.filter(id => id !== doc.id)
      setActiveDocIds(newIds)
      const remaining = allDocs.filter(d => newIds.includes(d.id)).map(d => d.projectName || d.name)
      toast(`Now referring to: ${remaining.join(", ")}`, "info")
    } else {
      const newIds = [...activeDocIds, doc.id]
      setActiveDocIds(newIds)
      toast(`Now referring to: ${allDocs.filter(d => newIds.includes(d.id)).map(d => d.projectName || d.name).join(", ")}`, "success")
    }
  }

  async function send(text: string) {
    if (!text.trim() || isStreaming) return
    if (activeDocIds === null) { toast("Loading, please wait...", "info"); return }

    setMsgs(p => [...p, { id: Date.now().toString(), role: "user", content: text }])
    setIsStreaming(true)
    setStreamText("")

    let full = ""
    let finalSources: string[] = []

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, chatId, activeDocIds }),
      })
      if (!res.ok) throw new Error(`Server error ${res.status}`)

      const reader = res.body!.getReader()
      const dec = new TextDecoder()
      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += dec.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() ?? ""
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue
          const data = line.slice(6).trim()
          if (!data) continue
          try {
            const ev = JSON.parse(data)
            if (ev.type === "init") {
              setChatId(ev.chatId)
              if (!initId) window.history.replaceState(null, "", `/chat/${ev.chatId}`)
            } else if (ev.type === "token") {
              full += ev.text
              setStreamText(full)
            } else if (ev.type === "done") {
              finalSources = ev.sources ?? []
            }
          } catch { }
        }
      }

      setMsgs(p => [...p, {
        id: Date.now() + "_ai",
        role: "assistant",
        content: full || "Sorry, I didn't receive a response. Please try again.",
        sources: finalSources,
      }])
      setStreamText("")
    } catch (err: any) {
      setMsgs(p => [...p, {
        id: Date.now() + "_err",
        role: "assistant",
        content: `Sorry, something went wrong: ${err?.message ?? "Unknown error"}`,
      }])
      setStreamText("")
    } finally {
      setIsStreaming(false)
    }
  }

  const empty = msgs.length === 0 && !isStreaming && !streamText

  return (
    <div className="flex h-full overflow-hidden" style={{ background: T.bg }}>
      {showOnboarding && (
        <OnboardingModal onClose={() => { setShowOnboarding(false); localStorage.setItem("onboarded", "true") }} />
      )}

      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <div className="flex-1 overflow-y-auto" style={{ background: T.bg }}>
          {empty ? (
            <div className="flex flex-col items-center justify-center h-full px-6 py-12">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
                style={{ background: `${T.accent}15`, border: `1px solid ${T.accent}30` }}>
                <HardHat size={20} color={T.accent} />
              </div>
              <h3 className="text-base font-semibold mb-2" style={{ color: T.text }}>What can I help you estimate?</h3>
              <p className="text-sm text-center max-w-md leading-relaxed" style={{ color: T.muted }}>
                Upload an Excel file using the 📎 button below and ask anything about it — costs, breakdowns, comparisons, line items.
              </p>
              <button onClick={() => setShowOnboarding(true)}
                className="mt-6 text-xs px-3 py-1.5 rounded-lg"
                style={{ color: T.accent, background: `${T.accent}10`, border: `1px solid ${T.accent}20`, cursor: "pointer" }}>
                View getting started guide
              </button>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto px-4 py-6" style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {msgs.map(m => (
                <MessageBubble
                  key={m.id}
                  msg={m}
                  activeDocIds={activeDocIds ?? []}
                  allDocs={allDocs}
                  onToggleDoc={toggleDocByName}
                />
              ))}
              {isStreaming && streamText && (
                <MessageBubble msg={{ id: "streaming", role: "assistant", content: streamText }} streaming />
              )}
              {isStreaming && !streamText && <TypingIndicator />}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        <div className="shrink-0" style={{ borderTop: `1px solid ${T.border}`, background: T.sidebar }}>
          <div className="max-w-3xl mx-auto px-4 py-4">
            <MessageInput onSend={send} onFilesSelected={handleFiles} disabled={isStreaming || uploading} />
            <p className="text-center text-[11px] mt-2" style={{ color: T.faint }}>
              Responses are based on uploaded data only. Esti-Mate AI can make mistakes. Check important info.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}