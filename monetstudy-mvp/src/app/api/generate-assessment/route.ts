import { NextRequest, NextResponse } from 'next/server';
import { generateQuestions } from '@/lib/deepseek/client';

export async function POST(req: NextRequest) {
  try {
    const { topicTitle, topicContent, count = 5 } = await req.json();
    if (!topicTitle || !topicContent) {
      return NextResponse.json({ error: 'topicTitle and topicContent required' }, { status: 400 });
    }
    const questions = await generateQuestions(topicTitle, topicContent, count);
    return NextResponse.json({ questions });
  } catch (err: any) {
    console.error('generate-assessment error:', err);
    return NextResponse.json({ error: err.message || 'Generation failed' }, { status: 500 });
  }
}
