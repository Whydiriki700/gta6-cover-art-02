// Vice Grid drawing engine: draws the multi-panel cover onto any 2D canvas
// context at any size, from the editor state. Deterministic: the grain uses a
// fixed-seed generator, so the same state always draws the same pixels.

import { LAYOUTS, GRADES } from './state.js';

/** mulberry32: a tiny seeded generator, so grain is identical on every run. */
function seededRandom(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Cover-fits `img` over the whole canvas and returns the transform. */
function coverTransform(img, w, h) {
  const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  return {
    scale,
    ox: (w - img.naturalWidth * scale) / 2,
    oy: (h - img.naturalHeight * scale) / 2,
  };
}

/**
 * Draws one photo into one panel rect.
 * `zoom` magnifies around the panel centre; `panX`/`panY` shift the view in
 * fractions of the panel size (-0.5..0.5). In spread mode the photo is the
 * whole-canvas image sliced by the panel; in per-panel mode the photo is
 * cover-fitted to the panel itself.
 */
function drawPanelPhoto(ctx, img, panel, crop, mode, w, h) {
  if (!img) return;
  const { zoom, panX, panY } = crop;
  ctx.save();
  ctx.beginPath();
  ctx.rect(panel.x, panel.y, panel.w, panel.h);
  ctx.clip();
  if (mode === 'spread') {
    const t = coverTransform(img, w, h);
    const s = t.scale * zoom;
    const sx = (panel.x - panX * panel.w - t.ox) / s;
    const sy = (panel.y - panY * panel.h - t.oy) / s;
    const sw = panel.w / s;
    const sh = panel.h / s;
    ctx.drawImage(img, sx, sy, sw, sh, panel.x, panel.y, panel.w, panel.h);
  } else {
    const scale = Math.max(panel.w / img.naturalWidth, panel.h / img.naturalHeight) * zoom;
    const pw = img.naturalWidth * scale;
    const ph = img.naturalHeight * scale;
    const dx = panel.x + (panel.w - pw) / 2 - panX * panel.w;
    const dy = panel.y + (panel.h - ph) / 2 - panY * panel.h;
    ctx.drawImage(img, dx, dy, pw, ph);
  }
  ctx.restore();
}

/** Applies the chosen grade's tint over one panel. */
function gradePanel(ctx, panel, grade, strength) {
  if (strength <= 0) return;
  const grad = ctx.createLinearGradient(0, panel.y, 0, panel.y + panel.h);
  grad.addColorStop(0, grade.top);
  grad.addColorStop(1, grade.bottom);
  ctx.save();
  ctx.globalCompositeOperation = 'soft-light';
  ctx.globalAlpha = strength;
  ctx.fillStyle = grad;
  ctx.fillRect(panel.x, panel.y, panel.w, panel.h);
  ctx.restore();
  const shade = ctx.createLinearGradient(0, panel.y + panel.h * 0.55, 0, panel.y + panel.h);
  shade.addColorStop(0, 'rgba(0,0,0,0)');
  shade.addColorStop(1, `rgba(0,0,0,${0.28 * strength})`);
  ctx.fillStyle = shade;
  ctx.fillRect(panel.x, panel.y, panel.w, panel.h);
}

/** Draws the caption band (main line + sub line) over the cover. The band is
 *  laid out from its own height, so the text can never run off the canvas
 *  on wide exports: the main line is sized to fit the band, not the width. */
function drawCaption(ctx, state, w, h) {
  const text = (state.caption || '').trim().toUpperCase();
  if (!text) return;
  const bandH = h * 0.19;
  const bottom = state.captionPos === 'bottom';
  const bandY = bottom ? h - bandH : 0;
  const shade = ctx.createLinearGradient(0, bandY, 0, bandY + bandH);
  if (bottom) {
    shade.addColorStop(0, 'rgba(0,0,0,0)');
    shade.addColorStop(1, 'rgba(0,0,0,0.62)');
  } else {
    shade.addColorStop(0, 'rgba(0,0,0,0.62)');
    shade.addColorStop(1, 'rgba(0,0,0,0)');
  }
  ctx.fillStyle = shade;
  ctx.fillRect(0, bandY, w, bandH);

  let size = Math.min(w * 0.085, bandH * 0.58) * state.captionSize;
  ctx.font = `${size}px Anton, 'Arial Black', sans-serif`;
  while (ctx.measureText(text).width > w * 0.92 && size > 10) {
    size -= 2;
    ctx.font = `${size}px Anton, 'Arial Black', sans-serif`;
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(0,0,0,0.85)';
  ctx.lineWidth = Math.max(2, size * 0.09);
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = size * 0.12;
  ctx.shadowOffsetY = size * 0.03;
  const cy = bandY + bandH * 0.34;
  ctx.strokeText(text, w / 2, cy);
  ctx.fillStyle = state.captionColor;
  ctx.fillText(text, w / 2, cy);
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  const sub = (state.subcaption || '').trim().toUpperCase();
  if (sub) {
    const subSize = Math.max(10, size * 0.24);
    ctx.font = `${subSize}px Anton, 'Arial Black', sans-serif`;
    try { ctx.letterSpacing = `${Math.round(subSize * 0.35)}px`; } catch { /* older canvas */ }
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    const sy = bandY + bandH * 0.76;
    ctx.strokeText(sub, w / 2, sy);
    ctx.fillText(sub, w / 2, sy);
    try { ctx.letterSpacing = '0px'; } catch { /* older canvas */ }
  }
}

/** Speckles deterministic film grain over the whole cover. */
function drawGrain(ctx, w, h) {
  const rand = seededRandom(20261119);
  const count = Math.floor((w * h) / 900);
  ctx.save();
  ctx.globalAlpha = 0.05;
  for (let i = 0; i < count; i++) {
    const v = rand() > 0.5 ? 255 : 0;
    ctx.fillStyle = `rgb(${v},${v},${v})`;
    ctx.fillRect(Math.floor(rand() * w), Math.floor(rand() * h), 1, 1);
  }
  ctx.restore();
}

/** Draws a soft dark vignette around the edges. */
function drawVignette(ctx, w, h, strength) {
  if (strength <= 0) return;
  const r = Math.hypot(w, h) / 2;
  const grad = ctx.createRadialGradient(w / 2, h / 2, r * 0.45, w / 2, h / 2, r);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, `rgba(0,0,0,${0.5 * strength})`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
}

/**
 * Draws the whole cover for `state` onto `ctx` at the canvas's own size.
 * Returns the panel rects it drew, in layout order, for hit-testing.
 */
export function drawCover(ctx, state, w, h) {
  const g = Math.max(2, Math.round(w * 0.008));
  const rects = LAYOUTS[state.layout].panels(w, h, g);
  const grade = GRADES[state.grade];

  ctx.fillStyle = '#f5f0f7';
  ctx.fillRect(0, 0, w, h);

  rects.forEach((panel, i) => {
    const crop = state.panels[i] ?? { photo: 0, zoom: 1, panX: 0, panY: 0 };
    const img = state.photos[crop.photo]?.img ?? state.photos[0]?.img ?? null;
    ctx.save();
    if (grade.filter) ctx.filter = grade.filter;
    drawPanelPhoto(ctx, img, panel, crop, state.photoMode, w, h);
    ctx.restore();
    gradePanel(ctx, panel, grade, state.gradeStrength);
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = Math.max(1, g * 0.25);
    ctx.strokeRect(panel.x, panel.y, panel.w, panel.h);
  });

  drawCaption(ctx, state, w, h);
  drawVignette(ctx, w, h, state.vignette);
  if (state.grain) drawGrain(ctx, w, h);
  return rects;
}
