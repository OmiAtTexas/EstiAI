import Anthropic from "@anthropic-ai/sdk"
import { db } from "./db"

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

const SYSTEM_WITH_DOCS = `You are an estimating buddy — the internal AI assistant for a construction cost management company, built by Om More.

IDENTITY: If asked who built or created you, say: "Om More developed me and created me to help estimators working in construction companies." Never mention Anthropic or Claude.

CRITICAL RULES:
1. ONLY reference documents explicitly provided below. Never mention any other files.
2. Read EVERY sheet, EVERY row, EVERY cell — no detail is too small.
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

No documents uploaded yet. Ask the user to upload an Excel file using the 📎 button.`

export type Msg = { role: "user" | "assistant"; content: string }

function buildContext(content: string, userMessage: string): string {
  const msgLower = userMessage.toLowerCase()
  const sheetSections = content.split(/(?=\n?=== Sheet: )/).filter(s => s.trim())

  if (sheetSections.length <= 1) {
    // Single sheet or no sheet markers — send everything, no truncation
    return content
  }

  // If user asks about a specific sheet — send it COMPLETELY, no cuts
  for (const section of sheetSections) {
    const nameMatch = section.match(/=== Sheet: (.+?) ===/)
    const sheetName = (nameMatch?.[1] ?? "").toLowerCase()
    if (sheetName && msgLower.includes(sheetName)) {
      // Send the full requested sheet + all small sheets
      const smallSheets = sheetSections.filter(s => s !== section && s.length < 5000)
      const full = [section, ...smallSheets].join("\n\n")
      // Only hard cap at 120000 chars (~30k tokens) — way above normal sheet sizes
      return full.length > 120000 ? full.slice(0, 120000) : full
    }
  }

  // General question — send ALL sheets
  // Small sheets: send fully
  // Large sheets: send proportionally but generously (10000 chars each minimum)
  const totalContent = sheetSections.join("\n\n")
  const TOTAL_BUDGET = 80000 // ~20k tokens — generous budget for full reading

  if (totalContent.length <= TOTAL_BUDGET) {
    // Everything fits — send everything with zero truncation
    return totalContent
  }

  // Need to trim — allocate budget proportionally
  const small = sheetSections.filter(s => s.length <= 5000)
  const large = sheetSections.filter(s => s.length > 5000)
  const smallTotal = small.reduce((sum, s) => sum + s.length, 0)
  const remaining = TOTAL_BUDGET - smallTotal

  if (large.length === 0) return totalContent.slice(0, TOTAL_BUDGET)

  const perSheet = Math.floor(remaining / large.length)
  const trimmed = large.map(s =>
    s.length <= perSheet
      ? s
      : s.slice(0, perSheet) + `\n...[ask specifically about this sheet for complete details]`
  )

  return [...small, ...trimmed].join("\n\n")
}

export async function ragStream(
  userMessage: string,
  history: Msg[],
  chatId?: string,
  activeDocIds?: string[],
  userId?: string
) {
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

    if (docs.length > 1) {
      // Check if user mentioned a specific doc
      const mentionedDoc = docs.find((d: any) => {
        const name = (d.document!.projectName || d.document!.name).toLowerCase()
        const filename = d.document!.name.toLowerCase().replace(/\.[^.]+$/, "")
        return msgLower.includes(name) || msgLower.includes(filename)
      })

      if (mentionedDoc) {
        const name = mentionedDoc.document!.projectName || mentionedDoc.document!.name
        const context = `\n${"=".repeat(60)}\nFILE: ${name}\n${"=".repeat(60)}\n${buildContext(mentionedDoc.content, userMessage)}`
        systemPrompt = `${SYSTEM_WITH_DOCS}\n${context}`
      } else {
        // Multiple docs, user didn't specify — include all, instruct AI to ask
        const docList = docs.map((d: any) => d.document!.projectName || d.document!.name).join(", ")
        const context = docs.map((d: any) => {
          const name = d.document!.projectName || d.document!.name
          return `\n${"=".repeat(60)}\nFILE: ${name}\n${"=".repeat(60)}\n${buildContext(d.content, userMessage)}`
        }).join("\n\n")
        systemPrompt = `${SYSTEM_WITH_DOCS}\n${context}\n\nNOTE: Multiple documents uploaded (${docList}). If the question is ambiguous, ask which document they mean before answering.`
      }
    } else {
      // Single doc — always use it fully
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
    max_tokens: 4096,
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