'use client';

import React, { useState, useEffect } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { F, Btn, Tag, ProgressBar, Logo, Spinner, IconSearch } from '@/components/ui/primitives';

export default function SmartAd() {
  const { theme: T } = useTheme();
  const [step, setStep] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const interval = setInterval(() => {
      setStep((s) => (s + 1) % 4);
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  if (!mounted) return null;

  return (
    <div style={{
      minHeight: '100vh',
      background: T.bg,
      color: T.text,
      fontFamily: F.sans,
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '80px 20px',
    }}>
      {/* Background Decor */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `linear-gradient(${T.teal}05 1px, transparent 1px), linear-gradient(90deg, ${T.teal}05 1px, transparent 1px)`,
        backgroundSize: '40px 40px', pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', top: '-10%', left: '-10%', width: '50%', height: '50%',
        background: `radial-gradient(circle, ${T.teal}08 0%, transparent 70%)`,
        filter: 'blur(80px)', pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: '-10%', right: '-10%', width: '50%', height: '50%',
        background: `radial-gradient(circle, ${T.violet}08 0%, transparent 70%)`,
        filter: 'blur(80px)', pointerEvents: 'none',
      }} />

      {/* Header */}
      <div className="animate-fade-in" style={{ marginBottom: 60, textAlign: 'center' }}>
        <Logo size={48} textSize={28} />
        <p style={{ marginTop: 16, color: T.textSub, fontSize: 18, maxWidth: 600, margin: '16px auto 0' }}>
          Turn any topic, notes, or files into a comprehensive interactive course in seconds.
        </p>
      </div>

      {/* Main Interactive Stage */}
      <div style={{
        width: '100%', maxWidth: 1000, height: 600,
        position: 'relative',
        display: 'flex', gap: 40,
        alignItems: 'flex-start',
        justifyContent: 'center',
      }}>
        
        {/* Left: Interactive Mockup Side */}
        <div style={{
          flex: 1, position: 'relative', height: '100%',
          display: 'flex', flexDirection: 'column', gap: 20,
        }}>
          {/* Mockup: AI Input */}
          <div style={{
            background: T.card, border: `1px solid ${T.border}`,
            borderRadius: 24, padding: 24,
            boxShadow: `0 20px 40px rgba(0,0,0,0.4), 0 0 20px ${T.teal}05`,
            transform: step === 0 ? 'scale(1.05)' : 'scale(1)',
            opacity: step === 0 ? 1 : 0.6,
            transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
          }}>
            <Tag color={T.teal}>AI Generation</Tag>
            <h3 style={{ fontSize: 20, fontWeight: 700, marginTop: 12, marginBottom: 16 }}>What do you want to learn?</h3>
            <div style={{ background: T.bg, padding: '12px 16px', borderRadius: 12, border: `1px solid ${T.borderMid}`, display: 'flex', alignItems: 'center', gap: 12 }}>
              <IconSearch color={T.teal} size={18} />
              <div style={{ color: T.textSub, fontSize: 14 }}>
                {step === 0 ? (
                  <span className="animate-pulse-sm">Quantum Physics Fundamentals...</span>
                ) : (
                  "Quantum Physics Fundamentals"
                )}
              </div>
            </div>
            {step === 0 && (
              <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
                <Btn variant="primary" style={{ padding: '8px 16px', fontSize: 12 }}>Generate Course</Btn>
              </div>
            )}
          </div>

          {/* Mockup: Course Structure */}
          <div style={{
            background: T.card, border: `1px solid ${T.borderMid}`,
            borderRadius: 24, padding: 24,
            width: '90%', alignSelf: 'center',
            boxShadow: `0 20px 40px rgba(0,0,0,0.4)`,
            transform: step === 1 ? 'scale(1.05) translateY(-20px)' : 'scale(1)',
            opacity: step === 1 ? 1 : 0.4,
            transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
            zIndex: step === 1 ? 2 : 0,
          }}>
            <Tag color={T.violet}>Structured Content</Tag>
            <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[1, 2, 3].map(i => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, background: T.bg, padding: 12, borderRadius: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: T.violetDim, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.violet, fontWeight: 700 }}>{i}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ height: 10, width: '70%', background: T.textSub, opacity: 0.3, borderRadius: 4, marginBottom: 4 }} />
                    <div style={{ height: 8, width: '40%', background: T.textSub, opacity: 0.15, borderRadius: 4 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Mockup: Quiz */}
          <div style={{
            background: T.card, border: `1px solid ${T.borderMid}`,
            borderRadius: 24, padding: 24,
            width: '85%', alignSelf: 'flex-end',
            boxShadow: `0 20px 40px rgba(0,0,0,0.4)`,
            transform: step === 2 ? 'scale(1.05) translateY(-40px)' : 'scale(1)',
            opacity: step === 2 ? 1 : 0.3,
            transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
            zIndex: step === 2 ? 3 : 0,
          }}>
             <Tag color={T.green}>Smart Quiz</Tag>
             <p style={{ fontSize: 13, marginTop: 12, color: T.textSub }}>Which of the following describes the superposition principle?</p>
             <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ padding: '8px 12px', borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 12, opacity: 0.8 }}>A) Particle behavior</div>
                <div style={{ padding: '8px 12px', borderRadius: 8, background: `${T.green}18`, border: `1px solid ${T.green}44`, fontSize: 12, color: T.green }}>B) Multiple states simultaneously</div>
             </div>
          </div>
        </div>

        {/* Right: Descriptive Side */}
        <div style={{
          flex: 0.8, display: 'flex', flexDirection: 'column', justifyContent: 'center',
          textAlign: 'left', gap: 32,
        }}>
          <div style={{ opacity: step === 0 ? 1 : 0.3, transition: 'opacity 0.6s' }}>
            <h2 style={{ fontSize: 32, fontWeight: 800, marginBottom: 12, color: T.teal }}>Phase 1: Knowledge Capture</h2>
            <p style={{ fontSize: 16, color: T.textSub, lineHeight: 1.6 }}>Paste text, upload PDFs, or just enter a topic. MonetStudy drinks in all information instantly.</p>
          </div>
          <div style={{ opacity: step === 1 ? 1 : 0.3, transition: 'opacity 0.6s' }}>
            <h2 style={{ fontSize: 32, fontWeight: 800, marginBottom: 12, color: T.violet }}>Phase 2: Intelligent Synthesis</h2>
            <p style={{ fontSize: 16, color: T.textSub, lineHeight: 1.6 }}>Our AI breaks down complex subjects into digestible modules, hierarchy, and key insights.</p>
          </div>
          <div style={{ opacity: step === 2 ? 1 : 0.3, transition: 'opacity 0.6s' }}>
            <h2 style={{ fontSize: 32, fontWeight: 800, marginBottom: 12, color: T.green }}>Phase 3: Deep Retention</h2>
            <p style={{ fontSize: 16, color: T.textSub, lineHeight: 1.6 }}>Auto-generated quizzes, mock exams, and scenario questions ensure you actually learn, not just read.</p>
          </div>
        </div>
      </div>

      {/* CTA Footer */}
      <div style={{ marginTop: 80, textAlign: 'center' }}>
        <Btn variant="primary" style={{ padding: '16px 40px', fontSize: 18, borderRadius: 16 }}>
          Experience MonetStudy for Free
        </Btn>
        <p style={{ marginTop: 20, color: T.muted, fontSize: 14 }}>
          No credit card required. Start building your first course in 10 seconds.
        </p>
      </div>

      <style jsx global>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        .animate-pulse-sm { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
        .animate-fade-in { animation: fadeIn 1s ease-out forwards; }
        .animate-fade-up { animation: fadeUp 0.8s ease-out forwards; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
