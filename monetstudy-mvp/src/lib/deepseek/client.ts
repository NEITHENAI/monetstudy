const DEEPSEEK_BASE = 'https://api.deepseek.com/v1';

async function callDeepSeek(messages: { role: string; content: string }[], temperature = 0.7): Promise<string> {
  const res = await fetch(`${DEEPSEEK_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages,
      temperature,
      max_tokens: 4096,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`DeepSeek API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return data.choices[0].message.content as string;
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
  style: string;
  depth: string;
  goal: string;
  pace: string;
}): Promise<GeneratedCourse> {
  const topicCount = params.pace === 'Compact' ? 4 : params.pace === 'Thorough' ? 8 : 6;

  const outlineRaw = await callDeepSeek([
    {
      role: 'system',
      content: `You are an expert curriculum designer. Respond ONLY with valid JSON. No markdown, no backticks, no preamble.`,
    },
    {
      role: 'user',
      content: `Create a course outline from this material. 
Learning style: ${params.style}
Depth: ${params.depth}
Goal: ${params.goal}
Pace: ${params.pace} (${topicCount} topics)

Material:
${params.material.slice(0, 6000)}

Respond with ONLY this JSON structure:
{
  "title": "Course title here",
  "topics": [
    {"title": "Topic title", "estimatedMinutes": 20}
  ]
}`,
    },
  ], 0.5);

  let outline: { title: string; topics: Array<{ title: string; estimatedMinutes: number }> };
  try {
    outline = JSON.parse(outlineRaw.replace(/```json|```/g, '').trim());
  } catch {
    throw new Error('Failed to parse course outline from AI');
  }

  // Generate content for each topic in parallel (batched)
  const topicContents = await Promise.all(
    outline.topics.map(t =>
      callDeepSeek([
        {
          role: 'system',
          content: `You are an expert educator writing in a ${params.style.toLowerCase()} style for a ${params.depth.toLowerCase()} learner. Goal: ${params.goal}. Write comprehensive, engaging lesson content. Use markdown: ## headings, **bold key terms**, - bullet points. Be thorough and educational.`,
        },
        {
          role: 'user',
          content: `Write a complete lesson on: "${t.title}"
          
Context from the course material:
${params.material.slice(0, 3000)}

Write the full lesson content (400-700 words). Start directly with the content, no preamble.`,
        },
      ])
    )
  );

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
      content: `You are a quiz designer. Respond ONLY with valid JSON. No markdown, no backticks.`,
    },
    {
      role: 'user',
      content: `Generate ${count} quiz questions for this topic.
Topic: ${topicTitle}
Content: ${topicContent.slice(0, 2000)}

Mix MCQ and True/False questions. Respond with ONLY this JSON array:
[
  {
    "id": "q1",
    "type": "mcq",
    "question": "Question text?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": "Option A",
    "explanation": "Explanation why A is correct."
  },
  {
    "id": "q2",
    "type": "tf",
    "question": "Statement here.",
    "correctAnswer": true,
    "explanation": "Explanation."
  }
]`,
    },
  ], 0.4);

  try {
    return JSON.parse(raw.replace(/```json|```/g, '').trim());
  } catch {
    throw new Error('Failed to parse quiz questions from AI');
  }
}

// ─── MOCK EXAM ─────────────────────────────────────────────────────
export async function generateMockExam(params: {
  subjectContent: string;
  curriculumSpec: string;
  duration: number;
}): Promise<GeneratedQuestion[]> {
  const count = params.duration <= 30 ? 20 : params.duration <= 60 ? 30 : 40;

  const raw = await callDeepSeek([
    {
      role: 'system',
      content: `You are an expert exam setter. Respond ONLY with valid JSON. No markdown, no backticks.`,
    },
    {
      role: 'user',
      content: `Generate a ${params.duration}-minute mock exam with ${count} questions.
Curriculum specification: ${params.curriculumSpec}
Course content summary: ${params.subjectContent.slice(0, 4000)}

Respond with ONLY a JSON array of ${count} questions using this format:
[
  {
    "id": "q1",
    "type": "mcq",
    "question": "Question?",
    "options": ["A", "B", "C", "D"],
    "correctAnswer": "A",
    "explanation": "Why A is correct."
  }
]`,
    },
  ], 0.4);

  try {
    return JSON.parse(raw.replace(/```json|```/g, '').trim());
  } catch {
    throw new Error('Failed to parse mock exam from AI');
  }
}
