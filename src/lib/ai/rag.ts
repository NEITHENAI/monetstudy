export function chunkText(text: string, chunkSize = 1500, overlap = 300): string[] {
  const chunks: string[] = [];
  let i = 0;
  while (i < text.length) {
    chunks.push(text.slice(i, i + chunkSize));
    i += chunkSize - overlap;
  }
  return chunks;
}

export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function getEmbedding(text: string): Promise<number[]> {
  const geminiKey = process.env.GEMINI_API_KEY || 'AIzaSyDb0Io4DWYrFOwJ3vZw8RFM1L4C3RdRPq8';
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${geminiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'models/text-embedding-004',
        content: { parts: [{ text }] },
      }),
    });
    if (!res.ok) throw new Error('Failed to get embedding');
    const data = await res.json();
    return data.embedding.values;
  } catch (e) {
    console.error('Embedding error:', e);
    return [];
  }
}

export async function batchEmbed(chunks: string[]): Promise<number[][]> {
  const geminiKey = process.env.GEMINI_API_KEY || 'AIzaSyDb0Io4DWYrFOwJ3vZw8RFM1L4C3RdRPq8';
  const embeddings: number[][] = [];
  
  // Batch in groups of 100 as per Gemini limits
  const BATCH_SIZE = 100;
  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:batchEmbedContents?key=${geminiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: batch.map(text => ({
            model: 'models/text-embedding-004',
            content: { parts: [{ text }] },
          })),
        }),
      });
      if (!res.ok) throw new Error('Batch embedding failed');
      const data = await res.json();
      embeddings.push(...data.embeddings.map((e: any) => e.values));
    } catch (e) {
      console.error('Batch embedding error:', e);
      // Fallback: fill with empty arrays to keep length matched
      embeddings.push(...Array(batch.length).fill([]));
    }
  }
  return embeddings;
}

export async function retrieveRelevantChunks(
  query: string, 
  chunks: string[], 
  embeddings: number[][], 
  topK = 5
): Promise<string[]> {
  if (chunks.length === 0 || embeddings.length === 0) return [];
  
  const queryEmbedding = await getEmbedding(query);
  if (!queryEmbedding.length) return chunks.slice(0, topK); // Fallback if embedding fails
  
  const scoredChunks = chunks.map((chunk, idx) => ({
    chunk,
    score: cosineSimilarity(queryEmbedding, embeddings[idx] || []),
  }));

  // Sort by highest similarity
  scoredChunks.sort((a, b) => b.score - a.score);
  
  return scoredChunks.slice(0, topK).map(s => s.chunk);
}
