// Panel layouts for the cover maker. Every layout is a set of rectangles in normalised
// coordinates (0..1 across the cover); the renderer insets each one by the frame gap, so the
// white gutters between panels read as the classic multi-panel poster grid. Layouts adapt to
// the cover's aspect: 'square' (1080x1080), 'portrait' (1080x1350) and 'landscape' (1920x1080).

/** Aspect group for a cover size: 'landscape' when wider than tall, 'portrait' when taller. */
export function aspectGroup(width, height) {
  if (width > height) return 'landscape';
  if (height > width) return 'portrait';
  return 'square';
}

const rect = (x, y, w, h) => ({ x, y, w, h });

// The four layouts. Each entry maps an aspect group to its panel rectangles; the first panel
// is the hero panel and is selected by default in the editor.
export const LAYOUTS = {
  classic: {
    label: 'Classic Grid',
    panels: {
      square: [rect(0, 0, 0.56, 1), rect(0.56, 0, 0.44, 0.34), rect(0.56, 0.34, 0.44, 0.33), rect(0.56, 0.67, 0.44, 0.33)],
      portrait: [rect(0, 0, 1, 0.52), rect(0, 0.52, 0.5, 0.24), rect(0.5, 0.52, 0.5, 0.24), rect(0, 0.76, 1, 0.24)],
      landscape: [rect(0, 0, 0.42, 1), rect(0.42, 0, 0.29, 0.52), rect(0.71, 0, 0.29, 0.52), rect(0.42, 0.52, 0.58, 0.48)],
    },
  },
  triptych: {
    label: 'Triptych',
    panels: {
      square: [rect(0, 0, 0.34, 1), rect(0.34, 0, 0.32, 1), rect(0.66, 0, 0.34, 1)],
      portrait: [rect(0, 0, 1, 0.4), rect(0, 0.4, 1, 0.3), rect(0, 0.7, 1, 0.3)],
      landscape: [rect(0, 0, 0.34, 1), rect(0.34, 0, 0.32, 1), rect(0.66, 0, 0.34, 1)],
    },
  },
  mosaic: {
    label: 'Mosaic Six',
    panels: {
      square: [rect(0, 0, 0.34, 0.5), rect(0.34, 0, 0.33, 0.5), rect(0.67, 0, 0.33, 0.5), rect(0, 0.5, 0.34, 0.5), rect(0.34, 0.5, 0.33, 0.5), rect(0.67, 0.5, 0.33, 0.5)],
      portrait: [rect(0, 0, 0.5, 0.34), rect(0.5, 0, 0.5, 0.34), rect(0, 0.34, 0.5, 0.33), rect(0.5, 0.34, 0.5, 0.33), rect(0, 0.67, 0.5, 0.33), rect(0.5, 0.67, 0.5, 0.33)],
      landscape: [rect(0, 0, 0.34, 0.5), rect(0.34, 0, 0.33, 0.5), rect(0.67, 0, 0.33, 0.5), rect(0, 0.5, 0.34, 0.5), rect(0.34, 0.5, 0.33, 0.5), rect(0.67, 0.5, 0.33, 0.5)],
    },
  },
  poster: {
    label: 'Hero Poster',
    panels: {
      square: [rect(0, 0, 1, 1), rect(0.63, 0.6, 0.37, 0.4)],
      portrait: [rect(0, 0, 1, 1), rect(0.58, 0.66, 0.42, 0.34)],
      landscape: [rect(0, 0, 1, 1), rect(0.7, 0.58, 0.3, 0.42)],
    },
  },
};

/** The panel rectangles of a layout at a cover size, as fresh objects the editor may annotate. */
export function panelsFor(layoutId, width, height) {
  const layout = LAYOUTS[layoutId] ?? LAYOUTS.classic;
  return layout.panels[aspectGroup(width, height)].map((p) => ({ ...p }));
}

/** The export sizes the editor offers, in the common post sizes. */
export const POST_SIZES = [
  { id: '1080x1080', label: 'Square 1080 × 1080', w: 1080, h: 1080 },
  { id: '1080x1350', label: 'Portrait 1080 × 1350', w: 1080, h: 1350 },
  { id: '1920x1080', label: 'Wide 1920 × 1080', w: 1920, h: 1080 },
];
