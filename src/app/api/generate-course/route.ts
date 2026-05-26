import { NextRequest, NextResponse } from 'next/server';
import { generateCourse } from '@/lib/ai/client';

export const maxDuration = 600; // 10 minutes for large course generation
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { material, materialUrl, style, depth, goal, pace, imageUrls, customInstructions, userPlan } = body;
    if (!material?.trim() && !materialUrl?.trim()) {
      return NextResponse.json({ error: 'Material is required' }, { status: 400 });
    }
    const result = await generateCourse({ material, materialUrl, style, depth, goal, pace, imageUrls, customInstructions, userPlan });
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('generate-course error:', err);
    return NextResponse.json({ error: err.message || 'Generation failed' }, { status: 500 });
  }
}
