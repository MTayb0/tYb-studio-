/* TYB Studio Audio Lab v0.17.0 — Voice Studio (pitch/speed/EQ, WAV export, mic recording) + Subtitle Studio (transcription, SRT/VTT, burn-in export).
   Additive module: binds only if its screen exists. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  if (!$('audioScreen')) return;
  const status = (id, msg) => { const el = $(id); if (el) el.textContent = msg; };
  const saveBlob = (blob, name) => { const url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = name; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 10000); };
  const AC = window.AudioContext || window.webkitAudioContext;

  /* ================= VOICE STUDIO ================= */
  let vctx = null, vbuf = null, vsrc = null, vChain = null, micRec = null, micChunks = [];
  function vEnsure() { if (!vctx && AC) vctx = new AC(); return vctx; }
  function vParams() {
    return { rate: +$('vsRate').value, semis: +$('vsPitch').value, low: +$('vsLow').value, mid: +$('vsMid').value, high: +$('vsHigh').value, comp: $('vsComp').checked };
  }
  function vBuild(dest) {
    const p = vParams();
    const src = dest.createBufferSource(); src.buffer = vbuf;
    src.playbackRate.value = p.rate * Math.pow(2, p.semis / 12); // linked speed+pitch, documented in UI
    const eq = (type, freq) => { const b = dest.createBiquadFilter(); b.type = type; b.frequency.value = freq; return b; };
    const gLow = dest.createGain(), gMid = dest.createGain(), gHigh = dest.createGain();
    const bLow = eq('lowshelf', 200), bMid = eq('peaking', 1000), bHigh = eq('highshelf', 4000);
    bMid.Q.value = 0.8;
    gLow.gain.value = p.low; gMid.gain.value = p.mid; gHigh.gain.value = p.high;
    const out = dest.createGain(); out.gain.value = 1;
    src.connect(bLow); bLow.connect(gLow); gLow.connect(bMid);
    bMid.connect(gMid); gMid.connect(bHigh); bHigh.connect(gHigh); gHigh.connect(out);
    if (p.comp) { const comp = dest.createDynamicsCompressor(); comp.threshold.value = -30; comp.ratio.value = 6; out.connect(comp); comp.connect(dest.destination === undefined ? dest : dest.destination); return { src, out: comp }; }
    out.connect(dest.destination === undefined ? dest : dest.destination);
    return { src, out };
  }
  function vStopPreview() { if (vsrc) { try { vsrc.onended = null; vsrc.stop(); } catch {} vsrc = null; } }
  function vPreview() {
    if (!vbuf) return status('vsStatus', 'Load an audio file or record with the microphone first.');
    if (!vEnsure()) return status('vsStatus', 'Web Audio is not available in this browser.');
    vctx.resume(); vStopPreview();
    const { src } = vBuild(vctx); vsrc = src; src.onended = () => { $('vsPlay').textContent = '▶ Preview'; };
    src.start(); $('vsPlay').textContent = '⏸ Stop';
  }
  function encodeWav(buf) {
    const nCh = Math.min(2, buf.numberOfChannels), sr = buf.sampleRate, len = buf.length * nCh * 2;
    const bytes = new ArrayBuffer(44 + len), v = new DataView(bytes);
    const wstr = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    wstr(0, 'RIFF'); v.setUint32(4, 36 + len, true); wstr(8, 'WAVE'); wstr(12, 'fmt ');
    v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, nCh, true);
    v.setUint32(24, sr, true); v.setUint32(28, sr * nCh * 2, true); v.setUint16(32, nCh * 2, true);
    v.setUint16(34, 16, true); wstr(36, 'data'); v.setUint32(40, len, true);
    const chans = []; for (let c = 0; c < nCh; c++) chans.push(buf.getChannelData(c));
    let off = 44;
    for (let i = 0; i < buf.length; i++) for (let c = 0; c < nCh; c++) {
      const s = Math.max(-1, Math.min(1, chans[c][i]));
      v.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7FFF, true); off += 2;
    }
    return new Blob([bytes], { type: 'audio/wav' });
  }
  $('vsLoad')?.addEventListener('change', async e => {
    const f = e.target.files[0]; if (!f) return;
    if (!vEnsure()) return status('vsStatus', 'Web Audio is not available.');
    try { vbuf = await vctx.decodeAudioData(await f.arrayBuffer()); vStopPreview(); status('vsStatus', `Loaded “${f.name}” — ${vbuf.duration.toFixed(1)}s, ${vbuf.sampleRate} Hz. Adjust controls and preview, then export WAV.`); }
    catch { status('vsStatus', 'Could not decode this audio file. Try MP3, WAV, M4A or OGG.'); }
    e.target.value = '';
  });
  $('vsRecord')?.addEventListener('click', async () => {
    if (micRec) { micRec.stop(); return; }
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) return status('vsStatus', 'Microphone recording is not available here (needs HTTPS and permission).');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micChunks = []; micRec = new MediaRecorder(stream);
      micRec.ondataavailable = ev => { if (ev.data.size) micChunks.push(ev.data); };
      micRec.onstop = async () => {
        stream.getTracks().forEach(t => t.stop()); micRec = null; $('vsRecord').textContent = '● Record mic';
        if (!vEnsure()) return;
        try { vbuf = await vctx.decodeAudioData(await new Blob(micChunks).arrayBuffer()); status('vsStatus', `Recording captured — ${vbuf.duration.toFixed(1)}s. Preview or export as WAV.`); }
        catch { status('vsStatus', 'Recording finished but could not be decoded in this browser.'); }
      };
      micRec.start(); $('vsRecord').textContent = '⏹ Stop recording'; status('vsStatus', 'Recording… speak now.');
    } catch { status('vsStatus', 'Microphone permission was denied.'); }
  });
  $('vsPlay')?.addEventListener('click', () => { if (vsrc) { vStopPreview(); $('vsPlay').textContent = '▶ Preview'; } else vPreview(); });
  ['vsRate', 'vsPitch', 'vsLow', 'vsMid', 'vsHigh', 'vsComp'].forEach(id => $(id)?.addEventListener('input', () => {
    const p = vParams();
    $('vsRateVal').textContent = `${Math.round(p.rate * 100)}%`;
    $('vsPitchVal').textContent = (p.semis > 0 ? '+' : '') + p.semis;
    if (vsrc) vPreview(); // rebuild live chain
  }));
  $('vsExport')?.addEventListener('click', async () => {
    if (!vbuf || !AC) return status('vsStatus', 'Load or record audio first.');
    const p = vParams();
    const sr = vbuf.sampleRate, frames = Math.ceil(vbuf.length / p.rate);
    const off = new OfflineAudioContext(2, frames, sr);
    const { src } = vBuild(off);
    src.onended = null; src.start();
    status('vsStatus', 'Rendering WAV…');
    const rendered = await off.startRendering();
    saveBlob(encodeWav(rendered), `tyb-voice-${Date.now()}.wav`);
    status('vsStatus', 'WAV exported. Note: pitch and speed are linked (resampling); formant-preserving voice transplant is not possible inside a browser.');
  });

  /* ================= SUBTITLE STUDIO ================= */
  let subVideo = null, subCues = [], subRec = null, subRecStart = 0, subTimer = null;
  const srtTime = s => { const ms = Math.round(s * 1000); const h = String(Math.floor(ms / 3600000)).padStart(2, '0'), m = String(Math.floor(ms / 60000) % 60).padStart(2, '0'), sec = String(Math.floor(ms / 1000) % 60).padStart(2, '0'), mm = String(ms % 1000).padStart(3, '0'); return `${h}:${m}:${sec},${mm}`; };
  const vttTime = s => srtTime(s).replace(',', '.');
  function subEnsureVideo() {
    if (!subVideo) { subVideo = $('subVideo'); subVideo.addEventListener('timeupdate', () => { $('subBurnTime').textContent = `${subVideo.currentTime.toFixed(1)}s`; }); }
    return subVideo;
  }
  $('subLoad')?.addEventListener('change', e => {
    const f = e.target.files[0]; if (!f) return;
    const v = subEnsureVideo(); v.src = URL.createObjectURL(f); v.classList.remove('hidden');
    $('subExportSrt').disabled = false; $('subExportVtt').disabled = false; $('subBurn').disabled = false; $('subTranscribe').disabled = false;
    status('subStatus', `Loaded “${f.name}”. Transcribe with speech recognition, or add cues manually.`);
    e.target.value = '';
  });
  $('subTranscribe')?.addEventListener('click', () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return status('subStatus', 'Live transcription needs Chrome/Edge with internet. You can still add cues manually or load an SRT file.');
    if (!subVideo?.src) return status('subStatus', 'Load a video first.');
    if (subRec) { subRec.stop(); return; }
    subCues = []; renderCues();
    subRec = new SR(); subRec.continuous = true; subRec.interimResults = false; subRec.lang = $('subLang').value || 'en-US';
    subRecStart = performance.now();
    subRec.onresult = ev => {
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        if (!ev.results[i].isFinal) continue;
        const text = ev.results[i][0].transcript.trim(); if (!text) continue;
        const start = Math.max(0, (ev.timeStamp - subRecStart) / 1000 - 2); // coarse alignment, editable afterwards
        subCues.push({ start, end: Math.min(subVideo.duration || start + 4, start + Math.max(2, text.length * 0.07)), text });
      }
      subCues.sort((a, b) => a.start - b.start); renderCues();
    };
    subRec.onerror = ev => { status('subStatus', `Speech recognition error: ${ev.error}. Timings are approximate — edit each cue below.`); };
    subRec.onend = () => { subRec = null; $('subTranscribe').textContent = 'Transcribe with speech'; status('subStatus', `Transcription finished — ${subCues.length} cue(s). Review timings, then export SRT/VTT or burn in.`); };
    $('subTranscribe').textContent = '⏹ Stop transcription';
    subVideo.currentTime = 0; subVideo.play().catch(() => {});
    subRec.start();
    status('subStatus', 'Listening… play the video and speak, or let the video audio feed the mic. Timings are approximate.');
  });
  function renderCues() {
    const host = $('subCues'); host.replaceChildren();
    subCues.forEach((cue, i) => {
      const row = document.createElement('div'); row.className = 'cue-row';
      const n = document.createElement('span'); n.textContent = i + 1; n.className = 'muted';
      const s = document.createElement('input'); s.type = 'number'; s.min = 0; s.step = 0.1; s.value = cue.start.toFixed(1);
      const en = document.createElement('input'); en.type = 'number'; en.min = 0; en.step = 0.1; en.value = cue.end.toFixed(1);
      const t = document.createElement('input'); t.type = 'text'; t.value = cue.text; t.className = 'cue-text';
      s.addEventListener('change', () => cue.start = Math.max(0, +s.value || 0));
      en.addEventListener('change', () => cue.end = Math.max(cue.start, +en.value || cue.start));
      t.addEventListener('input', () => cue.text = t.value);
      const del = document.createElement('button'); del.className = 'secondary'; del.textContent = '×';
      del.addEventListener('click', () => { subCues.splice(i, 1); renderCues(); });
      row.append(n, s, en, t, del); host.append(row);
    });
  }
  $('subAddCue')?.addEventListener('click', () => { const t = subVideo?.currentTime || 0; subCues.push({ start: t, end: t + 2, text: '' }); subCues.sort((a, b) => a.start - b.start); renderCues(); });
  function subFile(ext) {
    if (!subCues.length) return status('subStatus', 'No cues to export.');
    const body = subCues.map((c, i) => `${i + 1}\n${ext === 'srt' ? srtTime(c.start) + ' --> ' + srtTime(c.end) : vttTime(c.start) + ' --> ' + vttTime(c.end)}\n${c.text}\n`).join('\n');
    saveBlob(new Blob([ext === 'srt' ? body : `WEBVTT\n\n${body}`], { type: 'text/plain' }), `tyb-subtitles.${ext}`);
    status('subStatus', `${ext.toUpperCase()} downloaded.`);
  }
  $('subExportSrt')?.addEventListener('click', () => subFile('srt'));
  $('subExportVtt')?.addEventListener('click', () => subFile('vtt'));
  // burn-in export
  let burning = false;
  $('subBurn')?.addEventListener('click', async () => {
    if (burning || !subVideo?.src || !subVideo.duration) return status('subStatus', 'Load a video first.');
    if (!window.MediaRecorder) return status('subStatus', 'MediaRecorder is not available here.');
    const c = $('subBurnCanvas'), cx = c.getContext('2d');
    burning = true; $('subBurn').textContent = 'Rendering…';
    subVideo.muted = true; subVideo.currentTime = 0;
    await new Promise(r => { subVideo.onseeked = r; });
    const actx = AC ? new AC() : null;
    const stream = c.captureStream(30);
    if (actx) { const srcN = actx.createMediaElementSource(subVideo), dest = actx.createMediaStreamDestination(); srcN.connect(dest); dest.stream.getAudioTracks().forEach(tr => stream.addTrack(tr)); }
    const mime = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'].find(m => MediaRecorder.isTypeSupported(m));
    const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 6_000_000 });
    const chunks = []; rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
    const done = new Promise(r => rec.onstop = r);
    const draw = () => {
      cx.drawImage(subVideo, 0, 0, c.width, c.height);
      const cue = subCues.find(k => subVideo.currentTime >= k.start && subVideo.currentTime <= k.end);
      if (cue) {
        const size = +$('subSize').value, pos = $('subPos').value;
        cx.font = `bold ${size}px system-ui, sans-serif`; cx.textAlign = 'center';
        cx.lineWidth = Math.max(3, size / 8); cx.strokeStyle = 'rgba(0,0,0,0.85)'; cx.fillStyle = $('subColor').value;
        const y = pos === 'top' ? size + 24 : c.height - 32;
        cx.strokeText(cue.text, c.width / 2, y); cx.fillText(cue.text, c.width / 2, y);
      }
      if (!subVideo.paused && !subVideo.ended) requestAnimationFrame(draw);
    };
    rec.start(250); subVideo.play(); draw();
    await new Promise(r => { subVideo.onended = r; });
    rec.stop(); await done;
    saveBlob(new Blob(chunks, { type: 'video/webm' }), `tyb-subtitled-${Date.now()}.webm`);
    subVideo.muted = false; burning = false; $('subBurn').textContent = 'Export video with burned-in subtitles (WebM)';
    status('subStatus', 'Burned-in subtitle video saved (WebM, real-time render).');
  });
  renderCues();
  status('vsStatus', 'Voice Studio ready — load audio or record. Pitch/speed are linked by design.');
  status('subStatus', 'Subtitle Studio ready — load a video to begin.');
})();
