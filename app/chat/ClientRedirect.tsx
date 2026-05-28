"use client"
import { useEffect } from "react"

export function ClientRedirect() {
    useEffect(() => {
        try {
            const lastChat = localStorage.getItem("lastChatId")
            if (lastChat) {
                window.location.replace(`/chat/${lastChat}`)
            }
        } catch { }
    }, [])
    return null
}