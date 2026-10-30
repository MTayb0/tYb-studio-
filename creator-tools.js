(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const safeRead = (key, fallback) => { try { const value = JSON.parse(localStorage.getItem(key)); return value ?? fallback; } catch { return fallback; } };
  const safeWrite = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; } };
  const download = (name, text, type = 'text/plain;charset=utf-8') => {
    const url = URL.createObjectURL(new Blob([text], { type })); const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1200);
  };
  const brandKey = 'tyb-creator-brand-v1';
  const planKey = 'tyb-creator-plan-v1';
  let plan = safeRead(planKey, []);
  let generatedDraft = '';
  let batchUrls = [];
  const brandFields = ['brandName', 'brandTagline', 'brandNiche', 'brandPrimary', 'brandAccent'];
  function getBrand() { return Object.fromEntries(brandFields.map(id => [id, $(id).value.trim()])); }
  function loadBrand() {
    const brand = safeRead(brandKey, {});
    brandFields.forEach(id => { if (brand[id] != null && $(id)) $(id).value = brand[id]; });
    if ($('brandStatus')) $('brandStatus').textContent = brand.brandName ? `Loaded brand kit: ${brand.brandName}` : 'No saved brand kit yet.';
  }
  $('saveBrandKit')?.addEventListener('click', () => {
    const brand = getBrand();
    $('brandStatus').textContent = safeWrite(brandKey, brand) ? 'Brand kit saved on this device.' : 'Could not save: device storage may be full or disabled.';
  });
  $('exportBrandKit')?.addEventListener('click', () => download('tyb-brand-kit.json', JSON.stringify(getBrand(), null, 2), 'application/json'));
  function makeCopy() {
    const topic = $('copyTopic').value.trim();
    if (!topic) { $('copyStatus').textContent = 'Add a topic first.'; $('copyTopic').focus(); return; }
    const brand = safeRead(brandKey, {});
    const platform = $('copyPlatform').value, tone = $('copyTone').value, goal = $('copyGoal').value;
    const voice = ({friendly:'Come along with me —',bold:'Here is the truth:',professional:'A practical perspective:',playful:'Tiny idea, big energy:',inspiring:'Your next step can start today:'})[tone];
    const hook = ({engage:`Quick question: have you tried ${topic.toLowerCase()}?`,educate:`Here is one useful thing to know about ${topic.toLowerCase()}.`,sell:`Looking for a better way to approach ${topic.toLowerCase()}?`,story:`I want to share a thought about ${topic.toLowerCase()}.`})[goal];
    const cta = ({engage:'Tell me your experience in the comments.',educate:'Save this for the next time you need it.',sell:'Message me to learn more. Check the details before you buy.',story:'Have you experienced something similar? Share your story.'})[goal];
    const rawTags = `${topic} ${brand.brandNiche || ''} ${brand.brandName || ''}`.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu,' ').split(/\s+/).filter(w => w.length > 2 && !['with','from','that','this','your','about','ways','easy','into'].includes(w));
    const tags = [...new Set(rawTags)].slice(0, 5).map(w => `#${w.replace(/[^\p{L}\p{N}]/gu,'')}`);
    const platformNote = platform === 'LinkedIn' ? 'Keep the final version specific, useful, and professional.' : platform === 'X' ? 'Shorten this for your preferred post length before publishing.' : 'Consider adding your own clip, image, or personal example.';
    generatedDraft = `${brand.brandName ? `${brand.brandName}${brand.brandTagline ? ` — ${brand.brandTagline}` : ''}\n\n` : ''}${hook}\n\n${voice} ${topic.replace(/[.!?]+$/,'')}. Add a real example, result, or detail from your experience so the post feels authentic.\n\n${cta}\n\n${tags.join(' ')}\n\n[${platform} note: ${platformNote}]`;
    $('copyResult').value = generatedDraft; $('copyStatus').textContent = 'Draft created locally. It is a template, not fact-checked AI output; personalize it before posting.';
  }
  $('generateCopy')?.addEventListener('click', makeCopy);
  $('copyDraft')?.addEventListener('click', async () => {
    const text = $('copyResult').value.trim(); if (!text) { $('copyStatus').textContent = 'Generate or write a draft first.'; return; }
    try { await navigator.clipboard.writeText(text); $('copyStatus').textContent = 'Draft copied.'; } catch { $('copyResult').focus(); $('copyResult').select(); $('copyStatus').textContent = 'Clipboard permission unavailable. Draft selected; use Copy from your device menu.'; }
  });
  $('downloadDraft')?.addEventListener('click', () => { const text = $('copyResult').value.trim(); if (text) download('tyb-social-draft.txt', text); else $('copyStatus').textContent = 'Generate or write a draft first.'; });
  $('addCopyToPlan')?.addEventListener('click', () => {
    const title = $('copyTopic').value.trim(); if (!title) { $('copyStatus').textContent = 'Add a topic first.'; return; }
    addPlan({ date: new Date().toISOString().slice(0,10), platform: $('copyPlatform').value, title, state: 'Drafting', notes: $('copyResult').value.slice(0,300) });
    $('copyStatus').textContent = 'Topic added to your content planner.';
  });
  function addPlan(item) { plan.unshift({ id: `${Date.now()}-${Math.random().toString(36).slice(2,7)}`, ...item }); persistPlan(); renderPlan(); }
  function persistPlan() { const ok = safeWrite(planKey, plan); $('planStatus').textContent = `${plan.length} item(s) · ${ok ? 'saved on this device' : 'storage full; export CSV to preserve your plan'}`; }
  function renderPlan() {
    const root = $('planList'); if (!root) return; root.replaceChildren();
    if (!plan.length) { root.textContent = 'Your planned posts will appear here.'; return; }
    plan.forEach(item => {
      const card = document.createElement('article'); card.className = 'creator-plan-item';
      const title = document.createElement('strong'); title.textContent = item.title;
      const meta = document.createElement('p'); meta.textContent = `${item.date || 'No date'} · ${item.platform} · ${item.state}${item.notes ? ` · ${item.notes}` : ''}`;
      const status = document.createElement('select'); ['Idea','Drafting','Ready','Published'].forEach(value => { const option = document.createElement('option'); option.value = value; option.textContent = value; option.selected = item.state === value; status.append(option); }); status.setAttribute('aria-label', `Status for ${item.title}`); status.addEventListener('change', () => { item.state = status.value; persistPlan(); renderPlan(); });
      const remove = document.createElement('button'); remove.className = 'text-btn'; remove.textContent = 'Remove'; remove.addEventListener('click', () => { plan = plan.filter(p => p.id !== item.id); persistPlan(); renderPlan(); });
      card.append(title, meta, status, remove); root.append(card);
    });
  }
  $('addPlanItem')?.addEventListener('click', () => {
    const title = $('planTitle').value.trim(); if (!title) { $('planStatus').textContent = 'Enter a post idea first.'; $('planTitle').focus(); return; }
    addPlan({ date: $('planDate').value, platform: $('planPlatform').value, title, state: $('planState').value, notes: $('planNotes').value.trim() }); $('planTitle').value = ''; $('planNotes').value = '';
  });
  $('exportPlanCsv')?.addEventListener('click', () => {
    const esc = v => `"${String(v ?? '').replace(/"/g,'""')}"`;
    const rows = [['Date','Platform','Title','Status','Notes'], ...plan.slice().reverse().map(p => [p.date,p.platform,p.title,p.state,p.notes])];
    download('tyb-content-plan.csv', rows.map(row => row.map(esc).join(',')).join('\r\n'), 'text/csv;charset=utf-8');
  });
  function clearBatch() { batchUrls.forEach(URL.revokeObjectURL); batchUrls = []; $('batchResults')?.replaceChildren(); }
  $('batchQuality')?.addEventListener('input', () => { $('batchQualityOut').textContent = `${$('batchQuality').value}%`; });
  $('clearBatchResults')?.addEventListener('click', () => { clearBatch(); $('batchStatus').textContent = 'Results cleared.'; });
  function loadImage(file) {
    return new Promise((resolve, reject) => { const url = URL.createObjectURL(file); const img = new Image(); img.onload = () => { URL.revokeObjectURL(url); resolve(img); }; img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('This image could not be decoded.')); }; img.src = url; });
  }
  $('runBatchOptimize')?.addEventListener('click', async () => {
    const files = [...($('batchImages').files || [])].filter(f => f.type.startsWith('image/'));
    if (!files.length) { $('batchStatus').textContent = 'Choose one or more image files first.'; return; }
    const maxEdge = Math.max(64, Math.min(12000, Number($('batchMaxEdge').value) || 1600));
    const format = $('batchFormat').value, quality = Number($('batchQuality').value) / 100;
    clearBatch(); $('runBatchOptimize').disabled = true; $('batchStatus').textContent = `Processing 0 of ${files.length} images…`;
    let succeeded = 0, failed = 0;
    for (let i=0; i<files.length; i++) {
      const file = files[i];
      try {
        const img = await loadImage(file); const scale = Math.min(1, maxEdge / Math.max(img.naturalWidth, img.naturalHeight));
        const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(img.naturalWidth * scale)); canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
        const ctx = canvas.getContext('2d', { alpha: format !== 'image/jpeg' });
        if (format === 'image/jpeg') { ctx.fillStyle = '#ffffff'; ctx.fillRect(0,0,canvas.width,canvas.height); }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const blob = await new Promise(resolve => canvas.toBlob(resolve, format, quality));
        if (!blob) throw new Error('Browser could not encode this format.');
        const ext = format === 'image/jpeg' ? 'jpg' : format === 'image/png' ? 'png' : 'webp';
        const base = file.name.replace(/\.[^.]+$/, '').replace(/[^\p{L}\p{N}._-]+/gu,'_').slice(0,90) || 'image';
        const url = URL.createObjectURL(blob); batchUrls.push(url);
        const card = document.createElement('div'); card.className = 'batch-result-item';
        const preview = document.createElement('img'); preview.src = url; preview.alt = `Optimized ${file.name}`;
        const info = document.createElement('p'); info.textContent = `${file.name} → ${canvas.width}×${canvas.height} · ${(file.size/1024).toFixed(0)} KB → ${(blob.size/1024).toFixed(0)} KB`;
        const link = document.createElement('a'); link.href = url; link.download = `${base}-optimized.${ext}`; link.textContent = 'Download'; link.className = 'secondary';
        card.append(preview, info, link); $('batchResults').append(card); succeeded++;
      } catch (error) { failed++; const msg = document.createElement('p'); msg.textContent = `${file.name}: ${error.message || 'processing failed'}`; msg.className = 'muted'; $('batchResults').append(msg); }
      $('batchStatus').textContent = `Processing ${i+1} of ${files.length} images…`;
    }
    $('runBatchOptimize').disabled = false; $('batchStatus').textContent = `Finished: ${succeeded} optimized, ${failed} failed. Download each result below.`;
  });
  window.addEventListener('beforeunload', clearBatch);
  loadBrand(); renderPlan();
})();
