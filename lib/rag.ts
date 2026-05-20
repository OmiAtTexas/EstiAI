import Anthropic from "@anthropic-ai/sdk"
import { db } from "./db"

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

const SYSTEM = `You are EstimateAI, the internal AI assistant for a construction cost management consultancy. You help estimators find and compare data from uploaded project Excel documents.

When answering:
- Be direct and data-driven — quote actual numbers from documents
- Use markdown tables when comparing projects or showing cost breakdowns
- Keep answers focused and useful for construction estimators
- If asked about specific project data, reference the uploaded documents`

const DOCUMENT_KEYWORDS = [
  'project', 'cost', 'estimate', 'document', 'sheet', 'rate', 'material',
  'labor', 'permit', 'tax', 'price', 'budget', 'excel', 'file', 'data',
  'uploaded', 'invoice', 'quote', 'bid', 'scope', 'vendor', 'contract',
  'summary', 'breakdown', 'total', 'amount', 'fee', 'expense', 'report'
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
        `=== ${d.document!.projectName || d.document!.name} ===\n${d.content}`
      ).join("\n\n")
      systemPrompt = `${SYSTEM}\n\nUPLOADED DOCUMENTS:\n${context}`
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
    max_tokens: 2048,
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