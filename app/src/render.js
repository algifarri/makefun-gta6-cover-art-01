// The cover renderer: paints the multi-panel poster onto any 2D canvas context at any size.
// Photos are cover-fitted into each panel with a per-panel zoom and offset, graded with the
// Vice City sunset/neon treatment (purple shadows, hot pink and orange light, a soft-light
// punch), framed by white gutters, and finished with the masthead lettering, a subtitle pill,
// a star badge, vignette and grain. Everything drawn here is original: the lettering is the
// SIL-OFL Anton typeface shipped under app/fonts/, and no artwork but the user's photos is used.

import { panelsFor } from './panels.js';

export const TITLE_FONT = 'Anton, "Arial Black", sans-serif';

/** Deterministic PRNG (mulberry32) so the grain is identical on every run. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let grainPattern = null;
/** A small tile of monochrome noise, generated once and reused as a pattern. */
function grainTile(doc) {
  if (grainPattern) return grainPattern;
  const tile = doc.createElement('canvas');
  tile.width = 140; tile.height = 140;
  const tctx = tile.getContext('2d');
  const img = tctx.createImageData(140, 140);
  const rand = mulberry32(20261119);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 96 + Math.floor(rand() * 96);
    img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v; img.data[i + 3] = 255;
  }
  tctx.putImageData(img, 0, 0);
  grainPattern = tile;
  return tile;
}

/** Draws one photo cover-fitted into a box: zoom multiplies the fit, ox/oy (-1..1) pan it. */
function drawPhotoFitted(ctx, img, box, zoom, ox, oy) {
  const scale = Math.max(box.w / img.naturalWidth, box.h / img.naturalHeight) * zoom;
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  const dx = box.x + (box.w - dw) * (0.5 + ox / 2);
  const dy = box.y + (box.h - dh) * (0.5 + oy / 2);
  ctx.drawImage(img, dx, dy, dw, dh);
}

/** The sunset/neon grade painted over a photo inside its panel. */
function paintGrade(ctx, box, grade) {
  const g = grade;
  if (g <= 0.01) return;
  const diag = ctx.createLinearGradient(box.x, box.y, box.x + box.w * 0.35, box.y + box.h);
  diag.addColorStop(0, `rgba(43, 0, 92, ${0.42 * g})`);
  diag.addColorStop(0.42, 'rgba(43, 0, 92, 0)');
  diag.addColorStop(0.78, `rgba(255, 45, 120, ${0.30 * g})`);
  diag.addColorStop(1, `rgba(255, 122, 26, ${0.36 * g})`);
  ctx.fillStyle = diag;
  ctx.fillRect(box.x, box.y, box.w, box.h);
  ctx.save();
  ctx.globalCompositeOperation = 'soft-light';
  ctx.globalAlpha = 0.55 * g;
  const punch = ctx.createLinearGradient(box.x, box.y, box.x, box.y + box.h);
  punch.addColorStop(0, '#ffffff');
  punch.addColorStop(0.5, '#808080');
  punch.addColorStop(1, '#000000');
  ctx.fillStyle = punch;
  ctx.fillRect(box.x, box.y, box.w, box.h);
  ctx.restore();
  const glow = ctx.createRadialGradient(
    box.x + box.w / 2, box.y + box.h * 1.02, box.h * 0.1,
    box.x + box.w / 2, box.y + box.h * 1.02, box.h * 0.95,
  );
  glow.addColorStop(0, `rgba(255, 166, 66, ${0.28 * g})`);
  glow.addColorStop(1, 'rgba(255, 166, 66, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(box.x, box.y, box.w, box.h);
}

/** Paints one panel: white frame, clipped graded photo, and a dark inner edge. */
function paintPanel(ctx, box, slot, grade, frame) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(box.x, box.y, box.w, box.h);
  ctx.clip();
  ctx.fillStyle = '#3a1052';
  ctx.fillRect(box.x, box.y, box.w, box.h);
  if (slot && slot.img) {
    ctx.save();
    ctx.filter = `saturate(${1 + 0.5 * grade}) contrast(${1 + 0.13 * grade}) brightness(${1 + 0.04 * grade})`;
    drawPhotoFitted(ctx, slot.img, box, slot.zoom, slot.ox, slot.oy);
    ctx.restore();
    paintGrade(ctx, box, grade);
  } else {
    paintGrade(ctx, box, Math.max(grade, 0.65));
  }
  ctx.restore();
  ctx.strokeStyle = 'rgba(10, 2, 24, 0.28)';
  ctx.lineWidth = Math.max(2, frame * 0.22);
  ctx.strokeRect(box.x, box.y, box.w, box.h);
}

/** A twelve-point star path centred on (cx, cy), for the badge. */
function starPath(ctx, cx, cy, outer, inner, points, rotation) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = rotation + (i * Math.PI) / points;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

/** The star badge in the bottom-right corner: an original carnival-style seal. */
function paintBadge(ctx, w, h) {
  const r = Math.min(w, h) * 0.082;
  const cx = w - r * 1.28;
  const cy = h - r * 1.3;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.21);
  starPath(ctx, 0, 0, r, r * 0.78, 12, -Math.PI / 2);
  const fill = ctx.createLinearGradient(0, -r, 0, r);
  fill.addColorStop(0, '#ffb03a');
  fill.addColorStop(1, '#ff2e88');
  ctx.fillStyle = fill;
  ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
  ctx.shadowBlur = r * 0.22;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.lineWidth = r * 0.07;
  ctx.strokeStyle = '#1c0730';
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${r * 0.34}px ${TITLE_FONT}`;
  ctx.fillText('COVER', 0, -r * 0.18);
  ctx.fillText('STAR', 0, r * 0.2);
  ctx.restore();
}

/** The masthead: stacked title lines in gradient lettering with a neon glow and hard outline. */
function paintMasthead(ctx, w, h, title) {
  const lines = title.split('\n').map((s) => s.trim().toUpperCase()).filter(Boolean);
  if (!lines.length) return;
  let size = h * 0.185;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const fit = () => {
    ctx.font = `${size}px ${TITLE_FONT}`;
    return Math.max(...lines.map((line) => ctx.measureText(line).width));
  };
  while (fit() > w * 0.93 && size > 14) size *= 0.94;
  const lineHeight = size * 0.94;
  ctx.save();
  ctx.transform(1, 0, -0.055, 1, 0, 0);
  lines.forEach((line, i) => {
    const y = h * 0.055 + size + i * lineHeight;
    const grad = ctx.createLinearGradient(0, y - size, 0, y);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.55, '#ffd9ec');
    grad.addColorStop(1, '#ff5da2');
    ctx.font = `${size}px ${TITLE_FONT}`;
    ctx.lineJoin = 'round';
    ctx.shadowColor = 'rgba(255, 45, 150, 0.6)';
    ctx.shadowBlur = size * 0.16;
    ctx.shadowOffsetY = size * 0.045;
    ctx.lineWidth = size * 0.17;
    ctx.strokeStyle = '#180826';
    ctx.strokeText(line, w / 2, y);
    ctx.shadowBlur = 0;
    ctx.fillStyle = grad;
    ctx.fillText(line, w / 2, y);
  });
  ctx.restore();
}

/** The subtitle, letter-spaced capitals on a dark pill with a neon edge, bottom centre. */
function paintSubtitle(ctx, w, h, subtitle) {
  const text = subtitle.trim().toUpperCase();
  if (!text) return;
  const size = Math.min(w, h) * 0.034;
  ctx.save();
  ctx.font = `${size}px ${TITLE_FONT}`;
  try { ctx.letterSpacing = `${size * 0.32}px`; } catch { /* older engines: spacing is a bonus */ }
  const tw = ctx.measureText(text).width + size * 0.32 * text.length;
  const pw = tw + size * 1.7;
  const ph = size * 1.9;
  const px = (w - pw) / 2;
  const py = h - ph - h * 0.035;
  ctx.beginPath();
  ctx.roundRect(px, py, pw, ph, ph / 2);
  ctx.fillStyle = 'rgba(12, 3, 26, 0.78)';
  ctx.fill();
  ctx.lineWidth = Math.max(2, size * 0.09);
  ctx.strokeStyle = '#ff5da2';
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, w / 2 + (size * 0.16), py + ph / 2 + size * 0.04);
  ctx.restore();
}

/**
 * Paints the whole cover. `state` is the editor's cover state:
 * { layoutId, slots: [{img, zoom, ox, oy}], title, subtitle, grade, badge }.
 */
export function drawCoverArt(ctx, w, h, state) {
  const panels = panelsFor(state.layoutId, w, h);
  const gap = Math.max(5, Math.round(w * 0.007));
  ctx.save();
  ctx.fillStyle = '#fdf7ef';
  ctx.fillRect(0, 0, w, h);
  panels.forEach((panel, i) => {
    const box = {
      x: panel.x * w + gap / 2, y: panel.y * h + gap / 2,
      w: panel.w * w - gap, h: panel.h * h - gap,
    };
    if (i > 0 && state.layoutId === 'poster') {
      // The inset panel sits on top of the hero with its own heavy frame and shadow.
      ctx.save();
      ctx.shadowColor = 'rgba(8, 0, 18, 0.55)';
      ctx.shadowBlur = gap * 2.4;
      ctx.fillStyle = '#fdf7ef';
      ctx.fillRect(box.x - gap * 0.9, box.y - gap * 0.9, box.w + gap * 1.8, box.h + gap * 1.8);
      ctx.restore();
    }
    paintPanel(ctx, box, state.slots[i], state.grade, gap);
  });
  // Legibility shades behind the lettering.
  const topShade = ctx.createLinearGradient(0, 0, 0, h * 0.34);
  topShade.addColorStop(0, 'rgba(16, 2, 32, 0.30)');
  topShade.addColorStop(1, 'rgba(16, 2, 32, 0)');
  ctx.fillStyle = topShade;
  ctx.fillRect(0, 0, w, h * 0.34);
  const bottomShade = ctx.createLinearGradient(0, h * 0.72, 0, h);
  bottomShade.addColorStop(0, 'rgba(16, 2, 32, 0)');
  bottomShade.addColorStop(1, 'rgba(16, 2, 32, 0.34)');
  ctx.fillStyle = bottomShade;
  ctx.fillRect(0, h * 0.72, w, h * 0.28);
  paintMasthead(ctx, w, h, state.title);
  paintSubtitle(ctx, w, h, state.subtitle);
  if (state.badge) paintBadge(ctx, w, h);
  // Vignette and grain, the print finish.
  const vig = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.max(w, h) * 0.78);
  vig.addColorStop(0, 'rgba(12, 0, 24, 0)');
  vig.addColorStop(1, 'rgba(12, 0, 24, 0.30)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = 0.055;
  ctx.fillStyle = ctx.createPattern(grainTile(ctx.canvas.ownerDocument), 'repeat');
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
  ctx.restore();
}

/** Renders a cover state onto a fresh canvas at an exact export size and returns the canvas. */
export function renderCoverCanvas(doc, state, w, h) {
  const canvas = doc.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  drawCoverArt(canvas.getContext('2d'), w, h, state);
  return canvas;
}
