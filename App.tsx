import React, { useState, useCallback } from 'react';
import { FileUpload } from './components/FileUpload';
import { ResultsDisplay } from './components/ResultsDisplay';
import { PdfViewer } from './components/PdfViewer';
import { Spinner } from './components/Spinner';
import { processPdf } from './services/pdfUtils'; // Corrected import path
import { analyzeDocumentWithGemini, translateAnalysisFieldsToFrench } from './services/geminiService'; // Added translateAnalysisFieldsToFrench
import type { AnalysisResult, GeminiAnalysisResponse } from './types';
import { DocumentClassification } from './types';

const App: React.FC = () => {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfImages, setPdfImages] = useState<string[]>([]);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('Analyzing Document...');
  const [error, setError] = useState<string | null>(null);
  const [currentViewPage, setCurrentViewPage] = useState<number | null>(null); // 1-indexed

  const handleFileChange = (file: File | null) => {
    setPdfFile(file);
    setAnalysisResult(null);
    setPdfImages([]);
    setError(null);
    setCurrentViewPage(null);
  };

  const mapClassificationStringToEnum = (classificationStr: string): DocumentClassification => {
    const upperStr = classificationStr.toUpperCase();
    if (upperStr in DocumentClassification) {
      return DocumentClassification[upperStr as keyof typeof DocumentClassification];
    }
    console.warn(`Unknown classification string: ${classificationStr}. Defaulting to UNSURE.`);
    return DocumentClassification.UNSURE;
  };

  const handleAnalyze = useCallback(async () => {
    if (!pdfFile) {
      setError("Please select a PDF file first.");
      return;
    }

    setIsLoading(true);
    setLoadingMessage('Analyzing Document...');
    setError(null);
    setAnalysisResult(null);
    setCurrentViewPage(null);

    try {
      const images = await processPdf(pdfFile);
      setPdfImages(images);

      if (images.length === 0) {
        setError("Could not extract any pages from the PDF.");
        setIsLoading(false);
        return;
      }
      
      const geminiResponseRaw = await analyzeDocumentWithGemini(images);
      
      let geminiJsonResponse: GeminiAnalysisResponse;
      try {
        let jsonStr = geminiResponseRaw.trim();
        const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
        const match = jsonStr.match(fenceRegex);
        if (match && match[2]) {
          jsonStr = match[2].trim();
        }
        geminiJsonResponse = JSON.parse(jsonStr) as GeminiAnalysisResponse;
      } catch (parseError) {
        console.error("Failed to parse Gemini JSON response:", parseError, "Raw response:", geminiResponseRaw);
        setError("Failed to understand AI response. The format was unexpected.");
        setAnalysisResult({
          overall_classification: DocumentClassification.ANALYSIS_FAILED,
          justification: "AI response could not be parsed. Raw: " + geminiResponseRaw.substring(0, 200) + "...",
          findings: [],
          relevant_pages: []
        });
        setIsLoading(false);
        return;
      }

      if (!geminiJsonResponse || typeof geminiJsonResponse.overall_classification !== 'string') {
         setError("AI response is missing critical information.");
         setAnalysisResult({
            overall_classification: DocumentClassification.ANALYSIS_FAILED,
            justification: "AI response structure was invalid. Raw: " + JSON.stringify(geminiJsonResponse).substring(0,200) + "...",
            findings: [],
            relevant_pages: []
         });
         setIsLoading(false);
         return;
      }

      let initialResult: AnalysisResult = {
        overall_classification: mapClassificationStringToEnum(geminiJsonResponse.overall_classification),
        justification: geminiJsonResponse.justification,
        findings: geminiJsonResponse.findings.map(f => ({
          ...f,
          page_number: Number(f.page_number) 
        })),
        relevant_pages: geminiJsonResponse.relevant_pages.map(p => Number(p)),
      };

      // Translate justification and finding descriptions
      setLoadingMessage('Translating analysis to French...');
      try {
        const { translatedJustification, translatedFindings } = await translateAnalysisFieldsToFrench({
          justification: initialResult.justification,
          findings: initialResult.findings,
        });
        initialResult.justification = translatedJustification;
        initialResult.findings = translatedFindings;
      } catch (translationError) {
        console.warn("Failed to translate analysis to French. Displaying in English.", translationError);
        // Optionally, set an error message or notification for the user about failed translation
      }
      
      setAnalysisResult(initialResult);

      if (initialResult.relevant_pages.length > 0) {
        setCurrentViewPage(initialResult.relevant_pages[0]);
      } else if (images.length > 0) {
        setCurrentViewPage(1); 
      }

    } catch (err) {
      console.error("Analysis failed:", err);
      let errorMessage = "An unknown error occurred during analysis.";
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      setError(errorMessage);
       setAnalysisResult({
          overall_classification: DocumentClassification.ANALYSIS_FAILED,
          justification: `Error during analysis: ${errorMessage}`,
          findings: [],
          relevant_pages: []
       });
    } finally {
      setIsLoading(false);
      setLoadingMessage('Analyzing Document...'); // Reset loading message
    }
  }, [pdfFile]);

  const handleViewPage = (pageNumber: number) => { 
    if (pageNumber > 0 && pageNumber <= pdfImages.length) {
      setCurrentViewPage(pageNumber);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-slate-100 p-4 md:p-8 flex flex-col items-center">
      <header className="w-full max-w-4xl mb-8 text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-blue-500">
          PDF Signature Analyzer
        </h1>
        <p className="mt-2 text-slate-400 text-lg">
          Upload your contract to verify signatures and detect annotations using AI.
        </p>
      </header>

      <main className="w-full max-w-4xl bg-slate-800 shadow-2xl rounded-lg p-6 md:p-8">
        <FileUpload onFileChange={handleFileChange} disabled={isLoading} />

        {pdfFile && (
          <div className="mt-6 text-center">
            <button
              onClick={handleAnalyze}
              disabled={isLoading || !pdfFile}
              className="px-8 py-3 bg-sky-500 hover:bg-sky-600 disabled:bg-slate-600 text-white font-semibold rounded-lg shadow-md transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-opacity-75"
            >
              {isLoading ? loadingMessage : 'Analyze Document'}
            </button>
          </div>
        )}

        {isLoading && <Spinner message={loadingMessage} />}
        
        {error && (
          <div className="mt-6 p-4 bg-red-700 bg-opacity-50 text-red-200 border border-red-500 rounded-md text-center">
            <p className="font-semibold">Error:</p>
            <p>{error}</p>
          </div>
        )}

        {analysisResult && !isLoading && (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-1">
              <ResultsDisplay result={analysisResult} onViewPage={handleViewPage} currentPage={currentViewPage} totalPages={pdfImages.length} />
            </div>
            <div className="md:col-span-1">
              {currentViewPage && pdfImages[currentViewPage - 1] && (
                <PdfViewer 
                  base64Image={pdfImages[currentViewPage - 1]} 
                  pageNumber={currentViewPage} 
                  totalPages={pdfImages.length}
                  onNavigate={handleViewPage}
                />
              )}
            </div>
          </div>
        )}
         {!analysisResult && !isLoading && pdfImages.length > 0 && currentViewPage && pdfImages[currentViewPage - 1] && (
            <div className="mt-8">
                 <PdfViewer 
                  base64Image={pdfImages[currentViewPage - 1]} 
                  pageNumber={currentViewPage} 
                  totalPages={pdfImages.length}
                  onNavigate={handleViewPage}
                />
            </div>
        )}
      </main>
      <footer className="w-full max-w-4xl mt-12 text-center text-slate-500 text-sm">
        <p>PDF Signature Analyzer &copy; {new Date().getFullYear()}. AI-powered document insights.</p>
        <p className="mt-1">Ensure API Key for Gemini is configured in your environment.</p>
      </footer>
    </div>
  );
};

export default App;