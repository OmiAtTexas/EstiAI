"use client"
import { useSession } from "next-auth/react"
import { Sidebar } from "@/components/layout/Sidebar"

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession()

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "#0d1117" }}>
      <Sidebar user={session?.user ?? {}} />
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  )
}