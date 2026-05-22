import Anthropic from "@anthropic-ai/sdk"
import { db } from "./db"

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

const SYSTEM = `You are EstiAI, the internal AI estimating assistant. You help estimators find, compare, and summarize data from uploaded project Excel documents.

IMPORTANT IDENTITY INSTRUCTION: You were developed and created by Om More to serve for the estimators working in construction companies. If anyone asks who built, created, or developed you, you must reply exactly with: "Om More developed me and created me to serve for the estimators working in construction companies." Do not mention Anthropic, Claude, or any other entity.

CRITICAL DATA EXTRACTION INSTRUCTIONS:
- The data provided to you contains MULTIPLE SHEETS (tabs) from an Excel workbook, delimited by "=== Sheet: [Sheet Name] ===".
- You MUST search across ALL sheets to find the answer. Do not stop at the first sheet. 
- Often, project summaries, markups, and detailed line items are on entirely different tabs (e.g., "Estimate Summary", "Markups", "Detailed Estimate"). 
- When asked to provide a summary or detailed breakdown, read through EVERY tab to aggregate total costs, GFAs, markups, and project details exactly as requested.

FORMATTING INSTRUCTIONS:
- Replicate the format of formal construction estimate reports. 
- Use clean spacing, bold headers, and structured markdown tables when listing project summaries, elements, direct costs, and markups.
- Ensure all currency values are correctly formatted (e.g., $9,673,999.64).
- Be direct and data-driven — quote actual numbers from documents.`

const DOCUMENT_KEYWORDS = [
  'project', 'cost', 'estimate', 'document', 'sheet', 'rate', 'material',
  'labor', 'permit', 'tax', 'price', 'budget', 'excel', 'file', 'data',
  'uploaded', 'invoice', 'quote', 'bid', 'scope', 'vendor', 'contract',
  'summary', 'breakdown', 'total', 'amount', 'fee', 'expense', 'report',
  'tab'
]

export type Msg = { role: "user" | "assistant"; content: string }

export async function ragStream(userMessage: string, history: Msg[], chatId?: string) {
  const isDocumentQuery = DOCUMENT_KEYWORDS.some(k =>
    userMessage.toLowerCase().includes(k)
  )

  let systemPrompt = SYSTEM

  if (isDocumentQuery) {
    const allDocs = await db.documentContent.findMany({
      include: { document: { select: { name: true, projectName: true, temporary: true, chatId: true } } },
      orderBy: { createdAt: "desc" },
      take: 10,
    })

    const docs = allDocs.filter(d => {
      if (!d.document) return false
      if (!d.document.temporary) return true
      if (d.document.temporary && d.document.chatId === chatId) return true
      return false
    })

    if (docs.length > 0) {
      const context = docs.map(d =>
        `=== WORKBOOK: ${d.document!.projectName || d.document!.name} ===\n${d.content}`
      ).join("\n\n")
      systemPrompt = `${SYSTEM}\n\nUPLOADED DOCUMENTS (WITH ALL TABS):\n${context}`
    }
  }

  const messages: Anthropic.MessageParam[] = [
    ...history.slice(-10).map(m => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user", content: userMessage },
  ]

  const stream = await anthropic.messages.stream({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 4000, // Increased to support very detailed, multi-tab summary generations
    system: systemPrompt,
    messages,
  })

  async function* tokens() {
    for await (const ev of stream) {
      if (ev.type === "content_block_delta" && ev.delta.type === "text_delta") {
        yield ev.delta.text
      }
    }
  }

  return { tokens: tokens(), sources: [] as string[] }
}