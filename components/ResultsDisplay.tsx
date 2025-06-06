
import React from 'react';
import type { AnalysisResult, Finding } from '../types';
import { DocumentClassification } from '../types';

interface ResultsDisplayProps {
  result: AnalysisResult;
  onViewPage: (pageNumber: number) => void;
  currentPage: number | null;
  totalPages: number;
}

const classificationToColorAndText = (classification: DocumentClassification): {bgColor: string, textColor: string, title: string, icon: React.ReactNode} => {
  const CheckCircleIcon = <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
  const PencilAltIcon = <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>;
  const ExclamationCircleIcon = <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
  const QuestionMarkCircleIcon = <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.755 4 3.92C16 13.09 14.828 14 12.803 14c-1.139 0-1.981-.508-2.493-1.034L10 14.412V15H8v-1.574c0-.82.422-1.557 1.158-1.966A2.85 2.85 0 0010.5 9.5a.954.954 0 01-.955-1.026C9.343 7.604 8.796 8.3 8.228 9zm0 0V8.5" /><path d="M12 17.5A1.5 1.5 0 0110.5 19 1.5 1.5 0 019 17.5a1.5 1.5 0 011.5-1.5A1.5 1.5 0 0112 17.5z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;


  switch (classification) {
    case DocumentClassification.NO_MODIFICATIONS:
      return { bgColor: 'bg-green-600', textColor: 'text-green-100', title: 'No Modifications Detected', icon: CheckCircleIcon };
    case DocumentClassification.HANDWRITTEN_SIGNATURE_PRESENT:
      return { bgColor: 'bg-sky-600', textColor: 'text-sky-100', title: 'Handwritten Signature(s) Present', icon: PencilAltIcon };
    case DocumentClassification.ELECTRONIC_SIGNATURE_PRESENT:
      return { bgColor: 'bg-blue-600', textColor: 'text-blue-100', title: 'Electronic Signature(s) Present', icon: PencilAltIcon };
    case DocumentClassification.ANNOTATIONS_ONLY_PRESENT:
      return { bgColor: 'bg-yellow-600', textColor: 'text-yellow-100', title: 'Annotations Present (No Signatures)', icon: PencilAltIcon };
    case DocumentClassification.ANNOTATIONS_AND_SIGNATURE_PRESENT:
      return { bgColor: 'bg-purple-600', textColor: 'text-purple-100', title: 'Annotations & Signature(s) Present', icon: PencilAltIcon };
    case DocumentClassification.ANALYSIS_FAILED:
      return { bgColor: 'bg-red-700', textColor: 'text-red-100', title: 'Analysis Failed', icon: ExclamationCircleIcon };
    case DocumentClassification.UNSURE:
       return { bgColor: 'bg-slate-600', textColor: 'text-slate-100', title: 'Analysis Unsure', icon: QuestionMarkCircleIcon };
    default:
      return { bgColor: 'bg-gray-600', textColor: 'text-gray-100', title: 'Unknown Classification', icon: QuestionMarkCircleIcon };
  }
};

const FindingIcon: React.FC<{ type: string }> = ({ type }) => {
  const lowerType = type.toLowerCase();
  if (lowerType.includes('signature')) {
    return <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-sky-400 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>;
  }
  if (lowerType.includes('arrow')) {
     return <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>;
  }
   if (lowerType.includes('highlight') || lowerType.includes('underline') || lowerType.includes('encircled') || lowerType.includes('strikethrough')) {
    return <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>;
  }
  return <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v1H7V5zm0 2h2v1H7V7zm0 2h2v1H7V9zm0 2h2v1H7v-1zm3-6h2v1h-2V5zm0 2h2v1h-2V7zm0 2h2v1h-2V9zm0 2h2v1h-2v-1z" clipRule="evenodd" /></svg>;
};


export const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ result, onViewPage, currentPage, totalPages }) => {
  const { overall_classification, justification, findings, relevant_pages } = result;
  const classificationStyle = classificationToColorAndText(overall_classification);

  return (
    <div className="bg-slate-700 p-4 md:p-6 rounded-lg shadow-lg h-full flex flex-col">
      <h2 className={`text-xl md:text-2xl font-bold mb-4 p-3 rounded-md ${classificationStyle.bgColor} ${classificationStyle.textColor} flex items-center`}>
        {classificationStyle.icon}
        <span>Classification: {classificationStyle.title}</span>
      </h2>
      
      <div className="mb-4 p-3 bg-slate-600 rounded-md">
        <h3 className="font-semibold text-md md:text-lg text-sky-300 mb-1">AI Justification:</h3>
        <p className="text-slate-200 text-sm leading-relaxed">{justification}</p>
      </div>

      {findings && findings.length > 0 && (
        <div className="mb-4 flex-grow overflow-y-auto max-h-[200px] md:max-h-[300px] pr-2 custom-scrollbar">
          <h3 className="font-semibold text-md md:text-lg text-sky-300 mb-2">Detailed Findings:</h3>
          <ul className="space-y-2">
            {findings.map((finding, index) => (
              <li 
                key={index} 
                className={`p-3 bg-slate-600 rounded-md hover:bg-slate-500 transition-colors duration-150 cursor-pointer flex items-start space-x-3 ${finding.page_number === currentPage ? 'ring-2 ring-sky-400 shadow-lg' : 'shadow-sm'}`}
                onClick={() => onViewPage(finding.page_number)}
              >
                <div className="mt-1"><FindingIcon type={finding.type} /></div>
                <div>
                  <p className="font-medium text-slate-100 text-sm">
                    <span className="font-semibold">{finding.type}</span> (Page {finding.page_number})
                  </p>
                  <p className="text-xs text-slate-300">{finding.description}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {relevant_pages && relevant_pages.length === 0 && findings && findings.length === 0 && overall_classification !== DocumentClassification.NO_MODIFICATIONS && (
         <p className="text-slate-400 text-sm p-3 bg-slate-600 rounded-md">No specific findings listed by AI. The classification suggests potential items of interest. Please review the document pages.</p>
      )}

      {totalPages > 0 && (
        <div className="mt-auto pt-4 border-t border-slate-600">
          <h3 className="font-semibold text-sm text-sky-300 mb-2">Relevant Pages Identified by AI:</h3>
          {relevant_pages && relevant_pages.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {relevant_pages.map(page => (
                <button
                  key={page}
                  onClick={() => onViewPage(page)}
                  className={`px-3 py-1 text-xs rounded-md transition-colors duration-150 ${
                    page === currentPage 
                      ? 'bg-sky-500 text-white font-semibold' 
                      : 'bg-slate-500 hover:bg-sky-600 text-slate-200'
                  }`}
                >
                  Page {page}
                </button>
              ))}
            </div>
          ) : (
             <p className="text-slate-400 text-xs">
                {overall_classification === DocumentClassification.NO_MODIFICATIONS ? "Document appears unmodified. No specific pages highlighted." : "No specific pages highlighted by AI. Review document manually."}
             </p>
          )}
        </div>
      )}
    </div>
  );
};
