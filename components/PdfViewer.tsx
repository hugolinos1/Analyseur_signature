import React from 'react';

interface PdfViewerProps {
  base64Image: string;
  pageNumber: number; // 1-indexed
  totalPages: number;
  onNavigate: (pageNumber: number) => void; // 1-indexed
}

export const PdfViewer: React.FC<PdfViewerProps> = ({ base64Image, pageNumber, totalPages, onNavigate }) => {
  const goToPrevPage = () => {
    if (pageNumber > 1) {
      onNavigate(pageNumber - 1);
    }
  };

  const goToNextPage = () => {
    if (pageNumber < totalPages) {
      onNavigate(pageNumber + 1);
    }
  };

  return (
    <div className="bg-slate-700 p-4 rounded-lg shadow-lg flex flex-col items-center h-full">
      <h3 className="text-lg md:text-xl font-semibold text-sky-300 mb-3">
        Viewing Page {pageNumber} of {totalPages}
      </h3>
      <div className="pdf-page-container w-full overflow-auto mb-4 flex-grow flex items-center justify-center bg-slate-800 rounded-md min-h-[300px] md:min-h-[400px]">
        {base64Image ? (
           <img 
            src={base64Image} 
            alt={`Page ${pageNumber}`} 
            className="max-w-full max-h-[calc(100vh-300px)] md:max-h-[calc(100vh-350px)] h-auto object-contain shadow-md"
          />
        ) : (
          <div className="text-slate-400">Image not available.</div>
        )}
      </div>
      {totalPages > 1 && (
        <div className="flex justify-between items-center w-full max-w-xs sm:max-w-sm md:max-w-md mx-auto">
          <button
            onClick={goToPrevPage}
            disabled={pageNumber <= 1}
            className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white font-medium rounded-md disabled:bg-slate-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors text-sm"
          >
            &larr; Previous
          </button>
          <span className="text-slate-300 text-sm">Page {pageNumber} / {totalPages}</span>
          <button
            onClick={goToNextPage}
            disabled={pageNumber >= totalPages}
            className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white font-medium rounded-md disabled:bg-slate-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors text-sm"
          >
            Next &rarr;
          </button>
        </div>
      )}
    </div>
  );
};
