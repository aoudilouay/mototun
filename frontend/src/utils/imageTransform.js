function createImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Impossible de charger limage'));
    image.src = source;
  });
}

function canvasToBlob(canvas, mimeType, quality) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob || null), mimeType, quality);
  });
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Impossible de lire le fichier image'));
    reader.readAsDataURL(file);
  });
}

export async function cropAndCompressAvatar(imageSource, cropArea, options = {}) {
  const targetSize = Number.isFinite(options.size) ? Math.max(128, Math.floor(options.size)) : 512;
  const preferredType = options.type || 'image/webp';
  const preferredQuality = Number.isFinite(options.quality) ? clamp(options.quality, 0.4, 0.95) : 0.82;

  const image = await createImage(imageSource);

  const x = clamp(Math.floor(cropArea?.x || 0), 0, Math.max(0, image.width - 1));
  const y = clamp(Math.floor(cropArea?.y || 0), 0, Math.max(0, image.height - 1));
  const width = clamp(Math.floor(cropArea?.width || image.width), 1, image.width - x);
  const height = clamp(Math.floor(cropArea?.height || image.height), 1, image.height - y);

  const canvas = document.createElement('canvas');
  canvas.width = targetSize;
  canvas.height = targetSize;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Votre navigateur ne supporte pas la compression image');
  }

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, targetSize, targetSize);
  context.drawImage(image, x, y, width, height, 0, 0, targetSize, targetSize);

  const primaryBlob = await canvasToBlob(canvas, preferredType, preferredQuality);
  const fallbackBlob = primaryBlob || await canvasToBlob(canvas, 'image/jpeg', 0.86);
  if (!fallbackBlob) {
    throw new Error('Impossible de compresser limage');
  }

  const extension = fallbackBlob.type === 'image/jpeg'
    ? '.jpg'
    : fallbackBlob.type === 'image/png'
      ? '.png'
      : '.webp';

  return new File([fallbackBlob], `avatar-${Date.now()}${extension}`, {
    type: fallbackBlob.type,
    lastModified: Date.now()
  });
}
