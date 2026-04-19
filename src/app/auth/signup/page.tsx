'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signUpWithEmail, signInWithGoogle } from '@/lib/firebase/auth';
import { useTheme } from '@/context/ThemeContext';
import { Logo, Btn, Spinner, F } from '@/components/ui/primitives';

export default function SignupPage() {
  const { theme: T } = useTheme();
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const inp: React.CSSProperties = { width: '100%', padding: '13px 16px', background: T.card2, border: `1px solid ${T.border}`, borderRadius: 10, color: T.text, fontSize: 15, fontFamily: F.sans, caretColor: T.teal, transition: 'border-color 0.2s' };

  const handleSignup = async () => {
    setError(''); setLoading(true);
    try { await signUpWithEmail(email, pass, name); router.replace('/dashboard'); }
    catch (e: any) { setError(e.message?.replace('Firebase: ', '') || 'Sign up failed'); }
    finally { setLoading(false); }
  };

  const handleGoogle = async () => {
    setError(''); setLoading(true);
    try { await signInWithGoogle(); router.replace('/dashboard'); }
    catch (e: any) { setError(e.message?.replace('Firebase: ', '') || 'Google sign in failed'); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: 400, animation: 'fadeUp 0.5s ease' }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
            <Logo size={44} textSize={0} />
          </div>
          <div style={{ fontFamily: F.sans, fontSize: 24, color: T.text, fontWeight: 600 }}>Create your account</div>
          <div style={{ color: T.textSub, fontSize: 14, marginTop: 4, fontFamily: F.sans }}>Start learning smarter today.</div>
        </div>

        <button onClick={handleGoogle} disabled={loading} style={{ width: '100%', padding: '13px', background: T.card2, border: `1px solid ${T.border}`, borderRadius: 12, color: T.text, fontSize: 14, fontFamily: F.sans, fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 18, cursor: 'pointer' }}>
          <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
          Continue with Google
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{ flex: 1, height: 1, background: T.border }} />
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: T.muted, letterSpacing: '2px', textTransform: 'uppercase' }}>or</span>
          <div style={{ flex: 1, height: 1, background: T.border }} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input placeholder="Your name" value={name} onChange={e => setName(e.target.value)} style={inp} onFocus={e => (e.target.style.borderColor = T.borderMid)} onBlur={e => (e.target.style.borderColor = T.border)} />
          <input type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} style={inp} onFocus={e => (e.target.style.borderColor = T.borderMid)} onBlur={e => (e.target.style.borderColor = T.border)} />
          <input type="password" placeholder="Password (min 6 chars)" value={pass} onChange={e => setPass(e.target.value)} style={inp} onFocus={e => (e.target.style.borderColor = T.borderMid)} onBlur={e => (e.target.style.borderColor = T.border)} />
        </div>

        {error && <div style={{ marginTop: 12, padding: '10px 14px', background: T.redDim, border: `1px solid ${T.red}33`, borderRadius: 8, color: T.red, fontSize: 13 }}>{error}</div>}

        <Btn onClick={handleSignup} disabled={loading || !name || !email || !pass} style={{ width: '100%', marginTop: 14, padding: '14px' }}>
          {loading ? <Spinner size={18} /> : 'Create account →'}
        </Btn>

        <p style={{ textAlign: 'center', marginTop: 16, color: T.muted, fontSize: 14, fontFamily: F.sans }}>
          Already have an account?{' '}
          <span onClick={() => router.push('/auth/login')} style={{ color: T.teal, cursor: 'pointer', fontWeight: 500 }}>Sign in</span>
        </p>
      </div>
    </div>
  );
}
