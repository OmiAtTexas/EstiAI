"use client"
import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { signOut } from "next-auth/react"
import {
  HardHat, Plus, MessageSquare, Settings,
  Trash2, PanelLeft, Pin, PinOff, Pencil, MoreHorizontal,
  LogOut, HelpCircle, ChevronRight, Moon, Sun, Search, X
} from "lucide-react"
type Chat = { id: string; title: string; updatedAt: string; pinned?: boolean }
type User = { name?: string | null; email?: string | null; image?: string | null }
export type Theme = typeof DARK_THEME
export const DARK_THEME = {
  bg: "#0d1117", sidebar: "#111827", surface: "#1a1f2e",
  surfHover: "#1e2538", surfActive: "#252d47",
  border: "rgba(255,255,255,0.08)", borderHover: "rgba(255,255,255,0.14)",
  text: "#e8e8e8", muted: "#8b8fa8", faint: "#4a5068",
  accent: "#22c55e", accentDark: "#16a34a", accentText: "#ffffff",
}
export const LIGHT_THEME = {
  bg: "#ffffff", sidebar: "#f0fdf4", surface: "#f8faf8",
  surfHover: "#eef7ee", surfActive: "#dcfce7",
  border: "rgba(0,0,0,0.08)", borderHover: "rgba(0,0,0,0.14)",
  text: "#111827", muted: "#4b7a4b", faint: "#86a886",
  accent: "#16a34a", accentDark: "#15803d", accentText: "#ffffff",
}
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

function UserMenu({ user, T, isDark, onToggleTheme, onClose }: {
  user: User; T: Theme; isDark: boolean; onToggleTheme: () => void; onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [onClose])
  return (
    <div ref={ref} className="absolute bottom-14 left-2 right-2 z-50 rounded-xl overflow-hidden shadow-2xl"
      style={{ background: T.surface, border: `1px solid ${T.borderHover}` }}>
      <div className="px-4 py-3" style={{ borderBottom: `1px solid ${T.border}` }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold shrink-0"
            style={{ background: `${T.accent}20`, color: T.accent }}>
            {user.name?.[0]?.toUpperCase() ?? user.email?.[0]?.toUpperCase() ?? "?"}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate" style={{ color: T.text }}>{user.name ?? "User"}</p>
            <p className="text-xs truncate" style={{ color: T.faint }}>{user.email}</p>
          </div>
        </div>
      </div>
      <div className="py-1">
        <button onClick={() => { router.push("/settings"); onClose() }}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm"
          style={{ color: T.text, background: "transparent" }}
          onMouseEnter={e => e.currentTarget.style.background = T.surfHover}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
          <Settings size={15} style={{ color: T.muted }} />
          <span>Settings</span>
          <ChevronRight size={13} className="ml-auto" style={{ color: T.faint }} />
        </button>
        <button onClick={onToggleTheme}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm"
          style={{ color: T.text, background: "transparent" }}
          onMouseEnter={e => e.currentTarget.style.background = T.surfHover}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
          {isDark ? <Sun size={15} style={{ color: T.muted }} /> : <Moon size={15} style={{ color: T.muted }} />}
          <span>{isDark ? "Light mode" : "Dark mode"}</span>
          <div className="ml-auto w-9 h-5 rounded-full relative"
            style={{ background: isDark ? T.accent : T.surfActive, border: `1px solid ${T.border}` }}>
            <span className="absolute top-0.5 w-4 h-4 rounded-full transition-all duration-300"
              style={{ background: isDark ? "#fff" : T.accent, left: isDark ? "auto" : "2px", right: isDark ? "2px" : "auto" }} />
          </div>
        </button>
        <div style={{ height: 1, background: T.border, margin: "4px 0" }} />
        <button onClick={() => { window.open("mailto:support@yourcompany.com"); onClose() }}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm"
          style={{ color: T.text, background: "transparent" }}
          onMouseEnter={e => e.currentTarget.style.background = T.surfHover}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
          <HelpCircle size={15} style={{ color: T.muted }} />
          <span>Get help</span>
        </button>
        <div style={{ height: 1, background: T.border, margin: "4px 0" }} />
        <button onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm"
          style={{ color: "#ef4444", background: "transparent" }}
          onMouseEnter={e => e.currentTarget.style.background = "rgba(239,68,68,0.08)"}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
          <LogOut size={15} />
          <span>Log out</span>
        </button>
      </div>
    </div>
  )
}

function ChatMenu({ chat, T, onPin, onRename, onDelete, onClose }: {
  chat: Chat; T: Theme; onPin: () => void; onRename: () => void; onDelete: () => void; onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [onClose])
  return (
    <div ref={ref} className="absolute right-0 top-7 z-50 rounded-lg overflow-hidden shadow-xl"
      style={{ background: T.surface, border: `1px solid ${T.borderHover}`, minWidth: 140 }}>
      <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); onPin(); onClose() }}
        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs"
        style={{ color: T.muted }}
        onMouseEnter={e => e.currentTarget.style.background = T.surfHover}
        onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
        {chat.pinned ? <PinOff size={13} /> : <Pin size={13} />}
        {chat.pinned ? "Unpin" : "Pin"}
      </button>
      <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRename(); onClose() }}
        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs"
        style={{ color: T.muted }}
        onMouseEnter={e => e.currentTarget.style.background = T.surfHover}
        onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
        <Pencil size={13} /> Rename
      </button>
      <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(); onClose() }}
        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs"
        style={{ color: "#ef4444" }}
        onMouseEnter={e => e.currentTarget.style.background = "rgba(239,68,68,0.08)"}
        onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
        <Trash2 size={13} /> Delete
      </button>
    </div>
  )
}

function RenameInput({ chatId, currentTitle, T, onDone }: {
  chatId: string; currentTitle: string; T: Theme; onDone: (t: string) => void
}) {
  const [val, setVal] = useState(currentTitle)
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => { ref.current?.focus(); ref.current?.select() }, [])
  async function save() {
    const trimmed = val.trim()
    if (!trimmed) return onDone(currentTitle)
    await fetch("/api/chats", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: chatId, title: trimmed }),
    })
    onDone(trimmed)
  }
  return (
    <input ref={ref} value={val} onChange={e => setVal(e.target.value)}
      onBlur={save}
      onKeyDown={e => { if (e.key === "Enter") save(); if (e.key === "Escape") onDone(currentTitle) }}
      className="flex-1 text-xs focus:outline-none rounded px-1"
      style={{ color: T.text, border: `1px solid ${T.accent}60`, background: T.surfActive, padding: "2px 6px" }}
      onClick={e => e.preventDefault()} />
  )
}

export function Sidebar({ user }: { user: User }) {
  const [open, setOpen] = useState(true)
  const [chats, setChats] = useState<Chat[]>([])
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [search, setSearch] = useState("")
  const { isDark, T, toggle } = useTheme()
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    fetch("/api/chats").then(r => r.json()).then(d => {
      const loaded = d.chats ?? []
      const pinned: string[] = JSON.parse(localStorage.getItem("pinnedChats") || "[]")
      setChats(loaded.map((c: Chat) => ({ ...c, pinned: pinned.includes(c.id) })))
    })
  }, [pathname])

  function togglePin(id: string) {
    setChats(prev => {
      const updated = prev.map(c => c.id === id ? { ...c, pinned: !c.pinned } : c)
      const pinned = updated.filter(c => c.pinned).map(c => c.id)
      localStorage.setItem("pinnedChats", JSON.stringify(pinned))
      return updated
    })
  }

  async function deleteChat(id: string) {
    await fetch(`/api/chats?id=${id}`, { method: "DELETE" })
    setChats(p => p.filter(c => c.id !== id))
    if (pathname === `/chat/${id}`) {
      window.location.href = "/chat"
    }
  }

  function renameChat(id: string, newTitle: string) {
    setChats(p => p.map(c => c.id === id ? { ...c, title: newTitle } : c))
    setRenamingId(null)
  }

  // Filter chats by search
  const filtered = search.trim()
    ? chats.filter(c => c.title.toLowerCase().includes(search.toLowerCase()))
    : chats

  const pinnedChats = filtered.filter(c => c.pinned)
  const unpinned = filtered.filter(c => !c.pinned)
  const groups = [
    { label: "Pinned", items: pinnedChats },
    { label: "Today", items: unpinned.filter(c => diffHours(c.updatedAt) < 24) },
    { label: "This week", items: unpinned.filter(c => diffHours(c.updatedAt) >= 24 && diffHours(c.updatedAt) < 168) },
    { label: "Earlier", items: unpinned.filter(c => diffHours(c.updatedAt) >= 168) },
  ]

  return (
    <aside className="flex flex-col h-full shrink-0 overflow-hidden transition-all duration-300 ease-in-out relative"
      style={{ width: open ? 240 : 56, background: T.sidebar, borderRight: `1px solid ${T.border}` }}>

      {/* Header */}
      <div className="flex items-center h-14 px-3 shrink-0 gap-2" style={{ borderBottom: `1px solid ${T.border}` }}>
        {open && (
          <>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: `${T.accent}20`, border: `1px solid ${T.accent}35` }}>
              <HardHat size={14} color={T.accent} />
            </div>
            <span className="font-semibold text-sm flex-1" style={{ color: T.text }}>Esti-Mate AI</span>
          </>
        )}
        <button onClick={() => setOpen(!open)} className="p-1.5 rounded-md"
          style={{ color: T.faint }}
          onMouseEnter={e => (e.currentTarget.style.color = T.muted)}
          onMouseLeave={e => (e.currentTarget.style.color = T.faint)}>
          <PanelLeft size={15} />
        </button>
      </div>

      {/* New chat */}
      <div className="px-2 py-2 shrink-0">
        <Link href="/chat">
          <button className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg font-semibold text-sm transition-all"
            style={{ background: T.accent, color: T.accentText, justifyContent: open ? "flex-start" : "center" }}
            onMouseEnter={e => (e.currentTarget.style.background = T.accentDark)}
            onMouseLeave={e => (e.currentTarget.style.background = T.accent)}>
            <Plus size={15} className="shrink-0" />
            {open && "New Chat"}
          </button>
        </Link>
      </div>

      {/* Chat history */}
      {open && (
        <div className="flex-1 overflow-y-auto px-2 flex flex-col">

          {/* Search bar */}
          <div className="relative mb-2 mt-1 shrink-0">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: T.faint }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search chats…"
              className="w-full text-xs rounded-lg focus:outline-none"
              style={{
                background: T.surfHover,
                border: `1px solid ${search ? T.accent + "60" : T.border}`,
                color: T.text,
                padding: "6px 28px 6px 28px",
              }}
            />
            {search && (
              <button onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded"
                style={{ color: T.faint, background: "none", border: "none", cursor: "pointer" }}>
                <X size={11} />
              </button>
            )}
          </div>

          {/* No results */}
          {search && filtered.length === 0 && (
            <p className="text-xs px-2 py-3 text-center" style={{ color: T.faint }}>
              No chats found for "{search}"
            </p>
          )}

          {/* No chats at all */}
          {!search && chats.length === 0 && (
            <p className="text-xs px-2 py-3 text-center" style={{ color: T.faint }}>No chats yet</p>
          )}

          {/* Chat groups */}
          {groups.map(({ label, items }) => items.length === 0 ? null : (
            <div key={label} className="mb-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider px-2 py-1.5 flex items-center gap-1"
                style={{ color: T.faint }}>
                {label === "Pinned" && <Pin size={9} />}{label}
              </p>
              {items.map(c => (
                <Link key={c.id} href={`/chat/${c.id}`}>
                  <div className="group flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer relative"
                    style={{
                      background: pathname === `/chat/${c.id}` ? T.surfActive : "transparent",
                      color: pathname === `/chat/${c.id}` ? T.text : T.muted,
                    }}
                    onMouseEnter={e => { if (pathname !== `/chat/${c.id}`) e.currentTarget.style.background = T.surfHover }}
                    onMouseLeave={e => { if (pathname !== `/chat/${c.id}`) e.currentTarget.style.background = "transparent" }}>
                    {c.pinned
                      ? <Pin size={10} className="shrink-0" style={{ color: T.accent }} />
                      : <MessageSquare size={13} className="shrink-0" style={{ color: T.faint }} />
                    }
                    {renamingId === c.id ? (
                      <RenameInput chatId={c.id} currentTitle={c.title} T={T} onDone={(t) => renameChat(c.id, t)} />
                    ) : (
                      <span className="text-xs flex-1 truncate">{c.title}</span>
                    )}
                    {renamingId !== c.id && (
                      <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMenuOpenId(menuOpenId === c.id ? null : c.id) }}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded"
                        style={{ color: T.faint }}
                        onMouseEnter={e => (e.currentTarget.style.color = T.muted)}
                        onMouseLeave={e => (e.currentTarget.style.color = T.faint)}>
                        <MoreHorizontal size={13} />
                      </button>
                    )}
                    {menuOpenId === c.id && (
                      <ChatMenu chat={c} T={T}
                        onPin={() => togglePin(c.id)}
                        onRename={() => { setRenamingId(c.id); setMenuOpenId(null) }}
                        onDelete={() => deleteChat(c.id)}
                        onClose={() => setMenuOpenId(null)} />
                    )}
                  </div>
                </Link>
              ))}
            </div>
          ))}
        </div>
      )}

      {!open && <div className="flex-1" />}

      {/* User button */}
      <div className="px-2 pb-3 shrink-0 pt-2 relative" style={{ borderTop: `1px solid ${T.border}` }}>
        <button onClick={() => setUserMenuOpen(!userMenuOpen)}
          className="w-full flex items-center gap-2 px-2 py-2 rounded-lg"
          style={{ justifyContent: open ? "flex-start" : "center", background: userMenuOpen ? T.surfActive : "transparent" }}
          onMouseEnter={e => { if (!userMenuOpen) e.currentTarget.style.background = T.surfHover }}
          onMouseLeave={e => { if (!userMenuOpen) e.currentTarget.style.background = "transparent" }}>
          <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold"
            style={{ background: `${T.accent}20`, color: T.accent }}>
            {user.name?.[0]?.toUpperCase() ?? user.email?.[0]?.toUpperCase() ?? "?"}
          </div>
          {open && (
            <>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-xs font-medium truncate" style={{ color: T.text }}>{user.name ?? "User"}</p>
                <p className="text-[10px] truncate" style={{ color: T.faint }}>{user.email}</p>
              </div>
              <MoreHorizontal size={14} style={{ color: T.faint, flexShrink: 0 }} />
            </>
          )}
        </button>
        {userMenuOpen && open && (
          <UserMenu user={user} T={T} isDark={isDark} onToggleTheme={toggle} onClose={() => setUserMenuOpen(false)} />
        )}
      </div>
    </aside>
  )
}

function diffHours(d: string) {
  return (Date.now() - new Date(d).getTime()) / 3600000
}