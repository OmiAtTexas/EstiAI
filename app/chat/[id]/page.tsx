import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { ChatWindow } from "@/components/chat/ChatWindow"

export default async function ChatPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")

  const chat = await db.chat.findFirst({
    where: { id, userId: session.user.id },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  })
  if (!chat) redirect("/chat")

  const messages = chat.messages.map(m => {
    let imagePreviews: string[] = []
    let fileAttachments: { type: string; name: string }[] = []

    if (m.attachments) {
      try {
        const parsed = JSON.parse(m.attachments)
        if (Array.isArray(parsed)) {
          imagePreviews = parsed.filter((a: any) => typeof a === "string" && a.startsWith("data:image"))
          fileAttachments = parsed.filter((a: any) => a?.type === "excel")
        }
      } catch { }
    }

    return {
      id: m.id,
      role: m.role as "user" | "assistant",
      content: m.content,
      sources: m.sources ? (() => { try { return JSON.parse(m.sources!) } catch { return [] } })() : [],
      imagePreviews,
      fileAttachments,
    }
  })

  return <ChatWindow chatId={chat.id} messages={messages} />
}