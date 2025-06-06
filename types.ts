export enum DocumentClassification {
  NO_MODIFICATIONS = "NO_MODIFICATIONS",
  HANDWRITTEN_SIGNATURE_PRESENT = "HANDWRITTEN_SIGNATURE_PRESENT",
  ELECTRONIC_SIGNATURE_PRESENT = "ELECTRONIC_SIGNATURE_PRESENT",
  ANNOTATIONS_ONLY_PRESENT = "ANNOTATIONS_ONLY_PRESENT",
  ANNOTATIONS_AND_SIGNATURE_PRESENT = "ANNOTATIONS_AND_SIGNATURE_PRESENT",
  ANALYSIS_FAILED = "ANALYSIS_FAILED", // For cases where AI fails to classify or errors occur
  UNSURE = "UNSURE" // If AI cannot confidently classify
}

export interface Finding {
  type: string; 
  page_number: number;
  description: string;
}

export interface AnalysisResult {
  overall_classification: DocumentClassification;
  justification: string;
  findings: Finding[];
  relevant_pages: number[]; // Page numbers (1-indexed)
}

// Expected structure from Gemini after parsing text to JSON
export interface GeminiAnalysisResponse {
  overall_classification: string; 
  justification: string;
  findings: Array<{
    type: string;
    page_number: number;
    description: string;
  }>;
  relevant_pages: number[];
}

// For parts in Gemini request
export interface TextPart {
  text: string;
}

export interface InlineDataPart {
  inlineData: {
    mimeType: string;
    data: string; // base64 encoded
  };
}