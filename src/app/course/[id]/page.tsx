'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { getTopics } from '@/lib/firebase/firestore';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Tag, ProgressBar, Btn, Spinner, F } from '@/components/ui/primitives';
import type { Subject, Topic } from '@/types';

export default function CoursePage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { theme: T } = useTheme();
  const router = useRouter();

  const [subject, setSubject] = useState<Subject | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPublic, setIsPublic] = useState(false);
  const [togglingPublic, setTogglingPublic] = useState(false);
  const [showPublicModal, setShowPublicModal] = useState(false);
  const [publicConfirmed, setPublicConfirmed] = useState(false);

  useEffect(() => {
    if (!user || !id) return;
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'users', user.uid, 'subjects', id));
        if (snap.exists()) {
          setSubject({ id: snap.id, ...snap.data() } as Subject);
          const t = await getTopics(user.uid, id);
          setTopics(t);
          setLoading(false);
          return;
        }
      } catch {}

      // Demo fallback course
      setSubject({
        id,
        name: id.includes('bio') ? 'Cell Biology & Genetics' : id.includes('py') ? 'Python for Data Analysis' : 'Macroeconomics & Monetary Policy',
        status: 'In Progress',
        progress: 65,
        topicCount: 5,
        userId: user.uid,
        isPublic: false,
        preferences: { style: 'Conceptual', depth: 'Intermediate', goal: 'Exam Prep', pace: 'Balanced' },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      setTopics([
        { id: 't-1', title: 'Introduction to Central Banking & Money Supply', content: 'Central banking involves controlling interest rates and managing macroeconomic stability.', readTime: '6', status: 'completed', assessmentScore: 88, order: 0 },
        { id: 't-2', title: 'Open Market Operations & Reserve Requirements', content: 'Open market operations (OMO) refer to central bank purchases and sales of government securities in the open market to expand or contract money in the banking system.\n\n### Key Functions of Reserve Requirements\n- **Controlling Liquidity:** By adjusting the required cash ratio, central banks regulate how much commercial banks can loan.\n- **Stabilizing Interest Rates:** Ensures banks maintain enough reserves during daily interbank settlements.', readTime: '8', status: 'completed', assessmentScore: 92, order: 1 },
        { id: 't-3', title: 'Quantitative Easing & Unconventional Monetary Policy', content: 'When interest rates hit the zero lower bound, central banks utilize quantitative easing (QE) to stimulate aggregate demand.\n\n### The Mechanism of QE\n1. The central bank creates digital currency reserves.\n2. It purchases long-term government bonds and mortgage-backed securities.\n3. Yields decrease, lowering borrowing costs for businesses and households.', readTime: '10', status: 'in-progress', order: 2 },
        { id: 't-4', title: 'Inflation Targeting and the Phillips Curve', content: 'The trade-off between unemployment and inflation has evolved over economic cycles.', readTime: '7', status: 'not-started', order: 3 },
        { id: 't-5', title: 'Global Currency Markets & Exchange Rates', content: 'Floating vs pegged exchange rate regimes in international trade.', readTime: '9', status: 'not-started', order: 4 },
      ]);
      setLoading(false);
    })();
  }, [user, id]);

  if (loading) return (
    <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Spinner size={36} />
    </div>
  );

  const togglePublic = async () => {
    if (!user || !id) return;
    setTogglingPublic(true);
    const newVal = !isPublic;
    try {
      const { doc, updateDoc, setDoc, deleteDoc, serverTimestamp } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase/config');
      await updateDoc(doc(db, 'users', user.uid, 'subjects', id), { isPublic: newVal });
      setIsPublic(newVal);
      if (newVal && subject) {
        await setDoc(doc(db, 'publicCourses', id), {
          id, name: subject.name,
          authorName: user.displayName || 'Anonymous',
          authorInitial: (user.displayName || 'A')[0].toUpperCase(),
          topicCount: topics.length,
          enrolledCount: 0, rating: 0,
          tags: (subject.preferences as any)?.tags || [],
          preview: (subject.preferences as any)?.goal || '',
          isPublic: true,
          createdAt: serverTimestamp(),
          ownerId: user.uid,
        });
      } else {
        await deleteDoc(doc(db, 'publicCourses', id));
      }
    } catch (e) { console.error(e); }
    finally { setTogglingPublic(false); }
  };

  if (!subject) return null;

  const done = topics.filter(t => t.status === 'completed').length;
  const allDone = done === topics.length && topics.length > 0;

  return (
    <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', flexDirection: 'column' }}>
      {/* Sticky header */}
      <header className="glass" style={{
        padding: '14px 24px', borderBottom: `1px solid ${T.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: T.navBg, position: 'sticky', top: 0, zIndex: 30,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, maxWidth: 800 }}>
          <button onClick={() => router.push('/dashboard')} style={{
            background: T.card2, border: `1.5px solid ${T.borderMid}`, color: T.text,
            width: 38, height: 38, borderRadius: 999, display: 'flex',
            alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontWeight: 800,
          }}>←</button>
          <span style={{
            fontSize: 18, color: T.text, fontWeight: 900,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: F.sans, letterSpacing: '-0.3px',
          }}>
            {subject.name}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={togglePublic} disabled={togglingPublic} style={{
            background: isPublic ? T.tealDim : T.card2,
            border: `1.5px solid ${isPublic ? T.teal : T.borderMid}`,
            color: isPublic ? T.teal : T.textSub,
            padding: '8px 16px', borderRadius: 999, fontSize: 12,
            fontFamily: F.sans, fontWeight: 800, cursor: 'pointer',
          }}>
            {togglingPublic ? 'Updating...' : isPublic ? '✓ Public' : 'Make Public'}
          </button>

          <button onClick={() => router.push(`/course/${id}/exam`)} style={{
            background: T.name === 'dark' || T.name === 'midnight' ? '#FAF5EE' : '#2C1810',
            border: 'none', color: T.name === 'dark' || T.name === 'midnight' ? '#140E0A' : '#FAF5EE',
            padding: '8px 18px', borderRadius: 999, fontSize: 12,
            fontFamily: F.sans, fontWeight: 800, letterSpacing: '0.5px',
            cursor: 'pointer', boxShadow: '0 4px 14px rgba(44, 24, 16, 0.15)',
          }}>
            TIMED EXAM →
          </button>
        </div>
      </header>

      {/* Main Content Area: Responsive 2-Column Split on Desktop */}
      <main style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{
          maxWidth: 1200, margin: '0 auto', padding: '24px 16px 60px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 20,
          alignItems: 'start',
        }}>
          {/* Left Column: Course Stats & Test Launcher (Sticky on PC) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Stats card */}
            <div style={{
              background: T.card, border: `1.5px solid ${T.borderMid}`,
              borderRadius: 32, padding: '28px 24px',
              position: 'relative', overflow: 'hidden',
              boxShadow: '0 12px 32px rgba(44, 24, 16, 0.05)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <span style={{ fontSize: 15, fontWeight: 800, color: T.text, fontFamily: F.sans }}>Course Progress</span>
                <Tag color={subject.progress === 100 ? T.green : T.teal}>{subject.progress}% Completed</Tag>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 20 }}>
                {[
                  { l: 'Total Topics', v: topics.length },
                  { l: 'Completed', v: done },
                  { l: 'Score Avg', v: done > 0 ? `${Math.round(topics.filter(t => t.assessmentScore).reduce((a, b) => a + (b.assessmentScore || 0), 0) / (done || 1))}%` : '—' }
                ].map((s, i) => (
                  <div key={i} style={{ textAlign: 'center', padding: '12px 6px', background: T.card2, borderRadius: 18, border: `1px solid ${T.border}` }}>
                    <div style={{ fontSize: 22, color: T.teal, fontWeight: 900, fontFamily: F.sans }}>{s.v}</div>
                    <div style={{ fontSize: 11, color: T.textSub, fontFamily: F.sans, fontWeight: 700, marginTop: 2 }}>{s.l}</div>
                  </div>
                ))}
              </div>

              <ProgressBar value={subject.progress} height={8} />
            </div>

            {/* Final Test unlock */}
            <div onClick={() => allDone && router.push(`/course/${id}/topic/final`)}
              className={allDone ? 'card-hover' : ''}
              style={{
                background: allDone
                  ? (T.name === 'dark' || T.name === 'midnight' ? '#2D1C13' : '#FAF3EB')
                  : T.card,
                border: `1.5px solid ${allDone ? T.teal : T.borderMid}`,
                borderRadius: 28, padding: '22px 24px',
                cursor: allDone ? 'pointer' : 'default', opacity: allDone ? 1 : 0.6,
                display: 'flex', alignItems: 'center', gap: 16, transition: 'all 0.2s',
                boxShadow: '0 8px 24px rgba(44, 24, 16, 0.04)',
              }}>
              <span style={{ fontSize: 32 }}>🏆</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, color: T.text, fontWeight: 800, marginBottom: 2, fontFamily: F.sans }}>Comprehensive Final Test</div>
                <div style={{ fontSize: 12, color: T.textSub, fontFamily: F.sans, lineHeight: 1.5 }}>
                  {allDone ? 'All topics finished! Take the final mastery test to certify completion.' : 'Complete all lesson topics on the right to unlock final certification.'}
                </div>
              </div>
              {allDone && <span style={{ color: T.teal, fontSize: 20, fontWeight: 800 }}>→</span>}
            </div>

            {/* Quick Exam Shortcut Card */}
            <div style={{
              background: T.card2, border: `1.5px solid ${T.borderMid}`,
              borderRadius: 28, padding: '22px 24px',
            }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: T.text, fontFamily: F.sans, marginBottom: 4 }}>Need Quick Revision?</div>
              <div style={{ fontSize: 12, color: T.textSub, fontFamily: F.sans, marginBottom: 16, lineHeight: 1.5 }}>
                Simulate a timed mock exam with custom duration and instant automated grading.
              </div>
              <Btn variant="primary" onClick={() => router.push(`/course/${id}/exam`)} style={{ width: '100%', padding: '12px' }}>
                Launch Timed Exam Simulator ⚡
              </Btn>
            </div>
          </div>

          {/* Right Column: Interactive Topic Checklist */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <span style={{ fontSize: 18, fontWeight: 900, color: T.text, fontFamily: F.sans, letterSpacing: '-0.3px' }}>Curriculum Syllabus</span>
              <span style={{ fontSize: 13, color: T.textSub, fontFamily: F.sans, fontWeight: 700 }}>{done} of {topics.length} completed</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {topics.map((t, i) => {
                const isNext = t.status !== 'completed' && (i === 0 || topics[i - 1]?.status === 'completed');
                const isDone = t.status === 'completed';
                return (
                  <button key={t.id} onClick={() => router.push(`/course/${id}/topic/${i}`)}
                    className="card-hover"
                    style={{
                      background: isNext
                        ? (T.name === 'dark' || T.name === 'midnight' ? '#2F231C' : '#FAF3EB')
                        : T.card,
                      border: `1.5px solid ${isNext ? T.teal : T.borderMid}`,
                      borderRadius: 24, padding: '20px 22px', textAlign: 'left',
                      display: 'flex', alignItems: 'center', gap: 16, transition: 'all 0.2s',
                      cursor: 'pointer', width: '100%',
                      boxShadow: isNext ? '0 6px 20px rgba(140, 83, 56, 0.12)' : '0 4px 14px rgba(44, 24, 16, 0.03)',
                    }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: '50%',
                      background: isDone ? T.green : isNext ? (T.name === 'dark' || T.name === 'midnight' ? '#FAF5EE' : '#2C1810') : T.card2,
                      color: isDone ? '#FFFFFF' : isNext ? (T.name === 'dark' || T.name === 'midnight' ? '#140E0A' : '#FAF5EE') : T.muted,
                      border: `1.5px solid ${isDone ? 'transparent' : T.border}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 14, fontWeight: 900, flexShrink: 0, fontFamily: F.sans,
                    }}>
                      {isDone ? '✓' : i + 1}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 11, fontWeight: 800, color: isNext ? T.teal : T.muted, fontFamily: F.sans, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                          TOPIC {i + 1}
                        </span>
                        {t.assessmentScore !== undefined && (
                          <Tag color={t.assessmentScore >= 80 ? T.green : T.amber}>{t.assessmentScore}% score</Tag>
                        )}
                        <span style={{ fontSize: 11, color: T.textSub, fontFamily: F.sans }}>· {t.readTime || '10'} min read</span>
                      </div>
                      <div style={{
                        fontSize: 15, fontWeight: 800, color: T.text, fontFamily: F.sans,
                        lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        {t.title}
                      </div>
                    </div>

                    <div style={{ fontSize: 16, color: isNext ? T.teal : T.muted, fontWeight: 800 }}>
                      →
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </main>

      {/* Make Public Modal */}
      {showPublicModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(28, 16, 10, 0.6)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: T.card, border: `1.5px solid ${T.borderMid}`, borderRadius: 28, padding: 24, maxWidth: 360, width: '100%', boxShadow: '0 24px 60px rgba(44, 24, 16, 0.2)' }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: T.text, fontFamily: F.sans, marginBottom: 6 }}>Make Course Public?</div>
            <div style={{ fontSize: 13, color: T.textSub, fontFamily: F.sans, lineHeight: 1.6, marginBottom: 16 }}>Your course will appear in the Explore tab for the community to learn from.</div>
            <div style={{ background: T.card2, border: `1px solid ${T.border}`, borderRadius: 16, padding: 14, marginBottom: 16 }}>
              <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer' }}>
                <input type="checkbox" checked={publicConfirmed} onChange={e => setPublicConfirmed(e.target.checked)} style={{ marginTop: 3, accentColor: T.teal }} />
                <span style={{ fontSize: 11, color: T.textSub, fontFamily: F.sans, lineHeight: 1.6 }}>I confirm this content is suitable to share publicly.</span>
              </label>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { setShowPublicModal(false); setPublicConfirmed(false); }} style={{ flex: 1, padding: 12, background: T.card2, border: `1px solid ${T.border}`, borderRadius: 999, color: T.textSub, fontFamily: F.sans, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
              <button onClick={() => { setShowPublicModal(false); togglePublic(); setPublicConfirmed(false); }} disabled={!publicConfirmed} style={{ flex: 1, padding: 12, background: publicConfirmed ? (T.name === 'dark' || T.name === 'midnight' ? '#FAF5EE' : '#2C1810') : T.dim, border: 'none', borderRadius: 999, color: publicConfirmed ? (T.name === 'dark' || T.name === 'midnight' ? '#140E0A' : '#FAF5EE') : T.muted, fontFamily: F.sans, fontSize: 13, fontWeight: 700, cursor: publicConfirmed ? 'pointer' : 'not-allowed' }}>Make Public</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
