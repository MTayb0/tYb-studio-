import fs from 'node:fs';
import assert from 'node:assert/strict';
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const js=fs.readFileSync(new URL('../advanced-tools.js',import.meta.url),'utf8');
for(const id of ['advancedScreen','advPdfFiles','advPdfMerge','advPdfRotate','advPdfAnnotate','advPdfSign','advPdfMove','advPdfDelete','advPdfReplaceText','advScanImage','advOcrRun','advAutoDetectRun','advPerspectiveRun','aiCutoutRun','ffmpegRun','backupExport','backupImport','cloudSignIn','cloudSync']) assert.ok(html.includes(`id="${id}"`),`Missing advanced control #${id}`);
for(const marker of ['PDFDocument.load','copyPages','createWorker','getPerspectiveTransform','SelfieSegmentation','FFmpeg','PBKDF2','AES-GCM','signInWithEmailAndPassword','tybStudioUsers']) assert.ok(js.includes(marker),`Missing advanced feature implementation marker ${marker}`);
assert.ok(html.includes('advanced-tools.js'),'Advanced tool script not loaded');
console.log('Advanced tools source checks passed (PDF, OCR, perspective, AI cutout, FFmpeg, encrypted backup and optional Firebase sync).');
