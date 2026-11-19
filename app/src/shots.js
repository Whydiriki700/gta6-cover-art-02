// Fixed scenes for screenshots: ?shot=editor shows the editor with a sample
// photo loaded; ?shot=cover shows the cover alone, filling the viewport.
// `photo` picks the sample (samples/<photo>.jpg), `caption` the words,
// `layout`/`grade`/`size` the composition. window.__shotReady is set once
// the font has loaded and the scene has painted.

export async function runShot(shot, query, api) {
  const photo = query.get('photo') ?? 'pier';
  const caption = query.get('caption') ?? 'VICE GRID';
  const subcaption = query.get('subcaption') ?? 'LEONIDA • 2026';
  const layout = query.get('layout') ?? 'cover-story';
  const grade = query.get('grade') ?? 'sunset';
  const size = query.get('size') ?? '1080x1080';
  api.applyShot({ photo, caption, subcaption, layout, grade, size });
  if (shot === 'cover') document.body.classList.add('shot-cover');
  await api.loadSample(photo);
  await document.fonts.load('100px Anton').catch(() => {});
  await document.fonts.ready;
  api.redraw();
  requestAnimationFrame(() => requestAnimationFrame(() => {
    window.__shotReady = true;
  }));
}
