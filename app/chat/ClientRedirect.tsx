"use client"
import { useEffect } from "react"

export function ClientRedirect() {
    useEffect(() => {
        try {
            // Only redirect if user didn't explicitly click New Chat
            const wantsNewChat = sessionStorage.getItem("wantsNewChat")
            if (wantsNewChat) {
                sessionStorage.removeItem("wantsNewChat")
                return // stay on /chat — new chat
            }
            const lastChat = localStorage.getItem("lastChatId")
            if (lastChat) {
                window.location.replace(`/chat/${lastChat}`)
            }
        } catch { }
    }, [])
    return null
}