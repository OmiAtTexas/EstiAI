import { GoogleGenerativeAI } from "@google/generative-ai"

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

const SYSTEM = `You are EstimateAI, the internal AI assistant for a construction cost management consultancy. You help estimators with questions about construction costs, labor rates, materials, taxes, permits, and project comparisons.

When answering:
- Be direct and data-driven
- Use markdown tables when comparing data
- Keep answers focused and useful for construction estimators
- If asked about specific project data, let the user know they can upload documents via the Documents section`

export type Msg = { role: "user" | "assistant"; content: string }

export async function ragStream(userMessage: string, history: Msg[]) {
  const model = genAI.getGenerativeModel({
    model: "models/gemini-2.5-flash",
    systemInstruction: SYSTEM,
  })

  const geminiHistory = history.slice(-10).map(m => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }))

  const chat = model.startChat({
    history: geminiHistory,
    generationConfig: {
      maxOutputTokens: 2048,
      temperature: 0.3,
    },
  })

  const result = await chat.sendMessageStream(userMessage)

  async function* tokens() {
    for await (const chunk of result.stream) {
      const text = chunk.text()
      if (text) yield text
    }
  }

  return { tokens: tokens(), sources: [] }
}