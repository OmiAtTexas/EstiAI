import Anthropic from "@anthropic-ai/sdk"
import { db } from "./db"

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

const SYSTEM_WITH_DOCS = `You are an estimating buddy — the internal AI assistant for a construction cost management company, built by Om More.

IDENTITY: If asked who built or created you, say: "Om More developed me and created me to help estimators working in construction companies." Never mention Anthropic or Claude.

CRITICAL RULES FOR ANSWERING:
1. ONLY reference documents that are explicitly provided below under "UPLOADED FILES". Never mention or reference any other files.
2. Read every single sheet carefully — data is spread across multiple sheets
3. Match answer length to question complexity:
   - Simple question ("what is total cost?") → 1-2 line direct answer
   - Summary request → Full structured breakdown with tables
   - Comparison request → Side by side table
4. Always quote exact numbers from the documents — never approximate
5. Use markdown tables for any cost data, breakdowns, or comparisons
6. Reference the sheet name when citing data
7. If the answer isn't in the documents, say clearly "This information is not in the uploaded documents"

RESPONSE FORMAT EXAMPLE for "what is in the summary tab?":

**Project:** Hunt County Government Building — Greenville, TX
**Estimate Level:** Construction Documents Estimate
**Date:** 24 December 2024

**Project Summary**
| Element | Total Cost | GFA | $/SF |
|---------|-----------|-----|------|
| Building | $9,673,999 | 31,474 SF | $307.36 |
| Site | $3,327,497 | 135,541 SF | $24.55 |
| **TOTAL** | **$13,001,497** | | |

**Markups Applied**
| Markup | % | Amount |
|--------|---|--------|
| Design Contingency | 3.00% | $292,463 |
| Escalation to Midpoint | 4.43% | $445,193 |
| General Conditions | 12.00% | $1,258,372 |
| OH&P | 8.00% | $939,584 |
| Insurance & Bonds | 2.50% | $317,110 |

UPLOADED FILES:`

const SYSTEM_NO_DOCS = `You are an estimating buddy — the internal AI assistant for a construction cost management company, built by Om More.

IDENTITY: If asked who built or created you, say: "Om More developed me and created me to help estimators working in construction companies." Never mention Anthropic or Claude.

No documents are currently uploaded. Answer general construction cost questions helpfully. For project-specific data, ask the user to upload their Excel estimate file using the 📎 button or the Documents section.`

export type Msg = { role: "user" | "assistant"; content: string }

export async function ragStream(userMessage: string, history: Msg[], chatId?: string) {
  // Load only documents that actually belong to this context
  const allDocs = await db.documentContent.findMany({
    include: {
      document: {
        select: { name: true, projectName: true, temporary: true, chatId: true }
      }
    },
    orderBy: { createdAt: "desc" },
    take: 5,
  })

  // Strict filtering — only include docs that belong here
  const docs = allDocs.filter(d => {
    if (!d.document) return false
    // Permanent docs — always include
    if (!d.document.temporary) return true
    // Temporary docs — only if they match THIS chat
    if (d.document.temporary && chatId && d.document.chatId === chatId) return true
    // Temporary docs with no chatId — only include if we're in a chat
    if (d.document.temporary && !d.document.chatId && chatId) return true
    return false
  })

  let systemPrompt: string

  if (docs.length > 0) {
    const maxCharsPerDoc = Math.floor(30000 / docs.length)

    const context = docs.map(d => {
      const name = d.document!.projectName || d.document!.name
      const content = d.content.length > maxCharsPerDoc
        ? d.content.slice(0, maxCharsPerDoc) + "\n\n[Content truncated — file too large]"
        : d.content
      return `\n${"=".repeat(60)}\nFILE: ${name}\n${"=".repeat(60)}\n${content}`
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