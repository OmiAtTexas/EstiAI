import { getServerSession } from "next-auth"
import { NextRequest, NextResponse } from "next/server"
import { writeFile, mkdir } from "fs/promises"
import path from "path"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { ingestDocument } from "@/lib/ingest"

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const form = await req.formData()
  const file = form.get("file") as File
  const projectName = (form.get("projectName") as string) || undefined
  const location = (form.get("location") as string) || undefined

  if (!file) {
    return NextResponse.json({ error: "No file" }, { status: 400 })
  }

  const name = file.name.toLowerCase()
  const fileType = name.endsWith(".pdf") ? "pdf"
    : name.match(/\.(xlsx?|csv)$/) ? "excel"
      : name.match(/\.docx?$/) ? "word"
        : null

  if (!fileType) {
    return NextResponse.json({ error: "Unsupported type. Use PDF, Excel, or Word." }, { status: 400 })
  }

  // Save file to local public/uploads folder (no Vercel Blob needed)
  const uploadDir = path.join(process.cwd(), "public", "uploads")
  await mkdir(uploadDir, { recursive: true })
  const fileName = `${Date.now()}_${file.name}`
  const filePath = path.join(uploadDir, fileName)
  const bytes = await file.arrayBuffer()
  await writeFile(filePath, Buffer.from(bytes))
  const blobUrl = `/uploads/${fileName}`

  const doc = await db.document.create({
    data: {
      name: file.name,
      projectName,
      location,
      blobUrl,
      fileType,
      fileSize: file.size,
      uploadedBy: session.user.id,
    },
  })

  // Run ingestion in background
  const buf = Buffer.from(bytes)
  ingestDocument({
    documentId: doc.id,
    documentName: file.name,
    projectName,
    location,
    fileBuffer: buf,
    fileType,
  }).catch(e => console.error("Ingest error:", e))

  return NextResponse.json({
    doc: { id: doc.id, name: doc.name, status: doc.status }
  })
}