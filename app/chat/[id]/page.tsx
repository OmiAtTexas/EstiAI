import { getServerSession } from "next-auth"
import { notFound, redirect } from "next/navigation"
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
  if (!chat) notFound()

  const messages = chat.messages.map(m => ({
    id: m.id,
    role: m.role as "user" | "assistant",
    content: m.content,
    sources: m.sources ? JSON.parse(m.sources) : [],
  }))

  return <ChatWindow chatId={chat.id} messages={messages} />
}