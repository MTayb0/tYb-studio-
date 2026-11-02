import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const js = await readFile(new URL('../app.js', import.meta.url), 'utf8');
const requiredIds = [
  'photoInput', 'photoCanvas', 'rotateLeft', 'rotateRight', 'flipHorizontal', 'flipVertical', 'photoWatermark', 'watermarkColor', 'watermarkPosition', 'watermarkOpacity', 'photoExportFormat', 'startCrop',
  'applyCrop', 'cancelCrop', 'resizeWidth', 'resizeHeight', 'lockRatio',
  'applyResize', 'clearResize', 'exportPhoto', 'cropHelp'
];
for (const id of requiredIds) {
  assert.ok(html.includes(`id="${id}"`), `Missing photo editor control: #${id}`);
}
for (const hook of [
  "addEventListener('pointerdown'", "addEventListener('pointermove'",
  "addEventListener('click'", "['pointerup','pointercancel','lostpointercapture']",
  'makeWorkingImage()', 'normalizedCrop(', 'canvas.toBlob(', 'flipH', 'flipV', 'watermarkPosition', 'image/jpeg', 'image/webp'
]) assert.ok(js.includes(hook), `Missing editor implementation hook: ${hook}`);
for (const preset of ['original', 'vivid', 'warm', 'mono', 'vintage', 'cool']) {
  assert.ok(html.includes(`data-preset="${preset}"`), `Missing preset button: ${preset}`);
  assert.ok(js.includes(`${preset}:`), `Missing preset definition: ${preset}`);
}
console.log(`Photo editor source checks passed (${requiredIds.length} controls; crop/rotate/resize/preset/export hooks present).`);
console.log('Note: this is a static source check, not a browser/device interaction test.');

const extraIds = ['savePreset','loadPreset','documentInput','documentPages','exportPdf','tryOcr','ocrText','clearDocuments'];
for (const id of extraIds) assert.ok(html.includes(`id=\"${id}\"`), `Missing expanded tool control: #${id}`);
for (const hook of ['createImagePdf(', 'canvasToJpeg(', 'tyb-photo-custom-preset', 'TextDetector']) assert.ok(js.includes(hook), `Missing expanded tool implementation: ${hook}`);
console.log('Expanded tools source checks passed (custom presets, image-to-PDF, page ordering controls and guarded device OCR).');
