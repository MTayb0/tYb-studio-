(() => {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const screens = $$('.screen');
  const ranges = ['brightness','contrast','saturation','warmth','grayscale','blur'];
  const defaults = {brightness:100,contrast:100,saturation:100,warmth:0,grayscale:0,blur:0};
  let sourceImage = null;
  let sourceUrl = null;
  let compareMode = false;
  let rotation = 0;
  let flipH = false;
  let flipV = false;
  let cropRect = null;
  let cropMode = false;
  let cropDrag = null;
  let resizeTarget = null;
  let toastTimer = null;

  function toast(message) {
    const el = $('#toast');
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
  }
  function navigate(id) {
    screens.forEach(s => s.classList.toggle('active', s.id === id));
    $$('[data-open]').forEach(b => b.classList.toggle('active', b.dataset.open === id));
    window.scrollTo({top:0,behavior:'smooth'});
  }
  $$('[data-open]').forEach(btn => btn.addEventListener('click', () => navigate(btn.dataset.open)));
  $('#themeToggle').addEventListener('click', () => {
    document.body.classList.toggle('light');
    try { localStorage.setItem('tyb-theme', document.body.classList.contains('light') ? 'light' : 'dark'); } catch {}
  });
  try { if (localStorage.getItem('tyb-theme') === 'light') document.body.classList.add('light'); } catch {}

  function currentSettings() {
    const out = {};
    ranges.forEach(k => out[k] = Number($('#'+k).value));
    return out;
  }
  function filterString(s) {
    return `brightness(${s.brightness}%) contrast(${s.contrast}%) saturate(${s.saturation}%) grayscale(${s.grayscale}%) blur(${s.blur}px)`;
  }
  function makeWorkingImage() {
    const maxDim = 2200;
    const scale = Math.min(1, maxDim / Math.max(sourceImage.naturalWidth, sourceImage.naturalHeight));
    const w = Math.max(1, Math.round(sourceImage.naturalWidth * scale));
    const h = Math.max(1, Math.round(sourceImage.naturalHeight * scale));
    const rotated = document.createElement('canvas');
    const quarterTurn = Math.abs(rotation % 180) === 90;
    rotated.width = quarterTurn ? h : w;
    rotated.height = quarterTurn ? w : h;
    const ctx = rotated.getContext('2d');
    ctx.translate(rotated.width / 2, rotated.height / 2);
    ctx.rotate(rotation * Math.PI / 180);
    ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
    ctx.drawImage(sourceImage, -w / 2, -h / 2, w, h);
    return rotated;
  }
  function normalizedCrop(rect, width, height) {
    if (!rect) return {x:0,y:0,width,height};
    const x = Math.max(0, Math.min(width - 1, Math.round(rect.x)));
    const y = Math.max(0, Math.min(height - 1, Math.round(rect.y)));
    return {x,y,width:Math.max(1,Math.min(width-x,Math.round(rect.width))),height:Math.max(1,Math.min(height-y,Math.round(rect.height)))};
  }
  function renderPhoto(showCropOverlay = true) {
    if (!sourceImage) return;
    const canvas = $('#photoCanvas');
    const ctx = canvas.getContext('2d');
    const s = compareMode ? defaults : currentSettings();
    const working = makeWorkingImage();
    const showFullForCrop = cropMode;
    const crop = showFullForCrop ? {x:0,y:0,width:working.width,height:working.height} : normalizedCrop(cropRect, working.width, working.height);
    let outW = crop.width, outH = crop.height;
    if (!showFullForCrop && resizeTarget) { outW = resizeTarget.width; outH = resizeTarget.height; }
    canvas.width = Math.max(1, outW);
    canvas.height = Math.max(1, outH);
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.save();
    ctx.filter = filterString(s);
    ctx.drawImage(working,crop.x,crop.y,crop.width,crop.height,0,0,canvas.width,canvas.height);
    ctx.restore();
    if (s.warmth !== 0) {
      ctx.save(); ctx.globalCompositeOperation = s.warmth > 0 ? 'screen' : 'multiply';
      ctx.globalAlpha = Math.abs(s.warmth)/250; ctx.fillStyle = s.warmth > 0 ? '#ff9b45' : '#3e83ff';
      ctx.fillRect(0,0,canvas.width,canvas.height); ctx.restore();
    }
    const watermark = $('#photoWatermark')?.value?.trim();
    if (watermark && !compareMode && !cropMode) {
      ctx.save();
      const fontSize = Math.max(14, Math.round(Math.min(canvas.width, canvas.height) / 22));
      ctx.font = `600 ${fontSize}px sans-serif`;
      ctx.textBaseline = 'middle';
      ctx.fillStyle = $('#watermarkColor').value || '#ffffff';
      ctx.globalAlpha = Number($('#watermarkOpacity').value || 75) / 100;
      const pad = Math.max(12, Math.round(fontSize * .7));
      const pos = $('#watermarkPosition').value;
      const tw = ctx.measureText(watermark).width;
      let x = pad, y = canvas.height - pad;
      if (pos.includes('right')) x = canvas.width - pad - tw;
      if (pos.includes('top')) y = pad;
      if (pos === 'center') { x = (canvas.width - tw) / 2; y = canvas.height / 2; }
      ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = Math.max(2, fontSize / 8);
      ctx.fillText(watermark, Math.max(0, x), Math.max(fontSize/2, y));
      ctx.restore();
    }
    if (showFullForCrop && showCropOverlay && cropRect) {
      ctx.save(); ctx.fillStyle = 'rgba(5,8,18,.48)';
      const r = normalizedCrop(cropRect, working.width, working.height);
      ctx.fillRect(0,0,canvas.width,r.y); ctx.fillRect(0,r.y,r.x,r.height);
      ctx.fillRect(r.x+r.width,r.y,canvas.width-r.x-r.width,r.height);
      ctx.fillRect(0,r.y+r.height,canvas.width,canvas.height-r.y-r.height);
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = Math.max(2, canvas.width/500); ctx.setLineDash([8,5]);
      ctx.strokeRect(r.x,r.y,r.width,r.height); ctx.setLineDash([]);
      const hs = Math.max(7, canvas.width/90); ctx.fillStyle = '#c4b5fd';
      [[r.x,r.y],[r.x+r.width,r.y],[r.x,r.y+r.height],[r.x+r.width,r.y+r.height]].forEach(([x,y])=>ctx.fillRect(x-hs/2,y-hs/2,hs,hs));
      ctx.restore();
    }
    $('#photoStatus').textContent = `${sourceImage.naturalWidth} × ${sourceImage.naturalHeight} px${rotation ? ` · ${rotation}°` : ''}${cropRect && !cropMode ? ' · cropped' : ''}`;
  }
  function baseDimensions() { const working=makeWorkingImage(); return {width:working.width,height:working.height}; }
  function updateTransformControls() {
    $('#startCrop').disabled = !sourceImage || cropMode;
    $('#applyCrop').disabled = !sourceImage || !cropMode || !cropRect;
    $('#cancelCrop').classList.toggle('hidden', !cropMode);
    $('#cropHelp').classList.toggle('hidden', !cropMode);
    $('#photoCanvas').classList.toggle('crop-active', cropMode);
  }
  function startCrop() {
    if (!sourceImage) return toast('Choose a photo first.');
    cropMode = true; const d=baseDimensions();
    cropRect={x:Math.round(d.width*.1),y:Math.round(d.height*.1),width:Math.max(1,Math.round(d.width*.8)),height:Math.max(1,Math.round(d.height*.8))};
    updateTransformControls(); renderPhoto(); toast('Drag on the image to adjust the crop.');
  }
  function finishCrop(apply) {
    if (!cropMode) return;
    if (apply && cropRect) {
      const d=baseDimensions(); cropRect=normalizedCrop(cropRect,d.width,d.height); resizeTarget=null;
      $('#resizeWidth').value=''; $('#resizeHeight').value='';
      toast(`Crop applied: ${cropRect.width} × ${cropRect.height} px.`);
    } else toast('Crop cancelled.');
    cropMode=false; cropDrag=null; updateTransformControls(); renderPhoto();
  }
  function applyPreset(name) {
    const presets={
      original:{brightness:100,contrast:100,saturation:100,warmth:0,grayscale:0,blur:0},
      vivid:{brightness:105,contrast:115,saturation:145,warmth:2,grayscale:0,blur:0},
      warm:{brightness:103,contrast:105,saturation:112,warmth:24,grayscale:0,blur:0},
      mono:{brightness:100,contrast:112,saturation:100,warmth:0,grayscale:100,blur:0},
      vintage:{brightness:105,contrast:88,saturation:72,warmth:20,grayscale:8,blur:0.2},
      cool:{brightness:100,contrast:108,saturation:105,warmth:-20,grayscale:0,blur:0}
    };
    if(!presets[name])return;
    Object.entries(presets[name]).forEach(([k,v])=>$('#'+k).value=v);
    $$('.preset-btn').forEach(b=>b.classList.toggle('selected',b.dataset.preset===name));
    updateLabels();renderPhoto();toast(`${name==='mono'?'Black & white':name[0].toUpperCase()+name.slice(1)} preset applied.`);
  }
  function updateLabels() {
    $('#brightnessOut').value = $('#brightness').value+'%';
    $('#contrastOut').value = $('#contrast').value+'%';
    $('#saturationOut').value = $('#saturation').value+'%';
    $('#warmthOut').value = $('#warmth').value;
    $('#grayscaleOut').value = $('#grayscale').value+'%';
    $('#blurOut').value = $('#blur').value+'px';
  }
  function resetSettings() {
    Object.entries(defaults).forEach(([k,v]) => $('#'+k).value = v);
    rotation=0; flipH=false; flipV=false; cropRect=null; cropMode=false; resizeTarget=null;
    if($('#photoWatermark')) $('#photoWatermark').value='';
    if($('#watermarkOpacity')) { $('#watermarkOpacity').value=75; $('#watermarkOpacityOut').value='75%'; }
    $('#resizeWidth').value=''; $('#resizeHeight').value='';
    $$('.preset-btn').forEach(b=>b.classList.toggle('selected',b.dataset.preset==='original'));
    updateLabels(); updateTransformControls(); renderPhoto();
  }
  $('#rotateLeft').addEventListener('click', () => {
    if(!sourceImage)return toast('Choose a photo first.');
    rotation=(rotation+270)%360;cropRect=null;cropMode=false;resizeTarget=null;
    $('#resizeWidth').value='';$('#resizeHeight').value='';updateTransformControls();renderPhoto();toast('Rotated 90° left.');
  });
  $('#rotateRight').addEventListener('click', () => {
    if(!sourceImage)return toast('Choose a photo first.');
    rotation=(rotation+90)%360;cropRect=null;cropMode=false;resizeTarget=null;
    $('#resizeWidth').value='';$('#resizeHeight').value='';updateTransformControls();renderPhoto();toast('Rotated 90° right.');
  });
  $('#flipHorizontal').addEventListener('click', () => { if(!sourceImage)return toast('Choose a photo first.'); flipH=!flipH;renderPhoto();toast(flipH?'Flipped horizontally.':'Horizontal flip removed.'); });
  $('#flipVertical').addEventListener('click', () => { if(!sourceImage)return toast('Choose a photo first.'); flipV=!flipV;renderPhoto();toast(flipV?'Flipped vertically.':'Vertical flip removed.'); });
  ['photoWatermark','watermarkColor','watermarkPosition','watermarkOpacity'].forEach(id => $('#'+id).addEventListener('input', () => { if(id==='watermarkOpacity') $('#watermarkOpacityOut').value=$('#watermarkOpacity').value+'%'; renderPhoto(); }));
  $('#startCrop').addEventListener('click',startCrop);
  $('#applyCrop').addEventListener('click',()=>finishCrop(true));
  $('#cancelCrop').addEventListener('click',()=>finishCrop(false));
  $('#photoCanvas').addEventListener('pointerdown',e=>{
    if(!cropMode||!sourceImage)return;e.preventDefault();
    const c=$('#photoCanvas'),box=c.getBoundingClientRect();
    const x=Math.max(0,Math.min(c.width,(e.clientX-box.left)*c.width/box.width));
    const y=Math.max(0,Math.min(c.height,(e.clientY-box.top)*c.height/box.height));
    const r=cropRect,inside=x>=r.x&&x<=r.x+r.width&&y>=r.y&&y<=r.y+r.height;
    const handle=Math.max(12,c.width/70);
    const corners=[['nw',r.x,r.y],['ne',r.x+r.width,r.y],['sw',r.x,r.y+r.height],['se',r.x+r.width,r.y+r.height]];
    const hit=corners.find(([,hx,hy])=>Math.abs(x-hx)<=handle&&Math.abs(y-hy)<=handle);
    cropDrag={startX:x,startY:y,origin:{...r},move:inside&&!hit,resize:hit?hit[0]:null};
    if(!inside)cropRect={x,y,width:1,height:1};c.setPointerCapture?.(e.pointerId);renderPhoto();
  });
  $('#photoCanvas').addEventListener('pointermove',e=>{
    if(!cropMode||!cropDrag)return;
    const c=$('#photoCanvas'),box=c.getBoundingClientRect();
    const x=Math.max(0,Math.min(c.width,(e.clientX-box.left)*c.width/box.width));
    const y=Math.max(0,Math.min(c.height,(e.clientY-box.top)*c.height/box.height));
    const d=baseDimensions();
    if(cropDrag.resize){
      const o=cropDrag.origin; let left=o.x,top=o.y,right=o.x+o.width,bottom=o.y+o.height;
      if(cropDrag.resize.includes('w'))left=Math.max(0,Math.min(right-1,x));
      if(cropDrag.resize.includes('e'))right=Math.max(left+1,Math.min(d.width,x));
      if(cropDrag.resize.includes('n'))top=Math.max(0,Math.min(bottom-1,y));
      if(cropDrag.resize.includes('s'))bottom=Math.max(top+1,Math.min(d.height,y));
      cropRect={x:left,y:top,width:right-left,height:bottom-top};
    }else if(cropDrag.move){
      const nx=Math.max(0,Math.min(d.width-cropDrag.origin.width,cropDrag.origin.x+x-cropDrag.startX));
      const ny=Math.max(0,Math.min(d.height-cropDrag.origin.height,cropDrag.origin.y+y-cropDrag.startY));
      cropRect={...cropDrag.origin,x:nx,y:ny};
    }else{
      const x1=Math.min(cropDrag.startX,x),y1=Math.min(cropDrag.startY,y);
      cropRect={x:x1,y:y1,width:Math.max(1,Math.abs(x-cropDrag.startX)),height:Math.max(1,Math.abs(y-cropDrag.startY))};
    }
    renderPhoto();updateTransformControls();
  });
  ['pointerup','pointercancel','lostpointercapture'].forEach(ev=>$('#photoCanvas').addEventListener(ev,()=>{cropDrag=null;}));
  $('#resizeWidth').addEventListener('input',()=>{
    if($('#lockRatio').checked&&sourceImage){const d=baseDimensions(),r=normalizedCrop(cropRect,d.width,d.height),w=Number($('#resizeWidth').value);if(w>0)$('#resizeHeight').value=Math.max(1,Math.round(w*r.height/r.width));}
  });
  $('#resizeHeight').addEventListener('input',()=>{
    if($('#lockRatio').checked&&sourceImage){const d=baseDimensions(),r=normalizedCrop(cropRect,d.width,d.height),h=Number($('#resizeHeight').value);if(h>0)$('#resizeWidth').value=Math.max(1,Math.round(h*r.width/r.height));}
  });
  $('#applyResize').addEventListener('click',()=>{
    if(!sourceImage)return toast('Choose a photo first.');
    if(cropMode)return toast('Apply or cancel the crop first.');
    const d=baseDimensions(),r=normalizedCrop(cropRect,d.width,d.height),w=Number($('#resizeWidth').value),h=Number($('#resizeHeight').value);
    if(!Number.isInteger(w)||!Number.isInteger(h)||w<1||h<1||w>12000||h>12000)return toast('Enter width and height from 1 to 12000 px.');
    resizeTarget={width:w,height:h};renderPhoto();toast(`Resize preview: ${w} × ${h} px.`);
  });
  $('#clearResize').addEventListener('click',()=>{resizeTarget=null;$('#resizeWidth').value='';$('#resizeHeight').value='';renderPhoto();toast('Using crop dimensions without extra resizing.');});
  $$('.preset-btn').forEach(b=>b.addEventListener('click',()=>applyPreset(b.dataset.preset)));
  ranges.forEach(k => $('#'+k).addEventListener('input', () => { updateLabels(); renderPhoto(); }));
  $('#resetPhoto').addEventListener('click', resetSettings);
  $('#comparePhoto').addEventListener('pointerdown', () => { compareMode = true; renderPhoto(); });
  ['pointerup','pointercancel','pointerleave'].forEach(ev => $('#comparePhoto').addEventListener(ev, () => { compareMode = false; renderPhoto(); }));
  $('#comparePhoto').addEventListener('keydown', e => { if(e.key===' '){compareMode=true;renderPhoto();} });
  $('#comparePhoto').addEventListener('keyup', () => { compareMode=false;renderPhoto(); });

  function loadImage(file) {
    if (!file || !file.type.startsWith('image/')) { toast('Please select a valid image.'); return; }
    if (sourceUrl) URL.revokeObjectURL(sourceUrl);
    sourceUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      sourceImage = img;
      resetSettings();
      $('#photoPlaceholder').classList.add('hidden');
      $('#photoCanvas').classList.remove('hidden');
      $('#photoActions').classList.remove('hidden');
      $('#photoStatus').textContent = file.name;
      const d=baseDimensions(); $('#resizeWidth').placeholder=String(d.width); $('#resizeHeight').placeholder=String(d.height);
      saveRecent({name:file.name,type:'Photo',time:new Date().toISOString()});
      toast('Photo ready to edit.');
    };
    img.onerror = () => toast('Could not open this image.');
    img.src = sourceUrl;
  }
  $('#photoInput').addEventListener('change', e => loadImage(e.target.files[0]));
  $('#photoInputAlt').addEventListener('change', e => { loadImage(e.target.files[0]); e.target.value=''; });
  $('#exportPhoto').addEventListener('click', () => {
    if (!sourceImage) return toast('Choose a photo first.');
    if (cropMode) return toast('Apply or cancel the crop before exporting.');
    renderPhoto(false);
    const canvas = $('#photoCanvas');
    const mime = $('#photoExportFormat').value || 'image/png';
    const ext = mime === 'image/jpeg' ? 'jpg' : mime === 'image/webp' ? 'webp' : 'png';
    canvas.toBlob(blob => {
      if (!blob) return toast('Export failed. Try a smaller image or another format.');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `tyb-studio-edited.${ext}`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 3000);
      toast(`${ext.toUpperCase()} export started. Check your downloads.`);
    }, mime, mime === 'image/png' ? undefined : 0.92);
  });

  // User-defined photo preset stored locally on this device.
  $('#savePreset').addEventListener('click', () => {
    try {
      localStorage.setItem('tyb-photo-custom-preset', JSON.stringify(currentSettings()));
      toast('Your custom preset was saved on this device.');
    } catch { toast('Could not save preset. Device storage may be unavailable.'); }
  });
  $('#loadPreset').addEventListener('click', () => {
    try {
      const saved = JSON.parse(localStorage.getItem('tyb-photo-custom-preset') || 'null');
      if (!saved || !ranges.every(k => Number.isFinite(saved[k]))) return toast('No saved preset found on this device.');
      ranges.forEach(k => $('#'+k).value = saved[k]);
      $$('.preset-btn').forEach(b => b.classList.remove('selected'));
      updateLabels(); renderPhoto(); toast('Saved preset applied.');
    } catch { toast('Could not load saved preset.'); }
  });

  // Local image-to-multipage-PDF workflow. It embeds JPEG page images into a small PDF.
  let documentFiles = [];
  const docInput = $('#documentInput');
  function renderDocumentPages() {
    const list = $('#documentPages'); list.replaceChildren();
    $('#documentStatus').textContent = documentFiles.length ? `${documentFiles.length} page${documentFiles.length===1?'':'s'} ready · files remain on this device` : 'No pages added yet.';
    $('#exportPdf').disabled = !documentFiles.length;
    $('#tryOcr').disabled = !documentFiles.length;
    if (!documentFiles.length) { const p=document.createElement('p');p.className='muted';p.textContent='Add one or more images to start a document.';list.append(p);return; }
    documentFiles.forEach((file,index)=>{
      const row=document.createElement('div');row.className='document-page';
      const img=document.createElement('img');img.alt=`Page ${index+1} preview`;img.src=URL.createObjectURL(file);
      img.onload=()=>URL.revokeObjectURL(img.src);
      const info=document.createElement('div');info.className='document-page-info';
      const title=document.createElement('strong');title.textContent=`Page ${index+1}`;
      const name=document.createElement('small');name.textContent=file.name;
      info.append(title,name);
      const actions=document.createElement('div');actions.className='document-page-actions';
      [['↑','Move page up',()=>{if(index>0){[documentFiles[index-1],documentFiles[index]]=[documentFiles[index],documentFiles[index-1]];renderDocumentPages();}}],['↓','Move page down',()=>{if(index<documentFiles.length-1){[documentFiles[index+1],documentFiles[index]]=[documentFiles[index],documentFiles[index+1]];renderDocumentPages();}}],['×','Remove page',()=>{documentFiles.splice(index,1);renderDocumentPages();}]].forEach(([label,aria,fn])=>{const b=document.createElement('button');b.type='button';b.className='secondary';b.textContent=label;b.setAttribute('aria-label',aria);b.addEventListener('click',fn);actions.append(b);});
      row.append(img,info,actions);list.append(row);
    });
  }
  docInput.addEventListener('change',e=>{
    const files=[...e.target.files].filter(f=>f.type.startsWith('image/'));
    if(files.length) { documentFiles.push(...files); renderDocumentPages(); toast(`${files.length} image${files.length===1?'':'s'} added.`); }
    e.target.value='';
  });
  $('#clearDocuments').addEventListener('click',()=>{documentFiles=[];renderDocumentPages();$('#ocrResult').classList.add('hidden');toast('Document pages cleared.');});
  function canvasToJpeg(file) {
    return new Promise((resolve,reject)=>{
      const url=URL.createObjectURL(file),img=new Image();
      img.onload=()=>{URL.revokeObjectURL(url);const max=1800,scale=Math.min(1,max/Math.max(img.naturalWidth,img.naturalHeight));const c=document.createElement('canvas');c.width=Math.max(1,Math.round(img.naturalWidth*scale));c.height=Math.max(1,Math.round(img.naturalHeight*scale));const ctx=c.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,c.width,c.height);const opt=window.TYBDocOptions||{};if(opt.enhance==='gray')ctx.filter='grayscale(1)';else if(opt.enhance==='contrast')ctx.filter='grayscale(1) contrast(1.8)';ctx.drawImage(img,0,0,c.width,c.height);ctx.filter='none';if(opt.border){ctx.strokeStyle='#111';ctx.lineWidth=Math.max(3,Math.round(c.width/250));ctx.strokeRect(ctx.lineWidth,c.height*0+ctx.lineWidth,c.width-ctx.lineWidth*2,c.height-ctx.lineWidth*2);}if(opt.stamp){ctx.save();ctx.font=`bold ${Math.max(18,Math.round(c.width/24))}px sans-serif`;ctx.fillStyle='rgba(180,25,25,.82)';ctx.textAlign='right';ctx.fillText(opt.stamp,c.width-24,c.height-24);ctx.restore();}if(opt.date){ctx.save();ctx.font=`${Math.max(14,Math.round(c.width/45))}px sans-serif`;ctx.fillStyle='#333';ctx.fillText(new Date().toLocaleDateString(),24,c.height-24);ctx.restore();}const raw=atob(c.toDataURL('image/jpeg',.88).split(',')[1]);const bytes=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);resolve({bytes,width:c.width,height:c.height});};
      img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error(`Could not read ${file.name}`));};img.src=url;
    });
  }
  async function createImagePdf(files) {
    const pages=[];for(const file of files)pages.push(await canvasToJpeg(file));
    // PDF 1.4; image bytes are kept binary-safe as one-byte JS string characters.
    const objects=[];const add=s=>{objects.push(s);return objects.length;};
    add('<< /Type /Catalog /Pages 2 0 R >>');add('');
    const pageRefs=[];
    pages.forEach((p,i)=>{
      const pageId=objects.length+1,contentId=pageId+1,imageId=pageId+2;pageRefs.push(`${pageId} 0 R`);
      const pageW=595.28,pageH=841.89,scale=Math.min(pageW/p.width,pageH/p.height),drawW=p.width*scale,drawH=p.height*scale,x=(pageW-drawW)/2,y=(pageH-drawH)/2;
      objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Resources << /XObject << /Im${i+1} ${imageId} 0 R >> >> /Contents ${contentId} 0 R >>`);
      const content=`q ${drawW.toFixed(3)} 0 0 ${drawH.toFixed(3)} ${x.toFixed(3)} ${y.toFixed(3)} cm /Im${i+1} Do Q`;
      objects.push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
      let binary='';for(let j=0;j<p.bytes.length;j+=0x8000)binary+=String.fromCharCode(...p.bytes.subarray(j,Math.min(j+0x8000,p.bytes.length)));
      objects.push(`<< /Type /XObject /Subtype /Image /Width ${p.width} /Height ${p.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.bytes.length} >>\nstream\n${binary}\nendstream`);
    });
    objects[1]=`<< /Type /Pages /Kids [${pageRefs.join(' ')}] /Count ${pages.length} >>`;
    let pdf='%PDF-1.4\n%TYB\n',offsets=[0];
    objects.forEach((obj,i)=>{offsets.push(pdf.length);pdf+=`${i+1} 0 obj\n${obj}\nendobj\n`;});
    const xref=pdf.length;pdf+=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n`;
    for(let i=1;i<offsets.length;i++)pdf+=`${String(offsets[i]).padStart(10,'0')} 00000 n \n`;
    pdf+=`trailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
    const bytes=new Uint8Array(pdf.length);for(let i=0;i<pdf.length;i++)bytes[i]=pdf.charCodeAt(i)&255;return new Blob([bytes],{type:'application/pdf'});
  }
  $('#exportPdf').addEventListener('click',async()=>{
    if(!documentFiles.length)return;
    const btn=$('#exportPdf');btn.disabled=true;btn.textContent='Creating PDF…';
    try{const blob=await createImagePdf(documentFiles);const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='tyb-studio-document.pdf';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),5000);toast('PDF exported. Check your downloads.');saveRecent({name:'tyb-studio-document.pdf',type:'PDF export',time:new Date().toISOString()});}
    catch(err){toast(err.message||'PDF export failed. Try fewer or smaller images.');}
    finally{btn.disabled=!documentFiles.length;btn.textContent='Export multi-page PDF';}
  });
  $('#tryOcr').addEventListener('click',async()=>{
    const file=documentFiles[0];if(!file)return;
    if(!('TextDetector' in window)){toast('OCR is unavailable in this browser. No text was fabricated.');return;}
    try{const detector=new TextDetector(),url=URL.createObjectURL(file),img=new Image();await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=url;});URL.revokeObjectURL(url);const results=await detector.detect(img);$('#ocrText').value=results.map(x=>x.rawValue||'').filter(Boolean).join('\n');$('#ocrResult').classList.remove('hidden');toast(results.length?'OCR finished.':'No text detected.');}
    catch{toast('Device OCR failed or is not supported for this image.');}
  });
  $('#copyOcr').addEventListener('click',async()=>{try{await navigator.clipboard.writeText($('#ocrText').value);toast('Recognized text copied.');}catch{ $('#ocrText').focus();$('#ocrText').select();toast('Select and copy the text manually.');}});
  window.TYBDocs={getFiles:()=>documentFiles.slice(),setFiles:(files)=>{documentFiles=files;renderDocumentPages();},refresh:renderDocumentPages};
  renderDocumentPages();

  let videoUrl = null;
  $('#videoInput').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file || !file.type.startsWith('video/')) return toast('Please select a video file.');
    const video = $('#videoPreview');
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    videoUrl = URL.createObjectURL(file);
    video.src = videoUrl;
    video.classList.remove('hidden');
    $('#videoInfo').textContent = `${file.name} · ${(file.size/1024/1024).toFixed(1)} MB · Local preview only`;
    saveRecent({name:file.name,type:'Video preview',time:new Date().toISOString()});
    toast('Video loaded for preview.');
  });

  function getRecent() {
    try { return JSON.parse(localStorage.getItem('tyb-recent') || '[]'); } catch { return []; }
  }
  function saveRecent(item) {
    try {
      const items = [item, ...getRecent().filter(x => x.name !== item.name)].slice(0,8);
      localStorage.setItem('tyb-recent', JSON.stringify(items));
      renderRecent();
    } catch {}
  }
  function renderRecent() {
    const list = $('#recentList');
    const items = getRecent();
    if (!items.length) { list.innerHTML = '<p class="muted">Your recent projects will appear here.</p>'; return; }
    list.replaceChildren();
    items.forEach(item => {
      const row = document.createElement('div');
      row.className = 'contact-row';
      const name = document.createElement('strong'); name.textContent = item.name;
      const type = document.createElement('span'); type.textContent = item.type;
      row.append(name,type); list.append(row);
    });
  }
  $('#clearRecent').addEventListener('click', () => {
    try { localStorage.removeItem('tyb-recent'); } catch {}
    renderRecent(); toast('Recent activity cleared.');
  });
  updateLabels(); updateTransformControls(); renderRecent();

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    window.addEventListener('load', () => navigator.serviceWorker.register('./service-worker.js').catch(() => {}));
  }
})();
