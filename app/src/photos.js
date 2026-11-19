// Photo loading for the cover maker. Photos come from the two samples shipped under
// app/samples/ (made for make.fun with an image model, free to use) or from files the person
// picks on their own machine: a picked file is read through an object URL in this page only
// and is never uploaded anywhere — the app makes no network request at all.

/** The sample photos bundled with the app, so a cover can be made without uploading. */
export const SAMPLE_PHOTOS = [
  { id: 'boulevard', src: 'samples/boulevard.jpg', name: 'Sample · Boulevard' },
  { id: 'pier', src: 'samples/pier.jpg', name: 'Sample · Pier' },
];

/** Loads an image from a URL, resolving to the image once it can be drawn. */
export function loadImageFromUrl(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/** Loads one of the bundled sample photos by id ('boulevard' or 'pier'). */
export async function loadSamplePhoto(id) {
  const sample = SAMPLE_PHOTOS.find((s) => s.id === id) ?? SAMPLE_PHOTOS[0];
  const img = await loadImageFromUrl(sample.src);
  return { img, name: sample.name };
}

/** Loads every bundled sample photo, in SAMPLE_PHOTOS order. */
export async function loadAllSamplePhotos() {
  const out = [];
  for (const sample of SAMPLE_PHOTOS) out.push(await loadSamplePhoto(sample.id));
  return out;
}

/** Loads a photo the person picked, from their machine only. */
export async function loadPickedPhoto(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImageFromUrl(url);
    return { img, name: file.name.replace(/\.[a-z0-9]+$/i, '') };
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }
}
