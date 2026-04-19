import { NextRequest, NextResponse } from 'next/server';
import { getTransactionStatus } from '@/lib/pesapal/client';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import type { PlanTier } from '@/types';

function getAdminDb() {
  if (!getApps().length) {
    initializeApp({
      credential: cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  }
  return getFirestore();
}

const PLAN_MAP: Record<string, { plan: PlanTier; subjectLimit: number }> = {
  starter:   { plan: 'starter',   subjectLimit: 3  },
  scholar:   { plan: 'scholar',   subjectLimit: 10 },
  unlimited: { plan: 'unlimited', subjectLimit: -1 },
};

// Pesapal sends IPN as POST with OrderTrackingId and OrderMerchantReference
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { OrderTrackingId, OrderMerchantReference } = body;

    if (!OrderTrackingId) {
      return NextResponse.json({ error: 'Missing OrderTrackingId' }, { status: 400 });
    }

    // Verify transaction status with Pesapal
    const status = await getTransactionStatus(OrderTrackingId);

    if (status.payment_status_description !== 'Completed') {
      console.log(`IPN: payment not completed — status: ${status.payment_status_description}`);
      return NextResponse.json({ received: true });
    }

    // Parse userId and planId from merchant reference: ms_{userId}_{planId}_{timestamp}
    // e.g. ms_abc123_scholar_1710000000000
    const parts = (OrderMerchantReference as string).split('_');
    // parts: ['ms', userId, planId, timestamp]
    const userId = parts[1];
    const planId = parts[2];

    if (!userId || !planId || !PLAN_MAP[planId]) {
      console.error('IPN: could not parse userId/planId from ref:', OrderMerchantReference);
      return NextResponse.json({ error: 'Invalid reference format' }, { status: 400 });
    }

    const { plan, subjectLimit } = PLAN_MAP[planId];
    const db = getAdminDb();

    await db.collection('users').doc(userId).update({
      plan,
      subjectLimit,
      upgradedAt: Date.now(),
      lastOrderTrackingId: OrderTrackingId,
      lastTxRef: OrderMerchantReference,
    });

    console.log(`✓ IPN: upgraded user ${userId} to ${plan}`);

    // Pesapal expects a 200 with specific response format
    return NextResponse.json({
      orderNotificationType: 'IPNCHANGE',
      orderTrackingId: OrderTrackingId,
      orderMerchantReference: OrderMerchantReference,
      status: 200,
    });
  } catch (err: any) {
    console.error('IPN error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// Pesapal also sends GET for IPN verification
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const orderTrackingId = searchParams.get('orderTrackingId');
  const orderMerchantReference = searchParams.get('orderMerchantReference');
  return NextResponse.json({
    orderNotificationType: 'IPNCHANGE',
    orderTrackingId,
    orderMerchantReference,
    status: 200,
  });
}
