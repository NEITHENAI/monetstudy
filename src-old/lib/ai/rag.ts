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

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

export async function getEmbedding(text: string, retries = 3): Promise<number[]> {
  const geminiKey = process.env.GEMINI_API_KEY || 'AIzaSyDb0Io4DWYrFOwJ3vZw8RFM1L4C3RdRPq8';
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${geminiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'models/text-embedding-004',
          content: { parts: [{ text }] },
        }),
      });
      if (res.status === 429) {
        console.warn(`[Embedding] Rate limited (429), retry ${attempt + 1}/${retries}...`);
        await delay(3000 * (attempt + 1)); // 3s, 6s, 9s backoff
        continue;
      }
      if (!res.ok) throw new Error(`Embedding failed: ${res.status}`);
      const data = await res.json();
      return data.embedding.values;
    } catch (e) {
      if (attempt < retries) {
        console.warn(`[Embedding] Attempt ${attempt + 1} failed, retrying...`);
        await delay(2000 * (attempt + 1));
        continue;
      }
      console.error('[Embedding] All retries exhausted:', e);
      return [];
    }
  }
  return [];
}

export async function batchEmbed(chunks: string[]): Promise<number[][]> {
  const geminiKey = process.env.GEMINI_API_KEY || 'AIzaSyDb0Io4DWYrFOwJ3vZw8RFM1L4C3RdRPq8';
  const embeddings: number[][] = [];
  
  // Batch in groups of 10 to stay well within rate limits
  const BATCH_SIZE = 10;
  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);
    let success = false;

    for (let attempt = 0; attempt < 3; attempt++) {
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

        if (res.status === 429) {
          console.warn(`[BatchEmbed] Rate limited (429) on batch ${i / BATCH_SIZE + 1}, retry ${attempt + 1}...`);
          await delay(5000 * (attempt + 1)); // 5s, 10s, 15s backoff
          continue;
        }

        if (!res.ok) {
          console.warn(`[BatchEmbed] HTTP ${res.status} on batch ${i / BATCH_SIZE + 1}, retry ${attempt + 1}...`);
          await delay(3000 * (attempt + 1));
          continue;
        }

        const data = await res.json();
        embeddings.push(...data.embeddings.map((e: any) => e.values));
        success = true;
        break;
      } catch (e) {
        console.warn(`[BatchEmbed] Error on batch ${i / BATCH_SIZE + 1}, retry ${attempt + 1}:`, e);
        await delay(3000 * (attempt + 1));
      }
    }

    if (!success) {
      console.error(`[BatchEmbed] All retries failed for batch ${i / BATCH_SIZE + 1}, filling with empty vectors`);
      embeddings.push(...Array(batch.length).fill([]));
    }

    // Add a small delay between successful batches to avoid triggering rate limits
    await delay(1500);
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
