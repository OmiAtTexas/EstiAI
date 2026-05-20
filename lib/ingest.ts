import { embedBatch } from "./embeddings"
import { upsertChunks } from "./pinecone"
import { db } from "./db"

// Split text into overlapping chunks
function chunkText(text: string, size = 900, overlap = 150): string[] {
  const chunks: string[] = []
  let start = 0
  while (start < text.length) {
    let end = Math.min(start + size, text.length)
    // Try to break at sentence boundary
    if (end < text.length) {
      const tail = text.slice(end - 200, end)
      const cut = Math.max(tail.lastIndexOf(". "), tail.lastIndexOf("\n"))
      if (cut > 0) end = end - 200 + cut + 1
    }
    const chunk = text.slice(start, end).trim()
    if (chunk.length > 60) chunks.push(chunk)
    start = end - overlap
  }
  return chunks
}

async function parsePDF(buf: Buffer): Promise<string> {
  const pdf = (await import("pdf-parse")).default
  return (await pdf(buf)).text
}

async function parseExcel(buf: Buffer): Promise<string> {
  const XLSX = await import("xlsx")
  const wb = XLSX.read(buf, { type: "buffer" })
  return wb.SheetNames.map(
    (name) => `--- Sheet: ${name} ---\n${XLSX.utils.sheet_to_csv(wb.Sheets[name])}`
  ).join("\n\n")
}

export async function ingestDocument(params: {
  documentId: string
  documentName: string
  projectName?: string
  location?: string
  fileBuffer: Buffer
  fileType: string
}) {
  const { documentId, documentName, projectName, location, fileBuffer, fileType } = params
  try {
    let raw = ""
    if (fileType === "pdf") raw = await parsePDF(fileBuffer)
    else if (fileType === "excel") raw = await parseExcel(fileBuffer)
    else raw = fileBuffer.toString("utf-8")

    if (raw.trim().length < 100) throw new Error("Could not extract text from document")

    const clean = raw.replace(/\s{3,}/g, "\n").replace(/[^\x20-\x7E\n]/g, " ").trim()
    const chunks = chunkText(clean)
    if (!chunks.length) throw new Error("No chunks generated")

    // Embed in batches of 50
    const embeddings: number[][] = []
    for (let i = 0; i < chunks.length; i += 50) {
      embeddings.push(...(await embedBatch(chunks.slice(i, i + 50))))
    }

    await upsertChunks(
      chunks.map((text, i) => ({
        id: `${documentId}_${i}`,
        embedding: embeddings[i],
        text,
        documentId,
        documentName,
        projectName,
        location,
        chunkIndex: i,
      }))
    )

    await db.document.update({
      where: { id: documentId },
      data: { status: "ready", chunkCount: chunks.length },
    })
    return { chunkCount: chunks.length }
  } catch (err) {
    await db.document.update({
      where: { id: documentId },
      data: { status: "failed", errorMsg: err instanceof Error ? err.message : "Unknown error" },
    })
    throw err
  }
}
