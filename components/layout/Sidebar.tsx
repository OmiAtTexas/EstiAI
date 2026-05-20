"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { signOut } from "next-auth/react"
import { HardHat, Plus, MessageSquare, FileText, Settings, LogOut, Trash2, PanelLeft } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { cn } from "@/lib/utils"

type Chat = { id: string; title: string; updatedAt: string }
type User = { name?: string | null; email?: string | null; image?: string | null }

const S = {
  bg: "#161b27",
  border: "rgba(255,255,255,0.08)",
  hover: "#1e2538",
  active: "#252d47",
  text: "#e8e8e8",
  muted: "#8b8fa8",
  faint: "#4a5068",
  accent: "#f59e0b",
}

export function Sidebar({ user }: { user: User }) {
  const [open, setOpen] = useState(true)
  const [chats, setChats] = useState<Chat[]>([])
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    fetch("/api/chats").then(r => r.json()).then(d => setChats(d.chats ?? []))
  }, [pathname])

  async function del(e: React.MouseEvent, id: string) {
    e.preventDefault(); e.stopPropagation()
    await fetch(`/api/chats?id=${id}`, { method: "DELETE" })
    setChats(p => p.filter(c => c.id !== id))
    if (pathname === `/chat/${id}`) router.push("/chat")
  }

  const groups = [
    { label: "Today",     items: chats.filter(c => diffHours(c.updatedAt) < 24) },
    { label: "This week", items: chats.filter(c => diffHours(c.updatedAt) >= 24 && diffHours(c.updatedAt) < 168) },
    { label: "Earlier",   items: chats.filter(c => diffHours(c.updatedAt) >= 168) },
  ]

  return (
    <aside
      className="flex flex-col h-full shrink-0 overflow-hidden transition-all duration-200"
      style={{ width: open ? 240 : 56, background: S.bg, borderRight: `1px solid ${S.border}` }}
    >
      {/* Header */}
      <div className="flex items-center h-14 px-3 shrink-0 gap-2"
           style={{ borderBottom: `1px solid ${S.border}` }}>
        {open && (
          <>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                 style={{ background: "rgba(245,158,11,.15)", border: "1px solid rgba(245,158,11,.25)" }}>
              <HardHat size={14} color={S.accent} />
            </div>
            <span className="font-semibold text-sm flex-1" style={{ color: S.text }}>EstimateAI</span>
          </>
        )}
        <button onClick={() => setOpen(!open)}
                className="p-1.5 rounded-md transition-colors ml-auto"
                style={{ color: S.faint }}
                onMouseEnter={e => e.currentTarget.style.color = S.muted}
                onMouseLeave={e => e.currentTarget.style.color = S.faint}>
          <PanelLeft size={15} />
        </button>
      </div>

      {/* New chat */}
      <div className="px-2 py-2 shrink-0">
        <Link href="/chat">
          <button className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg font-medium text-sm transition-all"
                  style={{ background: S.accent, color: "#0d1117", justifyContent: open ? "flex-start" : "center" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#d97706"}
                  onMouseLeave={e => e.currentTarget.style.background = S.accent}>
            <Plus size={15} className="shrink-0" />
            {open && "New Chat"}
          </button>
        </Link>
      </div>

      {/* Chat history */}
      {open && (
        <div className="flex-1 overflow-y-auto px-2">
          {chats.length === 0 && (
            <p className="text-xs px-2 py-3 text-center" style={{ color: S.faint }}>
              No chats yet
            </p>
          )}
          {groups.map(({ label, items }) => items.length === 0 ? null : (
            <div key={label} className="mb-1">
              <p className="text-[10px] font-medium uppercase tracking-wider px-2 py-1.5"
                 style={{ color: S.faint }}>
                {label}
              </p>
              {items.map(c => (
                <Link key={c.id} href={`/chat/${c.id}`}>
                  <div className="group flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors"
                       style={{
                         background: pathname === `/chat/${c.id}` ? S.active : "transparent",
                         color: pathname === `/chat/${c.id}` ? S.text : S.muted,
                       }}
                       onMouseEnter={e => { if (pathname !== `/chat/${c.id}`) e.currentTarget.style.background = S.hover }}
                       onMouseLeave={e => { if (pathname !== `/chat/${c.id}`) e.currentTarget.style.background = "transparent" }}>
                    <MessageSquare size={13} className="shrink-0" style={{ color: S.faint }} />
                    <span className="text-xs flex-1 truncate">{c.title}</span>
                    <button onClick={(e) => del(e, c.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded transition-all"
                            style={{ color: S.faint }}
                            onMouseEnter={e => e.currentTarget.style.color = "#ef4444"}
                            onMouseLeave={e => e.currentTarget.style.color = S.faint}>
                      <Trash2 size={11} />
                    </button>
                  </div>
                </Link>
              ))}
            </div>
          ))}
        </div>
      )}
      {!open && <div className="flex-1" />}

      {/* Bottom nav */}
      <div className="px-2 pb-1 shrink-0" style={{ borderTop: `1px solid ${S.border}` }}>
        {[
          { href: "/documents", icon: FileText, label: "Documents" },
          { href: "/settings",  icon: Settings,  label: "Settings"  },
        ].map(({ href, icon: Icon, label }) => (
          <Link key={href} href={href}>
            <div className="flex items-center gap-2 px-2 py-2 rounded-lg mt-1 transition-colors"
                 style={{
                   background: pathname === href ? S.active : "transparent",
                   color: pathname === href ? S.text : S.muted,
                   justifyContent: open ? "flex-start" : "center",
                 }}
                 onMouseEnter={e => { if (pathname !== href) e.currentTarget.style.background = S.hover }}
                 onMouseLeave={e => { if (pathname !== href) e.currentTarget.style.background = "transparent" }}>
              <Icon size={15} className="shrink-0" />
              {open && <span className="text-sm">{label}</span>}
            </div>
          </Link>
        ))}
      </div>

      {/* User */}
      <div className="px-2 pb-3 shrink-0" style={{ borderTop: `1px solid ${S.border}`, paddingTop: 8 }}>
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg"
             style={{ justifyContent: open ? "flex-start" : "center" }}>
          <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold"
               style={{ background: "rgba(245,158,11,.15)", color: S.accent }}>
            {user.name?.[0] ?? user.email?.[0] ?? "?"}
          </div>
          {open && (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate" style={{ color: S.text }}>{user.name ?? "User"}</p>
                <p className="text-[10px] truncate" style={{ color: S.faint }}>{user.email}</p>
              </div>
              <button onClick={() => signOut({ callbackUrl: "/login" })}
                      className="p-1 rounded transition-colors"
                      style={{ color: S.faint }}
                      onMouseEnter={e => e.currentTarget.style.color = "#ef4444"}
                      onMouseLeave={e => e.currentTarget.style.color = S.faint}
                      title="Sign out">
                <LogOut size={13} />
              </button>
            </>
          )}
        </div>
      </div>
    </aside>
  )
}

function diffHours(d: string) {
  return (Date.now() - new Date(d).getTime()) / 3600000
}
