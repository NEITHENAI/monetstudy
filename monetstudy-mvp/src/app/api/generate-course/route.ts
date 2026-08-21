import { NextRequest, NextResponse } from 'next/server';
import { generateCourse } from '@/lib/deepseek/client';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { material, style, depth, goal, pace } = body;

    if (!material?.trim()) {
      return NextResponse.json({ error: 'Material is required' }, { status: 400 });
    }

    const result = await generateCourse({ material, style, depth, goal, pace });
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('generate-course error:', err);
    return NextResponse.json({ error: err.message || 'Generation failed' }, { status: 500 });
  }
}
