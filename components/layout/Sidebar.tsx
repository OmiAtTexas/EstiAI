"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { signOut } from "next-auth/react"
import { HardHat, Plus, MessageSquare, FileText, Settings, LogOut, Trash2, PanelLeft } from "lucide-react"
import { cn } from "@/lib/utils"

type Chat = { id: string; title: string; updatedAt: string }
type User = { name?: string | null; email?: string | null; image?: string | null }

// Export theme so other components can use it
export type Theme = typeof DARK_THEME
export const DARK_THEME = {
  bg: "#0d1117",
  sidebar: "#111827",
  surface: "#1a1f2e",
  surfHover: "#1e2538",
  surfActive: "#252d47",
  border: "rgba(255,255,255,0.08)",
  borderHover: "rgba(255,255,255,0.14)",
  text: "#e8e8e8",
  muted: "#8b8fa8",
  faint: "#4a5068",
  accent: "#22c55e",
  accentDark: "#16a34a",
  accentText: "#ffffff",
}
export const LIGHT_THEME = {
  bg: "#ffffff",
  sidebar: "#f0fdf4",
  surface: "#f8faf8",
  surfHover: "#eef7ee",
  surfActive: "#dcfce7",
  border: "rgba(0,0,0,0.08)",
  borderHover: "rgba(0,0,0,0.14)",
  text: "#111827",
  muted: "#4b7a4b",
  faint: "#86a886",
  accent: "#16a34a",
  accentDark: "#15803d",
  accentText: "#ffffff",
}

// Global theme state — share across components via localStorage
let _isDark = true
const listeners: Array<(d: boolean) => void> = []
export function getTheme() { return _isDark ? DARK_THEME : LIGHT_THEME }
export function toggleGlobalTheme() {
  _isDark = !_isDark
  if (typeof window !== "undefined") localStorage.setItem("theme", _isDark ? "dark" : "light")
  listeners.forEach(fn => fn(_isDark))
}
export function useTheme() {
  const [isDark, setIsDark] = useState(_isDark)
  useEffect(() => {
    const saved = localStorage.getItem("theme")
    if (saved) { _isDark = saved === "dark"; setIsDark(_isDark) }
    listeners.push(setIsDark)
    return () => { const i = listeners.indexOf(setIsDark); if (i > -1) listeners.splice(i, 1) }
  }, [])
  return { isDark, T: isDark ? DARK_THEME : LIGHT_THEME, toggle: toggleGlobalTheme }
}

export function Sidebar({ user }: { user: User }) {
  const [open, setOpen] = useState(true)
  const [chats, setChats] = useState<Chat[]>([])
  const { isDark, T, toggle } = useTheme()
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
    { label: "Today", items: chats.filter(c => diffHours(c.updatedAt) < 24) },
    { label: "This week", items: chats.filter(c => diffHours(c.updatedAt) >= 24 && diffHours(c.updatedAt) < 168) },
    { label: "Earlier", items: chats.filter(c => diffHours(c.updatedAt) >= 168) },
  ]

  return (
    <aside
      className="flex flex-col h-full shrink-0 overflow-hidden transition-all duration-200"
      style={{ width: open ? 240 : 56, background: T.sidebar, borderRight: `1px solid ${T.border}` }}
    >
      {/* Header */}
      <div className="flex items-center h-14 px-3 shrink-0 gap-2"
        style={{ borderBottom: `1px solid ${T.border}` }}>
        {open && (
          <>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: `${T.accent}20`, border: `1px solid ${T.accent}35` }}>
              <HardHat size={14} color={T.accent} />
            </div>
            <span className="font-semibold text-sm flex-1" style={{ color: T.text }}>EstimateAI</span>
          </>
        )}
        {/* Dark/Light toggle */}
        {open && (
          <button
            onClick={toggle}
            title={isDark ? "Switch to light mode" : "Switch to dark mode"}
            className="relative w-9 h-5 rounded-full transition-all flex-shrink-0"
            style={{ background: isDark ? T.accent : T.surfActive, border: `1px solid ${T.border}` }}
          >
            <span className="absolute top-0.5 w-4 h-4 rounded-full transition-all flex items-center justify-center text-[9px]"
              style={{
                background: isDark ? "#fff" : T.accent,
                left: isDark ? "auto" : "2px",
                right: isDark ? "2px" : "auto",
              }}>
              {isDark ? "🌙" : "☀"}
            </span>
          </button>
        )}
        <button onClick={() => setOpen(!open)}
          className="p-1.5 rounded-md transition-colors"
          style={{ color: T.faint }}
          onMouseEnter={e => (e.currentTarget.style.color = T.muted)}
          onMouseLeave={e => (e.currentTarget.style.color = T.faint)}>
          <PanelLeft size={15} />
        </button>
      </div>

      {/* New chat */}
      <div className="px-2 py-2 shrink-0">
        <Link href="/chat">
          <button
            className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg font-semibold text-sm transition-all"
            style={{ background: T.accent, color: T.accentText, justifyContent: open ? "flex-start" : "center" }}
            onMouseEnter={e => (e.currentTarget.style.background = T.accentDark)}
            onMouseLeave={e => (e.currentTarget.style.background = T.accent)}
          >
            <Plus size={15} className="shrink-0" />
            {open && "New Chat"}
          </button>
        </Link>
      </div>

      {/* Chat history */}
      {open && (
        <div className="flex-1 overflow-y-auto px-2">
          {chats.length === 0 && (
            <p className="text-xs px-2 py-3 text-center" style={{ color: T.faint }}>No chats yet</p>
          )}
          {groups.map(({ label, items }) => items.length === 0 ? null : (
            <div key={label} className="mb-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider px-2 py-1.5"
                style={{ color: T.faint }}>{label}</p>
              {items.map(c => (
                <Link key={c.id} href={`/chat/${c.id}`}>
                  <div
                    className="group flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors"
                    style={{
                      background: pathname === `/chat/${c.id}` ? T.surfActive : "transparent",
                      color: pathname === `/chat/${c.id}` ? T.text : T.muted,
                    }}
                    onMouseEnter={e => { if (pathname !== `/chat/${c.id}`) e.currentTarget.style.background = T.surfHover }}
                    onMouseLeave={e => { if (pathname !== `/chat/${c.id}`) e.currentTarget.style.background = "transparent" }}
                  >
                    <MessageSquare size={13} className="shrink-0" style={{ color: T.faint }} />
                    <span className="text-xs flex-1 truncate">{c.title}</span>
                    <button onClick={(e) => del(e, c.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded transition-all"
                      style={{ color: T.faint }}
                      onMouseEnter={e => (e.currentTarget.style.color = "#ef4444")}
                      onMouseLeave={e => (e.currentTarget.style.color = T.faint)}>
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

      {/* Nav links */}
      <div className="px-2 pb-1 shrink-0" style={{ borderTop: `1px solid ${T.border}` }}>
        {[
          { href: "/documents", icon: FileText, label: "Documents" },
          { href: "/settings", icon: Settings, label: "Settings" },
        ].map(({ href, icon: Icon, label }) => (
          <Link key={href} href={href}>
            <div
              className="flex items-center gap-2 px-2 py-2 rounded-lg mt-1 transition-colors"
              style={{
                background: pathname === href ? T.surfActive : "transparent",
                color: pathname === href ? T.text : T.muted,
                justifyContent: open ? "flex-start" : "center",
              }}
              onMouseEnter={e => { if (pathname !== href) e.currentTarget.style.background = T.surfHover }}
              onMouseLeave={e => { if (pathname !== href) e.currentTarget.style.background = "transparent" }}
            >
              <Icon size={15} className="shrink-0" />
              {open && <span className="text-sm">{label}</span>}
            </div>
          </Link>
        ))}
      </div>

      {/* User */}
      <div className="px-2 pb-3 shrink-0 pt-2" style={{ borderTop: `1px solid ${T.border}` }}>
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg"
          style={{ justifyContent: open ? "flex-start" : "center" }}>
          <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold"
            style={{ background: `${T.accent}20`, color: T.accent }}>
            {user.name?.[0]?.toUpperCase() ?? user.email?.[0]?.toUpperCase() ?? "?"}
          </div>
          {open && (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate" style={{ color: T.text }}>{user.name ?? "User"}</p>
                <p className="text-[10px] truncate" style={{ color: T.faint }}>{user.email}</p>
              </div>
              <button onClick={() => signOut({ callbackUrl: "/login" })}
                className="p-1 rounded transition-colors"
                style={{ color: T.faint }}
                onMouseEnter={e => (e.currentTarget.style.color = "#ef4444")}
                onMouseLeave={e => (e.currentTarget.style.color = T.faint)}
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