'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signUpWithEmail, signInWithGoogle } from '@/lib/firebase/auth';
import { useTheme } from '@/context/ThemeContext';
import { Logo, Btn, Spinner, F } from '@/components/ui/primitives';
import { Footer } from '@/components/layout/Footer';

export default function SignupPage() {
  const { theme: T } = useTheme();
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const inp: React.CSSProperties = {
    width: '100%', padding: '14px 20px', background: T.card2,
    border: `1.5px solid ${T.borderMid}`, borderRadius: 999,
    color: T.text, fontSize: 14, fontFamily: F.sans,
    caretColor: T.teal, transition: 'all 0.2s',
  };

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
    <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '24px 20px' }}>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', maxWidth: 1080, margin: 'auto' }}>
        <div style={{
          width: '100%',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 40,
          alignItems: 'center',
        }} className="animate-fade-up">

          {/* Desktop Left Hero Column */}
          <div className="hidden md:flex" style={{ flexDirection: 'column', gap: 24, padding: '20px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Logo size={44} textSize={22} />
            </div>

            <h2 style={{ fontSize: 38, fontWeight: 900, color: T.text, lineHeight: 1.2, fontFamily: F.sans, letterSpacing: '-0.8px' }}>
              Master Any Subject in Minutes
            </h2>

            <p style={{ fontSize: 15, color: T.textSub, lineHeight: 1.7, fontFamily: F.sans }}>
              Create your account to unlock AI curriculum synthesis, custom topic pacing, exam simulations, and voice audio lectures.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { icon: '✨', t: 'Instant Ingestion', d: 'PDF, Word, or raw notes' },
                { icon: '🎯', t: 'Active Recall', d: 'Checkpoint testing quizzes' },
                { icon: '🎙️', t: 'Voice Narrator', d: 'Listen anytime on the go' },
                { icon: '⚡', t: 'Exam Simulator', d: 'Timed test papers' },
              ].map((item, idx) => (
                <div key={idx} style={{ background: T.card, border: `1.5px solid ${T.borderMid}`, borderRadius: 20, padding: '14px 16px', boxShadow: '0 4px 16px rgba(44, 24, 16, 0.04)' }}>
                  <div style={{ fontSize: 20, marginBottom: 4 }}>{item.icon}</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: T.text, fontFamily: F.sans }}>{item.t}</div>
                  <div style={{ fontSize: 11, color: T.textSub, fontFamily: F.sans }}>{item.d}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Signup Form Card */}
          <div style={{ maxWidth: 440, width: '100%', margin: '0 auto' }}>
            {/* Mobile Header */}
            <div className="md:hidden" style={{ textAlign: 'center', marginBottom: 28 }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
                <Logo size={52} textSize={0} />
              </div>
              <h1 style={{ fontFamily: F.sans, fontSize: 24, color: T.text, fontWeight: 800, letterSpacing: '-0.5px' }}>
                Create Account
              </h1>
              <p style={{ color: T.textSub, fontSize: 13, marginTop: 4, fontFamily: F.sans }}>
                Start generating personalized AI study courses
              </p>
            </div>

            {/* Desktop Form Title */}
            <div className="hidden md:block" style={{ marginBottom: 20 }}>
              <h1 style={{ fontFamily: F.sans, fontSize: 26, color: T.text, fontWeight: 900, letterSpacing: '-0.5px', margin: '0 0 4px' }}>
                Create Free Account
              </h1>
              <p style={{ color: T.textSub, fontSize: 13, margin: 0, fontFamily: F.sans }}>
                Get started with your free study workspace
              </p>
            </div>

            {/* Card */}
            <div style={{
              background: T.card, border: `1.5px solid ${T.borderMid}`,
              borderRadius: 32, padding: '32px 28px',
              boxShadow: '0 16px 40px rgba(44, 24, 16, 0.06)',
            }}>
              <button onClick={handleGoogle} disabled={loading} style={{
                width: '100%', padding: '13px', background: T.card2,
                border: `1.5px solid ${T.borderMid}`, borderRadius: 999,
                color: T.text, fontSize: 13, fontFamily: F.sans, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                cursor: 'pointer', transition: 'all 0.2s',
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                Sign up with Google
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '18px 0' }}>
                <div style={{ flex: 1, height: 1, background: T.border }} />
                <span style={{ fontFamily: F.sans, fontSize: 11, color: T.muted, textTransform: 'uppercase', fontWeight: 600 }}>or email</span>
                <div style={{ flex: 1, height: 1, background: T.border }} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <input placeholder="Full name" value={name} onChange={e => setName(e.target.value)} style={inp} />
                <input type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} style={inp} />
                <input type="password" placeholder="Password (min 6 chars)" value={pass} onChange={e => setPass(e.target.value)} style={inp} onKeyDown={e => e.key === 'Enter' && handleSignup()} />
              </div>

              {error && (
                <div style={{ marginTop: 14, padding: '10px 16px', background: T.redDim, border: `1px solid ${T.red}33`, borderRadius: 16, color: T.red, fontSize: 12, fontFamily: F.sans, fontWeight: 500 }}>
                  {error}
                </div>
              )}

              <div style={{ marginTop: 20 }}>
                <Btn onClick={handleSignup} disabled={loading || !name || !email || !pass} style={{ width: '100%', padding: '14px' }}>
                  {loading ? <Spinner size={18} color="#FFFFFF" /> : 'Create Account →'}
                </Btn>
              </div>
            </div>

            <p style={{ textAlign: 'center', marginTop: 22, color: T.textSub, fontSize: 13, fontFamily: F.sans }}>
              Already have an account?{' '}
              <span onClick={() => router.push('/auth/login')} style={{ color: T.teal, cursor: 'pointer', fontWeight: 800 }}>Sign in</span>
            </p>
          </div>
        </div>
      </div>
      <div style={{ width: '100%', maxWidth: 1080, margin: '16px auto 0' }}>
        <Footer />
      </div>
    </div>
  );
}
