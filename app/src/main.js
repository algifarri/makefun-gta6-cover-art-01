// VICEFRAME studio wiring: photos in, panels arranged, words set, grade tuned, PNG out.
// The whole flow is a few steps — add photos (or use the samples), pick a panel layout,
// click a panel to frame its photo, type the title, export at a post size. Everything runs
// locally in the page; picked photos are read from the person's machine and never uploaded.

import { LAYOUTS, POST_SIZES, panelsFor } from './panels.js';
import { drawCoverArt, renderCoverCanvas } from './render.js';
import { loadAllSamplePhotos, loadPickedPhoto, loadSamplePhoto } from './photos.js';
import { readShotRequest, enterShotMode, markShotReady } from './shots.js';

const $ = (id) => document.getElementById(id);
const canvas = $('cover');
const ctx = canvas.getContext('2d');
const status = $('status');

const state = {
  layoutId: 'classic',
  sizeId: '1080x1080',
  title: 'VICE\nHEAT',
  subtitle: 'PORT SOLACE · EST. 2026',
  grade: 0.9,
  badge: true,
  selected: 0,
};
let photos = []; // [{ img, name }]
let slots = []; // [{ photo, zoom, ox, oy }] one per panel of the current layout and size

function currentSize() {
  return POST_SIZES.find((s) => s.id === state.sizeId) ?? POST_SIZES[0];
}

function panelCount() {
  const s = currentSize();
  return panelsFor(state.layoutId, s.w, s.h).length;
}

/** Keeps one framing slot per panel, assigning photos round-robin as panels appear. */
function ensureSlots() {
  const n = panelCount();
  while (slots.length < n) {
    slots.push({ photo: slots.length % Math.max(1, photos.length), zoom: 1, ox: 0, oy: 0 });
  }
  slots.length = n;
  if (state.selected >= n) state.selected = 0;
}

/** The renderer-facing state: slots resolved to the images they frame. */
function renderState() {
  return {
    layoutId: state.layoutId,
    slots: slots.map((s) => ({ img: photos[s.photo]?.img ?? null, zoom: s.zoom, ox: s.ox, oy: s.oy })),
    title: state.title,
    subtitle: state.subtitle,
    grade: state.grade,
    badge: state.badge,
  };
}

function redraw() {
  ensureSlots();
  const s = currentSize();
  if (canvas.width !== s.w || canvas.height !== s.h) { canvas.width = s.w; canvas.height = s.h; }
  drawCoverArt(ctx, s.w, s.h, renderState());
  syncPanelControls();
}

/** Rebuilds the per-panel photo picker from the photo list. */
function rebuildPhotoOptions() {
  const select = $('panelPhoto');
  select.innerHTML = '';
  photos.forEach((photo, i) => {
    const option = document.createElement('option');
    option.value = String(i);
    option.textContent = photo.name;
    select.appendChild(option);
  });
  $('photoList').textContent = photos.length
    ? photos.map((p) => p.name).join(' · ')
    : 'No photos yet — add your own or use the samples.';
}

/** Shows the selected panel's framing in the panel controls. */
function syncPanelControls() {
  const slot = slots[state.selected];
  if (!slot) return;
  $('panelTitle').textContent = `Panel ${state.selected + 1} of ${slots.length}`;
  $('panelPhoto').value = String(Math.min(slot.photo, Math.max(0, photos.length - 1)));
  $('zoom').value = String(Math.round(slot.zoom * 100));
  $('offsetX').value = String(Math.round(slot.ox * 100));
  $('offsetY').value = String(Math.round(slot.oy * 100));
}

/** Builds the layout buttons and the size picker from the layout/size tables. */
function buildControls() {
  const group = $('layouts');
  Object.entries(LAYOUTS).forEach(([id, layout]) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = layout.label;
    button.dataset.layout = id;
    if (id === state.layoutId) button.classList.add('active');
    button.addEventListener('click', () => {
      state.layoutId = id;
      state.selected = 0;
      group.querySelectorAll('button').forEach((b) => b.classList.toggle('active', b.dataset.layout === id));
      redraw();
    });
    group.appendChild(button);
  });
  const sizeSelect = $('size');
  POST_SIZES.forEach((size) => {
    const option = document.createElement('option');
    option.value = size.id;
    option.textContent = size.label;
    sizeSelect.appendChild(option);
  });
  sizeSelect.value = state.sizeId;
}

function download(canvasEl, filename) {
  canvasEl.toBlob((blob) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    status.textContent = `Saved ${filename}`;
  }, 'image/png');
}

function wireEditor() {
  $('photo').addEventListener('change', async (e) => {
    const files = [...e.target.files];
    for (const file of files) photos.push(await loadPickedPhoto(file));
    if (files.length) status.textContent = `${photos.length} photo(s) ready — click a panel to frame one.`;
    rebuildPhotoOptions();
    redraw();
  });
  $('useSamples').addEventListener('click', async () => {
    photos = await loadAllSamplePhotos();
    slots = [];
    status.textContent = 'Samples loaded — the boulevard and the pier.';
    rebuildPhotoOptions();
    redraw();
  });
  $('title').addEventListener('input', (e) => { state.title = e.target.value; redraw(); });
  $('subtitle').addEventListener('input', (e) => { state.subtitle = e.target.value; redraw(); });
  $('grade').addEventListener('input', (e) => { state.grade = Number(e.target.value) / 100; redraw(); });
  $('badge').addEventListener('change', (e) => { state.badge = e.target.checked; redraw(); });
  $('size').addEventListener('change', (e) => { state.sizeId = e.target.value; redraw(); });
  $('panelPhoto').addEventListener('change', (e) => { slots[state.selected].photo = Number(e.target.value); redraw(); });
  $('zoom').addEventListener('input', (e) => { slots[state.selected].zoom = Number(e.target.value) / 100; redraw(); });
  $('offsetX').addEventListener('input', (e) => { slots[state.selected].ox = Number(e.target.value) / 100; redraw(); });
  $('offsetY').addEventListener('input', (e) => { slots[state.selected].oy = Number(e.target.value) / 100; redraw(); });
  $('fillAll').addEventListener('click', () => {
    const photo = slots[state.selected].photo;
    slots.forEach((s) => { s.photo = photo; });
    status.textContent = 'Every panel now frames that photo — vary the zoom per panel for the poster look.';
    redraw();
  });
  $('export').addEventListener('click', () => {
    const s = currentSize();
    download(renderCoverCanvas(document, renderState(), s.w, s.h), `viceframe-${state.layoutId}-${s.id}.png`);
  });
  $('exportAll').addEventListener('click', () => {
    POST_SIZES.forEach((s, i) => {
      setTimeout(() => download(renderCoverCanvas(document, renderState(), s.w, s.h), `viceframe-${state.layoutId}-${s.id}.png`), i * 400);
    });
  });
  // Drag on the preview pans the selected panel's photo; the wheel zooms it.
  let drag = null;
  canvas.addEventListener('pointerdown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width;
    const ny = (e.clientY - rect.top) / rect.height;
    const s = currentSize();
    const panels = panelsFor(state.layoutId, s.w, s.h);
    for (let i = panels.length - 1; i >= 0; i--) {
      const p = panels[i];
      if (nx >= p.x && nx <= p.x + p.w && ny >= p.y && ny <= p.y + p.h) { state.selected = i; break; }
    }
    drag = { x: e.clientX, y: e.clientY };
    canvas.setPointerCapture(e.pointerId);
    redraw();
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const rect = canvas.getBoundingClientRect();
    const slot = slots[state.selected];
    slot.ox = Math.max(-1, Math.min(1, slot.ox + ((e.clientX - drag.x) / rect.width) * 1.6));
    slot.oy = Math.max(-1, Math.min(1, slot.oy + ((e.clientY - drag.y) / rect.height) * 1.6));
    drag = { x: e.clientX, y: e.clientY };
    redraw();
  });
  canvas.addEventListener('pointerup', () => { drag = null; });
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const slot = slots[state.selected];
    slot.zoom = Math.max(1, Math.min(3, slot.zoom * (e.deltaY < 0 ? 1.07 : 0.93)));
    redraw();
  }, { passive: false });
  const stage = $('stage');
  stage.addEventListener('dragover', (e) => e.preventDefault());
  stage.addEventListener('drop', async (e) => {
    e.preventDefault();
    for (const file of [...e.dataTransfer.files].filter((f) => f.type.startsWith('image/'))) {
      photos.push(await loadPickedPhoto(file));
    }
    rebuildPhotoOptions();
    redraw();
  });
}

/** Sets the editor's fields from the state, for the editor screenshot scene. */
function reflectStateInFields() {
  $('title').value = state.title;
  $('subtitle').value = state.subtitle;
  $('grade').value = String(Math.round(state.grade * 100));
  $('badge').checked = state.badge;
  $('size').value = state.sizeId;
  document.querySelectorAll('#layouts button').forEach((b) => b.classList.toggle('active', b.dataset.layout === state.layoutId));
}

async function init() {
  buildControls();
  wireEditor();
  const shot = readShotRequest();
  try { await Promise.race([document.fonts.load('80px Anton'), new Promise((r) => setTimeout(r, 2500))]); } catch { /* fall back silently */ }
  if (shot) {
    enterShotMode(shot.scene);
    state.layoutId = shot.layout;
    state.title = shot.title;
    state.subtitle = shot.subtitle;
    state.grade = Math.max(0, Math.min(1, shot.grade));
    if (POST_SIZES.some((s) => s.id === shot.size)) state.sizeId = shot.size;
    photos = [];
    for (const id of shot.photos) photos.push(await loadSamplePhoto(id));
    slots = shot.photos.map((_, i) => ({ photo: i % photos.length, zoom: 1, ox: 0, oy: 0, ...(shot.frames[i] ?? {}) }));
    reflectStateInFields();
    rebuildPhotoOptions();
    redraw();
    markShotReady();
    return;
  }
  photos = await loadAllSamplePhotos();
  rebuildPhotoOptions();
  redraw();
}

init();
