/* TYB Studio Film & Animation Lab — browser-native creative tools. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const state = { source: null, sourceType: '', url: '', points: [], calibration: 1, measureMode: 'off', frameTimer: 0 };
  const canvas = $('filmCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const status = (id, message) => { const el = $(id); if (el) el.textContent = message; };
  const download = (blob, name) => { const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1500); };
  const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function dimensions(w, h) { const scale = Math.min(1280 / Math.max(w, 1), 900 / Math.max(h, 1), 1); canvas.width = Math.max(1, Math.round(w * scale)); canvas.height = Math.max(1, Math.round(h * scale)); }
  function drawSource() {
    if (!state.source) return false;
    const w = state.source.videoWidth || state.source.naturalWidth || state.source.width;
    const h = state.source.videoHeight || state.source.naturalHeight || state.source.height;
    if (!w || !h) return false;
    if (canvas.width !== Math.min(1280, w) && canvas.height !== Math.min(900, h)) dimensions(w, h);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const scale = Math.min(canvas.width / w, canvas.height / h);
    const dw = w * scale, dh = h * scale;
    ctx.drawImage(state.source, (canvas.width - dw) / 2, (canvas.height - dh) / 2, dw, dh);
    return true;
  }
  function toon() {
    if (!drawSource()) { status('filmStatus', 'Choose a photo or video first.'); return; }
    const mode = $('toonMode').value;
    const strength = Number($('toonStrength').value) / 100;
    let image;
    try { image = ctx.getImageData(0, 0, canvas.width, canvas.height); } catch (e) { status('filmStatus', 'Could not read this frame. Try a local image or video file.'); return; }
    const d = image.data, width = image.width, height = image.height;
    if (mode === 'pixel' || mode === 'lowpoly' || mode === 'stopmotion') {
      const step = mode === 'pixel' ? Math.max(3, Math.round(4 + strength * 22)) : mode === 'lowpoly' ? Math.max(2, Math.round(2 + strength * 9)) : Math.max(1, Math.round(1 + strength * 3));
      const small = document.createElement('canvas'); small.width = Math.max(1, Math.ceil(width / step)); small.height = Math.max(1, Math.ceil(height / step));
      const sc = small.getContext('2d'); sc.imageSmoothingEnabled = mode !== 'pixel'; sc.drawImage(canvas, 0, 0, small.width, small.height); ctx.imageSmoothingEnabled = mode !== 'pixel'; ctx.clearRect(0,0,width,height); ctx.drawImage(small,0,0,width,height); ctx.imageSmoothingEnabled = true;
      if (mode === 'stopmotion') { const frame=ctx.getImageData(0,0,width,height), fd=frame.data; for(let i=0;i<fd.length;i+=4){const q=42;fd[i]=Math.min(255,Math.round(fd[i]/q)*q+3);fd[i+1]=Math.min(255,Math.round(fd[i+1]/q)*q+3);fd[i+2]=Math.min(255,Math.round(fd[i+2]/q)*q+3);}ctx.putImageData(frame,0,0); }
    } else {
      const original = new Uint8ClampedArray(d);
      const levels = mode === 'comic' ? 4 : (mode === 'anime' || mode === 'cel') ? 6 : (mode === 'clay' || mode === 'oil') ? 5 : 7;
      for (let y=0; y<height; y++) for (let x=0; x<width; x++) {
        const i=(y*width+x)*4; let r=original[i], g=original[i+1], b=original[i+2];
        const gray=.299*r+.587*g+.114*b;
        if (mode === 'mono' || mode === 'sketch') { r=g=b=gray; }
        if (mode === 'watercolor') { r=Math.min(255,r*1.07+8); g=Math.min(255,g*1.04+5); b=Math.min(255,b*1.02+4); }
        if (mode === 'anime' || mode === 'cel') { r=Math.min(255,r*1.08+8); b=Math.min(255,b*1.04+4); }
        if (mode === 'oil') { r=Math.min(255,r*1.12); g=Math.min(255,g*1.06); b=Math.min(255,b*1.03); }
        const q=255/(levels-1); r=Math.round(r/q)*q; g=Math.round(g/q)*q; b=Math.round(b/q)*q;
        const edge = x>0 && y>0 ? (Math.abs(original[i]-original[i-4])+Math.abs(original[i]-original[i-width*4]))/2 : 0;
        const line = (mode === 'comic' || mode === 'anime' || mode === 'cel') && edge > 24 + (1-strength)*80;
        if (mode === 'sketch') { const pencil=Math.max(0,255-edge*1.7); r=g=b=pencil; }
        d[i]=line?Math.max(0,r*.16):r; d[i+1]=line?Math.max(0,g*.16):g; d[i+2]=line?Math.max(0,b*.16):b;
      }
      ctx.putImageData(image,0,0);
    }
    if ($('toonLines').checked && mode !== 'pixel' && mode !== 'lowpoly') {
      ctx.save(); ctx.globalAlpha = .32; ctx.strokeStyle = '#111'; ctx.lineWidth = Math.max(1, canvas.width/500);
      // Subtle border gives a hand-inked frame without pretending to be AI rotoscoping.
      ctx.strokeRect(2,2,canvas.width-4,canvas.height-4); ctx.restore();
    }
    status('filmStatus', `Applied ${$('toonMode').selectedOptions[0].text}. This is a local stylization filter, not AI character replacement.`);
  }
  $('filmSource').addEventListener('change', () => {
    const file = $('filmSource').files && $('filmSource').files[0]; if (!file) return;
    if (state.url) URL.revokeObjectURL(state.url); state.url = URL.createObjectURL(file); state.points=[];
    if (file.type.startsWith('video/')) {
      const v=$('filmVideo'); v.src=state.url; v.hidden=false; $('filmImage').hidden=true; state.source=v; state.sourceType='video';
      v.onloadedmetadata=()=>{ dimensions(v.videoWidth,v.videoHeight); v.currentTime=0; v.pause(); v.onseeked=()=>{ drawSource(); status('filmStatus', 'Video loaded. Scrub to a frame, then apply a toon filter or capture a still.'); }; drawSource(); };
    } else if (file.type.startsWith('image/')) {
      const img=$('filmImage'); img.src=state.url; img.hidden=false; $('filmVideo').hidden=true; state.source=img; state.sourceType='image';
      img.onload=()=>{ dimensions(img.naturalWidth,img.naturalHeight); drawSource(); status('filmStatus','Image loaded. Choose a toon mode and apply it.'); };
    } else status('filmStatus','Choose an image or video file.');
  });
  $('filmVideo').addEventListener('seeked', () => { if (state.sourceType==='video') drawSource(); });
  $('filmVideo').addEventListener('timeupdate', () => { if (state.sourceType==='video' && !$('filmLiveToon').checked) drawSource(); });
  $('filmVfxApply').addEventListener('click',()=>{
    if(!drawSource())return status('filmStatus','Load a photo or video first.');
    const type=$('filmVfxType').value, amount=Number($('filmVfxStrength').value)/100, w=canvas.width,h=canvas.height;
    ctx.save();ctx.lineCap='round';
    if(type==='speed'){
      ctx.strokeStyle='rgba(255,255,255,.8)';ctx.lineWidth=Math.max(1,w/500);const count=Math.round(18+amount*65);
      for(let i=0;i<count;i++){const y=(i*97)%h;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w*(.08+amount*.3),y-h*.12);ctx.stroke();}
    } else if(type==='impact'){
      const cx=w*.72,cy=h*.3,outer=Math.min(w,h)*(.12+amount*.18),inner=outer*.45;ctx.beginPath();
      for(let i=0;i<28;i++){const a=i*Math.PI/14,r=i%2?inner:outer,x=cx+Math.cos(a)*r,y=cy+Math.sin(a)*r;i?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.closePath();ctx.fillStyle='#ffe44d';ctx.fill();ctx.lineWidth=Math.max(2,w/180);ctx.strokeStyle='#171717';ctx.stroke();ctx.fillStyle='#e63946';ctx.font=`900 ${Math.max(24,w*.09)}px sans-serif`;ctx.textAlign='center';ctx.fillText('POW!',cx,cy+Math.max(8,outer*.12));
    } else if(type==='smoke'){
      for(let i=0;i<Math.round(4+amount*10);i++){const x=(i*131+37)%w,y=h*.68+((i*53)%Math.round(h*.22)),r=Math.min(w,h)*(.025+amount*.035);ctx.fillStyle=`rgba(220,225,238,${.25+amount*.25})`;ctx.strokeStyle='rgba(70,75,90,.45)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.arc(x+r*.75,y-r*.25,r*.8,0,Math.PI*2);ctx.fill();ctx.stroke();}
    } else if(type==='hearts' || type==='sparkles'){
      ctx.font=`${Math.max(20,w*.055)}px sans-serif`;ctx.textAlign='center';const symbols=type==='hearts'?['♥','♡']:['✦','✧','✴','✨'];for(let i=0;i<Math.round(5+amount*12);i++){const x=(i*173+57)%w,y=(i*109+41)%h;ctx.fillStyle=['#ff4f91','#ffe45c','#6ee7f9','#fff'][i%4];ctx.fillText(symbols[i%symbols.length],x,y);}
    } else {
      const img=ctx.getImageData(0,0,w,h),d=img.data;let seed=2026;for(let i=0;i<d.length;i+=4){seed=(seed*1664525+1013904223)>>>0;const n=((seed/4294967295)-.5)*amount*48;d[i]=Math.max(0,Math.min(255,d[i]+n));d[i+1]=Math.max(0,Math.min(255,d[i+1]+n));d[i+2]=Math.max(0,Math.min(255,d[i+2]+n));}ctx.putImageData(img,0,0);ctx.fillStyle='#fff';ctx.font=`${Math.max(12,w*.025)}px monospace`;ctx.fillText(new Date().toISOString().slice(0,10),12,h-14);
    }
    ctx.restore();status('filmStatus',`Added ${$('filmVfxType').selectedOptions[0].text} overlay to the current frame. Export the PNG to keep the result.`);
  });
  $('toonApply').addEventListener('click', toon);
  $('toonCapture').addEventListener('click', () => { if (!canvas.width || !canvas.height) { status('filmStatus','Load a photo or video first.'); return; } canvas.toBlob(b=>b&&download(b,'tyb-toon-frame.png'),'image/png'); });
  $('filmLiveToon').addEventListener('change', () => {
    if (!$('filmLiveToon').checked) { cancelAnimationFrame(state.frameTimer); return; }
    if (state.sourceType !== 'video') { $('filmLiveToon').checked=false; status('filmStatus','Live preview requires a loaded video.'); return; }
    const loop=()=>{ if (!$('filmLiveToon').checked) return; toon(); state.frameTimer=requestAnimationFrame(()=>setTimeout(loop,150)); }; loop();
  });
  $('filmVideoPlay').addEventListener('click', () => { if (state.sourceType!=='video') return status('filmStatus','Choose a video first.'); $('filmVideo').paused ? $('filmVideo').play() : $('filmVideo').pause(); });
  $('filmVideoPlay').textContent='Play / pause video';
  $('filmMakeComic').addEventListener('click', () => {
    if (!state.source || state.sourceType!=='video') return status('filmStatus','Load a video to make a comic contact sheet.');
    const v=$('filmVideo'), old=v.currentTime, duration=v.duration; if (!Number.isFinite(duration)||duration<=0) return status('filmStatus','Wait for the video metadata to load.');
    const times=[Math.min(.01,duration),.25,.5,.75].map(n=>Math.min(Math.max(0,duration*n),Math.max(0,duration-.05))); let idx=0;
    const shots=[]; const seek=()=>{ if(idx>=times.length){ v.currentTime=old; drawComic(shots); return; } v.onseeked=()=>{ const c=document.createElement('canvas'); c.width=320;c.height=180;const cctx=c.getContext('2d');cctx.drawImage(v,0,0,c.width,c.height);shots.push(c);idx++;seek(); }; v.currentTime=times[idx]; };
    const drawComic=frames=>{ const out=document.createElement('canvas');out.width=720;out.height=900;const o=out.getContext('2d');o.fillStyle='#fff';o.fillRect(0,0,out.width,out.height);o.fillStyle='#151515';o.font='bold 36px sans-serif';o.fillText('TYB COMIC STORYBOARD',30,48);frames.forEach((f,i)=>{const x=30+(i%2)*340,y=75+Math.floor(i/2)*390;o.drawImage(f,x,y,320,300);o.strokeStyle='#111';o.lineWidth=5;o.strokeRect(x,y,320,300);o.fillStyle='#111';o.font='bold 20px sans-serif';o.fillText(`PANEL ${i+1}`,x+8,y+330);o.font='16px sans-serif';o.fillText(['Establishing shot','Action begins','Key moment','Resolution'][i],x+8,y+356);});out.toBlob(b=>b&&download(b,'tyb-comic-storyboard.png'));status('filmStatus','Comic storyboard contact sheet exported as PNG. Add speech bubbles in Design Studio.'); };
    seek();
  });
  $('filmMeasureStart').addEventListener('click',()=>{
    if(!state.source) return status('measureStatus','Load an image or pause a video frame first.');
    const real=Number($('measureKnown').value); if(!(real>0)) return status('measureStatus','Enter a known reference length greater than zero.');
    state.points=[]; state.calibration=real; state.measureMode='calibrate'; canvas.classList.add('measure-active'); status('measureStatus','Tap two points spanning the known reference length. Then tap pairs of points to measure other spans.');
  });
  canvas.addEventListener('click',e=>{
    if(state.measureMode==='off') return;
    const r=canvas.getBoundingClientRect();const p={x:(e.clientX-r.left)*canvas.width/r.width,y:(e.clientY-r.top)*canvas.height/r.height};state.points.push(p);
    if(state.points.length===2){
      const [a,b]=state.points;const px=Math.hypot(b.x-a.x,b.y-a.y);
      if(px<2){state.points=[];return status('measureStatus','Those points are too close. Tap two points farther apart.');}
      if(state.measureMode==='calibrate'){
        const real=Number($('measureKnown').value);state.calibration=px/real;state.measureMode='measure';
        status('measureStatus',`Calibration set: ${px.toFixed(1)} pixels = ${real} m (${state.calibration.toFixed(1)} px/m). Tap another pair to estimate its distance.`);
      } else {
        const meters=px/state.calibration;status('measureStatus',`Estimated span: ${meters.toFixed(3)} m (${px.toFixed(1)} px). This 2D estimate is only reliable near the reference plane; perspective and lens distortion affect accuracy.`);
      }
      drawSource();ctx.strokeStyle='#ff3355';ctx.lineWidth=Math.max(2,canvas.width/350);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.fillStyle='#ff3355';ctx.font=`bold ${Math.max(16,canvas.width/35)}px sans-serif`;ctx.fillText(state.measureMode==='measure' && state.calibration ? (px/state.calibration).toFixed(2)+' m' : 'Reference',Math.min(a.x,b.x)+6,Math.max(22,Math.min(a.y,b.y)-8));
      state.points=[];
    }
  });
  $('filmMeasureClear').addEventListener('click',()=>{state.points=[];state.measureMode='off';canvas.classList.remove('measure-active');drawSource();status('measureStatus','Measurement cleared. This is a calibrated 2D image estimate, not LiDAR or a room scan.');});
  $('filmKeyApply').addEventListener('click',()=>{
    if(!drawSource())return status('filmKeyStatus','Load an image or video and pause on a frame first.');
    const key=$('filmKeyColor').value;const kr=parseInt(key.slice(1,3),16),kg=parseInt(key.slice(3,5),16),kb=parseInt(key.slice(5,7),16),tol=Number($('filmKeyTolerance').value);let img;
    try{img=ctx.getImageData(0,0,canvas.width,canvas.height);}catch(e){return status('filmKeyStatus','Could not read the frame.');}
    for(let i=0;i<img.data.length;i+=4){const d=Math.sqrt((img.data[i]-kr)**2+(img.data[i+1]-kg)**2+(img.data[i+2]-kb)**2);if(d<tol)img.data[i+3]=0;else if(d<tol+35)img.data[i+3]=Math.min(img.data[i+3],Math.round(255*(d-tol)/35));}
    ctx.putImageData(img,0,0); if($('filmKeyBg').value!=='transparent'){ctx.globalCompositeOperation='destination-over';ctx.fillStyle=$('filmKeyBg').value;ctx.fillRect(0,0,canvas.width,canvas.height);ctx.globalCompositeOperation='source-over';}
    status('filmKeyStatus','Basic color key applied to the current frame. Fine hair, motion blur, shadows, and uneven backgrounds need advanced matte tools.');
  });
  $('filmKeyExport').addEventListener('click',()=>canvas.toBlob(b=>b&&download(b,'tyb-keyed-frame.png'),'image/png'));
  $('filmMakeStoryboard').addEventListener('click',()=>{
    const idea=$('filmStoryIdea').value.trim(); if(!idea)return status('storyStatus','Enter a story idea first.');
    const genre=$('filmGenre').value; const chars=$('filmCastNames').value.trim()||'Main character';
    const templates=[['OPENING','Introduce the world and the character.','Wide establishing shot'],['INCITING MOMENT','Something changes and creates a goal.','Medium shot + reaction close-up'],['ESCALATION','The character tries, fails, and adapts.','Two action shots with a cutaway'],['CLIMAX','The biggest choice or visual moment.','Push-in, pause, then impact frame'],['ENDING','Show the result and leave a memorable image.','Final wide shot / title card']];
    const root=$('filmStoryboard');root.replaceChildren(); templates.forEach((t,i)=>{const article=document.createElement('article');article.className='content-card storyboard-shot';article.innerHTML=`<span class="status">SHOT ${i+1} · ${esc(genre)}</span><h3>${esc(t[0])}</h3><p>${esc(t[1])}</p><p><strong>Visual:</strong> ${esc(t[2])}</p><p><strong>Story idea:</strong> ${esc(idea)}</p><p><strong>Cast:</strong> ${esc(chars)}</p><label>Dialogue / notes<textarea rows="2" maxlength="500" placeholder="Write dialogue or director notes…"></textarea></label>`;root.appendChild(article);});
    status('storyStatus','Five editable storyboard beats created locally. This is a planning aid, not AI-generated finished animation.');
  });
  $('filmExportStoryboard').addEventListener('click',()=>{const idea=$('filmStoryIdea').value.trim();const shots=[...$('filmStoryboard').querySelectorAll('.storyboard-shot')].map((el,i)=>({shot:i+1,title:el.querySelector('h3').textContent,details:el.innerText,notes:el.querySelector('textarea').value}));if(!shots.length)return status('storyStatus','Create a storyboard first.');download(new Blob([JSON.stringify({app:'TYB Studio',idea,shots},null,2)],{type:'application/json'}),'tyb-storyboard.json');});
  $('filmCharacterBuild').addEventListener('click',()=>{
    const name=$('filmCharacterName').value.trim()||'My Character', species=$('filmSpecies').value, skin=$('filmSkin').value, outfit=$('filmOutfit').value, hair=$('filmHair').value;
    const isAnimal=['Cat','Dog','Fox','Dragon','Alien'].includes(species);const ears=species==='Cat'||species==='Fox'?`<path d="M110 96 L90 40 L135 70 M210 96 L230 40 L185 70" fill="${hair}" stroke="#222" stroke-width="4"/>`:species==='Dragon'?`<path d="M110 92 L75 45 L145 65 M210 92 L245 45 L175 65" fill="${hair}" stroke="#222" stroke-width="4"/>`:'';
    const face=species==='Robot'?'<rect x="112" y="80" width="96" height="100" rx="18" fill="#b9c7d9" stroke="#222" stroke-width="4"/><circle cx="140" cy="120" r="9" fill="#36e0ff"/><circle cx="180" cy="120" r="9" fill="#36e0ff"/><path d="M140 151 H180" stroke="#222" stroke-width="5"/>':`<circle cx="160" cy="128" r="53" fill="${skin}" stroke="#222" stroke-width="4"/><circle cx="143" cy="122" r="5" fill="#222"/><circle cx="177" cy="122" r="5" fill="#222"/><path d="M143 148 Q160 164 177 148" fill="none" stroke="#222" stroke-width="4"/>`;
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="320" height="420" viewBox="0 0 320 420"><rect width="320" height="420" rx="24" fill="#f1f4fb"/><text x="160" y="30" text-anchor="middle" font-family="sans-serif" font-size="18" font-weight="bold" fill="#172033">${esc(name).slice(0,24)}</text>${ears}<path d="M105 205 Q160 178 215 205 L240 320 H80 Z" fill="${outfit}" stroke="#222" stroke-width="4"/><path d="M120 205 L160 245 L200 205" fill="none" stroke="#fff" stroke-width="6"/>${face}<path d="M110 91 Q115 54 160 62 Q205 54 210 91 L199 86 Q160 60 121 86 Z" fill="${hair}" stroke="#222" stroke-width="4"/><text x="160" y="365" text-anchor="middle" font-family="sans-serif" font-size="14" fill="#172033">${esc(species)} · TYB Character Draft</text><text x="160" y="388" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#566">SVG mascot concept · not a rigged 3D model</text></svg>`;
    $('filmCharacterPreview').innerHTML=svg; $('filmCharacterPreview').dataset.svg=svg; status('characterStatus','Character concept created as editable vector artwork. Export SVG and reuse it in Design Studio; it is not a rigged 3D character.');
  });
  $('filmCharacterExport').addEventListener('click',()=>{const svg=$('filmCharacterPreview').dataset.svg;if(!svg)return status('characterStatus','Build a character first.');download(new Blob([svg],{type:'image/svg+xml'}),'tyb-character.svg');});
  $('filmVoiceDemo').addEventListener('click',()=>{const text=$('filmVoiceText').value.trim()||'Welcome to TYB Studio!';if(!('speechSynthesis'in window))return status('voiceStatus','Text-to-speech is not supported by this browser.');speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.pitch=Number($('filmVoicePitch').value);u.rate=Number($('filmVoiceRate').value);u.onstart=()=>status('voiceStatus','Speaking with browser text-to-speech. Pitch/rate options depend on the selected system voice.');u.onend=()=>status('voiceStatus','Preview finished. This is speech synthesis, not voice cloning or voice transplant.');speechSynthesis.speak(u);});
  $('filmExportFrame').addEventListener('click',()=>{if(!canvas.width||!canvas.height)return status('filmStatus','Load media first.');canvas.toBlob(b=>b&&download(b,'tyb-film-frame.png'),'image/png');});
  window.addEventListener('beforeunload',()=>{if(state.url)URL.revokeObjectURL(state.url);if('speechSynthesis'in window)speechSynthesis.cancel();});
})();
