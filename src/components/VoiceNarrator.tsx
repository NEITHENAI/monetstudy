'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { F } from '@/components/ui/primitives';

interface Props {
  text: string;
  theme: any;
}

export default function VoiceNarrator({ text, theme: T }: Props) {
  const [open, setOpen] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [rate, setRate] = useState(1);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);
  const intervalRef = useRef<any>(null);
  const charRef = useRef(0);
  const cleanText = text.replace(/[#*`>\-\_\[\]]/g, '').replace(/\n+/g, ' ').trim();

  useEffect(() => {
    const load = () => {
      const v = window.speechSynthesis.getVoices();
      if (v.length) {
        setVoices(v);
        const preferred = v.find(vv =>
          vv.name.includes('Google') || vv.name.includes('Daniel') ||
          vv.name.includes('Samantha') || vv.name.includes('Karen') ||
          vv.lang.startsWith('en')
        ) || v[0];
        setSelectedVoice(preferred);
      }
    };
    load();
    window.speechSynthesis.onvoiceschanged = load;
    return () => { stop(); };
  }, []);

  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
    setSpeaking(false); setPaused(false); setProgress(0); charRef.current = 0;
    clearInterval(intervalRef.current);
  }, []);

  const speak = useCallback(() => {
    if (!cleanText) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(cleanText);
    if (selectedVoice) utter.voice = selectedVoice;
    utter.rate = rate; utter.pitch = 1; utter.volume = 1;
    utter.onstart = () => { setSpeaking(true); setPaused(false); };
    utter.onend = () => { setSpeaking(false); setPaused(false); setProgress(100); clearInterval(intervalRef.current); };
    utter.onerror = () => { setSpeaking(false); setPaused(false); clearInterval(intervalRef.current); };
    utter.onboundary = (e) => {
      charRef.current = e.charIndex;
      setProgress(Math.round((e.charIndex / cleanText.length) * 100));
    };
    utterRef.current = utter;
    window.speechSynthesis.speak(utter);
    // Fallback progress ticker
    intervalRef.current = setInterval(() => {
      if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
        setProgress(p => Math.min(p + 0.3, 99));
      }
    }, 100);
  }, [cleanText, selectedVoice, rate]);

  const pause = () => { window.speechSynthesis.pause(); setPaused(true); setSpeaking(false); };
  const resume = () => { window.speechSynthesis.resume(); setPaused(false); setSpeaking(true); };

  const bars = Array.from({ length: 28 });

  return (
    <>
      {/* Floating trigger button */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          position: 'fixed', bottom: 88, right: 20, zIndex: 100,
          width: 48, height: 48, borderRadius: '50%',
          background: speaking ? T.teal : T.card2,
          border: `1.5px solid ${speaking ? T.teal : T.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', fontSize: 20,
          boxShadow: speaking ? `0 0 20px ${T.teal}55` : '0 4px 16px rgba(0,0,0,0.3)',
          transition: 'all 0.3s ease',
        }}
        title="Voice narrator"
      >
        {speaking ? '🔊' : paused ? '⏸' : '🎙'}
      </button>

      {/* Panel */}
      {open && (
        <div style={{
          position: 'fixed', bottom: 148, right: 16, zIndex: 101,
          width: 300, background: T.card,
          border: `1px solid ${T.borderMid}`,
          borderRadius: 20, padding: '20px 18px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: `linear-gradient(135deg, ${T.teal}, ${T.violet})`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13,
                boxShadow: speaking ? `0 0 12px ${T.teal}66` : 'none',
                transition: 'box-shadow 0.3s',
              }}>🤖</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: T.text, fontFamily: F.sans }}>AI Narrator</div>
                <div style={{ fontSize: 10, color: T.muted, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '1px' }}>
                  {speaking ? 'SPEAKING...' : paused ? 'PAUSED' : 'READY'}
                </div>
              </div>
            </div>
            <button onClick={() => { stop(); setOpen(false); }} style={{ background: 'none', border: 'none', color: T.muted, cursor: 'pointer', fontSize: 16 }}>✕</button>
          </div>

          {/* Waveform orb */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, height: 60 }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {/* Outer pulse rings */}
              {speaking && [1,2,3].map(i => (
                <div key={i} style={{
                  position: 'absolute',
                  width: 40 + i * 18,
                  height: 40 + i * 18,
                  borderRadius: '50%',
                  border: `1px solid ${T.teal}`,
                  opacity: 0.15 / i,
                  animation: `pulse${i} ${0.8 + i * 0.3}s ease-out infinite`,
                }} />
              ))}
              {/* Center orb */}
              <div style={{
                width: 44, height: 44, borderRadius: '50%',
                background: `radial-gradient(circle at 35% 35%, ${T.teal}cc, ${T.violet}88)`,
                boxShadow: speaking ? `0 0 24px ${T.teal}66, 0 0 48px ${T.violet}33` : `0 0 12px ${T.teal}22`,
                transition: 'box-shadow 0.3s',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18,
              }}>🤖</div>
            </div>

            {/* Waveform bars */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginLeft: 14, height: 40 }}>
              {bars.map((_, i) => (
                <div key={i} style={{
                  width: 2.5, borderRadius: 2,
                  background: i % 3 === 0 ? T.teal : T.violet,
                  height: speaking
                    ? `${20 + Math.sin(Date.now() / 200 + i * 0.5) * 14 + Math.random() * 8}px`
                    : paused ? '6px' : '4px',
                  opacity: speaking ? 0.7 + (i % 4) * 0.07 : 0.25,
                  animation: speaking ? `wave ${0.4 + (i % 5) * 0.1}s ease-in-out infinite alternate` : 'none',
                  animationDelay: `${i * 0.04}s`,
                  transition: 'height 0.1s ease, opacity 0.3s',
                }} />
              ))}
            </div>
          </div>

          {/* Progress bar */}
          <div style={{ height: 3, background: T.card2, borderRadius: 2, marginBottom: 14, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 2,
              background: `linear-gradient(90deg, ${T.teal}, ${T.violet})`,
              width: `${progress}%`, transition: 'width 0.3s ease',
            }} />
          </div>

          {/* Controls */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            {!speaking && !paused && (
              <button onClick={speak} style={{
                flex: 1, padding: '10px 0', background: T.teal, border: 'none',
                borderRadius: 10, color: T.btnText, fontFamily: F.sans,
                fontSize: 13, fontWeight: 700, cursor: 'pointer',
                boxShadow: `0 4px 16px ${T.teal}44`,
              }}>▶ Play</button>
            )}
            {speaking && (
              <button onClick={pause} style={{
                flex: 1, padding: '10px 0', background: T.card2,
                border: `1px solid ${T.border}`, borderRadius: 10,
                color: T.text, fontFamily: F.sans, fontSize: 13, cursor: 'pointer',
              }}>⏸ Pause</button>
            )}
            {paused && (
              <button onClick={resume} style={{
                flex: 1, padding: '10px 0', background: T.teal, border: 'none',
                borderRadius: 10, color: T.btnText, fontFamily: F.sans,
                fontSize: 13, fontWeight: 700, cursor: 'pointer',
              }}>▶ Resume</button>
            )}
            {(speaking || paused) && (
              <button onClick={stop} style={{
                padding: '10px 14px', background: T.card2,
                border: `1px solid ${T.border}`, borderRadius: 10,
                color: T.muted, fontFamily: F.sans, fontSize: 13, cursor: 'pointer',
              }}>■ Stop</button>
            )}
          </div>

          {/* Voice selector */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 10, color: T.muted, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '1px', marginBottom: 6 }}>VOICE</div>
            <select
              value={selectedVoice?.name || ''}
              onChange={e => setSelectedVoice(voices.find(v => v.name === e.target.value) || null)}
              style={{
                width: '100%', padding: '7px 10px',
                background: T.card2, border: `1px solid ${T.border}`,
                borderRadius: 8, color: T.text, fontFamily: F.sans,
                fontSize: 12, cursor: 'pointer', outline: 'none',
              }}
            >
              {voices.filter(v => v.lang.startsWith('en')).map(v => (
                <option key={v.name} value={v.name}>{v.name}</option>
              ))}
            </select>
          </div>

          {/* Speed */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <div style={{ fontSize: 10, color: T.muted, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '1px' }}>SPEED</div>
              <div style={{ fontSize: 10, color: T.teal, fontFamily: "'JetBrains Mono', monospace" }}>{rate}x</div>
            </div>
            <input type="range" min="0.5" max="2" step="0.1" value={rate}
              onChange={e => setRate(parseFloat(e.target.value))}
              style={{ width: '100%', accentColor: T.teal, cursor: 'pointer' }}
            />
          </div>
        </div>
      )}

      <style>{`
        @keyframes wave {
          from { transform: scaleY(0.4); }
          to   { transform: scaleY(1.4); }
        }
        @keyframes pulse1 { to { transform: scale(1.6); opacity: 0; } }
        @keyframes pulse2 { to { transform: scale(1.5); opacity: 0; } }
        @keyframes pulse3 { to { transform: scale(1.4); opacity: 0; } }
      `}</style>
    </>
  );
}
