"use client"
import { OnboardingModal } from "@/components/OnboardingModal"
import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { HardHat, Database, MessageSquare, X } from "lucide-react"
import { MessageBubble, type Message } from "./MessageBubble"
import { MessageInput } from "./MessageInput"
import { TypingIndicator } from "./TypingIndicator"
import { useTheme } from "@/components/layout/Sidebar"

function StorageModal({ files, T, onConfirm, onCancel }: {
  files: File[]
  T: any
  onConfirm: (temporary: boolean) => void
  onCancel: () => void
}) {
  const [selected, setSelected] = useState<"permanent" | "temporary" | null>(null)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 transition-colors duration-300 ease-in-out"
      style={{ background: "rgba(0,0,0,0.65)" }}>
      <div className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl transition-colors duration-300 ease-in-out"
        style={{ background: T.surface, border: `1px solid ${T.borderHover}` }}>

        <div className="flex items-center justify-between px-6 py-4 transition-colors duration-300 ease-in-out"
          style={{ borderBottom: `1px solid ${T.border}` }}>
          <div>
            <h2 className="text-base font-semibold transition-colors duration-300 ease-in-out" style={{ color: T.text }}>
              How do you want to store this?
            </h2>
            <p className="text-xs mt-0.5 transition-colors duration-300 ease-in-out" style={{ color: T.faint }}>
              {files.length === 1 ? files[0].name : `${files.length} files selected`}
            </p>
          </div>
          <button onClick={onCancel} className="p-1.5 rounded-lg transition-colors duration-300 ease-in-out"
            style={{ color: T.faint }}
            onMouseEnter={e => (e.currentTarget.style.background = T.surfHover)}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
            <X size={16} />
          </button>
        </div>

        <div className="p-6 space-y-3">
          <button
            onClick={() => setSelected("permanent")}
            className="w-full flex items-start gap-4 p-4 rounded-xl text-left transition-all duration-300 ease-in-out"
            style={{
              background: selected === "permanent" ? `${T.accent}12` : T.surfHover,
              border: `2px solid ${selected === "permanent" ? T.accent : T.border}`,
            }}
          >
            <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 transition-colors duration-300 ease-in-out"
              style={{ background: `${T.accent}20` }}>
              <Database size={16} color={T.accent} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold transition-colors duration-300 ease-in-out" style={{ color: T.text }}>Save permanently</p>
              <p className="text-xs mt-0.5 leading-relaxed transition-colors duration-300 ease-in-out" style={{ color: T.muted }}>
                Saved to your Documents library. Available in all future chats. Delete anytime.
              </p>
            </div>
            <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 mt-1 transition-colors duration-300 ease-in-out"
              style={{
                borderColor: selected === "permanent" ? T.accent : T.faint,
                background: selected === "permanent" ? T.accent : "transparent",
              }}>
              {selected === "permanent" && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
            </div>
          </button>

          <button
            onClick={() => setSelected("temporary")}
            className="w-full flex items-start gap-4 p-4 rounded-xl text-left transition-all duration-300 ease-in-out"
            style={{
              background: selected === "temporary" ? `${T.accent}12` : T.surfHover,
              border: `2px solid ${selected === "temporary" ? T.accent : T.border}`,
            }}
          >
            <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
              style={{ background: "rgba(99,102,241,0.15)" }}>
              <MessageSquare size={16} color="#818cf8" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold transition-colors duration-300 ease-in-out" style={{ color: T.text }}>This chat only</p>
              <p className="text-xs mt-0.5 leading-relaxed transition-colors duration-300 ease-in-out" style={{ color: T.muted }}>
                Only used in this chat. Not saved to Documents. Removed when this chat is deleted.
              </p>
            </div>
            <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 mt-1 transition-colors duration-300 ease-in-out"
              style={{
                borderColor: selected === "temporary" ? T.accent : T.faint,
                background: selected === "temporary" ? T.accent : "transparent",
              }}>
              {selected === "temporary" && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
            </div>
          </button>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 transition-colors duration-300 ease-in-out"
          style={{ borderTop: `1px solid ${T.border}` }}>
          <button onClick={onCancel}
            className="px-4 py-2 rounded-lg text-sm transition-colors duration-300 ease-in-out"
            style={{ color: T.muted, background: T.surfHover }}
            onMouseEnter={e => (e.currentTarget.style.background = T.surfActive)}
            onMouseLeave={e => (e.currentTarget.style.background = T.surfHover)}>
            Cancel
          </button>
          <button
            onClick={() => selected && onConfirm(selected === "temporary")}
            disabled={!selected}
            className="px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ease-in-out"
            style={{
              background: selected ? T.accent : T.faint,
              color: selected ? T.accentText : T.bg,
              cursor: selected ? "pointer" : "not-allowed",
            }}
            onMouseEnter={e => { if (selected) (e.currentTarget as HTMLElement).style.background = T.accentDark }}
            onMouseLeave={e => { if (selected) (e.currentTarget as HTMLElement).style.background = T.accent }}
          >
            Upload
          </button>
        </div>
      </div>
    </div>
  )
}

export function ChatWindow({ chatId: initId, messages: initMsgs }: {
  chatId: string | null
  messages: Message[]
}) {
  const [msgs, setMsgs] = useState<Message[]>(initMsgs)
  const [chatId, setChatId] = useState<string | null>(initId)
  const [streaming, setStreaming] = useState(false)
  const [streamText, setStreamText] = useState("")
  const [pendingFiles, setPendingFiles] = useState<File[] | null>(null)
  const [uploading, setUploading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const { T } = useTheme()

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [msgs, streamText])

  async function handleUpload(temporary: boolean) {
    if (!pendingFiles) return
    const files = pendingFiles
    setPendingFiles(null)
    setUploading(true)

    const uploadingId = Date.now().toString() + "_upload"
    setMsgs(p => [...p, {
      id: uploadingId,
      role: "assistant",
      content: `⏳ Uploading **${files.map(f => f.name).join(", ")}**…`,
    }])

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

    const lines: string[] = []
    if (uploaded.length > 0) {
      lines.push(`✅ **${uploaded.join(", ")}** uploaded successfully.`)
      lines.push(temporary
        ? "This file is only available in this chat. Ask me anything about it."
        : "This file is saved to your Documents library and available in all chats. Ask me anything about it."
      )
    }
    if (failed.length > 0) lines.push(`❌ Failed: ${failed.join(", ")}`)

    setMsgs(p => p.map(m =>
      m.id === uploadingId ? { ...m, content: lines.join("\n\n") } : m
    ))
  }

  async function send(text: string) {
    if (!text.trim() || streaming) return
    setMsgs(p => [...p, { id: Date.now().toString(), role: "user", content: text }])
    setStreaming(true)
    setStreamText("")

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
      let finalSources: string[] = []

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        for (const line of dec.decode(value).split("\n")) {
          if (!line.startsWith("data: ")) continue
          try {
            const ev = JSON.parse(line.slice(6))
            if (ev.type === "init") {
              setChatId(ev.chatId)

              // FIX IS HERE: We use replaceState instead of router.replace
              // This changes the URL to the new chat ID without forcing the component to unmount!
              if (!initId) {
                window.history.replaceState(null, "", `/chat/${ev.chatId}`)
              }

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
        content: full,
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
      setStreaming(false)
    }
  }

  const empty = msgs.length === 0 && !streaming

  return (
    <div className="flex h-full overflow-hidden transition-colors duration-300 ease-in-out" style={{ background: T.bg }}>

      {pendingFiles && (
        <StorageModal
          files={pendingFiles}
          T={T}
          onConfirm={handleUpload}
          onCancel={() => setPendingFiles(null)}
        />
      )}

      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <div className="flex-1 overflow-y-auto transition-colors duration-300 ease-in-out" style={{ background: T.bg }}>
          {empty ? (
            <div className="flex flex-col items-center justify-center h-full px-6 py-12">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 transition-colors duration-300 ease-in-out"
                style={{ background: `${T.accent}15`, border: `1px solid ${T.accent}30` }}>
                <HardHat size={20} color={T.accent} />
              </div>
              <h3 className="text-base font-semibold mb-2 transition-colors duration-300 ease-in-out" style={{ color: T.text }}>
                What can I help you estimate?
              </h3>
              <p className="text-sm text-center max-w-md leading-relaxed transition-colors duration-300 ease-in-out" style={{ color: T.muted }}>
                Ask anything about construction costs, labor rates, materials, permits, or taxes.
                Use the 📎 button below to upload an Excel file and ask questions about it.
              </p>
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

        <div className="shrink-0 transition-colors duration-300 ease-in-out" style={{ borderTop: `1px solid ${T.border}`, background: T.sidebar }}>
          <div className="max-w-3xl mx-auto px-4 py-4">
            <MessageInput
              onSend={send}
              onFilesSelected={setPendingFiles}
              disabled={streaming || uploading}
            />
            <p className="text-center text-[11px] mt-2 transition-colors duration-300 ease-in-out" style={{ color: T.faint }}>
              Responses are based on uploaded data only. Esti-Mate AI can make mistakes. Check important info.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}