import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { Users, MessageSquare, FileText, TrendingUp } from "lucide-react"

export default async function AdminPage() {
    const session = await getServerSession(authOptions)
    if (!session) redirect("/login")

    // Only allow admin (you can change this email to yours)
    const adminEmails = ["omore@ttu.edu"]
    if (!adminEmails.includes(session.user.email ?? "")) {
        redirect("/chat")
    }

    const [userCount, chatCount, messageCount, documentCount, recentChats] = await Promise.all([
        db.user.count(),
        db.chat.count(),
        db.message.count(),
        db.document.count({ where: { temporary: false } }),
        db.chat.findMany({
            orderBy: { updatedAt: "desc" },
            take: 10,
            include: {
                user: { select: { name: true, email: true } },
                _count: { select: { messages: true } },
            },
        }),
    ])

    const stats = [
        { label: "Total Users", value: userCount, icon: Users, color: "#22c55e" },
        { label: "Total Chats", value: chatCount, icon: MessageSquare, color: "#818cf8" },
        { label: "Total Messages", value: messageCount, icon: TrendingUp, color: "#f59e0b" },
        { label: "Documents Saved", value: documentCount, icon: FileText, color: "#06b6d4" },
    ]

    return (
        <div className="h-full overflow-y-auto" style={{ background: "var(--bg)" }}>
            <div className="max-w-5xl mx-auto px-6 py-8">

                <div className="mb-8">
                    <h1 className="text-xl font-semibold" style={{ color: "var(--text)" }}>Admin Dashboard</h1>
                    <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
                        Usage statistics for EstimateAI
                    </p>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    {stats.map(({ label, value, icon: Icon, color }) => (
                        <div key={label} className="rounded-xl p-5"
                            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                            <div className="flex items-center justify-between mb-3">
                                <div className="w-9 h-9 rounded-lg flex items-center justify-center"
                                    style={{ background: `${color}15` }}>
                                    <Icon size={17} color={color} />
                                </div>
                            </div>
                            <p className="text-2xl font-bold" style={{ color: "var(--text)" }}>{value}</p>
                            <p className="text-xs mt-0.5" style={{ color: "var(--faint)" }}>{label}</p>
                        </div>
                    ))}
                </div>

                {/* Recent activity */}
                <div className="rounded-xl overflow-hidden"
                    style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                    <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
                        <h2 className="text-sm font-semibold" style={{ color: "var(--text)" }}>Recent Chats</h2>
                    </div>
                    <table className="w-full text-sm">
                        <thead>
                            <tr style={{ borderBottom: "1px solid var(--border)" }}>
                                {["User", "Chat title", "Messages", "Last active"].map(h => (
                                    <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wide"
                                        style={{ color: "var(--faint)" }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {recentChats.map((chat, i) => (
                                <tr key={chat.id}
                                    style={{ borderBottom: i < recentChats.length - 1 ? "1px solid var(--border)" : "none" }}>
                                    <td className="px-4 py-3">
                                        <p className="text-xs font-medium" style={{ color: "var(--text)" }}>{chat.user.name ?? "Unknown"}</p>
                                        <p className="text-[10px]" style={{ color: "var(--faint)" }}>{chat.user.email}</p>
                                    </td>
                                    <td className="px-4 py-3 text-xs truncate max-w-[200px]" style={{ color: "var(--muted)" }}>
                                        {chat.title}
                                    </td>
                                    <td className="px-4 py-3 text-xs" style={{ color: "var(--muted)" }}>
                                        {chat._count.messages}
                                    </td>
                                    <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: "var(--faint)" }}>
                                        {new Date(chat.updatedAt).toLocaleDateString()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}