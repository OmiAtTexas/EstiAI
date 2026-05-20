"use client"
import { useSession } from "next-auth/react"
import { useTheme } from "@/components/layout/Sidebar"
import { Sun, Moon, Monitor } from "lucide-react"

export default function SettingsPage() {
  const { data: session } = useSession()
  const { isDark, T, toggle } = useTheme()

  return (
    <div className="h-full overflow-y-auto" style={{ background: T.bg }}>
      <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">

        <div>
          <h1 className="text-xl font-semibold" style={{ color: T.text }}>Settings</h1>
          <p className="text-sm mt-1" style={{ color: T.muted }}>Manage your account and preferences.</p>
        </div>

        {/* Account */}
        <section className="rounded-xl overflow-hidden"
          style={{ background: T.surface, border: `1px solid ${T.border}` }}>
          <div className="px-5 py-3" style={{ borderBottom: `1px solid ${T.border}` }}>
            <h2 className="text-sm font-semibold" style={{ color: T.text }}>Account</h2>
          </div>
          <div className="px-5 py-4 space-y-3">
            {[
              { label: "Name", value: session?.user?.name ?? "—" },
              { label: "Email", value: session?.user?.email ?? "—" },
              { label: "Role", value: (session?.user as any)?.role ?? "Estimator" },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-sm" style={{ color: T.muted }}>{label}</span>
                <span className="text-sm font-medium" style={{ color: T.text }}>{value}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Appearance */}
        <section className="rounded-xl overflow-hidden"
          style={{ background: T.surface, border: `1px solid ${T.border}` }}>
          <div className="px-5 py-3" style={{ borderBottom: `1px solid ${T.border}` }}>
            <h2 className="text-sm font-semibold" style={{ color: T.text }}>Appearance</h2>
          </div>
          <div className="px-5 py-4">
            <p className="text-sm mb-4" style={{ color: T.muted }}>Choose your preferred theme.</p>
            <div className="grid grid-cols-2 gap-3">
              {/* Dark mode option */}
              <button
                onClick={() => { if (!isDark) toggle() }}
                className="flex flex-col items-center gap-2 p-4 rounded-xl transition-all"
                style={{
                  background: isDark ? `${T.accent}15` : T.surfHover,
                  border: `2px solid ${isDark ? T.accent : T.border}`,
                }}
              >
                <div className="w-full h-16 rounded-lg flex items-center justify-center"
                  style={{ background: "#0d1117", border: "1px solid rgba(255,255,255,0.1)" }}>
                  <div className="flex gap-1">
                    <div className="w-8 h-3 rounded" style={{ background: "#22c55e" }} />
                    <div className="w-5 h-3 rounded" style={{ background: "#1e2538" }} />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Moon size={14} style={{ color: isDark ? T.accent : T.muted }} />
                  <span className="text-sm font-medium" style={{ color: isDark ? T.accent : T.muted }}>Dark</span>
                </div>
                {isDark && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                    style={{ background: `${T.accent}20`, color: T.accent }}>
                    Active
                  </span>
                )}
              </button>

              {/* Light mode option */}
              <button
                onClick={() => { if (isDark) toggle() }}
                className="flex flex-col items-center gap-2 p-4 rounded-xl transition-all"
                style={{
                  background: !isDark ? `${T.accent}15` : T.surfHover,
                  border: `2px solid ${!isDark ? T.accent : T.border}`,
                }}
              >
                <div className="w-full h-16 rounded-lg flex items-center justify-center"
                  style={{ background: "#f0fdf4", border: "1px solid rgba(0,0,0,0.1)" }}>
                  <div className="flex gap-1">
                    <div className="w-8 h-3 rounded" style={{ background: "#16a34a" }} />
                    <div className="w-5 h-3 rounded" style={{ background: "#eef7ee" }} />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Sun size={14} style={{ color: !isDark ? T.accent : T.muted }} />
                  <span className="text-sm font-medium" style={{ color: !isDark ? T.accent : T.muted }}>Light</span>
                </div>
                {!isDark && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                    style={{ background: `${T.accent}20`, color: T.accent }}>
                    Active
                  </span>
                )}
              </button>
            </div>
          </div>
        </section>

        {/* Integrations */}
        <section className="rounded-xl overflow-hidden"
          style={{ background: T.surface, border: `1px solid ${T.border}` }}>
          <div className="px-5 py-3" style={{ borderBottom: `1px solid ${T.border}` }}>
            <h2 className="text-sm font-semibold" style={{ color: T.text }}>Integrations</h2>
            <p className="text-xs mt-0.5" style={{ color: T.faint }}>Connect external services to sync project data.</p>
          </div>
          {[
            { name: "SharePoint", desc: "Auto-sync documents from SharePoint", emoji: "📁" },
            { name: "Procore", desc: "Pull project data from Procore", emoji: "🏗️" },
          ].map(({ name, desc, emoji }) => (
            <div key={name} className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: `1px solid ${T.border}` }}>
              <div className="flex items-center gap-3">
                <span className="text-lg">{emoji}</span>
                <div>
                  <p className="text-sm font-medium" style={{ color: T.text }}>{name}</p>
                  <p className="text-xs" style={{ color: T.faint }}>{desc}</p>
                </div>
              </div>
              <button className="text-xs px-3 py-1.5 rounded-lg transition-colors"
                style={{ border: `1px solid ${T.border}`, color: T.muted }}
                onMouseEnter={e => e.currentTarget.style.borderColor = T.borderHover}
                onMouseLeave={e => e.currentTarget.style.borderColor = T.border}>
                Connect
              </button>
            </div>
          ))}
        </section>

        {/* Danger zone */}
        <section className="rounded-xl px-5 py-4"
          style={{ background: "rgba(239,68,68,.05)", border: "1px solid rgba(239,68,68,.15)" }}>
          <h2 className="text-sm font-semibold mb-1" style={{ color: "#f87171" }}>Danger zone</h2>
          <p className="text-xs mb-3" style={{ color: T.faint }}>
            Clear all AI knowledge base vectors. Uploaded files are kept.
          </p>
          <button className="text-xs px-3 py-1.5 rounded-lg transition-colors"
            style={{ border: "1px solid rgba(239,68,68,.3)", color: "#f87171" }}>
            Clear knowledge base
          </button>
        </section>

      </div>
    </div>
  )
}