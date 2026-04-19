'use client';
import { useState } from 'react';
import { F } from '@/components/ui/primitives';

const slides = [
  {
    icon: '🎓',
    tag: 'WELCOME',
    title: 'Welcome to MonetStudy',
    subtitle: 'Your personal AI study companion.',
    body: "Upload your notes, textbooks, or describe a topic — and we'll build you a full course in seconds.",
    accent: '#2DD4BF',
  },
  {
    icon: '✦',
    tag: 'HOW IT WORKS',
    title: 'Upload. Generate. Learn.',
    subtitle: null,
    body: 'Paste text, upload a PDF, Word doc, or PowerPoint — or simply describe what you want to learn. Our AI breaks it into structured topics with explanations and quizzes.',
    accent: '#818CF8',
  },
  {
    icon: '📋',
    tag: 'TEST YOURSELF',
    title: 'Quizzes & Mock Exams',
    subtitle: null,
    body: 'Every topic comes with MCQ, True/False, and Scenario questions. Mock exams test your full course knowledge — great for serious exam prep.',
    accent: '#2DD4BF',
  },
  {
    icon: '🚀',
    tag: 'GET STARTED',
    title: "You're all set!",
    subtitle: 'Your first course is one upload away.',
    body: "Let's build something great.",
    accent: '#818CF8',
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
    setTimeout(() => { setCurrent(index); setAnimating(false); }, 320);
  };

  const next = () => { if (current < slides.length - 1) goTo(current + 1, 'next'); };
  const prev = () => { if (current > 0) goTo(current - 1, 'prev'); };

  const slide = slides[current];
  const title = slide.cta && name ? `You're all set, ${name.split(' ')[0]}!` : slide.title;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: '#0D1117',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }}>
      {/* Background glow */}
      <div style={{
        position: 'absolute', width: 500, height: 500, borderRadius: '50%',
        background: `radial-gradient(circle, ${slide.accent}18 0%, transparent 70%)`,
        top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        transition: 'background 0.6s ease', pointerEvents: 'none',
      }} />
      {/* Grid */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `linear-gradient(${slide.accent}08 1px, transparent 1px), linear-gradient(90deg, ${slide.accent}08 1px, transparent 1px)`,
        backgroundSize: '40px 40px', pointerEvents: 'none',
      }} />

      {/* Card */}
      <div style={{
        background: 'rgba(255,255,255,0.03)',
        border: `1px solid ${slide.accent}44`,
        borderRadius: 24, padding: '40px 36px',
        maxWidth: 400, width: '100%', position: 'relative',
        backdropFilter: 'blur(20px)',
        boxShadow: `0 0 60px ${slide.accent}15`,
        transition: 'border-color 0.4s, box-shadow 0.4s',
      }}>
        {/* Top bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 36 }}>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: '2px',
            color: slide.accent, background: `${slide.accent}18`,
            padding: '4px 10px', borderRadius: 20, border: `1px solid ${slide.accent}33`,
          }}>{slide.tag}</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {slides.map((_, i) => (
              <div key={i} onClick={() => goTo(i, i > current ? 'next' : 'prev')} style={{
                width: i === current ? 20 : 6, height: 6, borderRadius: 3,
                background: i === current ? slide.accent : '#ffffff18',
                cursor: 'pointer', transition: 'all 0.3s ease',
              }} />
            ))}
          </div>
        </div>

        {/* Content */}
        <div style={{
          opacity: animating ? 0 : 1,
          transform: animating ? `translateX(${direction === 'next' ? '-20px' : '20px'})` : 'translateX(0)',
          transition: 'opacity 0.3s ease, transform 0.3s ease',
        }}>
          <div style={{ fontSize: 52, marginBottom: 20, lineHeight: 1 }}>{slide.icon}</div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: '#F1F5F9', margin: '0 0 8px', lineHeight: 1.2, fontFamily: "'Playfair Display', serif" }}>
            {title}
          </h1>
          {slide.subtitle && (
            <p style={{ fontSize: 14, color: slide.accent, margin: '0 0 16px', fontWeight: 500, fontFamily: F.sans }}>
              {slide.subtitle}
            </p>
          )}
          <p style={{ fontSize: 14, color: '#94A3B8', lineHeight: 1.75, margin: '0 0 32px', fontFamily: F.sans }}>
            {slide.body}
          </p>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 10 }}>
          {current > 0 && (
            <button onClick={prev} style={{
              flex: 1, padding: 12, background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12,
              color: '#94A3B8', fontSize: 14, fontFamily: F.sans, cursor: 'pointer',
            }}>← Back</button>
          )}
          {slide.cta ? (
            <button onClick={onDone} style={{
              flex: 1, padding: 12, background: slide.accent, border: 'none',
              borderRadius: 12, color: '#0D1117', fontSize: 14, fontWeight: 700,
              fontFamily: F.sans, cursor: 'pointer',
            }}>Start Learning →</button>
          ) : (
            <button onClick={next} style={{
              flex: 1, padding: 12, background: `${slide.accent}22`,
              border: `1px solid ${slide.accent}44`, borderRadius: 12,
              color: slide.accent, fontSize: 14, fontWeight: 600,
              fontFamily: F.sans, cursor: 'pointer',
            }}>Next →</button>
          )}
        </div>

        {!slide.cta && (
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <button onClick={onDone} style={{
              background: 'none', border: 'none', color: '#475569',
              fontSize: 11, fontFamily: "'JetBrains Mono', monospace",
              cursor: 'pointer', letterSpacing: '1px',
            }}>SKIP</button>
          </div>
        )}
      </div>
    </div>
  );
}
