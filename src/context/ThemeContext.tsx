'use client';

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { ThemeName } from '@/types';

export const THEMES = {
  dark: {
    name: 'dark' as ThemeName,
    bg: '#080b11', surface: '#0e131f', card: '#121a2e', card2: '#18223c',
    border: 'rgba(79, 209, 197, 0.08)', borderMid: 'rgba(79, 209, 197, 0.18)',
    text: '#f8fafc', textSub: '#cbd5e1', muted: '#64748b', dim: '#101726',
    teal: '#00f2fe', tealDim: 'rgba(0, 242, 254, 0.06)', tealGlow: 'rgba(0, 242, 254, 0.2)',
    violet: '#c084fc', violetDim: 'rgba(192, 132, 252, 0.08)',
    green: '#10b981', greenDim: 'rgba(16, 185, 129, 0.08)',
    amber: '#f59e0b', amberDim: 'rgba(245, 158, 11, 0.08)',
    red: '#ef4444', redDim: 'rgba(239, 68, 68, 0.08)',
    navBg: 'rgba(14, 19, 31, 0.95)', btnText: '#080b11',
  },
  light: {
    name: 'light' as ThemeName,
    bg: '#f3f4f6', surface: '#ffffff', card: '#ffffff', card2: '#f9fafb',
    border: 'rgba(13, 148, 136, 0.08)', borderMid: 'rgba(13, 148, 136, 0.18)',
    text: '#1f2937', textSub: '#4b5563', muted: '#9ca3af', dim: '#e5e7eb',
    teal: '#0d9488', tealDim: 'rgba(13, 148, 136, 0.05)', tealGlow: 'rgba(13, 148, 136, 0.1)',
    violet: '#7c3aed', violetDim: 'rgba(124, 58, 237, 0.05)',
    green: '#166534', greenDim: 'rgba(22, 101, 52, 0.06)',
    amber: '#b45309', amberDim: 'rgba(180, 83, 9, 0.06)',
    red: '#991b1b', redDim: 'rgba(153, 27, 27, 0.06)',
    navBg: 'rgba(255, 255, 255, 0.96)', btnText: '#ffffff',
  },
  midnight: {
    name: 'midnight' as ThemeName,
    bg: '#060211', surface: '#0c0620', card: '#130932', card2: '#190d40',
    border: 'rgba(244, 114, 182, 0.08)', borderMid: 'rgba(244, 114, 182, 0.18)',
    text: '#fae8ff', textSub: '#d8b4fe', muted: '#701a75', dim: '#1a0d33',
    teal: '#f472b6', tealDim: 'rgba(244, 114, 182, 0.06)', tealGlow: 'rgba(244, 114, 182, 0.18)',
    violet: '#38bdf8', violetDim: 'rgba(56, 189, 248, 0.08)',
    green: '#34d399', greenDim: 'rgba(52, 211, 153, 0.08)',
    amber: '#fbbf24', amberDim: 'rgba(251, 191, 36, 0.08)',
    red: '#f43f5e', redDim: 'rgba(244, 63, 94, 0.08)',
    navBg: 'rgba(12, 6, 32, 0.95)', btnText: '#060211',
  },
  sepia: {
    name: 'sepia' as ThemeName,
    bg: '#fcf6e8', surface: '#fbf2db', card: '#fbf2db', card2: '#f7e8c3',
    border: 'rgba(139, 92, 26, 0.08)', borderMid: 'rgba(139, 92, 26, 0.18)',
    text: '#451a03', textSub: '#78350f', muted: '#b45309', dim: '#f2dfb6',
    teal: '#b45309', tealDim: 'rgba(180, 83, 9, 0.06)', tealGlow: 'rgba(180, 83, 9, 0.12)',
    violet: '#701a75', violetDim: 'rgba(112, 26, 117, 0.06)',
    green: '#15803d', greenDim: 'rgba(21, 128, 61, 0.06)',
    amber: '#d97706', amberDim: 'rgba(217, 119, 6, 0.08)',
    red: '#b91c1c', redDim: 'rgba(185, 28, 28, 0.06)',
    navBg: 'rgba(251, 242, 219, 0.96)', btnText: '#ffffff',
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
