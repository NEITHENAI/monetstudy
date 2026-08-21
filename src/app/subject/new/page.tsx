'use client';
import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { createSubject, saveTopic, generateSubjectId } from '@/lib/firebase/firestore';
import { uploadPageImages, uploadSourceMaterial } from '@/lib/firebase/storage';
import { MonoLabel, Btn, Spinner, ProgressBar, F } from '@/components/ui/primitives';
import type { CoursePreferences } from '@/types';
import { extractPDFWithImages, type ExtractedPage } from '@/lib/extractPDFImages';

type Step = 'name' | 'content' | 'personalise' | 'generating';

// ─── FILE TEXT EXTRACTORS ─────────────────────────────────────────

async function extractPDF(file: File): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs`;
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
  if (n.endsWith('.pptx')) {
    const { extractPPTX } = await import('@/lib/extractPPTX');
    return extractPPTX(file);
  }
  if (n.endsWith('.ppt')) {
    throw new Error('Old .ppt format is not supported. Please convert to .pptx first.');
  }
  if (n.endsWith('.txt') || n.endsWith('.md')) return extractTxt(file);
  throw new Error(`Unsupported file type. Use PDF, .docx, .pptx, or .txt`);
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
  const [extractedPages, setExtractedPages] = useState<ExtractedPage[]>([]);
  const extractedPagesRef = useRef<ExtractedPage[]>([]);
  const [pageImages, setPageImages]   = useState<string[]>([]);
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
    width: '100%', padding: '14px 20px', background: T.card2,
    border: `1.5px solid ${T.borderMid}`, borderRadius: 999, color: T.text,
    fontSize: 14, fontFamily: F.sans, caretColor: T.teal, transition: 'all 0.2s',
  };

  const OBtn = ({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) => (
    <button onClick={onClick} style={{
      padding: '8px 18px', borderRadius: 999,
      background: active ? (T.name === 'dark' || T.name === 'midnight' ? '#FAF5EE' : '#2C1810') : T.card,
      border: `1.5px solid ${active ? 'transparent' : T.borderMid}`,
      color: active ? (T.name === 'dark' || T.name === 'midnight' ? '#140E0A' : '#FAF5EE') : T.textSub,
      fontSize: 12, fontWeight: 700, fontFamily: F.sans,
      transition: 'all 0.2s', cursor: 'pointer',
      boxShadow: active ? '0 4px 14px rgba(44, 24, 16, 0.15)' : 'none',
    }}>
      {label}
    </button>
  );

  // ── File processing ────────────────────────────────────────────
  const processFile = useCallback(async (f: File) => {
    setFile(f);
    setText('');
    setFileError('');
    setPageImages([]);
    setFileStatus('reading');
    try {
      const isPDF = f.name.toLowerCase().endsWith('.pdf');

      if (isPDF) {
        // Extract text + page images for vision processing
        const { fullText: extracted, pages: extractedPagesData } = await extractPDFWithImages(f);
        if (!extracted || extracted.length < 30) {
          setFileError('File appears to be empty or could not be read. Try copy-pasting the text instead.');
          setFileStatus('error');
          return;
        }
        setText(extracted);
        setExtractedPages(extractedPagesData);
        extractedPagesRef.current = extractedPagesData;
      } else {
        const extracted = await extractFileText(f);
        if (!extracted || extracted.length < 30) {
          setFileError('File appears to be empty or could not be read. Try copy-pasting the text instead.');
          setFileStatus('error');
          return;
        }
        setText(extracted);
      }
      setFileStatus('done');
    } catch (e: any) {
      setFileError(e.message || 'Failed to read file.');
      setFileStatus('error');
    }
  }, [profile]);

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) processFile(f);
  }, [processFile]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) processFile(f);
    e.target.value = '';
  };

  const switchInputType = (id: string) => {
    setInputType(id);
    if (id !== 'pdf' && id !== 'file') { setFile(null); setFileStatus('idle'); }
    if (id !== 'paste' && id !== 'describe') setText('');
  };

  // ── Course generation ──────────────────────────────────────────
  const stages = [
    'Reading your study material...',
    'Extracting core concepts...',
    'Generating structured lessons...',
    'Writing interactive quizzes...',
    'Creating assessment scenarios...',
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
      const pendingPageImages = extractedPagesRef.current;
      let pageImageUrls: Record<number, string> = {};
      const subjectId = generateSubjectId(user.uid);

      if (pendingPageImages.length > 0) {
        setStage('Uploading visuals...');
        try {
          pageImageUrls = await uploadPageImages(user.uid, subjectId, pendingPageImages);
        } catch (err: any) {
          console.warn('Firebase Storage quota exceeded. Skipping image uploads...', err);
        }
      }

      let materialUrl = '';
      let payloadText = text;
      
      if (text.length > 50000) {
        setStage('Uploading textbook material...');
        try {
          materialUrl = await uploadSourceMaterial(user.uid, subjectId, text);
          payloadText = '';
        } catch (err: any) {
          console.warn('Firebase Storage quota exceeded. Sending raw text in payload directly...', err);
        }
      }

      setStage('Building course lessons with AI...');
      const imageUrls = Object.values(pageImageUrls);

      const res = await fetch('/api/generate-course', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          material: payloadText,
          materialUrl,
          imageUrls,
          userPlan: profile?.plan || 'free',
          ...prefs,
        }),
      });
      if (!res.ok) throw new Error('AI generation failed. Please try again.');
      const course = await res.json();

      clearInterval(stageTimer);
      setProgress(90);
      setStage('Saving to your account...');

      try {
        await createSubject(user.uid, {
          userId: user.uid,
          name: course.title || name,
          status: 'In Progress',
          progress: 0,
          topicCount: course.topics.length,
          preferences: prefs as CoursePreferences,
          isPublic: false,
          pageImageUrls,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }, subjectId);

        for (let i = 0; i < course.topics.length; i++) {
          const t = course.topics[i];
          await saveTopic(user.uid, subjectId, {
            title: t.title, content: t.content,
            order: i, readTime: String(t.estimatedMinutes ?? 15),
            status: i === 0 ? 'in-progress' : 'not-started',
          });
        }
      } catch (saveErr) {
        console.warn('[CreateSubject] Save completed with local cache fallback:', saveErr);
      }

      setProgress(100);
      setTimeout(() => router.push(`/course/${subjectId}`), 400);
    } catch (e: any) {
      clearInterval(stageTimer);
      setError(e.message || 'Something went wrong during generation. Please try again.');
      setStep('personalise');
    }
  };

  const stepItems = ['Title', 'Material', 'Preferences'];

  return (
    <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div className="glass" style={{
        padding: '14px 20px', borderBottom: `1px solid ${T.border}`,
        display: 'flex', alignItems: 'center', gap: 12,
        background: T.navBg, flexShrink: 0, position: 'sticky', top: 0, zIndex: 10,
      }}>
        <button onClick={() => router.back()} style={{
          background: T.card2, border: `1.5px solid ${T.borderMid}`, color: T.text,
          width: 36, height: 36, borderRadius: 999, display: 'flex', alignItems: 'center',
          justifyContent: 'center', cursor: 'pointer', fontWeight: 700,
        }}>←</button>
        <span style={{ fontSize: 16, color: T.text, fontWeight: 800, fontFamily: F.sans }}>New Study Course</span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '32px 20px 48px', maxWidth: 840, width: '100%', margin: '0 auto' }}>

        {/* Step indicators */}
        {step !== 'generating' && (
          <div style={{ display: 'flex', gap: 12, marginBottom: 32 }}>
            {stepItems.map((s, i) => {
              const cur = ['name', 'content', 'personalise'].indexOf(step);
              const isPastOrCur = i <= cur;
              return (
                <div key={s} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
                  <div style={{
                    height: 6, width: '100%', borderRadius: 999,
                    background: isPastOrCur ? (T.name === 'dark' || T.name === 'midnight' ? '#FAF5EE' : '#2C1810') : T.dim,
                    transition: 'background 0.3s ease',
                  }} />
                  <span style={{
                    fontFamily: F.sans, fontSize: 12, fontWeight: isPastOrCur ? 800 : 600,
                    color: isPastOrCur ? T.text : T.muted,
                  }}>
                    {i + 1}. {s}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* ── STEP 1: NAME ── */}
        {step === 'name' && (
          <div style={{
            background: T.card, border: `1.5px solid ${T.borderMid}`,
            borderRadius: 32, padding: '36px 32px',
            boxShadow: '0 12px 36px rgba(44, 24, 16, 0.05)',
          }} className="animate-fade-up">
            <h2 style={{ fontSize: 24, color: T.text, marginBottom: 6, fontWeight: 900, fontFamily: F.sans, letterSpacing: '-0.4px' }}>Name your subject</h2>
            <p style={{ color: T.textSub, fontSize: 14, marginBottom: 26, fontFamily: F.sans }}>Give your study course a clear, concise title.</p>
            <input value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g. Organic Chemistry, Microeconomics, Python for Data Science..."
              style={inp}
              onKeyDown={e => e.key === 'Enter' && name.trim() && setStep('content')} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24 }}>
              <Btn onClick={() => setStep('content')} disabled={!name.trim()} style={{ minWidth: 160, padding: '14px 24px' }}>Continue to Material →</Btn>
            </div>
          </div>
        )}

        {/* ── STEP 2: CONTENT ── */}
        {step === 'content' && (
          <div style={{
            background: T.card, border: `1.5px solid ${T.borderMid}`,
            borderRadius: 32, padding: '36px 32px',
            boxShadow: '0 12px 36px rgba(44, 24, 16, 0.05)',
          }} className="animate-fade-up">
            <h2 style={{ fontSize: 24, color: T.text, marginBottom: 6, fontWeight: 900, fontFamily: F.sans, letterSpacing: '-0.4px' }}>Add your material</h2>
            <p style={{ color: T.textSub, fontSize: 14, marginBottom: 24, fontFamily: F.sans }}>Choose how you&apos;d like to provide study content.</p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
              {[
                { id: 'paste',    icon: '✎',  label: 'Paste text' },
                { id: 'pdf',      icon: '📄',  label: 'Upload PDF' },
                { id: 'file',     icon: '📝',  label: '.txt / doc / ppt' },
                { id: 'describe', icon: '✦',  label: 'Describe topic', pro: true },
              ].map(t => (
                <button key={t.id}
                  onClick={() => !(t.pro && profile?.plan === 'free') && switchInputType(t.id)}
                  style={{
                    padding: '20px 14px',
                    background: inputType === t.id ? (T.name === 'dark' || T.name === 'midnight' ? '#2F231C' : '#FAF3EB') : T.card2,
                    border: `1.5px solid ${inputType === t.id ? T.teal : T.border}`,
                    borderRadius: 22, textAlign: 'center',
                    opacity: t.pro && profile?.plan === 'free' ? 0.45 : 1,
                    cursor: t.pro && profile?.plan === 'free' ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s', position: 'relative',
                  }}>
                  <div style={{ fontSize: 26, marginBottom: 6 }}>{t.icon}</div>
                  <div style={{ fontSize: 13, color: inputType === t.id ? T.teal : T.text, fontWeight: 800, fontFamily: F.sans }}>{t.label}</div>
                  {t.pro && (
                    <div style={{ position: 'absolute', top: 8, right: 8, background: `${T.violet}18`, color: T.violet, fontSize: 9, fontFamily: F.sans, fontWeight: 800, padding: '2px 8px', borderRadius: 999 }}>PRO</div>
                  )}
                </button>
              ))}
            </div>

            {/* Text / describe textarea */}
            {(inputType === 'paste' || inputType === 'describe') && (
              <textarea value={text} onChange={e => setText(e.target.value)} rows={9}
                placeholder={inputType === 'paste'
                  ? 'Paste your notes, textbook excerpts, lecture slides, or syllabus...'
                  : 'Describe what you want to learn (e.g., "Full guide to macroeconomic policy with examples")'}
                style={{
                  width: '100%', padding: '18px 20px', background: T.card2,
                  border: `1.5px solid ${T.borderMid}`, borderRadius: 24,
                  color: T.text, fontSize: 14, fontFamily: F.sans,
                  resize: 'vertical', lineHeight: 1.6, marginBottom: 20,
                }} />
            )}

            {/* File drop zone */}
            {isFileInput && (
              <>
                <input ref={fileInputRef} type="file"
                  accept={inputType === 'pdf' ? '.pdf' : '.txt,.docx,.md,.pptx'}
                  onChange={handleFileInput}
                  style={{ display: 'none' }} />

                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={handleFileDrop}
                  style={{
                    border: `2px dashed ${dragging ? T.teal : fileStatus === 'done' ? T.green : fileStatus === 'error' ? T.red : T.borderMid}`,
                    borderRadius: 28, padding: '48px 24px', textAlign: 'center',
                    background: dragging ? T.tealDim : fileStatus === 'done' ? T.greenDim : T.card2,
                    transition: 'all 0.2s', marginBottom: 16, cursor: 'pointer',
                  }}>
                  {fileStatus === 'idle' && (
                    <>
                      <div style={{ fontSize: 42, marginBottom: 12, opacity: 0.6 }}>📂</div>
                      <div style={{ color: T.text, fontSize: 16, fontWeight: 800, fontFamily: F.sans, marginBottom: 4 }}>
                        Drop your {inputType === 'pdf' ? 'PDF document' : 'file'} here
                      </div>
                      <div style={{ color: T.textSub, fontSize: 13, fontFamily: F.sans }}>or click to browse your desktop files</div>
                    </>
                  )}
                  {fileStatus === 'reading' && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                      <Spinner size={36} />
                      <div style={{ color: T.teal, fontSize: 14, fontFamily: F.sans, fontWeight: 800 }}>Extracting document structure & images...</div>
                    </div>
                  )}
                  {fileStatus === 'done' && (
                    <>
                      <div style={{ fontSize: 34, marginBottom: 6 }}>✓</div>
                      <div style={{ color: T.green, fontSize: 16, fontWeight: 800, fontFamily: F.sans, marginBottom: 2 }}>{file?.name}</div>
                      <div style={{ color: T.textSub, fontSize: 13, fontFamily: F.sans }}>{text.length.toLocaleString()} characters ready for AI generation</div>
                    </>
                  )}
                  {fileStatus === 'error' && (
                    <>
                      <div style={{ fontSize: 32, marginBottom: 6 }}>⚠</div>
                      <div style={{ color: T.red, fontSize: 14, fontFamily: F.sans, fontWeight: 700, marginBottom: 4 }}>{fileError}</div>
                      <div style={{ color: T.muted, fontSize: 13, fontFamily: F.sans }}>Click to choose a different document</div>
                    </>
                  )}
                </div>

                {fileStatus === 'done' && (
                  <div style={{ textAlign: 'center', marginBottom: 16 }}>
                    <button onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }} style={{
                      background: 'none', border: 'none', color: T.teal, fontSize: 13,
                      fontFamily: F.sans, fontWeight: 800, cursor: 'pointer',
                    }}>
                      ↺ Choose different file
                    </button>
                  </div>
                )}
              </>
            )}

            {inputType && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
                <Btn variant="ghost" onClick={() => setStep('name')}>← Back</Btn>
                <Btn onClick={() => setStep('personalise')} disabled={!canNext1} style={{ minWidth: 160, padding: '14px 24px' }}>Preferences →</Btn>
              </div>
            )}
          </div>
        )}

        {/* ── STEP 3: PERSONALISE ── */}
        {step === 'personalise' && (
          <div style={{
            background: T.card, border: `1.5px solid ${T.borderMid}`,
            borderRadius: 32, padding: '36px 32px',
            boxShadow: '0 12px 36px rgba(44, 24, 16, 0.05)',
          }} className="animate-fade-up">
            <h2 style={{ fontSize: 24, color: T.text, marginBottom: 6, fontWeight: 900, fontFamily: F.sans, letterSpacing: '-0.4px' }}>Study Preferences</h2>
            <p style={{ color: T.textSub, fontSize: 14, marginBottom: 26, fontFamily: F.sans }}>Customize how your lessons, checkpoints, and quizzes are structured.</p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24, marginBottom: 24 }}>
              {[
                { key: 'style' as const, label: 'Learning Style', opts: ['Conceptual', 'Example-heavy', 'Detailed Walkthrough'] },
                { key: 'depth' as const, label: 'Course Depth',   opts: ['Beginner', 'Intermediate', 'Advanced'] },
                { key: 'goal'  as const, label: 'Primary Goal',   opts: ['Exam Prep', 'Deep Understanding', 'Quick Revision'] },
                { key: 'pace'  as const, label: 'Pacing',         opts: ['Compact', 'Balanced', 'Comprehensive'] },
              ].map(g => (
                <div key={g.key} style={{ background: T.card2, border: `1px solid ${T.border}`, borderRadius: 24, padding: '18px 20px' }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: T.text, fontFamily: F.sans, marginBottom: 12 }}>{g.label}</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {g.opts.map(o => <OBtn key={o} label={o} active={prefs[g.key] === o} onClick={() => setP(g.key, o)} />)}
                  </div>
                </div>
              ))}
            </div>

            {/* Custom Instructions */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: T.text, fontFamily: F.sans, marginBottom: 8 }}>Additional Instructions (Optional)</div>
              <input value={prefs.customInstructions || ''} onChange={e => setPrefs(p => ({ ...p, customInstructions: e.target.value }))}
                placeholder="e.g. Focus specifically on monetary policy equations and provide practical real-world analogies"
                style={inp} />
            </div>

            {error && (
              <div style={{ marginBottom: 20, padding: '12px 18px', background: T.redDim, border: `1px solid ${T.red}33`, borderRadius: 18, color: T.red, fontSize: 13, fontFamily: F.sans, fontWeight: 600 }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24 }}>
              <Btn variant="ghost" onClick={() => setStep('content')}>← Back</Btn>
              <Btn onClick={handleGenerate} style={{ minWidth: 200, padding: '14px 28px' }}>✦ Generate Full Course</Btn>
            </div>
          </div>
        )}

        {/* ── STEP 4: GENERATING ── */}
        {step === 'generating' && (
          <div style={{
            background: T.card, border: `1.5px solid ${T.borderMid}`,
            borderRadius: 36, padding: '56px 32px', textAlign: 'center',
            boxShadow: '0 20px 60px rgba(44, 24, 16, 0.08)',
          }} className="animate-fade-up">
            <div style={{ position: 'relative', width: 90, height: 90, margin: '0 auto 28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ fontSize: 44, animation: 'float 3s ease-in-out infinite' }}>☕</div>
              <div style={{
                position: 'absolute', inset: 0, borderRadius: '50%',
                border: `3px solid ${T.border}`, borderTop: `3px solid ${T.teal}`,
                animation: 'spin 1.2s linear infinite',
              }} />
            </div>

            <h2 style={{ fontSize: 24, color: T.text, fontWeight: 900, marginBottom: 8, fontFamily: F.sans, letterSpacing: '-0.4px' }}>
              Brewing Your Course...
            </h2>
            <p style={{ color: T.teal, fontSize: 14, fontWeight: 700, marginBottom: 24, fontFamily: F.sans }}>
              {stage}
            </p>

            <div style={{ maxWidth: 440, margin: '0 auto 28px' }}>
              <ProgressBar value={progress} height={8} />
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
