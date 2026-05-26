import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#080b11',
};

export const metadata: Metadata = {
  title: 'MonetStudy — Personalised Learning Platform',
  description: 'Upload your study material and get an AI-generated personalised course with quizzes, assessments, and mock exams.',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'MonetStudy',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "'Inter', system-ui, sans-serif", margin: 0, overscrollBehavior: 'none' }}>
        <AuthProvider>
          <ThemeProvider>
            {children}
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
