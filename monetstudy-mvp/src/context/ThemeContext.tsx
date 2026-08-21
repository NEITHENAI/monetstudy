'use client';

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { ThemeName } from '@/types';

export const THEMES = {
  dark: {
    name: 'dark' as ThemeName,
    bg: '#050810', surface: '#090d1a', card: '#0e1225', card2: '#111528',
    border: 'rgba(79,209,197,0.1)', borderMid: 'rgba(79,209,197,0.22)',
    text: '#e2e8f0', textSub: '#94a3b8', muted: '#4a5568', dim: '#1a2035',
    teal: '#4fd1c5', tealDim: 'rgba(79,209,197,0.08)', tealGlow: 'rgba(79,209,197,0.18)',
    violet: '#8b6cf7', violetDim: 'rgba(139,108,247,0.1)',
    green: '#34d399', greenDim: 'rgba(52,211,153,0.1)',
    amber: '#fbbf24', amberDim: 'rgba(251,191,36,0.1)',
    red: '#f87171', redDim: 'rgba(248,113,113,0.1)',
    navBg: 'rgba(9,13,26,0.97)', btnText: '#050810',
  },
  light: {
    name: 'light' as ThemeName,
    bg: '#f0f4f8', surface: '#ffffff', card: '#ffffff', card2: '#f7fafc',
    border: 'rgba(44,82,130,0.12)', borderMid: 'rgba(44,82,130,0.25)',
    text: '#1a2035', textSub: '#4a5568', muted: '#a0aec0', dim: '#e2e8f0',
    teal: '#2b9e96', tealDim: 'rgba(43,158,150,0.08)', tealGlow: 'rgba(43,158,150,0.15)',
    violet: '#6b46c1', violetDim: 'rgba(107,70,193,0.08)',
    green: '#276749', greenDim: 'rgba(39,103,73,0.08)',
    amber: '#b7791f', amberDim: 'rgba(183,121,31,0.08)',
    red: '#c53030', redDim: 'rgba(197,48,48,0.08)',
    navBg: 'rgba(255,255,255,0.97)', btnText: '#ffffff',
  },
  midnight: {
    name: 'midnight' as ThemeName,
    bg: '#0a0010', surface: '#100018', card: '#140020', card2: '#1a0028',
    border: 'rgba(167,139,250,0.12)', borderMid: 'rgba(167,139,250,0.25)',
    text: '#ede9fe', textSub: '#a78bfa', muted: '#4c3880', dim: '#1e0838',
    teal: '#a78bfa', tealDim: 'rgba(167,139,250,0.08)', tealGlow: 'rgba(167,139,250,0.2)',
    violet: '#f472b6', violetDim: 'rgba(244,114,182,0.1)',
    green: '#6ee7b7', greenDim: 'rgba(110,231,183,0.1)',
    amber: '#fde68a', amberDim: 'rgba(253,230,138,0.1)',
    red: '#fb7185', redDim: 'rgba(251,113,133,0.1)',
    navBg: 'rgba(16,0,24,0.97)', btnText: '#0a0010',
  },
  sepia: {
    name: 'sepia' as ThemeName,
    bg: '#fdf6e3', surface: '#fef9ed', card: '#fef9ed', card2: '#fdf3d0',
    border: 'rgba(120,80,20,0.12)', borderMid: 'rgba(120,80,20,0.22)',
    text: '#3b2a14', textSub: '#6b4c1e', muted: '#b8934a', dim: '#eddcaa',
    teal: '#c05621', tealDim: 'rgba(192,86,33,0.07)', tealGlow: 'rgba(192,86,33,0.14)',
    violet: '#702459', violetDim: 'rgba(112,36,89,0.08)',
    green: '#276749', greenDim: 'rgba(39,103,73,0.08)',
    amber: '#975a16', amberDim: 'rgba(151,90,22,0.1)',
    red: '#9b2c2c', redDim: 'rgba(155,44,44,0.08)',
    navBg: 'rgba(254,249,237,0.97)', btnText: '#ffffff',
  },
};

export type Theme = typeof THEMES.dark;

const ThemeContext = createContext<{ theme: Theme; setThemeName: (n: ThemeName) => void }>({
  theme: THEMES.dark,
  setThemeName: () => {},
});

export function ThemeProvider({ children, initial = 'dark' }: { children: ReactNode; initial?: ThemeName }) {
  const [name, setName] = useState<ThemeName>(initial);

  useEffect(() => {
    const saved = localStorage.getItem('ms_theme') as ThemeName;
    if (saved && THEMES[saved]) setName(saved);
  }, []);

  const setThemeName = (n: ThemeName) => {
    setName(n);
    localStorage.setItem('ms_theme', n);
  };

  return (
    <ThemeContext.Provider value={{ theme: THEMES[name], setThemeName }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
