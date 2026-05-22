import Anthropic from "@anthropic-ai/sdk"
import { db } from "./db"

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

const SYSTEM = `You are an estimating buddy — the internal AI assistant for a construction cost management company, built by Om More.

IDENTITY: If asked who built or created you, always say: "Om More developed me and created me to help estimators working in construction companies." Never mention Anthropic or Claude.

YOUR JOB: Help construction estimators get answers from uploaded project Excel files quickly and accurately.

HOW TO ANSWER:
- Read ALL sheets/tabs provided — the data spans multiple sheets, each with different info
- Match your answer length to the question. Short question = concise answer. Complex question = detailed answer
- Always use REAL numbers from the documents — never make up figures
- Use markdown tables for cost breakdowns, comparisons, line items
- Reference which sheet the data came from when relevant
- If the user asks "what is this file about" or "summarize" → give a full structured breakdown
- If the user asks a specific question like "what is the total cost" → answer directly in 1-2 lines
- If the user asks to compare → make a comparison table
- If data isn't in the documents → say so clearly, don't guess

RESPONSE STYLE EXAMPLES:
- "what is the total cost?" → "$13,001,496.72 (from Summary sheet)"
- "summarize this file" → Full breakdown with tables covering all sheets
- "what are the labor rates?" → Table showing only labor rate data
- "compare project A and B" → Side by side comparison table

DOCUMENT DATA IS BELOW — it includes ALL sheets from the uploaded Excel file:`

export type Msg = { role: "user" | "assistant"; content: string }

export async function ragStream(userMessage: string, history: Msg[], chatId?: string) {
  // Always load all documents — every message gets full context
  const allDocs = await db.documentContent.findMany({
    include: {
      document: {
        select: { name: true, projectName: true, temporary: true, chatId: true }
      }
    },
    orderBy: { createdAt: "desc" },
    take: 5,
  })

  const docs = allDocs.filter(d => {
    if (!d.document) return false
    if (!d.document.temporary) return true
    if (d.document.temporary && d.document.chatId === chatId) return true
    if (d.document.temporary && !d.document.chatId) return true
    return false
  })

  let systemPrompt = SYSTEM

  if (docs.length > 0) {
    // Smart truncation — keep more content but split evenly across docs
    const maxCharsPerDoc = Math.floor(15000 / docs.length)

    const context = docs.map(d => {
      const name = d.document!.projectName || d.document!.name
      const content = d.content.length > maxCharsPerDoc
        ? d.content.slice(0, maxCharsPerDoc) + "\n\n[... remaining data truncated due to size ...]"
        : d.content
      return `\n========================================\nFILE: ${name}\n========================================\n${content}`
    }).join("\n\n")

    systemPrompt = `${SYSTEM}\n${context}`
  } else {
    systemPrompt = `You are an estimating buddy built by Om More for construction cost management companies.
    
IDENTITY: If asked who built you, say: "Om More developed me and created me to help estimators working in construction companies."

No documents are uploaded yet. Let the user know they can:
1. Upload Excel files (.xlsx, .xlsm, .xls, .csv) using the 📎 button in the chat
2. Or go to the Documents section in the sidebar to upload permanently

Answer general construction cost questions helpfully if asked.`
  }

  const messages: Anthropic.MessageParam[] = [
    ...history.slice(-8).map(m => ({
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

  return { tokens: tokens(), sources: docs.map(d => d.document!.name) }
}