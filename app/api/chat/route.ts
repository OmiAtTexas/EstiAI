import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { db } from "@/lib/db"
import { ragStream } from "@/lib/rag"
import Anthropic from "@anthropic-ai/sdk"

export const maxDuration = 60

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userId = token.id as string
  const { message, chatId, activeDocIds, images } = await req.json()
  if (!message?.trim() && (!images || images.length === 0)) {
    return NextResponse.json({ error: "Empty message" }, { status: 400 })
  }

  let chat: { id: string; messages: { role: string; content: string }[] }

  if (chatId) {
    const found = await db.chat.findFirst({
      where: { id: chatId, userId },
      include: { messages: { orderBy: { createdAt: "asc" }, take: 20 } },
    })
    if (!found) return NextResponse.json({ error: "Chat not found" }, { status: 404 })
    chat = found
  } else {
    const title = message?.length > 55 ? message.slice(0, 52) + "…" : (message || "Image analysis")
    chat = await db.chat.create({
      data: { userId, title },
      include: { messages: true },
    })
  }

  // Link any recently uploaded docs with no chatId to this new chat
  await db.document.updateMany({
    where: {
      uploadedBy: userId,
      chatId: null,
      temporary: true,
      createdAt: { gte: new Date(Date.now() - 30 * 60 * 1000) } // last 30 mins
    },
    data: { chatId: chat.id }
  })

  await db.message.create({
    data: {
      chatId: chat.id,
      role: "user",
      content: message || "Image attached",
      // Store image base64 so they persist across navigation
      attachments: images && images.length > 0
        ? JSON.stringify(images.map((img: any) => `data:${img.mimeType};base64,${img.base64}`))
        : null,
    }
  })

  const history = chat.messages.map(m => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }))

  try {
    // If images are attached — use vision directly
    if (images && images.length > 0) {
      const content: Anthropic.MessageParam["content"] = []

      // Add images
      for (const img of images) {
        content.push({
          type: "image",
          source: {
            type: "base64",
            media_type: img.mimeType as "image/png" | "image/jpeg" | "image/gif" | "image/webp",
            data: img.base64,
          },
        })
      }

      // Add text
      if (message?.trim()) {
        content.push({ type: "text", text: message })
      }

      const response = await anthropic.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 2048,
        system: `You are an estimating buddy for a construction cost management company, built by Om More. Analyze images carefully and provide detailed, accurate responses. If the image shows a document, spreadsheet, or estimate — extract and explain all relevant data.`,
        messages: [
          ...history.slice(-6).map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
          { role: "user", content },
        ],
      })

      const full = response.content[0].type === "text" ? response.content[0].text : ""

      await db.message.create({
        data: {
          chatId: chat.id,
          role: "assistant",
          content: full,
          sources: JSON.stringify([]),
        }
      })

      // Update title after 3rd message
      const msgCount = await db.message.count({ where: { chatId: chat.id, role: "user" } })
      if (msgCount === 3) await updateTitle(chat.id, anthropic)

      const body = new ReadableStream({
        start(controller) {
          const enc = new TextEncoder()
          controller.enqueue(enc.encode(`data: ${JSON.stringify({ type: "init", chatId: chat.id })}\n\n`))
          // Stream the full response word by word for smooth UX
          const words = full.split(" ")
          let i = 0
          const interval = setInterval(() => {
            if (i >= words.length) {
              clearInterval(interval)
              controller.enqueue(enc.encode(`data: ${JSON.stringify({ type: "done", sources: [] })}\n\n`))
              controller.close()
              return
            }
            const chunk = (i === 0 ? "" : " ") + words[i]
            controller.enqueue(enc.encode(`data: ${JSON.stringify({ type: "token", text: chunk })}\n\n`))
            i++
          }, 15)
        }
      })

      return new Response(body, {
        headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
      })
    }

    // No images — normal RAG flow
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
        // Update title after 3rd message
        const msgCount = await db.message.count({ where: { chatId: chat.id, role: "user" } })
        if (msgCount === 3) await updateTitle(chat.id, anthropic)

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

async function updateTitle(chatId: string, anthropic: Anthropic) {
  try {
    const allUserMsgs = await db.message.findMany({
      where: { chatId, role: "user" },
      orderBy: { createdAt: "asc" },
      select: { content: true }
    })
    const context = allUserMsgs.map(m => m.content).join(" | ").slice(0, 400)
    const titleRes = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 20,
      messages: [{
        role: "user",
        content: `Based on these messages from a construction estimating chat, generate a concise 4-6 word title. Messages: "${context}". Reply with ONLY the title, no quotes, no punctuation at the end.`
      }]
    })
    const newTitle = titleRes.content[0].type === "text" ? titleRes.content[0].text.trim().slice(0, 60) : ""
    if (newTitle) await db.chat.update({ where: { id: chatId }, data: { title: newTitle } })
  } catch { }
}