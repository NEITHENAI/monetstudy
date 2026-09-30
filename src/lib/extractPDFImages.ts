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
  
  // Uncap page reading: read up to 120 pages for full book & lecture coverage
  const totalPagesToRead = Math.min(pdf.numPages, 120);
  // Render visual page thumbnails for the first 12 pages to preserve browser memory
  const maxImagePages = Math.min(pdf.numPages, 12);

  const pages: ExtractedPage[] = [];
  console.log(`[MonetStudy] Starting comprehensive PDF extraction (${totalPagesToRead} of ${pdf.numPages} pages)`);

  for (let i = 1; i <= totalPagesToRead; i++) {
    const page = await pdf.getPage(i);

    // Extract text across all pages
    const content = await page.getTextContent();
    const text = content.items.map((item: any) => item.str).join(' ');

    let imageBase64 = '';
    if (i <= maxImagePages) {
      try {
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d')!;
        await page.render({ canvasContext: ctx, viewport }).promise;
        imageBase64 = canvas.toDataURL('image/jpeg', 0.7).split(',')[1];
      } catch (renderErr) {
        console.warn(`[MonetStudy] Could not render image for page ${i}:`, renderErr);
      }
    }

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
