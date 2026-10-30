/* TYB Studio Timeline Pro v0.17.0 — multi-track timeline, layered canvas preview, real-time WebM export, .tybproj project save/load.
   Additive module: binds only if its screen exists. Does not modify other studios. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  if (!$('timelineScreen')) return;
  const status = (id, msg) => { const el = $(id); if (el) el.textContent = msg; };
  const saveBlob = (blob, name) => { const url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = name; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 10000); };
  const fmt = s => `${s.toFixed(1)}s`;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  const canvas = $('tlPreview'), ctx = canvas.getContext('2d');
  const state = { tracks: [], playhead: 0, duration: 0, pxPerSec: 20, playing: false, exporting: false, selected: null };
  let uid = 0, rafId = null, lastTs = 0, actx = null, masterDest = null;

  const allClips = () => state.tracks.flatMap(t => t.clips);
  function trackByType(type) {
    let t = [...state.tracks].reverse().find(t => t.type === type);
    if (!t) { t = { id: 't' + (++uid), type, clips: [] }; state.tracks.push(t); }
    return t;
  }
  function recalc() {
    state.duration = allClips().reduce((m, c) => Math.max(m, c.start + c.duration), 0);
    const wrap = $('tlTimeline');
    state.pxPerSec = clamp((wrap.clientWidth - 90) / Math.max(state.duration, 10), 4, 60);
  }

  // ---------- clip import ----------
  function addClip(file, type) {
    const url = URL.createObjectURL(file);
    const clip = { id: 'c' + (++uid), name: file.name, kind: type, url, start: 0, offset: 0, duration: 0, volume: 1, opacity: 1, blend: 'source-over', el: null };
    const el = document.createElement(type === 'video' ? 'video' : 'audio');
    el.src = url; el.preload = 'auto'; el.playsInline = true; el.muted = true; // audio always routed via WebAudio graph
    el._gain = null;
    el.addEventListener('loadedmetadata', () => {
      clip.duration = el.duration || 0;
      recalc(); renderTracks();
      status('tlStatus', `Added “${file.name}” (${fmt(clip.duration)}). Drag clips on the lane to arrange, click to edit.`);
    });
    el.addEventListener('error', () => status('tlStatus', `Could not decode “${file.name}”. Try an MP4/WebM/MOV file.`));
    clip.el = el;
    const track = trackByType(type);
    clip.start = track.clips.reduce((m, c) => Math.max(m, c.start + c.duration), 0);
    track.clips.push(clip);
    state.selected = clip;
    recalc(); renderTracks();
  }

  // ---------- audio graph (preview + export share one path) ----------
  function ensureCtx() {
    if (actx) return actx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) { status('tlStatus', 'Web Audio is not available in this browser.'); return null; }
    actx = new AC();
    return actx;
  }
  function clipGain(clip, dest) {
    if (!clip.el._gain) {
      const src = actx.createMediaElementSource(clip.el);
      const g = actx.createGain();
      src.connect(g);
      g.connect(actx.destination);
      clip.el._gain = g;
    }
    if (dest && !clip.el._destConnected) { clip.el._gain.connect(dest); clip.el._destConnected = true; }
    clip.el._gain.gain.value = clamp(clip.volume, 0, 2);
    return clip.el._gain;
  }
  function removeClip(clip) {
    if (clip.el) { clip.el.pause(); clip.el.removeAttribute('src'); clip.el.load(); }
    for (const t of state.tracks) t.clips = t.clips.filter(c => c !== clip);
    if (state.selected === clip) state.selected = null;
    recalc(); renderTracks(); renderEditor();
  }

  // ---------- transport ----------
  function syncMedia() {
    const t = state.playhead, active = new Set();
    for (const tr of state.tracks) for (const c of tr.clips) {
      const on = t >= c.start && t < c.start + c.duration;
      if (on) {
        active.add(c);
        if (actx) clipGain(c, masterDest);
        const want = c.offset + (t - c.start);
        if (Math.abs(c.el.currentTime - want) > 0.3) c.el.currentTime = want;
        if (c.el.paused) c.el.play().catch(() => {});
      }
    }
    for (const c of allClips()) if (!active.has(c) && !c.el.paused) c.el.pause();
  }
  function drawFrame() {
    const W = canvas.width, H = canvas.height;
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    for (const tr of state.tracks.filter(t => t.type === 'video')) {
      for (const c of tr.clips) {
        if (state.playhead < c.start || state.playhead >= c.start + c.duration) continue;
        if (c.el.readyState < 2) continue;
        ctx.globalAlpha = clamp(c.opacity, 0, 1);
        ctx.globalCompositeOperation = c.blend || 'source-over';
        ctx.drawImage(c.el, 0, 0, W, H);
      }
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }
  function updateTime() { $('tlTime').textContent = `${fmt(state.playhead)} / ${fmt(state.duration)}`; const ph = $('tlPlayhead'); if (ph) ph.style.left = `${90 + state.playhead * state.pxPerSec}px`; const sk = $('tlSeek'); if (sk && state.duration) sk.value = Math.round(1000 * state.playhead / state.duration); }
  function tick(ts) {
    if (!state.playing) return;
    const dt = (ts - lastTs) / 1000; lastTs = ts;
    state.playhead += dt;
    if (state.playhead >= state.duration) {
      state.playhead = state.duration;
      if (state.exporting) return finishExport();
      stop(); return;
    }
    syncMedia(); drawFrame(); updateTime();
    rafId = requestAnimationFrame(tick);
  }
  function play() {
    if (!state.duration || state.playing) return;
    if (!ensureCtx()) return;
    masterDest = state.exporting ? actx.createMediaStreamDestination() : null;
    state.playing = true;
    $('tlPlay').textContent = '⏸ Pause';
    syncMedia(); lastTs = performance.now(); rafId = requestAnimationFrame(tick);
  }
  function pause() { state.playing = false; cancelAnimationFrame(rafId); for (const c of allClips()) c.el.pause(); $('tlPlay').textContent = '▶ Play'; }
  function stop() { pause(); state.playhead = 0; syncMedia(); drawFrame(); updateTime(); }
  function seek(t) { state.playhead = clamp(t, 0, state.duration); if (!state.playing) { syncMedia(); drawFrame(); } updateTime(); }

  // ---------- export (real-time composite) ----------
  let recorder = null, recChunks = [];
  function pickMime() {
    return ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'].find(m => window.MediaRecorder && MediaRecorder.isTypeSupported(m)) || '';
  }
  $('tlExport')?.addEventListener('click', async () => {
    if (!state.duration) return status('tlStatus', 'Add clips before exporting.');
    if (!window.MediaRecorder) return status('tlStatus', 'MediaRecorder is not available in this browser.');
    if (!ensureCtx()) return;
    stop();
    state.exporting = true;
    const stream = canvas.captureStream(30);
    masterDest = actx.createMediaStreamDestination();
    for (const c of allClips()) c.el._destConnected = false;
    syncMedia();
    masterDest.stream.getAudioTracks().forEach(tr => stream.addTrack(tr));
    recChunks = [];
    recorder = new MediaRecorder(stream, { mimeType: pickMime(), videoBitsPerSecond: 6_000_000 });
    recorder.ondataavailable = e => { if (e.data.size) recChunks.push(e.data); };
    recorder.onstop = () => {
      state.exporting = false; masterDest = null;
      saveBlob(new Blob(recChunks, { type: 'video/webm' }), `tyb-timeline-${Date.now()}.webm`);
      status('tlStatus', 'Export complete. WebM saved to your downloads.');
    };
    recorder.start(250);
    state.playhead = 0; state.playing = true;
    $('tlPlay').textContent = '⏸ Exporting…';
    status('tlStatus', 'Recording in real time — keep this tab visible until the playhead reaches the end.');
    syncMedia(); lastTs = performance.now(); rafId = requestAnimationFrame(tick);
  });
  function finishExport() { pause(); state.playing = false; state.exporting = false; if (recorder && recorder.state !== 'inactive') recorder.stop(); state.playhead = 0; drawFrame(); updateTime(); }

  // ---------- timeline UI ----------
  function renderTracks() {
    recalc();
    const host = $('tlTracks'); host.replaceChildren();
    let vIdx = 0, aIdx = 0;
    for (const tr of state.tracks) {
      const row = document.createElement('div'); row.className = 'tl-row';
      const head = document.createElement('div'); head.className = 'tl-head';
      const label = tr.type === 'video' ? `V${++vIdx}` : `A${++aIdx}`;
      head.textContent = label;
      const del = document.createElement('button'); del.className = 'tl-del'; del.title = 'Remove track'; del.textContent = '×';
      del.addEventListener('click', () => { tr.clips.forEach(removeClip); state.tracks = state.tracks.filter(x => x !== tr); recalc(); renderTracks(); });
      head.append(del);
      const lane = document.createElement('div'); lane.className = 'tl-lane'; lane.dataset.track = tr.id;
      for (const c of tr.clips) lane.append(clipEl(c));
      row.append(head, lane); host.append(row);
    }
    updateTime();
  }
  function clipEl(c) {
    const d = document.createElement('div');
    d.className = 'tl-clip' + (state.selected === c ? ' selected' : '');
    d.style.left = `${c.start * state.pxPerSec}px`;
    d.style.width = `${Math.max(10, c.duration * state.pxPerSec)}px`;
    d.textContent = c.name;
    d.title = `${c.name}\nstart ${fmt(c.start)} · trim-in ${fmt(c.offset)} · length ${fmt(c.duration)}`;
    d.addEventListener('pointerdown', e => {
      e.preventDefault(); state.selected = c; renderTracks(); renderEditor();
      const startX = e.clientX, origStart = c.start, laneW = d.parentElement.clientWidth;
      const move = ev => {
        const delta = (ev.clientX - startX) / state.pxPerSec;
        c.start = clamp(Math.round((origStart + delta) * 10) / 10, 0, Math.max(0, state.duration));
        d.style.left = `${c.start * state.pxPerSec}px`;
      };
      const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); recalc(); renderTracks(); };
      window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
    });
    return d;
  }
  function renderEditor() {
    const p = $('tlClipEditor'), c = state.selected;
    p.classList.toggle('hidden', !c);
    if (!c) return;
    $('tlClipName').textContent = `${c.name} (${c.kind})`;
    $('tlClipStart').value = c.start; $('tlClipOffset').value = c.offset; $('tlClipDur').value = c.duration.toFixed(1);
    $('tlClipVol').value = c.volume; $('tlClipOpacity').value = c.opacity; $('tlClipBlend').value = c.blend;
    $('tlClipOpacity').disabled = c.kind !== 'video';
  }
  function bindEditor() {
    const c = () => state.selected;
    $('tlClipStart')?.addEventListener('change', e => { if (c()) { c().start = Math.max(0, +e.target.value || 0); recalc(); renderTracks(); } });
    $('tlClipOffset')?.addEventListener('change', e => { if (c()) { const v = Math.max(0, +e.target.value || 0); c().offset = clamp(v, 0, Math.max(0, c().duration - 0.1)); renderTracks(); } });
    $('tlClipVol')?.addEventListener('input', e => { if (c()) c().volume = +e.target.value; if (c() && actx) clipGain(c()); });
    $('tlClipOpacity')?.addEventListener('input', e => { if (c()) c().opacity = +e.target.value; });
    $('tlClipBlend')?.addEventListener('change', e => { if (c()) { c().blend = e.target.value; renderTracks(); } });
    $('tlClipSplit')?.addEventListener('click', () => {
      const c1 = c(); if (!c1) return;
      const t = state.playhead;
      if (t <= c1.start + 0.05 || t >= c1.start + c1.duration - 0.05) return status('tlStatus', 'Move the playhead inside the selected clip to split it.');
      const tail = { ...c1, id: 'c' + (++uid), start: t, offset: c1.offset + (t - c1.start), duration: c1.start + c1.duration - t, el: null };
      c1.duration = t - c1.start;
      const el = document.createElement(c1.kind === 'video' ? 'video' : 'audio');
      el.src = c1.url; el.preload = 'auto'; el.playsInline = true; el.muted = true;
      tail.el = el;
      const track = state.tracks.find(tr => tr.clips.includes(c1));
      track.clips.push(tail);
      recalc(); renderTracks(); status('tlStatus', 'Clip split at playhead.');
    });
    $('tlClipDelete')?.addEventListener('click', () => { if (c()) removeClip(c()); });
  }

  // ---------- project save / load / relink ----------
  $('tlSaveProject')?.addEventListener('click', () => {
    const proj = { schema: 'tyb-project', schemaVersion: 1, app: 'tyb-studio', type: 'timeline', version: 1, savedAt: new Date().toISOString(), duration: state.duration, tracks: state.tracks.map(tr => ({ type: tr.type, clips: tr.clips.map(c => ({ name: c.name, kind: c.kind, start: c.start, offset: c.offset, duration: c.duration, volume: c.volume, opacity: c.opacity, blend: c.blend })) })) };
    saveBlob(new Blob([JSON.stringify(proj, null, 2)], { type: 'application/json' }), `tyb-project-${Date.now()}.json`);
    status('tlStatus', 'Project saved. Media files are referenced by name only — use “Relink media” after loading.');
  });
  let pendingRelink = null;
  $('tlLoadProject')?.addEventListener('change', async e => {
    try {
      const proj = JSON.parse(await e.target.files[0].text());
      if (proj.schema !== 'tyb-project') throw new Error('Not a TYB project file.');
      stop();
      state.tracks = proj.tracks.map(tr => ({ id: 't' + (++uid), type: tr.type, clips: tr.clips.map(c => ({ ...c, id: 'c' + (++uid), url: null, el: null })) }));
      pendingRelink = true;
      recalc(); renderTracks();
      status('tlStatus', `Loaded “${proj.type}” project (${fmt(proj.duration || 0)}). Now add the same media files with “Relink media”.`);
    } catch (err) { status('tlStatus', err.message || 'Could not load project file.'); }
    e.target.value = '';
  });
  $('tlRelink')?.addEventListener('change', e => {
    if (!pendingRelink) return status('tlStatus', 'Load a project file first.');
    const files = [...(e.target.files || [])];
    let linked = 0;
    for (const f of files) {
      for (const c of allClips()) {
        if (c.el || c.name !== f.name) continue;
        const url = URL.createObjectURL(f);
        const el = document.createElement(c.kind === 'video' ? 'video' : 'audio');
        el.src = url; el.preload = 'auto'; el.playsInline = true; el.muted = true;
        el._gain = null; el.addEventListener('loadedmetadata', () => { c.duration = c.duration || el.duration || c.duration; recalc(); renderTracks(); });
        c.url = url; c.el = el; linked++;
      }
    }
    pendingRelink = allClips().some(c => !c.el);
    status('tlStatus', linked ? `Relinked ${linked} clip(s).${pendingRelink ? ' Some clips are still missing.' : ' Project is ready.'}` : 'No matching file names found. Select the exact same files used in the project.');
    e.target.value = '';
  });

  // ---------- wiring ----------
  $('tlAddVideo')?.addEventListener('change', e => { [...e.target.files].forEach(f => addClip(f, 'video')); e.target.value = ''; });
  $('tlAddAudio')?.addEventListener('change', e => { [...e.target.files].forEach(f => addClip(f, 'audio')); e.target.value = ''; });
  $('tlAddVideoTrack')?.addEventListener('click', () => { state.tracks.push({ id: 't' + (++uid), type: 'video', clips: [] }); renderTracks(); });
  $('tlAddAudioTrack')?.addEventListener('click', () => { state.tracks.push({ id: 't' + (++uid), type: 'audio', clips: [] }); renderTracks(); });
  $('tlPlay')?.addEventListener('click', () => { if (state.playing) { pause(); $('tlPlay').textContent = '▶ Play'; } else play(); });
  $('tlStop')?.addEventListener('click', stop);
  $('tlSeek')?.addEventListener('input', e => seek((+e.target.value / 1000) * state.duration));
  $('tlTimeline')?.addEventListener('pointerdown', e => {
    if (e.target.closest('.tl-clip') || e.target.closest('.tl-head')) return;
    const r = $('tlTimeline').getBoundingClientRect();
    seek((e.clientX - r.left - 90) / state.pxPerSec);
  });
  window.addEventListener('resize', () => { recalc(); renderTracks(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && state.exporting) status('tlStatus', 'Export paused while tab is hidden — return to this tab to continue recording.'); });
  bindEditor(); renderTracks(); renderEditor(); drawFrame(); updateTime();
  status('tlStatus', 'Timeline Pro ready. Add video and audio clips to begin. Export records in real time to WebM.');
})();
