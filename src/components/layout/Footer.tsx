'use client';
import { useTheme } from '@/context/ThemeContext';
import { F } from '@/components/ui/primitives';

export function Footer() {
  const { theme: T } = useTheme();
  return (
    <footer style={{
      padding: '24px 20px 32px',
      borderTop: `1px solid ${T.border}`,
      background: T.card,
      textAlign: 'center',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 12,
      fontFamily: F.sans,
      fontSize: 12,
      color: T.textSub,
    }}>
      <div>
        <span>Developed by </span>
        <span style={{ fontWeight: 600, color: T.text }}>Neithen</span>
        <span> &amp; </span>
        <span style={{ fontWeight: 600, color: T.text }}>KNEITHEN TECH</span>
      </div>
      <div style={{ fontSize: 11, color: T.muted }}>
        © {new Date().getFullYear()} KNEITHEN TECH. All rights reserved.
      </div>
      <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
        <a href="/privacypolicy" style={{
          color: T.teal,
          textDecoration: 'none',
          fontWeight: 500,
          borderBottom: `1px dashed ${T.teal}`,
          paddingBottom: 2,
          transition: 'all 0.2s',
        }}
        onMouseEnter={e => e.currentTarget.style.borderBottomStyle = 'solid'}
        onMouseLeave={e => e.currentTarget.style.borderBottomStyle = 'dashed'}
        >
          Privacy Policy
        </a>
        <a href="mailto:monetsbox@gmail.com" style={{
          color: T.teal,
          textDecoration: 'none',
          fontWeight: 500,
          borderBottom: `1px dashed ${T.teal}`,
          paddingBottom: 2,
          transition: 'all 0.2s',
        }}
        onMouseEnter={e => e.currentTarget.style.borderBottomStyle = 'solid'}
        onMouseLeave={e => e.currentTarget.style.borderBottomStyle = 'dashed'}
        >
          Contact Us
        </a>
      </div>
    </footer>
  );
}
