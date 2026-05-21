"use client"
import { useState, useCallback, createContext, useContext } from "react"
import { CheckCircle2, XCircle, AlertCircle, Info, X } from "lucide-react"

type ToastType = "success" | "error" | "warning" | "info"
type Toast = { id: string; message: string; type: ToastType }
type ToastContextType = { toast: (message: string, type?: ToastType) => void }

const ToastContext = createContext<ToastContextType>({ toast: () => { } })
export function useToast() { return useContext(ToastContext) }

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([])

    const toast = useCallback((message: string, type: ToastType = "success") => {
        const id = Date.now().toString()
        setToasts(p => [...p, { id, message, type }])
        setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500)
    }, [])

    const colors = {
        success: { bg: "rgba(34,197,94,0.12)", border: "rgba(34,197,94,0.3)", color: "#22c55e", icon: CheckCircle2 },
        error: { bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.3)", color: "#ef4444", icon: XCircle },
        warning: { bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.3)", color: "#f59e0b", icon: AlertCircle },
        info: { bg: "rgba(99,102,241,0.12)", border: "rgba(99,102,241,0.3)", color: "#818cf8", icon: Info },
    }

    return (
        <ToastContext.Provider value={{ toast }}>
            {children}
            <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 pointer-events-none">
                {toasts.map(t => {
                    const c = colors[t.type]
                    const Icon = c.icon
                    return (
                        <div key={t.id}
                            className="flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl pointer-events-auto animate-fadein"
                            style={{ background: "#1a1f2e", border: `1px solid ${c.border}`, minWidth: 260, maxWidth: 380 }}>
                            <Icon size={15} color={c.color} className="shrink-0" />
                            <p className="text-sm flex-1" style={{ color: "#e8e8e8" }}>{t.message}</p>
                            <button onClick={() => setToasts(p => p.filter(x => x.id !== t.id))}
                                className="p-0.5 rounded" style={{ color: "#4a5068", background: "none", border: "none", cursor: "pointer" }}>
                                <X size={13} />
                            </button>
                        </div>
                    )
                })}
            </div>
        </ToastContext.Provider>
    )
}