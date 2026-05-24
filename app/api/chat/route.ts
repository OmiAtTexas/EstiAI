import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { db } from "@/lib/db"
import { ragStream } from "@/lib/rag"
import Anthropic from "@anthropic-ai/sdk"
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export const maxDuration = 60

export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userId = token.id as string
  const { message, chatId, activeDocIds } = await req.json()
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
    const { tokens, sources } = await ragStream(message, history, chat.id, activeDocIds, userId)
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

        // Update title after 4th user message for better context
        const msgCount = await db.message.count({ where: { chatId: chat.id, role: "user" } })
        if (msgCount === 4) {
          const allUserMsgs = await db.message.findMany({
            where: { chatId: chat.id, role: "user" },
            orderBy: { createdAt: "asc" },
            select: { content: true }
          })
          const context = allUserMsgs.map(m => m.content).join(" | ").slice(0, 400)
          const titleRes = await anthropic.messages.create({
            model: "claude-haiku-4-5-20251001",
            max_tokens: 20,
            messages: [{
              role: "user",
              content: `Based on these user messages from a construction estimating chat, generate a concise 4-6 word title that captures the main topic. Messages: "${context}". Reply with ONLY the title, no quotes, no punctuation at the end.`
            }]
          })
          const newTitle = titleRes.content[0].type === "text"
            ? titleRes.content[0].text.trim().slice(0, 60)
            : ""
          if (newTitle) {
            await db.chat.update({ where: { id: chat.id }, data: { title: newTitle } })
          }
        }
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