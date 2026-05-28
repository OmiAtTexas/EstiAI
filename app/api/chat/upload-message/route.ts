import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { db } from "@/lib/db"

export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { chatId, content, attachments } = await req.json()
  if (!chatId) return NextResponse.json({ error: "No chatId" }, { status: 400 })

  const msg = await db.message.create({
    data: {
      chatId,
      role: "assistant",
      content,
      attachments: attachments ? JSON.stringify(attachments) : null,
    }
  })

  return NextResponse.json({ id: msg.id })
}
