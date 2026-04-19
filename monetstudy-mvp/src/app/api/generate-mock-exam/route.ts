import { NextRequest, NextResponse } from 'next/server';
import { generateMockExam } from '@/lib/deepseek/client';

export async function POST(req: NextRequest) {
  try {
    const { subjectContent, curriculumSpec, duration } = await req.json();
    const questions = await generateMockExam({ subjectContent, curriculumSpec, duration: duration || 60 });
    return NextResponse.json({ questions });
  } catch (err: any) {
    console.error('generate-mock-exam error:', err);
    return NextResponse.json({ error: err.message || 'Generation failed' }, { status: 500 });
  }
}
