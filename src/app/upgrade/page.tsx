'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { MonoLabel, Btn, Tag, Spinner, F } from '@/components/ui/primitives';
import { PLANS, getPlanById } from '@/lib/plans';
import type { Plan } from '@/lib/plans';
import type { PlanTier } from '@/types';

// ─── PESAPAL IFRAME MODAL ─────────────────────────────────────────
function PaymentModal({ iframeUrl, onClose }: { iframeUrl: string; onClose: () => void }) {
  const { theme: T } = useTheme();
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', flexDirection: 'column' }}>
      {/* Backdrop */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
      {/* Modal */}
      <div style={{ position: 'relative', margin: 'auto', width: '100%', maxWidth: 480, height: '85vh', background: T.surface, borderRadius: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}>
        {/* Modal header */}
        <div style={{ padding: '14px 18px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: T.teal, boxShadow: `0 0 8px ${T.tealGlow}` }} />
            <span style={{ fontSize: 14, color: T.text, fontWeight: 600, fontFamily: F.sans }}>Secure Payment</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 11, color: T.muted, fontFamily: F.sans }}>Powered by Pesapal</span>
            <button onClick={onClose} style={{ background: T.card2, border: `1px solid ${T.border}`, color: T.muted, width: 28, height: 28, borderRadius: 6, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>×</button>
          </div>
        </div>
        {/* Iframe */}
        <iframe
          src={iframeUrl}
          style={{ flex: 1, border: 'none', width: '100%' }}
          allow="payment"
          title="Pesapal Payment"
        />
      </div>
    </div>
  );
}

// ─── UPGRADE PAGE ─────────────────────────────────────────────────
export default function UpgradePage() {
  const { theme: T } = useTheme();
  const { user, profile, refreshProfile } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState<PlanTier | null>(null);
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState('');
  const [promoSuccess, setPromoSuccess] = useState('');

  const currentPlan = profile?.plan ?? 'free';

  const planColors: Record<string, { main: string; dim: string; glow: string }> = {
    teal:   { main: T.teal,   dim: T.tealDim,   glow: T.tealGlow  },
    violet: { main: T.violet, dim: T.violetDim,  glow: `${T.violet}30` },
    amber:  { main: T.amber,  dim: T.amberDim,   glow: `${T.amber}30`  },
  };

  const handlePromo = async () => {
    if (!user || !promoCode.trim()) return;
    setPromoLoading(true);
    setPromoError('');
    setPromoSuccess('');
    try {
      const { collection, query, where, getDocs, doc, updateDoc, serverTimestamp } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase/config');
      const code = promoCode.trim().toUpperCase();
      const q = query(collection(db, 'promoCodes'), where('code', '==', code), where('used', '==', false));
      const snap = await getDocs(q);
      if (snap.empty) throw new Error('Invalid or already used promo code');
      const promoDoc = snap.docs[0];
      const plan = promoDoc.data().plan;
      const limits: Record<string, number> = { starter: 3, scholar: 10, unlimited: -1 };
      await updateDoc(doc(db, 'promoCodes', promoDoc.id), { used: true, usedBy: user.uid, usedAt: serverTimestamp() });
      await updateDoc(doc(db, 'users', user.uid), { plan, subjectLimit: limits[plan] || 3 });
      setPromoSuccess('Code applied! You now have the ' + plan + ' plan.');
      setPromoCode('');
      setTimeout(() => window.location.reload(), 1500);
    } catch (e: any) {
      setPromoError(e.message);
    } finally {
      setPromoLoading(false);
    }
  };

  const handlePay = async (plan: Plan) => {
    if (!user || !profile || loading) return;
    setError('');
    setLoading(plan.id);

    try {
      const res = await fetch('/api/pesapal-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: plan.id,
          userId: user.uid,
          email: profile.email,
          name: profile.name,
          currency: 'USD',
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Failed to create order');
      setIframeUrl(data.iframeUrl);
    } catch (e: any) {
      setError(e.message || 'Could not initiate payment. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  const handleModalClose = async () => {
    setIframeUrl(null);
    // Refresh profile in case payment completed while modal was open
    await refreshProfile();
  };

  const planRank: Record<PlanTier, number> = { free: 0, starter: 1, scholar: 2, unlimited: 3 };

  return (
    <>
      {iframeUrl && <PaymentModal iframeUrl={iframeUrl} onClose={handleModalClose} />}

      <div style={{ minHeight: '100vh', background: T.bg }}>
        {/* Header */}
        <div style={{ padding: '14px 20px', borderBottom: `1px solid ${T.border}`, background: T.surface, display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: T.muted, fontSize: 14, fontFamily: F.sans, cursor: 'pointer' }}>← Back</button>
        </div>

        <div style={{ maxWidth: 440, margin: '0 auto', padding: '32px 20px 48px' }}>
          {/* Heading */}
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>✦</div>
            <h1 style={{ fontSize: 24, color: T.text, fontWeight: 700, marginBottom: 6, fontFamily: F.sans }}>Unlock More Subjects</h1>
            <p style={{ color: T.textSub, fontSize: 14, fontFamily: F.sans }}>One-time payment. No subscription. No expiry.</p>
          </div>

          {/* Current plan badge */}
          {currentPlan !== 'free' && (
            <div style={{ background: T.tealDim, border: `1px solid ${T.borderMid}`, borderRadius: 10, padding: '10px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 16 }}>✓</span>
              <span style={{ fontSize: 13, color: T.teal, fontFamily: F.sans }}>
                You're on <strong>{getPlanById(currentPlan).name}</strong> —{' '}
                {getPlanById(currentPlan).subjectLimit === -1 ? 'unlimited subjects' : `${getPlanById(currentPlan).subjectLimit} subjects`}
              </span>
            </div>
          )}

          {error && (
            <div style={{ background: T.redDim, border: `1px solid ${T.red}33`, borderRadius: 10, padding: '12px 16px', marginBottom: 20, color: T.red, fontSize: 13, fontFamily: F.sans }}>
              ⚠ {error}
            </div>
          )}

          {/* Plan cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {PLANS.filter(p => p.id !== 'free').map(plan => {
              const { main, dim, glow } = planColors[plan.color];
              const isCurrent = currentPlan === plan.id;
              const isLower = planRank[currentPlan] > planRank[plan.id];
              const isSpinning = loading === plan.id;

              return (
                <div key={plan.id} style={{ background: T.card, border: `1px solid ${isCurrent ? main + '55' : T.border}`, borderRadius: 16, padding: '20px 20px 16px', position: 'relative', overflow: 'hidden', transition: 'all 0.2s', boxShadow: isCurrent ? `0 0 24px ${glow}` : 'none' }}>
                  {/* Ambient glow */}
                  <div style={{ position: 'absolute', top: -50, right: -50, width: 140, height: 140, borderRadius: '50%', background: dim, filter: 'blur(50px)', pointerEvents: 'none' }} />

                  {plan.badge && (
                    <div style={{ position: 'absolute', top: 14, right: 14 }}>
                      <Tag color={main}>{plan.badge}</Tag>
                    </div>
                  )}

                  {/* Name + price */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                    <div>
                      <div style={{ fontSize: 18, color: T.text, fontWeight: 700, fontFamily: F.sans, marginBottom: 2 }}>{plan.name}</div>
                      <div style={{ fontSize: 12, color: T.muted, fontFamily: F.sans }}>{plan.description}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 26, color: main, fontWeight: 'bold', lineHeight: 1 }}>{plan.label}</div>
                      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: T.muted, marginTop: 3, letterSpacing: '1px' }}>
                        {plan.subjectLimit === -1 ? 'UNLIMITED' : `${plan.subjectLimit} SUBJECTS`}
                      </div>
                    </div>
                  </div>

                  {/* Features */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 16 }}>
                    {plan.features.map((f, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 18, height: 18, borderRadius: '50%', background: dim, display: 'flex', alignItems: 'center', justifyContent: 'center', color: main, fontSize: 10, flexShrink: 0 }}>✓</div>
                        <span style={{ fontSize: 13, color: T.textSub, fontFamily: F.sans }}>{f}</span>
                      </div>
                    ))}
                  </div>

                  {/* CTA */}
                  {isCurrent ? (
                    <div style={{ padding: '11px', background: dim, border: `1px solid ${main}33`, borderRadius: 10, textAlign: 'center', color: main, fontSize: 13, fontFamily: F.sans, fontWeight: 600 }}>
                      ✓ Current plan
                    </div>
                  ) : isLower ? (
                    <div style={{ padding: '11px', background: T.card2, border: `1px solid ${T.border}`, borderRadius: 10, textAlign: 'center', color: T.muted, fontSize: 13, fontFamily: F.sans }}>
                      Already on a higher plan
                    </div>
                  ) : (
                    <button
                      onClick={() => handlePay(plan)}
                      disabled={!!loading}
                      style={{ width: '100%', padding: '13px', background: isSpinning ? dim : main, border: 'none', borderRadius: 10, color: T.name === 'dark' || T.name === 'midnight' ? '#050810' : '#fff', fontSize: 14, fontWeight: 700, fontFamily: F.sans, cursor: loading ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.2s', boxShadow: `0 4px 20px ${glow}`, opacity: loading && !isSpinning ? 0.5 : 1 }}>
                      {isSpinning ? (
                        <>
                          <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(0,0,0,0.2)', borderTop: '2px solid rgba(0,0,0,0.6)', animation: 'spin 1s linear infinite' }} />
                          Opening payment...
                        </>
                      ) : `Pay ${plan.label} →`}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Payment methods */}
          <div style={{ marginTop: 24, background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: '14px 18px' }}>
            <MonoLabel size={9}>Accepted Payment Methods</MonoLabel>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
              {['💳 Visa / Mastercard', '📱 MTN Mobile Money', '📱 Airtel Money', '🏦 Bank Transfer', '🌍 + More via Pesapal'].map((m, i) => (
                <div key={i} style={{ background: T.card2, border: `1px solid ${T.border}`, borderRadius: 7, padding: '5px 11px', fontSize: 12, color: T.textSub, fontFamily: F.sans }}>{m}</div>
              ))}
            </div>
          </div>

          {/* Promo code section */}
          <div style={{ marginTop: 20, background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: '18px 18px' }}>
            <MonoLabel size={10} color={T.teal}>HAVE A PROMO CODE?</MonoLabel>
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <input
                value={promoCode}
                onChange={e => { setPromoCode(e.target.value.toUpperCase()); setPromoError(''); setPromoSuccess(''); }}
                onKeyDown={e => e.key === 'Enter' && handlePromo()}
                placeholder="Enter promo code"
                style={{ flex: 1, padding: '10px 14px', background: T.card2, border: `1px solid ${promoError ? T.red : promoSuccess ? T.green : T.border}`, borderRadius: 8, color: T.text, fontSize: 13, fontFamily: "'JetBrains Mono', monospace", caretColor: T.teal, letterSpacing: 1, outline: 'none' }}
              />
              <button
                onClick={handlePromo}
                disabled={promoLoading || !promoCode.trim()}
                style={{ padding: '10px 18px', background: T.tealDim, border: `1px solid ${T.borderMid}`, borderRadius: 8, color: T.teal, fontSize: 13, fontFamily: F.sans, fontWeight: 600, cursor: promoLoading || !promoCode.trim() ? 'not-allowed' : 'pointer', opacity: !promoCode.trim() ? 0.5 : 1, whiteSpace: 'nowrap' }}>
                {promoLoading ? '...' : 'Apply'}
              </button>
            </div>
            {promoError && <div style={{ marginTop: 8, fontSize: 12, color: T.red, fontFamily: F.sans }}>⚠ {promoError}</div>}
            {promoSuccess && <div style={{ marginTop: 8, fontSize: 12, color: T.green, fontFamily: F.sans }}>{promoSuccess}</div>}
          </div>

          <p style={{ textAlign: 'center', marginTop: 20, color: T.muted, fontSize: 12, fontFamily: F.sans, lineHeight: 1.7 }}>
            Payments processed securely by Pesapal.<br />
            Your subjects never expire. Upgrade anytime.
          </p>
        </div>
      </div>
    </>
  );
}
