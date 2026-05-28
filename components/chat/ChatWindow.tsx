"use client"
import { useState, useRef, useEffect } from "react"
import { HardHat } from "lucide-react"
import { MessageBubble, type Message } from "./MessageBubble"
import { MessageInput, type AttachedFile } from "./MessageInput"
import { TypingIndicator } from "./TypingIndicator"
import { useTheme } from "@/components/layout/Sidebar"
import { OnboardingModal } from "@/components/OnboardingModal"
import { useToast } from "@/components/Toast"

type DocInfo = { id: string; name: string; projectName?: string }

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string).split(",")[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

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

  // Save current chatId so tab reopen restores it
  useEffect(() => {
    if (chatId) localStorage.setItem("lastChatId", chatId)
  }, [chatId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [msgs, streamText])

  async function handleFiles(files: File[]) {
    if (files.length === 0) return
    setUploading(true)

    const uploadingId = Date.now().toString() + "_upload"
    setMsgs(p => [...p, { id: uploadingId, role: "assistant", content: `⏳ Uploading **${files.map(f => f.name).join(", ")}**…` }])

    const uploaded: string[] = []
    const failed: string[] = []
    const currentChatId = chatId

    for (const f of files) {
      const fd = new FormData()
      fd.append("file", f)
      fd.append("temporary", "true")
      if (currentChatId) fd.append("chatId", currentChatId)
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
    if (uploaded.length > 0) toast(`${uploaded.join(", ")} ready`, "success")
    if (failed.length > 0) toast(`Upload failed: ${failed.join(", ")}`, "error")

    const lines: string[] = []
    if (uploaded.length > 0) lines.push(`✅ **${uploaded.join(", ")}** uploaded. Ask me anything about it.`)
    if (failed.length > 0) lines.push(`❌ Failed: ${failed.join(", ")}`)

    const finalContent = lines.join("\n\n")
    const fileAttachments = uploaded.map(name => ({ type: "excel", name }))

    setMsgs(p => p.map(m => m.id === uploadingId ? { ...m, content: finalContent, fileAttachments } : m))

    // Save to DB so it persists
    if (currentChatId && uploaded.length > 0) {
      await fetch("/api/chat/upload-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId: currentChatId, content: finalContent, attachments: fileAttachments })
      })
    }
  }

  async function send(text: string, attachedImages?: AttachedFile[]) {
    if (!text.trim() && (!attachedImages || attachedImages.length === 0)) return
    if (isStreaming) return
    if (activeDocIds === null) { toast("Loading, please wait...", "info"); return }

    // Convert images to base64 FIRST — this is what we display AND send to API
    const imagePayloads = attachedImages
      ? await Promise.all(attachedImages.map(async a => ({
        base64: await fileToBase64(a.file),
        mimeType: a.file.type || "image/png",
      })))
      : []

    // Use base64 data URLs for display — these persist after tab close (no blob URLs)
    const imagePreviews = imagePayloads.map(img => `data:${img.mimeType};base64,${img.base64}`)

    const userMsgId = Date.now().toString()
    setMsgs(p => [...p, {
      id: userMsgId,
      role: "user",
      content: text || "What's in this image?",
      imagePreviews, // base64 — survives tab close
    }])
    setIsStreaming(true)
    setStreamText("")

    let full = ""
    let finalSources: string[] = []
    let newChatId = chatId

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text || "What's in this image?",
          chatId,
          activeDocIds,
          images: imagePayloads,
        }),
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
              newChatId = ev.chatId
              setChatId(ev.chatId)
              if (!initId) window.history.replaceState(null, "", `/chat/${ev.chatId}`)

              // Save pending upload messages now that chatId exists
              const pendingUploads = msgs.filter(m => m.fileAttachments && m.fileAttachments.length > 0)
              for (const m of pendingUploads) {
                await fetch("/api/chat/upload-message", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ chatId: ev.chatId, content: m.content, attachments: m.fileAttachments })
                })
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
              <img src="/esti-mate-logo.png" alt="Esti-Mate AI"
                style={{ width: 80, height: 80, objectFit: "contain", marginBottom: 16 }} />
              <h3 className="text-base font-semibold mb-2" style={{ color: T.text }}>What can I help you estimate?</h3>
              <p className="text-sm text-center max-w-md leading-relaxed" style={{ color: T.muted }}>
                Upload an Excel file using 📎 or paste a screenshot with Cmd+V. Ask anything about costs, breakdowns, or comparisons.
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

        <div className="shrink-0" style={{ borderTop: `1px solid ${T.border}`, background: T.sidebar }}>
          <div className="max-w-3xl mx-auto px-4 py-4">
            <MessageInput onSend={send} onFilesSelected={handleFiles} disabled={isStreaming || uploading} />
            <p className="text-center text-[11px] mt-2" style={{ color: T.faint }}>
              Paste images with Cmd+V · Attach Excel with 📎 · Esti-Mate AI can make mistakes.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}