/* Private on-device camera preview and lightweight animated companion. No video is transmitted. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const start = $('tayabCallStart');
  if (!start) return;
  const camera = $('tayabCameraPreview'), avatar = $('tayabCallAvatar'), caption = $('tayabCallCaption'), status = $('tayabCallStatus');
  let stream = null;
  function say(text) {
    caption.textContent = text;
    avatar.classList.add('talking');
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1; utterance.pitch = 1.08;
      utterance.onend = () => avatar.classList.remove('talking');
      utterance.onerror = () => avatar.classList.remove('talking');
      window.speechSynthesis.speak(utterance);
    } else setTimeout(() => avatar.classList.remove('talking'), 1800);
  }
  start.addEventListener('click', async () => {
    if (!navigator.mediaDevices?.getUserMedia) { status.textContent = 'Camera preview is not available in this browser or context. Try the installed app or HTTPS.'; return; }
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
      camera.srcObject = stream; camera.classList.add('active');
      start.disabled = true; $('tayabCallStop').disabled = false;
      status.textContent = 'Camera is active locally. No camera frames are uploaded or sent to a server.';
      say('Hi! I’m Tayab. I can keep you company while you create. What shall we make today?');
    } catch (error) {
      status.textContent = error?.name === 'NotAllowedError' ? 'Camera permission was denied. You can still chat with Tayab without the camera.' : 'Could not start the camera. Check browser permission and try again.';
    }
  });
  $('tayabCallStop').addEventListener('click', () => {
    if (stream) stream.getTracks().forEach(track => track.stop());
    stream = null; camera.srcObject = null; camera.classList.remove('active');
    start.disabled = false; $('tayabCallStop').disabled = true;
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    avatar.classList.remove('talking'); caption.textContent = 'Call ended. I’m here whenever you want to create.';
    status.textContent = 'Camera stopped. Nothing was uploaded.';
  });
  $('tayabCallTalk').addEventListener('click', () => say('Hello! I’m Tayab, your creative companion. We can make a short video, add music, design a story, or plan a new feature together.'));
  window.addEventListener('pagehide', () => { if (stream) stream.getTracks().forEach(track => track.stop()); if ('speechSynthesis' in window) window.speechSynthesis.cancel(); });
})();
