import Anthropic from "@anthropic-ai/sdk"
import { db } from "./db"

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

const SYSTEM_WITH_DOCS = `You are an estimating buddy — the internal AI assistant for a construction cost management company, built by Om More.

IDENTITY: If asked who built or created you, say: "Om More developed me and created me to help estimators working in construction companies." Never mention Anthropic or Claude.

CRITICAL RULES:
1. ONLY reference documents explicitly provided below. Never mention files not shown.
2. Read every sheet provided carefully — data spans multiple sheets
3. Match answer length to the question:
   - Simple question → direct 1-2 line answer with the number
   - "what is in X tab/sheet" → full structured breakdown of that sheet with tables
   - Summary request → full structured breakdown with all key tables
   - Comparison → side by side table
4. Always quote exact numbers — never approximate
5. Use markdown tables for cost data, breakdowns, comparisons
6. Reference the sheet name when citing data (e.g. "From the Summary sheet:")
7. If answer isn't in the documents → say "This information is not in the uploaded documents"

UPLOADED FILES:`

const SYSTEM_NO_DOCS = `You are an estimating buddy — the internal AI assistant for a construction cost management company, built by Om More.

IDENTITY: If asked who built or created you, say: "Om More developed me and created me to help estimators working in construction companies." Never mention Anthropic or Claude.

No documents are currently uploaded. Answer general construction cost questions helpfully. For project-specific data, ask the user to upload their Excel estimate file using the 📎 button or the Documents section in the sidebar.`

export type Msg = { role: "user" | "assistant"; content: string }

function selectRelevantSheets(content: string, userMessage: string): string {
  const msgLower = userMessage.toLowerCase()

  // Split content into individual sheets
  const sheetSections = content.split(/(?=\n?=== Sheet: )/).filter(s => s.trim())

  if (sheetSections.length <= 1) {
    // Only one sheet — return up to 20000 chars
    return content.slice(0, 20000)
  }

  const selected: string[] = []
  const large: string[] = []

  for (const section of sheetSections) {
    const nameMatch = section.match(/=== Sheet: (.+?) ===/)
    const sheetName = (nameMatch?.[1] ?? "").toLowerCase()

    // Always include small sheets (under 4000 chars)
    if (section.length < 4000) {
      selected.push(section)
      continue
    }

    // For large sheets, check if user is asking about them
    const isAskedFor =
      msgLower.includes(sheetName) ||
      (sheetName.includes("summary") && (msgLower.includes("summary") || msgLower.includes("total") || msgLower.includes("overview") || msgLower.includes("summarize"))) ||
      (sheetName.includes("building") && (msgLower.includes("building") || msgLower.includes("construct"))) ||
      (sheetName.includes("site") && msgLower.includes("site")) ||
      (sheetName.includes("csi") && (msgLower.includes("csi") || msgLower.includes("division") || msgLower.includes("breakdown") || msgLower.includes("detail"))) ||
      (sheetName.includes("initial") && msgLower.includes("initial")) ||
      (sheetName.includes("total vr") && (msgLower.includes("variance") || msgLower.includes(" vr") || msgLower.includes("total vr"))) ||
      (sheetName.includes("cover") && (msgLower.includes("cover") || msgLower.includes("project info")))

    if (isAskedFor) {
      selected.push(section)
    } else {
      large.push(section)
    }
  }

  // If nothing specifically selected, include all small sheets + first large sheet truncated
  if (selected.filter(s => s.length >= 4000).length === 0 && large.length > 0) {
    selected.push(large[0].slice(0, 8000) + "\n\n[Sheet truncated — ask specifically about this sheet for full details]")
  }

  const result = selected.join("\n\n")

  // Hard cap at 25000 chars to stay within token limits
  return result.length > 25000 ? result.slice(0, 25000) + "\n\n[Content truncated]" : result
}

export async function ragStream(userMessage: string, history: Msg[], chatId?: string) {
  // Load documents for this context
  const allDocs = await db.documentContent.findMany({
    include: {
      document: {
        select: { name: true, projectName: true, temporary: true, chatId: true }
      }
    },
    orderBy: { createdAt: "desc" },
    take: 5,
  })

  // Strict filtering
  const docs = allDocs.filter(d => {
    if (!d.document) return false
    if (!d.document.temporary) return true
    if (d.document.temporary && chatId && d.document.chatId === chatId) return true
    if (d.document.temporary && !d.document.chatId && chatId) return true
    return false
  })

  let systemPrompt: string

  if (docs.length > 0) {
    const context = docs.map(d => {
      const name = d.document!.projectName || d.document!.name
      const relevantContent = selectRelevantSheets(d.content, userMessage)
      return `\n${"=".repeat(60)}\nFILE: ${name}\n${"=".repeat(60)}\n${relevantContent}`
    }).join("\n\n")

    systemPrompt = `${SYSTEM_WITH_DOCS}\n${context}`
  } else {
    systemPrompt = SYSTEM_NO_DOCS
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