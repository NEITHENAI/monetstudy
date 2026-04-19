'use client';
import { useState } from 'react';
import { useTheme, THEMES } from '@/context/ThemeContext';
import { Logo, IconHome, IconSearch, IconPerson, MonoLabel, F } from '@/components/ui/primitives';
import type { ThemeName } from '@/types';

const NAV = [
  { id: 'home',    Icon: IconHome,   label: 'Home'    },
  { id: 'explore', Icon: IconSearch, label: 'Explore' },
  { id: 'profile', Icon: IconPerson, label: 'Profile' },
] as const;

function ThemeSwitcher() {
  const { theme: T, setThemeName } = useTheme();
  const [open, setOpen] = useState(false);
  const opts = [
    { id: 'dark',     emoji: '🌑', label: 'Dark',     desc: 'Easy on the eyes'   },
    { id: 'light',    emoji: '☀️',  label: 'Light',    desc: 'Clean and bright'   },
    { id: 'midnight', emoji: '🔮', label: 'Midnight', desc: 'Deep purple night'   },
    { id: 'sepia',    emoji: '📜', label: 'Sepia',    desc: 'Warm parchment tone' },
  ] as const;
  const current = opts.find(o => o.id === T.name);
  return (
    <>
      <button onClick={() => setOpen(true)} style={{ background: T.card2, border: `1px solid ${T.border}`, borderRadius: 8, padding: '7px 12px', color: T.text, fontSize: 13, fontFamily: F.sans, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', transition: 'all 0.2s' }}
        onMouseEnter={e => (e.currentTarget.style.borderColor = T.borderMid)}
        onMouseLeave={e => (e.currentTarget.style.borderColor = T.border)}>
        {current?.emoji} {current?.label} ▾
      </button>
      {open && (
        <>
          {/* Backdrop */}
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, backdropFilter: 'blur(4px)' }} />
          {/* Modal */}
          <div style={{ position: 'fixed', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', background: T.card, border: `1px solid ${T.borderMid}`, borderRadius: 20, zIndex: 201, width: 300, boxShadow: '0 24px 64px rgba(0,0,0,0.4)', overflow: 'hidden' }}>
            <div style={{ padding: '20px 20px 14px', borderBottom: `1px solid ${T.border}` }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: T.text, fontFamily: F.sans, marginBottom: 2 }}>Choose Theme</div>
              <div style={{ fontSize: 12, color: T.textSub, fontFamily: F.sans }}>Applies across the entire app</div>
            </div>
            <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {opts.map(o => (
                <button key={o.id} onClick={() => { setThemeName(o.id as ThemeName); setOpen(false); }}
                  style={{ width: '100%', padding: '14px 16px', background: T.name === o.id ? T.tealDim : T.card2, border: `1px solid ${T.name === o.id ? T.teal : T.border}`, borderRadius: 12, textAlign: 'left', color: T.text, fontSize: 14, fontFamily: F.sans, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14, transition: 'all 0.15s' }}
                  onMouseEnter={e => { if (T.name !== o.id) (e.currentTarget as HTMLButtonElement).style.borderColor = T.borderMid; }}
                  onMouseLeave={e => { if (T.name !== o.id) (e.currentTarget as HTMLButtonElement).style.borderColor = T.border; }}>
                  <span style={{ fontSize: 24 }}>{o.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, color: T.name === o.id ? T.teal : T.text, marginBottom: 2 }}>{o.label}</div>
                    <div style={{ fontSize: 11, color: T.textSub, fontFamily: F.sans }}>{o.desc}</div>
                  </div>
                  {T.name === o.id && <span style={{ color: T.teal, fontSize: 16 }}>✓</span>}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  );
}

interface AppShellProps {
  children: React.ReactNode;
  tab: string;
  onTabChange: (t: string) => void;
}

export function AppShell({ children, tab, onTabChange }: AppShellProps) {
  const { theme: T } = useTheme();
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: T.bg, maxWidth: 480, margin: '0 auto', overflow: 'hidden' }}>
      {/* Top bar */}
      <div style={{ padding: '13px 20px', borderBottom: `1px solid ${T.border}`, background: T.navBg, backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <Logo size={30} textSize={17} />
        <ThemeSwitcher />
      </div>

      {/* Page content */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>

      {/* Bottom nav */}
      <div style={{ flexShrink: 0, borderTop: `1px solid ${T.border}`, background: T.navBg, backdropFilter: 'blur(8px)', display: 'flex' }}>
        {NAV.map(({ id, Icon, label }) => {
          const active = tab === id;
          return (
            <button key={id} onClick={() => onTabChange(id)} style={{ flex: 1, padding: '10px 8px 13px', background: 'none', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, borderTop: `2px solid ${active ? T.teal : 'transparent'}`, marginTop: -1, transition: 'all 0.2s', cursor: 'pointer' }}>
              <Icon size={20} color={active ? T.teal : T.muted} />
              <MonoLabel size={9} color={active ? T.teal : T.muted}>{label}</MonoLabel>
            </button>
          );
        })}
      </div>
    </div>
  );
}
