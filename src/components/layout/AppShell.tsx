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
      <button onClick={() => setOpen(true)} style={{
        background: T.card2, border: `1px solid ${T.border}`, borderRadius: 10,
        padding: '7px 14px', color: T.text, fontSize: 13, fontFamily: F.sans,
        display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
        transition: 'all 0.25s', fontWeight: 500,
      }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = T.borderMid; (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = T.border; (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)'; }}>
        {current?.emoji} {current?.label} ▾
      </button>
      {open && (
        <>
          {/* Backdrop */}
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200, backdropFilter: 'blur(8px)' }} className="animate-fade-in" />
          {/* Modal */}
          <div className="animate-scale-in" style={{
            position: 'fixed', left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
            background: T.card, border: `1px solid ${T.borderMid}`, borderRadius: 22,
            zIndex: 201, width: 300, boxShadow: `0 24px 80px rgba(0,0,0,0.5), 0 0 0 1px ${T.border}`,
            overflow: 'hidden',
          }}>
            <div style={{ padding: '22px 22px 14px', borderBottom: `1px solid ${T.border}` }}>
              <div style={{ fontSize: 17, fontWeight: 700, color: T.text, fontFamily: F.sans, marginBottom: 3 }}>Choose Theme</div>
              <div style={{ fontSize: 12, color: T.textSub, fontFamily: F.sans }}>Applies across the entire app</div>
            </div>
            <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {opts.map(o => (
                <button key={o.id} onClick={() => { setThemeName(o.id as ThemeName); setOpen(false); }}
                  style={{
                    width: '100%', padding: '14px 16px',
                    background: T.name === o.id ? T.tealDim : T.card2,
                    border: `1px solid ${T.name === o.id ? T.teal : T.border}`,
                    borderRadius: 14, textAlign: 'left', color: T.text, fontSize: 14,
                    fontFamily: F.sans, cursor: 'pointer', display: 'flex', alignItems: 'center',
                    gap: 14, transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => { if (T.name !== o.id) { (e.currentTarget as HTMLButtonElement).style.borderColor = T.borderMid; (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'; } }}
                  onMouseLeave={e => { if (T.name !== o.id) { (e.currentTarget as HTMLButtonElement).style.borderColor = T.border; (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)'; } }}>
                  <span style={{ fontSize: 24 }}>{o.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, color: T.name === o.id ? T.teal : T.text, marginBottom: 2 }}>{o.label}</div>
                    <div style={{ fontSize: 11, color: T.textSub, fontFamily: F.sans }}>{o.desc}</div>
                  </div>
                  {T.name === o.id && <span style={{ color: T.teal, fontSize: 16, fontWeight: 700 }}>✓</span>}
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
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: T.bg, maxWidth: 480, margin: '0 auto', overflow: 'hidden', position: 'relative' }}>
      {/* Top bar */}
      <div className="glass" style={{
        padding: '14px 20px', borderBottom: `1px solid ${T.border}`,
        background: T.navBg, display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', flexShrink: 0, zIndex: 10,
      }}>
        <Logo size={30} textSize={17} />
        <ThemeSwitcher />
      </div>

      {/* Page content */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>

      {/* Bottom nav */}
      <div className="glass" style={{
        flexShrink: 0, borderTop: `1px solid ${T.border}`,
        background: T.navBg, display: 'flex', zIndex: 10,
      }}>
        {NAV.map(({ id, Icon, label }) => {
          const active = tab === id;
          return (
            <button key={id} onClick={() => onTabChange(id)} style={{
              flex: 1, padding: '10px 8px 14px', background: 'none', border: 'none',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              borderTop: `2px solid ${active ? T.teal : 'transparent'}`, marginTop: -1,
              transition: 'all 0.25s cubic-bezier(.22,1,.36,1)', cursor: 'pointer',
              position: 'relative',
            }}>
              {active && <div style={{
                position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
                width: 32, height: 2, background: T.teal, borderRadius: 2,
                boxShadow: `0 0 12px ${T.tealGlow}`,
              }} />}
              <Icon size={20} color={active ? T.teal : T.muted} />
              <MonoLabel size={9} color={active ? T.teal : T.muted}>{label}</MonoLabel>
            </button>
          );
        })}
      </div>
    </div>
  );
}
