import Anthropic from "@anthropic-ai/sdk"
import { db } from "./db"

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

const SYSTEM_WITH_DOCS = `You are an estimating buddy — the internal AI assistant for a construction cost management company, built by Om More.

IDENTITY: If asked who built or created you, say: "Om More developed me and created me to help estimators working in construction companies." Never mention Anthropic or Claude.

CRITICAL RULES:
1. ONLY reference documents explicitly provided below. Never mention any other files.
2. Read EVERY sheet, EVERY row, EVERY cell — no detail is too small.
3. If user mentions a specific document name → search ONLY that document.
4. If user does NOT mention a specific document and multiple docs are uploaded → ask: "Which document are you referring to? I have: [list doc names]"
5. If only ONE document is uploaded → always use it without asking.
6. Match answer length to the question:
   - Simple question → direct answer with exact number
   - Sheet/tab question → full structured breakdown with tables
   - Summary request → full breakdown covering all sheets
   - Comparison → side by side table
7. Always quote EXACT numbers — never round or approximate
8. Use markdown tables for all cost data and breakdowns
9. Reference the exact sheet name when citing data
10. If answer is not found → say: "This information is not in the uploaded documents"

UPLOADED FILES:`

const SYSTEM_NO_DOCS = `You are an estimating buddy — the internal AI assistant for a construction cost management company, built by Om More.

IDENTITY: If asked who built or created you, say: "Om More developed me and created me to help estimators working in construction companies." Never mention Anthropic or Claude.

No documents uploaded yet. Ask the user to upload an Excel file using the 📎 button.`

export type Msg = { role: "user" | "assistant"; content: string }

function buildContext(content: string, userMessage: string): string {
  const msgLower = userMessage.toLowerCase()
  const sheetSections = content.split(/(?=\n?=== Sheet: )/).filter(s => s.trim())
  if (sheetSections.length <= 1) return content

  // If user asks about a specific sheet — send it FULLY
  for (const section of sheetSections) {
    const nameMatch = section.match(/=== Sheet: (.+?) ===/)
    const sheetName = (nameMatch?.[1] ?? "").toLowerCase()
    if (sheetName && msgLower.includes(sheetName)) {
      const smallSheets = sheetSections.filter(s => s !== section && s.length < 5000)
      const full = [section, ...smallSheets].join("\n\n")
      return full.length > 80000 ? full.slice(0, 80000) : full
    }
  }

  // General question — all sheets proportionally
  const BUDGET = 40000
  const small = sheetSections.filter(s => s.length <= 4000)
  const large = sheetSections.filter(s => s.length > 4000)
  const smallTotal = small.reduce((sum, s) => sum + s.length, 0)
  const remaining = BUDGET - smallTotal
  if (large.length === 0) return sheetSections.join("\n\n")
  const perSheet = Math.floor(remaining / large.length)
  const trimmed = large.map(s =>
    s.length <= perSheet ? s : s.slice(0, perSheet) + `\n...[ask specifically about this sheet for complete details]`
  )
  return [...small, ...trimmed].join("\n\n")
}

export async function ragStream(userMessage: string, history: Msg[], chatId?: string, activeDocIds?: string[], userId?: string) {
  let docs: any[] = []

  if (chatId) {
    docs = await db.documentContent.findMany({
      where: { document: { chatId } },
      include: { document: { select: { id: true, name: true, projectName: true } } },
      orderBy: { createdAt: "desc" },
    })
  }

  // Fallback: file uploaded before chat was created
  if (docs.length === 0 && userId) {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
    docs = await db.documentContent.findMany({
      where: {
        document: {
          uploadedBy: userId,
          chatId: null,
          temporary: true,
          createdAt: { gte: fiveMinutesAgo }
        }
      },
      include: { document: { select: { id: true, name: true, projectName: true } } },
      orderBy: { createdAt: "desc" },
    })
  }

  let systemPrompt: string
  if (docs.length > 0) {
    const msgLower = userMessage.toLowerCase()

    // If multiple docs — check if user mentioned a specific one
    if (docs.length > 1) {
      const mentionedDoc = docs.find(d => {
        const name = (d.document!.projectName || d.document!.name).toLowerCase()
        const filename = d.document!.name.toLowerCase().replace(/\.[^.]+$/, "")
        return msgLower.includes(name) || msgLower.includes(filename)
      })

      if (mentionedDoc) {
        // User mentioned a specific doc — only use that one
        const name = mentionedDoc.document!.projectName || mentionedDoc.document!.name
        const context = `\n${"=".repeat(60)}\nFILE: ${name}\n${"=".repeat(60)}\n${buildContext(mentionedDoc.content, userMessage)}`
        systemPrompt = `${SYSTEM_WITH_DOCS}\n${context}`
      } else {
        // Multiple docs, user didn't specify — include all but instruct AI to ask
        const docList = docs.map(d => d.document!.projectName || d.document!.name).join(", ")
        const context = docs.map(d => {
          const name = d.document!.projectName || d.document!.name
          return `\n${"=".repeat(60)}\nFILE: ${name}\n${"=".repeat(60)}\n${buildContext(d.content, userMessage)}`
        }).join("\n\n")
        systemPrompt = `${SYSTEM_WITH_DOCS}\n${context}\n\nNOTE: Multiple documents are uploaded (${docList}). If the user's question is ambiguous and could apply to any document, ask them which document they are referring to before answering.`
      }
    } else {
      // Only one doc — always use it
      const name = docs[0].document!.projectName || docs[0].document!.name
      const context = `\n${"=".repeat(60)}\nFILE: ${name}\n${"=".repeat(60)}\n${buildContext(docs[0].content, userMessage)}`
      systemPrompt = `${SYSTEM_WITH_DOCS}\n${context}`
    }
  } else {
    systemPrompt = SYSTEM_NO_DOCS
  }

  const messages: Anthropic.MessageParam[] = [
    ...history.slice(-8).map((m: any) => ({ role: m.role as "user" | "assistant", content: m.content })),
    { role: "user", content: userMessage },
  ]

  const stream = await anthropic.messages.stream({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 2048,
    system: systemPrompt,
    messages,
  })

  async function* tokens() {
    for await (const ev of stream) {
      if (ev.type === "content_block_delta" && ev.delta.type === "text_delta") yield ev.delta.text
    }
  }

  return { tokens: tokens(), sources: [...new Set(docs.map((d: any) => d.document!.name))] }
}
