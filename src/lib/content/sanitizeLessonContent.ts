/**
 * sanitizeLessonContent.ts
 *
 * SINGLE SOURCE OF TRUTH for turning raw DeepSeek lesson output into clean,
 * renderable markdown with well-formed ```mermaid / ```svg code fences.
 *
 * WHY THIS FILE EXISTS:
 * Previously this exact ~120-line regex pipeline was duplicated in two places:
 *   1. cleanMarkdown()   in src/lib/ai/client.ts        (ran once, server-side, at generation time)
 *   2. processContent()  in the topic page component     (ran again, client-side, on every render)
 * Both copies did the same fence-detection / repair work. Any drift between
 * the two copies (or any input DeepSeek produced that only one of them
 * handled correctly) could cause a block that rendered fine right after
 * generation to break later at render time, or vice versa — showing up as
 * either raw code/backticks leaking into the lesson text, or Mermaid parse
 * failures that silently fall back to the plain box-and-arrow SVG.
 *
 * FIX: sanitize ONCE, server-side, right after generation, and store the
 * fully-cleaned result in Firestore. The client no longer re-runs the heavy
 * fence-repair pass — see processContent() in page.tsx, which now only
 * handles the PAGE_/FIGURE_ image-placeholder substitution (which genuinely
 * needs client-side state) and leaves already-clean content untouched.
 *
 * If you need to adjust diagram-detection or markdown-repair behavior,
 * change it HERE ONLY. Do not re-introduce a second copy.
 */

export function sanitizeLessonContent(raw: string): string {
  if (!raw) return '';
  let content = raw;

  // ── STEP 0: NORMALIZE INVALID NODE IDENTIFIERS & DETECT BARE MERMAID ──
  // Separate markdown callouts, headings, or horizontal rules that are glued on the same line
  content = content.replace(/([^\n])\s+(>\s*\*\*[A-Z])/g, '$1\n\n$2');
  content = content.replace(/([^\n])\s+(#{1,6}\s+[A-Z0-9])/g, '$1\n\n$2');
  content = content.replace(/([^\n])\s+(---|\*\*\*)\s+/g, '$1\n\n$2\n\n');

  // Mermaid does not permit slashes in unquoted node identifiers (e.g. S/R["..."] or S/R -->).
  // Normalize S/R to S_R in node positions outside of labels so Mermaid doesn't syntax error.
  content = content.replace(/\b([A-Za-z0-9_]+)\/([A-Za-z0-9_]+)\b(?=\s*(?:\[|\(|\{|\>|-->|--\>|==>))/g, '$1_$2');

  // DeepSeek sometimes outputs mermaid node/edge definitions without the required
  // "graph TD" header. These blocks contain multiple "-->" arrows and node
  // definitions [...] but aren't detected by the standard mermaid regex (Step 1)
  // that requires a "graph TD|flowchart TD|..." keyword. We split into paragraphs,
  // detect those blocks by counting arrows + brackets, and wrap them in a mermaid
  // fence with "graph TD" prepended.
  const blocks = content.split(/(\n{2,})/);
  content = blocks.map(block => {
    const trimmed = block.trim();
    if (!trimmed || /^\n+$/.test(block)) return block;
    // Skip if already fenced or is a markdown structural element
    if (trimmed.startsWith('```') || /^[#>|!]/.test(trimmed)) return block;
    // Skip if it already has a graph/flowchart header (handled later)
    if (/^\s*(?:graph|flowchart)\s+(?:TD|TB|BT|RL|LR)/i.test(trimmed)) return block;
    // Count arrows and check for node brackets or style declarations
    const arrowCount = (trimmed.match(/-->/g) || []).length;
    const bracketCount = (trimmed.match(/\[[^\]]+\]/g) || []).length;
    const hasStyleDecl = /\bstyle\s+\w+\s+fill:/i.test(trimmed);
    // If 3+ arrows AND (brackets OR style declarations), it's bare mermaid
    if (arrowCount >= 3 && (bracketCount >= 2 || hasStyleDecl)) {
      return `\n\n\`\`\`mermaid\ngraph TD\n    ${trimmed}\n\`\`\`\n\n`;
    }
    return block;
  }).join('');

  // ── STEP 1: CODE FENCE PRE-CLEAN & NORMALIZATION ──
  content = content.replace(/```svg[ \t]+([^\r\n]+)/gi, '```svg\n$1');
  content = content.replace(/```mermaid[ \t]+([^\r\n]+)/gi, '```mermaid\n$1');

  // Close an already-opened ```svg block FIRST
  content = content.replace(/(```svg[\s\S]*?<\/svg>)(?!\s*```)/gi, '$1\n```\n\n');

  // Ensure </svg> tag is separated from trailing text or observation note
  content = content.replace(/(<\/svg>)([ \t]*[^\n`\s<])/gi, '$1\n\n$2');

  // Wrap any bare SVG blocks
  content = content.replace(
    /(?<!```(?:svg)?\s{0,10})(?:\bsvg\b\s*)?(<svg[\s\S]*?<\/svg>)/gi,
    '\n\n```svg\n$1\n```\n\n'
  );

  const STRONG_TERMINATORS = '\\*\\*(?:Observation|Observation Note|Observe|Clinical Pearl|Key Takeaway|Takeaway|Note)\\b|#{1,6}\\s+[A-Z]|\\bsvg\\s*<svg|\\|[^|\\n]*\\|[^|\\n]*\\|';

  // Catch bare / un-fenced Mermaid diagrams
  content = content.replace(
    new RegExp(
      '(?:^|(?<=[^`\\n]))(?<!```mermaid)[ \\t]*(?:```(?:mermaid)?)?\\s*(?:mermaid\\s+|\\b)(graph\\s+(?:TD|TB|BT|RL|LR)|flowchart\\s+(?:TD|TB|BT|RL|LR)|sequenceDiagram|stateDiagram|classDiagram|erDiagram|mindmap)([\\s\\S]*?)(?=(?:\\n\\s*#{1,6}\\s+|\\n\\s*\\*\\*[A-Z]|\\n\\s*>\\s*|\\n\\s*---\\s*|\\n\\s*(?:Observation Note:|Observe:|Clinical Pearl:|Takeaway:)|\\n\\s*\\n\\s*[A-Z*#]|\\n\\s*```|' + STRONG_TERMINATORS + '|$))',
      'gi'
    ),
    (match, type, body) => {
      const cleanBody = `${type}${body}`.trim().replace(/```$/, '').trim();
      return `\n\n\`\`\`mermaid\n${cleanBody}\n\`\`\`\n\n`;
    }
  );

  // Auto-close a ```mermaid block before the next section if the model forgot the closing fence
  content = content.replace(
    new RegExp(
      '(```mermaid[\\s\\S]*?)(?=(?:\\n\\s*```mermaid|\\n\\s*```svg|\\n\\s*#{1,6}\\s+|\\n\\s*\\*\\*[A-Z]|\\n\\s*>\\s*|\\n\\s*---\\s*|\\n\\s*(?:Observation Note:|Observe:|Clinical Pearl:|Takeaway:)|\\n\\s*\\n\\s*[A-Z*#]|' + STRONG_TERMINATORS + '|$))',
      'gi'
    ),
    (match) => {
      const trimmed = match.trim();
      if (trimmed.endsWith('```') && trimmed !== '```mermaid') {
        return `${trimmed}\n\n`;
      }
      const cleanBody = trimmed.replace(/\.\.+$/, '').trim();
      return `${cleanBody}\n\`\`\`\n\n`;
    }
  );

  // De-duplicate identical consecutive blocks
  content = content.replace(/(```(?:mermaid|svg)\s*[\s\S]*?```)\s*\n*\s*\1/gi, '$1');

  // ── STEP 2: PROTECT CODE FENCES from the text-formatting passes below ──
  const protectedFences: string[] = [];
  content = content.replace(/```(?:svg|mermaid|[a-z]*)\s*[\s\S]*?```/gi, (match) => {
    protectedFences.push(match);
    return `\n\n%%PROTECTED_BLOCK_${protectedFences.length - 1}%%\n\n`;
  });

  // ── STEP 2.5: CATCH REMAINING BARE CONTENT IN UNPROTECTED TEXT ──
  // Separate glued heading from bare diagram or arrow FIRST
  content = content.replace(/(#{1,6}\s+[^#\n]+?)\s+([A-Za-z0-9_/]+\s*(?:\[[^\]]*\])?\s*-->)/g, '$1\n\n$2');
  content = content.replace(/(#{1,6}\s+[^#\n]+?)\s+((?:\bsvg\b\s*)?<svg)/gi, '$1\n\n$2');

  // A. Bare mermaid: 3+ "NODE --> NODE" arrow sequences with node brackets [...]
  content = content.replace(
    /((?:[A-Za-z][A-Za-z0-9_/]*\s*(?:\["[^"]*"\]|\[[^\]]*\])?\s*-->\s*(?:\|"?[^"|]*"?\|\s*)?[A-Za-z][A-Za-z0-9_/]*\s*(?:\["[^"]*"\]|\[[^\]]*\])?\s*){3,}(?:\bstyle\s+[A-Za-z][A-Za-z0-9_/]*\s+[^\n]*\s*)*)/g,
    (match) => {
      if (match.includes('%%PROTECTED_BLOCK_')) return match;
      const trimmed = match.trim();
      const bracketCount = (trimmed.match(/\[[^\]]+\]/g) || []).length;
      if (bracketCount < 2) return match;
      protectedFences.push(`\`\`\`mermaid\ngraph TD\n    ${trimmed}\n\`\`\``);
      return `\n\n%%PROTECTED_BLOCK_${protectedFences.length - 1}%%\n\n`;
    }
  );

  // B. Bare SVG: <svg>...</svg> not inside a protected fence
  content = content.replace(
    /(?:\bsvg\b\s*)?(<svg[\s\S]*?<\/svg>)/gi,
    (match, svgContent) => {
      if (match.includes('%%PROTECTED_BLOCK_')) return match;
      protectedFences.push(`\`\`\`svg\n${svgContent.trim()}\n\`\`\``);
      return `\n\n%%PROTECTED_BLOCK_${protectedFences.length - 1}%%\n\n`;
    }
  );

  // ── STEP 3: STRUCTURAL TEXT & TABLE FORMATTING ──
  // A. Fix Markdown Tables
  content = content.replace(/\|\s*\|\s*/g, '|\n| ');
  content = content.replace(/([^\n|])\n+(\|\s*[^|\n]+\|)/g, '$1\n\n$2');
  content = content.replace(/(\|[^\n|]+\|)\s+(#{1,6}\s+|---|\*\*[A-Z])/g, '$1\n\n$2');

  // B. Separate horizontal rules from table separators
  content = content.replace(/(?:^|\n)[ \t]*(?:---|\*\*\*|___)[ \t]*(?:\n|$)/g, '\n\n---\n\n');
  content = content.replace(/([^|\n\r])\s+(---|___|\*\*\*)\s*([^|\n\r])/g, '$1\n\n---\n\n$3');

  // C. Headings: ensure each heading starts on its own line
  content = content.replace(/([^\n#|])\s+(#{1,6}\s+)/g, '$1\n\n$2');
  content = content.replace(/([^\n#|])\s+(#{1,6}\s+)/g, '$1\n\n$2');

  // C2. CRITICAL: Separate headings from glued paragraph sentences that follow on the same line!
  // DeepSeek often outputs "### Title From the source material..." without inserting a newline,
  // which causes CommonMark to treat the entire paragraph as a giant <h3> header.
  // Case 1: Heading ends with quotes, colon, question, exclamation, or key topic noun, followed by prose
  content = content.replace(
    /(#{1,6}\s+[^#\n]{3,80}?(?:["')?!:]|\b(?:Approach|Framework|Strategy|System|Method|Model|Principle|Analysis|Overview|Introduction|Mechanics|Anatomy|Rules|Setup|Trigger|Pattern|Breakout|Confirmation|Theory|Summary|Conclusion|Execution|Guide|Checklist)\b))\s+([A-Z][a-z]+(?:\s+[a-z]+){2,})/g,
    '$1\n\n$2'
  );

  // Case 2: Heading followed by common sentence openers (e.g. "From the...", "This is...", "The true...")
  content = content.replace(
    /(#{1,6}\s+[^#\n]{3,80}?)\s+((?:From|In|The|This|These|That|Notice|When|As|According|Here|To|If|It|We|You)\s+(?:the|this|that|a|an|source|true|is|are|we|can|will|should|must|first|critical|key)\b[^\n]*)/g,
    '$1\n\n$2'
  );

  // Case 3: Heading followed by bold text (e.g. '### Title **"A pattern...' or '### Title **Bold**')
  content = content.replace(
    /(#{1,6}\s+[^#\n]{3,80}?)\s+(\*\*[^\n]+?\*\*)/g,
    '$1\n\n$2'
  );

  // Case 4: Heading ending with a period followed by a capitalized sentence
  content = content.replace(
    /(#{1,6}\s+[^#\n]{3,60}?\.)\s+([A-Z][a-z]+)/g,
    '$1\n\n$2'
  );

  // Case 5: Numbered headings followed by body text on the same line
  // e.g. "### 1. Trend Indicators Trend indicators are designed..."
  // e.g. "### 2. Momentum Indicators While trend indicators tell you..."
  content = content.replace(
    /(#{1,6}\s+\d+\.\s+[A-Z][A-Za-z0-9]*(?:\s+(?:and|&|or|of|in|to|for|the|vs\.?|[A-Z][A-Za-z0-9]*)){0,4})\s+([A-Z][a-z]+(?:\s+[a-z]+|\s+[A-Z][a-z]+){2,})/g,
    '$1\n\n$2'
  );

  // Case 6: Ensure horizontal rules (---) glued to following headings or prose get separated
  // e.g. "health. --- ### 1. Trend Indicators"
  content = content.replace(/(---|\*\*\*|___)\s+(#{1,6}\s+|[A-Z])/g, '$1\n\n$2');

  // D. Separate bold subheaders glued to preceding text
  content = content.replace(/([^\n|])\s+(\*\*[A-Z][A-Za-z0-9\s/&,–—'"-]+\*\*:\s*)/g, '$1\n\n$2');

  // E. Numbered lists with bold items
  content = content.replace(/([^\n|])\s+(\d+\.\s+\*\*[^\n]+?\*\*)/g, '$1\n\n$2');
  content = content.replace(/(\d+\.\s+[^\n]+?)\s+(\d+\.\s+\*\*[^\n]+?\*\*)/g, '$1\n$2');

  // F. Format observation notes / callouts — expanded keyword list
  content = content.replace(/(?<!>)(?:\s|^)\*{0,2}(Observation|Observation Note|Clinical Pearl|Key Takeaway|Key Insight|Analogy|Important Note|Note|Takeaway|Common Pitfall|Warning|Remember|Tip|Example|Definition):\*{0,2}\s*/gi, '\n\n> **$1:** ');

  // G. Blockquotes: ensure > **Bold** patterns start on their own line
  content = content.replace(/([^\n|>])\s+(>\s+\*\*[A-Z])/g, '$1\n\n$2');

  // H. Bullet list items: ensure both asterisk (* **) and hyphen (- **) patterns start on their own line
  content = content.replace(/([^\n|*])\s+(\*\s+\*\*[A-Z])/g, '$1\n\n$2');
  content = content.replace(/(\*\*[^*\n]*?)\s+(\*\s+\*\*[A-Z])/g, '$1\n$2');
  content = content.replace(/([^\n|\-])\s+(-\s+\*\*[A-Z])/g, '$1\n\n$2');
  content = content.replace(/(\*\*[^*\n]*?)\s+(-\s+\*\*[A-Z])/g, '$1\n$2');

  // ── STEP 4: RESTORE CODE FENCES ──
  content = content.replace(/%%PROTECTED_BLOCK_(\d+)%%/g, (_, idx) => protectedFences[parseInt(idx, 10)]);

  // If an odd number of ``` fences exist in the document, an opening fence was left unclosed.
  // Safely append a closing fence rather than deleting the last fence (which would destroy
  // legitimate diagrams and spill their contents into raw lesson text).
  const fenceCount = (content.match(/```/g) || []).length;
  if (fenceCount % 2 !== 0) {
    content += '\n```\n';
  }

  // Clean up excessive blank lines (4+ → 2)
  content = content.replace(/\n{4,}/g, '\n\n\n');

  return content.trim();
}

/**
 * Diagnostic helper — call this (dev only) to see whether running the
 * sanitizer twice changes the output. If it does, something in the regex
 * chain above is not idempotent and needs attention before it's trusted
 * to run more than once on the same content.
 */
export function isSanitizeIdempotent(raw: string): boolean {
  const once = sanitizeLessonContent(raw);
  const twice = sanitizeLessonContent(once);
  return once === twice;
}
