"use client"
import { useTheme } from "@/components/layout/Sidebar"

export type DashboardData = {
    metrics?: { label: string; value: string; sub?: string; color?: string }[]
    bars?: { label: string; value: number; max: number; color?: string }[]
    flags?: string[]
    title?: string
}

function formatCurrency(n: number): string {
    if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`
    if (n >= 1000) return `$${(n / 1000).toFixed(0)}K`
    return `$${n}`
}

export function Dashboard({ data }: { data: DashboardData }) {
    const { T } = useTheme()

    const hasContent =
        (data.metrics && data.metrics.length > 0) ||
        (data.bars && data.bars.length > 0) ||
        (data.flags && data.flags.length > 0)

    if (!hasContent) return null

    return (
        <div style={{
            display: "flex", flexDirection: "column", gap: 10,
            height: "100%", overflowY: "auto", padding: "12px",
        }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                    <p style={{ fontSize: 12, fontWeight: 500, color: T.text, margin: 0 }}>
                        {data.title || "Live Dashboard"}
                    </p>
                    <p style={{ fontSize: 10, color: T.faint, margin: 0 }}>Updates with every answer</p>
                </div>
                <span style={{
                    fontSize: 10, color: "#22c55e",
                    background: "rgba(34,197,94,0.1)",
                    padding: "2px 8px", borderRadius: 20,
                    display: "flex", alignItems: "center", gap: 4,
                }}>
                    <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />
                    Live
                </span>
            </div>

            {/* Metric cards */}
            {data.metrics && data.metrics.length > 0 && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    {data.metrics.map((m, i) => (
                        <div key={i} style={{
                            background: T.surfHover, borderRadius: 10,
                            padding: "10px 12px",
                            border: `1px solid ${T.border}`,
                        }}>
                            <p style={{ fontSize: 10, color: T.faint, margin: "0 0 4px" }}>{m.label}</p>
                            <p style={{ fontSize: 16, fontWeight: 500, color: m.color || T.text, margin: 0 }}>{m.value}</p>
                            {m.sub && <p style={{ fontSize: 10, color: "#22c55e", margin: "2px 0 0" }}>{m.sub}</p>}
                        </div>
                    ))}
                </div>
            )}

            {/* Bar chart */}
            {data.bars && data.bars.length > 0 && (
                <div style={{
                    background: T.surfHover, borderRadius: 10,
                    padding: "12px", border: `1px solid ${T.border}`,
                }}>
                    <p style={{ fontSize: 11, fontWeight: 500, color: T.text, margin: "0 0 10px" }}>Breakdown</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {data.bars.map((b, i) => {
                            const pct = Math.round((b.value / b.max) * 100)
                            const isNegative = b.value < 0
                            const barColor = isNegative ? "#ef4444" : (b.color || "#22c55e")
                            return (
                                <div key={i}>
                                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                                        <span style={{ fontSize: 11, color: T.text }}>{b.label}</span>
                                        <span style={{ fontSize: 11, color: T.faint }}>{formatCurrency(Math.abs(b.value))}</span>
                                    </div>
                                    <div style={{ height: 6, background: T.surfActive, borderRadius: 3, overflow: "hidden" }}>
                                        <div style={{
                                            height: "100%",
                                            width: `${Math.min(Math.abs(pct), 100)}%`,
                                            background: barColor,
                                            borderRadius: 3,
                                            transition: "width 0.6s ease",
                                        }} />
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* Risk flags */}
            {data.flags && data.flags.length > 0 && (
                <div style={{
                    background: "rgba(245,158,11,0.08)",
                    border: "1px solid rgba(245,158,11,0.25)",
                    borderRadius: 10, padding: "10px 12px",
                }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                        <span style={{ fontSize: 13 }}>⚠️</span>
                        <span style={{ fontSize: 11, fontWeight: 500, color: "#f59e0b" }}>
                            {data.flags.length} flag{data.flags.length > 1 ? "s" : ""} detected
                        </span>
                    </div>
                    {data.flags.map((f, i) => (
                        <p key={i} style={{ fontSize: 11, color: "#f59e0b", margin: i === 0 ? 0 : "4px 0 0" }}>
                            · {f}
                        </p>
                    ))}
                </div>
            )}
        </div>
    )
}