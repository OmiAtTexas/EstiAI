"use client"
import { useEffect } from "react"
import { useRouter } from "next/router"

export function ClientRedirect() {
    const router = useRouter()
    useEffect(() => {
        const lastChat = localStorage.getItem("lastChatId")
        if (lastChat) router.replace(`/chat/${lastChat}`)
    }, [])
    return null
}