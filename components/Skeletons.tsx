"use client"

function Bone({ className, style }: { className?: string; style?: React.CSSProperties }) {
    return (
        <div className={`rounded-lg ${className}`}
            style={{
                background: "var(--surf-hover)",
                animation: "skeleton-pulse 1.8s ease-in-out infinite",
                ...style,
            }} />
    )
}

export function ChatSkeleton() {
    return (
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
            {[0, 1, 2].map(i => (
                <div key={i} className={`flex gap-3 ${i % 2 === 1 ? "justify-end" : ""}`}>
                    {i % 2 === 0 && <Bone style={{ width: 28, height: 28, borderRadius: "8px", flexShrink: 0 }} />}
                    <div className="space-y-2" style={{ maxWidth: "70%" }}>
                        <Bone style={{ height: 14, width: i % 2 === 1 ? 120 : 280 }} />
                        <Bone style={{ height: 14, width: i % 2 === 1 ? 80 : 220 }} />
                        {i % 2 === 0 && <Bone style={{ height: 14, width: 180 }} />}
                    </div>
                </div>
            ))}
        </div>
    )
}

export function DocumentSkeleton() {
    return (
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>
            {[0, 1, 2, 3].map(i => (
                <div key={i} className="grid grid-cols-12 gap-2 px-4 py-3 items-center"
                    style={{ borderBottom: i < 3 ? "1px solid var(--border)" : "none" }}>
                    <div className="col-span-4 flex items-center gap-2">
                        <Bone style={{ width: 28, height: 28, borderRadius: "8px", flexShrink: 0 }} />
                        <div className="space-y-1.5 flex-1">
                            <Bone style={{ height: 11, width: "80%" }} />
                            <Bone style={{ height: 9, width: "50%" }} />
                        </div>
                    </div>
                    <div className="col-span-3"><Bone style={{ height: 11, width: "70%" }} /></div>
                    <div className="col-span-2"><Bone style={{ height: 11, width: "60%" }} /></div>
                    <div className="col-span-1"><Bone style={{ height: 11, width: "80%" }} /></div>
                    <div className="col-span-1"><Bone style={{ height: 18, width: 52, borderRadius: 20 }} /></div>
                    <div className="col-span-1 flex justify-end"><Bone style={{ width: 24, height: 24, borderRadius: "6px" }} /></div>
                </div>
            ))}
        </div>
    )
}

export function SidebarChatSkeleton() {
    return (
        <div className="px-2 space-y-1">
            {[100, 80, 90, 70, 85].map((w, i) => (
                <div key={i} className="flex items-center gap-2 px-2 py-2 rounded-lg">
                    <Bone style={{ width: 13, height: 13, borderRadius: "3px", flexShrink: 0 }} />
                    <Bone style={{ height: 11, width: `${w}%` }} />
                </div>
            ))}
        </div>
    )
}