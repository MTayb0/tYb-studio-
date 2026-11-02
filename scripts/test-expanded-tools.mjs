import fs from 'node:fs';
import assert from 'node:assert/strict';
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const tools=fs.readFileSync(new URL('../studio-tools.js',import.meta.url),'utf8');
for(const id of ['videoStart','videoEnd','exportVideoTrim','keyImageInput','keyTolerance','keyBrushSize','keyApply','keyExport','rotateDocLeft','rotateDocRight','docEnhance','docStampText']) assert.ok(html.includes(`id="${id}"`),`Missing UI control ${id}`);
for(const feature of ['MediaRecorder','captureStream','keyColor','keyOriginal','TYBDocs','TYBDocOptions','toBlob']) assert.ok(tools.includes(feature),`Missing tool implementation marker ${feature}`);
assert.ok(html.includes('studio-tools.js'),'Tool script not loaded by app shell');
console.log('Expanded tool checks passed (video trim/export controls, chroma-key + correction brush, document rotation and export options).');
