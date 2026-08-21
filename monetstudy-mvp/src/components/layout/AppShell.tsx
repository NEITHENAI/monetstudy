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
    { id: 'dark',     emoji: '🌑', label: 'Dark'     },
    { id: 'light',    emoji: '☀️',  label: 'Light'    },
    { id: 'midnight', emoji: '🔮', label: 'Midnight' },
    { id: 'sepia',    emoji: '📜', label: 'Sepia'    },
  ] as const;
  const current = opts.find(o => o.id === T.name);
  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)} style={{ background: T.card2, border: `1px solid ${T.border}`, borderRadius: 8, padding: '7px 12px', color: T.text, fontSize: 13, fontFamily: F.sans, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
        {current?.emoji} {current?.label} ▾
      </button>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, zIndex: 100, minWidth: 140, boxShadow: '0 8px 32px rgba(0,0,0,0.3)', overflow: 'hidden' }}>
          {opts.map(o => (
            <button key={o.id} onClick={() => { setThemeName(o.id as ThemeName); setOpen(false); }} style={{ width: '100%', padding: '11px 16px', background: T.name === o.id ? T.tealDim : 'transparent', border: 'none', borderBottom: `1px solid ${T.border}`, textAlign: 'left', color: T.name === o.id ? T.teal : T.text, fontSize: 13, fontFamily: F.sans, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}>
              {o.emoji} {o.label} {T.name === o.id && '✓'}
            </button>
          ))}
        </div>
      )}
    </div>
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
