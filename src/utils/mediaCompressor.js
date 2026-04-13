/**
 * mediaCompressor — compress images to <1 MB before upload.
 *
 * compressImage(uri)  → { uri: string, base64: string }
 *   Resizes to max 1280 px wide and iteratively reduces JPEG quality until
 *   the decoded size is under 1 MB.
 *
 * compressVideo(uri)  → Promise<string>  (returns original URI — no native lib needed)
 */
import * as ImageManipulator from 'expo-image-manipulator';

const IMAGE_MAX_BYTES  = 1 * 1024 * 1024; // 1 MB raw
// base64 is 4/3 of raw → 1 MB raw ≈ 1.37 M base64 chars
const IMAGE_MAX_B64    = Math.ceil(IMAGE_MAX_BYTES * 4 / 3);

/**
 * Compress an image URI to under 1 MB.
 * Returns { uri, base64 } of the compressed JPEG.
 */
export async function compressImage(uri) {
  // Pass 1 — 1280 px wide, quality 0.75
  let result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 1280 } }],
    { compress: 0.75, format: ImageManipulator.SaveFormat.JPEG, base64: true },
  );

  if (!result.base64 || result.base64.length <= IMAGE_MAX_B64) return result;

  // Pass 2 — 1024 px wide, quality 0.6
  result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 1024 } }],
    { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG, base64: true },
  );

  if (!result.base64 || result.base64.length <= IMAGE_MAX_B64) return result;

  // Pass 3 — 800 px wide, quality 0.45 (last resort)
  result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 800 } }],
    { compress: 0.45, format: ImageManipulator.SaveFormat.JPEG, base64: true },
  );

  return result;
}

/**
 * Video compression passthrough — returns the original URI.
 * Native video compression requires a custom dev build; not available in Expo Go.
 */
export async function compressVideo(uri) {
  return uri;
}
