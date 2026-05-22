import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { db } from "@/lib/db"
import * as XLSX from "xlsx"

export const maxDuration = 60

export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return NextResponse.json({ error: "Could not parse form data. File may be too large." }, { status: 400 })
  }

  const file = form.get("file") as File
  const projectName = (form.get("projectName") as string) || undefined
  const location = (form.get("location") as string) || undefined
  const temporary = form.get("temporary") === "true"
  const chatId = (form.get("chatId") as string) || undefined

  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 })

  const name = file.name.toLowerCase()
  const isExcel = name.match(/\.(xlsm|xlsx|xls|csv)$/)
  if (!isExcel) {
    return NextResponse.json({ error: "Only Excel files (.xlsx, .xlsm, .xls, .csv) are supported." }, { status: 400 })
  }

  if (file.size > 4 * 1024 * 1024) {
    return NextResponse.json({ error: "File too large. Maximum 4MB." }, { status: 413 })
  }

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  let extractedText = ""
  try {
    if (name.endsWith(".csv") || file.type === "text/plain") {
      extractedText = buffer.toString("utf-8")
    } else {
      const workbook = XLSX.read(buffer, { type: "buffer", bookVBA: false, cellNF: false, cellHTML: false, cellStyles: false })
      const sheets: string[] = []
      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName]
        const csv = XLSX.utils.sheet_to_csv(sheet, { blankrows: false })
        if (csv.trim()) sheets.push("=== Sheet: " + sheetName + " ===\n" + csv)
      }
      extractedText = sheets.join("\n\n")
    }
  } catch (e: any) {
    return NextResponse.json({ error: "Could not parse file: " + (e?.message ?? "Unknown error") }, { status: 400 })
  }

  if (!extractedText.trim()) return NextResponse.json({ error: "File appears to be empty." }, { status: 400 })

  const doc = await db.document.create({
    data: {
      name: file.name,
      projectName: projectName || file.name.replace(/\.[^.]+$/, ""),
      location,
      blobUrl: "db://" + Date.now() + "_" + file.name,
      fileType: "excel",
      fileSize: file.size,
      status: "ready",
      chunkCount: 1,
      uploadedBy: token.id as string,
      temporary,
      chatId: temporary ? (chatId ?? null) : null,
    },
  })

  await db.documentContent.create({ data: { documentId: doc.id, content: extractedText } })

  return NextResponse.json({ doc: { id: doc.id, name: doc.name, status: "ready", temporary } })
}
