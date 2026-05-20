"use client"
import { useState, useEffect, useCallback } from "react"
import { Upload, FileText, Trash2, AlertCircle, CheckCircle2, Clock, RefreshCw } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { formatBytes } from "@/lib/utils"

type Doc = {
  id: string; name: string; projectName?: string; location?: string
  fileType: string; fileSize: number; status: string; chunkCount: number
  createdAt: string; errorMsg?: string
}

export default function DocumentsPage() {
  const [docs, setDocs] = useState<Doc[]>([])
  const [uploading, setUploading] = useState(false)
  const [drag, setDrag] = useState(false)
  const [progress, setProgress] = useState("")

  async function load() {
    const r = await fetch("/api/documents")
    const d = await r.json()
    setDocs(d.documents ?? [])
  }

  useEffect(() => {
    load()
    const t = setInterval(load, 5000)
    return () => clearInterval(t)
  }, [])

  async function upload(files: FileList | File[]) {
    setUploading(true)
    for (const f of Array.from(files)) {
      setProgress(`Uploading ${f.name}…`)
      const fd = new FormData()
      fd.append("file", f)
      const r = await fetch("/api/upload", { method: "POST", body: fd })
      if (!r.ok) { const e = await r.json(); alert(`${f.name}: ${e.error}`) }
    }
    setProgress(""); setUploading(false); load()
  }

  async function del(id: string) {
    if (!confirm("Delete this document? The AI will no longer have access to it.")) return
    await fetch(`/api/documents?id=${id}`, { method: "DELETE" })
    setDocs(p => p.filter(d => d.id !== id))
  }

  async function patch(id: string, field: string, value: string) {
    await fetch("/api/documents", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, [field]: value }),
    })
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDrag(false); upload(e.dataTransfer.files)
  }, [])

  const S = { border: "rgba(255,255,255,.08)", surface: "#161b27", muted: "#8b8fa8", faint: "#4a5068", accent: "#f59e0b", text: "#e8e8e8" }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto px-6 py-8">

        <div className="mb-7">
          <h1 className="text-xl font-semibold" style={{ color: S.text }}>Project Documents</h1>
          <p className="text-sm mt-1" style={{ color: S.muted }}>
            Upload past project files to make them searchable by the AI. PDF, Excel, and Word supported.
          </p>
        </div>

        {/* Upload zone */}
        <div
          onDrop={onDrop}
          onDragOver={e => { e.preventDefault(); setDrag(true) }}
          onDragLeave={() => setDrag(false)}
          className="rounded-xl p-10 text-center mb-7 transition-all"
          style={{
            border: `2px dashed ${drag ? S.accent : S.border}`,
            background: drag ? "rgba(245,158,11,.04)" : "transparent",
          }}
        >
          <Upload size={28} color={drag ? S.accent : S.faint} className="mx-auto mb-2" />
          <p className="text-sm font-medium mb-1" style={{ color: S.muted }}>
            {uploading ? progress : "Drop files here or click to browse"}
          </p>
          <p className="text-xs mb-4" style={{ color: S.faint }}>PDF · Excel · Word · CSV</p>
          <input id="fi" type="file" multiple accept=".pdf,.xlsx,.xls,.csv,.docx,.doc" className="hidden"
                 onChange={e => e.target.files && upload(e.target.files)} />
          <label htmlFor="fi"
                 className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors"
                 style={{ background: uploading ? S.faint : S.accent, color: "#0d1117", pointerEvents: uploading ? "none" : "auto" }}>
            <Upload size={14} /> Choose Files
          </label>
        </div>

        {/* Table */}
        {docs.length === 0 ? (
          <div className="text-center py-16">
            <FileText size={36} color={S.faint} className="mx-auto mb-3" />
            <p className="font-medium" style={{ color: S.muted }}>No documents uploaded yet</p>
            <p className="text-sm mt-1" style={{ color: S.faint }}>Upload your first project file above.</p>
          </div>
        ) : (
          <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${S.border}`, background: S.surface }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: `1px solid ${S.border}` }}>
                  {["File", "Project name", "Location", "Uploaded", "Status", ""].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[11px] font-medium uppercase tracking-wide"
                        style={{ color: S.faint }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {docs.map((d, i) => (
                  <tr key={d.id} style={{ borderBottom: i < docs.length - 1 ? `1px solid ${S.border}` : "none", background: i % 2 ? "rgba(255,255,255,.015)" : "transparent" }}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <FileText size={14} color={S.accent} className="shrink-0" />
                        <div>
                          <p className="font-medium text-xs truncate max-w-[190px]" style={{ color: S.text }}>{d.name}</p>
                          <p className="text-[10px]" style={{ color: S.faint }}>
                            {formatBytes(d.fileSize)}{d.chunkCount > 0 ? ` · ${d.chunkCount} chunks` : ""}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <input defaultValue={d.projectName ?? ""} placeholder="Add name…"
                             onBlur={e => patch(d.id, "projectName", e.target.value)}
                             className="bg-transparent text-xs w-full focus:outline-none pb-0.5 transition-colors"
                             style={{ color: S.text, borderBottom: `1px solid transparent` }}
                             onFocus={e => e.target.style.borderBottomColor = "rgba(245,158,11,.4)"}
                             onBlurCapture={e => e.target.style.borderBottomColor = "transparent"} />
                    </td>
                    <td className="px-4 py-3">
                      <input defaultValue={d.location ?? ""} placeholder="City, State…"
                             onBlur={e => patch(d.id, "location", e.target.value)}
                             className="bg-transparent text-xs w-full focus:outline-none pb-0.5 transition-colors"
                             style={{ color: S.text, borderBottom: "1px solid transparent" }}
                             onFocus={e => e.target.style.borderBottomColor = "rgba(245,158,11,.4)"}
                             onBlurCapture={e => e.target.style.borderBottomColor = "transparent"} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs" style={{ color: S.faint }}>
                      {formatDistanceToNow(new Date(d.createdAt), { addSuffix: true })}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={d.status} title={d.errorMsg} />
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => del(d.id)}
                              className="p-1.5 rounded-md transition-colors"
                              style={{ color: S.faint }}
                              onMouseEnter={e => e.currentTarget.style.color = "#ef4444"}
                              onMouseLeave={e => e.currentTarget.style.color = S.faint}>
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {docs.some(d => d.status === "processing") && (
          <button onClick={load} className="flex items-center gap-2 mx-auto mt-4 text-xs transition-colors"
                  style={{ color: "#4a5068" }}
                  onMouseEnter={e => e.currentTarget.style.color = "#8b8fa8"}
                  onMouseLeave={e => e.currentTarget.style.color = "#4a5068"}>
            <RefreshCw size={11} /> Processing in background — click to refresh
          </button>
        )}
      </div>
    </div>
  )
}

function StatusBadge({ status, title }: { status: string; title?: string | null }) {
  const cfg = {
    ready:      { icon: CheckCircle2, color: "#22c55e", bg: "rgba(34,197,94,.1)",  border: "rgba(34,197,94,.2)",  label: "Ready" },
    processing: { icon: Clock,        color: "#f59e0b", bg: "rgba(245,158,11,.1)", border: "rgba(245,158,11,.2)", label: "Processing" },
    failed:     { icon: AlertCircle,  color: "#ef4444", bg: "rgba(239,68,68,.1)",  border: "rgba(239,68,68,.2)",  label: "Failed" },
  }[status] ?? { icon: Clock, color: "#8b8fa8", bg: "transparent", border: "rgba(255,255,255,.1)", label: status }

  const Icon = cfg.icon
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs" title={title ?? undefined}
          style={{ color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}` }}>
      <Icon size={11} /> {cfg.label}
    </span>
  )
}
