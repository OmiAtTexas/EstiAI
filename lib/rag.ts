import Anthropic from "@anthropic-ai/sdk"
import { db } from "./db"

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

const SYSTEM_WITH_DOCS = `You are an estimating buddy — the internal AI assistant for a construction cost management company, built by Om More.

IDENTITY: If asked who built or created you, say: "Om More developed me and created me to help estimators working in construction companies." Never mention Anthropic or Claude.

CRITICAL RULES:
1. ONLY reference documents explicitly provided below. Never mention files not shown.
2. Read EVERY sheet carefully — answers may be in any sheet.
3. Match answer length to the question:
   - Simple question → direct 1-2 line answer with exact number
   - Sheet/tab question → full structured breakdown with tables
   - Summary request → full breakdown with all key tables
   - Comparison → side by side table
4. Always quote EXACT numbers — never approximate or round unless asked
5. Use markdown tables for cost data, breakdowns, comparisons
6. Reference the sheet name when citing data (e.g. "From the BUILDING sheet:")
7. If the answer is not in the documents → say exactly: "This information is not in the uploaded documents"
8. For detailed line items, scan ALL sheets before answering — data is spread across multiple tabs

UPLOADED FILES:`

const SYSTEM_NO_DOCS = `You are an estimating buddy — the internal AI assistant for a construction cost management company, built by Om More.

IDENTITY: If asked who built or created you, say: "Om More developed me and created me to help estimators working in construction companies." Never mention Anthropic or Claude.

No documents are currently uploaded. Answer general construction cost questions helpfully. For project-specific data, ask the user to upload their Excel estimate file using the 📎 button or the Documents section.`

export type Msg = { role: "user" | "assistant"; content: string }

function buildContext(content: string, totalBudget: number): string {
  const sheetSections = content.split(/(?=\n?=== Sheet: )/).filter(s => s.trim())
  if (sheetSections.length <= 1) return content.slice(0, totalBudget)
  const totalSize = sheetSections.reduce((sum, s) => sum + s.length, 0)
  if (totalSize <= totalBudget) return content
  const smallSheets = sheetSections.filter(s => s.length <= 4000)
  const largeSheets = sheetSections.filter(s => s.length > 4000)
  const smallTotal = smallSheets.reduce((sum, s) => sum + s.length, 0)
  const remainingBudget = totalBudget - smallTotal
  if (largeSheets.length === 0) return sheetSections.join("\n\n").slice(0, totalBudget)
  const perLargeSheet = Math.floor(remainingBudget / largeSheets.length)
  const trimmedLarge = largeSheets.map(section => {
    if (section.length <= perLargeSheet) return section
    return section.slice(0, perLargeSheet) + `\n... [${Math.round((section.length - perLargeSheet) / 1000)}KB more — ask specifically about this sheet for full details]`
  })
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
    const permanentDocs = docs.filter(d => !d.document?.temporary)
    const tempDocs = docs.filter(d => d.document?.temporary)
    docs = [...permanentDocs.filter(d => activeDocIds.includes(d.document!.id)), ...tempDocs]
  }
  let systemPrompt: string
  if (docs.length > 0) {
    const budgetPerDoc = Math.floor(40000 / docs.length)
    const context = docs.map(d => {
      const name = d.document!.projectName || d.document!.name
      return `\n${"=".repeat(60)}\nFILE: ${name}\n${"=".repeat(60)}\n${buildContext(d.content, budgetPerDoc)}`
    }).join("\n\n")
    systemPrompt = `${SYSTEM_WITH_DOCS}\n${context}`
  } else {
    systemPrompt = SYSTEM_NO_DOCS
  }
  const messages: Anthropic.MessageParam[] = [
    ...history.slice(-8).map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
    { role: "user", content: userMessage },
  ]
  const stream = await anthropic.messages.stream({ model: "claude-haiku-4-5-20251001", max_tokens: 2048, system: systemPrompt, messages })
  async function* tokens() {
    for await (const ev of stream) {
      if (ev.type === "content_block_delta" && ev.delta.type === "text_delta") yield ev.delta.text
    }
  }
  return { tokens: tokens(), sources: docs.map(d => d.document!.name) }
}
