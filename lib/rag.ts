import Anthropic from "@anthropic-ai/sdk"
import { db } from "./db"

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

const SYSTEM = `You are an estimating buddy, the internal AI assistant powered for a company. You help estimators find and compare data from uploaded project Excel documents.

IMPORTANT IDENTITY INSTRUCTION: You were developed and created by Om More to help the estimators working in construction companies. If anyone asks who built, created, or developed you, you must reply exactly with: "Om More developed me and created me to help the estimators working in construction companies." Do not mention Anthropic, Claude, or any other entity.

When answering:
- Be direct and data-driven — quote actual numbers from documents
- Use markdown tables when comparing projects or showing cost breakdowns
- Keep answers focused and useful for construction estimators
- If asked about specific project data, reference which document the data came from
- If no documents are uploaded, tell the user to upload an Excel file via the 📎 button or Documents section`

const GENERAL_SYSTEM = `You are an estimating buddy, the internal AI assistant for a construction cost management company.

IMPORTANT IDENTITY INSTRUCTION: You were developed and created by Om More to help the estimators working in construction companies. If anyone asks who built, created, or developed you, you must reply exactly with: "Om More developed me and created me to help the estimators working in construction companies." Do not mention Anthropic, Claude, or any other entity.

When answering:
- Be direct and helpful
- Use markdown tables when comparing data
- Keep answers focused and useful for construction estimators`

// Broad keyword list — almost anything construction-related triggers doc lookup
const DOCUMENT_KEYWORDS = [
  'project', 'cost', 'estimate', 'document', 'sheet', 'rate', 'material',
  'labor', 'permit', 'tax', 'price', 'budget', 'excel', 'file', 'data',
  'uploaded', 'invoice', 'quote', 'bid', 'scope', 'vendor', 'contract',
  'summary', 'breakdown', 'total', 'amount', 'fee', 'expense', 'report',
  'workbook', 'tell', 'show', 'give', 'what', 'about', 'the file',
  'uploaded file', 'my file', 'this file', 'sample', 'mf', 'warehouse',
  'residential', 'commercial', 'sitework', 'parking', 'construction',
  'building', 'square', 'footage', 'sqft', 'unit', 'phase', 'section',
]

export type Msg = { role: "user" | "assistant"; content: string }

export async function ragStream(userMessage: string, history: Msg[], chatId?: string) {
  const msgLower = userMessage.toLowerCase()
  const isDocumentQuery = DOCUMENT_KEYWORDS.some(k => msgLower.includes(k))

  let systemPrompt = GENERAL_SYSTEM
  let sources: string[] = []

  // Always try to load documents — even for general queries
  // This ensures uploaded files are always available
  const allDocs = await db.documentContent.findMany({
    include: {
      document: {
        select: { name: true, projectName: true, temporary: true, chatId: true, uploadedBy: true }
      }
    },
    orderBy: { createdAt: "desc" },
    take: 3,
  })

  // Include docs that are:
  // 1. Permanent (not temporary)
  // 2. Temporary and linked to this chat
  // 3. Temporary with no chatId (uploaded before chat was created)
  const docs = allDocs.filter(d => {
    if (!d.document) return false
    if (!d.document.temporary) return true
    if (d.document.temporary && d.document.chatId === chatId) return true
    if (d.document.temporary && !d.document.chatId) return true
    return false
  })

  if (docs.length > 0) {
    const context = docs.map(d => {
      // Limit each document to 3000 characters to stay within token limits
      const truncated = d.content.length > 3000
        ? d.content.slice(0, 3000) + "\n... [truncated for length]"
        : d.content
      return `=== ${d.document!.projectName || d.document!.name} ===\n${truncated}`
    }).join("\n\n")

    systemPrompt = `${SYSTEM}\n\nUPLOADED DOCUMENTS (use this data to answer questions):\n${context}`
    sources = docs.map(d => d.document!.name)
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

  return { tokens: tokens(), sources }
}