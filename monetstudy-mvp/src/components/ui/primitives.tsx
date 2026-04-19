'use client';
import { useTheme } from '@/context/ThemeContext';

export const F = {
  sans: "'Inter', system-ui, sans-serif",
  mono: "'JetBrains Mono', monospace",
};

export function MonoLabel({ children, color, size = 10 }: { children: React.ReactNode; color?: string; size?: number }) {
  const { theme: T } = useTheme();
  return (
    <span style={{ fontFamily: F.mono, fontSize: size, letterSpacing: '2px', textTransform: 'uppercase', color: color ?? T.muted }}>
      {children}
    </span>
  );
}

export function Tag({ children, color }: { children: React.ReactNode; color?: string }) {
  const { theme: T } = useTheme();
  const c = color ?? T.teal;
  return (
    <span style={{ fontFamily: F.mono, fontSize: 9, letterSpacing: '1.5px', textTransform: 'uppercase', color: c, background: `${c}18`, padding: '3px 10px', borderRadius: 20, display: 'inline-block', whiteSpace: 'nowrap' }}>
      {children}
    </span>
  );
}

export function ProgressBar({ value, height = 5 }: { value: number; height?: number }) {
  const { theme: T } = useTheme();
  return (
    <div style={{ background: T.dim, borderRadius: 99, overflow: 'hidden', height }}>
      <div style={{ width: `${Math.min(100, value ?? 0)}%`, height: '100%', background: T.teal, borderRadius: 99, boxShadow: `0 0 10px ${T.tealGlow}`, transition: 'width 0.7s cubic-bezier(.4,0,.2,1)' }} />
    </div>
  );
}

interface BtnProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'ghost' | 'violet' | 'outline' | 'danger';
  disabled?: boolean;
  style?: React.CSSProperties;
  type?: 'button' | 'submit';
}
export function Btn({ children, onClick, variant = 'primary', disabled, style: s = {}, type = 'button' }: BtnProps) {
  const { theme: T } = useTheme();
  const variants: Record<string, React.CSSProperties> = {
    primary: { background: T.teal, color: T.btnText, border: 'none', boxShadow: `0 4px 20px ${T.tealGlow}` },
    ghost:   { background: T.card2, color: T.text, border: `1px solid ${T.border}` },
    violet:  { background: T.violet, color: '#fff', border: 'none', boxShadow: '0 4px 20px rgba(139,108,247,0.2)' },
    outline: { background: 'transparent', color: T.teal, border: `1px solid ${T.borderMid}` },
    danger:  { background: T.redDim, color: T.red, border: `1px solid ${T.red}22` },
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} style={{ ...variants[variant], padding: '12px 22px', borderRadius: 10, fontSize: 14, fontWeight: 600, transition: 'all 0.2s', opacity: disabled ? 0.38 : 1, cursor: disabled ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: F.sans, ...s }}>
      {children}
    </button>
  );
}

export function Spinner({ size = 28 }: { size?: number }) {
  const { theme: T } = useTheme();
  return <div style={{ width: size, height: size, borderRadius: '50%', border: `2px solid ${T.border}`, borderTop: `2px solid ${T.teal}`, animation: 'spin 1s linear infinite' }} />;
}

// SVG Icons
export const IconHome = ({ size = 20, color }: { size?: number; color: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z"/>
    <path d="M9 21V12h6v9"/>
  </svg>
);
export const IconSearch = ({ size = 20, color }: { size?: number; color: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="7"/>
    <path d="M21 21l-4.35-4.35"/>
  </svg>
);
export const IconPerson = ({ size = 20, color }: { size?: number; color: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="7" r="4"/>
    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
  </svg>
);

export function Logo({ size = 36, textSize = 20 }: { size?: number; textSize?: number }) {
  const { theme: T } = useTheme();
  const bookColor = T.name === 'light' || T.name === 'sepia' ? '#2c3e60' : '#c8d8f0';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
        <path d="M24 10 C18 8 8 10 6 14 L6 38 C8 34 18 32 24 34 Z" stroke={bookColor} strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M24 10 C30 8 40 10 42 14 L42 38 C40 34 30 32 24 34 Z" stroke={bookColor} strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M24 10 L24 34" stroke={bookColor} strokeWidth="1.5" strokeDasharray="2 2"/>
        <path d="M28 28 L36 18" stroke={T.teal} strokeWidth="2.5" strokeLinecap="round"/>
        <path d="M30 18 L36 18 L36 24" stroke={T.teal} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M8 41 Q24 37 40 41" stroke={T.teal} strokeWidth="2" fill="none" strokeLinecap="round"/>
      </svg>
      {textSize > 0 && (
        <span style={{ fontFamily: F.sans, fontSize: textSize, color: T.text, lineHeight: 1 }}>
          <span style={{ fontWeight: 300 }}>Monet</span><span style={{ fontWeight: 700 }}>Study</span>
        </span>
      )}
    </div>
  );
}
