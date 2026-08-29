'use client';

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { ThemeName } from '@/types';

export const THEMES = {
  dark: {
    name: 'dark' as ThemeName,
    bg: '#140E0A', surface: '#1C140F', card: '#241B15', card2: '#2F231C',
    border: 'rgba(216, 164, 127, 0.12)', borderMid: 'rgba(216, 164, 127, 0.25)',
    text: '#FAF5EE', textSub: '#D6C5B3', muted: '#9A8272', dim: '#1E1610',
    teal: '#D8A47F', tealDim: 'rgba(216, 164, 127, 0.12)', tealGlow: 'rgba(216, 164, 127, 0.25)',
    violet: '#E8BC96', violetDim: 'rgba(232, 188, 150, 0.12)',
    green: '#4ADE80', greenDim: 'rgba(74, 222, 128, 0.12)',
    amber: '#FBBF24', amberDim: 'rgba(251, 191, 36, 0.12)',
    red: '#F87171', redDim: 'rgba(248, 113, 113, 0.12)',
    navBg: 'rgba(20, 14, 10, 0.94)', btnText: '#140E0A',
    pill: '#FAF5EE', pillText: '#140E0A',
  },
  light: {
    name: 'light' as ThemeName,
    bg: '#FBF9F5', surface: '#FFFFFF', card: '#FFFFFF', card2: '#F4ECE1',
    border: 'rgba(61, 35, 20, 0.08)', borderMid: 'rgba(61, 35, 20, 0.18)',
    text: '#2C1810', textSub: '#634735', muted: '#997E6D', dim: '#EDE4D8',
    teal: '#8C5338', tealDim: 'rgba(140, 83, 56, 0.08)', tealGlow: 'rgba(140, 83, 56, 0.15)',
    violet: '#B07A48', violetDim: 'rgba(176, 122, 72, 0.08)',
    green: '#2E7D32', greenDim: 'rgba(46, 125, 50, 0.08)',
    amber: '#D97706', amberDim: 'rgba(217, 119, 6, 0.08)',
    red: '#C62828', redDim: 'rgba(198, 40, 40, 0.08)',
    navBg: 'rgba(251, 249, 245, 0.95)', btnText: '#FFFFFF',
    pill: '#2C1810', pillText: '#FFFFFF',
  },
  midnight: {
    name: 'midnight' as ThemeName,
    bg: '#0B0813', surface: '#130E20', card: '#1A142D', card2: '#241C3D',
    border: 'rgba(216, 180, 254, 0.12)', borderMid: 'rgba(216, 180, 254, 0.25)',
    text: '#FAF5FF', textSub: '#D8B4FE', muted: '#8E73A6', dim: '#161026',
    teal: '#C084FC', tealDim: 'rgba(192, 132, 252, 0.12)', tealGlow: 'rgba(192, 132, 252, 0.25)',
    violet: '#F472B6', violetDim: 'rgba(244, 114, 182, 0.12)',
    green: '#34D399', greenDim: 'rgba(52, 211, 153, 0.12)',
    amber: '#FBBF24', amberDim: 'rgba(251, 191, 36, 0.12)',
    red: '#FB7185', redDim: 'rgba(251, 113, 133, 0.12)',
    navBg: 'rgba(11, 8, 19, 0.94)', btnText: '#0B0813',
    pill: '#FAF5FF', pillText: '#0B0813',
  },
  sepia: {
    name: 'sepia' as ThemeName,
    bg: '#F5EBE1', surface: '#FAF3EB', card: '#FFFFFF', card2: '#EFE1D2',
    border: 'rgba(92, 53, 30, 0.10)', borderMid: 'rgba(92, 53, 30, 0.22)',
    text: '#382013', textSub: '#6E4830', muted: '#A27B5C', dim: '#E7D5C2',
    teal: '#8C5338', tealDim: 'rgba(140, 83, 56, 0.10)', tealGlow: 'rgba(140, 83, 56, 0.18)',
    violet: '#A75D37', violetDim: 'rgba(167, 93, 55, 0.10)',
    green: '#3F6212', greenDim: 'rgba(63, 98, 18, 0.08)',
    amber: '#B45309', amberDim: 'rgba(180, 83, 9, 0.08)',
    red: '#991B1B', redDim: 'rgba(153, 27, 27, 0.08)',
    navBg: 'rgba(245, 235, 225, 0.95)', btnText: '#FFFFFF',
    pill: '#382013', pillText: '#FAF3EB',
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
