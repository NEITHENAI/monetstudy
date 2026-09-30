import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export const maxDuration = 120;
export const dynamic = 'force-dynamic';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

const TTS_MODELS = [
  'gemini-2.5-flash-preview-tts',
  'gemini-3.8-flash-lite-tts',
  'gemini-3.8-flash-tts',
  'gemini-3.1-flash-tts-preview',
];

// Map "THE MONETS" voices to Gemini prebuilt voice names
const VOICE_MAP: Record<string, string> = {
  clara: 'Aoede',    // Warm & Academic
  arthur: 'Charon',  // Deep & Authoritative
  julian: 'Puck',    // Dynamic & Engaging
  elena: 'Kore',     // Calm & Clear
  victor: 'Fenrir',  // Crisp & Precise
};

// In-memory cache to make re-playing instantaneous
const audioCache = new Map<string, { buffer: Buffer; mime: string; timestamp: number }>();
const CACHE_MAX_SIZE = 100;

function cleanLessonTextForSpeech(raw: string): string {
  if (!raw) return '';
  let text = raw;

  // 1. Remove all fenced code blocks (Mermaid diagrams, SVG, raw code)
  text = text.replace(/```(?:mermaid|svg|[\w]*)\s*[\s\S]*?```/gi, '');

  // 2. Remove raw SVG blocks
  text = text.replace(/<svg[\s\S]*?<\/svg>/gi, '');

  // 3. Remove image tags and placeholders
  text = text.replace(/!\[.*?\]\(.*?\)/g, '');
  text = text.replace(/\[(?:PAGE|FIGURE)_\d+\]/gi, '');

  // 4. Clean markdown link syntax: [Title](url) -> Title
  text = text.replace(/\[(.*?)\]\(.*?\)/g, '$1');

  // 5. Clean table pipes and horizontal rules
  text = text.replace(/\|/g, ', ');
  text = text.replace(/-{3,}/g, ' ');

  // 6. Clean header hashes, asterisks, blockquotes, bullets
  text = text.replace(/#{1,6}\s+/g, '');
  text = text.replace(/\*\*(.*?)\*\*/g, '$1');
  text = text.replace(/\*(.*?)\*/g, '$1');
  text = text.replace(/^>\s*/gm, 'Note: ');
  text = text.replace(/^[\*\-]\s+/gm, '');

  // 7. Normalize whitespace
  text = text.replace(/\n{2,}/g, '. ');
  text = text.replace(/\n+/g, ' ');
  text = text.replace(/\s{2,}/g, ' ');

  return text.trim();
}

function chunkText(text: string, maxChunkLength = 800): string[] {
  if (text.length <= maxChunkLength) return [text];

  const sentences = text.match(/[^.!?]+[.!?]+|\S+$/g) || [text];
  const chunks: string[] = [];
  let currentChunk = '';

  for (const sentence of sentences) {
    if ((currentChunk + ' ' + sentence).trim().length <= maxChunkLength) {
      currentChunk = (currentChunk + ' ' + sentence).trim();
    } else {
      if (currentChunk) chunks.push(currentChunk);
      currentChunk = sentence.trim();
    }
  }
  if (currentChunk) chunks.push(currentChunk);
  return chunks;
}

function addWavHeader(pcmData: Buffer, sampleRate = 24000, numChannels = 1, bitsPerSample = 16): Buffer {
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = pcmData.length;
  const header = Buffer.alloc(44);

  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write('WAVE', 8);

  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);

  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcmData]);
}

// 1. Primary Engine: Gemini Flash Studio TTS
async function synthesizeWithGemini(text: string, voiceKey: string, apiKey: string): Promise<Buffer | null> {
  const geminiVoice = VOICE_MAP[voiceKey.toLowerCase()] || 'Aoede';
  const chunks = chunkText(text, 900);
  const pcmChunks: Buffer[] = [];

  for (const chunk of chunks) {
    let chunkPcm: Buffer | null = null;
    for (const model of TTS_MODELS) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: chunk }] }],
            generationConfig: {
              responseModalities: ['AUDIO'],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: geminiVoice }
                }
              }
            }
          })
        });

        if (!res.ok) {
          if (res.status === 429) {
            console.warn(`[Gemini TTS] 429 Rate limit on ${model}, checking next model...`);
            continue;
          }
          continue;
        }

        const data = await res.json();
        const part = data.candidates?.[0]?.content?.parts?.[0];
        if (part?.inlineData?.data) {
          chunkPcm = Buffer.from(part.inlineData.data, 'base64');
          break;
        }
      } catch (e) {
        // Continue to fallback model
      }
    }

    if (!chunkPcm) {
      return null; // Gemini failed or 429 hit; trigger fast fallback engine
    }
    pcmChunks.push(chunkPcm);
    if (chunks.length > 1) {
      await new Promise(r => setTimeout(r, 60));
    }
  }

  const combinedPCM = Buffer.concat(pcmChunks);
  return addWavHeader(combinedPCM, 24000, 1, 16);
}

// 2. High-Speed Fallback Engine: Zero Quota, Instant MP3 Stream
async function synthesizeWithFastEngine(text: string): Promise<Buffer> {
  const chunks = chunkText(text, 180);
  const mp3Chunks: Buffer[] = [];

  for (const chunk of chunks) {
    const url = 'https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=en&q=' + encodeURIComponent(chunk);
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });
    if (res.ok) {
      const buf = Buffer.from(await res.arrayBuffer());
      mp3Chunks.push(buf);
    }
  }

  return Buffer.concat(mp3Chunks);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, voice = 'clara' } = body;

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const cleanedText = cleanLessonTextForSpeech(text);
    if (!cleanedText) {
      return NextResponse.json({ error: 'No speakable text found' }, { status: 400 });
    }

    // 1. Check in-memory server cache (Instant ~5ms response)
    const cacheKey = crypto.createHash('md5').update(`${voice}:${cleanedText}`).digest('hex');
    const cached = audioCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < 1000 * 60 * 60 * 24)) {
      return new NextResponse(new Uint8Array(cached.buffer), {
        status: 200,
        headers: {
          'Content-Type': cached.mime,
          'Cache-Control': 'public, max-age=86400',
          'X-Monet-Source': 'cache',
        },
      });
    }

    const apiKey = GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    let audioBuffer: Buffer | null = null;
    let mimeType = 'audio/wav';

    // 2. Try Gemini TTS Studio Voice first if key is present
    if (apiKey) {
      audioBuffer = await synthesizeWithGemini(cleanedText, voice, apiKey);
    }

    // 3. If Gemini is rate-limited (429) or busy, seamlessly fall back to the fast zero-quota engine
    if (!audioBuffer || audioBuffer.length === 0) {
      console.log('[Narrator] Using high-speed fallback engine to preserve quota.');
      audioBuffer = await synthesizeWithFastEngine(cleanedText);
      mimeType = 'audio/mpeg';
    }

    // 4. Save in server cache
    if (audioCache.size > CACHE_MAX_SIZE) {
      const oldestKey = audioCache.keys().next().value;
      if (oldestKey) audioCache.delete(oldestKey);
    }
    audioCache.set(cacheKey, { buffer: audioBuffer, mime: mimeType, timestamp: Date.now() });

    return new NextResponse(new Uint8Array(audioBuffer), {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'public, max-age=86400',
        'X-Monet-Source': mimeType === 'audio/wav' ? 'gemini-studio' : 'fast-engine',
      },
    });
  } catch (err: any) {
    console.error('[API /api/narrate] Error:', err);
    return NextResponse.json({ error: err.message || 'Narration failed' }, { status: 500 });
  }
}
