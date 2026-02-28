function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Failed to encode image'));
        return;
      }
      resolve(blob);
    }, type, quality);
  });
}

export async function prepareImageAttachment(file, maxBytes = 350 * 1024) {
  if (!file?.type?.startsWith('image/')) {
    throw new Error('Only image uploads are supported');
  }

  if (file.size <= maxBytes) {
    return readFileAsDataUrl(file);
  }

  const sourceUrl = await readFileAsDataUrl(file);
  const image = await loadImage(sourceUrl);
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0);

  for (const type of ['image/webp', 'image/jpeg']) {
    for (const quality of [0.92, 0.85, 0.78, 0.7, 0.6, 0.5, 0.4]) {
      const blob = await canvasToBlob(canvas, type, quality);
      if (blob.size <= maxBytes) {
        return readFileAsDataUrl(blob);
      }
    }
  }

  const fallbackBlob = await canvasToBlob(canvas, 'image/jpeg', 0.3);
  return readFileAsDataUrl(fallbackBlob);
}
