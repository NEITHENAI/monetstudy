'use client';
import { useState } from 'react';
import { useTheme } from '@/context/ThemeContext';

export const F = {
  sans: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
  display: "'Playfair Display', Georgia, serif",
  mono: "'JetBrains Mono', monospace",
};

export function MonoLabel({ children, color, size = 10 }: { children: React.ReactNode; color?: string; size?: number }) {
  const { theme: T } = useTheme();
  return (
    <span style={{ fontFamily: F.mono, fontSize: size, letterSpacing: '1.5px', textTransform: 'uppercase', color: color ?? T.muted, fontWeight: 600 }}>
      {children}
    </span>
  );
}

export function Tag({ children, color, bg }: { children: React.ReactNode; color?: string; bg?: string }) {
  const { theme: T } = useTheme();
  const c = color ?? T.teal;
  return (
    <span style={{
      fontFamily: F.sans, fontSize: 11, fontWeight: 600,
      color: c, background: bg ?? `${c}16`, padding: '5px 14px', borderRadius: 999,
      display: 'inline-flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap',
      border: `1px solid ${c}24`, letterSpacing: '0.2px',
    }}>
      {children}
    </span>
  );
}

export function ProgressBar({ value, height = 7 }: { value: number; height?: number }) {
  const { theme: T } = useTheme();
  return (
    <div style={{ background: T.dim, borderRadius: 999, overflow: 'hidden', height, position: 'relative' }}>
      <div style={{
        width: `${Math.min(100, Math.max(0, value ?? 0))}%`, height: '100%',
        background: `linear-gradient(90deg, ${T.teal}, ${T.violet})`,
        borderRadius: 999,
        boxShadow: `0 0 10px ${T.tealGlow}`,
        transition: 'width 0.7s cubic-bezier(.4,0,.2,1)',
      }} />
    </div>
  );
}

interface BtnProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'ghost' | 'caramel' | 'outline' | 'danger' | 'violet';
  disabled?: boolean;
  style?: React.CSSProperties;
  type?: 'button' | 'submit';
  size?: 'sm' | 'md' | 'lg';
}

export function Btn({ children, onClick, variant = 'primary', disabled, style: s = {}, type = 'button', size = 'md' }: BtnProps) {
  const { theme: T } = useTheme();

  const paddings = {
    sm: '8px 18px',
    md: '13px 26px',
    lg: '16px 32px',
  };

  const fontSizes = {
    sm: 12,
    md: 14,
    lg: 16,
  };

  const variants: Record<string, React.CSSProperties> = {
    primary: {
      background: T.name === 'dark' || T.name === 'midnight' ? '#FAF5EE' : '#2C1810',
      color: T.name === 'dark' || T.name === 'midnight' ? '#140E0A' : '#FAF5EE',
      border: 'none',
      boxShadow: '0 6px 20px rgba(44, 24, 16, 0.18)',
    },
    caramel: {
      background: `linear-gradient(135deg, ${T.teal}, ${T.violet})`,
      color: '#FFFFFF',
      border: 'none',
      boxShadow: `0 6px 20px ${T.tealGlow}`,
    },
    ghost: {
      background: T.card2,
      color: T.text,
      border: `1px solid ${T.border}`,
    },
    outline: {
      background: 'transparent',
      color: T.text,
      border: `1.5px solid ${T.borderMid}`,
    },
    danger: {
      background: T.redDim,
      color: T.red,
      border: `1px solid ${T.red}28`,
    },
    violet: {
      background: `linear-gradient(135deg, ${T.violet}, #A75D37)`,
      color: '#FFFFFF',
      border: 'none',
      boxShadow: '0 6px 20px rgba(167, 93, 55, 0.25)',
    },
  };

  return (
    <button type={type} onClick={onClick} disabled={disabled}
      style={{
        ...variants[variant],
        padding: paddings[size],
        fontSize: fontSizes[size],
        borderRadius: 999,
        fontWeight: 700,
        transition: 'all 0.25s cubic-bezier(.22,1,.36,1)',
        opacity: disabled ? 0.45 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        fontFamily: F.sans,
        letterSpacing: '0.2px',
        ...s,
      }}
      onMouseEnter={e => { if (!disabled) { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLButtonElement).style.filter = 'brightness(1.06)'; } }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLButtonElement).style.filter = 'brightness(1)'; }}
    >
      {children}
    </button>
  );
}

export function Spinner({ size = 28, color }: { size?: number; color?: string }) {
  const { theme: T } = useTheme();
  const c = color ?? T.teal;
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      border: `2.5px solid ${T.border}`, borderTop: `2.5px solid ${c}`,
      animation: 'spin 0.8s linear infinite',
    }} />
  );
}

// ── SVG Icons ──
export const IconHome = ({ size = 20, color }: { size?: number; color: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 10.5L12 3l9 7.5V20a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V10.5z"/>
    <path d="M9 22V12h6v10"/>
  </svg>
);

export const IconSearch = ({ size = 20, color }: { size?: number; color: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="7"/>
    <path d="M21 21l-4.35-4.35"/>
  </svg>
);

export const IconPerson = ({ size = 20, color }: { size?: number; color: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="7" r="4"/>
    <path d="M4 21c0-4 4-7 8-7s8 3 8 7"/>
  </svg>
);

export const IconBook = ({ size = 20, color }: { size?: number; color: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
  </svg>
);

export const IconHeart = ({ size = 20, color, filled = false }: { size?: number; color: string; filled?: boolean }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? color : "none"} stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
  </svg>
);

export const IconSparkles = ({ size = 20, color }: { size?: number; color: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2l2.4 5.6L20 10l-5.6 2.4L12 18l-2.4-5.6L4 10l5.6-2.4z"/>
  </svg>
);

export const IconFlame = ({ size = 20, color }: { size?: number; color: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 17c1.38 0 2.5-1.12 2.5-2.5 0-1.88-2.5-4-2.5-4s-2.5 2.12-2.5 4z"/>
    <path d="M12 2c3.5 4.5 7 7.5 7 12a7 7 0 1 1-14 0c0-4.5 3.5-7.5 7-12z"/>
  </svg>
);

// ─── MONETSTUDY BRAND LOGO (Vector Book + Rising Arrow Mark) ─────
export function LogoMark({ size = 34, color, arrowColor }: { size?: number; color?: string; arrowColor?: string }) {
  const { theme: T } = useTheme();
  const stroke = color || (T.name === 'dark' || T.name === 'midnight' ? '#FAF5EE' : '#231812');
  const arrow = arrowColor || T.teal || '#C89355';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ flexShrink: 0, display: 'block' }}
    >
      {/* Outer Open Book Outline */}
      <path
        d="M32 50.5C24.5 46.8 15.5 47.2 8.5 50.8V18.8C15.5 15.2 24.5 14.8 32 18.5C39.5 14.8 48.5 15.2 55.5 18.8V50.8C48.5 47.2 39.5 46.8 32 50.5Z"
        stroke={stroke}
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Left Page Inner Line / Contour */}
      <path
        d="M15 25V44C20.5 41.5 26.5 41.5 32 44"
        stroke={stroke}
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Right Page Inner Line / Contour */}
      <path
        d="M49 25V44C43.5 41.5 37.5 41.5 32 44"
        stroke={stroke}
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Central Rising Growth Arrow emerging from book */}
      <path
        d="M32 46C32 37 36 28 44 20"
        stroke={arrow}
        strokeWidth="3.4"
        strokeLinecap="round"
      />
      {/* Arrowhead */}
      <path
        d="M37 19H45V27"
        stroke={arrow}
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Logo({ size = 34, textSize = 19 }: { size?: number; textSize?: number; imgUrl?: string }) {
  const { theme: T } = useTheme();

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none' }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
        filter: T.name === 'dark' || T.name === 'midnight' ? 'drop-shadow(0 2px 8px rgba(250,245,238,0.12))' : 'none',
      }}>
        <LogoMark size={size} />
      </div>
      {textSize > 0 && (
        <span style={{
          fontFamily: F.sans,
          fontSize: textSize,
          color: T.text,
          lineHeight: 1,
          letterSpacing: '-0.4px',
          display: 'flex',
          alignItems: 'baseline',
        }}>
          <span style={{ fontWeight: 400, opacity: 0.9 }}>Monet</span>
          <span style={{ fontWeight: 850, color: T.text }}>Study</span>
        </span>
      )}
    </div>
  );
}
