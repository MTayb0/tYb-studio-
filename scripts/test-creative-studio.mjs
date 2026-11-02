import fs from 'node:fs';
import assert from 'node:assert/strict';
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const js=fs.readFileSync(new URL('../creative-studio.js',import.meta.url),'utf8');
for(const id of ['designScreen','designCanvas','designAddText','designAddRect','designAddCircle','designAddTriangle','designAddStar','designAddLine','designImageInput','designUndo','designRedo','designLayers','designApplyProps','designExportPng','designExportJpg','designSaveProject','designLoadProject','designPromptRun']) assert.ok(html.includes(`id="${id}"`),`Missing design control #${id}`);
for(const marker of ['drawLayer','snapshot','pointerdown','pointermove','designExportPng','designSaveProject','designPromptRun','designDuplicate','designDelete']) assert.ok(js.includes(marker),`Missing editor implementation marker ${marker}`);
assert.ok(html.includes('creative-studio.js'),'Creative workspace script is not loaded');
for(const file of ['.github/workflows/main.yml','.github/workflows/build-apk.yml']) assert.ok(fs.readFileSync(new URL('../'+file,import.meta.url),'utf8').includes('creative-studio.js'),`${file} does not package creative-studio.js`);
console.log('Creative Studio source checks passed (layered canvas, editable text/shapes/images, undo/redo, project save/load and exports).');
