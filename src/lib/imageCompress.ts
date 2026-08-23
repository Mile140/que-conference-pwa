/**
 * Client-side image compression for the photo wall (spec §3.9): "Images
 * are compressed client-side before upload (target ~400 KB) ... thumbnails
 * are served in the feed." Pure Canvas API, no dependency -- resizes to a
 * max dimension and re-encodes as JPEG, retrying at a lower quality if the
 * first pass comes in over the target size.
 */
function loadImage(file: File | Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Canvas encoding failed"))), "image/jpeg", quality);
  });
}

export async function compressImage(
  file: File,
  maxDimension: number,
  targetBytes: number
): Promise<Blob> {
  const img = await loadImage(file);
  const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(img.width * scale));
  canvas.height = Math.max(1, Math.round(img.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  // First pass at a reasonable quality; if still over target, retry once
  // lower. Good enough for a conference photo feed without pulling in a
  // full binary-search compression library.
  let blob = await canvasToBlob(canvas, 0.82);
  if (blob.size > targetBytes) {
    blob = await canvasToBlob(canvas, 0.6);
  }
  return blob;
}
