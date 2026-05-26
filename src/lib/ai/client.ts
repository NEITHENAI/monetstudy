import { chunkText, batchEmbed, retrieveRelevantChunks } from './rag';

const POLLINATIONS_BASE = 'https://text.pollinations.ai/openai';
const DEEPSEEK_BASE = 'https://api.deepseek.com';
const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY || 'sk-9fb97d0a824c4c519f4be54d4a7d0b09';
const NVIDIA_KEY = process.env.NVIDIA_API_KEY || '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';
const NVIDIA_IMG_URL = 'https://ai.api.nvidia.com/v1/genai/stabilityai/stable-diffusion-xl';

type MessageContent = string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
interface Message {
  role: string;
  content: MessageContent;
}

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

function cleanMarkdown(raw: string): string {
  let content = raw.replace(/```markdown|```/g, '').trim();
  // Strip <think> blocks
  content = content.replace(/<think>[\s\S]*?<\/think>/gi, '');
  // Strip --- SECTION --- headers and their content blocks (instruction leakage)
  content = content.replace(/---\s*(KNOWLEDGE BASE|CONTEXT|REQUIREMENTS|ASSETS|MEETING POINT)[\s\S]*?---/gi, '');
  // Strip lines that look like instructions ("1. TONE:", "2. VISUALS:", "3. STRUCTURE:")
  content = content.replace(/^\d+\.\s*(TONE|VISUALS|STRUCTURE|FIGURE MATCHING|QUALITY):.*$/gm, '');
  // Strip "DO NOT USE", "USE ONLY", "Embed it using" instruction lines
  content = content.replace(/^\s*-\s*(DO NOT USE|USE ONLY|Embed it using|Describe what|ALWAYS embed).*$/gm, '');
  // Strip "Start directly with" instructions
  content = content.replace(/^Start directly with.*$/gm, '');
  // Strip "Source:" or "Context:" metadata lines
  content = content.replace(/^(SOURCE TEXT|SOURCE MATERIAL|SOURCE DIAGRAM|DIAGRAM CATALOG|NEW HARMONIZED|NEW ILLUSTRATION|Concept designed):?.*$/gm, '');
  // Find the first heading and strip everything before it
  const firstHash = content.indexOf('#');
  if (firstHash > 0) {
    content = content.substring(firstHash);
  }
  // Clean up excessive blank lines
  content = content.replace(/\n{3,}/g, '\n\n');
  return content.trim();
}

async function callGemini(messages: Message[], temperature = 0.7, retries = 3): Promise<string> {
  let attempt = 0;
  while (attempt <= retries) {
    try {
      const res = await fetch(`${POLLINATIONS_BASE}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'openai', messages, temperature, max_tokens: 4096 }),
      });
      if (res.ok) {
        const data = await res.json();
        return (data?.choices?.[0]?.message?.content || data?.choices?.[0]?.message?.reasoning_content || '') as string;
      }
      if (attempt < retries) {
        attempt++;
        console.warn(`[Pollinations] Attempt ${attempt} failed (${res.status}), retrying...`);
        await delay(2000 * attempt);
        continue;
      }
      return ''; // Return empty instead of throwing — non-blocking
    } catch (e) {
      if (attempt < retries) {
        attempt++;
        await delay(2000 * attempt);
        continue;
      }
      console.error('[Pollinations] All retries failed:', e);
      return ''; // Return empty instead of throwing
    }
  }
  return '';
}

async function callDeepSeek(messages: any[], temperature = 0.7, retries = 3): Promise<string> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(`${DEEPSEEK_BASE}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DEEPSEEK_KEY}`,
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages,
          temperature,
          max_tokens: 4096,
        }),
      });

      if (res.status === 429) {
        console.warn(`[DeepSeek] Rate limited (429), retry ${attempt + 1}/${retries}...`);
        await delay(3000 * (attempt + 1));
        continue;
      }

      if (!res.ok) {
        const err = await res.text();
        console.warn(`[DeepSeek] HTTP ${res.status}, retry ${attempt + 1}/${retries}:`, err);
        await delay(2000 * (attempt + 1));
        continue;
      }

      const data = await res.json();
      return data?.choices?.[0]?.message?.content || '';
    } catch (e) {
      console.warn(`[DeepSeek] Network error, retry ${attempt + 1}/${retries}:`, e);
      if (attempt < retries) {
        await delay(2000 * (attempt + 1));
        continue;
      }
    }
  }
  console.error('[DeepSeek] All retries exhausted. Falling back to Pollinations...');
  return callGemini(messages, temperature);
}

// ─── IMAGE GENERATION (Gemini 2.5 Flash) ───────────────────────────
async function generateImage(prompt: string): Promise<string> {
  const fs = require('fs');
  const path = require('path');
  const crypto = require('crypto');

  try {
    // Hardcoding to bypass Next.js cached process.env variables so we don't need a server restart
    const geminiKey = 'AIzaSyDb0Io4DWYrFOwJ3vZw8RFM1L4C3RdRPq8';
    
    // Gemini 2.5 Flash excels at clean, structured educational diagrams and photography
    const enhancedPrompt = `${prompt}, beautiful textbook educational illustration, highly detailed, clean academic style, professional quality`;
    console.log('[GEMINI] Generating image:', enhancedPrompt.substring(0, 80));
    
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${geminiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: enhancedPrompt }]
          }
        ],
        generationConfig: {
          responseModalities: ['IMAGE']
        }
      }),
    });
    
    if (!res.ok) {
      console.warn('[GEMINI] Failed:', res.status);
      return '';
    }
    
    const data = await res.json();
    const base64Data = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    
    if (base64Data) {
      const imgId = crypto.randomBytes(8).toString('hex');
      const imgDir = path.join(process.cwd(), 'public', 'generated');
      if (!fs.existsSync(imgDir)) fs.mkdirSync(imgDir, { recursive: true });
      
      const imgPath = path.join(imgDir, `img-${imgId}.jpg`);
      fs.writeFileSync(imgPath, Buffer.from(base64Data, 'base64'));
      
      console.log('[GEMINI] Image saved:', `/generated/img-${imgId}.jpg`);
      return `/generated/img-${imgId}.jpg`;
    }
    
    throw new Error('No image data returned from Gemini');
  } catch (e) {
    console.error('[GEMINI] Error:', e);
    return '';
  }
}

async function analyzeImage(url: string, pageNum: number): Promise<string> {
  try {
    const content = await callGemini([
      { 
        role: 'system', 
        content: `You are a Technical Visual Cataloger. Analyze this PDF page (Page ${pageNum}) for educational value. 
If there is a diagram, chart, or technical illustration:
1. Describe the EXACT concept it teaches.
2. List all visible labels, variables, or annotations.
3. Describe the visual layout (e.g., "A flow chart showing...", "A graph of X vs Y").
If there is only text, respond with "TEXT ONLY".` 
      },
      { role: 'user', content: [{ type: 'image_url', image_url: { url } }] as any }
    ], 0.2);
    if (content.toUpperCase().includes('TEXT ONLY')) return '';
    return `[MANIFEST ITEM - PAGE ${pageNum}]: ${content}`;
  } catch (e) {
    console.error(`[Vision] Failed to catalog page ${pageNum}:`, e);
    return '';
  }
}

// ─── COURSE GENERATION ─────────────────────────────────────────────
export interface GeneratedTopic {
  title: string;
  content: string;
  estimatedMinutes: number;
}

export interface GeneratedCourse {
  title: string;
  topics: GeneratedTopic[];
}

export async function generateCourse(params: {
  material: string;
  materialUrl?: string;
  style: string;
  depth: string;
  goal: string;
  pace: string;
  imageUrls?: string[];
  customInstructions?: string;
  userPlan?: string;
}): Promise<GeneratedCourse> {

  const isPremiumImages = params.userPlan === 'scholar' || params.userPlan === 'unlimited';

  const paceGuide = params.pace === 'Compact'
    ? 'Focus on the most essential topics. Keep it brief. Do not artificially limit the number of topics if the content demands it.'
    : params.pace === 'Thorough'
    ? 'Cover all important concepts thoroughly. Create as many topics as necessary to cover the entire text.'
    : 'Cover important topics with a good balance. Do not limit the topic count, create a comprehensive outline.';

  let fullMaterial = params.material;
  if (params.materialUrl) {
    try {
      console.log('[AI Client] Fetching massive source material from storage...');
      const res = await fetch(params.materialUrl);
      fullMaterial = await res.text();
    } catch (e) {
      console.error('[AI Client] Failed to fetch material URL', e);
    }
  }

  // Handle RAG for massive documents
  const isMassive = fullMaterial.length > 50000;
  let docChunks: string[] = [];
  let docEmbeddings: number[][] = [];
  if (isMassive) {
    console.log('[AI Client] Document is massive (>50k chars). Beginning RAG chunking and embedding...');
    docChunks = chunkText(fullMaterial);
    console.log(`[AI Client] Created ${docChunks.length} chunks. Embedding...`);
    docEmbeddings = await batchEmbed(docChunks);
    console.log(`[AI Client] Embedding complete.`);
  }

  // 1. Analyze Images First (Hybrid Vision)
  let pageAnalyses = '';
  if (params.imageUrls && params.imageUrls.length > 0) {
    console.log('[AI Client] Analyzing PDF images...');
    const analyses = await Promise.all(
      params.imageUrls.map((url, i) => analyzeImage(url, i + 1))
    );
    pageAnalyses = analyses.join('\n\n');
  }

  // 2. Generate Outline with DeepSeek
  const outlineRaw = await callDeepSeek([
    {
      role: 'system',
      content: `You are a professional curriculum designer. Respond ONLY with valid JSON.`,
    },
    {
      role: 'user',
      content: `Create a course outline for: ${fullMaterial.slice(0, 100000)}
Style: ${params.style}, Depth: ${params.depth}, Goal: ${params.goal}. ${paceGuide}
${params.customInstructions ? `\nADDITIONAL USER INSTRUCTIONS (prioritise these):\n${params.customInstructions}\n` : ''}
Respond with ONLY this JSON structure:
{
  "title": "Course Title",
  "topics": [{"title": "Topic Title", "estimatedMinutes": 15}]
}`,
    },
  ]);

  let outline: { title: string; topics: Array<{ title: string; estimatedMinutes: number }> };
  try {
    const jsonStr = outlineRaw.substring(outlineRaw.indexOf('{'), outlineRaw.lastIndexOf('}') + 1);
    outline = JSON.parse(jsonStr);
  } catch {
    throw new Error('Failed to parse course outline');
  }

  // 3. Generate Topics in Parallel Batches (to prevent timeouts)
  const topicContents: string[] = [];
  const CONCURRENCY = 5; // Generate 5 topics at a time

  for (let i = 0; i < outline.topics.length; i += CONCURRENCY) {
    const batch = outline.topics.slice(i, i + CONCURRENCY);
    console.log(`[AI Client] Generating batch of ${batch.length} topics...`);
    
    const batchResults = await Promise.all(batch.map(async (t) => {
      let sourceContext = fullMaterial; // use full material unless massive
      if (isMassive) {
        console.log(`[AI Client] RAG executing for topic: ${t.title}`);
        const relevantChunks = await retrieveRelevantChunks(t.title, docChunks, docEmbeddings, 5);
        sourceContext = relevantChunks.join('\n\n...\n\n');
      }

      // 3a. Synthesize the Lesson
      const instructionalText = `Write a premium, textbook-quality lesson for: "${t.title}"

SOURCE MATERIAL:
${sourceContext}

${pageAnalyses ? `VISUAL CONTEXT FROM PDF:\n${pageAnalyses}` : ''}
${params.customInstructions ? `\nUSER'S PERSONALISATION NOTES (follow these closely):\n${params.customInstructions}\n` : ''}
INSTRUCTIONS:
1. TONE: High-end textbook. Clear, professional, and deep.
2. At the most important concept in the text, embed exactly ONE image placeholder using the exact syntax: ![Illustration][ILLUSTRATION]
3. After the placeholder, describe what the student should observe in the diagram.
4. Use # Title, ## Sections, ### Subsections. Bold key terms. 500-800 words.

Start directly with # ${t.title}.`;

      const contentRaw = await callDeepSeek([
        {
          role: 'system',
          content: `You are a world-class academic author. Respond ONLY with the markdown lesson. No preambles.`,
        },
        {
          role: 'user',
          content: instructionalText,
        },
      ]);
      const content = cleanMarkdown(contentRaw);

      let finalContent = content;

      if (isPremiumImages) {
        const illustrationDesignRaw = await callDeepSeek([
          {
            role: 'system',
            content: 'You design image prompts for an AI graphic designer. Respond with ONLY a short description of the core visual concept from the text, maximum 15 words. No quotes, no punctuation. Focus on specific visual elements.',
          },
          {
            role: 'user',
            content: `Read this lesson and design a 15-word image prompt for a flat-design textbook diagram that perfectly illustrates its core concept:\n\n${content.slice(0, 2000)}`,
          },
        ], 0.3);
        const cleanPrompt = illustrationDesignRaw.replace(/[^a-zA-Z0-9\s]/g, '').trim();

        const illustrationUrl = await generateImage(cleanPrompt);

        finalContent = content.replace(
          /!\[([^\]]*)\]\[ILLUSTRATION\]/g,
          `![$1](${illustrationUrl})`
        );
        finalContent = finalContent.replace(
          /!\[([^\]]*)\]\(ILLUSTRATION\)/g,
          `![$1](${illustrationUrl})`
        );
      } else {
        finalContent = content.replace(
          /!\[([^\]]*)\]\[ILLUSTRATION\]/g,
          '> ✦ *AI-generated illustration available on Scholar & Unlimited plans. [Upgrade →](/upgrade)*'
        );
        finalContent = finalContent.replace(
          /!\[([^\]]*)\]\(ILLUSTRATION\)/g,
          '> ✦ *AI-generated illustration available on Scholar & Unlimited plans. [Upgrade →](/upgrade)*'
        );
      }

      return finalContent;
    }));

    topicContents.push(...batchResults);
    await delay(1000); // give the API a tiny breather between batches
  }

  return {
    title: outline.title,
    topics: outline.topics.map((t, i) => ({
      title: t.title,
      content: topicContents[i],
      estimatedMinutes: t.estimatedMinutes,
    })),
  };
}

// ─── QUIZ GENERATION ───────────────────────────────────────────────
export interface GeneratedQuestion {
  id: string;
  type: 'mcq' | 'tf';
  question: string;
  options?: string[];
  correctAnswer: string | boolean;
  explanation: string;
}

export async function generateQuestions(
  topicTitle: string,
  topicContent: string,
  count: number
): Promise<GeneratedQuestion[]> {
  const raw = await callDeepSeek([
    {
      role: 'system',
      content: `You are a professional quiz designer. Respond ONLY with a valid JSON array of questions. No markdown backticks, no preamble.`,
    },
    {
      role: 'user',
      content: `Generate ${count} quiz questions for: ${topicTitle}
Content: ${topicContent.slice(0, 4000)}

Respond with ONLY this JSON array structure. Make sure "correctAnswer" contains the EXACT STRING TEXT of the correct option, not just "A" or "B":
[
  {
    "id": "qX",
    "type": "mcq",
    "question": "...",
    "options": ["First option", "Second option", "Third option", "Fourth option"],
    "correctAnswer": "First option",
    "explanation": "..."
  }
]`,
    },
  ], 0.4);

  try {
    const jsonStr = raw.substring(raw.indexOf('['), raw.lastIndexOf(']') + 1);
    return JSON.parse(jsonStr);
  } catch {
    throw new Error('Failed to parse quiz questions');
  }
}

export async function generateMockExam(params: {
  subjectContent: string;
  curriculumSpec: string;
  duration: number;
}): Promise<GeneratedQuestion[]> {
  const count = params.duration <= 30 ? 20 : params.duration <= 60 ? 30 : 40;

  const raw = await callDeepSeek([
    {
      role: 'system',
      content: `You are a professional exam setter. Respond ONLY with a valid JSON array of questions. No preamble.`,
    },
    {
      role: 'user',
      content: `Generate a ${params.duration}-minute exam (${count} questions).
Spec: ${params.curriculumSpec}
Content: ${params.subjectContent.slice(0, 6000)}

Format: JSON array of questions. Make sure "correctAnswer" contains the EXACT STRING TEXT of the correct option, not just a letter. Example:
[
  {
    "id": "q1",
    "type": "mcq",
    "question": "What is...",
    "options": ["Alpha", "Beta", "Gamma", "Delta"],
    "correctAnswer": "Alpha",
    "explanation": "..."
  }
]`,
    },
  ], 0.4);

  try {
    const jsonStr = raw.substring(raw.indexOf('['), raw.lastIndexOf(']') + 1);
    return JSON.parse(jsonStr);
  } catch {
    throw new Error('Failed to parse mock exam');
  }
}
