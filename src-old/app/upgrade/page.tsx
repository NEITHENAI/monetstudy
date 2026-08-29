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
        <header className="glass" style={{
          padding: '14px 24px', borderBottom: `1px solid ${T.border}`,
          background: T.navBg, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          position: 'sticky', top: 0, zIndex: 20,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button onClick={() => router.back()} style={{
              background: T.card2, border: `1.5px solid ${T.borderMid}`, color: T.text,
              width: 38, height: 38, borderRadius: 999, display: 'flex',
              alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontWeight: 800,
            }}>←</button>
            <span style={{ fontSize: 18, color: T.text, fontWeight: 900, fontFamily: F.sans, letterSpacing: '-0.3px' }}>Upgrade Plan</span>
          </div>

          <span style={{ fontSize: 12, color: T.textSub, fontFamily: F.sans, fontWeight: 700 }}>Lifetime Access · Zero Subscriptions</span>
        </header>

        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '36px 20px 60px' }}>
          {/* Heading */}
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: T.card, border: `1.5px solid ${T.borderMid}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 30, margin: '0 auto 16px',
              boxShadow: '0 12px 32px rgba(44, 24, 16, 0.06)',
            }}>✦</div>
            <h1 style={{ fontSize: 32, color: T.text, fontWeight: 900, marginBottom: 8, fontFamily: F.sans, letterSpacing: '-0.5px' }}>
              Unlock Your Learning Potential
            </h1>
            <p style={{ color: T.textSub, fontSize: 15, fontFamily: F.sans, maxWidth: 480, margin: '0 auto' }}>
              One-time payment · Lifetime access to your courses and exams · No recurring fees
            </p>
          </div>

          {/* Current plan badge */}
          {currentPlan !== 'free' && (
            <div style={{
              background: T.card, border: `1.5px solid ${T.borderMid}`,
              borderRadius: 24, padding: '16px 24px', marginBottom: 32,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              boxShadow: '0 6px 20px rgba(44, 24, 16, 0.04)',
              maxWidth: 600, margin: '0 auto 32px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 20, color: T.green }}>✓</span>
                <span style={{ fontSize: 14, color: T.text, fontFamily: F.sans, fontWeight: 700 }}>
                  Active Plan: <strong>{getPlanById(currentPlan).name}</strong>
                </span>
              </div>
              <Tag color={T.green}>
                {getPlanById(currentPlan).subjectLimit === -1 ? 'Unlimited Courses' : `${getPlanById(currentPlan).subjectLimit} Subjects`}
              </Tag>
            </div>
          )}

          {error && (
            <div style={{ background: T.redDim, border: `1px solid ${T.red}33`, borderRadius: 20, padding: '14px 20px', marginBottom: 28, color: T.red, fontSize: 13, fontFamily: F.sans, maxWidth: 600, margin: '0 auto 28px' }}>
              ⚠ {error}
            </div>
          )}

          {/* Plan cards: Multi-Column Responsive Grid on Desktop */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 20,
            marginBottom: 36,
          }}>
            {PLANS.filter(p => p.id !== 'free').map(plan => {
              const { main, dim } = planColors[plan.color];
              const isCurrent = currentPlan === plan.id;
              const isLower = planRank[currentPlan] > planRank[plan.id];
              const isSpinning = loading === plan.id;
              const isPopular = plan.id === 'scholar';

              return (
                <div key={plan.id}
                  className="card-hover"
                  style={{
                    background: T.card,
                    border: `2px solid ${isPopular ? (T.name === 'dark' || T.name === 'midnight' ? '#FAF5EE' : '#2C1810') : T.borderMid}`,
                    borderRadius: 32, padding: '32px 28px',
                    position: 'relative', overflow: 'hidden',
                    display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                    boxShadow: isPopular ? '0 16px 44px rgba(44, 24, 16, 0.08)' : '0 6px 20px rgba(44, 24, 16, 0.03)',
                  }}>

                  {plan.badge && (
                    <div style={{ position: 'absolute', top: 20, right: 20 }}>
                      <Tag color={main}>{plan.badge}</Tag>
                    </div>
                  )}

                  <div>
                    {/* Name + price */}
                    <div style={{ marginBottom: 20 }}>
                      <div style={{ fontSize: 22, color: T.text, fontWeight: 900, fontFamily: F.sans, marginBottom: 4 }}>{plan.name}</div>
                      <div style={{ fontSize: 13, color: T.textSub, fontFamily: F.sans }}>{plan.description}</div>
                    </div>

                    <div style={{ marginBottom: 24, padding: '16px 0', borderTop: `1px solid ${T.border}`, borderBottom: `1px solid ${T.border}` }}>
                      <div style={{ fontSize: 36, color: T.teal, fontWeight: 900, lineHeight: 1, fontFamily: F.sans }}>{plan.label}</div>
                      <div style={{ fontSize: 11, color: T.muted, marginTop: 6, fontWeight: 800, fontFamily: F.sans, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        {plan.subjectLimit === -1 ? 'Unlimited Study Courses' : `Up to ${plan.subjectLimit} Active Courses`}
                      </div>
                    </div>

                    {/* Features */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
                      {plan.features.map((f, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{
                            width: 22, height: 22, borderRadius: '50%',
                            background: dim, display: 'flex', alignItems: 'center',
                            justifyContent: 'center', color: main, fontSize: 12,
                            flexShrink: 0, fontWeight: 900,
                          }}>✓</div>
                          <span style={{ fontSize: 14, color: T.textSub, fontFamily: F.sans, fontWeight: 600 }}>{f}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* CTA Button */}
                  <div>
                    {isCurrent ? (
                      <div style={{ padding: '14px', background: T.card2, border: `1px solid ${T.borderMid}`, borderRadius: 999, textAlign: 'center', color: T.textSub, fontSize: 13, fontFamily: F.sans, fontWeight: 800 }}>
                        ✓ Current Active Plan
                      </div>
                    ) : isLower ? (
                      <div style={{ padding: '14px', background: T.card2, border: `1px solid ${T.border}`, borderRadius: 999, textAlign: 'center', color: T.muted, fontSize: 13, fontFamily: F.sans }}>
                        Already on Higher Plan
                      </div>
                    ) : (
                      <button
                        onClick={() => handlePay(plan)}
                        disabled={!!loading}
                        style={{
                          width: '100%', padding: '16px',
                          background: isPopular
                            ? (T.name === 'dark' || T.name === 'midnight' ? '#FAF5EE' : '#2C1810')
                            : T.card2,
                          border: isPopular ? 'none' : `1.5px solid ${T.borderMid}`,
                          borderRadius: 999,
                          color: isPopular
                            ? (T.name === 'dark' || T.name === 'midnight' ? '#140E0A' : '#FAF5EE')
                            : T.text,
                          fontSize: 14, fontWeight: 800, fontFamily: F.sans,
                          cursor: loading ? 'default' : 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          gap: 8, transition: 'all 0.2s',
                          boxShadow: isPopular ? '0 6px 20px rgba(44, 24, 16, 0.15)' : 'none',
                          opacity: loading && !isSpinning ? 0.5 : 1,
                        }}>
                        {isSpinning ? (
                          <>
                            <div style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid rgba(0,0,0,0.2)', borderTop: '2px solid rgba(0,0,0,0.6)', animation: 'spin 1s linear infinite' }} />
                            Connecting to payment...
                          </>
                        ) : `Get ${plan.name} (${plan.label}) →`}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop 2-Column Row for Payment Options and Promo Code */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20, marginBottom: 32 }}>
            {/* Payment methods */}
            <div style={{ background: T.card, border: `1.5px solid ${T.borderMid}`, borderRadius: 28, padding: '24px', boxShadow: '0 4px 16px rgba(44, 24, 16, 0.03)' }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: T.text, fontFamily: F.sans, marginBottom: 12 }}>Accepted Payment Methods</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {['💳 Visa / Mastercard', '📱 MTN Mobile Money', '📱 Airtel Money', '🏦 Bank Card', '🌍 Pesapal Gateway'].map((m, i) => (
                  <div key={i} style={{ background: T.card2, border: `1px solid ${T.border}`, borderRadius: 999, padding: '8px 14px', fontSize: 12, color: T.textSub, fontFamily: F.sans, fontWeight: 700 }}>{m}</div>
                ))}
              </div>
            </div>

            {/* Promo code section */}
            <div style={{ background: T.card, border: `1.5px solid ${T.borderMid}`, borderRadius: 28, padding: '24px', boxShadow: '0 4px 16px rgba(44, 24, 16, 0.03)' }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: T.text, fontFamily: F.sans, marginBottom: 12 }}>Have a Gift / Scholarship Code?</div>
              <div style={{ display: 'flex', gap: 10 }}>
                <input
                  value={promoCode}
                  onChange={e => { setPromoCode(e.target.value.toUpperCase()); setPromoError(''); setPromoSuccess(''); }}
                  onKeyDown={e => e.key === 'Enter' && handlePromo()}
                  placeholder="ENTER PROMO CODE"
                  style={{
                    flex: 1, padding: '12px 18px', background: T.card2,
                    border: `1.5px solid ${promoError ? T.red : promoSuccess ? T.green : T.borderMid}`,
                    borderRadius: 999, color: T.text, fontSize: 13,
                    fontFamily: F.sans, fontWeight: 800, letterSpacing: '1px',
                  }}
                />
                <button
                  onClick={handlePromo}
                  disabled={promoLoading || !promoCode.trim()}
                  style={{
                    padding: '12px 24px',
                    background: T.name === 'dark' || T.name === 'midnight' ? '#FAF5EE' : '#2C1810',
                    border: 'none', borderRadius: 999,
                    color: T.name === 'dark' || T.name === 'midnight' ? '#140E0A' : '#FAF5EE',
                    fontSize: 13, fontFamily: F.sans, fontWeight: 800,
                    cursor: promoLoading || !promoCode.trim() ? 'not-allowed' : 'pointer',
                    opacity: !promoCode.trim() ? 0.5 : 1, whiteSpace: 'nowrap',
                  }}>
                  {promoLoading ? '...' : 'Apply Code'}
                </button>
              </div>
              {promoError && <div style={{ marginTop: 10, fontSize: 12, color: T.red, fontFamily: F.sans, fontWeight: 600 }}>⚠ {promoError}</div>}
              {promoSuccess && <div style={{ marginTop: 10, fontSize: 12, color: T.green, fontFamily: F.sans, fontWeight: 600 }}>{promoSuccess}</div>}
            </div>
          </div>

          <p style={{ textAlign: 'center', color: T.muted, fontSize: 13, fontFamily: F.sans, lineHeight: 1.6 }}>
            🔒 256-bit encrypted checkout via Pesapal.<br />
            Your created study courses and revision progress never expire.
          </p>
        </div>
      </div>
    </>
  );
}
