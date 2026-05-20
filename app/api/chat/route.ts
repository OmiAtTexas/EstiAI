import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { db } from "@/lib/db"
import { ragStream } from "@/lib/rag"

export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userId = token.id as string
  const { message, chatId } = await req.json()
  if (!message?.trim()) return NextResponse.json({ error: "Empty message" }, { status: 400 })

  let chat: { id: string; messages: { role: string; content: string }[] }

  if (chatId) {
    const found = await db.chat.findFirst({
      where: { id: chatId, userId },
      include: { messages: { orderBy: { createdAt: "asc" }, take: 20 } },
    })
    if (!found) return NextResponse.json({ error: "Chat not found" }, { status: 404 })
    chat = found
  } else {
    const title = message.length > 55 ? message.slice(0, 52) + "…" : message
    chat = await db.chat.create({
      data: { userId, title },
      include: { messages: true },
    })
  }

  await db.message.create({ data: { chatId: chat.id, role: "user", content: message } })

  const history = chat.messages.map(m => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }))

  try {
    // Pass chatId to ragStream so it can include temporary docs for this chat
    const { tokens, sources } = await ragStream(message, history, chat.id)
    let full = ""

    const body = new ReadableStream({
      async start(controller) {
        const enc = new TextEncoder()
        controller.enqueue(enc.encode(`data: ${JSON.stringify({ type: "init", chatId: chat.id })}\n\n`))

        for await (const tok of tokens) {
          full += tok
          controller.enqueue(enc.encode(`data: ${JSON.stringify({ type: "token", text: tok })}\n\n`))
        }

        await db.message.create({
          data: { chatId: chat.id, role: "assistant", content: full, sources: JSON.stringify(sources) },
        })

        controller.enqueue(enc.encode(`data: ${JSON.stringify({ type: "done", sources })}\n\n`))
        controller.close()
      },
    })

    return new Response(body, {
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
    })
  } catch (err) {
    console.error("Chat error:", err)
    return NextResponse.json({ error: "Chat failed" }, { status: 500 })
  }
}