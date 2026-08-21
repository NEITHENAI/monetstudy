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

export async function GET(req: NextRequest) {
  try {
    const orderTrackingId = req.nextUrl.searchParams.get('orderTrackingId');
    if (!orderTrackingId) {
      return NextResponse.json({ error: 'Missing orderTrackingId' }, { status: 400 });
    }
    const status = await getTransactionStatus(orderTrackingId);
    
    if (status.payment_status_description === 'Completed' && status.merchant_reference) {
      try {
        const parts = (status.merchant_reference as string).split('_');
        const userId = parts[1];
        const planId = parts[2];

        if (userId && planId && PLAN_MAP[planId]) {
          const { plan, subjectLimit } = PLAN_MAP[planId];
          const db = getAdminDb();
          await db.collection('users').doc(userId).update({
            plan,
            subjectLimit,
            upgradedAt: Date.now(),
            lastOrderTrackingId: orderTrackingId,
            lastTxRef: status.merchant_reference,
          });
          console.log(`✓ Status check: upgraded user ${userId} to ${plan}`);
        }
      } catch (dbErr) {
        console.error('Error updating user plan from status check:', dbErr);
      }
    }

    return NextResponse.json(status);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

