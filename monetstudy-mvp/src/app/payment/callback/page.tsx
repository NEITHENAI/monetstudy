'use client';
import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { Btn, Spinner, F } from '@/components/ui/primitives';
import { getPlanById } from '@/lib/plans';
import type { PlanTier } from '@/types';

export default function PaymentCallbackPage() {
  const { theme: T } = useTheme();
  const { refreshProfile } = useAuth();
  const router = useRouter();
  const params = useSearchParams();

  const planId = params.get('planId') ?? '';
  const orderTrackingId = params.get('OrderTrackingId') ?? '';

  const [status, setStatus] = useState<'checking' | 'success' | 'failed' | 'pending'>('checking');
  const plan = getPlanById(planId as PlanTier);

  useEffect(() => {
    if (!orderTrackingId) { setStatus('failed'); return; }

    let attempts = 0;

    const check = async () => {
      try {
        // Use our API proxy — never call pesapal client directly from browser
        const res = await fetch(`/api/pesapal-status?orderTrackingId=${encodeURIComponent(orderTrackingId)}`);
        const data = await res.json();
        const desc = (data.payment_status_description ?? '') as string;

        if (desc === 'Completed') {
          await refreshProfile();
          setStatus('success');
        } else if (desc === 'Failed' || desc === 'Invalid') {
          setStatus('failed');
        } else {
          attempts++;
          if (attempts < 5) {
            setTimeout(check, 3000);
          } else {
            // Could still complete via IPN — tell user to wait
            setStatus('pending');
          }
        }
      } catch {
        attempts++;
        if (attempts < 3) setTimeout(check, 3000);
        else setStatus('failed');
      }
    };

    check();
  }, [orderTrackingId]);

  return (
    <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32 }}>

      {status === 'checking' && (
        <>
          <Spinner size={44} />
          <p style={{ color: T.teal, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, letterSpacing: '2px', textTransform: 'uppercase', marginTop: 20, animation: 'pulse 2s infinite' }}>Confirming payment...</p>
        </>
      )}

      {status === 'success' && (
        <>
          <div style={{ fontSize: 56, marginBottom: 16, animation: 'floatUp 3s ease infinite' }}>🎉</div>
          <h1 style={{ fontSize: 24, color: T.text, fontWeight: 700, marginBottom: 8, fontFamily: F.sans, textAlign: 'center' }}>Payment successful!</h1>
          <p style={{ color: T.textSub, fontSize: 14, marginBottom: 6, fontFamily: F.sans, textAlign: 'center' }}>
            You're now on the <strong style={{ color: T.teal }}>{plan.name}</strong> plan.
          </p>
          <p style={{ color: T.muted, fontSize: 13, marginBottom: 32, fontFamily: F.sans, textAlign: 'center' }}>
            {plan.subjectLimit === -1 ? 'Unlimited subjects' : `${plan.subjectLimit} subjects`} unlocked.
          </p>
          <Btn onClick={() => router.push('/dashboard')} style={{ padding: '14px 32px' }}>Go to Dashboard →</Btn>
        </>
      )}

      {status === 'pending' && (
        <>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
          <h1 style={{ fontSize: 22, color: T.text, fontWeight: 600, marginBottom: 8, fontFamily: F.sans, textAlign: 'center' }}>Payment is processing</h1>
          <p style={{ color: T.textSub, fontSize: 14, marginBottom: 12, fontFamily: F.sans, textAlign: 'center', lineHeight: 1.7 }}>
            This can take a minute with mobile money. Your account will upgrade automatically once confirmed.
          </p>
          <p style={{ color: T.muted, fontSize: 13, marginBottom: 32, fontFamily: F.sans, textAlign: 'center' }}>You can close this page safely.</p>
          <Btn onClick={() => router.push('/dashboard')} style={{ padding: '14px 32px' }}>Back to Dashboard</Btn>
        </>
      )}

      {status === 'failed' && (
        <>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠</div>
          <h1 style={{ fontSize: 22, color: T.text, fontWeight: 600, marginBottom: 8, fontFamily: F.sans, textAlign: 'center' }}>Payment not completed</h1>
          <p style={{ color: T.textSub, fontSize: 14, marginBottom: 32, fontFamily: F.sans, textAlign: 'center' }}>
            No charge was made. You can try again from the upgrade page.
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <Btn variant="ghost" onClick={() => router.push('/dashboard')}>Dashboard</Btn>
            <Btn onClick={() => router.push('/upgrade')}>Try again →</Btn>
          </div>
        </>
      )}

    </div>
  );
}
