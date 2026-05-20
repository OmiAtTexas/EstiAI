import { Pinecone } from "@pinecone-database/pinecone"

let _client: Pinecone | null = null
const getClient = () => (_client ??= new Pinecone({ apiKey: process.env.PINECONE_API_KEY! }))
const getIndex = () => getClient().index(process.env.PINECONE_INDEX || "construction-docs")

type Chunk = {
  id: string
  embedding: number[]
  text: string
  documentId: string
  documentName: string
  projectName?: string
  location?: string
  chunkIndex: number
}

export async function upsertChunks(chunks: Chunk[]) {
  const index = getIndex()
  const vectors = chunks.map((c) => ({
    id: c.id,
    values: c.embedding,
    metadata: {
      text: c.text,
      documentId: c.documentId,
      documentName: c.documentName,
      projectName: c.projectName ?? "",
      location: c.location ?? "",
      chunkIndex: c.chunkIndex,
    },
  }))
  // Pinecone max batch = 100
  for (let i = 0; i < vectors.length; i += 100) {
    await index.upsert(vectors.slice(i, i + 100))
  }
}

export async function searchChunks(queryEmbedding: number[], topK = 6) {
  const index = getIndex()
  const res = await index.query({ vector: queryEmbedding, topK, includeMetadata: true })
  return (res.matches ?? [])
    .filter((m) => (m.score ?? 0) > 0.25)
    .map((m) => ({
      text: String(m.metadata?.text ?? ""),
      documentName: String(m.metadata?.documentName ?? ""),
      projectName: String(m.metadata?.projectName ?? ""),
      location: String(m.metadata?.location ?? ""),
      score: m.score ?? 0,
    }))
}

export async function deleteDocumentChunks(documentId: string) {
  try {
    await getIndex().deleteMany({ documentId } as any)
  } catch {
    // Pinecone free tier may not support filtered deletes — ignore
  }
}
