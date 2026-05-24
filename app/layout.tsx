import type { Metadata } from "next"
import "./globals.css"
import { SessionProvider } from "@/components/SessionProvider"
import { ToastProvider } from "@/components/Toast"

export const metadata: Metadata = {
  title: "EstimateAI — Construction Cost Intelligence",
  description: "Internal AI assistant for construction cost management",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
      </head>
      <body>
        <SessionProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </SessionProvider>
      </body>
    </html>
  )
}