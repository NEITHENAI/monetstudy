'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { getTopics, updateSubject } from '@/lib/firebase/firestore';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { MonoLabel, Tag, ProgressBar, Btn, Spinner, F } from '@/components/ui/primitives';
import type { Subject, Topic } from '@/types';

export default function CoursePage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { theme: T } = useTheme();
  const router = useRouter();

  const [subject, setSubject] = useState<Subject | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !id) return;
    (async () => {
      const snap = await getDoc(doc(db, 'users', user.uid, 'subjects', id));
      if (snap.exists()) setSubject({ id: snap.id, ...snap.data() } as Subject);
      const t = await getTopics(user.uid, id);
      setTopics(t);
      setLoading(false);
    })();
  }, [user, id]);

  if (loading) return (
    <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Spinner size={36} />
    </div>
  );
  if (!subject) return null;

  const done = topics.filter(t => t.status === 'completed').length;
  const allDone = done === topics.length && topics.length > 0;

  return (
    <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', flexDirection: 'column' }}>
      {/* Sticky header */}
      <div style={{ padding: '14px 20px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', gap: 12, background: T.navBg, backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 10 }}>
        <button onClick={() => router.push('/dashboard')} style={{ background: T.card2, border: `1px solid ${T.border}`, color: T.text, width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>←</button>
        <span style={{ flex: 1, fontSize: 15, color: T.text, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: F.sans }}>{subject.name}</span>
        <button onClick={() => router.push(`/course/${id}/exam`)} style={{ background: T.violetDim, border: `1px solid ${T.violet}33`, color: T.violet, padding: '6px 13px', borderRadius: 8, fontSize: 11, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '1px', cursor: 'pointer' }}>MOCK EXAM</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px', maxWidth: 480, width: '100%', margin: '0 auto' }}>
        {/* Stats card */}
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: '18px 20px', marginBottom: 16, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -30, right: -30, width: 100, height: 100, borderRadius: '50%', background: T.tealGlow, filter: 'blur(30px)', pointerEvents: 'none' }} />
          <div style={{ display: 'flex', gap: 0, marginBottom: 16 }}>
            {[{ l: 'Topics', v: topics.length }, { l: 'Done', v: done }, { l: 'Progress', v: `${subject.progress}%` }].map((s, i) => (
              <div key={i} style={{ flex: 1, textAlign: 'center', borderRight: i < 2 ? `1px solid ${T.border}` : 'none' }}>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 22, color: T.teal, fontWeight: 'bold' }}>{s.v}</div>
                <MonoLabel size={9}>{s.l}</MonoLabel>
              </div>
            ))}
          </div>
          <ProgressBar value={subject.progress} height={5} />
        </div>

        {/* Final Test unlock */}
        <div onClick={() => allDone && router.push(`/course/${id}/topic/final`)} style={{ background: allDone ? `linear-gradient(135deg, ${T.violetDim}, ${T.tealDim})` : T.card, border: `1px solid ${allDone ? T.violet + '44' : T.border}`, borderRadius: 13, padding: '15px 18px', marginBottom: 18, cursor: allDone ? 'pointer' : 'default', opacity: allDone ? 1 : 0.4, display: 'flex', alignItems: 'center', gap: 14, transition: 'all 0.2s' }}>
          <span style={{ fontSize: 26 }}>🏆</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, color: T.text, fontWeight: 600, marginBottom: 2, fontFamily: F.sans }}>Final Test</div>
            <div style={{ fontSize: 12, color: T.textSub, fontFamily: F.sans }}>{allDone ? '15 questions · All topics covered · Unlocked!' : 'Complete all topics to unlock'}</div>
          </div>
          {allDone && <span style={{ color: T.violet, fontSize: 18 }}>→</span>}
        </div>

        {/* Topic list */}
        <MonoLabel size={10}>Topics</MonoLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
          {topics.map((t, i) => {
            const isNext = t.status !== 'completed' && (i === 0 || topics[i - 1]?.status === 'completed');
            const isDone = t.status === 'completed';
            return (
              <button key={t.id} onClick={() => router.push(`/course/${id}/topic/${i}`)} style={{ background: isNext ? T.tealDim : T.card, border: `1px solid ${isNext ? T.teal : T.border}`, borderRadius: 12, padding: '15px 16px', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 14, transition: 'all 0.2s', boxShadow: isNext ? `0 0 16px ${T.tealGlow}` : 'none', cursor: 'pointer', width: '100%' }}>
                <div style={{ width: 34, height: 34, borderRadius: '50%', background: isDone ? T.green : isNext ? T.teal : T.dim, color: isDone || isNext ? T.btnText : T.muted, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0, fontFamily: F.sans }}>
                  {isDone ? '✓' : isNext ? '▶' : i + 1}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, color: T.text, fontWeight: 500, marginBottom: 3, fontFamily: F.sans }}>{t.title}</div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: T.muted }}>{t.readTime}min · {isDone ? `Score: ${t.assessmentScore ?? 0}%` : isNext ? 'Up next' : 'Not started'}</div>
                </div>
                <span style={{ color: T.muted, fontSize: 16 }}>›</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
