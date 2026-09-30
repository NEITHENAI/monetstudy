'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { F } from '@/components/ui/primitives';

interface Props {
  text: string;
  theme: any;
}

const MONET_VOICES = [
  { id: 'clara', name: 'Monet Clara', gender: 'Female', desc: 'Warm & Academic (Default)' },
  { id: 'arthur', name: 'Monet Arthur', gender: 'Male', desc: 'Deep & Authoritative' },
  { id: 'julian', name: 'Monet Julian', gender: 'Dynamic', desc: 'Expressive & Engaging' },
  { id: 'elena', name: 'Monet Elena', gender: 'Female', desc: 'Calm & Precise' },
  { id: 'victor', name: 'Monet Victor', gender: 'Male', desc: 'Crisp & Articulate' },
];

export default function VoiceNarrator({ text, theme: T }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [selectedVoice, setSelectedVoice] = useState('clara');
  const [isCached, setIsCached] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentAudioUrlRef = useRef<string | null>(null);
  const activeVoiceRef = useRef<string>(selectedVoice);

  const cleanupAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (currentAudioUrlRef.current) {
      URL.revokeObjectURL(currentAudioUrlRef.current);
      currentAudioUrlRef.current = null;
    }
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, []);

  useEffect(() => {
    cleanupAudio();
  }, [text, cleanupAudio]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  }, [speed]);

  // Helper to generate a cache key for browser storage
  const getCacheKey = (voice: string, content: string) => {
    let hash = 0;
    const str = `${voice}:${content.slice(0, 500)}:${content.length}`;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return `https://monetstudy.local/audio/${Math.abs(hash)}`;
  };

  const handlePlayPause = async () => {
    // 1. If currently playing -> Pause
    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      return;
    }

    // 2. If already loaded & paused -> Resume instantly
    if (audioRef.current && audioRef.current.src && !loading) {
      try {
        audioRef.current.playbackRate = speed;
        await audioRef.current.play();
        setIsPlaying(true);
        return;
      } catch (e) {
        console.warn('Resume failed, regenerating audio...', e);
      }
    }

    setLoading(true);

    try {
      let audioBlob: Blob | null = null;
      const cacheUrl = getCacheKey(selectedVoice, text);

      // Check browser CacheStorage for instant 0ms playback
      if (typeof window !== 'undefined' && 'caches' in window) {
        try {
          const cache = await caches.open('monet_audio_v1');
          const cachedResponse = await cache.match(cacheUrl);
          if (cachedResponse) {
            audioBlob = await cachedResponse.blob();
            setIsCached(true);
          }
        } catch (e) {
          // Cache check fallback
        }
      }

      // If not cached in browser, fetch from server
      if (!audioBlob) {
        setIsCached(false);
        const res = await fetch('/api/narrate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text,
            voice: selectedVoice,
          }),
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        audioBlob = await res.blob();

        // Save in browser cache for future 0ms instant replay
        if (typeof window !== 'undefined' && 'caches' in window && audioBlob) {
          try {
            const cache = await caches.open('monet_audio_v1');
            cache.put(cacheUrl, new Response(audioBlob));
          } catch (e) {}
        }
      }

      const audioUrl = URL.createObjectURL(audioBlob);
      if (currentAudioUrlRef.current) {
        URL.revokeObjectURL(currentAudioUrlRef.current);
      }
      currentAudioUrlRef.current = audioUrl;
      activeVoiceRef.current = selectedVoice;

      const audio = new Audio(audioUrl);
      audio.playbackRate = speed;

      audio.onloadedmetadata = () => {
        setDuration(audio.duration || 0);
      };

      audio.ontimeupdate = () => {
        setCurrentTime(audio.currentTime);
      };

      audio.onended = () => {
        setIsPlaying(false);
        setCurrentTime(0);
      };

      audio.onerror = () => {
        setIsPlaying(false);
        setLoading(false);
      };

      audioRef.current = audio;
      await audio.play();
      setIsPlaying(true);
    } catch (err: any) {
      console.warn('AI narration error, falling back to local voice...', err);
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const clean = text.replace(/[#*`>\-\_\[\]]/g, '').replace(/\n+/g, ' ').slice(0, 1000);
        const utter = new SpeechSynthesisUtterance(clean);
        utter.rate = speed;
        utter.onstart = () => setIsPlaying(true);
        utter.onend = () => setIsPlaying(false);
        utter.onerror = () => setIsPlaying(false);
        window.speechSynthesis.speak(utter);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVoiceChange = (newVoice: string) => {
    setSelectedVoice(newVoice);
    if (activeVoiceRef.current !== newVoice) {
      cleanupAudio();
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  const skipTime = (seconds: number) => {
    if (audioRef.current) {
      const target = Math.max(0, Math.min(audioRef.current.duration || 0, audioRef.current.currentTime + seconds));
      audioRef.current.currentTime = target;
      setCurrentTime(target);
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const bars = Array.from({ length: 22 });

  return (
    <>
      {/* Floating Trigger Button */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          position: 'fixed',
          bottom: 88,
          right: 20,
          zIndex: 100,
          width: 52,
          height: 52,
          borderRadius: '50%',
          background: isPlaying ? T.teal : T.card2,
          border: `1.5px solid ${isPlaying ? T.teal : T.borderMid}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          fontSize: 22,
          boxShadow: isPlaying ? `0 0 24px ${T.teal}66` : '0 6px 20px rgba(0,0,0,0.3)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
        title="The Monet Narrator"
      >
        {loading ? (
          <div style={{ width: 22, height: 22, borderRadius: '50%', border: `2.5px solid ${T.border}`, borderTopColor: T.teal, animation: 'spin 1s linear infinite' }} />
        ) : isPlaying ? (
          '🔊'
        ) : (
          '🎙'
        )}
      </button>

      {/* Floating Player Panel */}
      {open && (
        <div
          style={{
            position: 'fixed',
            bottom: 152,
            right: 18,
            zIndex: 101,
            width: 324,
            background: T.card,
            border: `1.5px solid ${T.borderMid}`,
            borderRadius: 24,
            padding: '20px 18px',
            boxShadow: '0 24px 60px rgba(0,0,0,0.45)',
            backdropFilter: 'blur(20px)',
            fontFamily: F.sans,
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: `linear-gradient(135deg, ${T.teal}, ${T.violet})`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 15,
                  boxShadow: isPlaying ? `0 0 16px ${T.teal}77` : 'none',
                }}
              >
                ✦
              </div>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 800, color: T.text, letterSpacing: '-0.2px' }}>The Monet Narrator</div>
                <div style={{ fontSize: 10, color: isPlaying ? T.teal : T.muted, fontWeight: 800, letterSpacing: '0.6px', textTransform: 'uppercase' }}>
                  {loading ? 'PREPARING AUDIO...' : isPlaying ? (isCached ? 'PLAYING • INSTANT CACHE' : 'PLAYING • THE MONETS') : 'THE MONETS • STUDIO VOICES'}
                </div>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              style={{
                background: 'none',
                border: 'none',
                color: T.muted,
                cursor: 'pointer',
                fontSize: 16,
                padding: 4,
              }}
            >
              ✕
            </button>
          </div>

          {/* Waveform Visualization */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 42, gap: 3, margin: '14px 0' }}>
            {bars.map((_, i) => (
              <div
                key={i}
                style={{
                  width: 3,
                  borderRadius: 2,
                  background: isPlaying
                    ? i % 2 === 0
                      ? `linear-gradient(to top, ${T.teal}, ${T.tealGlow})`
                      : `linear-gradient(to top, ${T.violet}, ${T.amber})`
                    : T.borderMid,
                  height: isPlaying ? `${12 + Math.sin(Date.now() / 250 + i * 0.6) * 16 + Math.random() * 8}px` : '4px',
                  transition: 'height 0.1s ease',
                  opacity: isPlaying ? 0.85 : 0.35,
                }}
              />
            ))}
          </div>

          {/* Time & Scrub Bar */}
          <div style={{ marginBottom: 16 }}>
            <input
              type="range"
              min={0}
              max={duration || 100}
              step={0.5}
              value={currentTime}
              onChange={handleSeek}
              disabled={duration === 0}
              style={{
                width: '100%',
                accentColor: T.teal,
                height: 4,
                cursor: duration > 0 ? 'pointer' : 'default',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: T.textSub, marginTop: 4, fontFamily: F.mono }}>
              <span>{formatTime(currentTime)}</span>
              <span>{duration > 0 ? formatTime(duration) : '--:--'}</span>
            </div>
          </div>

          {/* Primary Controls */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 18 }}>
            <button
              onClick={() => skipTime(-10)}
              disabled={!audioRef.current}
              style={{
                background: T.card2,
                border: `1px solid ${T.border}`,
                borderRadius: '50%',
                width: 38,
                height: 38,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: audioRef.current ? 'pointer' : 'default',
                color: T.text,
                fontSize: 12,
                fontWeight: 800,
                opacity: audioRef.current ? 1 : 0.4,
              }}
              title="Rewind 10s"
            >
              -10
            </button>

            <button
              onClick={handlePlayPause}
              disabled={loading}
              style={{
                background: `linear-gradient(135deg, ${T.teal}, ${T.violet})`,
                border: 'none',
                borderRadius: 999,
                padding: '12px 28px',
                color: '#FFFFFF',
                fontSize: 14,
                fontWeight: 800,
                cursor: loading ? 'default' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: `0 4px 18px ${T.teal}44`,
                transition: 'transform 0.15s ease',
              }}
            >
              {loading ? (
                <>
                  <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid #FFF', borderTopColor: 'transparent', animation: 'spin 1s linear infinite' }} />
                  <span>Preparing...</span>
                </>
              ) : isPlaying ? (
                <>
                  <span>⏸</span>
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <span>▶</span>
                  <span>{currentTime > 0 ? 'Resume' : 'Listen with Monet'}</span>
                </>
              )}
            </button>

            <button
              onClick={() => skipTime(10)}
              disabled={!audioRef.current}
              style={{
                background: T.card2,
                border: `1px solid ${T.border}`,
                borderRadius: '50%',
                width: 38,
                height: 38,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: audioRef.current ? 'pointer' : 'default',
                color: T.text,
                fontSize: 12,
                fontWeight: 800,
                opacity: audioRef.current ? 1 : 0.4,
              }}
              title="Forward 10s"
            >
              +10
            </button>
          </div>

          {/* Voice Selector: "THE MONETS" */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <div style={{ fontSize: 10.5, fontWeight: 800, color: T.textSub, letterSpacing: '0.4px', textTransform: 'uppercase' }}>
                The Monets (Voices)
              </div>
              <span style={{ fontSize: 9.5, color: T.teal, fontWeight: 800, background: `${T.teal}18`, padding: '2px 6px', borderRadius: 4 }}>
                STUDIO AI
              </span>
            </div>
            <select
              value={selectedVoice}
              onChange={e => handleVoiceChange(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                background: T.card2,
                border: `1px solid ${T.borderMid}`,
                borderRadius: 12,
                color: T.text,
                fontSize: 12.5,
                fontWeight: 700,
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              {MONET_VOICES.map(v => (
                <option key={v.id} value={v.id}>
                  {v.name} ({v.gender}) — {v.desc}
                </option>
              ))}
            </select>
          </div>

          {/* Speed Controls */}
          <div>
            <div style={{ fontSize: 10.5, fontWeight: 800, color: T.textSub, marginBottom: 6, letterSpacing: '0.4px', textTransform: 'uppercase' }}>
              Playback Speed
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {[0.8, 1, 1.25, 1.5, 2].map(s => (
                <button
                  key={s}
                  onClick={() => setSpeed(s)}
                  style={{
                    flex: 1,
                    padding: '6px 0',
                    borderRadius: 8,
                    background: speed === s ? T.teal : T.card2,
                    border: `1px solid ${speed === s ? T.teal : T.border}`,
                    color: speed === s ? '#FFFFFF' : T.textSub,
                    fontSize: 11,
                    fontWeight: 800,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
