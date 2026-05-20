import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { db } from "@/lib/db"

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const chats = await db.chat.findMany({
    where: { userId: token.id as string },
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, updatedAt: true },
  })
  return NextResponse.json({ chats })
}

export async function PATCH(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id, title } = await req.json()
  if (!id || !title) return NextResponse.json({ error: "Missing id or title" }, { status: 400 })

  const chat = await db.chat.updateMany({
    where: { id, userId: token.id as string },
    data: { title },
  })

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const id = req.nextUrl.searchParams.get("id")
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })
  await db.chat.deleteMany({ where: { id, userId: token.id as string } })
  return NextResponse.json({ ok: true })
}