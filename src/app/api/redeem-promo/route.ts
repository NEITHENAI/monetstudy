import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase/config';
import {
  collection, query, where, getDocs,
  doc, updateDoc, serverTimestamp,
} from 'firebase/firestore';

const PLAN_LIMITS: Record<string, number> = {
  starter: 3,
  scholar: 10,
  unlimited: -1,
};

export async function POST(req: NextRequest) {
  try {
    const { code, userId } = await req.json();
    if (!code || !userId) return NextResponse.json({ error: 'Missing code or user' }, { status: 400 });

    // Find promo code in Firestore
    const q = query(collection(db, 'promoCodes'), where('code', '==', code.toUpperCase()), where('used', '==', false));
    const snap = await getDocs(q);

    if (snap.empty) {
      return NextResponse.json({ error: 'Invalid or already used promo code' }, { status: 400 });
    }

    const promoDoc = snap.docs[0];
    const promo = promoDoc.data();
    const plan = promo.plan as string;
    const subjectLimit = PLAN_LIMITS[plan] ?? 3;

    // Mark promo as used
    await updateDoc(doc(db, 'promoCodes', promoDoc.id), {
      used: true,
      usedBy: userId,
      usedAt: serverTimestamp(),
    });

    // Upgrade user plan
    await updateDoc(doc(db, 'users', userId), {
      plan,
      subjectLimit,
    });

    return NextResponse.json({ success: true, plan });
  } catch (e: any) {
    console.error('Promo redeem error:', e);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
