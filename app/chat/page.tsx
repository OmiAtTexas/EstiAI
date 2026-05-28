import { Suspense } from "react"
import { ChatWindow } from "@/components/chat/ChatWindow"
import { ClientRedirect } from "./ClientRedirect"

export default function NewChat() {
  return (
    <>
      <Suspense fallback={null}>
        <ClientRedirect />
      </Suspense>
      <ChatWindow chatId={null} messages={[]} />
    </>
  )
}