'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { getTopics } from '@/lib/firebase/firestore';
import { Btn, Spinner, Tag, F } from '@/components/ui/primitives';
import type { Question } from '@/types';

export default function MockExamPage() {
  const { id } = useParams<{ id: string }>();
  const { user, profile } = useAuth();
  const { theme: T } = useTheme();
  const router = useRouter();

  const [step, setStep] = useState<'setup' | 'generating' | 'exam' | 'results'>('setup');
  const [curriculum, setCurriculum] = useState('');
  const [duration, setDuration] = useState(60);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [subjectContent, setSubjectContent] = useState('');
  const [timeLeft, setTimeLeft] = useState(0);
  const [cur, setCur] = useState(0);
  const [sel, setSel] = useState<any>(null);
  const [answered, setAnswered] = useState(false);
  const [scores, setScores] = useState<boolean[]>([]);

  if (profile && profile.plan === 'free') {
    return (
      <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <div style={{
          background: T.card, border: `1.5px solid ${T.borderMid}`,
          borderRadius: 36, padding: '40px 32px', maxWidth: 380, width: '100%',
          textAlign: 'center', boxShadow: '0 20px 60px rgba(44, 24, 16, 0.08)',
        }}>
          <div style={{ fontSize: 44, marginBottom: 16 }}>🔒</div>
          <h1 style={{ fontSize: 22, color: T.text, fontWeight: 800, marginBottom: 8, fontFamily: F.sans }}>Mock Exams Locked</h1>
          <p style={{ color: T.textSub, fontSize: 13, marginBottom: 28, fontFamily: F.sans, lineHeight: 1.6 }}>Upgrade to Starter, Scholar, or Unlimited to unlock full-length timed mock exams.</p>
          <div style={{ display: 'flex', gap: 10 }}>
            <Btn variant='ghost' onClick={() => router.back()} style={{ flex: 1 }}>← Back</Btn>
            <Btn onClick={() => router.push('/upgrade')} style={{ flex: 1.4 }}>Upgrade Now ✦</Btn>
          </div>
        </div>
      </div>
    );
  }

  // Load subject content
  useEffect(() => {
    if (!user || !id) return;
    getTopics(user.uid, id).then(ts => {
      setSubjectContent(ts.map(t => `## ${t.title}\n${t.content}`).join('\n\n').slice(0, 6000));
    });
  }, [user, id]);

  // Countdown
  useEffect(() => {
    if (step !== 'exam') return;
    setTimeLeft(duration * 60);
    const iv = setInterval(() => setTimeLeft(t => {
      if (t <= 1) { clearInterval(iv); setStep('results'); return 0; }
      return t - 1;
    }), 1000);
    return () => clearInterval(iv);
  }, [step, duration]);

  const handleStart = async () => {
    setStep('generating');
    try {
      const res = await fetch('/api/generate-mock-exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subjectContent, curriculumSpec: curriculum, duration }),
      });
      const data = await res.json();
      setQuestions(data.questions ?? []);
      setStep('exam');
    } catch {
      setStep('setup');
    }
  };

  const handleNext = () => {
    const q = questions[cur];
    const isCorrect = q.type === 'tf' ? String(sel) === String(q.correctAnswer) : sel === q.correctAnswer;
    setScores(s => [...s, isCorrect]);
    if (cur < questions.length - 1) { setCur(n => n + 1); setSel(null); setAnswered(false); }
    else setStep('results');
  };

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  const urgent = timeLeft > 0 && timeLeft < 300;

  if (step === 'setup') return (
    <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', flexDirection: 'column' }}>
      <div className="glass" style={{
        padding: '14px 24px', borderBottom: `1px solid ${T.border}`,
        display: 'flex', alignItems: 'center', gap: 14,
        background: T.navBg, position: 'sticky', top: 0, zIndex: 20,
      }}>
        <button onClick={() => router.back()} style={{
          background: T.card2, border: `1.5px solid ${T.borderMid}`, color: T.text,
          width: 38, height: 38, borderRadius: 999, display: 'flex',
          alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontWeight: 800,
        }}>←</button>
        <span style={{ fontSize: 18, color: T.text, fontWeight: 900, fontFamily: F.sans, letterSpacing: '-0.3px' }}>Simulated Mock Exam</span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '36px 20px 60px', maxWidth: 780, width: '100%', margin: '0 auto' }}>
        <div style={{
          background: T.card, border: `1.5px solid ${T.borderMid}`,
          borderRadius: 32, padding: '36px 32px',
          boxShadow: '0 16px 40px rgba(44, 24, 16, 0.05)',
        }} className="animate-fade-up">
          <h2 style={{ fontSize: 24, color: T.text, marginBottom: 6, fontWeight: 900, fontFamily: F.sans, letterSpacing: '-0.4px' }}>Configure Your Exam</h2>
          <p style={{ color: T.textSub, fontSize: 14, lineHeight: 1.6, marginBottom: 28, fontFamily: F.sans }}>AI synthesizes a timed mock examination based on your specified curriculum focus areas.</p>

          <div style={{ fontSize: 13, fontWeight: 800, color: T.text, fontFamily: F.sans, marginBottom: 8 }}>Curriculum or Specific Focus Area</div>
          <textarea
            value={curriculum} onChange={e => setCurriculum(e.target.value)}
            rows={5}
            placeholder="e.g. AP Macroeconomics Unit 3: Monetary Policy, Reserve Requirements, Open Market Operations, and Money Multiplier calculations..."
            style={{
              width: '100%', padding: '16px 18px', background: T.card2,
              border: `1.5px solid ${T.borderMid}`, borderRadius: 22, color: T.text,
              fontSize: 14, resize: 'vertical', lineHeight: 1.6, marginBottom: 24,
              fontFamily: F.sans,
            }}
          />

          <div style={{ fontSize: 13, fontWeight: 800, color: T.text, fontFamily: F.sans, marginBottom: 10 }}>Target Examination Duration</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 28 }}>
            {[30, 60, 90, 120].map(d => {
              const active = duration === d;
              return (
                <button key={d} onClick={() => setDuration(d)} style={{
                  padding: '14px 0',
                  background: active ? (T.name === 'dark' || T.name === 'midnight' ? '#FAF5EE' : '#2C1810') : T.card2,
                  border: `1.5px solid ${active ? 'transparent' : T.borderMid}`,
                  borderRadius: 999,
                  color: active ? (T.name === 'dark' || T.name === 'midnight' ? '#140E0A' : '#FAF5EE') : T.textSub,
                  fontFamily: F.sans, fontSize: 13, fontWeight: 800,
                  transition: 'all 0.2s', cursor: 'pointer',
                  boxShadow: active ? '0 4px 14px rgba(44, 24, 16, 0.15)' : 'none',
                }}>
                  {d} mins
                </button>
              );
            })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Btn disabled={!curriculum.trim()} onClick={handleStart} style={{ minWidth: 220, padding: '16px 28px', fontSize: 15 }}>
              Generate & Begin Exam →
            </Btn>
          </div>
        </div>
      </div>
    </div>
  );

  if (step === 'generating') return (
    <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <Spinner size={48} />
      <p style={{ color: T.teal, fontFamily: F.sans, fontSize: 15, fontWeight: 800, letterSpacing: '0.5px' }} className="animate-pulse-sm">Creating examination paper & scoring rubrics...</p>
    </div>
  );

  if (step === 'results') {
    const correct = scores.filter(Boolean).length;
    const pct = Math.round((correct / (questions.length || 1)) * 100);
    const passed = pct >= 70;
    return (
      <div style={{ minHeight: '100vh', background: T.bg, overflowY: 'auto', padding: '48px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          background: T.card, border: `1.5px solid ${T.borderMid}`,
          borderRadius: 36, padding: '48px 36px', maxWidth: 540, width: '100%',
          textAlign: 'center', boxShadow: '0 24px 64px rgba(44, 24, 16, 0.08)',
        }} className="animate-scale-in">
          <div style={{ fontSize: 52, marginBottom: 16 }}>📋</div>
          <h2 style={{ fontSize: 28, color: T.text, marginBottom: 6, fontWeight: 900, fontFamily: F.sans, letterSpacing: '-0.4px' }}>Exam Results</h2>
          <div style={{ fontSize: 56, color: passed ? T.green : T.amber, fontWeight: 900, margin: '14px 0', fontFamily: F.sans }}>{pct}%</div>
          <p style={{ color: T.textSub, fontSize: 14, marginBottom: 32, fontFamily: F.sans }}>{correct} of {questions.length} questions answered correctly · {duration} minute test</p>
          <div style={{ display: 'flex', gap: 12 }}>
            <Btn variant="ghost" onClick={() => { setStep('setup'); setCur(0); setSel(null); setAnswered(false); setScores([]); }} style={{ flex: 1, padding: '14px' }}>Retry Exam</Btn>
            <Btn onClick={() => router.push(`/course/${id}`)} style={{ flex: 1.4, padding: '14px' }}>Back to Course →</Btn>
          </div>
        </div>
      </div>
    );
  }

  // Exam in progress
  const q = questions[cur];
  if (!q) return null;
  const opts = q.type === 'tf' ? ['true', 'false'] : (q.options ?? []);

  return (
    <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', flexDirection: 'column' }}>
      <header className="glass" style={{
        padding: '14px 24px', borderBottom: `1px solid ${urgent ? T.red : T.border}`,
        background: urgent ? T.redDim : T.navBg,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        position: 'sticky', top: 0, zIndex: 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Tag color={urgent ? T.red : T.teal}>TIMED MOCK EXAM</Tag>
          <span style={{ fontSize: 13, color: T.textSub, fontFamily: F.sans, fontWeight: 700 }}>Question {cur + 1} of {questions.length}</span>
        </div>

        <div style={{ fontSize: 24, color: urgent ? T.red : T.teal, fontWeight: 900, fontFamily: F.sans, letterSpacing: '1px' }}>
          {fmt(timeLeft)}
        </div>

        <button onClick={() => setStep('results')} style={{
          background: T.redDim, border: `1px solid ${T.red}33`, color: T.red,
          padding: '8px 16px', borderRadius: 999, fontSize: 12, fontFamily: F.sans,
          fontWeight: 800, cursor: 'pointer',
        }}>
          End Exam
        </button>
      </header>

      <main style={{ flex: 1, overflowY: 'auto', padding: '36px 20px 60px', maxWidth: 840, width: '100%', margin: '0 auto' }}>
        <div style={{
          background: T.card, border: `1.5px solid ${T.borderMid}`,
          borderRadius: 32, padding: '36px 32px',
          boxShadow: '0 16px 44px rgba(44, 24, 16, 0.05)',
        }} className="animate-fade-up">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: T.teal, textTransform: 'uppercase', fontFamily: F.sans, letterSpacing: '0.8px' }}>
              {q.type === 'tf' ? 'True / False Question' : 'Multiple Choice Question'}
            </span>
          </div>

          <h3 style={{ fontSize: 20, color: T.text, fontWeight: 800, lineHeight: 1.45, marginBottom: 28, fontFamily: F.sans }}>
            {q.question}
          </h3>

          <div style={{
            display: 'grid',
            gridTemplateColumns: q.type === 'tf' ? '1fr 1fr' : 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 12,
            marginBottom: 28,
          }}>
            {opts.map((v, oi) => {
              const isSel = sel === v;
              const isPrimary = T.name === 'dark' || T.name === 'midnight';
              const bg = isSel ? (isPrimary ? '#FAF5EE' : '#2C1810') : T.card2;
              const border = isSel ? 'transparent' : T.borderMid;
              const textColor = isSel ? (isPrimary ? '#140E0A' : '#FAF5EE') : T.text;

              return (
                <button key={oi} onClick={() => setSel(v)}
                  className="active:scale-[0.98] transition-transform"
                  style={{
                    padding: '16px 18px', background: bg, border: `1.5px solid ${border}`,
                    borderRadius: 20, color: textColor, fontSize: 14, textAlign: 'left',
                    transition: 'all 0.2s', fontFamily: F.sans, fontWeight: 700, cursor: 'pointer',
                    boxShadow: isSel ? '0 4px 16px rgba(44, 24, 16, 0.12)' : 'none',
                    display: 'flex', alignItems: 'center', gap: 12, minHeight: 56, width: '100%',
                  }}>
                  <span style={{
                    width: 30, height: 30, borderRadius: '50%',
                    background: isSel ? 'rgba(255,255,255,0.2)' : T.border,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 800, flexShrink: 0,
                  }}>
                    {q.type === 'mcq' ? ['A','B','C','D'][oi] : oi === 0 ? 'T' : 'F'}
                  </span>
                  <span style={{ flex: 1, lineHeight: 1.4 }}>{q.type === 'tf' ? (v === 'true' ? 'True' : 'False') : v}</span>
                </button>
              );
            })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'stretch', width: '100%' }}>
            <Btn onClick={handleNext} disabled={sel === null} style={{ width: '100%', padding: '16px 28px', fontSize: 15 }}>
              {cur < questions.length - 1 ? 'Next Question →' : 'Submit Exam →'}
            </Btn>
          </div>
        </div>
      </main>
    </div>
  );
}
