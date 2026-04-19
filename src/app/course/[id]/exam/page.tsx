'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { getTopics } from '@/lib/firebase/firestore';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { MonoLabel, Btn, Spinner, Tag, F } from '@/components/ui/primitives';
import type { Question, Topic } from '@/types';

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
        <div style={{ fontSize: 52, marginBottom: 16 }}>🔒</div>
        <h1 style={{ fontSize: 22, color: T.text, fontWeight: 700, marginBottom: 8, fontFamily: F.sans, textAlign: 'center' }}>Mock Exams are for paid plans</h1>
        <p style={{ color: T.textSub, fontSize: 14, marginBottom: 32, fontFamily: F.sans, textAlign: 'center' }}>Upgrade to Starter, Scholar, or Unlimited to unlock timed mock exams.</p>
        <div style={{ display: 'flex', gap: 10 }}>
          <Btn variant='ghost' onClick={() => router.back()}>← Go back</Btn>
          <Btn onClick={() => router.push('/upgrade')}>Upgrade now ✦</Btn>
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
  }, [step]);

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
      <div style={{ padding: '14px 20px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', gap: 12, background: T.surface }}>
        <button onClick={() => router.back()} style={{ background: T.card2, border: `1px solid ${T.border}`, color: T.text, width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>←</button>
        <span style={{ fontSize: 15, color: T.text, fontWeight: 600, fontFamily: F.sans }}>Mock Exam</span>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '22px 20px', maxWidth: 480, width: '100%', margin: '0 auto' }}>
        <p style={{ color: T.textSub, fontSize: 14, lineHeight: 1.7, marginBottom: 22, fontFamily: F.sans }}>Paste your exam curriculum. AI generates a full timed exam tailored to your course content.</p>
        <MonoLabel size={10} color={T.teal}>Curriculum / Exam Format</MonoLabel>
        <textarea value={curriculum} onChange={e => setCurriculum(e.target.value)} rows={5} placeholder="e.g. AQA Biology Paper 1: 30 marks, focus on cell biology and genetics..." style={{ width: '100%', marginTop: 9, padding: '13px 16px', background: T.card2, border: `1px solid ${T.border}`, borderRadius: 10, color: T.text, fontSize: 14, resize: 'none', lineHeight: 1.7, marginBottom: 22, caretColor: T.teal, fontFamily: F.sans }} onFocus={e => (e.target.style.borderColor = T.borderMid)} onBlur={e => (e.target.style.borderColor = T.border)} />
        <MonoLabel size={10} color={T.teal}>Duration</MonoLabel>
        <div style={{ display: 'flex', gap: 10, margin: '9px 0 24px' }}>
          {[30, 60, 90, 120].map(d => (
            <button key={d} onClick={() => setDuration(d)} style={{ flex: 1, padding: '11px 0', background: duration === d ? T.tealDim : T.card2, border: `1px solid ${duration === d ? T.teal : T.border}`, borderRadius: 10, color: duration === d ? T.teal : T.muted, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, transition: 'all 0.2s', cursor: 'pointer' }}>{d}m</button>
          ))}
        </div>
        <Btn disabled={!curriculum.trim()} onClick={handleStart} style={{ width: '100%', padding: '13px' }}>Generate & Start Exam →</Btn>
      </div>
    </div>
  );

  if (step === 'generating') return (
    <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <Spinner size={44} />
      <p style={{ color: T.teal, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, letterSpacing: '2px', textTransform: 'uppercase', animation: 'pulse 2s infinite' }}>Building your exam...</p>
    </div>
  );

  if (step === 'results') {
    const correct = scores.filter(Boolean).length;
    const pct = Math.round((correct / questions.length) * 100);
    const passed = pct >= 70;
    return (
      <div style={{ minHeight: '100vh', background: T.bg, overflowY: 'auto', padding: '48px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 14 }}>📋</div>
        <h2 style={{ fontSize: 22, color: T.text, marginBottom: 6, fontWeight: 600, fontFamily: F.sans }}>Exam Complete</h2>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 48, color: passed ? T.green : T.amber, fontWeight: 'bold', margin: '14px 0' }}>{pct}%</div>
        <div style={{ color: T.textSub, fontSize: 14, marginBottom: 24, fontFamily: F.sans }}>{correct} / {questions.length} correct · {duration} minute exam</div>
        <div style={{ display: 'flex', gap: 10, maxWidth: 340, width: '100%' }}>
          <Btn variant="ghost" onClick={() => { setStep('setup'); setCur(0); setSel(null); setAnswered(false); setScores([]); }} style={{ flex: 1 }}>Retry</Btn>
          <Btn onClick={() => router.push(`/course/${id}`)} style={{ flex: 1 }}>Back to course</Btn>
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
      <div style={{ padding: '13px 20px', borderBottom: `1px solid ${urgent ? T.red : T.border}`, background: urgent ? T.redDim : T.surface, display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.5s' }}>
        <MonoLabel size={10}>Mock Exam</MonoLabel>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 26, color: urgent ? T.red : T.teal, fontWeight: 'bold', animation: urgent ? 'pulse 1s infinite' : 'none' }}>{fmt(timeLeft)}</div>
        <button onClick={() => setStep('results')} style={{ background: T.redDim, border: `1px solid ${T.red}33`, color: T.red, padding: '6px 12px', borderRadius: 8, fontSize: 11, fontFamily: "'JetBrains Mono', monospace", cursor: 'pointer' }}>Submit</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px', maxWidth: 560, width: '100%', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <MonoLabel size={9} color={T.muted}>{q.type === 'tf' ? 'True / False' : 'Multiple Choice'}</MonoLabel>
          <MonoLabel size={10}>{cur + 1} / {questions.length}</MonoLabel>
        </div>
        <div style={{ fontSize: 17, color: T.text, fontWeight: 500, lineHeight: 1.65, marginBottom: 22, fontFamily: F.sans }}>{q.question}</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {opts.map((v, oi) => {
            const isSel = sel === v;
            const correct = v === String(q.correctAnswer);
            const bg = !answered ? (isSel ? T.tealDim : T.card2) : correct ? T.greenDim : isSel ? T.redDim : T.card2;
            const border = !answered ? (isSel ? T.teal : T.border) : correct ? T.green : isSel ? T.red : T.border;
            return (
              <button key={oi} onClick={() => !answered && setSel(v)} style={{ padding: '14px 16px', background: bg, border: `1px solid ${border}`, borderRadius: 11, color: T.text, fontSize: 14, textAlign: 'left', transition: 'all 0.2s', fontFamily: F.sans, cursor: 'pointer' }}>
                {q.type === 'mcq' && <span style={{ color: T.muted, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, marginRight: 10 }}>{['A','B','C','D'][oi]}.</span>}
                {q.type === 'tf' ? (v === 'true' ? '✓ True' : '✗ False') : v}
              </button>
            );
          })}
        </div>

        <div style={{ marginTop: 18 }}>
          {!answered
            ? <Btn onClick={() => sel !== null && setAnswered(true)} disabled={sel === null} style={{ width: '100%', padding: '13px' }}>Check Answer</Btn>
            : <Btn variant="ghost" onClick={handleNext} style={{ width: '100%', padding: '13px' }}>{cur < questions.length - 1 ? 'Next →' : 'Finish Exam →'}</Btn>
          }
        </div>
      </div>
    </div>
  );
}
