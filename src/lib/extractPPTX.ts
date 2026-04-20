import JSZip from 'jszip';

export async function extractPPTX(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);
    
    // Find all slide XML files
    const slideFiles = Object.keys(zip.files).filter(name => 
      name.match(/^ppt\/slides\/slide\d+\.xml$/)
    );

    // Sort them so slide1.xml comes before slide2.xml etc.
    slideFiles.sort((a, b) => {
      const numA = parseInt(a.match(/\d+/)![0], 10);
      const numB = parseInt(b.match(/\d+/)![0], 10);
      return numA - numB;
    });

    const extractedTexts: string[] = [];

    // Parse text from each slide XML
    for (const slideName of slideFiles) {
      const slideContent = await zip.files[slideName].async('text');
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(slideContent, 'text/xml');
      
      const atNodes = xmlDoc.getElementsByTagName('a:t');
      const slideTextParts = [];
      for (let i = 0; i < atNodes.length; i++) {
          if (atNodes[i].textContent) {
              slideTextParts.push(atNodes[i].textContent);
          }
      }
      
      const slideText = slideTextParts.join(' ').trim();
      if (slideText) {
        extractedTexts.push(slideText);
      }
    }

    return extractedTexts.join('\n\n').trim();
  } catch (error) {
    console.error('Failed to parse PPTX file:', error);
    throw new Error('Could not extract text from this .pptx file. Make sure it is not corrupted.');
  }
}
