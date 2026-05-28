import { ChatWindow } from "@/components/chat/ChatWindow"
import { ClientRedirect } from "./ClientRedirect"

export default function NewChat() {
  return (
    <>
      <ClientRedirect />
      <ChatWindow chatId={null} messages={[]} />
    </>
  )
}