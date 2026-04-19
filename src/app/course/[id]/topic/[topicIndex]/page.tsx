'use client';
import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { getTopics, updateTopic, updateSubject } from '@/lib/firebase/firestore';
import { MonoLabel, Tag, Btn, Spinner, F } from '@/components/ui/primitives';
import type { Topic, Question } from '@/types';
import ReactMarkdown from 'react-markdown';
import { getConceptImageUrl } from '@/lib/extractPDFImages';
import VoiceNarrator from '@/components/VoiceNarrator';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

// ─── SMART IMAGE (handles slow Pollinations generation) ─────────────
function SmartImage({ src, alt, T }: { src: string; alt: string; T: any }) {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [retryCount, setRetryCount] = useState(0);

  const imgSrc = retryCount > 0 ? `${src}${src.includes('?') ? '&' : '?'}retry=${retryCount}` : src;

  return (
    <div style={{ margin: '24px 0', textAlign: 'center' }}>
      {/* Loading state */}
      {status === 'loading' && (
        <div style={{
          width: '100%', height: 220, borderRadius: 12,
          background: `linear-gradient(110deg, ${T.card2} 30%, ${T.border} 50%, ${T.card2} 70%)`,
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.5s ease-in-out infinite',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column', gap: 8,
        }}>
          <div style={{ fontSize: 24 }}>🎨</div>
          <div style={{ fontSize: 11, color: T.muted, fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1 }}>
            GENERATING ILLUSTRATION...
          </div>
        </div>
      )}

      {/* Error state */}
      {status === 'error' && (
        <div style={{
          width: '100%', padding: '28px 16px', borderRadius: 12,
          border: `1px dashed ${T.border}`, background: T.card2,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
        }}>
          <div style={{ fontSize: 24 }}>📷</div>
          <div style={{ fontSize: 12, color: T.muted }}>Illustration unavailable</div>
          <button
            onClick={() => { setStatus('loading'); setRetryCount(r => r + 1); }}
            style={{
              background: T.teal, color: '#fff', border: 'none', borderRadius: 6,
              padding: '6px 14px', fontSize: 11, cursor: 'pointer', marginTop: 4,
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            Retry ↻
          </button>
        </div>
      )}

      {/* Hidden img that triggers load/error */}
      <img
        src={imgSrc}
        alt={alt}
        onLoad={() => setStatus('loaded')}
        onError={() => setStatus('error')}
        style={{
          maxWidth: '100%',
          borderRadius: 12,
          border: `1px solid ${T.borderMid || T.border}`,
          boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
          display: status === 'loaded' ? 'block' : 'none',
          margin: '0 auto',
          transition: 'opacity 0.4s ease',
        }}
      />

      {/* Caption */}
      {alt && status === 'loaded' && (
        <div style={{ fontSize: 11, color: T.muted, marginTop: 8, fontFamily: "'JetBrains Mono', monospace", fontStyle: 'italic' }}>
          {alt}
        </div>
      )}

      {/* Shimmer animation */}
      <style>{`@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
    </div>
  );
}

export default function TopicPage() {
  const { id, topicIndex } = useParams<{ id: string; topicIndex: string }>();
  const { user } = useAuth();
  const { theme: T } = useTheme();
  const router = useRouter();
  const isFinal = topicIndex === 'final';
  const idx = isFinal ? -1 : parseInt(topicIndex, 10);

  const [topics, setTopics] = useState<Topic[]>([]);
  const [topic, setTopic] = useState<Topic | null>(null);
  const [readPct, setReadPct] = useState(0);
  const [midFired, setMidFired] = useState(false);
  const [quizMode, setQuizMode] = useState<'mid' | 'assessment' | 'final' | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [quizLoading, setQuizLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pageImageUrls, setPageImageUrls] = useState<Record<number, string>>({});
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user || !id) return;
    
    // Load subject data for pageImageUrls
    import('firebase/firestore').then(({ doc, getDoc }) => {
      import('@/lib/firebase/config').then(({ db }) => {
        getDoc(doc(db, 'users', user.uid, 'subjects', id)).then(snap => {
          if (snap.exists()) {
            const data = snap.data();
            if (data.pageImageUrls) setPageImageUrls(data.pageImageUrls);
          }
        });
      });
    });

    getTopics(user.uid, id).then(ts => {
      setTopics(ts);
      if (!isFinal && ts[idx]) setTopic(ts[idx]);
      setLoading(false);
    });
  }, [user, id, idx, isFinal]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const pct = Math.round((el.scrollTop / Math.max(1, el.scrollHeight - el.clientHeight)) * 100);
    setReadPct(pct);
    if (pct >= 50 && !midFired && !quizMode) {
      setMidFired(true);
      triggerQuiz('mid');
    }
  };

  const triggerQuiz = async (type: 'mid' | 'assessment' | 'final') => {
    if (!topic) return;
    setQuizLoading(true);
    const count = type === 'mid' ? 5 : type === 'assessment' ? 15 : 30;
    try {
      const res = await fetch('/api/generate-assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topicTitle: topic.title, topicContent: topic.content, count }),
      });
      const data = await res.json();
      setQuestions(data.questions ?? []);
    } catch {
      setQuestions([]);
    }
    setQuizLoading(false);
    setQuizMode(type);
  };

  const handleComplete = async (score: number) => {
    if (!user || !topic) return;
    await updateTopic(user.uid, id, topic.id, {
      status: 'completed',
      assessmentScore: score,
    });
    // Update next topic to in-progress
    const nextTopic = topics[idx + 1];
    if (nextTopic) await updateTopic(user.uid, id, nextTopic.id, { status: 'in-progress' });

    // Recalculate subject progress
    const completedCount = topics.filter(t => t.status === 'completed').length + 1;
    const progress = Math.round((completedCount / topics.length) * 100);
    await updateSubject(user.uid, id, {
      progress,
      status: progress === 100 ? 'Completed' : 'In Progress',
    });

    setQuizMode(null);
    router.push(`/course/${id}`);
  };

  // Replace [PAGE_X] or [FIGURE_X] markers with actual image markdown
  const processContent = (raw: string): string => {
    let content = raw;
    // Handle [PAGE_X]
    content = content.replace(/\[PAGE_(\d+)\]/g, (_, num) => {
      const url = pageImageUrls[parseInt(num, 10)];
      if (url) return `\n\n![PDF Page ${num}](${url})\n\n`;
      return '';
    });
    // Handle [FIGURE_X]
    content = content.replace(/\[FIGURE_(\d+)\]/g, (_, num) => {
      return `\n\n![Figure ${num}](figure:${num})\n\n`;
    });
    return content;
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Spinner size={36} />
    </div>
  );

  if (quizLoading) return (
    <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <Spinner size={40} />
      <p style={{ color: T.teal, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, letterSpacing: '2px', textTransform: 'uppercase', animation: 'pulse 2s infinite' }}>Generating questions...</p>
    </div>
  );

  if (quizMode) return (
    <QuizScreen type={quizMode} questions={questions} onDone={(score) => {
      if (quizMode === 'mid') { setQuizMode(null); }
      else { handleComplete(score); }
    }} onBack={() => setQuizMode(null)} T={T} />
  );

  if (!topic) return null;

  return (
    <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', flexDirection: 'column' }}>
      {/* Reading progress bar */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 3, zIndex: 100, background: T.dim }}>
        <div style={{ width: `${readPct}%`, height: '100%', background: T.teal, boxShadow: `0 0 8px ${T.tealGlow}`, transition: 'width 0.3s' }} />
      </div>

      {/* Header */}
      <div style={{ padding: '17px 20px 13px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', gap: 12, background: T.navBg, backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 10 }}>
        <button onClick={() => router.push(`/course/${id}`)} style={{ background: T.card2, border: `1px solid ${T.border}`, color: T.text, width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>←</button>
        <Tag color={T.teal}>Topic {idx + 1}</Tag>
        <span style={{ flex: 1, fontSize: 13, color: T.text, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: F.sans }}>{topic.title}</span>
        <MonoLabel size={10}>{topic.readTime}m</MonoLabel>
      </div>

      {/* Content */}
      <div ref={scrollRef} onScroll={handleScroll} style={{ flex: 1, overflowY: 'auto', padding: '28px 20px', maxWidth: 600, width: '100%', margin: '0 auto' }}>
        <h1 style={{ fontSize: 22, color: T.text, marginBottom: 24, fontWeight: 700, lineHeight: 1.35, fontFamily: F.sans }}>{topic.title}</h1>

      <div style={{ color: T.textSub, fontSize: 15, lineHeight: 1.9, fontFamily: F.sans }}>
          <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[rehypeKatex]}
            components={{
              h2: ({children}) => <h2 style={{ fontSize: 17, color: T.teal, fontWeight: 600, margin: '28px 0 10px', fontFamily: F.sans }}>{children}</h2>,
              h3: ({children}) => <h3 style={{ fontSize: 15, color: T.teal, fontWeight: 600, margin: '22px 0 8px', fontFamily: F.sans }}>{children}</h3>,
              strong: ({children}) => <strong style={{ color: T.text, fontWeight: 600 }}>{children}</strong>,
              ul: ({children}) => <ul style={{ paddingLeft: 20, marginBottom: 16 }}>{children}</ul>,
              ol: ({children}) => <ol style={{ paddingLeft: 20, marginBottom: 16 }}>{children}</ol>,
              li: ({children}) => <li style={{ marginBottom: 6, color: T.textSub }}>{children}</li>,
              p: ({children}) => <p style={{ marginBottom: 14, lineHeight: 1.9 }}>{children}</p>,
              code: ({children}) => <code style={{ background: T.card2, padding: '2px 6px', borderRadius: 4, fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: T.teal }}>{children}</code>,
              blockquote: ({children}) => <blockquote style={{ borderLeft: `3px solid ${T.teal}`, paddingLeft: 16, margin: '16px 0', color: T.muted, fontStyle: 'italic' }}>{children}</blockquote>,
              img: ({src, alt}) => <SmartImage src={src || ''} alt={alt || ''} T={T} />,
            }}
          >
            {processContent(topic.content)}
          </ReactMarkdown>
          {topic && <VoiceNarrator text={topic.content} theme={T} />}
        </div>

        <div style={{ marginTop: 48, paddingTop: 28, borderTop: `1px solid ${T.border}`, textAlign: 'center' }}>
          <div style={{ fontSize: 14, color: T.textSub, marginBottom: 18, fontFamily: F.sans }}>Ready? Take the assessment to mark this topic as complete.</div>
          <Btn onClick={() => triggerQuiz('assessment')} style={{ width: '100%', padding: '14px' }}>Take Assessment →</Btn>
        </div>

        {/* Prev / Next */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24, paddingTop: 20, borderTop: `1px solid ${T.border}` }}>
          <button disabled={idx === 0} onClick={() => router.push(`/course/${id}/topic/${idx - 1}`)} style={{ background: T.card2, border: `1px solid ${T.border}`, borderRadius: 8, padding: '9px 16px', color: idx === 0 ? T.muted : T.text, fontSize: 13, opacity: idx === 0 ? 0.38 : 1, cursor: idx === 0 ? 'default' : 'pointer', fontFamily: F.sans }}>← Prev</button>
          <button disabled={idx >= topics.length - 1} onClick={() => router.push(`/course/${id}/topic/${idx + 1}`)} style={{ background: T.card2, border: `1px solid ${T.border}`, borderRadius: 8, padding: '9px 16px', color: idx >= topics.length - 1 ? T.muted : T.text, fontSize: 13, opacity: idx >= topics.length - 1 ? 0.38 : 1, cursor: idx >= topics.length - 1 ? 'default' : 'pointer', fontFamily: F.sans }}>Next →</button>
        </div>

        <div style={{ height: 40 }} />
      </div>
    </div>
  );
}

// ─── QUIZ SCREEN ────────────────────────────────────────────────────
function QuizScreen({ type, questions, onDone, onBack, T }: { type: string; questions: Question[]; onDone: (score: number) => void; onBack: () => void; T: any }) {
  const [cur, setCur] = useState(0);
  const [sel, setSel] = useState<any>(null);
  const [answered, setAnswered] = useState(false);
  const [scores, setScores] = useState<boolean[]>([]);
  const [done, setDone] = useState(false);

  if (!questions.length) return (
    <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
      <div style={{ fontSize: 36, marginBottom: 14 }}>⚠</div>
      <div style={{ color: T.textSub, fontSize: 15, textAlign: 'center', fontFamily: F.sans, marginBottom: 24 }}>Could not load questions. Please try again.</div>
      <Btn variant="ghost" onClick={onBack}>← Back to lesson</Btn>
    </div>
  );

  const q = questions[cur];
  const total = questions.length;
  const typeLabel: Record<string, string> = { mid: 'Mid-Topic Quiz', assessment: 'Assessment', final: 'Final Test' };
  const tc = type === 'mid' ? T.teal : type === 'assessment' ? T.amber : T.violet;

  const isCorrect = () => {
    if (q.type === 'tf') return String(sel) === String(q.correctAnswer);
    return sel === q.correctAnswer;
  };

  const handleNext = () => {
    const c = isCorrect();
    const newScores = [...scores, c];
    setScores(newScores);
    if (cur < total - 1) { setCur(n => n + 1); setSel(null); setAnswered(false); }
    else setDone(true);
  };

  if (done) {
    const correct = scores.filter(Boolean).length;
    const pct = Math.round((correct / total) * 100);
    const passed = pct >= 70;
    return (
      <div style={{ minHeight: '100vh', background: T.bg, overflowY: 'auto', padding: '48px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 14 }}>{passed ? '🎉' : '📖'}</div>
        <h2 style={{ fontSize: 24, color: T.text, marginBottom: 6, fontWeight: 600, fontFamily: F.sans }}>{passed ? 'Well done!' : 'Keep going!'}</h2>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 48, color: passed ? T.green : T.amber, fontWeight: 'bold', margin: '14px 0', lineHeight: 1 }}>{pct}%</div>
        <div style={{ color: T.textSub, fontSize: 14, marginBottom: 24, fontFamily: F.sans }}>{correct} of {total} correct · {passed ? 'Passed ✓' : 'Below 70%'}</div>
        {!passed && (
          <div style={{ background: T.amberDim, border: `1px solid ${T.amber}33`, borderRadius: 10, padding: '12px 16px', marginBottom: 20, maxWidth: 340, width: '100%', fontSize: 13, color: T.amber, fontFamily: F.sans }}>
            ⚠ Consider reviewing before moving on. You can still continue.
          </div>
        )}
        <div style={{ display: 'flex', gap: 10, maxWidth: 340, width: '100%' }}>
          {type === 'mid' && <Btn variant="ghost" onClick={() => onDone(pct)} style={{ flex: 1 }}>Back to lesson →</Btn>}
          {type !== 'mid' && <Btn onClick={() => onDone(pct)} style={{ flex: 1, padding: '13px' }}>Continue →</Btn>}
        </div>
      </div>
    );
  }

  const opts = q.type === 'tf' ? ['true', 'false'] : (q.options ?? []);

  return (
    <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '16px 20px', borderBottom: `1px solid ${T.border}`, flexShrink: 0, background: T.navBg }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <Tag color={tc}>{typeLabel[type] ?? type}</Tag>
          <MonoLabel size={10}>{cur + 1} / {total}</MonoLabel>
        </div>
        <div style={{ background: T.dim, borderRadius: 99, height: 3 }}>
          <div style={{ width: `${(cur / total) * 100}%`, height: '100%', background: tc, borderRadius: 99, transition: 'width 0.3s' }} />
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px', maxWidth: 560, width: '100%', margin: '0 auto' }}>
        <MonoLabel size={9} color={T.muted}>{q.type === 'tf' ? 'True / False' : 'Multiple Choice'}</MonoLabel>
        <div style={{ fontSize: 17, color: T.text, fontWeight: 500, lineHeight: 1.65, margin: '13px 0 22px', fontFamily: F.sans }}>{q.question}</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {opts.map((v, oi) => {
            const isSel = sel === v;
            const correct = v === String(q.correctAnswer);
            const bg = !answered ? (isSel ? T.tealDim : T.card2) : correct ? T.greenDim : isSel ? T.redDim : T.card2;
            const border = !answered ? (isSel ? T.teal : T.border) : correct ? T.green : isSel ? T.red : T.border;
            return (
              <button key={oi} onClick={() => !answered && setSel(v)} style={{ padding: '14px 16px', background: bg, border: `1px solid ${border}`, borderRadius: 11, color: T.text, fontSize: 14, textAlign: 'left', transition: 'all 0.2s', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: F.sans, cursor: 'pointer' }}>
                <span>
                  {q.type === 'mcq' && <span style={{ color: T.muted, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, marginRight: 10 }}>{['A','B','C','D'][oi]}.</span>}
                  {q.type === 'tf' ? (v === 'true' ? '✓ True' : '✗ False') : v}
                </span>
                {answered && correct && <span style={{ color: T.green }}>✓</span>}
                {answered && isSel && !correct && <span style={{ color: T.red }}>✗</span>}
              </button>
            );
          })}
        </div>

        {answered && (
          <div style={{ marginTop: 16, padding: '13px 15px', background: isCorrect() ? T.greenDim : T.redDim, border: `1px solid ${isCorrect() ? T.green : T.red}33`, borderRadius: 10 }}>
            <div style={{ fontSize: 14, color: isCorrect() ? T.green : T.red, fontWeight: 600, marginBottom: 4, fontFamily: F.sans }}>{isCorrect() ? '✓ Correct!' : '✗ Not quite'}</div>
            <div style={{ fontSize: 13, color: T.textSub, lineHeight: 1.65, fontFamily: F.sans }}>{q.explanation}</div>
          </div>
        )}

        <div style={{ marginTop: 18 }}>
          {!answered
            ? <Btn onClick={() => sel !== null && setAnswered(true)} disabled={sel === null} style={{ width: '100%', padding: '13px' }}>Check Answer</Btn>
            : <Btn variant="ghost" onClick={handleNext} style={{ width: '100%', padding: '13px' }}>{cur < total - 1 ? 'Next Question →' : 'See Results →'}</Btn>
          }
        </div>
      </div>
    </div>
  );
}
