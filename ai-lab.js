/* TYB Studio AI Lab v0.17.0 — AI Rotoscope (MediaPipe ImageSegmenter), AI Character overlay (FaceLandmarker),
   3D Virtual Set (three.js, loaded on demand), Local AI (transformers.js, loaded on demand).
   All heavy libraries load on first use over the network, then are cached by the browser/service worker. Additive module. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  if (!$('aiLabScreen')) return;
  const status = (id, msg) => { const el = $(id); if (el) el.textContent = msg; };
  const saveBlob = (blob, name) => { const url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = name; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 10000); };
  const loadScript = (src, test) => new Promise((resolve, reject) => {
    if (test()) return resolve();
    const existing = [...document.scripts].find(s => s.src === src);
    const s = existing || document.createElement('script');
    if (!existing) { s.src = src; document.head.append(s); }
    s.addEventListener('load', () => test() ? resolve() : reject(new Error('Library loaded but did not initialize.')), { once: true });
    s.addEventListener('error', () => reject(new Error('Could not load library — check internet connection.')), { once: true });
  });
  const AC = window.AudioContext || window.webkitAudioContext;

  /* ============ AI ROTOSCOPE ============ */
  let rotSeg = null, rotMedia = null, rotKind = null, rotBusy = false, rotScratch = null;
  async function rotInit() {
    if (rotSeg) return rotSeg;
    status('rotStatus', 'Loading MediaPipe segmentation model (first use needs internet)…');
    const vision = await import('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/+esm');
    const fileset = await vision.FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm');
    rotSeg = await vision.ImageSegmenter.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite', delegate: 'GPU' },
      runningMode: 'VIDEO', outputConfidenceMasks: true
    });
    return rotSeg;
  }
  function rotFrame(w, h) {
    if (!rotScratch) rotScratch = document.createElement('canvas');
    if (rotScratch.width !== w || rotScratch.height !== h) { rotScratch.width = w; rotScratch.height = h; }
    rotScratch.getContext('2d').drawImage(rotMedia, 0, 0, w, h);
    return rotScratch;
  }
  function rotComposite(w, h) {
    const res = rotSeg.segmentForVideo(rotFrame(w, h), performance.now());
    const mask = res.confidenceMasks[0];
    const mw = mask.width, mh = mask.height;
    const vals = mask.getAsFloat32Array ? mask.getAsFloat32Array() : (mask.getAsImageData ? mask.getAsImageData().data : null);
    const off = document.createElement('canvas'); off.width = w; off.height = h;
    const octx = off.getContext('2d'); octx.drawImage(rotMedia, 0, 0, w, h);
    const img = octx.getImageData(0, 0, w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const mi = Math.floor(y * mh / h) * mw + Math.floor(x * mw / w);
      let a = vals ? vals[mi] : 0;
      if (vals && vals.length === mw * mh * 4) a = vals[mi * 4 + 3] / 255;
      img.data[(y * w + x) * 4 + 3] = Math.min(img.data[(y * w + x) * 4 + 3], Math.round(Math.max(0, Math.min(1, a)) * 255));
    }
    octx.putImageData(img, 0, 0);
    return off;
  }
  $('rotLoad')?.addEventListener('change', e => {
    const f = e.target.files[0]; if (!f) return;
    const isVideo = f.type.startsWith('video');
    rotKind = isVideo ? 'video' : 'image';
    rotMedia = document.createElement(isVideo ? 'video' : 'img');
    rotMedia.src = URL.createObjectURL(f);
    if (isVideo) { rotMedia.muted = true; rotMedia.loop = true; rotMedia.playsInline = true; }
    rotMedia.addEventListener(isVideo ? 'loadeddata' : 'load', () => {
      const c = $('rotCanvas'); c.width = rotMedia.videoWidth || rotMedia.naturalWidth; c.height = rotMedia.videoHeight || rotMedia.naturalHeight;
      $('rotProcess').disabled = false; $('rotExport').disabled = !isVideo;
      status('rotStatus', `Loaded “${f.name}” (${c.width}×${c.height}). Run segmentation to isolate the subject.`);
    });
    e.target.value = '';
  });
  $('rotBgImage')?.addEventListener('change', e => {
    const f = e.target.files[0]; if (!f) return;
    const img = new Image(); img.onload = () => { $('rotBgMode').value = 'image'; status('rotStatus', 'Background image ready.'); }; img.src = URL.createObjectURL(f);
    window._rotBgImg = img;
    e.target.value = '';
  });
  $('rotProcess')?.addEventListener('click', async () => {
    if (!rotMedia || rotBusy) return;
    try {
      await rotInit(); rotBusy = true;
      const c = $('rotCanvas'), cx = c.getContext('2d');
      const comp = rotComposite(c.width, c.height);
      cx.fillStyle = $('rotBgMode').value === 'color' ? $('rotBgColor').value : '#000';
      if ($('rotBgMode').value === 'image' && window._rotBgImg) cx.drawImage(window._rotBgImg, 0, 0, c.width, c.height);
      else cx.fillRect(0, 0, c.width, c.height);
      cx.drawImage(comp, 0, 0);
      status('rotStatus', 'Subject matte applied. For video, use “Play preview” then export; for an image, right-click → Save image, or use Export frame.');
    } catch (err) { status('rotStatus', err.message || 'Segmentation failed on this device.'); }
    rotBusy = false;
  });
  $('rotLoop')?.addEventListener('click', async () => {
    if (rotKind !== 'video') return status('rotStatus', 'Load a video to preview masking over time.');
    try {
      await rotInit(); rotMedia.play();
      const c = $('rotCanvas'), cx = c.getContext('2d');
      const loop = () => {
        if (rotKind !== 'video') return;
        try {
          const comp = rotComposite(c.width, c.height);
          cx.fillStyle = $('rotBgMode').value === 'color' ? $('rotBgColor').value : '#000';
          cx.fillRect(0, 0, c.width, c.height);
          if ($('rotBgMode').value === 'image' && window._rotBgImg) cx.drawImage(window._rotBgImg, 0, 0, c.width, c.height);
          cx.drawImage(comp, 0, 0);
        } catch {}
        if (!rotMedia.paused) requestAnimationFrame(loop);
      };
      loop(); status('rotStatus', 'Live matte preview running (real-time segmentation per frame).');
    } catch (err) { status('rotStatus', err.message || 'Could not start preview.'); }
  });
  $('rotStopLoop')?.addEventListener('click', () => { if (rotMedia) rotMedia.pause(); status('rotStatus', 'Preview stopped.'); });
  $('rotExportFrame')?.addEventListener('click', () => {
    const c = $('rotCanvas');
    c.toBlob(b => { if (b) { saveBlob(b, `tyb-rotoscope-${Date.now()}.png`); status('rotStatus', 'PNG frame saved.'); } }, 'image/png');
  });
  $('rotExport')?.addEventListener('click', async () => {
    if (rotKind !== 'video' || !window.MediaRecorder) return status('rotStatus', 'Video export needs MediaRecorder (Chrome/Edge/Firefox).');
    try {
      await rotInit(); rotMedia.currentTime = 0; rotMedia.muted = true;
      await new Promise(r => { rotMedia.onseeked = r; });
      const c = $('rotCanvas'), stream = c.captureStream(30);
      const mime = ['video/webm;codecs=vp9', 'video/webm'].find(m => MediaRecorder.isTypeSupported(m));
      const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 6_000_000 });
      const chunks = []; rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
      const done = new Promise(r => rec.onstop = r);
      const actx = AC ? new AC() : null;
      if (actx) { const src = actx.createMediaElementSource(rotMedia), dest = actx.createMediaStreamDestination(); src.connect(dest); dest.stream.getAudioTracks().forEach(tr => stream.addTrack(tr)); }
      const draw = () => {
        try { const comp = rotComposite(c.width, c.height); const cx = c.getContext('2d'); cx.fillStyle = '#000'; cx.fillRect(0, 0, c.width, c.height); if ($('rotBgMode').value === 'image' && window._rotBgImg) cx.drawImage(window._rotBgImg, 0, 0, c.width, c.height); cx.drawImage(comp, 0, 0); } catch {}
        if (!rotMedia.paused && !rotMedia.ended) requestAnimationFrame(draw);
      };
      rec.start(250); rotMedia.play(); draw();
      await new Promise(r => { rotMedia.onended = r; });
      rec.stop(); await done;
      saveBlob(new Blob(chunks, { type: 'video/webm' }), `tyb-rotoscope-${Date.now()}.webm`);
      status('rotStatus', 'Rotoscoped video exported (WebM, real-time render).');
    } catch (err) { status('rotStatus', err.message || 'Export failed.'); }
  });

  /* ============ AI CHARACTER OVERLAY ============ */
  let chrLm = null, chrStream = null, chrRunning = false;
  async function chrInit() {
    if (chrLm) return chrLm;
    status('chrStatus', 'Loading face tracking model (first use needs internet)…');
    const vision = await import('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/+esm');
    const fileset = await vision.FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm');
    chrLm = await vision.FaceLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task', delegate: 'GPU' },
      runningMode: 'VIDEO', numFaces: 1, outputFaceBlendshapes: true
    });
    return chrLm;
  }
  function drawAvatar(cx, c, res, style) {
    const lm = res.faceLandmarks && res.faceLandmarks[0];
    if (!lm) return;
    const W = c.width, H = c.height;
    const nose = lm[1], lEar = lm[234], rEar = lm[454];
    const cxp = ((lEar.x + rEar.x) / 2) * W, cyp = ((lEar.y + rEar.y) / 2) * H - H * 0.06;
    const faceW = Math.hypot((rEar.x - lEar.x) * W, (rEar.y - lEar.y) * H);
    const open = res.faceBlendshapes?.[0]?.categories?.find(k => k.categoryName === 'jawOpen')?.score || 0;
    const R = faceW * 0.85;
    cx.save(); cx.translate(cxp, cyp);
    const skin = style === 'robot' ? '#9aa7b8' : style === 'animal' ? '#c98f4e' : '#ffd7b5';
    const accent = style === 'robot' ? '#3af' : style === 'animal' ? '#7a4a1e' : '#e74c3c';
    cx.fillStyle = skin; cx.beginPath(); cx.arc(0, 0, R, 0, Math.PI * 2); cx.fill(); // head
    if (style === 'animal') { cx.fillStyle = skin; [[-R * 0.7, -R * 0.75], [R * 0.7, -R * 0.75]].forEach(([x, y]) => { cx.beginPath(); cx.moveTo(x, y); cx.lineTo(x - R * 0.22, y - R * 0.55); cx.lineTo(x + R * 0.22, y - R * 0.45); cx.fill(); }); }
    if (style === 'robot') { cx.strokeStyle = accent; cx.lineWidth = R * 0.08; cx.strokeRect(-R, -R, 2 * R, 2 * R); cx.fillStyle = accent; cx.fillRect(0, -R * 1.25, R * 0.08, R * 0.3); }
    cx.fillStyle = '#fff'; [-R * 0.36, R * 0.36].forEach(x => { cx.beginPath(); cx.ellipse(x, -R * 0.18, R * 0.2, R * 0.24, 0, 0, Math.PI * 2); cx.fill(); });
    cx.fillStyle = '#222'; [-R * 0.36, R * 0.36].forEach(x => { cx.beginPath(); cx.arc(x, -R * 0.15, R * 0.09, 0, Math.PI * 2); cx.fill(); });
    cx.fillStyle = accent; cx.beginPath(); cx.ellipse(0, R * 0.42, R * (0.28 + open * 0.2), R * (0.1 + open * 0.5), 0, 0, Math.PI * 2); cx.fill(); // mouth driven by jawOpen
    cx.restore();
  }
  $('chrStart')?.addEventListener('click', async () => {
    if (!navigator.mediaDevices?.getUserMedia) return status('chrStatus', 'Camera needs HTTPS and permission. On desktop you can also allow camera and retry.');
    try {
      await chrInit();
      chrStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
      const v = $('chrVideo'); v.srcObject = chrStream; v.classList.remove('hidden');
      await v.play(); chrRunning = true; $('chrStart').disabled = true; $('chrStop').disabled = false;
      const c = $('chrCanvas'), cx = c.getContext('2d');
      c.width = v.videoWidth || 640; c.height = v.videoHeight || 480;
      const loop = () => {
        if (!chrRunning) return;
        cx.drawImage(v, 0, 0, c.width, c.height);
        try { const res = chrLm.detectForVideo(v, performance.now()); drawAvatar(cx, c, res, $('chrStyle').value); } catch {}
        requestAnimationFrame(loop);
      };
      loop(); status('chrStatus', 'Character overlay live — move your head and talk. Nothing is uploaded; export saves a local WebM.');
    } catch (err) { status('chrStatus', err.message || 'Camera or model failed to start.'); }
  });
  $('chrStop')?.addEventListener('click', () => {
    chrRunning = false; chrStream?.getTracks().forEach(t => t.stop()); chrStream = null;
    $('chrVideo').classList.add('hidden'); $('chrStart').disabled = false; $('chrStop').disabled = true;
    status('chrStatus', 'Stopped.');
  });
  $('chrExport')?.addEventListener('click', async () => {
    if (!chrRunning || !window.MediaRecorder) return status('chrStatus', 'Start the camera overlay first.');
    const c = $('chrCanvas'), stream = c.captureStream(30);
    const mime = ['video/webm;codecs=vp9', 'video/webm'].find(m => MediaRecorder.isTypeSupported(m));
    const rec = new MediaRecorder(stream, { mimeType: mime });
    const chunks = []; rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
    const done = new Promise(r => rec.onstop = r);
    rec.start(250); status('chrStatus', 'Recording 8 seconds of the overlay…');
    await new Promise(r => setTimeout(r, 8000));
    rec.stop(); await done;
    saveBlob(new Blob(chunks, { type: 'video/webm' }), `tyb-character-${Date.now()}.webm`);
    status('chrStatus', 'Overlay clip saved (8s WebM).');
  });

  /* ============ 3D VIRTUAL SET ============ */
  let setRenderer = null, setScene = null, setCam = null, setActive = false;
  function setPickMime() { return ['video/webm;codecs=vp9', 'video/webm'].find(m => MediaRecorder.isTypeSupported(m)); }
  $('setBuild')?.addEventListener('click', async () => {
    try {
      await loadScript('https://cdn.jsdelivr.net/npm/three@0.152.2/build/three.min.js', () => !!window.THREE);
      if (setRenderer) { status('setStatus', 'Virtual set already built.'); return; }
      const canvas = $('setCanvas');
      setRenderer = new THREE.WebGLRenderer({ canvas, antialias: true });
      setRenderer.setSize(canvas.clientWidth || 640, canvas.clientHeight || 360, false);
      setScene = new THREE.Scene(); setScene.background = new THREE.Color(0x11131b);
      setCam = new THREE.PerspectiveCamera(50, 16 / 9, 0.1, 100); setCam.position.set(0, 1.6, 6);
      setScene.add(new THREE.AmbientLight(0xffffff, 0.5));
      const key = new THREE.PointLight(0xfff2dd, 1.2); key.position.set(3, 4, 4); setScene.add(key);
      const rim = new THREE.PointLight(0x6688ff, 0.8); rim.position.set(-4, 3, -2); setScene.add(rim);
      const floor = new THREE.Mesh(new THREE.PlaneGeometry(24, 24), new THREE.MeshStandardMaterial({ color: 0x2a2f3f, roughness: 0.4, metalness: 0.4 }));
      floor.rotation.x = -Math.PI / 2; setScene.add(floor);
      const wallMat = new THREE.MeshStandardMaterial({ color: 0x39415a, roughness: 0.9 });
      const back = new THREE.Mesh(new THREE.PlaneGeometry(24, 10), wallMat); back.position.set(0, 5, -7); setScene.add(back);
      [[-8, 0], [8, 0]].forEach(([x]) => { const side = new THREE.Mesh(new THREE.PlaneGeometry(14, 10), wallMat); side.position.set(x, 5, 0); side.rotation.y = x < 0 ? Math.PI / 2 : -Math.PI / 2; setScene.add(side); });
      const screen = new THREE.Mesh(new THREE.PlaneGeometry(4.8, 2.7), new THREE.MeshBasicMaterial({ color: 0x0a0c12 }));
      screen.position.set(0, 2.4, -6.9); setScene.add(screen);
      window._setScreenMat = screen.material;
      const bezel = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.2, 0.2), new THREE.MeshStandardMaterial({ color: 0x11131b }));
      bezel.position.set(0, 0.9, -6.9); setScene.add(bezel);
      setActive = true; const render = () => { if (!setActive) return; setRenderer.render(setScene, setCam); requestAnimationFrame(render); };
      render(); $('setMove').disabled = false; $('setExport').disabled = false;
      status('setStatus', 'Virtual set ready. Place an image/video on the screen wall, then try camera moves or export a WebM clip.');
    } catch (err) { status('setStatus', err.message || 'WebGL is not available on this device.'); }
  });
  $('setMedia')?.addEventListener('change', e => {
    const f = e.target.files[0]; if (!f || !window.THREE) return;
    const url = URL.createObjectURL(f);
    if (f.type.startsWith('video')) {
      const v = document.createElement('video'); v.src = url; v.muted = true; v.loop = true; v.playsInline = true; v.play().catch(() => {});
      window._setScreenMat.map = new THREE.VideoTexture(v); window._setScreenMat.color.set(0xffffff);
    } else {
      const img = new Image(); img.onload = () => { window._setScreenMat.map = new THREE.Texture(img); window._setScreenMat.map.needsUpdate = true; window._setScreenMat.color.set(0xffffff); }; img.src = url;
    }
    window._setScreenMat.needsUpdate = true;
    status('setStatus', `“${f.name}” placed on the studio screen.`);
    e.target.value = '';
  });
  $('setMove')?.addEventListener('click', () => {
    if (!setCam) return;
    const moves = { dolly: [0, 1.6, 3.2], orbit: [5, 2.2, 3], crane: [0, 4.5, 6.5], wide: [0, 1.8, 8.5] };
    const t = moves[$('setMoveSel').value] || moves.wide;
    const from = setCam.position.clone(); let k = 0;
    const step = () => { k += 0.03; if (k >= 1) { setCam.position.set(...t); setCam.lookAt(0, 1.6, -2); return; } setCam.position.lerpVectors(from, new THREE.Vector3(...t), k); setCam.lookAt(0, 1.6, -2); requestAnimationFrame(step); };
    step();
  });
  $('setExport')?.addEventListener('click', async () => {
    if (!setRenderer || !window.MediaRecorder) return status('setStatus', 'Build the set first.');
    const stream = $('setCanvas').captureStream(30);
    const rec = new MediaRecorder(stream, { mimeType: setPickMime(), videoBitsPerSecond: 6_000_000 });
    const chunks = []; rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
    const done = new Promise(r => rec.onstop = r);
    rec.start(250); $('setMoveSel').value = 'dolly'; $('setMove').click();
    status('setStatus', 'Recording a 6-second dolly-in move…');
    await new Promise(r => setTimeout(r, 6000));
    rec.stop(); await done;
    saveBlob(new Blob(chunks, { type: 'video/webm' }), `tyb-virtualset-${Date.now()}.webm`);
    status('setStatus', 'Virtual set clip saved (WebM).');
  });

  /* ============ LOCAL AI ============ */
  let transformersMod = null;
  async function genInit() {
    if (transformersMod) return transformersMod;
    status('genStatus', 'Loading transformers.js engine (small download)…');
    transformersMod = await import('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2');
    transformersMod.env.allowLocalModels = false;
    return transformersMod;
  }
  $('genRemoveBg')?.addEventListener('click', async () => {
    const f = $('genImage').files[0];
    if (!f) return status('genStatus', 'Choose an image first.');
    try {
      await genInit();
      status('genStatus', 'Downloading RMBG-1.4 background-removal model (~45 MB, cached after first use)…');
      const pipe = await transformersMod.pipeline('image-segmentation', 'briaai/RMBG-1.4', { quantized: true });
      status('genStatus', 'Removing background on-device…');
      const out = await pipe(f);
      const d = out[0]; // {mask, img?}
      const c = $('genCanvas'), cx = c.getContext('2d');
      const img = new Image();
      img.onload = () => {
        c.width = img.naturalWidth; c.height = img.naturalHeight;
        cx.drawImage(img, 0, 0);
        const id = cx.getImageData(0, 0, c.width, c.height);
        const mask = d.mask.data; // Float32-ish 0..1 per pixel
        for (let i = 0; i < mask.length; i++) id.data[i * 4 + 3] = Math.round(Math.max(0, Math.min(1, mask[i])) * 255);
        cx.putImageData(id, 0, 0);
        status('genStatus', 'Background removed locally. Save the PNG with the button below.');
      };
      img.src = URL.createObjectURL(f);
      $('genSave').disabled = false;
    } catch (err) { status('genStatus', `Local AI failed: ${err.message || err}. This feature needs a desktop-class browser with ~1 GB free memory.`); }
  });
  $('genSave')?.addEventListener('click', () => {
    $('genCanvas').toBlob(b => { if (b) { saveBlob(b, `tyb-cutout-${Date.now()}.png`); status('genStatus', 'PNG saved.'); } }, 'image/png');
  });
  $('genCaption')?.addEventListener('click', async () => {
    const f = $('genImage').files[0];
    if (!f) return status('genStatus', 'Choose an image first.');
    try {
      await genInit();
      status('genStatus', 'Downloading image-captioning model (~90 MB, cached after first use)…');
      const pipe = await transformersMod.pipeline('image-to-text', 'Xenova/vit-gpt2-image-captioning', { quantized: true });
      const out = await pipe(f);
      $('genText').value = out.map(o => o.generated_text).join(' ');
      status('genStatus', 'Caption generated locally.');
    } catch (err) { status('genStatus', `Captioning failed: ${err.message || err}`); }
  });

  status('rotStatus', 'AI Rotoscope ready — load a photo or video. First use downloads a small model (~1 MB) + runtime.');
  status('chrStatus', 'AI Character ready — allow camera access to drive a cartoon, robot or animal avatar with your face.');
  status('setStatus', '3D Virtual Set loads three.js on first use (~600 KB) and renders locally with WebGL.');
  status('genStatus', 'Local AI runs entirely on-device after a one-time model download; nothing is uploaded.');
})();
