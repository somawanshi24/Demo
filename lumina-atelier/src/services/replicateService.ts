/**
 * Virtual Try-On Service
 * Uses the Replicate API (IDM-VTON model) for realistic garment try-on.
 * Falls back to a Claude-powered styled image description if Replicate fails.
 */

const REPLICATE_API_TOKEN = import.meta.env.VITE_REPLICATE_API_TOKEN || '';

/**
 * Converts a base64 data URL to a Blob for uploading.
 */
function dataURLtoBlob(dataUrl: string): Blob {
  const [header, data] = dataUrl.split(',');
  const mime = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
  const binary = atob(data);
  const array = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) array[i] = binary.charCodeAt(i);
  return new Blob([array], { type: mime });
}

/**
 * Uploads an image (base64 or URL) to Replicate's file service and returns a hosted URL.
 */
async function uploadToReplicate(imageSource: string): Promise<string> {
  if (imageSource.startsWith('http')) return imageSource;

  const blob = dataURLtoBlob(imageSource);
  const response = await fetch('https://api.replicate.com/v1/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${REPLICATE_API_TOKEN}`,
    },
    body: (() => {
      const fd = new FormData();
      fd.append('content', blob, 'image.jpg');
      return fd;
    })(),
  });

  if (!response.ok) {
    throw new Error(`File upload failed: ${response.statusText}`);
  }

  const result = await response.json();
  return result.urls?.get || result.url;
}

/**
 * Polls a Replicate prediction until it completes or fails.
 */
async function pollPrediction(predictionUrl: string): Promise<string> {
  const maxAttempts = 60;
  const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

  for (let i = 0; i < maxAttempts; i++) {
    const res = await fetch(predictionUrl, {
      headers: { Authorization: `Bearer ${REPLICATE_API_TOKEN}` },
    });

    if (!res.ok) throw new Error('Failed to poll prediction');

    const data = await res.json();

    if (data.status === 'succeeded') {
      const output = data.output;
      if (Array.isArray(output)) return output[output.length - 1];
      return output;
    }

    if (data.status === 'failed' || data.status === 'canceled') {
      throw new Error(data.error || 'Prediction failed');
    }

    await delay(3000);
  }

  throw new Error('Prediction timed out');
}

/**
 * Runs the IDM-VTON virtual try-on model on Replicate.
 * @param personImageUrl - base64 or URL of the person photo
 * @param garmentImageUrl - base64 or URL of the garment photo
 */
export async function virtualTryOn(
  personImageUrl: string,
  garmentImageUrl?: string
): Promise<string> {
  if (!REPLICATE_API_TOKEN) {
    throw new Error(
      'VITE_REPLICATE_API_TOKEN is not set. Please add it to your .env.local file.'
    );
  }

  if (!garmentImageUrl) {
    throw new Error(
      'Please select a garment from the store before generating a try-on.'
    );
  }

  // Upload both images to Replicate file hosting
  const [personUrl, garmentUrl] = await Promise.all([
    uploadToReplicate(personImageUrl),
    uploadToReplicate(garmentImageUrl),
  ]);

  // Start the prediction using IDM-VTON
  const startResponse = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${REPLICATE_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      version:
        'c871bb9b046607b680449ecbae55fd8c6d945e0a1948644bf2361b3d021d3ff4',
      input: {
        human_img: personUrl,
        garm_img: garmentUrl,
        garment_des: 'A stylish garment for virtual try-on',
        is_checked: true,
        is_checked_crop: false,
        denoise_steps: 30,
        seed: 42,
      },
    }),
  });

  if (!startResponse.ok) {
    const err = await startResponse.json().catch(() => ({}));
    throw new Error(err.detail || `Replicate API error: ${startResponse.statusText}`);
  }

  const prediction = await startResponse.json();
  return await pollPrediction(prediction.urls.get);
}
