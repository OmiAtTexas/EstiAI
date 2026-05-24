import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { db } from "@/lib/db"

export async function GET(req: NextRequest) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    if (!token?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const id = req.nextUrl.searchParams.get("id")
    const name = req.nextUrl.searchParams.get("name")

    let content: string | null = null

    if (id) {
        const doc = await db.documentContent.findUnique({ where: { documentId: id } })
        content = doc?.content ?? null
    } else if (name) {
        // Find most recent doc with this name uploaded by this user
        const doc = await db.document.findFirst({
            where: { name, uploadedBy: token.id as string },
            orderBy: { createdAt: "desc" },
            include: { content: true },
        })
        content = doc?.content?.content ?? null
    }

    if (!content) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json({ content })
}