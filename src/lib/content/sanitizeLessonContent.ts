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

  // ── STEP 0: DETECT BARE MERMAID ARROW SEQUENCES ──
  // DeepSeek sometimes outputs mermaid node/edge definitions without the required
  // "graph TD" header. These blocks contain multiple "-->" arrows and node
  // definitions [...] but aren't detected by the standard mermaid regex (Step 1)
  // that requires a "graph TD|flowchart TD|..." keyword. We split into paragraphs,
  // detect those blocks by counting arrows + brackets, and wrap them in a mermaid
  // fence with "graph TD" prepended — so the standard detector (and Mermaid.js
  // itself) can handle them downstream.
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
  // Normalize any EXISTING ```svg / ```mermaid markers to have a real newline after them
  // FIRST — before trying to detect bare/unmarked diagrams below. This ordering matters: a
  // marker like "```mermaid graph TD ..." (space, not newline, no closing fence) still LOOKS
  // unmarked to the bare-diagram detector, which doesn't special-case "the marker is right
  // there but just malformed" — so it would wrap the diagram content a SECOND time and leave
  // the original marker orphaned in front of it (visible as a doubled ```mermaid in output).
  content = content.replace(/```svg[ \t]+([^\r\n]+)/gi, '```svg\n$1');
  content = content.replace(/```mermaid[ \t]+([^\r\n]+)/gi, '```mermaid\n$1');

  // Close an already-opened ```svg block FIRST, before attempting bare-wrap below — this must
  // run first so that, by the time bare-wrap runs, anything with a real opening marker is
  // already a complete pair and correctly recognized as "already fenced" (see the lookbehind
  // in the next step). The lookahead here is deliberately `(?!\s*```)` as ONE atomic assertion
  // rather than a consumed `\s*` followed by a separate check — `\s*` backtracking to zero
  // characters would otherwise let the check trivially pass right before a real closing fence
  // that's just one newline away, marking an already-closed block as "still open".
  content = content.replace(/(```svg[\s\S]*?<\/svg>)(?!\s*```)/gi, '$1\n```\n\n');

  // Wrap any bare SVG blocks — including "svg <svg...>" appearing mid-sentence with no
  // leading newline at all (DeepSeek frequently runs a diagram trigger straight into
  // surrounding prose) or a totally unfenced "<svg...>". No leading-newline requirement here
  // (unlike a plain `(?:^|\n)` anchor) is deliberate; the lookbehind below is what prevents
  // this from re-wrapping content that already has a proper ```svg marker — it checks for an
  // existing "```" optionally followed by "svg" and whitespace immediately behind the match,
  // which correctly blocks re-matching even when the match would otherwise start AFTER the
  // pre-existing "svg" word (i.e. from `<svg` directly), not just immediately after the marker.
  content = content.replace(
    /(?<!```(?:svg)?\s{0,10})(?:\bsvg\b\s*)?(<svg[\s\S]*?<\/svg>)/gi,
    '\n\n```svg\n$1\n```\n\n'
  );

  // Terminators that don't require a leading newline — needed because DeepSeek sometimes runs
  // a diagram's last line straight into the next section with just a space, no newline at all.
  // Every OTHER terminator below requires "\n" first, so in that case none of them would ever
  // match and the lazy match would run away, swallowing the observation note, headings, tables,
  // and even a second diagram into one giant broken mermaid block. These are chosen to be very
  // unlikely to appear inside real mermaid syntax: a bold callout keyword, a heading, the bare
  // svg trigger, or a markdown table row.
  const STRONG_TERMINATORS = '\\*\\*(?:Observation|Observation Note|Observe|Clinical Pearl|Key Takeaway|Takeaway|Note)\\b|#{1,6}\\s+[A-Z]|\\bsvg\\s*<svg|\\|[^|\\n]*\\|[^|\\n]*\\|';

  // Catch bare / un-fenced Mermaid diagrams (e.g. "...prevention. mermaid graph TD..." ) — by
  // this point anything that already had a ```mermaid marker has a real newline after it, so
  // this correctly leaves those alone and only wraps genuinely bare/unmarked diagrams.
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

  // De-duplicate identical consecutive blocks (DeepSeek occasionally repeats a diagram)
  content = content.replace(/(```(?:mermaid|svg)\s*[\s\S]*?```)\s*\n*\s*\1/gi, '$1');

  // ── STEP 2: PROTECT CODE FENCES from the text-formatting passes below ──
  const protectedFences: string[] = [];
  content = content.replace(/```(?:svg|mermaid|[a-z]*)\s*[\s\S]*?```/gi, (match) => {
    protectedFences.push(match);
    return `\n\n%%PROTECTED_BLOCK_${protectedFences.length - 1}%%\n\n`;
  });

  // ── STEP 2.5: CATCH REMAINING BARE CONTENT IN UNPROTECTED TEXT ──
  // After all known fences are protected as %%PROTECTED_BLOCK_N%%, any remaining
  // "-->" arrow sequences or "<svg>...</svg>" tags in the text are definitively
  // bare/unfenced content that slipped through Steps 0-1 (e.g. inline within a
  // paragraph with no double-newline separation).

  // A. Bare mermaid: 3+ "NODE --> NODE" arrow sequences with node brackets [...]
  content = content.replace(
    /((?:[A-Za-z][A-Za-z0-9_]*\s*(?:\["[^"]*"\]|\[[^\]]*\])?\s*-->\s*(?:\|"?[^"|]*"?\|\s*)?[A-Za-z][A-Za-z0-9_]*\s*(?:\["[^"]*"\]|\[[^\]]*\])?\s*){3,}(?:\bstyle\s+[A-Za-z][A-Za-z0-9_]*\s+[^\n]*\s*)*)/g,
    (match) => {
      if (match.includes('%%PROTECTED_BLOCK_')) return match;
      const trimmed = match.trim();
      // Require at least 2 bracket node definitions to avoid false positives
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

  // C. Headings
  content = content.replace(/([^\n#|])\s+(#{1,6}\s+[^#\n]+?)(?=\s+\d+\.\s+|\s+-\s+|\s+---\s+|\n|$)/g, '$1\n\n$2\n\n');
  content = content.replace(/(#{1,6}\s+[A-Z][A-Za-z0-9\s:,'"-]+?)\s+([A-Z][a-z]+(?:\s+[a-z]+){2,})/g, '$1\n\n$2');

  // D. Separate bold subheaders glued to preceding text
  content = content.replace(/([^\n|])\s+(\*\*[A-Z][A-Za-z0-9\s/&,–—'-]+\*\*:\s*)/g, '$1\n\n$2');

  // E. Lists
  content = content.replace(/([^\n|])\s+(\d+\.\s+\*\*[^\n]+?\*\*)/g, '$1\n\n$2');
  content = content.replace(/(\d+\.\s+[^\n]+?)\s+(\d+\.\s+\*\*[^\n]+?\*\*)/g, '$1\n$2');

  // F. Format observation notes / callouts. Negative lookbehind (?<!>) is deliberate: without
  //    it, running this on already-formatted "> **Key Takeaway:** ..." text a second time would
  //    match again (the space after "> " still satisfies the leading \s) and insert a second,
  //    broken blockquote prefix — this makes the whole function safe to run more than once.
  content = content.replace(/(?<!>)(?:\s|^)\*{0,2}(Observation|Observation Note|Clinical Pearl|Key Takeaway):\*{0,2}\s*/gi, '\n\n> **$1:** ');

  // ── STEP 4: RESTORE CODE FENCES ──
  content = content.replace(/%%PROTECTED_BLOCK_(\d+)%%/g, (_, idx) => protectedFences[parseInt(idx, 10)]);

  // Remove a genuinely orphaned/unpaired ``` fence (e.g. DeepSeek started a code block near
  // the end of the lesson and never closed or used it). This used to be a blind sweep that
  // matched ANY ``` surrounded by blank lines — but a properly closed mermaid/svg block's own
  // closing fence is ALSO surrounded by blank lines (auto-close deliberately adds them), so
  // that version was stripping legitimate closing fences right along with genuine orphans.
  // A ``` count that isn't even means something really is unpaired — safe to act on. Only the
  // trailing unpaired occurrence is removed, not every fence in the document.
  const fenceCount = (content.match(/```/g) || []).length;
  if (fenceCount % 2 !== 0) {
    const lastIdx = content.lastIndexOf('```');
    if (lastIdx !== -1) {
      content = content.slice(0, lastIdx) + content.slice(lastIdx + 3);
    }
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
