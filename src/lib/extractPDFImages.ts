'use client';

export interface ExtractedPage {
  pageNum: number;
  text: string;
  imageBase64: string; // base64 jpeg
}

export async function extractPDFWithImages(file: File): Promise<{
  fullText: string;
  pages: ExtractedPage[];
}> {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs`;

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const maxPages = Math.min(pdf.numPages, 10); // cap at 20 pages

  const pages: ExtractedPage[] = [];
  console.log('[MonetStudy] Starting PDF extraction, pages:', maxPages);

  for (let i = 1; i <= maxPages; i++) {
    const page = await pdf.getPage(i);

    // Extract text
    const content = await page.getTextContent();
    const text = content.items.map((item: any) => item.str).join(' ');

    // Render to canvas
    const viewport = page.getViewport({ scale: 1.5 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d')!;
    await page.render({ canvasContext: ctx, viewport }).promise;
    const imageBase64 = canvas.toDataURL('image/jpeg', 0.7).split(',')[1];

    pages.push({ pageNum: i, text, imageBase64 });
  }

  return {
    fullText: pages.map(p => p.text).join('\n\n').trim(),
    pages,
  };
}

// Build Pollinations AI image URL from topic title
export function getConceptImageUrl(topicTitle: string): string {
  const prompt = encodeURIComponent(
    `educational diagram illustration of ${topicTitle}, clean minimal style, white background, labeled, professional`
  );
  return `https://image.pollinations.ai/prompt/${prompt}?width=800&height=500&nologo=true`;
}
