// Vice Grid state: layouts, grades and the editor's working state.
// A layout is a function of the canvas size that returns the panel rects
// (fractions of the canvas, with a gutter between panels).

export const LAYOUTS = {
  'cover-story': {
    label: 'Cover Story',
    panels(w, h, g) {
      const heroH = Math.round(h * 0.58);
      const rowY = heroH + g;
      const rowH = h - rowY;
      const third = Math.round((w - 2 * g) / 3);
      return [
        { x: 0, y: 0, w, h: heroH },
        { x: 0, y: rowY, w: third, h: rowH },
        { x: third + g, y: rowY, w: third, h: rowH },
        { x: 2 * (third + g), y: rowY, w: w - 2 * (third + g), h: rowH },
      ];
    },
  },
  triptych: {
    label: 'Triptych',
    panels(w, h, g) {
      const third = Math.round((w - 2 * g) / 3);
      return [
        { x: 0, y: 0, w: third, h },
        { x: third + g, y: 0, w: third, h },
        { x: 2 * (third + g), y: 0, w: w - 2 * (third + g), h },
      ];
    },
  },
  'six-pack': {
    label: 'Six Pack',
    panels(w, h, g) {
      const third = Math.round((w - 2 * g) / 3);
      const half = Math.round((h - g) / 2);
      const rects = [];
      for (let row = 0; row < 2; row++) {
        for (let col = 0; col < 3; col++) {
          rects.push({
            x: col * (third + g),
            y: row * (half + g),
            w: col === 2 ? w - 2 * (third + g) : third,
            h: row === 1 ? h - half - g : half,
          });
        }
      }
      return rects;
    },
  },
  'hero-strip': {
    label: 'Hero Strip',
    panels(w, h, g) {
      const leftW = Math.round(w * 0.62);
      const rightX = leftW + g;
      const rightW = w - rightX;
      const half = Math.round((h - g) / 2);
      return [
        { x: 0, y: 0, w: leftW, h },
        { x: rightX, y: 0, w: rightW, h: half },
        { x: rightX, y: half + g, w: rightW, h: h - half - g },
      ];
    },
  },
};

export const GRADES = {
  sunset: { label: 'Sunset', filter: 'saturate(1.25)', top: 'rgba(255,170,60,0)', bottom: 'rgba(214,48,120,0.55)' },
  neon: { label: 'Neon', filter: 'saturate(1.4)', top: 'rgba(0,220,255,0.28)', bottom: 'rgba(255,0,160,0.5)' },
  noir: { label: 'Noir', filter: 'grayscale(0.85) contrast(1.2)', top: 'rgba(20,20,40,0.1)', bottom: 'rgba(0,0,0,0.55)' },
  palm: { label: 'Palm', filter: 'saturate(1.1)', top: 'rgba(0,140,130,0.3)', bottom: 'rgba(255,150,50,0.42)' },
};

export const EXPORT_SIZES = {
  '1080x1080': { label: 'Square 1080 x 1080', w: 1080, h: 1080 },
  '1080x1350': { label: 'Portrait 1080 x 1350', w: 1080, h: 1350 },
  '1920x1080': { label: 'Wide 1920 x 1080', w: 1920, h: 1080 },
};

/** A fresh default state. Panels are rebuilt whenever the layout changes. */
export function defaultState() {
  return {
    layout: 'cover-story',
    grade: 'sunset',
    gradeStrength: 0.7,
    photoMode: 'spread',
    photos: [],
    selectedPanel: 0,
    panels: [],
    caption: 'VICE GRID',
    subcaption: 'LEONIDA • 2026',
    captionSize: 1,
    captionPos: 'bottom',
    captionColor: '#ffffff',
    vignette: 0.45,
    grain: true,
    exportSize: '1080x1080',
  };
}

/** Rebuilds state.panels to match the current layout's panel count. */
export function resetPanels(state) {
  const count = LAYOUTS[state.layout].panels(100, 100, 2).length;
  state.panels = Array.from({ length: count }, (_, i) => ({
    photo: 0,
    zoom: 1,
    panX: 0,
    panY: 0,
  }));
  state.selectedPanel = 0;
}
