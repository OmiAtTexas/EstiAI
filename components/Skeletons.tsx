"use client"

function Bone({ style }: { style?: React.CSSProperties }) {
    return (
        <div style={{
            borderRadius: 6,
            background: "rgba(255,255,255,0.06)",
            animation: "skeleton-pulse 1.8s ease-in-out infinite",
            ...style,
        }} />
    )
}

export function DocumentTableSkeleton() {
    return (
        <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)", background: "#1a1f2e" }}>
            {[0, 1, 2, 3].map(i => (
                <div key={i} style={{
                    display: "grid", gridTemplateColumns: "3fr 2fr 1.5fr 1fr 1fr 40px",
                    gap: 12, padding: "12px 16px", alignItems: "center",
                    borderBottom: i < 3 ? "1px solid rgba(255,255,255,0.06)" : "none"
                }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Bone style={{ width: 28, height: 28, borderRadius: 8, flexShrink: 0 }} />
                        <div style={{ flex: 1 }}>
                            <Bone style={{ height: 11, width: "80%", marginBottom: 5 }} />
                            <Bone style={{ height: 9, width: "50%" }} />
                        </div>
                    </div>
                    <Bone style={{ height: 11 }} />
                    <Bone style={{ height: 11, width: "70%" }} />
                    <Bone style={{ height: 11, width: "80%" }} />
                    <Bone style={{ height: 18, width: 52, borderRadius: 20 }} />
                    <Bone style={{ width: 24, height: 24, borderRadius: 6 }} />
                </div>
            ))}
        </div>
    )
}

export function SidebarChatSkeleton() {
    return (
        <div style={{ padding: "0 8px" }}>
            {[90, 75, 85, 65, 80].map((w, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 8, marginBottom: 2 }}>
                    <Bone style={{ width: 13, height: 13, borderRadius: 3, flexShrink: 0 }} />
                    <Bone style={{ height: 11, width: `${w}%` }} />
                </div>
            ))}
        </div>
    )
}