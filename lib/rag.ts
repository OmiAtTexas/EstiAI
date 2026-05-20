import Groq from "groq-sdk"
import { db } from "./db"

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! })

const SYSTEM = `You are EstimateAI, the internal AI assistant for a construction cost management consultancy. You help estimators find and compare data from uploaded project Excel documents.

When answering:
- Answer based ONLY on the document data provided below
- Be direct and data-driven — quote actual numbers from documents
- Use markdown tables when comparing projects or showing cost breakdowns
- Always mention which document/sheet your answer is from
- If the documents don't contain the answer, say so clearly — never invent numbers`

const GENERAL_SYSTEM = `You are EstimateAI, the internal AI assistant for a construction cost management consultancy. You help estimators with questions about construction costs, labor rates, materials, taxes, permits, and project comparisons.

When answering:
- Be direct and helpful
- Use markdown tables when comparing data
- Keep answers focused and useful for construction estimators
- If the user asks about specific project data, let them know they can upload Excel files via the Documents section`

const DOCUMENT_KEYWORDS = [
  'project', 'cost', 'estimate', 'document', 'sheet', 'rate', 'material',
  'labor', 'permit', 'tax', 'price', 'budget', 'excel', 'file', 'data',
  'uploaded', 'invoice', 'quote', 'bid', 'scope', 'vendor', 'contract',
  'summary', 'breakdown', 'total', 'amount', 'fee', 'expense', 'report',
  'warehouse', 'residential', 'commercial', 'sitework', 'parking'
]

export type Msg = { role: "user" | "assistant"; content: string }

export async function ragStream(userMessage: string, history: Msg[], chatId?: string) {
  const isDocumentQuery = DOCUMENT_KEYWORDS.some(k =>
    userMessage.toLowerCase().includes(k)
  )

  let systemPrompt = GENERAL_SYSTEM
  let sources: string[] = []

  if (isDocumentQuery) {
    // Load permanent docs + temporary docs for this specific chat
    const allDocs = await db.documentContent.findMany({
      include: { document: { select: { name: true, projectName: true, temporary: true, chatId: true } } },
      orderBy: { createdAt: "desc" },
      take: 10,
    })

    const docs = allDocs.filter(d => {
      if (!d.document) return false
      if (!d.document.temporary) return true // always include permanent docs
      if (d.document.temporary && d.document.chatId === chatId) return true // include temp docs for this chat
      return false
    })

    if (docs.length > 0) {
      const context = docs.map(d =>
        `=== ${d.document!.projectName || d.document!.name}${d.document!.temporary ? " [Chat only]" : ""} ===\n${d.content}`
      ).join("\n\n")

      systemPrompt = `${SYSTEM}\n\nUPLOADED DOCUMENTS:\n${context}`
      sources = docs.map(d => d.document!.name)
    }
  }

  const messages = [
    { role: "system" as const, content: systemPrompt },
    ...history.slice(-10).map(m => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user" as const, content: userMessage },
  ]

  const stream = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages,
    max_tokens: 2048,
    temperature: 0.3,
    stream: true,
  })

  async function* tokens() {
    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content
      if (text) yield text
    }
  }

  return { tokens: tokens(), sources }
}