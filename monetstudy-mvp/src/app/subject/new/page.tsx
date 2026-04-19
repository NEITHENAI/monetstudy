'use client';
import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { createSubject, saveTopic } from '@/lib/firebase/firestore';
import { MonoLabel, Btn, Spinner, F } from '@/components/ui/primitives';
import type { CoursePreferences } from '@/types';

type Step = 'name' | 'content' | 'personalise' | 'generating';

// ─── FILE TEXT EXTRACTORS ─────────────────────────────────────────

async function extractPDF(file: File): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    pages.push(content.items.map((item: any) => item.str).join(' '));
  }
  return pages.join('\n\n').trim();
}

async function extractDocx(file: File): Promise<string> {
  const mammoth = await import('mammoth');
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value.trim();
}

async function extractTxt(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve((e.target?.result as string) ?? '');
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

async function extractFileText(file: File): Promise<string> {
  const n = file.name.toLowerCase();
  if (n.endsWith('.pdf'))            return extractPDF(file);
  if (n.endsWith('.docx'))           return extractDocx(file);
  if (n.endsWith('.txt') || n.endsWith('.md')) return extractTxt(file);
  throw new Error(`Unsupported file type. Use PDF, .docx, or .txt`);
}

// ─── PAGE ─────────────────────────────────────────────────────────

export default function NewSubjectPage() {
  const { user, profile } = useAuth();
  const { theme: T } = useTheme();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep]               = useState<Step>('name');
  const [name, setName]               = useState('');
  const [inputType, setInputType]     = useState<string | null>(null);
  const [text, setText]               = useState('');
  const [file, setFile]               = useState<File | null>(null);
  const [fileStatus, setFileStatus]   = useState<'idle' | 'reading' | 'done' | 'error'>('idle');
  const [fileError, setFileError]     = useState('');
  const [dragging, setDragging]       = useState(false);
  const [prefs, setPrefs]             = useState<Partial<CoursePreferences>>({});
  const [progress, setProgress]       = useState(0);
  const [stage, setStage]             = useState('Reading your content...');
  const [error, setError]             = useState('');

  const setP = (k: keyof CoursePreferences, v: string) => setPrefs(p => ({ ...p, [k]: v }));

  const isFileInput = inputType === 'pdf' || inputType === 'file';
  const canNext1 =
    (inputType === 'paste' || inputType === 'describe')
      ? text.trim().length > 20
      : isFileInput && fileStatus === 'done' && text.trim().length > 20;
  const canGen = !!(prefs.style && prefs.depth && prefs.goal && prefs.pace);

  const inp: React.CSSProperties = {
    width: '100%', padding: '13px 16px', background: T.card2,
    border: `1px solid ${T.border}`, borderRadius: 10, color: T.text,
    fontSize: 15, fontFamily: F.sans, caretColor: T.teal, transition: 'border-color 0.2s',
  };

  const OBtn = ({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) => (
    <button onClick={onClick} style={{ padding: '9px 15px', borderRadius: 9, background: active ? T.tealDim : T.card2, border: `1px solid ${active ? T.teal : T.border}`, color: active ? T.teal : T.textSub, fontSize: 13, fontFamily: F.sans, transition: 'all 0.2s', boxShadow: active ? `0 0 12px ${T.tealGlow}` : 'none', cursor: 'pointer' }}>
      {label}
    </button>
  );

  // ── File processing ────────────────────────────────────────────
  const processFile = useCallback(async (f: File) => {
    setFile(f);
    setText('');
    setFileError('');
    setFileStatus('reading');
    try {
      const extracted = await extractFileText(f);
      if (!extracted || extracted.length < 30) {
        setFileError('File appears to be empty or could not be read. Try copy-pasting the text instead.');
        setFileStatus('error');
        return;
      }
      setText(extracted);
      setFileStatus('done');
    } catch (e: any) {
      setFileError(e.message || 'Failed to read file.');
      setFileStatus('error');
    }
  }, []);

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) processFile(f);
  }, [processFile]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) processFile(f);
    // reset so same file can be re-selected
    e.target.value = '';
  };

  const switchInputType = (id: string) => {
    setInputType(id);
    if (id !== 'pdf' && id !== 'file') { setFile(null); setFileStatus('idle'); }
    if (id !== 'paste' && id !== 'describe') setText('');
  };

  // ── Course generation ──────────────────────────────────────────
  const stages = [
    'Reading your content...',
    'Identifying key topics...',
    'Writing lesson content...',
    'Generating quiz questions...',
    'Building assessments...',
    'Finalising your course...',
  ];

  const handleGenerate = async () => {
    if (!user || !canGen) return;
    setStep('generating');
    setError('');
    let si = 0;
    const stageTimer = setInterval(() => {
      si = Math.min(si + 1, stages.length - 1);
      setStage(stages[si]);
      setProgress(Math.round((si / stages.length) * 80));
    }, 2500);

    try {
      const res = await fetch('/api/generate-course', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ material: text, ...prefs }),
      });
      if (!res.ok) throw new Error('AI generation failed. Please try again.');
      const course = await res.json();

      clearInterval(stageTimer);
      setProgress(90);
      setStage('Saving to your account...');

      const subjectId = await createSubject(user.uid, {
        userId: user.uid,
        name: course.title || name,
        status: 'In Progress',
        progress: 0,
        topicCount: course.topics.length,
        preferences: prefs as CoursePreferences,
        isPublic: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      for (let i = 0; i < course.topics.length; i++) {
        const t = course.topics[i];
        await saveTopic(user.uid, subjectId, {
          title: t.title, content: t.content,
          order: i, readTime: String(t.estimatedMinutes ?? 15),
          status: i === 0 ? 'in-progress' : 'not-started',
        });
      }

      setProgress(100);
      setTimeout(() => router.push(`/course/${subjectId}`), 500);
    } catch (e: any) {
      clearInterval(stageTimer);
      setError(e.message || 'Something went wrong');
      setStep('personalise');
    }
  };

  const stepItems = ['Name', 'Content', 'Personalise'];

  return (
    <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '14px 20px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', gap: 12, background: T.surface, flexShrink: 0 }}>
        <button onClick={() => router.back()} style={{ background: T.card2, border: `1px solid ${T.border}`, color: T.text, width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>←</button>
        <span style={{ fontSize: 15, color: T.text, fontWeight: 600, fontFamily: F.sans }}>New Subject</span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px', maxWidth: 480, width: '100%', margin: '0 auto' }}>

        {/* Step indicators */}
        {step !== 'generating' && (
          <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
            {stepItems.map((s, i) => {
              const cur = ['name', 'content', 'personalise'].indexOf(step);
              return (
                <div key={s} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'center' }}>
                  <div style={{ height: 3, width: '100%', borderRadius: 2, background: i <= cur ? T.teal : T.dim, transition: 'background 0.3s' }} />
                  <MonoLabel size={9} color={i <= cur ? T.teal : T.muted}>{s}</MonoLabel>
                </div>
              );
            })}
          </div>
        )}

        {/* ── NAME ── */}
        {step === 'name' && (
          <div style={{ animation: 'fadeUp 0.3s ease' }}>
            <h2 style={{ fontSize: 20, color: T.text, marginBottom: 5, fontWeight: 600, fontFamily: F.sans }}>Name your subject</h2>
            <p style={{ color: T.textSub, fontSize: 14, marginBottom: 22, fontFamily: F.sans }}>This appears on your dashboard.</p>
            <input value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g. Biology A-Level, Python Basics..."
              style={inp}
              onFocus={e => (e.target.style.borderColor = T.borderMid)}
              onBlur={e => (e.target.style.borderColor = T.border)}
              onKeyDown={e => e.key === 'Enter' && name.trim() && setStep('content')} />
            <Btn onClick={() => setStep('content')} disabled={!name.trim()} style={{ width: '100%', marginTop: 18, padding: '13px' }}>Continue →</Btn>
          </div>
        )}

        {/* ── CONTENT ── */}
        {step === 'content' && (
          <div style={{ animation: 'fadeUp 0.3s ease' }}>
            <h2 style={{ fontSize: 20, color: T.text, marginBottom: 5, fontWeight: 600, fontFamily: F.sans }}>Add your material</h2>
            <p style={{ color: T.textSub, fontSize: 14, marginBottom: 20, fontFamily: F.sans }}>AI reads everything and builds your personalised course.</p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
              {[
                { id: 'paste',    icon: '✎',  label: 'Paste text' },
                { id: 'pdf',      icon: '📄',  label: 'Upload PDF' },
                { id: 'file',     icon: '📝',  label: '.txt / .docx' },
                { id: 'describe', icon: '✦',  label: 'Request course', pro: true },
              ].map(t => (
                <button key={t.id}
                  onClick={() => !(t.pro && profile?.plan === 'free') && switchInputType(t.id)}
                  style={{ padding: '15px 10px', background: inputType === t.id ? T.tealDim : T.card2, border: `1px solid ${inputType === t.id ? T.teal : T.border}`, borderRadius: 12, textAlign: 'center', opacity: t.pro && profile?.plan === 'free' ? 0.45 : 1, cursor: t.pro && profile?.plan === 'free' ? 'not-allowed' : 'pointer', transition: 'all 0.2s', position: 'relative' }}>
                  <div style={{ fontSize: 20, marginBottom: 5 }}>{t.icon}</div>
                  <div style={{ fontSize: 12, color: inputType === t.id ? T.teal : T.textSub, fontWeight: 500, fontFamily: F.sans }}>{t.label}</div>
                  {t.pro && (
                    <div style={{ position: 'absolute', top: 6, right: 6, background: `${T.violet}18`, color: T.violet, fontSize: 8, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '1px', padding: '2px 7px', borderRadius: 20 }}>PRO</div>
                  )}
                </button>
              ))}
            </div>

            {/* Text / describe */}
            {(inputType === 'paste' || inputType === 'describe') && (
              <textarea value={text} onChange={e => setText(e.target.value)} rows={8}
                placeholder={inputType === 'paste'
                  ? 'Paste your notes, curriculum specs, or study material here...'
                  : 'Describe the course you want — e.g. "A beginner\'s guide to machine learning with Python"'}
                style={{ ...inp, resize: 'none', lineHeight: 1.7, marginBottom: 16 }}
                onFocus={e => (e.target.style.borderColor = T.borderMid)}
                onBlur={e => (e.target.style.borderColor = T.border)} />
            )}

            {/* File drop zone */}
            {isFileInput && (
              <>
                <input ref={fileInputRef} type="file"
                  accept={inputType === 'pdf' ? '.pdf' : '.txt,.docx,.md'}
                  onChange={handleFileInput}
                  style={{ display: 'none' }} />

                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={handleFileDrop}
                  style={{ border: `2px dashed ${dragging ? T.teal : fileStatus === 'done' ? T.green : fileStatus === 'error' ? T.red : T.border}`, borderRadius: 12, padding: '36px 20px', textAlign: 'center', background: dragging ? T.tealDim : fileStatus === 'done' ? T.greenDim : T.surface, transition: 'all 0.2s', marginBottom: 8, cursor: 'pointer' }}>
                  {fileStatus === 'idle' && (
                    <>
                      <div style={{ fontSize: 30, opacity: 0.35, marginBottom: 8 }}>⬆</div>
                      <div style={{ color: T.textSub, fontSize: 14, fontFamily: F.sans, marginBottom: 4 }}>
                        Drop your {inputType === 'pdf' ? 'PDF' : '.txt or .docx'} here
                      </div>
                      <div style={{ color: T.muted, fontSize: 12, fontFamily: F.sans }}>or tap to browse</div>
                    </>
                  )}
                  {fileStatus === 'reading' && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                      <Spinner size={28} />
                      <div style={{ color: T.teal, fontSize: 12, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '1.5px', textTransform: 'uppercase' }}>Reading file...</div>
                    </div>
                  )}
                  {fileStatus === 'done' && (
                    <>
                      <div style={{ fontSize: 28, marginBottom: 8 }}>✓</div>
                      <div style={{ color: T.green, fontSize: 14, fontWeight: 600, fontFamily: F.sans, marginBottom: 3 }}>{file?.name}</div>
                      <div style={{ color: T.muted, fontSize: 12, fontFamily: F.sans }}>{text.length.toLocaleString()} characters extracted</div>
                    </>
                  )}
                  {fileStatus === 'error' && (
                    <>
                      <div style={{ fontSize: 26, marginBottom: 8 }}>⚠</div>
                      <div style={{ color: T.red, fontSize: 13, fontFamily: F.sans, marginBottom: 6 }}>{fileError}</div>
                      <div style={{ color: T.muted, fontSize: 12, fontFamily: F.sans }}>Tap to try another file</div>
                    </>
                  )}
                </div>

                {fileStatus === 'done' && (
                  <button onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }} style={{ background: 'none', border: 'none', color: T.muted, fontSize: 12, fontFamily: F.sans, cursor: 'pointer', marginBottom: 12 }}>
                    ↺ Change file
                  </button>
                )}
              </>
            )}

            {inputType && (
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <Btn variant="ghost" onClick={() => setStep('name')} style={{ flex: 1 }}>← Back</Btn>
                <Btn onClick={() => setStep('personalise')} disabled={!canNext1} style={{ flex: 2, padding: '13px' }}>Personalise →</Btn>
              </div>
            )}
          </div>
        )}

        {/* ── PERSONALISE ── */}
        {step === 'personalise' && (
          <div style={{ animation: 'fadeUp 0.3s ease' }}>
            <h2 style={{ fontSize: 20, color: T.text, marginBottom: 5, fontWeight: 600, fontFamily: F.sans }}>Personalise your course</h2>
            <p style={{ color: T.textSub, fontSize: 14, marginBottom: 22, fontFamily: F.sans }}>AI tailors every lesson to how you learn best.</p>
            {[
              { key: 'style' as const, label: 'Learning Style', opts: ['Conceptual', 'Example-heavy', 'Detailed walkthrough'] },
              { key: 'depth' as const, label: 'Depth',          opts: ['Beginner', 'Intermediate', 'Advanced'] },
              { key: 'goal'  as const, label: 'Your Goal',      opts: ['Exam Prep', 'Deep Understanding', 'Quick Revision'] },
              { key: 'pace'  as const, label: 'Pace',           opts: ['Compact', 'Balanced', 'Thorough'] },
            ].map(g => (
              <div key={g.key} style={{ marginBottom: 20 }}>
                <MonoLabel size={10} color={T.teal}>{g.label}</MonoLabel>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 9 }}>
                  {g.opts.map(o => <OBtn key={o} label={o} active={prefs[g.key] === o} onClick={() => setP(g.key, o)} />)}
                </div>
              </div>
            ))}
            {error && (
              <div style={{ marginBottom: 14, padding: '10px 14px', background: T.redDim, border: `1px solid ${T.red}33`, borderRadius: 8, color: T.red, fontSize: 13, fontFamily: F.sans }}>{error}</div>
            )}
            <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
              <Btn variant="ghost" onClick={() => setStep('content')} style={{ flex: 1 }}>← Back</Btn>
              <Btn onClick={handleGenerate} disabled={!canGen} style={{ flex: 2, padding: '13px' }}>✦ Generate Course</Btn>
            </div>
          </div>
        )}

        {/* ── GENERATING ── */}
        {step === 'generating' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', animation: 'fadeIn 0.4s ease' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', border: `3px solid ${T.border}`, borderTop: `3px solid ${T.teal}`, animation: 'spin 1s linear infinite', marginBottom: 28 }} />
            <h2 style={{ fontSize: 22, color: T.text, textAlign: 'center', marginBottom: 8, fontWeight: 600, fontFamily: F.sans }}>Building "{name}"</h2>
            <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: T.teal, marginBottom: 36, animation: 'pulse 2s infinite', textAlign: 'center' }}>{stage}</p>
            <div style={{ width: '100%', maxWidth: 300 }}>
              <div style={{ background: T.dim, borderRadius: 99, overflow: 'hidden', height: 5 }}>
                <div style={{ width: `${progress}%`, height: '100%', background: T.teal, borderRadius: 99, boxShadow: `0 0 10px ${T.tealGlow}`, transition: 'width 0.6s ease' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                <MonoLabel size={9}>AI generation</MonoLabel>
                <MonoLabel size={9} color={T.teal}>{progress}%</MonoLabel>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
