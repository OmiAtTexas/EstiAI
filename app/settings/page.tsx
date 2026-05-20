import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"

export default async function SettingsPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")

  const S = { surface: "#161b27", border: "rgba(255,255,255,.08)", text: "#e8e8e8", muted: "#8b8fa8", faint: "#4a5068", accent: "#f59e0b" }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-xl mx-auto px-6 py-8 space-y-6">

        <div>
          <h1 className="text-xl font-semibold" style={{ color: S.text }}>Settings</h1>
          <p className="text-sm mt-1" style={{ color: S.muted }}>Account and integration preferences.</p>
        </div>

        {/* Account */}
        <section className="rounded-xl overflow-hidden" style={{ background: S.surface, border: `1px solid ${S.border}` }}>
          <div className="px-5 py-4" style={{ borderBottom: `1px solid ${S.border}` }}>
            <h2 className="text-sm font-semibold" style={{ color: S.text }}>Account</h2>
          </div>
          <div className="px-5 py-4 space-y-3">
            {[
              { label: "Name",  value: session.user.name ?? "—" },
              { label: "Email", value: session.user.email ?? "—" },
              { label: "Role",  value: session.user.role ?? "Estimator" },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-sm" style={{ color: S.muted }}>{label}</span>
                <span className="text-sm font-medium" style={{ color: S.text }}>{value}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Integrations */}
        <section className="rounded-xl overflow-hidden" style={{ background: S.surface, border: `1px solid ${S.border}` }}>
          <div className="px-5 py-4" style={{ borderBottom: `1px solid ${S.border}` }}>
            <h2 className="text-sm font-semibold" style={{ color: S.text }}>Integrations</h2>
            <p className="text-xs mt-0.5" style={{ color: S.faint }}>Connect external services to sync project data automatically.</p>
          </div>
          {[
            { name: "SharePoint", desc: "Auto-sync documents from SharePoint drives", emoji: "📁" },
            { name: "Procore",    desc: "Pull project data directly from Procore",    emoji: "🏗️" },
          ].map(({ name, desc, emoji }) => (
            <div key={name} className="flex items-center justify-between px-5 py-4"
                 style={{ borderBottom: `1px solid ${S.border}` }}>
              <div className="flex items-center gap-3">
                <span className="text-lg">{emoji}</span>
                <div>
                  <p className="text-sm font-medium" style={{ color: S.text }}>{name}</p>
                  <p className="text-xs" style={{ color: S.faint }}>{desc}</p>
                </div>
              </div>
              <button className="text-xs px-3 py-1.5 rounded-lg transition-colors"
                      style={{ border: `1px solid ${S.border}`, color: S.muted, background: "transparent" }}>
                Connect
              </button>
            </div>
          ))}
        </section>

        {/* Danger zone */}
        <section className="rounded-xl px-5 py-4"
                 style={{ background: "rgba(239,68,68,.05)", border: "1px solid rgba(239,68,68,.15)" }}>
          <h2 className="text-sm font-semibold mb-1" style={{ color: "#f87171" }}>Danger zone</h2>
          <p className="text-xs mb-3" style={{ color: S.faint }}>
            Clearing the knowledge base removes all embedded vectors from Pinecone. Uploaded files are kept.
          </p>
          <button className="text-xs px-3 py-1.5 rounded-lg transition-colors"
                  style={{ border: "1px solid rgba(239,68,68,.3)", color: "#f87171", background: "transparent" }}>
            Clear AI knowledge base
          </button>
        </section>

      </div>
    </div>
  )
}
