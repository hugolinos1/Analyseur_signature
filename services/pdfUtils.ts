import * as pdfjsLib from 'pdfjs-dist/build/pdf';

// Worker source is set in index.tsx

/**
 * Processes a PDF file and returns an array of base64 encoded images of its pages.
 * @param file The PDF file to process.
 * @returns A promise that resolves to an array of base64 image strings.
 */
export const processPdf = async (file: File): Promise<string[]> => {
  const images: string[] = [];
  const arrayBuffer = await file.arrayBuffer();
  
  const loadingTask: pdfjsLib.PDFDocumentLoadingTask = pdfjsLib.getDocument(arrayBuffer);
  
  try {
    const pdf: pdfjsLib.PDFDocumentProxy = await loadingTask.promise;
    const numPages = pdf.numPages;

    // Limit number of pages to process to avoid performance issues / API limits with very large PDFs
    const MAX_PAGES_TO_PROCESS = 20; // Adjust as needed
    const pagesToProcess = Math.min(numPages, MAX_PAGES_TO_PROCESS);

    if (numPages > MAX_PAGES_TO_PROCESS) {
      console.warn(`PDF has ${numPages} pages. Processing only the first ${MAX_PAGES_TO_PROCESS} pages.`);
      // Optionally, inform the user through the UI if needed.
    }

    for (let i = 1; i <= pagesToProcess; i++) {
      const page: pdfjsLib.PDFPageProxy = await pdf.getPage(i);
      // Adjust scale for balance between detail and performance/size.
      // Higher scale = more detail, larger image, slower processing.
      const viewport: pdfjsLib.PageViewport = page.getViewport({ scale: 1.5 }); 
      
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      
      if (!context) {
        console.error(`Could not get 2D context for page ${i}`);
        continue; 
      }
      
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      const renderContext: pdfjsLib.RenderParameters = {
        canvasContext: context,
        viewport: viewport,
      };
      
      await page.render(renderContext).promise;
      images.push(canvas.toDataURL('image/png')); // Use 'image/jpeg' for smaller file sizes if quality allows
      page.cleanup(); 
    }
  } catch (error) {
    console.error('Error processing PDF:', error);
    if (error instanceof Error) {
        if (error.name === 'InvalidPDFException') {
            throw new Error('Invalid or corrupted PDF file. Please try a different file.');
        } else if (error.name === 'MissingPDFException') {
            throw new Error('PDF file not found or could not be loaded.');
        }
    }
    throw new Error('Failed to process PDF file. It might be encrypted or malformed.');
  }
  
  return images;
};
