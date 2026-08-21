'use client';
import { useState } from 'react';
import { F } from '@/components/ui/primitives';

const slides = [
  {
    icon: '🎓',
    tag: 'WELCOME',
    title: 'Welcome to MonetStudy',
    subtitle: 'Your personal AI study companion.',
    body: "Upload your notes, textbooks, or describe any topic — and we'll build you a complete interactive course in seconds.",
    accent: '#8C5338',
  },
  {
    icon: '✦',
    tag: 'HOW IT WORKS',
    title: 'Upload. Generate. Master.',
    subtitle: null,
    body: 'Paste text, upload a PDF, Word doc, or PowerPoint. Our AI crafts structured topics with clear explanations and real-world examples.',
    accent: '#C68B59',
  },
  {
    icon: '📋',
    tag: 'ACTIVE RECALL',
    title: 'Interactive Quizzes & Mock Exams',
    subtitle: null,
    body: 'Every topic includes multiple-choice and scenario quizzes to test your understanding. Take mock exams to prepare for high-stakes tests.',
    accent: '#8C5338',
  },
  {
    icon: '☕',
    tag: 'GET STARTED',
    title: "You're all set!",
    subtitle: 'Your first course is just one click away.',
    body: "Let's make studying effortless and enjoyable.",
    accent: '#2C1810',
    cta: true,
  },
];

interface Props {
  name?: string;
  onDone: () => void;
}

export default function OnboardingSplash({ name, onDone }: Props) {
  const [current, setCurrent] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [direction, setDirection] = useState('next');

  const goTo = (index: number, dir = 'next') => {
    if (animating) return;
    setAnimating(true);
    setDirection(dir);
    setTimeout(() => { setCurrent(index); setAnimating(false); }, 280);
  };

  const next = () => { if (current < slides.length - 1) goTo(current + 1, 'next'); };
  const prev = () => { if (current > 0) goTo(current - 1, 'prev'); };

  const slide = slides[current];
  const title = slide.cta && name ? `You're all set, ${name.split(' ')[0]}!` : slide.title;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: '#F5EBE1',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px 20px', overflowY: 'auto',
    }}>
      {/* Background radial glow */}
      <div style={{
        position: 'absolute', width: 600, height: 600, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(198, 139, 89, 0.2) 0%, transparent 70%)',
        top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
      }} />

      {/* Main responsive container */}
      <div style={{
        maxWidth: 960, width: '100%', position: 'relative',
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: 32, alignItems: 'center', margin: 'auto',
      }}>
        {/* Desktop Left Column Hero (visible on wide screens) */}
        <div className="hidden md:flex" style={{
          flexDirection: 'column', gap: 24, padding: '20px 12px',
        }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#FAF3EB', border: '1.5px solid rgba(140,83,56,0.2)', padding: '6px 16px', borderRadius: 999, width: 'fit-content' }}>
            <span style={{ fontSize: 14 }}>☕</span>
            <span style={{ fontSize: 12, fontWeight: 800, color: '#8C5338', fontFamily: F.sans, letterSpacing: '0.5px' }}>STUDY BETTER WITH AI</span>
          </div>

          <h1 style={{ fontSize: 42, fontWeight: 900, color: '#2C1810', lineHeight: 1.15, fontFamily: F.sans, letterSpacing: '-1px' }}>
            Transform Any Material Into <span style={{ color: '#8C5338', fontStyle: 'italic' }}>Interactive Courses</span>
          </h1>

          <p style={{ fontSize: 16, color: '#6E4D3B', lineHeight: 1.7, fontFamily: F.sans }}>
            MonetStudy extracts key concepts from your textbooks and documents, generating personalized lessons, voice narrations, and recall assessments.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {[
              { icon: '⚡', title: 'Instant Ingestion', desc: 'PDF, Word, or raw notes' },
              { icon: '🎙', title: 'AI Voice Narrator', desc: 'Listen anywhere on the go' },
              { icon: '🎯', title: 'Active Recall', desc: 'Auto-generated quiz questions' },
              { icon: '🏆', title: 'Mock Exam Mode', desc: 'Timed simulated test papers' },
            ].map((f, i) => (
              <div key={i} style={{ background: '#FFFFFF', border: '1px solid rgba(140,83,56,0.14)', borderRadius: 20, padding: '14px 16px', boxShadow: '0 4px 16px rgba(44,24,16,0.03)' }}>
                <div style={{ fontSize: 20, marginBottom: 4 }}>{f.icon}</div>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#2C1810', fontFamily: F.sans }}>{f.title}</div>
                <div style={{ fontSize: 11, color: '#8A6A58', fontFamily: F.sans }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Carousel Card (works on both mobile & desktop) */}
        <div style={{
          background: '#FFFFFF',
          border: '1.5px solid rgba(140, 83, 56, 0.16)',
          borderRadius: 36, padding: '38px 32px',
          width: '100%', position: 'relative',
          boxShadow: '0 24px 64px rgba(44, 24, 16, 0.08)',
        }}>
          {/* Top bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
            <div style={{
              fontFamily: F.sans, fontSize: 11, fontWeight: 800, letterSpacing: '1px',
              color: '#8C5338', background: 'rgba(140, 83, 56, 0.08)',
              padding: '6px 14px', borderRadius: 999, border: '1px solid rgba(140, 83, 56, 0.16)',
            }}>{slide.tag}</div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {slides.map((_, i) => (
                <div key={i} onClick={() => goTo(i, i > current ? 'next' : 'prev')} style={{
                  width: i === current ? 24 : 7, height: 7, borderRadius: 999,
                  background: i === current ? '#2C1810' : '#E8DDD1',
                  cursor: 'pointer', transition: 'all 0.3s ease',
                }} />
              ))}
            </div>
          </div>

          {/* Content */}
          <div style={{
            opacity: animating ? 0 : 1,
            transform: animating ? `translateX(${direction === 'next' ? '-16px' : '16px'})` : 'translateX(0)',
            transition: 'opacity 0.28s ease, transform 0.28s ease',
            textAlign: 'center', minHeight: 250, display: 'flex', flexDirection: 'column', justifyContent: 'center',
          }}>
            <div style={{
              width: 80, height: 80, borderRadius: 28,
              background: '#F5EBE1', border: '1px solid #E8DDD1',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 40, margin: '0 auto 20px',
              boxShadow: '0 8px 20px rgba(44, 24, 16, 0.06)',
            }}>
              {slide.icon}
            </div>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: '#2C1810', margin: '0 0 8px', lineHeight: 1.25, fontFamily: F.sans, letterSpacing: '-0.4px' }}>
              {title}
            </h2>
            {slide.subtitle && (
              <p style={{ fontSize: 14, color: '#8C5338', margin: '0 0 10px', fontWeight: 700, fontFamily: F.sans }}>
                {slide.subtitle}
              </p>
            )}
            <p style={{ fontSize: 13, color: '#6E4D3B', lineHeight: 1.7, margin: '0 0 24px', fontFamily: F.sans }}>
              {slide.body}
            </p>
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 10 }}>
            {current > 0 && (
              <button onClick={prev} style={{
                flex: 1, padding: '14px', background: '#F5EBE1',
                border: '1px solid #E8DDD1', borderRadius: 999,
                color: '#6E4D3B', fontSize: 13, fontWeight: 800,
                fontFamily: F.sans, cursor: 'pointer',
              }}>← Back</button>
            )}
            {slide.cta ? (
              <button onClick={onDone} style={{
                flex: 1.4, padding: '14px', background: '#2C1810', border: 'none',
                borderRadius: 999, color: '#FAF5EE', fontSize: 14, fontWeight: 800,
                fontFamily: F.sans, cursor: 'pointer', boxShadow: '0 6px 20px rgba(44, 24, 16, 0.2)',
              }}>Start Learning →</button>
            ) : (
              <button onClick={next} style={{
                flex: 1.4, padding: '14px', background: '#2C1810',
                border: 'none', borderRadius: 999,
                color: '#FAF5EE', fontSize: 13, fontWeight: 800,
                fontFamily: F.sans, cursor: 'pointer', boxShadow: '0 6px 20px rgba(44, 24, 16, 0.2)',
              }}>Next Step →</button>
            )}
          </div>

          {!slide.cta && (
            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <button onClick={onDone} style={{
                background: 'none', border: 'none', color: '#A0826E',
                fontSize: 11, fontFamily: F.sans, fontWeight: 700,
                cursor: 'pointer', letterSpacing: '1px', textTransform: 'uppercase',
              }}>Skip to Dashboard →</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

