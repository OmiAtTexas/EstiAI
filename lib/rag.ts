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
8. Scan ALL sheets before answering

DASHBOARD INSTRUCTIONS:
After EVERY response that contains numbers, costs, or data from documents, you MUST append a <dashboard> JSON block at the very end of your response. This powers a live visual dashboard.

The JSON format:
<dashboard>
{
  "title": "Short project name",
  "metrics": [
    {"label": "Total Cost", "value": "$13.0M", "sub": "$413/SF"},
    {"label": "Building", "value": "$9.7M"},
    {"label": "Site", "value": "$3.3M"},
    {"label": "Contingency", "value": "3%", "color": "#ef4444"}
  ],
  "bars": [
    {"label": "Finishes", "value": 1272458, "max": 1272458},
    {"label": "HVAC", "value": 1192454, "max": 1272458},
    {"label": "Concrete", "value": 531632, "max": 1272458}
  ],
  "flags": [
    "Contingency at 3% — below recommended 8-10%",
    "Escalation rate hardcoded — should recalculate"
  ]
}
</dashboard>

RULES FOR DASHBOARD JSON:
- metrics: up to 4 key numbers from the answer. value must be a formatted string like "$13.0M" or "4.43%"
- bars: up to 6 items. value and max must be raw numbers (not strings). max = the largest value in the list
- flags: only include if there are genuine concerns/issues. Empty array [] if none
- If the question has no numbers (e.g. "what does escalation mean?") → omit the <dashboard> block entirely
- The <dashboard> block must be valid JSON. Do not add comments inside it.

UPLOADED FILES:`

const SYSTEM_NO_DOCS = `You are an estimating buddy — the internal AI assistant for a construction cost management company, built by Om More.

IDENTITY: If asked who built or created you, say: "Om More developed me and created me to help estimators working in construction companies." Never mention Anthropic or Claude.

No documents uploaded yet. Ask the user to upload an Excel file using the 📎 button.`

export type Msg = { role: "user" | "assistant"; content: string }

function buildContext(content: string, userMessage: string): string {
  const msgLower = userMessage.toLowerCase()
  const sheetSections = content.split(/(?=\n?=== Sheet: )/).filter(s => s.trim())

  if (sheetSections.length <= 1) return content

  for (const section of sheetSections) {
    const nameMatch = section.match(/=== Sheet: (.+?) ===/)
    const sheetName = (nameMatch?.[1] ?? "").toLowerCase()
    if (sheetName && msgLower.includes(sheetName)) {
      const smallSheets = sheetSections.filter(s => s !== section && s.length < 5000)
      const full = [section, ...smallSheets].join("\n\n")
      return full.length > 120000 ? full.slice(0, 120000) : full
    }
  }

  const BUDGET = 80000
  const totalContent = sheetSections.join("\n\n")
  if (totalContent.length <= BUDGET) return totalContent

  const small = sheetSections.filter(s => s.length <= 5000)
  const large = sheetSections.filter(s => s.length > 5000)
  const smallTotal = small.reduce((sum, s) => sum + s.length, 0)
  const remaining = BUDGET - smallTotal
  if (large.length === 0) return totalContent.slice(0, BUDGET)
  const perSheet = Math.floor(remaining / large.length)
  const trimmed = large.map(s =>
    s.length <= perSheet ? s : s.slice(0, perSheet) + `\n...[ask specifically about this sheet for complete details]`
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
        const docList = docs.map((d: any) => d.document!.projectName || d.document!.name).join(", ")
        const context = docs.map((d: any) => {
          const name = d.document!.projectName || d.document!.name
          return `\n${"=".repeat(60)}\nFILE: ${name}\n${"=".repeat(60)}\n${buildContext(d.content, userMessage)}`
        }).join("\n\n")
        systemPrompt = `${SYSTEM_WITH_DOCS}\n${context}\n\nNOTE: Multiple documents uploaded (${docList}). If the question is ambiguous, ask which document they mean before answering.`
      }
    } else {
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