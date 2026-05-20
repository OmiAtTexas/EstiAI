import Anthropic from "@anthropic-ai/sdk"
import { embedText } from "./embeddings"
import { searchChunks } from "./pinecone"

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

const SYSTEM = `You are EstimateAI — the internal cost intelligence assistant for a construction management consultancy. You help estimators instantly retrieve and compare data from the company's past project documents.

RULES:
- Answer ONLY from the project document context provided below each query.
- Be direct and data-driven. Lead with numbers, not preamble.
- When comparing across projects, always use a markdown table.
- End every response with: *Sources: [document names]*
- If the context doesn't contain enough information, say: "I couldn't find that in the uploaded project documents."
- Never fabricate costs, rates, or figures.`

export type Msg = { role: "user" | "assistant"; content: string }

export async function ragStream(userMessage: string, history: Msg[]) {
  const embedding = await embedText(userMessage)
  const chunks = await searchChunks(embedding, 6)
  const sources = [...new Set(chunks.map((c) => c.documentName))]

  const context =
    chunks.length === 0
      ? "No relevant project documents found. Ask the user to upload documents first."
      : chunks
          .map(
            (c, i) =>
              `[Doc ${i + 1}: ${c.documentName}${c.projectName ? ` — ${c.projectName}` : ""}${c.location ? ` (${c.location})` : ""}]\n${c.text}`
          )
          .join("\n\n---\n\n")

  const messages: Anthropic.MessageParam[] = [
    ...history.slice(-10).map((m) => ({ role: m.role, content: m.content })),
    {
      role: "user",
      content: `RETRIEVED CONTEXT:\n${context}\n\nQUESTION: ${userMessage}`,
    },
  ]

  const stream = await anthropic.messages.stream({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2048,
    system: SYSTEM,
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
