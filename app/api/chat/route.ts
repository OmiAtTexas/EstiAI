import { getServerSession } from "next-auth"
import { NextRequest, NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { ragStream } from "@/lib/rag"

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { message, chatId } = await req.json()
  if (!message?.trim()) return NextResponse.json({ error: "Empty message" }, { status: 400 })

  // Get or create chat
  let chat: { id: string; messages: { role: string; content: string }[] }
  if (chatId) {
    const found = await db.chat.findFirst({
      where: { id: chatId, userId: session.user.id },
      include: { messages: { orderBy: { createdAt: "asc" }, take: 20 } },
    })
    if (!found) return NextResponse.json({ error: "Chat not found" }, { status: 404 })
    chat = found
  } else {
    const title = message.length > 55 ? message.slice(0, 52) + "…" : message
    chat = await db.chat.create({
      data: { userId: session.user.id, title },
      include: { messages: true },
    })
  }

  // Save user message
  await db.message.create({ data: { chatId: chat.id, role: "user", content: message } })

  const history = chat.messages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content }))
  const { tokens, sources } = await ragStream(message, history)

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
}
