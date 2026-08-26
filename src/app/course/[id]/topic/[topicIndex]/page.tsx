'use client';
import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { getTopics, updateTopic, updateSubject } from '@/lib/firebase/firestore';
import { MonoLabel, Tag, Btn, Spinner, ProgressBar, F } from '@/components/ui/primitives';
import type { Topic, Question } from '@/types';
import ReactMarkdown from 'react-markdown';
import { getConceptImageUrl } from '@/lib/extractPDFImages';
import VoiceNarrator from '@/components/VoiceNarrator';
import { MermaidDiagram, SvgIllustration } from '@/components/DiagramViewer';
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
          width: '100%', height: 220, borderRadius: 24,
          background: `linear-gradient(110deg, ${T.card2} 30%, ${T.border} 50%, ${T.card2} 70%)`,
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.5s ease-in-out infinite',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column', gap: 8,
          border: `1.5px solid ${T.borderMid}`,
        }}>
          <div style={{ fontSize: 28 }}>🎨</div>
          <div style={{ fontSize: 11, color: T.muted, fontFamily: F.sans, fontWeight: 700, letterSpacing: 1 }}>
            GENERATING VISUAL DIAGRAM...
          </div>
        </div>
      )}

      {/* Error state */}
      {status === 'error' && (
        <div style={{
          width: '100%', padding: '28px 16px', borderRadius: 24,
          border: `1.5px dashed ${T.borderMid}`, background: T.card2,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
        }}>
          <div style={{ fontSize: 26 }}>📷</div>
          <div style={{ fontSize: 12, color: T.muted, fontFamily: F.sans }}>Diagram preview unavailable</div>
          <button
            onClick={() => { setStatus('loading'); setRetryCount(r => r + 1); }}
            style={{
              background: T.name === 'dark' || T.name === 'midnight' ? '#FAF5EE' : '#2C1810',
              color: T.name === 'dark' || T.name === 'midnight' ? '#140E0A' : '#FAF5EE',
              border: 'none', borderRadius: 999,
              padding: '6px 16px', fontSize: 11, cursor: 'pointer', marginTop: 4,
              fontFamily: F.sans, fontWeight: 700,
            }}
          >
            Retry ↻
          </button>
        </div>
      )}

      {/* Loaded image */}
      <img
        src={imgSrc}
        alt={alt}
        onLoad={() => setStatus('loaded')}
        onError={() => setStatus('error')}
        style={{
          maxWidth: '100%',
          borderRadius: 24,
          border: `1.5px solid ${T.borderMid || T.border}`,
          boxShadow: '0 8px 30px rgba(44, 24, 16, 0.08)',
          display: status === 'loaded' ? 'block' : 'none',
          margin: '0 auto',
          transition: 'opacity 0.4s ease',
        }}
      />

      {/* Caption */}
      {alt && status === 'loaded' && (
        <div style={{ fontSize: 11, color: T.textSub, marginTop: 8, fontFamily: F.sans, fontStyle: 'italic' }}>
          {alt}
        </div>
      )}
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
      if (ts && ts.length > 0) {
        setTopics(ts);
        if (!isFinal && ts[idx]) setTopic(ts[idx]);
        setLoading(false);
      } else {
        const demoTopicList: Topic[] = [
          {
            id: 't-1',
            title: 'Open Market Operations & Reserve Requirements',
            content: `## Central Banking & Liquidity Management

Open market operations (**OMO**) are the principal tool through which central banks adjust the supply of reserve balances in the banking system.

### How Open Market Operations Work
When a central bank purchases government bonds from commercial banks:
1. **Commercial Bank Reserves Increase**: The central bank credits the reserves of the selling financial institution.
2. **Short-Term Interest Rates Fall**: With higher reserves, the interbank lending rate drops toward the central bank's target rate.
3. **Credit Expansion**: Commercial banks have greater lending capacity, lowering loan costs across businesses and consumers.

> **Key Rule of Monetary Policy:**
> *"Lowering the policy rate stimulates aggregate demand, while raising rates helps dampen inflationary overheating."*

### Reserve Requirements
The reserve requirement ratio determines the minimum fraction of customer deposits that banks must hold in cash or at the central bank rather than loaning out.

\`\`\`
Money Multiplier = 1 / Reserve Ratio
\`\`\`

When the reserve requirement is set to 10% (0.10), the theoretical money multiplier is 10x.`,
            readTime: '8',
            status: 'in-progress',
            order: 0,
          },
          {
            id: 't-2',
            title: 'Quantitative Easing & Unconventional Monetary Policy',
            content: `## Unconventional Monetary Policy

When short-term nominal interest rates reach the **zero lower bound (ZLB)**, standard rate cuts lose efficacy. Central banks transition to quantitative easing.`,
            readTime: '10',
            status: 'not-started',
            order: 1,
          },
        ];
        setTopics(demoTopicList);
        setTopic(demoTopicList[idx >= 0 ? idx : 0] || demoTopicList[0]);
        setLoading(false);
      }
    }).catch(() => {
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
      if (data.questions && data.questions.length > 0) {
        setQuestions(data.questions);
      } else {
        throw new Error();
      }
    } catch {
      // Demo questions fallback for instant testing without API key
      setQuestions([
        {
          id: 'q1',
          type: 'mcq',
          question: 'What is the immediate direct effect of a central bank buying government bonds in an open market operation?',
          options: [
            'Commercial bank reserves expand and money supply increases',
            'Government debt is completely wiped out',
            'Interest rates immediately rise across all mortgages',
            'Commercial banks must decrease their lending limits',
          ],
          correctAnswer: 'Commercial bank reserves expand and money supply increases',
          explanation: 'Purchasing bonds injects cash into the banking system, increasing bank reserves and lowering interbank rates.',
        },
        {
          id: 'q2',
          type: 'tf',
          question: 'A lower reserve requirement decreases the theoretical money multiplier in an economy.',
          correctAnswer: 'false',
          explanation: 'Because Multiplier = 1 / Reserve Ratio, a lower denominator produces a HIGHER money multiplier.',
        },
        {
          id: 'q3',
          type: 'mcq',
          question: 'When a central bank faces the zero lower bound on policy interest rates, which policy tool is typically deployed?',
          options: [
            'Quantitative Easing (Large-scale asset purchases)',
            'Eliminating all reserve requirements',
            'Pegging the currency to gold bullion',
            'Banning interbank commercial lending',
          ],
          correctAnswer: 'Quantitative Easing (Large-scale asset purchases)',
          explanation: 'Quantitative easing allows central banks to purchase longer-term securities to drive down long-term yields directly.',
        },
      ]);
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
    const nextTopic = topics[idx + 1];
    if (nextTopic) await updateTopic(user.uid, id, nextTopic.id, { status: 'in-progress' });

    const completedCount = topics.filter(t => t.status === 'completed').length + 1;
    const progress = Math.round((completedCount / topics.length) * 100);
    await updateSubject(user.uid, id, {
      progress,
      status: progress === 100 ? 'Completed' : 'In Progress',
    });

    setQuizMode(null);
    router.push(`/course/${id}`);
  };

  const processContent = (raw: string): string => {
    if (!raw) return '';
    let content = raw;

    // Convert PDF page and figure placeholders
    content = content.replace(/\[PAGE_(\d+)\]/g, (_, num) => {
      const url = pageImageUrls[parseInt(num, 10)];
      if (url) return `\n\n![PDF Page ${num}](${url})\n\n`;
      return '';
    });
    content = content.replace(/\[FIGURE_(\d+)\]/g, (_, num) => {
      return `\n\n![Figure ${num}](figure:${num})\n\n`;
    });

    // ── CODE FENCE NORMALIZATION ──
    // 1. Separate opening code fences that are glued directly on the same line to previous text
    content = content.replace(/([^\r\n`])([ \t]*```(?:mermaid|svg))/gi, '$1\n```\n\n$2');
    content = content.replace(/([^\r\n])\s*(```(?:svg|mermaid))/gi, '$1\n\n$2');

    // 2. Ensure ```mermaid has a newline immediately after the word "mermaid"
    content = content.replace(/```mermaid[ \t]+([^\r\n]+)/gi, '```mermaid\n$1');

    // 3. Ensure ```svg has a newline immediately after the word "svg"
    content = content.replace(/```svg[ \t]+([^\r\n]+)/gi, '```svg\n$1');

    // 4. Ensure any unclosed ```svg block ending with </svg> is closed with ```
    content = content.replace(/(```svg[\s\S]*?<\/svg>)\s*(?!```)/gi, '$1\n```\n\n');

    // 5. Wrap bare un-fenced <svg>...</svg> blocks in code fences
    content = content.replace(/(?:\n|^)\s*(?<!```(?:svg|xml)?\s*)(<svg[\s\S]*?<\/svg>)(?!\s*```)/gi, '\n\n```svg\n$1\n```\n\n');

    // 6. Ensure any ```mermaid block has a closing ``` before the next section/heading/diagram/observation or end
    content = content.replace(/(```mermaid[\s\S]*?)(?=(?:\n\s*```mermaid|\n\s*```svg|\n\s*#{1,6}\s+|\n\s*>\s*|\n\s*(?:Observation Note:|Observe:|Clinical Pearl:|Takeaway:)|\Z))/gi, (match) => {
      const trimmed = match.trim();
      if (trimmed.endsWith('```') && trimmed !== '```mermaid') {
        return `${trimmed}\n\n`;
      }
      return `${trimmed}\n\`\`\`\n\n`;
    });

    // 7. De-duplicate identical consecutive mermaid or svg blocks
    content = content.replace(/(```(?:mermaid|svg)\s*[\s\S]*?```)\s*\n*\s*\1/gi, '$1');

    // 8. Separate closing ``` glued to following headers or bold text
    content = content.replace(/(```)\s*(#{1,6}\s+|\*\*[A-Z]|>)/g, '$1\n\n$2');

    // 9. Normalize un-fenced Mermaid blocks starting with bare "mermaid\n"
    content = content.replace(/(?:^|\n)\s*mermaid\s*\n+((?:graph|flowchart|sequenceDiagram|stateDiagram|classDiagram|erDiagram|mindmap)[\s\S]*?)(?=\n\s*\n|$)/gi, '\n\n```mermaid\n$1\n```\n\n');

    // Clean up excessive blank lines
    content = content.replace(/\n{4,}/g, '\n\n\n');

    return content.trim();
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Spinner size={36} />
    </div>
  );

  if (quizLoading) return (
    <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <Spinner size={40} />
      <p style={{ color: T.teal, fontFamily: F.sans, fontSize: 13, fontWeight: 700, letterSpacing: '0.5px' }} className="animate-pulse-sm">Crafting quiz questions...</p>
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
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 4, zIndex: 100, background: T.dim }}>
        <div style={{ width: `${readPct}%`, height: '100%', background: T.teal, boxShadow: `0 0 8px ${T.tealGlow}`, transition: 'width 0.3s ease' }} />
      </div>

      {/* Header */}
      <div className="glass" style={{
        padding: '12px 18px', borderBottom: `1px solid ${T.border}`,
        display: 'flex', alignItems: 'center', gap: 12,
        background: T.navBg, position: 'sticky', top: 0, zIndex: 10,
      }}>
        <button onClick={() => router.push(`/course/${id}`)} style={{
          background: T.card2, border: `1.5px solid ${T.borderMid}`, color: T.text,
          width: 36, height: 36, borderRadius: 999, display: 'flex',
          alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontWeight: 700,
        }}>←</button>
        <Tag color={T.teal}>Topic {idx + 1}</Tag>
        <span style={{
          flex: 1, fontSize: 14, color: T.text, fontWeight: 800,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: F.sans,
        }}>{topic.title}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: T.textSub, fontFamily: F.sans }}>{topic.readTime}m read</span>
      </div>

      {/* Content */}
      <div ref={scrollRef} onScroll={handleScroll} style={{ flex: 1, overflowY: 'auto', padding: '36px 24px 60px', maxWidth: 900, width: '100%', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Tag color={T.teal}>TOPIC {idx + 1}</Tag>
          <span style={{ fontSize: 13, color: T.textSub, fontFamily: F.sans, fontWeight: 700 }}>· {topic.readTime || '10'} MINUTE READ</span>
        </div>

        <h1 style={{ fontSize: 34, color: T.text, marginBottom: 32, fontWeight: 900, lineHeight: 1.25, fontFamily: F.sans, letterSpacing: '-0.7px' }}>
          {topic.title}
        </h1>

        <div style={{ color: T.textSub, fontSize: 16, lineHeight: 1.95, fontFamily: F.sans, letterSpacing: '-0.05px' }}>
          <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[rehypeKatex]}
            components={{
              h2: ({children}) => (
                <h2 style={{
                  fontSize: 23,
                  color: T.text,
                  fontWeight: 900,
                  marginTop: 48,
                  marginBottom: 16,
                  paddingBottom: 8,
                  borderBottom: `1.5px solid ${T.borderMid}`,
                  fontFamily: F.sans,
                  letterSpacing: '-0.5px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                }}>
                  {children}
                </h2>
              ),
              h3: ({children}) => (
                <h3 style={{
                  fontSize: 19,
                  color: T.teal,
                  fontWeight: 800,
                  marginTop: 36,
                  marginBottom: 12,
                  fontFamily: F.sans,
                  letterSpacing: '-0.3px',
                }}>
                  {children}
                </h3>
              ),
              strong: ({children}) => <strong style={{ color: T.text, fontWeight: 800 }}>{children}</strong>,
              ul: ({children}) => <ul style={{ paddingLeft: 28, margin: '20px 0 28px', display: 'flex', flexDirection: 'column', gap: 10 }}>{children}</ul>,
              ol: ({children}) => <ol style={{ paddingLeft: 28, margin: '20px 0 28px', display: 'flex', flexDirection: 'column', gap: 10 }}>{children}</ol>,
              li: ({children}) => <li style={{ color: T.textSub, lineHeight: 1.85, fontSize: 16 }}>{children}</li>,
              p: ({children}) => <p style={{ marginBottom: 24, lineHeight: 1.95, fontSize: 16 }}>{children}</p>,
              code: ({children, className, ...props}) => {
                const match = /language-(\w+)/.exec(className || '');
                const lang = match ? match[1].toLowerCase() : '';
                const codeContent = String(children || '').replace(/\n$/, '');

                if (lang === 'mermaid' || /^\s*(graph|flowchart|sequenceDiagram|stateDiagram|classDiagram|erDiagram|mindmap)/i.test(codeContent)) {
                  return <MermaidDiagram chart={codeContent} />;
                }
                if (lang === 'svg' || lang === 'xml' || codeContent.includes('</svg>') || codeContent.includes('<svg')) {
                  return <SvgIllustration svgCode={codeContent} />;
                }
                return (
                  <code style={{ background: T.card2, padding: '3px 10px', borderRadius: 8, fontFamily: F.mono, fontSize: 14, color: T.teal, border: `1px solid ${T.border}` }} className={className} {...props}>
                    {children}
                  </code>
                );
              },
              pre: ({children}) => <div style={{ margin: '24px 0' }}>{children}</div>,
              blockquote: ({children}) => (
                <blockquote style={{
                  background: T.card2,
                  padding: '20px 24px',
                  borderRadius: '0 20px 20px 0',
                  margin: '32px 0',
                  color: T.text,
                  lineHeight: 1.85,
                  fontSize: 15.5,
                  boxShadow: '0 4px 20px rgba(44,24,16,0.03)',
                  border: `1px solid ${T.border}`,
                  borderLeft: `4px solid ${T.teal}`,
                }}>
                  {children}
                </blockquote>
              ),
              img: ({src, alt}) => <SmartImage src={src || ''} alt={alt || ''} T={T} />,
              table: ({children}) => (
                <div style={{
                  overflowX: 'auto',
                  margin: '36px 0',
                  borderRadius: 18,
                  border: `1.5px solid ${T.borderMid}`,
                  background: T.card,
                  boxShadow: '0 4px 24px rgba(44, 24, 16, 0.04)',
                }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 14.5, fontFamily: F.sans }}>{children}</table>
                </div>
              ),
              thead: ({children}) => <thead style={{ background: T.card2, borderBottom: `2px solid ${T.borderMid}` }}>{children}</thead>,
              tbody: ({children}) => <tbody>{children}</tbody>,
              tr: ({children}) => <tr style={{ borderBottom: `1px solid ${T.border}`, transition: 'background 0.2s' }}>{children}</tr>,
              th: ({children}) => <th style={{ padding: '16px 20px', fontWeight: 800, color: T.text, fontSize: 13.5, letterSpacing: '0.4px', textTransform: 'uppercase' }}>{children}</th>,
              td: ({children}) => <td style={{ padding: '16px 20px', color: T.textSub, lineHeight: 1.7 }}>{children}</td>,
              hr: () => <hr style={{ border: 'none', borderTop: `1.5px solid ${T.borderMid}`, margin: '44px 0' }} />,
            }}
          >
            {processContent(topic.content)}
          </ReactMarkdown>
          {topic && <VoiceNarrator text={topic.content} theme={T} />}
        </div>

        {/* Bottom Assessment CTA */}
        <div style={{ marginTop: 52, paddingTop: 32, borderTop: `1.5px solid ${T.border}`, textAlign: 'center' }}>
          <div style={{ fontSize: 16, color: T.text, fontWeight: 800, marginBottom: 4, fontFamily: F.sans }}>Finished Reading?</div>
          <div style={{ fontSize: 13, color: T.textSub, marginBottom: 20, fontFamily: F.sans }}>Test your comprehension and reinforce memory retention with the topic quiz.</div>
          <div style={{ maxWidth: 400, margin: '0 auto' }}>
            <Btn onClick={() => triggerQuiz('assessment')} style={{ width: '100%', padding: '16px 24px', fontSize: 15 }}>Take Topic Assessment →</Btn>
          </div>
        </div>

        {/* Prev / Next Buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 32, paddingTop: 24, borderTop: `1px solid ${T.border}` }}>
          <button disabled={idx === 0} onClick={() => router.push(`/course/${id}/topic/${idx - 1}`)} style={{ background: T.card2, border: `1.5px solid ${T.borderMid}`, borderRadius: 999, padding: '12px 24px', color: idx === 0 ? T.muted : T.text, fontSize: 13, fontWeight: 800, opacity: idx === 0 ? 0.38 : 1, cursor: idx === 0 ? 'default' : 'pointer', fontFamily: F.sans }}>← Previous Topic</button>
          <button disabled={idx >= topics.length - 1} onClick={() => router.push(`/course/${id}/topic/${idx + 1}`)} style={{ background: T.card2, border: `1.5px solid ${T.borderMid}`, borderRadius: 999, padding: '12px 24px', color: idx >= topics.length - 1 ? T.muted : T.text, fontSize: 13, fontWeight: 800, opacity: idx >= topics.length - 1 ? 0.38 : 1, cursor: idx >= topics.length - 1 ? 'default' : 'pointer', fontFamily: F.sans }}>Next Topic →</button>
        </div>

        <div style={{ height: 60 }} />
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
      <div style={{ fontSize: 44, marginBottom: 16 }}>⚠</div>
      <div style={{ color: T.textSub, fontSize: 16, textAlign: 'center', fontFamily: F.sans, marginBottom: 24, fontWeight: 700 }}>Could not generate questions. Please try again.</div>
      <Btn variant="ghost" onClick={onBack}>← Back to lesson</Btn>
    </div>
  );

  const q = questions[cur];
  const total = questions.length;
  const typeLabel: Record<string, string> = { mid: 'Checkpoint Quiz', assessment: 'Topic Assessment', final: 'Final Exam' };
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
      <div style={{ minHeight: '100vh', background: T.bg, overflowY: 'auto', padding: '48px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          background: T.card, border: `1.5px solid ${T.borderMid}`,
          borderRadius: 36, padding: '48px 40px', maxWidth: 540, width: '100%',
          textAlign: 'center', boxShadow: '0 24px 64px rgba(44, 24, 16, 0.08)',
        }} className="animate-scale-in">
          <div style={{
            width: 84, height: 84, borderRadius: '50%',
            background: passed ? T.greenDim : T.amberDim,
            border: `2px solid ${passed ? T.green : T.amber}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 40, margin: '0 auto 20px',
          }}>
            {passed ? '🏆' : '📖'}
          </div>
          <h2 style={{ fontSize: 26, color: T.text, marginBottom: 6, fontWeight: 900, fontFamily: F.sans, letterSpacing: '-0.4px' }}>
            {passed ? 'Topic Assessment Passed!' : 'Keep Practicing'}
          </h2>
          <div style={{ fontSize: 52, color: passed ? T.green : T.amber, fontWeight: 900, margin: '14px 0', lineHeight: 1, fontFamily: F.sans }}>
            {pct}%
          </div>
          <p style={{ color: T.textSub, fontSize: 14, marginBottom: 28, fontFamily: F.sans }}>
            {correct} of {total} questions answered correctly · {passed ? 'Passed ✓' : 'Below 70% threshold'}
          </p>
          <div style={{ maxWidth: 360, margin: '0 auto' }}>
            <Btn onClick={() => onDone(pct)} style={{ width: '100%', padding: '16px' }}>
              Continue Learning →
            </Btn>
          </div>
        </div>
      </div>
    );
  }

  const opts = q.type === 'tf' ? ['true', 'false'] : (q.options ?? []);

  return (
    <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '24px 20px' }}>
      {/* Top quiz bar */}
      <div style={{ maxWidth: 760, width: '100%', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={onBack} style={{ background: T.card2, border: `1px solid ${T.border}`, borderRadius: 999, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.text, cursor: 'pointer', fontWeight: 800 }}>←</button>
            <Tag color={tc}>{typeLabel[type]}</Tag>
          </div>
          <span style={{ fontSize: 13, fontWeight: 800, color: T.textSub, fontFamily: F.sans }}>Question {cur + 1} of {total}</span>
        </div>
        <ProgressBar value={((cur) / total) * 100} height={6} />
      </div>

      {/* Question Card */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 0' }}>
        <div style={{
          background: T.card, border: `1.5px solid ${T.borderMid}`,
          borderRadius: 32, padding: '36px 32px', maxWidth: 760, width: '100%',
          boxShadow: '0 16px 44px rgba(44, 24, 16, 0.06)',
        }} className="animate-fade-up">
          <div style={{ fontSize: 12, fontWeight: 800, color: tc, fontFamily: F.sans, letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: 10 }}>
            {q.type === 'tf' ? 'True or False' : 'Multiple Choice'}
          </div>

          <h3 style={{ fontSize: 20, color: T.text, fontWeight: 800, lineHeight: 1.4, marginBottom: q.diagram ? 16 : 26, fontFamily: F.sans }}>
            {q.question}
          </h3>

          {/* Visual Diagram / Illustration in Question */}
          {q.diagram && (
            <div style={{ marginBottom: 24 }}>
              {q.diagram.includes('<svg') ? (
                <SvgIllustration svgCode={q.diagram} />
              ) : (
                <MermaidDiagram chart={q.diagram} />
              )}
            </div>
          )}

          {/* Options Grid (1 col on mobile, 2 cols on desktop) */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: q.type === 'tf' ? '1fr 1fr' : 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 12,
            marginBottom: 24,
          }}>
            {opts.map((opt, i) => {
              const isSel = sel === opt;
              let bg = T.card2;
              let border = T.borderMid;
              let col = T.text;

              if (answered) {
                const correctOpt = q.type === 'tf' ? String(q.correctAnswer) : q.correctAnswer;
                if (opt === correctOpt) { bg = T.greenDim; border = T.green; col = T.green; }
                else if (isSel) { bg = T.redDim; border = T.red; col = T.red; }
              } else if (isSel) {
                bg = T.name === 'dark' || T.name === 'midnight' ? '#FAF5EE' : '#2C1810';
                col = T.name === 'dark' || T.name === 'midnight' ? '#140E0A' : '#FAF5EE';
                border = 'transparent';
              }

              return (
                <button key={i} disabled={answered} onClick={() => setSel(opt)}
                  className="active:scale-[0.98] transition-transform"
                  style={{
                    padding: '16px 18px', borderRadius: 20,
                    background: bg, border: `1.5px solid ${border}`,
                    color: col, fontSize: 14, fontFamily: F.sans, fontWeight: 700,
                    textAlign: 'left', cursor: answered ? 'default' : 'pointer',
                    transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 12,
                    minHeight: 56, width: '100%',
                  }}>
                  <span style={{
                    width: 30, height: 30, borderRadius: '50%',
                    background: isSel ? 'rgba(255,255,255,0.2)' : T.border,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 800, flexShrink: 0,
                  }}>
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span style={{ flex: 1, lineHeight: 1.4 }}>{opt}</span>
                </button>
              );
            })}
          </div>

          {answered && q.explanation && (
            <div style={{
              background: T.card2, border: `1px solid ${T.border}`, borderRadius: 18,
              padding: '16px 18px', marginBottom: 20, fontSize: 13, color: T.textSub,
              fontFamily: F.sans, lineHeight: 1.6,
            }}>
              💡 <strong style={{ color: T.text }}>Explanation:</strong> {q.explanation}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'stretch', gap: 12, width: '100%' }}>
            {!answered ? (
              <Btn onClick={() => setAnswered(true)} disabled={sel === null} style={{ width: '100%', padding: '16px' }}>
                Check Answer
              </Btn>
            ) : (
              <Btn onClick={handleNext} style={{ width: '100%', padding: '16px' }}>
                {cur < total - 1 ? 'Next Question →' : 'See Assessment Results →'}
              </Btn>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
