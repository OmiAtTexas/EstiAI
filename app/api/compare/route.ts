import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { db } from "@/lib/db"
import Anthropic from "@anthropic-ai/sdk"

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function POST(req: NextRequest) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    if (!token?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { docAId, docBId } = await req.json()
    if (!docAId || !docBId) return NextResponse.json({ error: "Two documents required" }, { status: 400 })

    const [contentA, contentB] = await Promise.all([
        db.documentContent.findUnique({ where: { documentId: docAId }, include: { document: true } }),
        db.documentContent.findUnique({ where: { documentId: docBId }, include: { document: true } }),
    ])

    if (!contentA || !contentB) {
        return NextResponse.json({ error: "One or both documents not found" }, { status: 404 })
    }

    const prompt = `Compare these two construction project documents and provide a detailed side-by-side comparison.

PROJECT A: ${contentA.document.projectName || contentA.document.name}
${contentA.content.slice(0, 4000)}

PROJECT B: ${contentB.document.projectName || contentB.document.name}
${contentB.content.slice(0, 4000)}

Provide a comparison covering:
1. Total project costs
2. Labor costs and rates
3. Material costs
4. Permits and fees
5. Tax rates
6. Key differences and insights

Use a markdown table for the main comparison. Be specific with numbers.`

    const response = await anthropic.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 2048,
        messages: [{ role: "user", content: prompt }],
    })

    const comparison = response.content[0].type === "text" ? response.content[0].text : ""
    return NextResponse.json({ comparison })
}