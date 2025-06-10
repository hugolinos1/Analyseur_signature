// Define types locally to resolve import errors as the project structure is unavailable.
interface Finding {
  description: string;
  [key: string]: any; // Allow other properties
}

interface TextPart {
  text: string;
}

interface InlineDataPart {
  inlineData: {
    mimeType: string;
    data: string;
  };
}

interface AnalysisResult {
  justification: string;
  findings: Finding[];
}

interface GeminiAnalysisResponse {
  [key:string]: any;
}

// Declaration for Vite environment variables to prevent TypeScript errors.
declare global {
  interface ImportMeta {
    readonly env: {
      readonly VITE_GEMINI_API_KEY: string;
    };
  }
}
// This is a placeholder to resolve the TS error.
// The actual @google/genai package must be installed for the code to run.
declare class GoogleGenAI {
  constructor(apiKey: string);
  getGenerativeModel(args: { model: string }): any;
}

// API Key for client-side translation - to be set in .env as VITE_GEMINI_API_KEY
const TRANSLATION_API_KEY = import.meta.env.VITE_GEMINI_API_KEY; 

let translationGenAI: GoogleGenAI | null = null;
if (TRANSLATION_API_KEY) {
  translationGenAI = new GoogleGenAI(TRANSLATION_API_KEY);
} else {
  console.warn("VITE_GEMINI_API_KEY for translation is not set. Translation feature may fail.");
}

// getDocumentAnalysisPrompt is no longer needed here, it's in the Netlify function.

/**
 * Translates specific fields of the analysis data to French using client-side Gemini call.
 * @param englishAnalysis - The analysis data with English text.
 * @returns A promise that resolves to the analysis data with translated fields.
 */
export const translateAnalysisFieldsToFrench = async (
  englishAnalysis: { justification: string; findings: Finding[] }
): Promise<{ translatedJustification: string; translatedFindings: Finding[] }> => {
  if (!translationGenAI) {
    console.error("Translation client not initialized. API key might be missing.");
    // Fallback to English
    return {
      translatedJustification: englishAnalysis.justification,
      translatedFindings: englishAnalysis.findings,
    };
  }
  
  const model = translationGenAI.getGenerativeModel({ model: "gemini-1.5-flash-latest"}); // Use the latest stable flash model

  const dataToTranslate = {
    justification: englishAnalysis.justification,
    findings: englishAnalysis.findings.map(f => ({ description: f.description })),
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
    const result = await model.generateContent({
        contents: [{ role: "user", parts: [{text: translationPrompt}] }], // Ensure contents structure is correct
        generationConfig: { // Using generationConfig
            responseMimeType: "application/json",
            temperature: 0.2, 
        },
    });
    const response = result.response;
    let jsonStr = response.text().trim();
    
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
    return {
      translatedJustification: englishAnalysis.justification,
      translatedFindings: englishAnalysis.findings,
    };
  }
};

export const analyzeDocumentWithGemini = async (pageImagesBase64: string[]): Promise<string> => {
  if (pageImagesBase64.length === 0) {
    // Consider if this check should be in the Netlify function too or exclusively there
    throw new Error("No images provided for analysis.");
  }

  try {
    const response = await fetch('/.netlify/functions/analyse-document', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ pageImagesBase64 }),
    });

    if (!response.ok) {
      let errorBody;
      try {
        errorBody = await response.json();
      } catch (e) {
        errorBody = await response.text();
      }
      console.error("Error from Netlify function:", errorBody);
      throw new Error(`Analysis request failed with status ${response.status}: ${errorBody?.details || response.statusText}`);
    }
    
    // The Netlify function should already return a stringified JSON.
    // If it's double-encoded, this might need adjustment.
    // Assuming Netlify function returns the direct string response from Gemini, which is already JSON.
    return await response.text(); 
  } catch (error) {
    console.error("Error calling Netlify function for analysis:", error);
    if (error instanceof Error) {
        throw new Error(`Failed to analyze document via backend: ${error.message}`);
    }
    throw new Error("An unknown error occurred while communicating with the backend analysis service.");
  }
};
