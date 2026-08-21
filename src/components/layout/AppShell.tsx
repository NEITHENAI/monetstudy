'use client';
import { useState } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { Logo, IconHome, IconSearch, IconPerson, F } from '@/components/ui/primitives';
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
    { id: 'sepia',    emoji: '☕', label: 'Coffee',   desc: 'Warm latte & parchment' },
    { id: 'light',    emoji: '🥛', label: 'Cream',    desc: 'Clean & bright milk' },
    { id: 'dark',     emoji: '🍫', label: 'Espresso', desc: 'Deep roasted mocha' },
    { id: 'midnight', emoji: '🔮', label: 'Midnight', desc: 'Velvet amethyst tone' },
  ] as const;
  const current = opts.find(o => o.id === T.name) || opts[0];
  return (
    <>
      <button onClick={() => setOpen(true)} style={{
        background: T.card2, border: `1px solid ${T.borderMid}`, borderRadius: 999,
        padding: '7px 14px', color: T.text, fontSize: 13, fontFamily: F.sans,
        display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
        transition: 'all 0.25s', fontWeight: 600,
        boxShadow: '0 2px 8px rgba(44, 24, 16, 0.04)',
      }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)'; }}>
        <span>{current?.emoji}</span>
        <span style={{ fontWeight: 600 }}>{current?.label}</span>
        <span style={{ fontSize: 10, opacity: 0.6 }}>▾</span>
      </button>
      {open && (
        <>
          {/* Backdrop */}
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(28, 16, 10, 0.55)', zIndex: 200, backdropFilter: 'blur(8px)' }} className="animate-fade-in" />
          {/* Modal */}
          <div className="animate-scale-in" style={{
            position: 'fixed', left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
            background: T.card, border: `1.5px solid ${T.borderMid}`, borderRadius: 28,
            zIndex: 201, width: 310, boxShadow: '0 24px 60px rgba(44, 24, 16, 0.25)',
            overflow: 'hidden', padding: 18,
          }}>
            <div style={{ padding: '8px 8px 14px', borderBottom: `1px solid ${T.border}` }}>
              <div style={{ fontSize: 17, fontWeight: 700, color: T.text, fontFamily: F.sans, marginBottom: 2 }}>Visual Theme</div>
              <div style={{ fontSize: 12, color: T.textSub, fontFamily: F.sans }}>Select your preferred study aesthetic</div>
            </div>
            <div style={{ paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {opts.map(o => (
                <button key={o.id} onClick={() => { setThemeName(o.id as ThemeName); setOpen(false); }}
                  style={{
                    width: '100%', padding: '12px 14px',
                    background: T.name === o.id ? (T.name === 'dark' || T.name === 'midnight' ? '#2F231C' : '#FAF3EB') : T.card2,
                    border: `1.5px solid ${T.name === o.id ? T.teal : T.border}`,
                    borderRadius: 18, textAlign: 'left', color: T.text, fontSize: 13,
                    fontFamily: F.sans, cursor: 'pointer', display: 'flex', alignItems: 'center',
                    gap: 12, transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => { if (T.name !== o.id) (e.currentTarget as HTMLButtonElement).style.borderColor = T.borderMid; }}
                  onMouseLeave={e => { if (T.name !== o.id) (e.currentTarget as HTMLButtonElement).style.borderColor = T.border; }}>
                  <span style={{ fontSize: 22 }}>{o.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, color: T.name === o.id ? T.teal : T.text, marginBottom: 1 }}>{o.label}</div>
                    <div style={{ fontSize: 11, color: T.textSub, fontFamily: F.sans }}>{o.desc}</div>
                  </div>
                  {T.name === o.id && <span style={{ color: T.teal, fontSize: 15, fontWeight: 800 }}>✓</span>}
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
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: T.bg, width: '100%', overflowX: 'hidden', position: 'relative' }}>
      {/* Top bar */}
      <header className="glass" style={{
        padding: '12px 24px', borderBottom: `1px solid ${T.border}`,
        background: T.navBg, position: 'sticky', top: 0, zIndex: 40,
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
            <Logo size={34} textSize={18} />

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex" style={{ alignItems: 'center', gap: 6 }}>
              {NAV.map(({ id, Icon, label }) => {
                const active = tab === id;
                return (
                  <button
                    key={id}
                    onClick={() => onTabChange(id)}
                    style={{
                      padding: '8px 16px',
                      background: active ? (T.name === 'dark' || T.name === 'midnight' ? '#FAF5EE' : '#2C1810') : 'transparent',
                      border: 'none',
                      borderRadius: 999,
                      color: active ? (T.name === 'dark' || T.name === 'midnight' ? '#140E0A' : '#FAF5EE') : T.textSub,
                      fontSize: 13,
                      fontFamily: F.sans,
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <Icon size={16} color={active ? (T.name === 'dark' || T.name === 'midnight' ? '#140E0A' : '#FAF5EE') : T.muted} />
                    <span>{label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <a
              href="/upgrade"
              className="hidden sm:flex"
              style={{
                padding: '7px 16px',
                borderRadius: 999,
                background: T.card2,
                border: `1.5px solid ${T.borderMid}`,
                color: T.teal,
                fontSize: 12,
                fontFamily: F.sans,
                fontWeight: 800,
                textDecoration: 'none',
                alignItems: 'center',
                gap: 6,
                boxShadow: '0 2px 8px rgba(44, 24, 16, 0.04)',
              }}
            >
              <span>✦</span> Upgrade
            </a>
            <ThemeSwitcher />
          </div>
        </div>
      </header>

      {/* Page content */}
      <main className="pb-24 md:pb-6" style={{ flex: 1, display: 'flex', flexDirection: 'column', width: '100%' }}>
        {children}
      </main>

      {/* Mobile Floating Bottom Nav Dock (visible on mobile screens) */}
      <div className="md:hidden" style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        padding: '0 16px 14px', background: 'transparent',
        flexShrink: 0, zIndex: 50, pointerEvents: 'none',
      }}>
        <div className="glass shadow-dock" style={{
          background: T.navBg,
          border: `1.5px solid ${T.borderMid}`,
          borderRadius: 999,
          display: 'flex',
          padding: '6px 8px',
          alignItems: 'center',
          justifyContent: 'space-around',
          maxWidth: 420,
          margin: '0 auto',
          pointerEvents: 'auto',
        }}>
          {NAV.map(({ id, Icon, label }) => {
            const active = tab === id;
            return (
              <button
                key={id}
                onClick={() => onTabChange(id)}
                className="active:scale-95 transition-transform"
                style={{
                  flex: 1, padding: '10px 14px',
                  background: active ? (T.name === 'dark' || T.name === 'midnight' ? '#FAF5EE' : '#2C1810') : 'transparent',
                  border: 'none',
                  borderRadius: 999,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  transition: 'all 0.25s cubic-bezier(.22,1,.36,1)', cursor: 'pointer',
                  boxShadow: active ? '0 4px 12px rgba(44, 24, 16, 0.18)' : 'none',
                  minHeight: 44,
                }}>
                <Icon size={19} color={active ? (T.name === 'dark' || T.name === 'midnight' ? '#140E0A' : '#FAF5EE') : T.muted} />
                {active && (
                  <span style={{
                    fontFamily: F.sans, fontSize: 12, fontWeight: 800,
                    color: T.name === 'dark' || T.name === 'midnight' ? '#140E0A' : '#FAF5EE',
                  }}>
                    {label}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
