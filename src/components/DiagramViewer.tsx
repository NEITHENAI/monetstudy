'use client';

import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { useTheme } from '@/context/ThemeContext';
import { F } from '@/components/ui/primitives';

let mermaidInitialized = false;

function initMermaid(isDark: boolean) {
  try {
    mermaid.initialize({
      startOnLoad: false,
      suppressErrorRendering: true,
      theme: isDark ? 'dark' : 'neutral',
      securityLevel: 'loose',
      fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
      themeVariables: isDark
        ? {
            darkMode: true,
            background: '#1A120D',
            primaryColor: '#2C1B13',
            primaryTextColor: '#FAF5EE',
            primaryBorderColor: '#C27847',
            lineColor: '#C27847',
            secondaryColor: '#22150E',
            tertiaryColor: '#170E0A',
            edgeLabelBackground: '#2C1810',
            nodeTextColor: '#FAF5EE',
          }
        : {
            darkMode: false,
            background: '#FAF5EE',
            primaryColor: '#F5EBE1',
            primaryTextColor: '#2C1810',
            primaryBorderColor: '#8C5338',
            lineColor: '#8C5338',
            secondaryColor: '#EFE2D4',
            tertiaryColor: '#E6D3C1',
            edgeLabelBackground: '#FAF5EE',
            nodeTextColor: '#2C1810',
          },
    });
    mermaidInitialized = true;
  } catch (e) {
    console.error('Failed to init mermaid:', e);
  }
}

function formatMermaidCode(raw: string): string {
  let clean = (raw || '').trim().replace(/^```(?:mermaid)?\s*/i, '').replace(/```$/, '').trim();
  clean = clean.replace(/^mermaid\s+/i, '').trim();

  // 1. Filter out markdown commentary lines (e.g. "**Observe:**...", "# Title", "Note:")
  const lines = clean.split('\n');
  const sanitizedLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    // Stop diagram as soon as markdown commentary or observation text starts
    if (/^(\*{1,2}|#{1,6}|Observe:|Note:|Explanation:|Figure:|Diagram:|This diagram)/i.test(trimmed)) {
      break;
    }
    
    // Automatically quote unquoted node labels containing & or special characters: [Young & herbaceous plants] -> ["Young and herbaceous plants"]
    let processedLine = line.replace(/\[([^"\]\n]+)\]/g, (_, inner) => {
      const safe = inner.replace(/&/g, 'and').trim();
      return `["${safe}"]`;
    });

    sanitizedLines.push(processedLine);
  }

  clean = sanitizedLines.join('\n').trim();

  // 2. If statements were crammed into a single line, split into valid lines
  if (!clean.includes('\n') && (clean.includes('-->') || clean.includes('---'))) {
    clean = clean.replace(/^(graph\s+(?:TD|TB|BT|RL|LR)|flowchart\s+(?:TD|TB|BT|RL|LR)|sequenceDiagram|stateDiagram(?:-v2)?|classDiagram|erDiagram|mindmap|quadrantChart)\s+/i, '$1\n    ');
    clean = clean.replace(/\s+([A-Za-z0-9_]+\s*(?:\[|\{|\(|\>|--\>|-->|==>|-.->|\|))/g, '\n    $1');
  }

  return clean;
}

// ─── 1. MERMAID DIAGRAM COMPONENT ──────────────────────────────────
export function MermaidDiagram({ chart }: { chart: string }) {
  const { theme: T } = useTheme();
  const [svgHtml, setSvgHtml] = useState<string>('');
  const [error, setError] = useState<boolean>(false);
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const isDark = T.name === 'dark' || T.name === 'midnight';
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;
    initMermaid(isDark);

    const renderChart = async () => {
      if (!chart || !chart.trim()) return;
      try {
        setError(false);
        const cleanChart = formatMermaidCode(chart);

        // Pre-validate diagram syntax before attempting to render
        const isValid = await mermaid.parse(cleanChart, { suppressErrors: true }).catch(() => false);
        if (!isValid) {
          if (isMounted) setError(true);
          return;
        }

        const id = `mermaid-${Math.random().toString(36).substring(2, 9)}`;
        const { svg } = await mermaid.render(id, cleanChart);
        if (isMounted) {
          setSvgHtml(svg);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(true);
        }
      }
    };

    renderChart();
    return () => { isMounted = false; };
  }, [chart, isDark]);

  const handleCopy = () => {
    navigator.clipboard.writeText(chart);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      style={{
        margin: '28px 0',
        background: T.card,
        border: `1.5px solid ${T.borderMid}`,
        borderRadius: 24,
        overflow: 'hidden',
        boxShadow: '0 8px 30px rgba(44, 24, 16, 0.05)',
      }}
    >
      {/* Header bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 16px',
          background: T.card2,
          borderBottom: `1px solid ${T.border}`,
          fontSize: 12,
          fontFamily: F.sans,
          fontWeight: 700,
          color: T.textSub,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: T.teal }}>✦</span>
          <span>Interactive Diagram</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={handleCopy}
            style={{
              background: 'transparent',
              border: `1px solid ${T.border}`,
              borderRadius: 999,
              padding: '4px 10px',
              fontSize: 11,
              fontFamily: F.sans,
              fontWeight: 700,
              color: T.textSub,
              cursor: 'pointer',
            }}
          >
            {copied ? '✓ Copied' : 'Copy Code'}
          </button>
          <button
            onClick={() => setExpanded(!expanded)}
            style={{
              background: 'transparent',
              border: `1px solid ${T.border}`,
              borderRadius: 999,
              padding: '4px 10px',
              fontSize: 11,
              fontFamily: F.sans,
              fontWeight: 700,
              color: T.textSub,
              cursor: 'pointer',
            }}
          >
            {expanded ? 'Collapse ⤡' : 'Zoom ⤢'}
          </button>
        </div>
      </div>

      {/* Body */}
      <div
        ref={containerRef}
        style={{
          padding: expanded ? '36px 20px' : '24px 16px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          overflowX: 'auto',
          minHeight: 140,
        }}
      >
        {error ? (
          <div style={{ textAlign: 'center', padding: '16px', color: T.textSub, width: '100%' }}>
            <div style={{ fontSize: 13, color: T.amber, fontWeight: 700, marginBottom: 8 }}>
              ⚠ Diagram Preview (Syntax Fallback)
            </div>
            <pre style={{
              background: T.card2,
              padding: '12px 16px',
              borderRadius: 12,
              fontSize: 12,
              fontFamily: F.mono,
              textAlign: 'left',
              overflowX: 'auto',
              color: T.text,
              margin: 0,
            }}>
              {chart}
            </pre>
          </div>
        ) : svgHtml ? (
          <div
            className="mermaid-wrapper"
            style={{
              width: '100%',
              display: 'flex',
              justifyContent: 'center',
              transform: expanded ? 'scale(1.15)' : 'none',
              transition: 'transform 0.3s ease',
            }}
            dangerouslySetInnerHTML={{ __html: svgHtml }}
          />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: T.textSub, fontSize: 13, fontFamily: F.sans }}>
            <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${T.border}`, borderTopColor: T.teal, animation: 'spin 1s linear infinite' }} />
            Rendering diagram...
          </div>
        )}
      </div>
    </div>
  );
}

// ─── 2. INLINE SVG ILLUSTRATION COMPONENT ───────────────────────────
export function SvgIllustration({ svgCode, alt }: { svgCode: string; alt?: string }) {
  const { theme: T } = useTheme();
  const [cleanedSvg, setCleanedSvg] = useState('');
  const [isZoomed, setIsZoomed] = useState(false);

  useEffect(() => {
    let code = (svgCode || '').trim();
    // Strip markdown wrappers or leading label
    code = code.replace(/^```(?:svg|xml|html)?\s*/i, '').replace(/```$/, '').trim();
    code = code.replace(/^svg\s+/i, '').trim();

    // Extract actual SVG tag if surrounded by text
    const match = /(<svg[\s\S]*?<\/svg>)/i.exec(code);
    if (match) {
      code = match[1];
    } else if (code.includes('<svg')) {
      // Auto-close if truncated
      code = code.substring(code.indexOf('<svg')) + '</svg>';
    }

    // Ensure responsive attributes
    if (code.includes('<svg') && !code.includes('viewBox')) {
      code = code.replace(/<svg\s*/i, '<svg viewBox="0 0 800 450" ');
    }
    // Inject responsive width & height styling
    code = code.replace(/<svg\s+/i, '<svg style="width:100%;height:auto;max-height:520px;display:block;margin:0 auto;" ');

    setCleanedSvg(code);
  }, [svgCode]);

  return (
    <div
      style={{
        margin: '28px 0',
        background: T.card,
        border: `1.5px solid ${T.borderMid}`,
        borderRadius: 24,
        overflow: 'hidden',
        boxShadow: '0 8px 30px rgba(44, 24, 16, 0.05)',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 16px',
          background: T.card2,
          borderBottom: `1px solid ${T.border}`,
          fontSize: 12,
          fontFamily: F.sans,
          fontWeight: 700,
          color: T.textSub,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: T.teal }}>🎨</span>
          <span>Vector Illustration</span>
        </div>
        <button
          onClick={() => setIsZoomed(!isZoomed)}
          style={{
            background: 'transparent',
            border: `1px solid ${T.border}`,
            borderRadius: 999,
            padding: '4px 10px',
            fontSize: 11,
            fontFamily: F.sans,
            fontWeight: 700,
            color: T.textSub,
            cursor: 'pointer',
          }}
        >
          {isZoomed ? 'Reset View' : 'Zoom ⤢'}
        </button>
      </div>

      {/* SVG Container */}
      <div
        style={{
          padding: isZoomed ? '32px 16px' : '20px 16px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          background: T.name === 'dark' || T.name === 'midnight' ? '#140E0A' : '#FAF5EE',
          transform: isZoomed ? 'scale(1.2)' : 'none',
          transition: 'transform 0.3s ease',
          overflow: 'hidden',
        }}
        dangerouslySetInnerHTML={{ __html: cleanedSvg }}
      />

      {alt && (
        <div
          style={{
            padding: '10px 16px',
            background: T.card2,
            borderTop: `1px solid ${T.border}`,
            fontSize: 12,
            color: T.textSub,
            fontFamily: F.sans,
            fontStyle: 'italic',
            textAlign: 'center',
          }}
        >
          {alt}
        </div>
      )}
    </div>
  );
}
