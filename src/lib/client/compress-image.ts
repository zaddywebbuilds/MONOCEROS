/**
 * Shrinks a photographed document in the browser before it is uploaded.
 *
 * Vercel rejects any request body over 4.5MB at the edge, before the server
 * action runs, so an oversized upload cannot be caught and explained the way a
 * normal validation failure is — it surfaces as the generic error boundary.
 * A phone photo of an ID card is routinely 4-10MB, which made identity
 * verification fail for exactly the people using a decent camera.
 *
 * Re-encoding at a bounded edge length fixes that at source: a document photo
 * at 2000px and quality 0.82 lands around 400-700KB and stays comfortably
 * legible for compliance review, so the limit stops being something the
 * investor has to think about.
 */

/** Longest edge kept, in pixels. Small print on an ID stays readable here. */
const MAX_EDGE = 2000;

/** Starting JPEG quality. Stepped down only if the result is still too large. */
const INITIAL_QUALITY = 0.82;
const MIN_QUALITY = 0.5;

/** Ceiling to aim for. Well under the platform's 4.5MB so form fields fit too. */
const TARGET_BYTES = 3 * 1024 * 1024;

const COMPRESSIBLE = new Set(["image/jpeg", "image/png", "image/webp"]);

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
}

/**
 * Returns a smaller JPEG when the input is a compressible image, and the
 * original file otherwise. Never throws: a PDF, an unsupported browser or a
 * decode failure all fall back to the original, which the caller's own size
 * check still guards.
 */
export async function compressImage(file: File): Promise<File> {
  if (!COMPRESSIBLE.has(file.type)) return file;
  if (typeof createImageBitmap !== "function" || typeof document === "undefined") return file;

  try {
    // from-image applies the EXIF rotation a phone camera records, so a photo
    // taken in portrait is not stored on its side for the reviewer.
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });

    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) {
      bitmap.close();
      return file;
    }

    // A white ground keeps a transparent PNG from flattening to black once it
    // becomes a JPEG.
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    let quality = INITIAL_QUALITY;
    let blob = await canvasToBlob(canvas, quality);

    while (blob && blob.size > TARGET_BYTES && quality > MIN_QUALITY) {
      quality = Math.max(MIN_QUALITY, quality - 0.12);
      blob = await canvasToBlob(canvas, quality);
    }

    if (!blob) return file;
    // Re-encoding can enlarge an already-optimised small image; keep whichever
    // is actually smaller.
    if (blob.size >= file.size) return file;

    const name = file.name.replace(/\.[^./\\]+$/, "") || "document";
    return new File([blob], `${name}.jpg`, { type: "image/jpeg", lastModified: Date.now() });
  } catch {
    return file;
  }
}

/**
 * Puts a file back into a file input so the plain form submission carries the
 * compressed version. Returns false where DataTransfer is unavailable and the
 * caller should keep whatever the input already holds.
 */
export function replaceInputFile(input: HTMLInputElement, file: File): boolean {
  try {
    if (typeof DataTransfer !== "function") return false;
    const transfer = new DataTransfer();
    transfer.items.add(file);
    input.files = transfer.files;
    return true;
  } catch {
    return false;
  }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
