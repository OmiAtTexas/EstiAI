import Anthropic from "@anthropic-ai/sdk"
import { db } from "./db"

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

const SYSTEM_WITH_DOCS = `You are an estimating buddy — the internal AI assistant for a construction cost management company, built by Om More.

IDENTITY: If asked who built or created you, say: "Om More developed me and created me to help estimators working in construction companies." Never mention Anthropic or Claude.

CRITICAL RULES:
1. ONLY reference documents explicitly provided below. Never mention files not shown.
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
8. Scan ALL sheets before answering — data is spread across multiple tabs

UPLOADED FILES:`

const SYSTEM_NO_DOCS = `You are an estimating buddy — the internal AI assistant for a construction cost management company, built by Om More.

IDENTITY: If asked who built or created you, say: "Om More developed me and created me to help estimators working in construction companies." Never mention Anthropic or Claude.

No documents uploaded yet. Ask the user to upload an Excel file using the 📎 button or Documents section.`

export type Msg = { role: "user" | "assistant"; content: string }

function buildContext(content: string, userMessage: string): string {
  const msgLower = userMessage.toLowerCase()
  const sheetSections = content.split(/(?=\n?=== Sheet: )/).filter(s => s.trim())

  if (sheetSections.length <= 1) return content

  // Check if user is asking about a specific sheet by name
  for (const section of sheetSections) {
    const nameMatch = section.match(/=== Sheet: (.+?) ===/)
    const sheetName = (nameMatch?.[1] ?? "").toLowerCase()
    if (sheetName && msgLower.includes(sheetName)) {
      // User asked about this specific sheet — send it FULLY + all small sheets
      const smallSheets = sheetSections.filter(s => s !== section && s.length < 5000)
      const fullContext = [section, ...smallSheets].join("\n\n")
      // Only truncate if absolutely massive (>80k chars = ~20k tokens)
      return fullContext.length > 80000 ? fullContext.slice(0, 80000) : fullContext
    }
  }

  // General question — send ALL sheets proportionally
  // Budget: 40k chars total, small sheets get full content, large sheets split evenly
  const TOTAL_BUDGET = 40000
  const smallSheets = sheetSections.filter(s => s.length <= 4000)
  const largeSheets = sheetSections.filter(s => s.length > 4000)
  const smallTotal = smallSheets.reduce((sum, s) => sum + s.length, 0)
  const remaining = TOTAL_BUDGET - smallTotal

  if (largeSheets.length === 0) return sheetSections.join("\n\n")

  const perSheet = Math.floor(remaining / largeSheets.length)
  const trimmedLarge = largeSheets.map(s =>
    s.length <= perSheet ? s : s.slice(0, perSheet) + `\n...[truncated — ask specifically about this sheet for full details]`
  )

  return [...smallSheets, ...trimmedLarge].join("\n\n")
}

export async function ragStream(userMessage: string, history: Msg[], chatId?: string, activeDocIds?: string[]) {
  const allDocs = await db.documentContent.findMany({
    include: { document: { select: { id: true, name: true, projectName: true, temporary: true, chatId: true } } },
    orderBy: { createdAt: "desc" },
    take: 10,
  })

  let docs = allDocs.filter(d => {
    if (!d.document) return false
    if (!d.document.temporary) return true
    if (d.document.temporary && chatId && d.document.chatId === chatId) return true
    if (d.document.temporary && !d.document.chatId && chatId) return true
    return false
  })

  if (activeDocIds && activeDocIds.length > 0) {
    const permanent = docs.filter(d => !d.document?.temporary)
    const temp = docs.filter(d => d.document?.temporary)
    docs = [...permanent.filter(d => activeDocIds.includes(d.document!.id)), ...temp]
  }

  let systemPrompt: string
  if (docs.length > 0) {
    const context = docs.map(d => {
      const name = d.document!.projectName || d.document!.name
      return `\n${"=".repeat(60)}\nFILE: ${name}\n${"=".repeat(60)}\n${buildContext(d.content, userMessage)}`
    }).join("\n\n")
    systemPrompt = `${SYSTEM_WITH_DOCS}\n${context}`
  } else {
    systemPrompt = SYSTEM_NO_DOCS
  }

  const messages: Anthropic.MessageParam[] = [
    ...history.slice(-8).map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
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

  return { tokens: tokens(), sources: docs.map(d => d.document!.name) }
}
