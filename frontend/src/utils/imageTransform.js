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

function buildFileName(baseName, extension) {
  const safeBaseName = String(baseName || 'document')
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    || 'document';

  return `${safeBaseName}${extension}`;
}

function inferOptimizedMimeType(file) {
  const type = String(file?.type || '').toLowerCase();

  if (type === 'image/png') {
    return 'image/png';
  }

  if (type === 'image/webp') {
    return 'image/webp';
  }

  return 'image/jpeg';
}

function inferOptimizedExtension(mimeType) {
  switch (mimeType) {
    case 'image/png':
      return '.png';
    case 'image/webp':
      return '.webp';
    default:
      return '.jpg';
  }
}

function isOptimizableDocumentImage(file) {
  const type = String(file?.type || '').toLowerCase();
  return type.startsWith('image/')
    && !type.includes('svg')
    && !type.includes('gif');
}

async function createImageFromFile(file) {
  const objectUrl = URL.createObjectURL(file);
  try {
    return await createImage(objectUrl);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
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

export async function optimizeDocumentImageUpload(file, options = {}) {
  if (!isOptimizableDocumentImage(file)) {
    return {
      file,
      optimized: false,
      reason: 'not-image'
    };
  }

  const minBytes = Number.isFinite(options.minBytes) ? Math.max(128 * 1024, Math.floor(options.minBytes)) : 900 * 1024;
  const maxDimension = Number.isFinite(options.maxDimension) ? Math.max(1200, Math.floor(options.maxDimension)) : 2200;
  const quality = Number.isFinite(options.quality) ? clamp(options.quality, 0.72, 0.95) : 0.9;

  if (file.size < minBytes) {
    return {
      file,
      optimized: false,
      reason: 'small-file'
    };
  }

  let image;
  try {
    image = await createImageFromFile(file);
  } catch {
    return {
      file,
      optimized: false,
      reason: 'decode-failed'
    };
  }

  const sourceWidth = image.width || 0;
  const sourceHeight = image.height || 0;
  const largestSide = Math.max(sourceWidth, sourceHeight);

  if (largestSide <= maxDimension && file.size < minBytes * 1.35) {
    return {
      file,
      optimized: false,
      reason: 'already-reasonable',
      width: sourceWidth,
      height: sourceHeight
    };
  }

  const scale = largestSide > maxDimension ? maxDimension / largestSide : 1;
  const targetWidth = Math.max(1, Math.round(sourceWidth * scale));
  const targetHeight = Math.max(1, Math.round(sourceHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const context = canvas.getContext('2d');
  if (!context) {
    return {
      file,
      optimized: false,
      reason: 'canvas-unsupported'
    };
  }

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';

  const outputMimeType = inferOptimizedMimeType(file);
  if (outputMimeType === 'image/jpeg') {
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, targetWidth, targetHeight);
  }

  context.drawImage(image, 0, 0, targetWidth, targetHeight);

  const candidateBlob = await canvasToBlob(canvas, outputMimeType, outputMimeType === 'image/png' ? undefined : quality);
  if (!candidateBlob) {
    return {
      file,
      optimized: false,
      reason: 'encode-failed'
    };
  }

  const dimensionReduced = targetWidth < sourceWidth || targetHeight < sourceHeight;
  const sizeImprovedEnough = candidateBlob.size <= file.size * 0.92;
  const acceptCandidate = candidateBlob.size > 0
    && candidateBlob.size <= file.size
    && (sizeImprovedEnough || dimensionReduced);

  if (!acceptCandidate) {
    return {
      file,
      optimized: false,
      reason: 'no-meaningful-gain',
      width: sourceWidth,
      height: sourceHeight
    };
  }

  const optimizedFile = new File(
    [candidateBlob],
    buildFileName(file.name, inferOptimizedExtension(candidateBlob.type || outputMimeType)),
    {
      type: candidateBlob.type || outputMimeType,
      lastModified: Date.now()
    }
  );

  return {
    file: optimizedFile,
    optimized: true,
    originalBytes: file.size,
    optimizedBytes: optimizedFile.size,
    width: sourceWidth,
    height: sourceHeight,
    optimizedWidth: targetWidth,
    optimizedHeight: targetHeight
  };
}
