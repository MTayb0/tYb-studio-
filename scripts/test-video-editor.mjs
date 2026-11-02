import fs from 'node:fs';
import assert from 'node:assert/strict';
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const js=fs.readFileSync(new URL('../video-editor.js',import.meta.url),'utf8');
for(const id of ['videoFxFilter','videoFxSpeed','videoFxText','videoFxColor','videoFxSize','videoFxMirror','videoFxMute','videoFxApplyPreview','videoFxExport','videoFxStatus']) assert.ok(html.includes(`id="${id}"`),`Missing video control #${id}`);
for(const marker of ['MediaRecorder','captureStream','requestAnimationFrame','videoFxFilter','videoFxText','videoFxSpeed']) assert.ok(js.includes(marker),`Missing video editor behavior ${marker}`);
assert.ok(html.includes('video-editor.js'),'Video editor script is not loaded');
for(const file of ['.github/workflows/main.yml','.github/workflows/build-apk.yml']) assert.ok(fs.readFileSync(new URL('../'+file,import.meta.url),'utf8').includes('video-editor.js'),`${file} does not package video-editor.js`);
console.log('Video editor source checks passed (filters, text overlay, speed, mirror, audio-aware WebM export).');
