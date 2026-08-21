import { NextRequest, NextResponse } from 'next/server';
import { submitOrder, registerIPN } from '@/lib/pesapal/client';
import { PLANS } from '@/lib/plans';

// Cache IPN id in memory (register once per cold start)
let cachedIpnId: string | null = null;

async function getIpnId(): Promise<string> {
  if (cachedIpnId) return cachedIpnId;
  cachedIpnId = await registerIPN();
  return cachedIpnId;
}

export async function POST(req: NextRequest) {
  try {
    const { planId, userId, email, name, currency = 'USD' } = await req.json();

    const plan = PLANS.find(p => p.id === planId);
    if (!plan || plan.price === 0) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }
    if (!userId || !email) {
      return NextResponse.json({ error: 'Missing userId or email' }, { status: 400 });
    }

    const ipnId = await getIpnId();
    const txRef = `ms_${userId}_${planId}_${Date.now()}`;
    const [firstName, ...rest] = (name || 'MonetStudy User').split(' ');
    const lastName = rest.join(' ') || 'User';

    const order = await submitOrder({
      id: txRef,
      amount: plan.price,
      currency,
      description: `MonetStudy ${plan.name} — ${plan.subjectLimit === -1 ? 'Unlimited' : plan.subjectLimit} subjects`,
      email,
      firstName,
      lastName,
      ipnId,
      callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL}/payment/callback?planId=${planId}&userId=${userId}&ref=${txRef}`,
    });

    return NextResponse.json({
      iframeUrl: order.redirect_url,
      orderTrackingId: order.order_tracking_id,
      txRef,
    });
  } catch (err: any) {
    console.error('pesapal-order error:', err);
    return NextResponse.json({ error: err.message || 'Order failed' }, { status: 500 });
  }
}
