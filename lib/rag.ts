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
6. Reference the sheet name when citing data
7. If answer isn't in the documents → say "This information is not in the uploaded documents"

UPLOADED FILES:`

const SYSTEM_NO_DOCS = `You are an estimating buddy — the internal AI assistant for a construction cost management company, built by Om More.

IDENTITY: If asked who built or created you, say: "Om More developed me and created me to help estimators working in construction companies." Never mention Anthropic or Claude.

No documents are currently uploaded. Answer general construction cost questions helpfully. For project-specific data, ask the user to upload their Excel estimate file using the 📎 button or the Documents section.`

export type Msg = { role: "user" | "assistant"; content: string }

function selectRelevantSheets(content: string, userMessage: string): string {
  const msgLower = userMessage.toLowerCase()
  const sheetSections = content.split(/(?=\n?=== Sheet: )/).filter(s => s.trim())

  if (sheetSections.length <= 1) return content.slice(0, 20000)

  const selected: string[] = []
  const large: string[] = []

  for (const section of sheetSections) {
    const nameMatch = section.match(/=== Sheet: (.+?) ===/)
    const sheetName = (nameMatch?.[1] ?? "").toLowerCase()

    if (section.length < 4000) { selected.push(section); continue }

    const isAskedFor =
      msgLower.includes(sheetName) ||
      (sheetName.includes("summary") && (msgLower.includes("summary") || msgLower.includes("total") || msgLower.includes("overview") || msgLower.includes("summarize"))) ||
      (sheetName.includes("building") && (msgLower.includes("building") || msgLower.includes("construct"))) ||
      (sheetName.includes("site") && msgLower.includes("site")) ||
      (sheetName.includes("csi") && (msgLower.includes("csi") || msgLower.includes("division") || msgLower.includes("breakdown") || msgLower.includes("detail"))) ||
      (sheetName.includes("initial") && msgLower.includes("initial")) ||
      (sheetName.includes("total vr") && (msgLower.includes("variance") || msgLower.includes(" vr") || msgLower.includes("total vr"))) ||
      (sheetName.includes("cover") && (msgLower.includes("cover") || msgLower.includes("project info")))

    if (isAskedFor) selected.push(section)
    else large.push(section)
  }

  if (selected.filter(s => s.length >= 4000).length === 0 && large.length > 0) {
    selected.push(large[0].slice(0, 8000) + "\n\n[Sheet truncated — ask specifically about this sheet for full details]")
  }

  const result = selected.join("\n\n")
  return result.length > 25000 ? result.slice(0, 25000) + "\n\n[Content truncated]" : result
}

export async function ragStream(
  userMessage: string,
  history: Msg[],
  chatId?: string,
  activeDocIds?: string[] // IDs of docs user has selected
) {
  const allDocs = await db.documentContent.findMany({
    include: {
      document: {
        select: { id: true, name: true, projectName: true, temporary: true, chatId: true }
      }
    },
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

  // Filter by user-selected doc IDs if provided
  if (activeDocIds && activeDocIds.length > 0) {
    const permanentDocs = docs.filter(d => !d.document?.temporary)
    const tempDocs = docs.filter(d => d.document?.temporary)
    // Apply selection filter only to permanent docs — always include temp docs for this chat
    const filteredPermanent = permanentDocs.filter(d => activeDocIds.includes(d.document!.id))
    docs = [...filteredPermanent, ...tempDocs]
  }

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