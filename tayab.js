(() => {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const STORE = 'tyb-tayab-chat-v1';
  const PREFS = 'tyb-tayab-preferences-v1';
  const box = $('#tayabMessages');
  const input = $('#tayabInput');
  if (!box || !input) return;
  let messages = [];
  let speakReplies = false;
  let recognition = null;
  try { messages = JSON.parse(localStorage.getItem(STORE) || '[]'); if (!Array.isArray(messages)) messages = []; } catch { messages = []; }
  const save = () => { try { localStorage.setItem(STORE, JSON.stringify(messages.slice(-80))); } catch { status('Storage is full; this chat may not be saved.'); } };
  const status = (t) => { const el = $('#tayabStatus'); if (el) el.textContent = t; };
  function add(role, text, persist = true) {
    const item = {role, text: String(text).slice(0, 2400), time: Date.now()};
    messages.push(item);
    if (persist) save();
    renderOne(item);
  }
  function renderOne(item) {
    const el = document.createElement('div'); el.className = `tayab-message ${item.role === 'user' ? 'user' : 'tayab'}`;
    const label = document.createElement('small'); label.textContent = item.role === 'user' ? 'You' : 'Tayab';
    const body = document.createElement('div'); body.textContent = item.text;
    el.append(label, body); box.appendChild(el); box.scrollTop = box.scrollHeight;
  }
  function render() { box.replaceChildren(); messages.slice(-80).forEach(renderOne); }
  function open(screen) { const b = document.querySelector(`[data-open="${screen}"]`); if (b) b.click(); }
  function reply(raw) {
    const q = raw.toLowerCase();
    if (/\b(remember|save my preference|remember that)\b/.test(q)) {
      const pref = raw.replace(/^(please\s+)?(remember|save my preference|remember that)\s*/i, '').trim();
      if (pref) { try { const p = JSON.parse(localStorage.getItem(PREFS) || '[]'); p.push({text: pref.slice(0,240), time: Date.now()}); localStorage.setItem(PREFS, JSON.stringify(p.slice(-30))); return `I'll keep this preference on this device: “${pref.slice(0,240)}”. You can clear app data to remove locally stored chat and preferences.`; } catch {} }
      return 'Tell me the specific preference you would like saved, for example: “Remember that I prefer dark designs.”';
    }
    if (/\b(forget|delete my preferences)\b/.test(q)) { try { localStorage.removeItem(PREFS); } catch {} return 'I cleared the preferences saved by Tayab on this device. Your chat history remains until you clear it separately.'; }
    if (/\b(photo|picture|image|crop|rotate|resize|filter)\b/.test(q)) { if (/\b(open|go to|take me|start)\b/.test(q) || /edit a photo/.test(q)) open('photoScreen'); return 'For photo work, open Photo Studio. Choose your image, then use Crop, Rotate, Resize, or Quick presets. I can guide you, but this built-in version does not directly manipulate the image from chat.'; }
    if (/\b(video|clip|movie|trim|cinematic)\b/.test(q)) { if (/\b(open|go to|take me|start)\b/.test(q) || /make a video/.test(q)) open('videoScreen'); return 'Video Studio is the place to start. Open a clip, preview it, and use the available trim, filters, speed, mirror, and text tools. Advanced multi-track editing is still under development.'; }
    if (/\b(ai feature|coding|code|build|model|resource|background remover|inpainting|speech recognition|local ai)\b/.test(q)) { if (/\b(open|go to|take me|start)\b/.test(q) || /build an ai feature/.test(q)) open('advancedScreen'); return 'Let’s plan it in Advanced Tools → AI Builder & Resource Agent. Describe the feature, choose its area and offline/online approach, then search resources. Downloaded code and models must be checked for compatibility and license before integration; I cannot install or execute arbitrary code automatically yet.'; }
    if (/\b(pdf|document|scan|ocr)\b/.test(q)) { if (/\b(open|go to|take me|start)\b/.test(q)) open('documentsScreen'); return 'Use Scan & PDF for document images, page cleanup, OCR where supported, and PDF export. Secure redaction and every PDF form feature are not guaranteed.'; }
    if (/\b(design|poster|logo|banner|template|layers)\b/.test(q)) { if (/\b(open|go to|take me|start)\b/.test(q)) open('designScreen'); return 'Advanced Design Studio supports editable layers, text, images, shapes, templates, undo/redo, and export. Start there for a poster, logo concept, or banner.'; }
    if (/\b(hello|hi|hey|salam|assalamu|good morning|good evening)\b/.test(q)) return 'Hey! 😊 I’m Tayab, your creative companion in TYB Studio. Tell me what you want to make, and I’ll help you find the right tools.';
    if (/\b(who are you|your name|are you tayab)\b/.test(q)) return 'I’m Tayab, your AI friend inside TYB Studio. I’m a starter companion right now: I can guide you through the app and save preferences locally, but I’m not yet powered by a full offline language model.';
    if (/\b(help|what can you do|features)\b/.test(q)) return 'I can guide you through Photo, Design, Video, Scan & PDF, and the AI Builder. Try asking “help me edit a photo”, “make a video”, or “help me add an AI feature”. My replies are currently built-in guidance rather than free-form AI reasoning.';
    return 'I’m here with you. I’m still a starter version, so I may not understand every open-ended request yet. Tell me whether you’re working on a photo, design, video, document, or a new AI feature, and I’ll guide you to the right workspace.';
  }
  function say(text) { if (!speakReplies) return; if (!('speechSynthesis' in window)) { status('Speech output is not supported in this browser.'); return; } window.speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang = document.documentElement.lang || 'en-US'; window.speechSynthesis.speak(u); }
  function send(text) { const t = String(text || '').trim(); if (!t) return; add('user', t); input.value = ''; const answer = reply(t); add('tayab', answer); say(answer); }
  render();
  if (!messages.length) add('tayab', 'Hi! I’m Tayab 👋 Your creative friend inside TYB Studio. What are we making today?', false);
  $('#tayabChatForm').addEventListener('submit', e => { e.preventDefault(); send(input.value); });
  document.querySelectorAll('[data-tayab-prompt]').forEach(b => b.addEventListener('click', () => send(b.dataset.tayabPrompt)));
  $('#tayabClearChat').addEventListener('click', () => { messages = []; try { localStorage.removeItem(STORE); } catch {} box.replaceChildren(); add('tayab', 'Fresh start! I’m Tayab. What would you like to create?', false); status('Chat cleared.'); });
  $('#tayabSpeakToggle').addEventListener('click', () => { speakReplies = !speakReplies; $('#tayabSpeakToggle').textContent = speakReplies ? '🔊 Read replies: on' : '🔊 Read replies'; status(speakReplies ? 'Speech replies enabled where supported.' : 'Speech replies disabled.'); });
  $('#tayabVoiceInput').addEventListener('click', () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { status('Voice input is not supported in this browser. You can type a message instead.'); return; }
    try { recognition = new SR(); recognition.lang = document.documentElement.lang || 'en-US'; recognition.interimResults = false; recognition.maxAlternatives = 1; status('Listening… speak now.'); recognition.onresult = e => { input.value = e.results[0][0].transcript; input.focus(); status('Voice captured. Tap Send when ready.'); }; recognition.onerror = () => status('Voice recognition could not start or was unavailable.'); recognition.onend = () => { if ($('#tayabStatus').textContent === 'Listening… speak now.') status('Voice input ended.'); }; recognition.start(); } catch { status('Could not start voice input on this device.'); }
  });
  window.TYBTayab = {send, getPreferences: () => { try { return JSON.parse(localStorage.getItem(PREFS) || '[]'); } catch { return []; } }};
})();
