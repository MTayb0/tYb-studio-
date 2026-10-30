/* TYB Studio — Tayab Growth Engine v0.12.0
 * Privacy-first resource discovery and append-only planning.
 * Network requests contain only a selected public task category; no user content.
 * Downloaded code is never executed and existing app files are never modified by this page.
 */
(() => {
  'use strict';
  const KEY = 'tyb-tayab-growth-v1';
  const PREF_KEY = 'tyb-tayab-growth-settings-v1';
  const API = 'https://huggingface.co/api/models';
  const TASKS = {
    image: {label:'Image generation & inpainting', query:'text-to-image', description:'Image generation models; a compatible runtime and substantial storage are required.'},
    speech: {label:'Speech recognition & subtitles', query:'automatic-speech-recognition', description:'Speech-to-text models; verify language coverage, license, and on-device runtime.'},
    segmentation: {label:'Background & object segmentation', query:'image-segmentation', description:'Segmentation models; check whether the model handles people, general objects, or both.'},
    audio: {label:'Text-to-speech & audio', query:'text-to-audio', description:'Audio generation models; check voice licensing, safety, memory, and runtime support.'},
    video: {label:'Video understanding & generation', query:'text-to-video', description:'Video models can be extremely large and may not run on a phone.'},
    coding: {label:'Local coding assistant', query:'text-generation', description:'Code models require an inference runtime; downloaded weights alone do not provide a working coder.'}
  };
  const $ = id => document.getElementById(id);
  const state = { discoveries: [], log: [], roadmap: [], busy:false };
  let settings = {autoResearch:false, topic:'coding'};
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || '{}');
    if (saved && Array.isArray(saved.discoveries)) state.discoveries = saved.discoveries;
    if (saved && Array.isArray(saved.log)) state.log = saved.log;
    if (saved && Array.isArray(saved.roadmap)) state.roadmap = saved.roadmap;
  } catch {}
  try { settings = {...settings, ...JSON.parse(localStorage.getItem(PREF_KEY) || '{}')}; } catch {}
  const persist = () => { try { localStorage.setItem(KEY, JSON.stringify({discoveries:state.discoveries, log:state.log, roadmap:state.roadmap})); } catch { status('Device storage is full; growth notes could not be saved.'); } };
  const saveSettings = () => { try { localStorage.setItem(PREF_KEY, JSON.stringify(settings)); } catch { status('Could not save growth settings on this device.'); } };
  function status(message) { const el=$('tayabGrowthStatus'); if(el) el.textContent=message; }
  function note(kind, title, detail) {
    state.log.push({kind, title:String(title).slice(0,160), detail:String(detail).slice(0,400), at:new Date().toISOString()});
    if(state.log.length>300) state.log=state.log.slice(-300);
    persist(); renderLog();
  }
  function safeText(tag, text, cls) { const el=document.createElement(tag); el.textContent=text; if(cls)el.className=cls; return el; }
  function renderDiscoveries() {
    const host=$('tayabDiscoveries'); if(!host)return; host.replaceChildren();
    if(!state.discoveries.length){host.append(safeText('p','No discoveries yet. Choose a research area and tap Learn online.','muted'));return;}
    state.discoveries.slice().reverse().forEach(item=>{
      const card=document.createElement('article'); card.className='agent-item';
      card.append(safeText('strong',item.name));
      card.append(safeText('p',`${item.task} · ${item.likes ?? 0} likes · metadata only`,'muted'));
      card.append(safeText('p',item.description || 'Public model listing discovered. Review the license and runtime before use.'));
      const link=document.createElement('a'); link.href=item.url; link.target='_blank'; link.rel='noopener noreferrer'; link.textContent='Review public model page'; card.append(link);
      const stage=document.createElement('button'); stage.type='button'; stage.className='secondary'; stage.textContent='Add to growth plan';
      stage.addEventListener('click',()=>{note('proposal',`Review ${item.name}`,`Assess license, security, device requirements, model size, and compatible runtime for ${item.url}`);status('Added a review task. Existing tools were not changed.');}); card.append(stage); host.append(card);
    });
  }
  function renderLog() {
    const host=$('tayabGrowthLog'); if(!host)return; host.replaceChildren();
    if(!state.log.length){host.append(safeText('p','No growth actions recorded yet.','muted'));return;}
    state.log.slice(-12).reverse().forEach(item=>{const row=document.createElement('article');row.className='agent-item';row.append(safeText('strong',item.title),safeText('p',item.detail),safeText('small',new Date(item.at).toLocaleString(),'muted'));host.append(row);});
  }
  function roadmapFor(text, index) {
    const lower=text.toLowerCase();
    const task = /speech|subtitle|transcri|voice/.test(lower) ? 'speech' : /background|object remov|segment/.test(lower) ? 'segmentation' : /image|inpaint|picture|photo/.test(lower) ? 'image' : /video|frame|track/.test(lower) ? 'video' : /audio|sound|tts|text.to speech/.test(lower) ? 'audio' : 'coding';
    return {id:`plan-${Date.now()}-${index}`,title:text.slice(0,160),area:TASKS[task].label,steps:[`Define acceptance tests for: ${text.slice(0,160)}`,'Research public implementations and verify license / provenance','Check Android CPU, RAM, storage, and offline runtime compatibility','Implement as an additive module; do not overwrite existing features','Run source tests and device smoke tests before release'],status:'proposal',createdAt:new Date().toISOString()};
  }
  function buildRoadmap() {
    const ideas=state.log.filter(x=>x.kind==='idea');
    const proposals=state.log.filter(x=>x.kind==='proposal');
    const candidates=[...ideas.map(x=>x.title==='New growth idea'?x.detail:x.title),...proposals.map(x=>x.detail)];
    if(!candidates.length) candidates.push('Add a real local coding model and sandboxed code validation to Tayab');
    const existing=new Set(state.roadmap.map(x=>x.title));
    candidates.forEach((text,i)=>{const clean=String(text||'').trim().slice(0,160);if(clean&&!existing.has(clean)){state.roadmap.push(roadmapFor(clean,i));existing.add(clean);}});
    if(!state.roadmap.length) state.roadmap.push(roadmapFor('Add a real local coding model and sandboxed code validation to Tayab',0));
    if(state.roadmap.length>150) state.roadmap=state.roadmap.slice(-150);
    persist(); renderRoadmap(); note('roadmap','Prepared growth roadmap',`Prepared ${state.roadmap.length} additive implementation proposals. No project code was modified or executed.`);
    status(`Prepared ${state.roadmap.length} roadmap items. These are plans, not installed features.`);
  }
  function renderRoadmap() {
    const host=$('tayabRoadmap'); if(!host)return; host.replaceChildren();
    if(!state.roadmap.length){host.append(safeText('p','No roadmap prepared yet.','muted'));return;}
    state.roadmap.slice().reverse().slice(0,20).forEach(item=>{
      const card=document.createElement('article');card.className='agent-item';card.append(safeText('strong',item.title),safeText('p',item.area,'muted'));
      const list=document.createElement('ol');item.steps.forEach(step=>list.append(safeText('li',step)));card.append(list);card.append(safeText('small',`Status: ${item.status} · ${new Date(item.createdAt).toLocaleDateString()}`,'muted'));host.append(card);
    });
  }
  async function learn() {
    if(state.busy)return;
    const select=$('tayabGrowthTopic'); const key=select?.value || settings.topic || 'coding'; const task=TASKS[key];
    if(!task){status('Choose a valid research area.');return;}
    settings.topic=key;saveSettings();
    if(!navigator.onLine){status('You are offline. Tayab can keep existing notes, but online discovery needs internet.');return;}
    state.busy=true; const button=$('tayabLearnOnline'); if(button)button.disabled=true;
    status(`Searching public model metadata for ${task.label}. No chat or personal data is sent.`);
    try {
      const url=`${API}?pipeline_tag=${encodeURIComponent(task.query)}&sort=downloads&direction=-1&limit=8`;
      const response=await fetch(url,{method:'GET',headers:{'Accept':'application/json'},credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer'});
      if(!response.ok)throw new Error(`Resource directory returned ${response.status}`);
      const data=await response.json(); if(!Array.isArray(data))throw new Error('Unexpected resource directory response');
      const fresh=data.filter(x=>x && typeof x.id==='string').map(x=>({id:x.id,name:x.id,task:task.label,likes:Number(x.likes)||0,downloads:Number(x.downloads)||0,url:`https://huggingface.co/${encodeURIComponent(x.id).replace(/%2F/g,'/')}`,description:task.description,discoveredAt:new Date().toISOString()}));
      const seen=new Set(state.discoveries.map(x=>x.id));
      fresh.forEach(item=>{if(!seen.has(item.id))state.discoveries.push(item);});
      if(state.discoveries.length>100)state.discoveries=state.discoveries.slice(-100);
      note('research',`Online discovery: ${task.label}`,`Found ${fresh.length} public model listings. Metadata only; no files were downloaded and no code was executed.`);
      renderDiscoveries(); status(`Found ${fresh.length} public listings. Review license, source, model size, security, and runtime before downloading or integrating.`);
    } catch(error) { status(`Online discovery failed: ${error.message}. Saved discoveries remain on this device.`); }
    finally {state.busy=false;if(button)button.disabled=false;}
  }
  function downloadJSON(filename, pack) {
    const blob=new Blob([JSON.stringify(pack,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  function exportPlan() {
    const pack={format:'tyb-tayab-growth-plan-v2',createdAt:new Date().toISOString(),privacy:'Exports include public resource metadata and growth notes only. Chat history, preferences, media, contacts, and identifiers are excluded.',discoveries:state.discoveries.map(({id,name,task,likes,downloads,url,description,discoveredAt})=>({id,name,task,likes,downloads,url,description,discoveredAt})),tasks:state.log.map(({kind,title,detail,at})=>({kind,title,detail,at})),roadmap:state.roadmap};
    downloadJSON('tayab-growth-plan.json',pack);status('Exported the growth plan. Chat and saved personal preferences are excluded.');
  }
  function init() {
    if(!$('tayabGrowthPanel'))return;
    $('tayabLearnOnline')?.addEventListener('click',learn);
    $('tayabExportGrowth')?.addEventListener('click',exportPlan);
    $('tayabBuildRoadmap')?.addEventListener('click',buildRoadmap);
    $('tayabExportRoadmap')?.addEventListener('click',()=>{downloadJSON('tayab-roadmap.json',{format:'tyb-tayab-roadmap-v1',createdAt:new Date().toISOString(),note:'Plans only. They are not installed features or executable code.',roadmap:state.roadmap});status('Exported roadmap. These are plans, not installed features.');});
    const auto=$('tayabAutoResearch');if(auto){auto.checked=Boolean(settings.autoResearch);auto.addEventListener('change',()=>{settings.autoResearch=auto.checked;saveSettings();status(auto.checked?'Auto-research enabled: one public metadata search may run when the app opens, using the selected category only.':'Auto-research disabled. Tayab will only search when you tap Learn online.');});}
    const select=$('tayabGrowthTopic');if(select){select.value=TASKS[settings.topic]?settings.topic:'coding';select.addEventListener('change',()=>{settings.topic=select.value;saveSettings();});}
    $('tayabAddIdea')?.addEventListener('click',()=>{const input=$('tayabGrowthIdea');const value=input?.value.trim();if(!value){status('Write a feature idea first.');return;}note('idea',value.slice(0,160),value);input.value='';status('Idea added to Tayab’s local growth plan. Existing features remain untouched.');});
    renderDiscoveries();renderLog();renderRoadmap();
    if(settings.autoResearch && navigator.onLine) { const dayKey='tyb-tayab-last-auto-research'; let last='';try{last=localStorage.getItem(dayKey)||'';}catch{} const today=new Date().toISOString().slice(0,10); if(last!==today){try{localStorage.setItem(dayKey,today);}catch{} setTimeout(()=>learn(),1200);} }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
  window.TYBTayabGrowth={learn,buildRoadmap,getSummary:()=>({discoveryCount:state.discoveries.length,taskCount:state.log.length,roadmapCount:state.roadmap.length,autoResearch:settings.autoResearch,privacy:'No chat or personal data is sent by online discovery.'})};
})();
