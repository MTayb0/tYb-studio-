(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const APP_VERSION = '0.17.0';
  const CACHE_NAME = 'tyb-studio-modules-v1';
  const registryUrl = new URL('./module-registry.json', document.baseURI).href;
  let registry = null;
  let activeModule = null;

  function setStatus(message) { const el = $('moduleStatus'); if (el) el.textContent = message; }
  function versionTuple(v) { return String(v || '0.0.0').split('.').map(n => Number.parseInt(n, 10) || 0); }
  function versionAtLeast(actual, required) {
    const a = versionTuple(actual), b = versionTuple(required);
    for (let i = 0; i < 3; i++) { if (a[i] > b[i]) return true; if (a[i] < b[i]) return false; }
    return true;
  }
  async function cachedFetch(url, forceNetwork = false) {
    const cache = 'caches' in window ? await caches.open(CACHE_NAME) : null;
    if (!forceNetwork && cache) {
      const cached = await cache.match(url);
      if (cached) return cached;
    }
    const response = await fetch(url, { cache: forceNetwork ? 'no-store' : 'default' });
    if (!response.ok) throw new Error(`HTTP ${response.status} for ${new URL(url).pathname}`);
    if (cache) await cache.put(url, response.clone());
    return response;
  }
  async function fetchText(url) { return (await cachedFetch(url)).text(); }
  async function loadRegistry(forceNetwork = false) {
    let response;
    if (forceNetwork) {
      response = await fetch(registryUrl, { cache: 'no-store' });
      if (!response.ok) throw new Error(`Registry request failed (${response.status})`);
      if ('caches' in window) (await caches.open(CACHE_NAME)).put(registryUrl, response.clone());
    } else {
      try { response = await cachedFetch(registryUrl); }
      catch (err) {
        if (!('caches' in window)) throw err;
        const cache = await caches.open(CACHE_NAME); response = await cache.match(registryUrl);
        if (!response) throw err;
      }
    }
    const data = await response.json();
    if (data.schemaVersion !== 1 || !Array.isArray(data.modules)) throw new Error('Unsupported or invalid module registry.');
    registry = data;
    return data;
  }
  function renderModules() {
    const host = $('moduleList'); if (!host || !registry) return;
    host.replaceChildren();
    if (!registry.modules.length) { host.innerHTML = '<p class="muted">No compatible modules are published yet.</p>'; return; }
    registry.modules.forEach((mod) => {
      const card = document.createElement('article'); card.className = 'tool-card module-card';
      const icon = document.createElement('span'); icon.className = 'tool-icon purple'; icon.textContent = '＋';
      const name = document.createElement('strong'); name.textContent = mod.name;
      const desc = document.createElement('small'); desc.textContent = mod.description;
      const version = document.createElement('small'); version.textContent = `Version ${mod.version}`;
      const button = document.createElement('button'); button.className = 'primary'; button.type = 'button'; button.textContent = 'Open module';
      const compatible = versionAtLeast(APP_VERSION, mod.minAppVersion || '0.1.0');
      if (!compatible) { button.disabled = true; button.textContent = 'App update required'; }
      button.addEventListener('click', () => openModule(mod));
      card.append(icon, name, desc, version, button); host.append(card);
    });
  }
  async function openModule(mod) {
    try {
      activeModule = mod;
      $('moduleTitle').textContent = mod.name;
      $('moduleDescription').textContent = `${mod.description} · v${mod.version}`;
      const base = new URL(mod.entry, document.baseURI);
      const [html, css, js] = await Promise.all([
        fetchText(new URL(`module.html?v=${encodeURIComponent(mod.version)}`, base).href), fetchText(new URL(`module.css?v=${encodeURIComponent(mod.version)}`, base).href), fetchText(new URL(`module.js?v=${encodeURIComponent(mod.version)}`, base).href)
      ]);
      // srcdoc is sandboxed without allow-same-origin. Module scripts cannot reach the parent DOM.
      const safeJs = js.replace(/<\/script/gi, '<\\/script');
      const doc = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data: blob:; media-src blob:; connect-src 'none'; form-action 'none'"><style>${css.replace(/<\/style/gi, '<\\/style')}</style></head><body>${html}<script>${safeJs}<\/script></body></html>`;
      const frame = document.createElement('iframe'); frame.title = `${mod.name} module`; frame.setAttribute('sandbox', 'allow-scripts allow-downloads'); frame.referrerPolicy = 'no-referrer'; frame.className = 'module-frame'; frame.srcdoc = doc;
      $('moduleFrameWrap').replaceChildren(frame);
      if (window.navigate) window.navigate('moduleScreen');
      else { document.querySelectorAll('.screen').forEach(s => s.classList.toggle('active', s.id === 'moduleScreen')); }
    } catch (error) {
      setStatus(`Could not open module: ${error.message}. Connect to the internet once to cache it, or check that its files are valid.`);
    }
  }
  async function checkUpdates() {
    const button = $('checkUpdates'); if (button) button.disabled = true;
    setStatus('Checking the hosted module registry…');
    try {
      const old = new Map((registry?.modules || []).map(m => [m.id, m.version]));
      const latest = await loadRegistry(true);
      const changes = latest.modules.filter(m => !old.has(m.id) || old.get(m.id) !== m.version);
      renderModules();
      const message = changes.length ? `Update check complete: ${changes.length} new or changed module(s) found. Latest registry is cached for offline use.` : 'You have the latest published module registry. Registry is cached for offline use.';
      setStatus(message);
    } catch (error) {
      setStatus(`Could not check online updates (${error.message}). Showing the last cached registry if available; offline devices cannot discover new updates.`);
      try { await loadRegistry(false); renderModules(); } catch {}
    } finally { if (button) button.disabled = false; }
  }
  async function init() {
    $('checkUpdates')?.addEventListener('click', checkUpdates);
    try {
      await loadRegistry(false); renderModules();
      setStatus(`Registry loaded · ${registry.modules.length} module(s) · app ${APP_VERSION}. Use Check for updates when online.`);
    } catch (error) {
      setStatus(`Module registry unavailable: ${error.message}. The main app can still be used.`);
    }
  }
  document.addEventListener('DOMContentLoaded', init);
})();
