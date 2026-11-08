/**
 * Gemini Service
 * - analyzeClothing(): reads a garment photo and returns structured details (AI Magic Tag)
 * - virtualTryOn():    generates an image of the person wearing the selected garment
 *
 * Uses the Google Gemini API with a key from https://aistudio.google.com/apikey
 *
 * Note: analysis uses a text/vision model that has a free tier. Try-on uses an
 * image-generation model, which Google lists as paid-tier only (a few cents per image).
 */

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

const ANALYSIS_MODEL = 'gemini-3.5-flash-lite';
const TRYON_MODEL = 'gemini-3.1-flash-lite-image';

export interface ClothingDetection {
  type: string;
  style: string;
  color: string;
  pattern: string;
  category: string; // 'Women' | 'Men'
  occasion: string;
  season: string;
  description: string;
}

interface InlineImage {
  mimeType: string;
  data: string; // base64 without the data: prefix
}

function requireKey() {
  if (!GEMINI_API_KEY) {
    throw new Error(
      'VITE_GEMINI_API_KEY is not set. Create a free key at aistudio.google.com/apikey and add it to your .env.local file.'
    );
  }
}

/** Turns a data URL or an http(s) image URL into base64 inline data. */
async function toInlineImage(source: string): Promise<InlineImage> {
  if (source.startsWith('data:')) {
    const [header, data] = source.split(',');
    const mimeType = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
    return { mimeType, data };
  }

  const res = await fetch(source);
  if (!res.ok) throw new Error('Could not load the garment image.');
  const blob = await res.blob();
  const dataUrl: string = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Could not read the garment image.'));
    reader.readAsDataURL(blob);
  });
  const [, data] = dataUrl.split(',');
  return { mimeType: blob.type || 'image/jpeg', data };
}

async function callGemini(model: string, body: unknown): Promise<any> {
  const response = await fetch(`${API_BASE}/${model}:generateContent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': GEMINI_API_KEY,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    let message = errText;
    try {
      message = JSON.parse(errText)?.error?.message || errText;
    } catch {
      /* keep raw text */
    }
    if (response.status === 429 || response.status === 403) {
      throw new Error(
        `Gemini API limit or access problem (${response.status}). Image generation needs a key with billing enabled; text analysis works on the free tier. Details: ${message}`
      );
    }
    throw new Error(`Gemini API error ${response.status}: ${message}`);
  }

  return response.json();
}

/**
 * Analyzes a base64 image of clothing with Gemini vision.
 * @param imageBase64 - base64 data URL of the image
 * @returns Array of detected clothing items
 */
export async function analyzeClothing(imageBase64: string): Promise<ClothingDetection[]> {
  if (!imageBase64) throw new Error('No image provided for analysis');
  requireKey();

  const image = await toInlineImage(imageBase64);

  const data = await callGemini(ANALYSIS_MODEL, {
    contents: [
      {
        role: 'user',
        parts: [
          { inline_data: { mime_type: image.mimeType, data: image.data } },
          {
            text: `Analyze the clothing items in this image and return ONLY a valid JSON array.
Each item in the array must have these exact fields:
- type: clothing type (e.g. "T-Shirt", "Jeans", "Dress", "Jacket")
- style: style descriptor (e.g. "Casual", "Formal", "Streetwear")
- color: primary color name
- pattern: pattern (e.g. "Solid", "Striped", "Floral", "Check")
- category: "Women" or "Men"
- occasion: best occasion (e.g. "Casual", "Office", "Evening")
- season: best season (e.g. "Summer", "Winter", "All Season")
- description: one sentence description

Respond with ONLY the JSON array, no markdown, no explanation.`,
          },
        ],
      },
    ],
    generationConfig: { responseMimeType: 'application/json' },
  });

  const text: string =
    data.candidates?.[0]?.content?.parts?.map((p: any) => p.text || '').join('') || '[]';

  try {
    const clean = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    console.error('Failed to parse clothing analysis:', text);
    return [];
  }
}

/**
 * Generates a try-on image: the person from the first photo wearing the garment from the second.
 * @param personImageUrl - base64 data URL of the person photo
 * @param garmentImageUrl - base64 data URL or http(s) URL of the garment photo
 * @returns a data URL of the generated image
 */
export async function virtualTryOn(
  personImageUrl: string,
  garmentImageUrl?: string
): Promise<string> {
  requireKey();

  if (!garmentImageUrl) {
    throw new Error('Please select a garment from the store before generating a try-on.');
  }

  const [person, garment] = await Promise.all([
    toInlineImage(personImageUrl),
    toInlineImage(garmentImageUrl),
  ]);

  const data = await callGemini(TRYON_MODEL, {
    contents: [
      {
        role: 'user',
        parts: [
          {
            text:
              'The first image is a photo of a person. The second image is a garment. ' +
              'Generate a realistic photo of the same person wearing this garment. ' +
              'Keep the person\'s face, body shape, pose, skin tone and the background exactly as in the first image. ' +
              'Only change the clothing, and make the garment fit naturally.',
          },
          { inline_data: { mime_type: person.mimeType, data: person.data } },
          { inline_data: { mime_type: garment.mimeType, data: garment.data } },
        ],
      },
    ],
    generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
  });

  const parts: any[] = data.candidates?.[0]?.content?.parts || [];
  const imagePart = parts.find((p) => p.inlineData || p.inline_data);
  const inline = imagePart?.inlineData || imagePart?.inline_data;

  if (!inline?.data) {
    const reason = parts.map((p) => p.text).filter(Boolean).join(' ');
    throw new Error(reason || 'Gemini did not return an image. Try a clearer photo of yourself.');
  }

  const mime = inline.mimeType || inline.mime_type || 'image/png';
  return `data:${mime};base64,${inline.data}`;
}
