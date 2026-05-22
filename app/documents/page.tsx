"use client"
import { useState, useEffect, useCallback } from "react"
import { Upload, FileText, Trash2, AlertCircle, CheckCircle2, Clock, RefreshCw } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { formatBytes } from "@/lib/utils"
import { useTheme } from "@/components/layout/Sidebar"
import { CompareButton } from "@/components/CompareModal"
import { useToast } from "@/components/Toast"
import { DocumentTableSkeleton } from "@/components/Skeletons"
import { compressExcelFile } from "@/lib/compressFile"

type Doc = {
  id: string; name: string; projectName?: string; location?: string
  fileType: string; fileSize: number; status: string; chunkCount: number
  createdAt: string; errorMsg?: string; temporary: boolean
}

export default function DocumentsPage() {
  const [docs, setDocs] = useState<Doc[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [drag, setDrag] = useState(false)
  const [progress, setProgress] = useState("")
  const { T } = useTheme()
  const { toast } = useToast()

  async function load() {
    const r = await fetch("/api/documents")
    const d = await r.json()
    setDocs((d.documents ?? []).filter((doc: Doc) => !doc.temporary))
    setLoading(false)
  }

  useEffect(() => {
    load()
    const t = setInterval(load, 5000)
    return () => clearInterval(t)
  }, [])

  async function upload(files: FileList | File[]) {
    const arr = Array.from(files).filter(f =>
      f.name.toLowerCase().match(/\.(xlsm|xlsx|xls|csv)$/)
    )
    if (arr.length === 0) {
      toast("Only Excel files (.xlsx, .xlsm, .xls, .csv) are supported", "error")
      return
    }

    setUploading(true)

    for (const f of arr) {
      setProgress(`Processing ${f.name}…`)

      // Compress if needed
      const { file: processedFile, wasCompressed } = await compressExcelFile(f)
      if (wasCompressed) {
        setProgress(`Compressed ${f.name} — uploading…`)
        toast(`${f.name} compressed and ready to upload`, "info")
      } else {
        setProgress(`Uploading ${f.name}…`)
      }

      const fd = new FormData()
      fd.append("file", processedFile)
      fd.append("temporary", "false")

      try {
        const r = await fetch("/api/upload", { method: "POST", body: fd })
        if (r.ok) {
          toast(`${f.name} uploaded successfully`, "success")
        } else {
          const e = await r.json()
          toast(`${f.name}: ${e.error}`, "error")
        }
      } catch {
        toast(`${f.name}: Upload failed`, "error")
      }
    }

    setProgress("")
    setUploading(false)
    load()
  }

  async function del(id: string) {
    if (!confirm("Delete this document? The AI will no longer have access to it.")) return
    await fetch(`/api/documents?id=${id}`, { method: "DELETE" })
    setDocs(p => p.filter(d => d.id !== id))
    toast("Document deleted", "warning")
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

  return (
    <div className="h-full overflow-y-auto" style={{ background: T.bg }}>
      <div className="max-w-5xl mx-auto px-6 py-8">

        <div className="flex items-start justify-between mb-7">
          <div>
            <h1 className="text-xl font-semibold" style={{ color: T.text }}>Project Documents</h1>
            <p className="text-sm mt-1" style={{ color: T.muted }}>
              Upload Excel files (.xlsx, .xlsm, .xls, .csv). Large files are automatically compressed before uploading.
            </p>
          </div>
          {docs.length >= 2 && <CompareButton />}
        </div>

        {/* Upload zone */}
        <div
          onDrop={onDrop}
          onDragOver={e => { e.preventDefault(); setDrag(true) }}
          onDragLeave={() => setDrag(false)}
          className="rounded-xl p-10 text-center mb-7 transition-all"
          style={{
            border: `2px dashed ${drag ? T.accent : T.border}`,
            background: drag ? `${T.accent}08` : "transparent",
          }}
        >
          <Upload size={28} color={drag ? T.accent : T.faint} className="mx-auto mb-2" />
          <p className="text-sm font-medium mb-1" style={{ color: T.muted }}>
            {uploading ? progress : "Drop Excel files here or click to browse"}
          </p>
          <p className="text-xs mb-4" style={{ color: T.faint }}>
            .xlsx · .xlsm · .xls · .csv — large files auto-compressed, saved permanently
          </p>
          <input id="fi" type="file" multiple accept=".xlsx,.xlsm,.xls,.csv" className="hidden"
            onChange={e => e.target.files && upload(e.target.files)} />
          <label htmlFor="fi"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer"
            style={{
              background: uploading ? T.faint : T.accent,
              color: T.accentText,
              pointerEvents: uploading ? "none" : "auto",
            }}
            onMouseEnter={e => { if (!uploading) (e.currentTarget as HTMLElement).style.background = T.accentDark }}
            onMouseLeave={e => { if (!uploading) (e.currentTarget as HTMLElement).style.background = T.accent }}>
            <Upload size={14} /> Choose Files
          </label>
        </div>

        {/* Table */}
        {loading ? (
          <DocumentTableSkeleton />
        ) : docs.length === 0 ? (
          <div className="text-center py-16">
            <FileText size={36} color={T.faint} className="mx-auto mb-3" />
            <p className="font-medium" style={{ color: T.muted }}>No documents uploaded yet</p>
            <p className="text-sm mt-1" style={{ color: T.faint }}>Upload an Excel file above to get started.</p>
          </div>
        ) : (
          <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${T.border}`, background: T.surface }}>
            <div className="grid grid-cols-12 gap-2 px-4 py-3 text-[11px] font-semibold uppercase tracking-wide"
              style={{ borderBottom: `1px solid ${T.border}`, color: T.faint }}>
              <div className="col-span-4">File</div>
              <div className="col-span-3">Project name</div>
              <div className="col-span-2">Location</div>
              <div className="col-span-1">Uploaded</div>
              <div className="col-span-1">Status</div>
              <div className="col-span-1"></div>
            </div>

            {docs.map((d, i) => (
              <div key={d.id} className="grid grid-cols-12 gap-2 px-4 py-3 items-center"
                style={{
                  borderBottom: i < docs.length - 1 ? `1px solid ${T.border}` : "none",
                  background: i % 2 === 1 ? `${T.surfHover}40` : "transparent",
                }}>
                <div className="col-span-4 flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: `${T.accent}15`, border: `1px solid ${T.accent}25` }}>
                    <FileText size={13} color={T.accent} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate" style={{ color: T.text }}>{d.name}</p>
                    <p className="text-[10px]" style={{ color: T.faint }}>
                      {formatBytes(d.fileSize)}{d.chunkCount > 0 ? ` · ${d.chunkCount} chunk` : ""}
                    </p>
                  </div>
                </div>

                <div className="col-span-3">
                  <input defaultValue={d.projectName ?? ""} placeholder="Add name…"
                    onBlur={e => patch(d.id, "projectName", e.target.value)}
                    className="w-full text-xs bg-transparent focus:outline-none pb-0.5"
                    style={{ color: T.text, borderBottom: "1px solid transparent" }}
                    onFocus={e => (e.target.style.borderBottomColor = `${T.accent}60`)}
                    onBlurCapture={e => (e.target.style.borderBottomColor = "transparent")} />
                </div>

                <div className="col-span-2">
                  <input defaultValue={d.location ?? ""} placeholder="City, State…"
                    onBlur={e => patch(d.id, "location", e.target.value)}
                    className="w-full text-xs bg-transparent focus:outline-none pb-0.5"
                    style={{ color: T.text, borderBottom: "1px solid transparent" }}
                    onFocus={e => (e.target.style.borderBottomColor = `${T.accent}60`)}
                    onBlurCapture={e => (e.target.style.borderBottomColor = "transparent")} />
                </div>

                <div className="col-span-1 text-[10px] whitespace-nowrap" style={{ color: T.faint }}>
                  {formatDistanceToNow(new Date(d.createdAt), { addSuffix: true })}
                </div>

                <div className="col-span-1">
                  <StatusBadge status={d.status} title={d.errorMsg} />
                </div>

                <div className="col-span-1 flex justify-end">
                  <button onClick={() => del(d.id)} className="p-1.5 rounded-md"
                    style={{ color: T.faint, background: "transparent", border: "none", cursor: "pointer" }}
                    onMouseEnter={e => { e.currentTarget.style.color = "#ef4444"; e.currentTarget.style.background = "rgba(239,68,68,0.1)" }}
                    onMouseLeave={e => { e.currentTarget.style.color = T.faint; e.currentTarget.style.background = "transparent" }}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {docs.some(d => d.status === "processing") && (
          <button onClick={load} className="flex items-center gap-2 mx-auto mt-4 text-xs"
            style={{ color: T.faint, background: "none", border: "none", cursor: "pointer" }}
            onMouseEnter={e => (e.currentTarget.style.color = T.muted)}
            onMouseLeave={e => (e.currentTarget.style.color = T.faint)}>
            <RefreshCw size={11} /> Processing — click to refresh
          </button>
        )}
      </div>
    </div>
  )
}

function StatusBadge({ status, title }: { status: string; title?: string | null }) {
  const cfg = {
    ready: { icon: CheckCircle2, color: "#22c55e", bg: "rgba(34,197,94,.1)", border: "rgba(34,197,94,.2)", label: "Ready" },
    processing: { icon: Clock, color: "#f59e0b", bg: "rgba(245,158,11,.1)", border: "rgba(245,158,11,.2)", label: "Processing" },
    failed: { icon: AlertCircle, color: "#ef4444", bg: "rgba(239,68,68,.1)", border: "rgba(239,68,68,.2)", label: "Failed" },
  }[status] ?? { icon: Clock, color: "#8b8fa8", bg: "transparent", border: "rgba(255,255,255,.1)", label: status }
  const Icon = cfg.icon
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap"
      title={title ?? undefined}
      style={{ color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}` }}>
      <Icon size={10} /> {cfg.label}
    </span>
  )
}