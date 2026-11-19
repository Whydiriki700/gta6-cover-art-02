// Vice Grid editor: wires the controls to the drawing engine, loads photos,
// exports PNGs at the three post sizes, and serves the ?shot= scenes.
import { drawCover } from './cover.js';
import { runShot } from './shots.js';
import { LAYOUTS, GRADES, EXPORT_SIZES, defaultState, resetPanels } from './state.js';

const $ = (id) => document.getElementById(id);
const canvas = $('preview');
const ctx = canvas.getContext('2d');
const state = defaultState();
resetPanels(state);
let lastRects = [];

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function previewSize() {
  const size = EXPORT_SIZES[state.exportSize];
  const w = 540;
  return { w, h: Math.round((540 * size.h) / size.w) };
}

function redraw() {
  const coverShot = document.body.classList.contains('shot-cover');
  const { w, h } = coverShot
    ? { w: window.innerWidth, h: window.innerHeight }
    : previewSize();
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  lastRects = drawCover(ctx, state, w, h);
  $('status').textContent = `${LAYOUTS[state.layout].label} • ${GRADES[state.grade].label} • ${state.photos.length} photo${state.photos.length === 1 ? '' : 's'} • panel ${state.selectedPanel + 1} of ${lastRects.length}`;
  renderPanelButtons();
}

function renderPanelButtons() {
  const wrap = $('panels');
  wrap.innerHTML = '';
  lastRects.forEach((_, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'panel-btn' + (i === state.selectedPanel ? ' active' : '');
    b.textContent = `Panel ${i + 1}`;
    b.addEventListener('click', () => {
      state.selectedPanel = i;
      syncPanelControls();
      redraw();
    });
    wrap.appendChild(b);
  });
}

function syncPanelControls() {
  const crop = state.panels[state.selectedPanel] ?? { photo: 0, zoom: 1, panX: 0, panY: 0 };
  $('zoom').value = crop.zoom;
  $('zoomVal').textContent = `${Math.round(crop.zoom * 100)}%`;
  $('panx').value = crop.panX;
  $('panxVal').textContent = crop.panX.toFixed(2);
  $('pany').value = crop.panY;
  $('panyVal').textContent = crop.panY.toFixed(2);
  const sel = $('panelPhoto');
  sel.innerHTML = '';
  state.photos.forEach((p, i) => {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = p.name;
    sel.appendChild(opt);
  });
  sel.value = String(crop.photo);
  $('panelPhotoRow').style.display = state.photoMode === 'per-panel' ? '' : 'none';
}

function addPhotos(files) {
  const list = [...files].filter((f) => f.type.startsWith('image/'));
  if (!list.length) return;
  return Promise.all(list.map(async (f) => {
    const img = await loadImage(URL.createObjectURL(f));
    return { img, name: f.name };
  })).then((loaded) => {
    state.photos.push(...loaded);
    if (state.photos.length > 3) state.photos = state.photos.slice(0, 3);
    syncPanelControls();
    redraw();
  });
}

async function loadSample(name) {
  const img = await loadImage(`samples/${name}.jpg`);
  const existing = state.photos.findIndex((p) => p.name === `${name}.jpg`);
  if (existing === -1) state.photos.push({ img, name: `${name}.jpg` });
  else state.photos[existing] = { img, name: `${name}.jpg` };
  if (state.photos.length > 3) state.photos = state.photos.slice(0, 3);
  syncPanelControls();
  redraw();
}

/** Renders the cover at full export size and returns a PNG data URL. */
async function exportCover(sizeKey) {
  const size = EXPORT_SIZES[sizeKey];
  const off = document.createElement('canvas');
  off.width = size.w;
  off.height = size.h;
  await document.fonts.load('100px Anton').catch(() => {});
  drawCover(off.getContext('2d'), state, size.w, size.h);
  return new Promise((resolve) => off.toBlob((b) => resolve(b), 'image/png'));
}

/** Test hook the screenshot script uses: returns the PNG byte length. */
window.__exportCover = async (w, h) => {
  const key = Object.keys(EXPORT_SIZES).find((k) => EXPORT_SIZES[k].w === w && EXPORT_SIZES[k].h === h);
  if (!key) return -1;
  const blob = await exportCover(key);
  return blob ? blob.size : -1;
};

// ---- controls ----
$('photo').addEventListener('change', (e) => addPhotos(e.target.files));
$('samplePier').addEventListener('click', () => loadSample('pier'));
$('sampleBoulevard').addEventListener('click', () => loadSample('boulevard'));

document.querySelectorAll('[data-layout]').forEach((b) => {
  b.addEventListener('click', () => {
    state.layout = b.dataset.layout;
    resetPanels(state);
    document.querySelectorAll('[data-layout]').forEach((x) => x.classList.toggle('active', x === b));
    syncPanelControls();
    redraw();
  });
});
document.querySelectorAll('[data-grade]').forEach((b) => {
  b.addEventListener('click', () => {
    state.grade = b.dataset.grade;
    document.querySelectorAll('[data-grade]').forEach((x) => x.classList.toggle('active', x === b));
    redraw();
  });
});
document.querySelectorAll('[data-mode]').forEach((b) => {
  b.addEventListener('click', () => {
    state.photoMode = b.dataset.mode;
    document.querySelectorAll('[data-mode]').forEach((x) => x.classList.toggle('active', x === b));
    syncPanelControls();
    redraw();
  });
});
$('gradeStrength').addEventListener('input', (e) => {
  state.gradeStrength = Number(e.target.value);
  $('gradeStrengthVal').textContent = `${Math.round(state.gradeStrength * 100)}%`;
  redraw();
});
$('caption').addEventListener('input', (e) => { state.caption = e.target.value; redraw(); });
$('subcaption').addEventListener('input', (e) => { state.subcaption = e.target.value; redraw(); });
$('captionSize').addEventListener('input', (e) => {
  state.captionSize = Number(e.target.value);
  $('captionSizeVal').textContent = `${Math.round(state.captionSize * 100)}%`;
  redraw();
});
$('captionPos').addEventListener('change', (e) => { state.captionPos = e.target.value; redraw(); });
document.querySelectorAll('[data-color]').forEach((b) => {
  b.addEventListener('click', () => {
    state.captionColor = b.dataset.color;
    document.querySelectorAll('[data-color]').forEach((x) => x.classList.toggle('active', x === b));
    redraw();
  });
});
$('vignette').addEventListener('input', (e) => {
  state.vignette = Number(e.target.value);
  $('vignetteVal').textContent = `${Math.round(state.vignette * 100)}%`;
  redraw();
});
$('grain').addEventListener('change', (e) => { state.grain = e.target.checked; redraw(); });
$('zoom').addEventListener('input', (e) => {
  state.panels[state.selectedPanel].zoom = Number(e.target.value);
  $('zoomVal').textContent = `${Math.round(Number(e.target.value) * 100)}%`;
  redraw();
});
$('panx').addEventListener('input', (e) => {
  state.panels[state.selectedPanel].panX = Number(e.target.value);
  $('panxVal').textContent = Number(e.target.value).toFixed(2);
  redraw();
});
$('pany').addEventListener('input', (e) => {
  state.panels[state.selectedPanel].panY = Number(e.target.value);
  $('panyVal').textContent = Number(e.target.value).toFixed(2);
  redraw();
});
$('panelPhoto').addEventListener('change', (e) => {
  state.panels[state.selectedPanel].photo = Number(e.target.value);
  redraw();
});
document.querySelectorAll('[data-size]').forEach((b) => {
  b.addEventListener('click', () => {
    state.exportSize = b.dataset.size;
    document.querySelectorAll('[data-size]').forEach((x) => x.classList.toggle('active', x === b));
    redraw();
  });
});
canvas.addEventListener('click', (e) => {
  const r = canvas.getBoundingClientRect();
  const x = ((e.clientX - r.left) / r.width) * canvas.width;
  const y = ((e.clientY - r.top) / r.height) * canvas.height;
  const hit = lastRects.findIndex((p) => x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + p.h);
  if (hit !== -1) {
    state.selectedPanel = hit;
    syncPanelControls();
    redraw();
  }
});
$('export').addEventListener('click', async () => {
  const blob = await exportCover(state.exportSize);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `vice-grid-${state.exportSize}.png`;
  a.click();
  $('status').textContent = `Saved vice-grid-${state.exportSize}.png (${Math.round(blob.size / 1024)} KB)`;
});

// ---- shot mode ----
const params = new URLSearchParams(location.search);
const shot = params.get('shot');
if (shot) {
  runShot(shot, params, {
    applyShot({ photo, caption, subcaption, layout, grade, size }) {
      state.caption = caption;
      state.subcaption = subcaption;
      if (LAYOUTS[layout]) { state.layout = layout; resetPanels(state); }
      if (GRADES[grade]) state.grade = grade;
      if (EXPORT_SIZES[size]) state.exportSize = size;
      document.querySelectorAll('[data-layout]').forEach((x) => x.classList.toggle('active', x.dataset.layout === state.layout));
      document.querySelectorAll('[data-grade]').forEach((x) => x.classList.toggle('active', x.dataset.grade === state.grade));
      document.querySelectorAll('[data-size]').forEach((x) => x.classList.toggle('active', x.dataset.size === state.exportSize));
      $('caption').value = caption;
      $('subcaption').value = subcaption;
    },
    loadSample,
    redraw,
  });
} else {
  document.fonts.load('100px Anton').catch(() => {}).finally(() => redraw());
  loadSample('pier');
}
