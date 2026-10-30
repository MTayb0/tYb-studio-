/* TYB Studio AI Builder & Resource Agent v0.9.0
 * Online model discovery + local feature planning. It intentionally never executes downloaded code.
 */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const STORE = 'tyb-ai-builder-v1';
  const RESOURCE_API = 'https://huggingface.co/api/models';
  let staged = [];
  const setStatus = (id, text) => { const el=$(id); if(el) el.textContent=text; };
  const save = () => { try { localStorage.setItem(STORE, JSON.stringify(staged)); } catch {} };
  const downloadText = (name, content, type='text/javascript') => {
    const url=URL.createObjectURL(new Blob([content],{type})); const a=document.createElement('a');
    a.href=url; a.download=name; document.body.append(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),1500);
  };
  function renderStaged(){
    const host=$('agentFeatureList'); if(!host)return; host.replaceChildren();
    if(!staged.length){const p=document.createElement('p');p.className='muted';p.textContent='No staged feature ideas yet.';host.append(p);return;}
    staged.forEach((item,index)=>{
      const card=document.createElement('article');card.className='agent-item';
      const title=document.createElement('strong');title.textContent=item.title;
      const desc=document.createElement('p');desc.textContent=`${item.areaLabel} · ${item.approachLabel} · ${new Date(item.createdAt).toLocaleString()}`;
      const body=document.createElement('p');body.textContent=item.request;
      const remove=document.createElement('button');remove.className='text-btn';remove.textContent='Remove proposal';remove.addEventListener('click',()=>{staged.splice(index,1);save();renderStaged();});
      card.append(title,desc,body,remove);host.append(card);
    });
  }
  function createPlan(){
    const request=$('agentFeatureRequest')?.value.trim();
    if(!request){setStatus('agentPlanStatus','Describe a feature first.');return null;}
    const area=$('agentFeatureArea').value;
    const areaLabel=$('agentFeatureArea').selectedOptions[0].textContent;
    const approachLabel=$('agentBuildApproach').selectedOptions[0].textContent;
    const title=request.length>72?request.slice(0,69)+'…':request;
    const plan={id:`feature-${Date.now()}`,title,request,area,areaLabel,approach:$('agentBuildApproach').value,approachLabel,createdAt:new Date().toISOString(),status:'proposed',steps:[
      'Choose a maintained model or library and verify its license and redistribution terms.',
      'Check model size, supported devices, RAM/storage needs, and offline runtime compatibility.',
      'Implement a small adapter and user-facing controls; keep processing on-device when possible.',
      'Add tests and a fallback path, then review before enabling the feature in the main app.'
    ]};
    staged.unshift(plan);staged=staged.slice(0,50);save();renderStaged();
    const host=$('agentPlanResult');host.classList.remove('hidden');host.replaceChildren();
    const h=document.createElement('h4');h.textContent='Implementation plan: '+title;
    const p=document.createElement('p');p.textContent=`Area: ${areaLabel}. Approach: ${approachLabel}. This is a proposed plan, not a completed implementation.`;
    const ul=document.createElement('ul');plan.steps.forEach(step=>{const li=document.createElement('li');li.textContent=step;ul.append(li);});
    host.append(h,p,ul);setStatus('agentPlanStatus','Feature plan saved on this device. No code has been silently installed or executed.');return plan;
  }
  function generateStarter(){
    const request=$('agentFeatureRequest')?.value.trim();
    if(!request){setStatus('agentPlanStatus','Describe a feature before generating a starter.');return;}
    const area=$('agentFeatureArea').value;
    const safeName=area.replace(/[^a-z0-9-]/gi,'-');
    const source=`/* TYB Studio extension starter — generated from a feature request.\n * Requested feature: ${request.replace(/[\r\n*]/g,' ').slice(0,500)}\n * SECURITY: review this file. Do not paste secrets or run untrusted code.\n * The starter is a scaffold, not a functioning AI model adapter.\n */\n(() => {\n  'use strict';\n  const FEATURE_ID = 'tyb-${safeName}-extension';\n  const FEATURE_REQUEST = ${JSON.stringify(request)};\n  function initFeature(root) {\n    if (!root) throw new Error('A host element is required');\n    const panel = document.createElement('section');\n    panel.className = 'tyb-extension-panel';\n    const heading = document.createElement('h2');\n    heading.textContent = FEATURE_REQUEST;\n    const note = document.createElement('p');\n    note.textContent = 'Extension scaffold only. Connect and test a compatible implementation before release.';\n    panel.append(heading, note);\n    root.append(panel);\n    return { id: FEATURE_ID, destroy: () => panel.remove() };\n  }\n  // Integrate initFeature only through TYB Studio's reviewed, sandboxed module flow.\n  if (typeof module !== 'undefined' && module.exports) module.exports = { initFeature, FEATURE_ID };\n})();\n`;
    downloadText(`tyb-${safeName}-extension-starter.js`,source);
    setStatus('agentPlanStatus','Starter JavaScript downloaded. It is a scaffold only and has not been installed or executed.');
  }
  function renderResources(items){
    const host=$('agentResourceResults');host.replaceChildren();
    if(!items.length){const p=document.createElement('p');p.className='muted';p.textContent='No results found. Try another resource type.';host.append(p);return;}
    items.forEach(model=>{
      const card=document.createElement('article');card.className='agent-item';
      const title=document.createElement('strong');title.textContent=model.id||'Unnamed model';
      const detail=document.createElement('p');detail.textContent=`Downloads: ${Number(model.downloads||0).toLocaleString()} · Likes: ${Number(model.likes||0).toLocaleString()} · Task: ${model.pipeline_tag||'not specified'}`;
      const license=document.createElement('p');license.textContent=`License: ${model.license||'Check model card; not provided in search result'}. Review license, model files, hardware requirements, and safety before use.`;
      const link=document.createElement('a');link.href=`https://huggingface.co/${encodeURIComponent(model.id||'')}`;link.target='_blank';link.rel='noopener noreferrer';link.textContent='Open model page and inspect files ↗';
      card.append(title,detail,license,link);host.append(card);
    });
  }
  async function searchResources(){
    const task=$('agentResourceType').value, limit=Math.max(1,Math.min(8,Number($('agentResourceLimit').value)||5));
    const button=$('agentSearchResources');button.disabled=true;setStatus('agentResourceStatus','Searching the public model catalogue…');
    try{
      const url=new URL(RESOURCE_API);url.searchParams.set('pipeline_tag',task);url.searchParams.set('sort','downloads');url.searchParams.set('direction','-1');url.searchParams.set('limit',String(limit));url.searchParams.set('full','true');
      const response=await fetch(url.href,{headers:{Accept:'application/json'},cache:'no-store'});if(!response.ok)throw new Error(`Catalogue request failed (${response.status})`);
      const data=await response.json();if(!Array.isArray(data))throw new Error('Unexpected catalogue response');
      renderResources(data);setStatus('agentResourceStatus',`${data.length} public model result(s). These are discovery links only; nothing was downloaded, installed, or executed.`);
    }catch(error){setStatus('agentResourceStatus',`Could not reach the online catalogue: ${error.message}. Check your connection. Feature plans still work offline.`);}
    finally{button.disabled=false;}
  }
  function init(){
    try{const saved=JSON.parse(localStorage.getItem(STORE)||'[]');if(Array.isArray(saved))staged=saved.filter(x=>x&&typeof x.request==='string').slice(0,50);}catch{staged=[];}
    renderStaged();
    $('agentStageFeature')?.addEventListener('click',createPlan);
    $('agentGenerateStarter')?.addEventListener('click',generateStarter);
    $('agentSearchResources')?.addEventListener('click',searchResources);
    $('agentClearResources')?.addEventListener('click',()=>{$('agentResourceResults').replaceChildren();setStatus('agentResourceStatus','Results cleared.');});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
  if(typeof window!=='undefined')window.TYBAIBuilder={createPlan,searchResources};
})();
