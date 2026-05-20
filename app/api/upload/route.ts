import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { db } from "@/lib/db"
import * as XLSX from "xlsx"
import { writeFile, mkdir } from "fs/promises"
import path from "path"

export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const form = await req.formData()
  const file = form.get("file") as File
  const projectName = (form.get("projectName") as string) || undefined
  const location = (form.get("location") as string) || undefined
  const temporary = form.get("temporary") === "true"
  const chatId = (form.get("chatId") as string) || undefined

  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 })

  // Only Excel allowed
  const name = file.name.toLowerCase()
  if (!name.match(/\.(xlsx?|xls|csv)$/)) {
    return NextResponse.json({
      error: "Only Excel files (.xlsx, .xls, .csv) are supported."
    }, { status: 400 })
  }

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  // Save to local public/uploads folder
  const uploadDir = path.join(process.cwd(), "public", "uploads")
  await mkdir(uploadDir, { recursive: true })
  const fileName = `${Date.now()}_${file.name.replace(/\s+/g, "_")}`
  const filePath = path.join(uploadDir, fileName)
  await writeFile(filePath, buffer)

  // Parse Excel content
  let extractedText = ""
  try {
    const workbook = XLSX.read(buffer, { type: "buffer" })
    const sheets: string[] = []
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName]
      const csv = XLSX.utils.sheet_to_csv(sheet)
      if (csv.trim()) {
        sheets.push(`=== Sheet: ${sheetName} ===\n${csv}`)
      }
    }
    extractedText = sheets.join("\n\n")
  } catch (e) {
    console.error("Excel parse error:", e)
    return NextResponse.json({ error: "Could not parse Excel file." }, { status: 400 })
  }

  if (!extractedText.trim()) {
    return NextResponse.json({ error: "Excel file appears to be empty." }, { status: 400 })
  }

  // Save document record
  const doc = await db.document.create({
    data: {
      name: file.name,
      projectName: projectName || file.name.replace(/\.[^.]+$/, ""),
      location,
      blobUrl: `/uploads/${fileName}`,
      fileType: "excel",
      fileSize: file.size,
      status: "ready",
      chunkCount: 1,
      uploadedBy: token.id as string,
      temporary,
      chatId: temporary ? (chatId ?? null) : null,
    },
  })

  // Save extracted content for RAG
  await db.documentContent.create({
    data: { documentId: doc.id, content: extractedText },
  })

  return NextResponse.json({
    doc: { id: doc.id, name: doc.name, status: "ready", temporary }
  })
}