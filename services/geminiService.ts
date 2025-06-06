import { GoogleGenAI } from "@google/genai";
import type { TextPart, InlineDataPart, AnalysisResult, Finding, GeminiAnalysisResponse } from '../types'; // Added AnalysisResult, Finding, GeminiAnalysisResponse

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.warn("Gemini API Key (process.env.API_KEY) is not set. The application will attempt to use ambient credentials if available (e.g., in a Google Cloud environment with a proxy). If an API key is strictly required and not provided via process.env.API_KEY, or if ambient credentials are not configured, calls to Gemini will fail.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });
const model = ai.models;

const getDocumentAnalysisPrompt = (): TextPart => {
  return {
    text: `You are an AI assistant specialized in analyzing PDF documents for signatures and annotations.
You will be given a series of images, each representing a page from a PDF document.
Analyze these images thoroughly. Your goal is to classify the document based on the presence of signatures and annotations.

Output your analysis in a VALID JSON format ONLY. Do not include any other text, comments, or markdown fences before or after the JSON block.
The JSON object must strictly follow this structure:
{
  "overall_classification": "CASE_NAME",
  "justification": "A concise explanation (1-2 sentences) for the overall_classification, summarizing the key findings.",
  "findings": [
    {
      "type": "FINDING_TYPE",
      "page_number": PAGE_NUMBER_INTEGER,
      "description": "Brief, specific description of the finding on this page (e.g., 'Blue ink signature at bottom right', 'Red arrow pointing to section 3', 'Electronic signature block with timestamp')."
    }
  ],
  "relevant_pages": [PAGE_NUMBER_INTEGER_1, PAGE_NUMBER_INTEGER_2, ...]
}

Allowed CASE_NAME values (CHOOSE EXACTLY ONE):
- "NO_MODIFICATIONS": The document appears pristine, with no discernible signatures or annotations.
- "HANDWRITTEN_SIGNATURE_PRESENT": One or more handwritten signatures are detected. Other minor annotations might be present but the signature is the primary finding.
- "ELECTRONIC_SIGNATURE_PRESENT": One or more electronic/digital signatures (e.g., typed name in a signature font, digital certificate block, platform-generated signature) are detected. Other minor annotations might be present.
- "ANNOTATIONS_ONLY_PRESENT": Annotations (like handwritten notes, arrows, highlights, underlines, circles, drawings, stamps) are present, but no clear signatures are detected.
- "ANNOTATIONS_AND_SIGNATURE_PRESENT": Both clear signatures (handwritten or electronic) AND significant other annotations are present.
- "UNSURE": If you cannot confidently classify the document based on the provided images.

For FINDING_TYPE, use specific terms from this list:
"handwritten_signature", "electronic_signature_block", "typed_signature", "initials",
"text_annotation", "highlight", "underline", "strikethrough", "arrow_annotation",
"encircled_area", "handwritten_note", "drawing_annotation", "stamp", "checkbox_marked", "form_field_filled".

Page numbers (PAGE_NUMBER_INTEGER) must be 1-indexed integers, corresponding to the order of the images provided.
The 'relevant_pages' array should include all page numbers (as integers) where any significant finding (signature or annotation) was identified.
If "NO_MODIFICATIONS" is chosen, 'findings' must be an empty array and 'relevant_pages' must be an empty array.
If "UNSURE" is chosen, provide your best guess for justification and list any observed elements in findings.

Analyze all provided page images and consolidate your findings into a single JSON response.
Focus on visual evidence in the images. Base your entire response on the images.
`,
  };
};


/**
 * Translates specific fields of the analysis data to French.
 * @param englishAnalysis - The analysis data with English text.
 * @returns A promise that resolves to the analysis data with translated fields.
 */
export const translateAnalysisFieldsToFrench = async (
  englishAnalysis: { justification: string; findings: Finding[] }
): Promise<{ translatedJustification: string; translatedFindings: Finding[] }> => {
  
  // Prepare the object for translation
  const dataToTranslate = {
    justification: englishAnalysis.justification,
    findings: englishAnalysis.findings.map(f => ({ description: f.description })), // Only descriptions from findings
  };

  const translationPrompt = `You are an expert English to French translator.
Translate the 'justification' field and the 'description' field for each object in the 'findings' array from English to French.
Input JSON:
${JSON.stringify(dataToTranslate, null, 2)}

Output ONLY the translated JSON object, with the same structure. Do not add any extra text or markdown.
For example, if input is:
{
  "justification": "Document is signed.",
  "findings": [
    { "description": "A signature on page 1." },
    { "description": "An arrow on page 2." }
  ]
}
Output should be:
{
  "justification": "Le document est signé.",
  "findings": [
    { "description": "Une signature à la page 1." },
    { "description": "Une flèche à la page 2." }
  ]
}
Ensure the output is a valid JSON object.
`;

  try {
    const response = await model.generateContent({
        model: "gemini-2.5-flash-preview-04-17",
        contents: translationPrompt,
        config: {
            responseMimeType: "application/json",
            temperature: 0.2, // Low temperature for more direct translation
        },
    });

    let jsonStr = response.text.trim();
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const match = jsonStr.match(fenceRegex);
    if (match && match[2]) {
      jsonStr = match[2].trim();
    }
    const translatedData = JSON.parse(jsonStr);

    const translatedFindings = englishAnalysis.findings.map((originalFinding, index) => ({
      ...originalFinding,
      description: translatedData.findings[index]?.description || originalFinding.description,
    }));

    return {
      translatedJustification: translatedData.justification || englishAnalysis.justification,
      translatedFindings: translatedFindings,
    };

  } catch (error) {
    console.error("Error translating analysis fields to French:", error, "Raw translation prompt:", translationPrompt);
    console.warn("Falling back to English for justification and findings descriptions.");
    // Fallback to original English text in case of error
    return {
      translatedJustification: englishAnalysis.justification,
      translatedFindings: englishAnalysis.findings,
    };
  }
};


export const analyzeDocumentWithGemini = async (pageImagesBase64: string[]): Promise<string> => {
  const textPart = getDocumentAnalysisPrompt();
  const imageParts: InlineDataPart[] = pageImagesBase64.map((base64Data) => {
    const parts = base64Data.split(',');
    const data = parts.length > 1 ? parts[1] : parts[0]; // Handle cases with or without prefix
    return {
      inlineData: {
        mimeType: 'image/png', // Assuming PNG from pdfUtils
        data: data,
      },
    };
  });

  if (imageParts.length === 0) {
    throw new Error("No images provided for analysis.");
  }

  try {
    const response = await model.generateContent({
        model: "gemini-2.5-flash-preview-04-17",
        contents: { parts: [textPart, ...imageParts] },
        config: {
            responseMimeType: "application/json",
            temperature: 0.1,
            topK: 32,
            topP: 0.9,
        }
    });
    return response.text;
  } catch (error) {
    console.error("Error calling Gemini API for analysis:", error);
    if (error instanceof Error) {
        if (error.message.includes("API key not valid") || error.message.includes("API_KEY_INVALID")) {
            throw new Error("Invalid Gemini API Key. Please check your environment configuration.");
        }
        if (error.message.includes("quota") || error.message.includes("Rate limit")) {
             throw new Error("Gemini API quota exceeded or rate limit hit. Please try again later.");
        }
        throw new Error(`Gemini API request failed: ${error.message}`);
    }
    throw new Error("An unknown error occurred while communicating with the Gemini API.");
  }
};
