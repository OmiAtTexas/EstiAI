import type { Metadata } from "next"
import "./globals.css"
import { SessionProvider } from "@/components/SessionProvider"
import { ToastProvider } from "@/components/Toast"

export const metadata: Metadata = {
  title: "EstimateAI — Construction Cost Intelligence",
  description: "Internal AI assistant for construction cost management",
  icons: {
    icon: "/tab-logo.png",
    shortcut: "/tab-logo.png",
    apple: "/tab-logo.png",
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" type="image/png" href="/tab-logo.png" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/png" href="/tab-logo.png" />
        <link rel="icon" type="image/png" href="/esti-mate-logo.png" />
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