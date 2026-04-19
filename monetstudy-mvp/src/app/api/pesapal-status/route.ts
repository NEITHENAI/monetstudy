import { NextRequest, NextResponse } from 'next/server';
import { getTransactionStatus } from '@/lib/pesapal/client';

export async function GET(req: NextRequest) {
  try {
    const orderTrackingId = req.nextUrl.searchParams.get('orderTrackingId');
    if (!orderTrackingId) {
      return NextResponse.json({ error: 'Missing orderTrackingId' }, { status: 400 });
    }
    const status = await getTransactionStatus(orderTrackingId);
    return NextResponse.json(status);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
