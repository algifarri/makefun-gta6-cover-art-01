// Fixed scenes for screenshots, driven by the ?shot= query (see shots.json). A cover scene
// shows one exported cover alone at its post size; the editor scene shows the whole studio
// with sample photos loaded. window.__shotReady is set once the scene is fully painted, so
// the screenshot tool can wait for fonts and photos instead of guessing a delay.

/** Parses the shot request from the URL, or returns null for a normal visit. */
export function readShotRequest() {
  const query = new URLSearchParams(location.search);
  const scene = query.get('shot');
  if (!scene) return null;
  return {
    scene,
    layout: query.get('layout') ?? 'classic',
    size: query.get('size') ?? '1080x1080',
    title: (query.get('title') ?? 'VICE HEAT').replaceAll('|', '\n'),
    subtitle: query.get('subtitle') ?? 'PORT SOLACE · EST. 2026',
    photos: (query.get('photos') ?? 'boulevard,pier').split(',').filter(Boolean),
    grade: Number(query.get('grade') ?? '0.9'),
    frames: parseFrames(query.get('frame')),
  };
}

/**
 * Parses the optional per-panel framing, 'zoom,ox,oy;zoom,ox,oy' per panel, so a shot scene
 * can frame faces into their panels exactly as a person would with the panel controls.
 */
export function parseFrames(text) {
  if (!text) return [];
  return text.split(';').map((part) => {
    const [zoom = '1', ox = '0', oy = '0'] = part.split(',');
    return { zoom: Number(zoom) || 1, ox: Number(ox) || 0, oy: Number(oy) || 0 };
  });
}

/** Switches the page into a shot scene's presentation (cover alone, or the full editor). */
export function enterShotMode(scene) {
  document.body.classList.add(scene === 'editor' ? 'shot-editor' : 'shot-cover');
}

/** Parses a '1920x1080' size string into { w, h }, falling back to the square post size. */
export function parseSize(text) {
  const match = /^(\d+)x(\d+)$/.exec(text ?? '');
  if (!match) return { w: 1080, h: 1080 };
  return { w: Number(match[1]), h: Number(match[2]) };
}

/** Marks the scene painted: two animation frames after this call, captures may begin. */
export function markShotReady() {
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
