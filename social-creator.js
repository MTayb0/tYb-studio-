/* Social Creator Studio: local settings, safe visual looks, and format-aware export helpers. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const video = $('videoPreview');
  if (!video || !$('socialAspect')) return;
  const lookFilters = {
    none: 'none', vivid: 'contrast(1.16) saturate(1.45)', warm: 'sepia(.18) saturate(1.2) brightness(1.04)',
    mono: 'grayscale(1)', dreamy: 'brightness(1.08) saturate(1.1) blur(.35px)',
    mirror: 'none', toon: 'contrast(1.35) saturate(1.8)'
  };
  const status = message => { $('socialStatus').textContent = message; };
  $('socialMusicVolume').addEventListener('input', e => $('socialMusicVolumeOut').textContent = `${e.target.value}%`);
  $('socialOriginalVolume').addEventListener('input', e => $('socialOriginalVolumeOut').textContent = `${e.target.value}%`);
  $('socialMusicInput').addEventListener('change', () => {
    const file = $('socialMusicInput').files?.[0];
    if (!file) return;
    const audio = $('socialMusicPreview');
    if (audio.dataset.objectUrl) URL.revokeObjectURL(audio.dataset.objectUrl);
    audio.dataset.objectUrl = URL.createObjectURL(file);
    audio.src = audio.dataset.objectUrl;
    audio.classList.remove('hidden');
    status(`Loaded “${file.name}”. Preview it here; enable it for export by keeping the music volume above 0%. Use audio you have permission to use.`);
  });
  $('socialApply').addEventListener('click', () => {
    const look = $('socialLook').value;
    video.style.filter = lookFilters[look] || 'none';
    video.style.transform = look === 'mirror' ? 'scaleX(-1)' : '';
    status(`Applied ${look} look to the preview. The export uses the selected social format and caption. These are color/style effects, not identity-changing face swaps.`);
  });
  $('socialSaveProject').addEventListener('click', () => {
    const settings = { version: 1, aspect: $('socialAspect').value, look: $('socialLook').value, caption: $('socialCaption').value, musicVolume: Number($('socialMusicVolume').value), originalVolume: Number($('socialOriginalVolume').value), savedAt: new Date().toISOString() };
    try { localStorage.setItem('tyb.socialCreator.settings', JSON.stringify(settings)); status('Edit settings saved locally on this device. Media files themselves were not copied or uploaded.'); }
    catch { status('Could not save settings in browser storage. You can still use the current settings for this session.'); }
  });
  try {
    const saved = JSON.parse(localStorage.getItem('tyb.socialCreator.settings') || 'null');
    if (saved?.version === 1) {
      if (['portrait','square','landscape'].includes(saved.aspect)) $('socialAspect').value = saved.aspect;
      if (lookFilters[saved.look]) $('socialLook').value = saved.look;
      $('socialCaption').value = String(saved.caption || '').slice(0,100);
      if (Number.isFinite(saved.musicVolume)) $('socialMusicVolume').value = Math.max(0,Math.min(100,saved.musicVolume));
      if (Number.isFinite(saved.originalVolume)) $('socialOriginalVolume').value = Math.max(0,Math.min(100,saved.originalVolume));
      $('socialMusicVolumeOut').textContent = `${$('socialMusicVolume').value}%`;
      $('socialOriginalVolumeOut').textContent = `${$('socialOriginalVolume').value}%`;
    }
  } catch {}
  window.TYBSocialCreator = { lookFilters };
})();
