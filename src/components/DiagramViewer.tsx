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

  // 0. Normalize node IDs with slashes (e.g. S/R -> S_R) outside of quotes/brackets
  //    Mermaid grammar forbids '/' in unquoted identifiers, and word boundaries (\b)
  //    would otherwise split "S/R" into "S/" and "R -->", breaking the diagram.
  clean = clean.replace(/\b([A-Za-z0-9_]+)\/([A-Za-z0-9_]+)\b(?=\s*(?:\[|\(|\{|\>|-->|--\>|==>))/g, '$1_$2');

  // 1. Separate graph header from following nodes — do this FIRST so statement-splitting
  //    below doesn't have to special-case the header line.
  clean = clean.replace(/^(graph\s+(?:TD|TB|BT|RL|LR)|flowchart\s+(?:TD|TB|BT|RL|LR)|sequenceDiagram|stateDiagram(?:-v2)?|classDiagram|erDiagram|mindmap|quadrantChart)\s+/i, '$1\n    ');

  // 2. Split independent statements crammed onto a single line, e.g. DeepSeek emitting
  //    `A["X"] --> C["Y"] B["Z"] --> C D["W"] --> C` all on one line with no newlines.
  //    A new statement starts at `<id>(optional [..]/(..)/{..}) -->`, UNLESS it's immediately
  //    preceded (ignoring only whitespace) by an arrow — optionally with an edge label like
  //    `|Yes|` — since that's a legitimate chain continuation (`A --> B --> C`) and must stay
  //    on one line. This has to run BEFORE rule 5 below: previously rule 5 (originally rule 1)
  //    ran first and, seeing two adjacent bracket-closed tokens with no arrow between them
  //    (which is what every crammed-statement boundary looks like), inserted a FABRICATED
  //    arrow connecting two nodes that were never meant to be connected — producing a diagram
  //    that was both malformed AND semantically wrong.
  clean = clean.replace(
    /(?<!(?:-->|--\>|==>|-\.->)(?:\|[^|]*\|)?\s{0,30})\b([A-Za-z0-9_]+)((?:\[[^\]]*\]|\([^)]*\)|\{[^}]*\})?)\s*-->/g,
    (match, id, label) => `\n    ${id}${label} -->`
  );

  // 3. Separate 'style <Node> ...' onto its own line
  clean = clean.replace(/\s+(style\s+[A-Za-z0-9_]+\s+[^style\n]+)/g, '\n    $1');

  // 4. Repair broken newlines inside brackets [ ... \n ... ]
  clean = clean.replace(/\[([^\]]*?)\n+([^\]]*?)\]/g, '[$1 $2]');

  // 5. If two adjacent nodes are STILL on the same LINE with NO arrow between them, it's now a
  //    genuinely missing arrow (not a crammed-statement boundary — those were split in step 2)
  //    — safe to connect them: "A[...] B[...]" -> "A[...] --> B[...]"
  //    IMPORTANT: uses [ \t] (not \s) deliberately — \s also matches the newline step 2 just
  //    inserted between separated statements, which would silently re-fuse them with a
  //    fabricated arrow, undoing the split entirely.
  clean = clean.replace(/(\]|"|\)|})[ \t]+([A-Za-z0-9_]+)[ \t]*(\[|\(|\{)/g, '$1 --> $2$3');

  // 6. Catch anything rules 2/5 still missed — same adjacency pattern, broader trailing match.
  //    Same [ \t]-only reasoning as rule 5 — this one only inserts a newline (not an arrow) so
  //    reaching across an existing newline would be harmless, but keep it same-line for clarity.
  clean = clean.replace(/(\]|"|\)|})[ \t]+([A-Za-z0-9_]+(?:[ \t]*(?:\[|\(|\{|\>|-->|--\>|==>|-\.->|--|~~~)))/g, '$1\n    $2');

  const lines = clean.split('\n');
  const sanitizedLines: string[] = [];
  let prevSourceNode = 'A';
  let prevTargetNode = 'B';

  for (const line of lines) {
    let trimmed = line.trim();
    if (!trimmed) continue;

    // Stop diagram as soon as markdown commentary or observation text starts
    if (/^(\*{1,2}|#{1,6}|Observe:|Note:|Observation|Explanation:|Figure:|Diagram:|This diagram)/i.test(trimmed)) {
      break;
    }

    // If line starts with an orphan arrow (e.g. "-->|Yes| C[...]"):
    if (/^(?:-->|--\>|==>|-\.->)\s*/.test(trimmed)) {
      trimmed = `${prevTargetNode || prevSourceNode} ${trimmed}`;
    }

    // Extract node IDs from line: e.g. "A[...] --> B[...]" or "C -->|...| D[...]"
    const sourceMatch = trimmed.match(/^([A-Za-z0-9_]+)\s*(?:\[|\(|\{|\>|-->|--\>)/);
    if (sourceMatch) prevSourceNode = sourceMatch[1];

    const targetMatch = trimmed.match(/(?:-->|--\>|==>|-\.->)\s*(?:\|[^|]+\|\s*)?([A-Za-z0-9_]+)/);
    if (targetMatch) prevTargetNode = targetMatch[1];

    // A. Sanitize Edge Labels |...|:
    trimmed = trimmed.replace(/(\|)([^|\n]+?)(\|)/g, (_, open, inner, close) => {
      let safeInner = inner
        .replace(/<br\s*\/?>/gi, ' / ')
        .replace(/["']/g, '')
        .replace(/&/g, 'and')
        .replace(/≥/g, '>=')
        .replace(/≤/g, '<=')
        .trim();
      return `|"${safeInner}"|`;
    });

    // B. Sanitize Node Labels [ ... ]:
    trimmed = trimmed.replace(/\[\s*(?:"|')?([^\]]*?)(?:"|')?\s*\]/g, (_, inner) => {
      let safeInner = inner
        .replace(/"/g, "'")
        .replace(/&(?!(?:amp|lt|gt);)/g, 'and')
        .trim();
      return `["${safeInner}"]`;
    });

    sanitizedLines.push(`    ${trimmed}`);
  }

  clean = sanitizedLines.join('\n').trim();

  if (!/^(graph|flowchart|sequenceDiagram|stateDiagram|classDiagram|erDiagram|mindmap|quadrantChart)/i.test(clean)) {
    clean = `graph TD\n    ${clean}`;
  }

  return clean;
}

// ─── HELPER: STANDALONE VECTOR SVG FLOWCHART GENERATOR ─────────────
function generateFallbackSvgFlowchart(chart: string, isDark: boolean): string {
  const lines = chart.split('\n');
  const nodeMap = new Map<string, string>();
  const edgeList: Array<{ from: string; to: string; label: string }> = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || /^(graph|flowchart|style|subgraph|end)/i.test(trimmed)) continue;

    // Match node definitions: A["Label"] or A[Label]
    const nodeRegex = /([A-Za-z0-9_]+)\s*(?:\[|\(|\{)\s*(?:"|')?([^\]\)\}]+?)(?:"|')?\s*(?:\]|\)|\})/g;
    let m;
    while ((m = nodeRegex.exec(trimmed)) !== null) {
      if (!nodeMap.has(m[1])) {
        nodeMap.set(m[1], m[2].replace(/<br\s*\/?>/gi, ' ').replace(/["'{}]/g, '').trim());
      }
    }

    // Match connections: A --> B or A -->|Label| B
    const edgeMatch = trimmed.match(/([A-Za-z0-9_]+)\s*(?:-->|--\>|==>|-\.->)\s*(?:\|"?'?([^|]+?)"?'?\|\s*)?([A-Za-z0-9_]+)/);
    if (edgeMatch) {
      const from = edgeMatch[1];
      const label = edgeMatch[2] ? edgeMatch[2].replace(/["']/g, '').trim() : '';
      const to = edgeMatch[3];
      edgeList.push({ from, to, label });
      if (!nodeMap.has(from)) nodeMap.set(from, from);
      if (!nodeMap.has(to)) nodeMap.set(to, to);
    }
  }

  const nodes = Array.from(nodeMap.entries()).map(([id, label]) => ({ id, label }));
  if (nodes.length === 0) return '';

  const boxW = 280;
  const boxH = 64;
  const gapY = 32;
  const totalH = Math.max(160, nodes.length * (boxH + gapY) + 40);
  const totalW = 680;
  const centerX = totalW / 2;

  const bgFill = isDark ? '#140E0A' : '#FAF5EE';
  const cardFill = isDark ? '#22150E' : '#FFFFFF';
  const cardStroke = isDark ? '#C27847' : '#8C5338';
  const textFill = isDark ? '#FAF5EE' : '#2C1810';
  const arrowStroke = isDark ? '#C27847' : '#8C5338';

  let svg = `<svg viewBox="0 0 ${totalW} ${totalH}" xmlns="http://www.w3.org/2000/svg" width="100%">
  <defs>
    <marker id="m_fallback_arrow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
      <polygon points="0 0, 8 3, 0 6" fill="${arrowStroke}" />
    </marker>
  </defs>
  <rect width="${totalW}" height="${totalH}" rx="16" fill="${bgFill}"/>
`;

  nodes.forEach((n, idx) => {
    const y = 24 + idx * (boxH + gapY);
    const x = centerX - boxW / 2;

    const displayLabel = n.label.length > 36 ? n.label.slice(0, 34) + '...' : n.label;

    svg += `  <g transform="translate(${x}, ${y})">
    <rect width="${boxW}" height="${boxH}" rx="12" fill="${cardFill}" stroke="${cardStroke}" stroke-width="1.5" />
    <text x="${boxW / 2}" y="${boxH / 2 + 5}" text-anchor="middle" font-family="'Plus Jakarta Sans', system-ui, sans-serif" font-size="12" font-weight="700" fill="${textFill}">
      ${displayLabel.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}
    </text>
  </g>\n`;

    if (idx < nodes.length - 1) {
      const lineY1 = y + boxH;
      const lineY2 = y + boxH + gapY - 2;
      svg += `  <line x1="${centerX}" y1="${lineY1}" x2="${centerX}" y2="${lineY2}" stroke="${arrowStroke}" stroke-width="2" marker-end="url(#m_fallback_arrow)" />\n`;
    }
  });

  svg += `</svg>`;
  return svg;
}

// ─── 1. MERMAID DIAGRAM COMPONENT ──────────────────────────────────
export function MermaidDiagram({ chart }: { chart: string }) {
  const { theme: T } = useTheme();
  const [svgHtml, setSvgHtml] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const isDark = T.name === 'dark' || T.name === 'midnight';
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;
    initMermaid(isDark);

    const renderChart = async () => {
      if (!chart || !chart.trim()) return;
      const cleanChart = formatMermaidCode(chart);

      try {
        const id = `m_chart_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
        const { svg } = await mermaid.render(id, cleanChart);
        if (isMounted && svg) {
          setSvgHtml(svg);
          return;
        }
      } catch (err: any) {
        // NOTE: this fallback path is intentionally minimal — plain boxes/arrows,
        // no color theming beyond card/border colors — as a last resort so the
        // lesson never shows a blank gap. If you're seeing "basic" diagrams
        // often, it means Mermaid is failing to parse the cleaned chart more
        // than expected; this log is here so that's visible instead of silent.
        console.warn('[MermaidDiagram] mermaid.render() failed — falling back to basic SVG flowchart.', {
          error: err?.message || err,
          rawChart: chart,
          cleanedChart: cleanChart,
        });
      }

      // If Mermaid parser fails, render the built-in vector SVG flowchart as a last resort.
      if (isMounted) {
        const fallbackSvg = generateFallbackSvgFlowchart(cleanChart, isDark);
        setSvgHtml(fallbackSvg);
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
          padding: expanded ? '32px 16px' : '20px 12px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          minHeight: 140,
          background: T.name === 'dark' || T.name === 'midnight' ? '#140E0A' : '#FAF5EE',
        }}
      >
        {svgHtml ? (
          <div
            className="mermaid-wrapper"
            style={{
              width: '100%',
              minWidth: expanded ? 700 : '100%',
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
    // Strip markdown wrappers or leading labels anywhere inside
    code = code.replace(/```(?:svg|xml|html)?\s*/gi, '').replace(/```/g, '').trim();
    code = code.replace(/^svg\s+/i, '').trim();

    // If duplicate opening <svg tags are present, keep the last clean one
    if (code.match(/<svg/gi) && (code.match(/<svg/gi)?.length || 0) > 1) {
      const lastSvgIdx = code.lastIndexOf('<svg');
      code = code.substring(lastSvgIdx);
    }

    // Auto-heal missing opening <svg tag if code contains closing </svg>
    if (!code.includes('<svg') && code.includes('</svg>')) {
      const prefix = code.startsWith('ze=') ? '<text font-si' : '';
      code = `<svg viewBox="0 0 700 350" xmlns="http://www.w3.org/2000/svg" width="100%">\n${prefix}${code}`;
    }

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
      code = code.replace(/<svg\s*/i, '<svg viewBox="0 0 700 350" ');
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
          padding: isZoomed ? '28px 12px' : '16px 12px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          background: T.name === 'dark' || T.name === 'midnight' ? '#140E0A' : '#FAF5EE',
          transform: isZoomed ? 'scale(1.15)' : 'none',
          transition: 'transform 0.3s ease',
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
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
