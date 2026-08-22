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
  let content = (raw || '').trim();
  
  // Strip outer ```markdown ... ``` wrapper only if the model wrapped the entire response
  if (content.startsWith('```markdown') && content.endsWith('```')) {
    content = content.replace(/^```markdown\s*/i, '').replace(/\s*```$/, '').trim();
  } else if (content.startsWith('```') && content.endsWith('```') && !content.startsWith('```mermaid') && !content.startsWith('```svg')) {
    content = content.replace(/^```[a-z]*\s*/i, '').replace(/\s*```$/, '').trim();
  }

  // Ensure svg and mermaid code fences have proper newlines after the fence tag
  content = content.replace(/```svg\s*(<svg[\s\S]*?<\/svg>)\s*```/gi, '```svg\n$1\n```');
  content = content.replace(/```mermaid\s*((?:graph|flowchart|sequenceDiagram|stateDiagram|classDiagram|erDiagram|mindmap)[\s\S]*?)```/gi, '```mermaid\n$1\n```');

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

  // ── STRUCTURAL MARKDOWN FORMATTING PASS ──
  // Separate chained headers: "## Title ### Subtitle" -> "## Title\n\n### Subtitle"
  content = content.replace(/(#{1,6}\s+[^#\n]+?)(?=\s+#{1,6}\s+)/g, '$1\n\n');
  // Separate headers from preceding text
  content = content.replace(/([^\n#])\s+(#{1,6}\s+[^\n]+)/g, '$1\n\n$2\n\n');
  // Separate subheaders glued to following bold text
  content = content.replace(/(#{1,6}\s+[^\n*#]+?)\s+(\*\*[A-Z])/g, '$1\n\n$2');
  // Separate horizontal dividers
  content = content.replace(/([^\n])\s*(---|___|\*\*\*)\s*([^\n])/g, '$1\n\n---\n\n$3');
  // Separate tables from preceding text and fix cramped rows
  content = content.replace(/([^\n])\s*(\|[^\n]+\|)/g, '$1\n\n$2');
  content = content.replace(/\|\s+(?=\|)/g, '|\n');
  content = content.replace(/\|\s*\|\s*/g, '|\n| ');
  // Separate numbered lists and bullet points
  content = content.replace(/([^\n])\s+(\d+\.\s+\*\*[^\n]+?\*\*|\d+\.\s+[A-Z][^\n]+?)/g, '$1\n\n$2');
  content = content.replace(/(\d+\.\s+[^\n]+?)\s+(\d+\.\s+\*\*[^\n]+?\*\*|\d+\.\s+[A-Z][^\n]+?)/g, '$1\n$2');
  content = content.replace(/([^\n])\s+-\s+(\*\*[^\n]+?\*\*|[A-Z][^\n]+?)/g, '$1\n\n- $2');
  content = content.replace(/(-\s+[^\n]+?)\s+-\s+(\*\*[^\n]+?\*\*|[A-Z][^\n]+?)/g, '$1\n- $2');
  // Separate blockquotes & Clinical Pearls
  content = content.replace(/([^\n])\s*(>\s*(?:\*\*[^\n]+?\*\*|[A-Z][^\n]+?))/g, '$1\n\n$2\n\n');

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
        body: JSON.stringify({ model: 'openai', messages, temperature, max_tokens: 8192 }),
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
          max_tokens: 8192,
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

// Global cache to prevent re-downloading the same massive PDF during testing
const globalAny: any = global;
if (!globalAny.materialCache) {
  globalAny.materialCache = new Map<string, {text: string, timestamp: number}>();
}
const materialCache = globalAny.materialCache;

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
  const paceGuide = params.pace === 'Compact'
    ? 'Focus on the most essential topics. Keep it brief. Do not artificially limit the number of topics if the content demands it.'
    : params.pace === 'Thorough'
    ? 'Cover all important concepts thoroughly. Create as many topics as necessary to cover the entire text.'
    : 'Cover important topics with a good balance. Do not limit the topic count, create a comprehensive outline.';

  let fullMaterial = params.material;
  if (params.materialUrl) {
    const cached = materialCache.get(params.materialUrl);
    // Cache valid for 24 hours
    if (cached && (Date.now() - cached.timestamp < 24 * 60 * 60 * 1000)) {
      console.log('[AI Client] Using CACHED material text to save Firebase bandwidth.');
      fullMaterial = cached.text;
    } else {
      try {
        console.log('[AI Client] Fetching massive source material from Firebase storage...');
        const res = await fetch(params.materialUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        fullMaterial = await res.text();
        materialCache.set(params.materialUrl, { text: fullMaterial, timestamp: Date.now() });
      } catch (e) {
        console.error('[AI Client] Failed to fetch material URL', e);
      }
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
  const wordCount = fullMaterial.trim().split(/\s+/).length;
  const charCount = fullMaterial.length;

  let targetTopicCount = '8 to 14 comprehensive topics';
  if (wordCount > 20000 || charCount > 90000) {
    targetTopicCount = '18 to 32 exhaustive topics covering every chapter, framework, model, and case study';
  } else if (wordCount > 7000 || charCount > 30000) {
    targetTopicCount = '12 to 20 detailed topics covering all key sections and mechanisms';
  } else if (wordCount > 2500 || charCount > 12000) {
    targetTopicCount = '8 to 16 structured topics covering the full scope of the text';
  } else if (params.pace === 'Thorough') {
    targetTopicCount = '10 to 18 in-depth topics';
  } else if (params.pace === 'Compact') {
    targetTopicCount = '6 to 10 essential topics';
  }

  const outlineRaw = await callDeepSeek([
    {
      role: 'system',
      content: `You are an elite academic curriculum architect. Your task is to design an exhaustive, complete course syllabus that fully covers all material in the provided source text. Never artificially restrict, condense, or truncate the number of topics. Cover 100% of the material.`,
    },
    {
      role: 'user',
      content: `Analyze the ENTIRE provided text and design a full, comprehensive course syllabus covering all chapters, models, concepts, and frameworks.

IMPORTANT SYLLABUS GUIDELINES:
1. EXHAUSTIVE COVERAGE: Every single chapter, core concept, trading rule, financial model, scientific mechanism, formula, and methodology in the uploaded text MUST be converted into its own dedicated lesson topic.
2. TOPIC COUNT IS PROPORTIONAL TO BOOK SIZE: For this material volume (~${wordCount} words / ${charCount} chars), generate ${targetTopicCount}.
3. DO NOT ARTIFICIALLY CONSOLIDATE OR OMIT SUBSECTIONS. Produce as many topics as needed so that no content is left unaddressed.
4. Style: ${params.style}, Depth: ${params.depth}, Goal: ${params.goal}, Pace: ${params.pace}. ${paceGuide}
${params.customInstructions ? `\nUSER CUSTOM INSTRUCTIONS (prioritize these):\n${params.customInstructions}\n` : ''}

SOURCE MATERIAL (read across the entire text):
${fullMaterial.slice(0, 120000)}

Respond with ONLY valid JSON with this exact structure:
{
  "title": "Comprehensive Course Title",
  "topics": [
    {"title": "1. Foundations & Core Concepts", "estimatedMinutes": 15},
    {"title": "2. Structural Mechanisms & Frameworks", "estimatedMinutes": 18},
    {"title": "3. Advanced Principles & Methodologies", "estimatedMinutes": 20},
    {"title": "4. Applied Analysis & Case Studies", "estimatedMinutes": 15},
    {"title": "5. Systems Integration & Best Practices", "estimatedMinutes": 15},
    {"title": "6. Comprehensive Review & Mastery", "estimatedMinutes": 15}
  ]
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
        const relevantChunks = await retrieveRelevantChunks(t.title, docChunks, docEmbeddings, 7);
        sourceContext = relevantChunks.join('\n\n...\n\n');
      }

      // 3a. Synthesize the Lesson with high-impact Mermaid & SVG diagrams
      const instructionalText = `You are an elite academic professor and master visual educator. Your goal is to TEACH this topic thoroughly and comprehensively from first principles to mastery, NOT summarize or abbreviate it.

TOPIC TO TEACH: "${t.title}"

SOURCE MATERIAL:
${sourceContext}

${pageAnalyses ? `VISUAL CONTEXT FROM PDF:\n${pageAnalyses}` : ''}
${params.customInstructions ? `\nUSER'S PERSONALISATION NOTES (follow these closely):\n${params.customInstructions}\n` : ''}

PEDAGOGICAL TEACHING GUIDELINES:
1. TEACHING, NOT SUMMARIZING:
   - Deeply explain the "Why" (underlying theory & intuition) and the "How" (step-by-step application).
   - Break down complex mechanisms, formulas, models, or trading rules into crystal-clear steps.
   - Use vivid analogies, real-world examples, and explicitly highlight common student pitfalls/misconceptions.
   - Maintain textbook depth (800–1200 words). Use # Title, ## Core Principles, ### Detailed Breakdown, and **bold** key concepts.
2. VISUAL DIAGRAMS & ILLUSTRATIONS (MULTIPLE HIGH-YIELD ILLUSTRATIONS ENCOURAGED):
   Embed rich visual illustrations (Mermaid diagrams or standalone SVG vectors) across key sections wherever they crystallize the concept:
   - Embed 1 to 3 distinct illustrations across different subsections of the lesson (e.g., one flowchart for pathophysiology, one comparison diagram, one decision hierarchy).
   - Format OPTION A (MERMAID):
\`\`\`mermaid
graph TD
    A["Core Input / Premise"] -->|Mechanism| B["Processing / Decision Engine"]
    B --> C["Result / Phase Alpha"]
    B --> D["Result / Phase Beta"]
\`\`\`
   - Format OPTION B (STANDALONE SVG VECTOR):
\`\`\`svg
<svg viewBox="0 0 700 350" xmlns="http://www.w3.org/2000/svg" width="100%">
  <rect width="700" height="350" fill="#f8f9fa" rx="10"/>
  <text x="350" y="30" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="#1a237e">Topic Architecture</text>
  <!-- Vector elements: rect, circle, line, path, text with clean color accents -->
</svg>
\`\`\`
3. CRITICAL CODE FENCE & FORMATTING RULES:
   - ALWAYS place \`\`\`mermaid or \`\`\`svg on its OWN line before the diagram starts.
   - ALWAYS put each node, connection, and style directive on a SEPARATE line (never cram the whole diagram onto a single line).
   - ALWAYS close every diagram block with \`\`\` on its own line before continuing with text.
   - ALWAYS complete every SVG with its closing </svg> tag before finishing the code block.
4. After each diagram, provide a 1-2 sentence observation note highlighting what the student should observe.

Start directly with # ${t.title}.`;

      const contentRaw = await callDeepSeek([
        {
          role: 'system',
          content: `You are a world-class academic author and visual educator. Respond ONLY with the markdown lesson including the Mermaid or SVG code blocks. No introductory or closing remarks.`,
        },
        {
          role: 'user',
          content: instructionalText,
        },
      ]);
      const content = cleanMarkdown(contentRaw);

      return content;
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
  diagram?: string;
}

export async function generateQuestions(
  topicTitle: string,
  topicContent: string,
  count: number
): Promise<GeneratedQuestion[]> {
  const raw = await callDeepSeek([
    {
      role: 'system',
      content: `You are a professional quiz and exam designer. Respond ONLY with a valid JSON array of questions. No markdown backticks, no preamble.`,
    },
    {
      role: 'user',
      content: `Generate ${count} quiz questions for: ${topicTitle}
Content: ${topicContent.slice(0, 5000)}

INSTRUCTIONS:
1. Make questions rigorous, practical, and concept-testing.
2. For questions that benefit from a visual aid (e.g. process flows, decision logic, charts, or structural models), include an optional "diagram" field containing valid Mermaid.js (e.g. graph TD ...) or valid inline SVG (<svg viewBox="0 0 600 240" ...>...</svg>).
3. "correctAnswer" MUST contain the EXACT STRING TEXT of the correct option.

Respond with ONLY this JSON array structure:
[
  {
    "id": "q1",
    "type": "mcq",
    "question": "Based on the illustrated mechanism...",
    "diagram": "graph TD\\n  A[Step 1] --> B{Condition}\\n  B -->|Yes| C[Target Outcome]",
    "options": ["First option", "Second option", "Third option", "Fourth option"],
    "correctAnswer": "First option",
    "explanation": "Detailed explanation of why this answer is correct..."
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
      content: `You are a university-level exam setter. Respond ONLY with a valid JSON array of questions. No preamble.`,
    },
    {
      role: 'user',
      content: `Generate a comprehensive ${params.duration}-minute exam (${count} questions).
Spec: ${params.curriculumSpec}
Content: ${params.subjectContent.slice(0, 8000)}

INSTRUCTIONS:
1. Questions should test both core conceptual knowledge and scenario analysis.
2. For scenario, workflow, or diagnostic questions, include an optional "diagram" field with valid Mermaid.js or inline SVG code.
3. Make sure "correctAnswer" contains the EXACT STRING TEXT of the correct option.

Format: JSON array of questions:
[
  {
    "id": "q1",
    "type": "mcq",
    "question": "Examine the process below and determine...",
    "diagram": "graph TD\\n  A[Trigger] --> B[Processing]\\n  B --> C[Resolution]",
    "options": ["Alpha", "Beta", "Gamma", "Delta"],
    "correctAnswer": "Alpha",
    "explanation": "Thorough explanation of the correct response."
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
