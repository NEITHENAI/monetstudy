'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';

import { Logo } from '@/components/ui/primitives';

export default function Home() {
  const { user, loading } = useAuth();
  const { theme: T } = useTheme();
  const router = useRouter();

  useEffect(() => {
    if (!loading) router.replace(user ? '/dashboard' : '/auth/login');
  }, [user, loading, router]);

  return (
    <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
        <Logo size={44} textSize={24} />
        <div style={{ width: 28, height: 28, borderRadius: '50%', border: `2.5px solid ${T.border}`, borderTop: `2.5px solid ${T.teal}`, animation: 'spin 0.8s linear infinite' }} />
      </div>
    </div>
  );
}
