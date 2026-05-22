"use client"
import { useState, useRef, useEffect } from "react"
import { HardHat, Database, MessageSquare, X } from "lucide-react"
import { MessageBubble, type Message } from "./MessageBubble"
import { MessageInput } from "./MessageInput"
import { TypingIndicator } from "./TypingIndicator"
import { useTheme } from "@/components/layout/Sidebar"
import { OnboardingModal } from "@/components/OnboardingModal"
import { useToast } from "@/components/Toast"
import { DocSelector } from "@/components/DocSelector"

function StorageModal({ files, T, onConfirm, onCancel }: {
  files: File[]; T: any
  onConfirm: (temporary: boolean) => void; onCancel: () => void
}) {
  const [selected, setSelected] = useState<"permanent" | "temporary" | null>(null)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)" }}>
      <div className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: T.surface, border: `1px solid ${T.borderHover}` }}>
        <div className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: `1px solid ${T.border}` }}>
          <div>
            <h2 className="text-base font-semibold" style={{ color: T.text }}>How do you want to store this?</h2>
            <p className="text-xs mt-0.5" style={{ color: T.faint }}>
              {files.length === 1 ? files[0].name : `${files.length} files selected`}
            </p>
          </div>
          <button onClick={onCancel} style={{ color: T.faint, background: "none", border: "none", cursor: "pointer", padding: 4 }}>
            <X size={16} />
          </button>
        </div>
        <div className="p-6 space-y-3">
          {[
            { key: "permanent" as const, icon: Database, iconColor: T.accent, iconBg: `${T.accent}20`, title: "Save permanently", desc: "Saved to your Documents library. Available in all future chats. Delete anytime." },
            { key: "temporary" as const, icon: MessageSquare, iconColor: "#818cf8", iconBg: "rgba(99,102,241,0.15)", title: "This chat only", desc: "Only used in this chat. Not saved to Documents. Removed when this chat is deleted." },
          ].map(({ key, icon: Icon, iconColor, iconBg, title, desc }) => (
            <button key={key} onClick={() => setSelected(key)}
              className="w-full flex items-start gap-4 p-4 rounded-xl text-left"
              style={{ background: selected === key ? `${T.accent}12` : T.surfHover, border: `2px solid ${selected === key ? T.accent : T.border}`, cursor: "pointer" }}>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ background: iconBg }}>
                <Icon size={16} color={iconColor} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold" style={{ color: T.text }}>{title}</p>
                <p className="text-xs mt-0.5 leading-relaxed" style={{ color: T.muted }}>{desc}</p>
              </div>
              <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 mt-1"
                style={{ borderColor: selected === key ? T.accent : T.faint, background: selected === key ? T.accent : "transparent" }}>
                {selected === key && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
              </div>
            </button>
          ))}
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4"
          style={{ borderTop: `1px solid ${T.border}` }}>
          <button onClick={onCancel} className="px-4 py-2 rounded-lg text-sm"
            style={{ color: T.muted, background: T.surfHover, border: "none", cursor: "pointer" }}
            onMouseEnter={e => (e.currentTarget.style.background = T.surfActive)}
            onMouseLeave={e => (e.currentTarget.style.background = T.surfHover)}>Cancel</button>
          <button onClick={() => selected && onConfirm(selected === "temporary")} disabled={!selected}
            className="px-4 py-2 rounded-lg text-sm font-semibold"
            style={{ background: selected ? T.accent : T.faint, color: selected ? T.accentText : T.bg, border: "none", cursor: selected ? "pointer" : "not-allowed" }}
            onMouseEnter={e => { if (selected) (e.currentTarget as HTMLElement).style.background = T.accentDark }}
            onMouseLeave={e => { if (selected) (e.currentTarget as HTMLElement).style.background = T.accent }}>Upload</button>
        </div>
      </div>
    </div>
  )
}

export function ChatWindow({ chatId: initId, messages: initMsgs }: {
  chatId: string | null; messages: Message[]
}) {
  const [msgs, setMsgs] = useState<Message[]>(initMsgs)
  const [chatId, setChatId] = useState<string | null>(initId)
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamText, setStreamText] = useState("")
  const [pendingFiles, setPendingFiles] = useState<File[] | null>(null)
  const [uploading, setUploading] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [activeDocIds, setActiveDocIds] = useState<string[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)
  const { T } = useTheme()
  const { toast } = useToast()

  // Pre-load all permanent doc IDs immediately on mount
  // This ensures activeDocIds is populated before the user sends their first message
  useEffect(() => {
    fetch("/api/documents")
      .then(r => r.json())
      .then(d => {
        const ids = (d.documents ?? [])
          .filter((doc: any) => !doc.temporary)
          .map((doc: any) => doc.id)
        setActiveDocIds(ids)
      })
      .catch(() => { }) // silently fail — no docs is fine
  }, [])

  useEffect(() => {
    if (typeof window !== "undefined" && !localStorage.getItem("onboarded")) {
      setTimeout(() => setShowOnboarding(true), 800)
    }
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [msgs, streamText])

  async function handleUpload(temporary: boolean) {
    if (!pendingFiles) return
    const files = pendingFiles
    setPendingFiles(null)
    setUploading(true)

    const uploadingId = Date.now().toString() + "_upload"
    setMsgs(p => [...p, { id: uploadingId, role: "assistant", content: `⏳ Uploading **${files.map(f => f.name).join(", ")}**…` }])

    const uploaded: string[] = []
    const failed: string[] = []

    for (const f of files) {
      const fd = new FormData()
      fd.append("file", f)
      fd.append("temporary", String(temporary))
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
    if (uploaded.length > 0) toast(`${uploaded.join(", ")} uploaded`, "success")
    if (failed.length > 0) toast(`Upload failed: ${failed.join(", ")}`, "error")

    const lines: string[] = []
    if (uploaded.length > 0) {
      lines.push(`✅ **${uploaded.join(", ")}** uploaded successfully.`)
      lines.push(temporary
        ? "This file is only available in this chat. Ask me anything about it."
        : "This file is saved to your Documents library. Ask me anything about it.")
    }
    if (failed.length > 0) lines.push(`❌ Failed: ${failed.join(", ")}`)
    setMsgs(p => p.map(m => m.id === uploadingId ? { ...m, content: lines.join("\n\n") } : m))
  }

  async function send(text: string) {
    if (!text.trim() || isStreaming) return

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
        <OnboardingModal onClose={() => {
          setShowOnboarding(false)
          localStorage.setItem("onboarded", "true")
        }} />
      )}
      {pendingFiles && (
        <StorageModal files={pendingFiles} T={T} onConfirm={handleUpload} onCancel={() => setPendingFiles(null)} />
      )}

      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <div className="flex-1 overflow-y-auto" style={{ background: T.bg }}>
          {empty ? (
            <div className="flex flex-col items-center justify-center h-full px-6 py-12">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
                style={{ background: `${T.accent}15`, border: `1px solid ${T.accent}30` }}>
                <HardHat size={20} color={T.accent} />
              </div>
              <h3 className="text-base font-semibold mb-2" style={{ color: T.text }}>
                What can I help you estimate?
              </h3>
              <p className="text-sm text-center max-w-md leading-relaxed" style={{ color: T.muted }}>
                Ask anything about construction costs, labor rates, materials, permits, or taxes.
                Use the 📎 button below to upload an Excel file and ask questions about it.
              </p>
              <button onClick={() => setShowOnboarding(true)}
                className="mt-6 text-xs px-3 py-1.5 rounded-lg"
                style={{ color: T.accent, background: `${T.accent}10`, border: `1px solid ${T.accent}20`, cursor: "pointer" }}>
                View getting started guide
              </button>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto px-4 py-6" style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {msgs.map(m => <MessageBubble key={m.id} msg={m} />)}
              {isStreaming && streamText && (
                <MessageBubble msg={{ id: "streaming", role: "assistant", content: streamText }} streaming />
              )}
              {isStreaming && !streamText && <TypingIndicator />}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Input area */}
        <div className="shrink-0" style={{ borderTop: `1px solid ${T.border}`, background: T.sidebar }}>
          <div className="max-w-3xl mx-auto px-4 pt-2 pb-1">
            {/* Doc selector — only shows when 2+ permanent docs exist */}
            <DocSelector
              activeDocIds={activeDocIds}
              onSelectionChange={setActiveDocIds}
            />
          </div>
          <div className="max-w-3xl mx-auto px-4 pb-4">
            <MessageInput
              onSend={send}
              onFilesSelected={setPendingFiles}
              disabled={isStreaming || uploading}
            />
            <p className="text-center text-[11px] mt-2" style={{ color: T.faint }}>
              Responses are based on uploaded data only. Esti-Mate AI can make mistakes. Check important info.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}