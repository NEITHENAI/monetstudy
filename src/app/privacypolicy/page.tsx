'use client';
import { useEffect, useState } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { F } from '@/components/ui/primitives';
import { useRouter } from 'next/navigation';
import { Footer } from '@/components/layout/Footer';

export default function PrivacyPolicyPage() {
  const { theme: T } = useTheme();
  const router = useRouter();
  const [htmlContent, setHtmlContent] = useState('<p>Loading privacy policy...</p>');

  useEffect(() => {
    // Fetch the static HTML file from the public folder
    fetch('/privacy.html')
      .then((res) => {
        if (!res.ok) throw new Error('File not found');
        return res.text();
      })
      .then((html) => setHtmlContent(html))
      .catch(() => setHtmlContent('<p>Privacy policy file not found. Please upload it to <code>public/privacy.html</code></p>'));
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '16px 20px', borderBottom: `1px solid ${T.border}`, background: T.navBg, display: 'flex', alignItems: 'center' }}>
        <button onClick={() => router.back()} style={{ background: T.card2, border: `1px solid ${T.border}`, color: T.text, width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>←</button>
        <div style={{ marginLeft: 16, fontSize: 16, fontWeight: 600, color: T.text, fontFamily: F.sans }}>Privacy Policy</div>
      </div>

      <div style={{ flex: 1, padding: '40px 20px', maxWidth: 800, margin: '0 auto', width: '100%' }}>
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: '32px', color: T.text, fontFamily: F.sans, lineHeight: 1.8 }}>
          
          <div 
            style={{ color: T.textSub, fontSize: 15 }}
            dangerouslySetInnerHTML={{ __html: htmlContent }} 
          />

        </div>
      </div>
      
      <Footer />
    </div>
  );
}
