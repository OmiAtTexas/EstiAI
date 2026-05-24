import Anthropic from "@anthropic-ai/sdk"
import { db } from "./db"

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

const SYSTEM_WITH_DOCS = `You are an estimating buddy — the internal AI assistant for a construction cost management company, built by Om More.

IDENTITY: If asked who built or created you, say: "Om More developed me and created me to help estimators working in construction companies." Never mention Anthropic or Claude.

CRITICAL RULES:
1. ONLY reference documents explicitly provided below. Never mention any other files.
2. Read EVERY sheet carefully — the answer may be in any sheet, any row, any cell.
3. Match answer length to the question:
   - Simple question → direct answer with exact number
   - Sheet/tab question → full structured breakdown with tables
   - Summary request → full breakdown with all key tables
   - Comparison → side by side table
4. Always quote EXACT numbers — never approximate
5. Use markdown tables for cost data, breakdowns, comparisons
6. Reference which sheet the data came from
7. If not in the documents → say: "This information is not in the uploaded documents"
8. Scan ALL sheets before answering

UPLOADED FILES:`

const SYSTEM_NO_DOCS = `You are an estimating buddy — the internal AI assistant for a construction cost management company, built by Om More.

IDENTITY: If asked who built or created you, say: "Om More developed me and created me to help estimators working in construction companies." Never mention Anthropic or Claude.

No documents uploaded yet. Ask the user to upload an Excel file using the 📎 button.`

export type Msg = { role: "user" | "assistant"; content: string }

function buildContext(content: string, userMessage: string): string {
  const msgLower = userMessage.toLowerCase()
  const sheetSections = content.split(/(?=\n?=== Sheet: )/).filter(s => s.trim())
  if (sheetSections.length <= 1) return content

  for (const section of sheetSections) {
    const nameMatch = section.match(/=== Sheet: (.+?) ===/)
    const sheetName = (nameMatch?.[1] ?? "").toLowerCase()
    if (sheetName && msgLower.includes(sheetName)) {
      const smallSheets = sheetSections.filter(s => s !== section && s.length < 5000)
      const full = [section, ...smallSheets].join("\n\n")
      return full.length > 80000 ? full.slice(0, 80000) : full
    }
  }

  const BUDGET = 40000
  const small = sheetSections.filter(s => s.length <= 4000)
  const large = sheetSections.filter(s => s.length > 4000)
  const smallTotal = small.reduce((sum, s) => sum + s.length, 0)
  const remaining = BUDGET - smallTotal
  if (large.length === 0) return sheetSections.join("\n\n")
  const perSheet = Math.floor(remaining / large.length)
  const trimmed = large.map(s =>
    s.length <= perSheet ? s : s.slice(0, perSheet) + `\n...[ask specifically about this sheet for full details]`
  )
  return [...small, ...trimmed].join("\n\n")
}

export async function ragStream(userMessage: string, history: Msg[], chatId?: string, activeDocIds?: string[], userId?: string) {
  let docs: any[] = []

  if (chatId) {
    // Load docs for this specific chat
    docs = await db.documentContent.findMany({
      where: { document: { chatId } },
      include: { document: { select: { id: true, name: true, projectName: true } } },
      orderBy: { createdAt: "desc" },
    })
  }

  // If no docs found and we have userId, look for very recent uploads with no chatId
  // This handles the case where file is uploaded before first message creates the chat
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
    const context = docs.map((d: any) => {
      const name = d.document!.projectName || d.document!.name
      return `\n${"=".repeat(60)}\nFILE: ${name}\n${"=".repeat(60)}\n${buildContext(d.content, userMessage)}`
    }).join("\n\n")
    systemPrompt = `${SYSTEM_WITH_DOCS}\n${context}`
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
