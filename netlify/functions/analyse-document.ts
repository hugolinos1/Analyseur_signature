// netlify/functions/analyse-document.ts
import type { Handler, HandlerEvent } from "@netlify/functions";
import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY_BACKEND;

if (!GEMINI_API_KEY) {
  console.error("GEMINI_API_KEY_BACKEND is not set in Netlify environment variables. The function will not work.");
  // Potentially throw an error at module load time if you want to be strict,
  // or handle it gracefully in the handler.
}

// Initialize a global instance if the key is present
const genAI = GEMINI_API_KEY ? new GoogleGenAI(GEMINI_API_KEY) : null;

const getDocumentAnalysisPromptText = (): string => {
  return `You are an AI assistant specialized in analyzing PDF documents for signatures and annotations.
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
`;
};

const handler: Handler = async (event: HandlerEvent) => {
  if (!genAI) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Gemini API client not initialized on the server. Check API key." }),
      headers: { "Content-Type": "application/json" },
    };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method Not Allowed" }),
      headers: { "Content-Type": "application/json" },
    };
  }

  let pageImagesBase64: string[];
  try {
    const body = JSON.parse(event.body || "{}");
    pageImagesBase64 = body.pageImagesBase64;
    if (!Array.isArray(pageImagesBase64) || pageImagesBase64.length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing or empty pageImagesBase64 in request body" }),
        headers: { "Content-Type": "application/json" },
      };
    }
  } catch (error) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Invalid JSON request body" }),
      headers: { "Content-Type": "application/json" },
    };
  }

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash-preview-04-17", // Corrected model name from gemini-pro-vision to a valid one for text/image
    safetySettings: [ // Basic safety settings
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    ]
  });

  const textPart = { text: getDocumentAnalysisPromptText() };
  const imageParts = pageImagesBase64.map((base64Data) => {
    const parts = base64Data.split(',');
    const data = parts.length > 1 ? parts[1] : parts[0];
    return {
      inlineData: {
        mimeType: 'image/png',
        data: data,
      },
    };
  });

  try {
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [textPart, ...imageParts] }],
      generationConfig: { // Using generationConfig for these parameters
        responseMimeType: "application/json",
        temperature: 0.1,
        topK: 32,
        topP: 0.9,
      }
    });

    const response = result.response;
    // Netlify Functions expect the body to be a string.
    // The Gemini API with responseMimeType: "application/json" should return response.text() as a stringified JSON.
    const responseText = response.text();
    return {
      statusCode: 200,
      body: responseText,
      headers: { "Content-Type": "application/json" },
    };
  } catch (error: any) {
    console.error("Error calling Gemini API from Netlify function:", error);
    let errorMessage = "Gemini API request failed from server.";
    if (error.response && error.response.promptFeedback) {
      console.error("Prompt Feedback:", error.response.promptFeedback);
      errorMessage += ` Prompt Feedback: ${JSON.stringify(error.response.promptFeedback)}`;
    } else if (error.message) {
      errorMessage = error.message;
    }
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Error processing document with Gemini API.", details: errorMessage }),
      headers: { "Content-Type": "application/json" },
    };
  }
};

export { handler };
