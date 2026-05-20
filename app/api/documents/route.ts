import { getServerSession } from "next-auth"
import { NextRequest, NextResponse } from "next/server"
import { unlink } from "fs/promises"
import path from "path"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { deleteDocumentChunks } from "@/lib/pinecone"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const documents = await db.document.findMany({ orderBy: { createdAt: "desc" } })
  return NextResponse.json({ documents })
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id, projectName, location } = await req.json()
  const doc = await db.document.update({ where: { id }, data: { projectName, location } })
  return NextResponse.json({ doc })
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const id = req.nextUrl.searchParams.get("id")
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })
  const doc = await db.document.findUnique({ where: { id } })
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 })

  // Delete local file
  try {
    const filePath = path.join(process.cwd(), "public", doc.blobUrl)
    await unlink(filePath)
  } catch { }

  await Promise.allSettled([
    deleteDocumentChunks(id),
    db.document.delete({ where: { id } }),
  ])
  return NextResponse.json({ ok: true })
}