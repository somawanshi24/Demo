/**
 * Clothing Analysis Service
 * Uses Claude API (claude-sonnet-4-20250514) to analyze garment images
 * and extract structured clothing data.
 */

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

/**
 * Analyzes a base64 image of clothing using Claude Vision.
 * @param imageBase64 - base64 data URL of the image
 * @returns Array of detected clothing items
 */
export async function analyzeClothing(imageBase64: string): Promise<ClothingDetection[]> {
  if (!imageBase64) throw new Error('No image provided for analysis');

  const base64Data = imageBase64.split(',')[1];
  const mimeType = imageBase64.startsWith('data:image/png') ? 'image/png' : 'image/jpeg';

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': import.meta.env.VITE_ANTHROPIC_API_KEY || '',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mimeType,
                data: base64Data,
              },
            },
            {
              type: 'text',
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
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Claude API error: ${response.status} – ${errText}`);
  }

  const data = await response.json();
  const text = data.content?.map((c: any) => c.text || '').join('') || '[]';

  try {
    const clean = text.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  } catch {
    console.error('Failed to parse clothing analysis:', text);
    return [];
  }
}
