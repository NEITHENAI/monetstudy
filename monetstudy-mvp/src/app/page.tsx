'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';

export default function Home() {
  const { user, loading } = useAuth();
  const { theme: T } = useTheme();
  const router = useRouter();

  useEffect(() => {
    if (!loading) router.replace(user ? '/dashboard' : '/auth/login');
  }, [user, loading, router]);

  return (
    <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <path d="M24 10 C18 8 8 10 6 14 L6 38 C8 34 18 32 24 34 Z" stroke={T.text} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M24 10 C30 8 40 10 42 14 L42 38 C40 34 30 32 24 34 Z" stroke={T.text} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M28 28 L36 18" stroke={T.teal} strokeWidth="2.5" strokeLinecap="round"/>
          <path d="M30 18 L36 18 L36 24" stroke={T.teal} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M8 41 Q24 37 40 41" stroke={T.teal} strokeWidth="2" fill="none" strokeLinecap="round"/>
        </svg>
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 20, color: T.text }}>
          <span style={{ fontWeight: 300 }}>Monet</span><span style={{ fontWeight: 700 }}>Study</span>
        </div>
        <div style={{ width: 28, height: 28, borderRadius: '50%', border: `2px solid ${T.border}`, borderTop: `2px solid ${T.teal}`, animation: 'spin 1s linear infinite' }} />
      </div>
    </div>
  );
}
