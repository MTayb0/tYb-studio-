/* Browser-local video effect recorder. Export runs in real time. */
(() => {
  'use strict';
  const $=id=>document.getElementById(id), video=$('videoPreview');
  if(!video||!$('videoFxExport'))return;
  let sourceStream=null, activeRecorder=null, chunks=[], exportAudioContext=null, exportMusic=null;
  const status=m=>$('videoFxStatus').textContent=m;
  const filter=()=>$('videoFxFilter').value==='none'?'none':$('videoFxFilter').value;
  function applyPreview(){video.style.filter=filter();video.playbackRate=Number($('videoFxSpeed').value)||1;video.muted=Boolean(mixedAudioTrack)||$('videoFxMute').checked;status('Preview effects applied. Export uses a canvas recording.');}
  $('videoFxApplyPreview').addEventListener('click',applyPreview);
  $('videoInput').addEventListener('change',()=>{ $('videoFxExport').disabled=!video.src; });
  $('videoFxExport').addEventListener('click',async()=>{
    try{
      if(!video.src||!video.videoWidth)throw Error('Choose a video and wait until it is ready.');
      if(!('MediaRecorder'in window))throw Error('This browser does not support MediaRecorder export.');
      const start=Math.max(0,Number($('videoStart').value)||0), end=Math.min(video.duration,Number($('videoEnd').value)||video.duration);
      if(!(end>start))throw Error('End time must be after start time.');
      const aspect=$('socialAspect')?.value||'landscape';
      const maxSide=1280; let w,h;
      if(aspect==='portrait'){w=720;h=1280;}else if(aspect==='square'){w=900;h=900;}else{w=1280;h=720;}
      if(video.videoWidth/video.videoHeight > w/h){ /* crop source sides to fill output */ } else { /* crop source top/bottom to fill output */ }
      w=Math.min(w,maxSide);h=Math.min(h,maxSide);
      const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');
      const canvasStream=c.captureStream(30);let tracks=[...canvasStream.getVideoTracks()];
      let mixedAudioTrack=null;
      const musicFile=$('socialMusicInput')?.files?.[0];
      const musicVolume=Number($('socialMusicVolume')?.value??0)/100;
      const originalVolume=Number($('socialOriginalVolume')?.value??100)/100;
      if(!$('videoFxMute').checked && (musicFile || originalVolume>0)){
        try {
          const AC=window.AudioContext||window.webkitAudioContext;
          if(AC){
            exportAudioContext=new AC(); const destination=exportAudioContext.createMediaStreamDestination();
            const capture=video.captureStream?video.captureStream():video.mozCaptureStream?video.mozCaptureStream():null;
            if(capture?.getAudioTracks().length){const originalSource=exportAudioContext.createMediaStreamSource(new MediaStream(capture.getAudioTracks()));const originalGain=exportAudioContext.createGain();originalGain.gain.value=originalVolume;originalSource.connect(originalGain).connect(destination);}
            if(musicFile && musicVolume>0){exportMusic=new Audio();exportMusic.src=URL.createObjectURL(musicFile);exportMusic.loop=false;const musicSource=exportAudioContext.createMediaElementSource(exportMusic);const musicGain=exportAudioContext.createGain();musicGain.gain.value=musicVolume;musicSource.connect(musicGain).connect(destination);}
            mixedAudioTrack=destination.stream.getAudioTracks()[0];
          }
        } catch (audioError) { console.warn('Audio mixing unavailable:',audioError); }
      }
      if(mixedAudioTrack)tracks.push(mixedAudioTrack);
      sourceStream=new MediaStream(tracks);chunks=[];
      const mime=['video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'].find(t=>MediaRecorder.isTypeSupported(t));
      if(!mime)throw Error('No supported WebM recording codec was found in this browser.');
      activeRecorder=new MediaRecorder(sourceStream,{mimeType:mime});activeRecorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
      const done=new Promise((resolve,reject)=>{activeRecorder.onstop=resolve;activeRecorder.onerror=()=>reject(Error('Video recording failed.'));});
      await new Promise((resolve,reject)=>{const once=()=>{video.removeEventListener('seeked',once);resolve();};video.addEventListener('seeked',once);video.currentTime=start;setTimeout(()=>{video.removeEventListener('seeked',once);resolve();},1500);});
      video.playbackRate=Number($('videoFxSpeed').value)||1;video.muted=Boolean(mixedAudioTrack)||$('videoFxMute').checked;
      activeRecorder.start(250);status('Recording effects in real time… keep the app open.');
      let stopRequested=false;const draw=()=>{if(stopRequested)return;x.save();x.clearRect(0,0,w,h);const look=$('socialLook')?.value||'none';const extra=window.TYBSocialCreator?.lookFilters?.[look]||'none';const selectedFilter=filter()==='none'?extra:(extra==='none'?filter():`${filter()} ${extra}`);x.filter=selectedFilter;if($('videoFxMirror').checked||look==='mirror'){x.translate(w,0);x.scale(-1,1);}const sourceRatio=video.videoWidth/video.videoHeight,targetRatio=w/h;let sx=0,sy=0,sw=video.videoWidth,sh=video.videoHeight;if(sourceRatio>targetRatio){sw=video.videoHeight*targetRatio;sx=(video.videoWidth-sw)/2;}else{sh=video.videoWidth/targetRatio;sy=(video.videoHeight-sh)/2;}x.drawImage(video,sx,sy,sw,sh,0,0,w,h);x.restore();const text=($('socialCaption')?.value||$('videoFxText').value).trim();if(text){const size=Math.max(18,Math.min(72,Number($('videoFxSize').value)||42));x.save();x.font=`700 ${size}px Arial`;x.textAlign='center';x.textBaseline='bottom';x.lineWidth=Math.max(2,size/12);x.strokeStyle='rgba(0,0,0,.72)';x.fillStyle=$('videoFxColor').value;x.strokeText(text,w/2,h-size*.65,w*.9);x.fillText(text,w/2,h-size*.65,w*.9);x.restore();}if(video.currentTime>=end||video.ended){stopRequested=true;try{activeRecorder.stop();}catch{}video.pause();return;}requestAnimationFrame(draw);};
      if(exportAudioContext?.state==='suspended')await exportAudioContext.resume();
      if(exportMusic){try{await exportMusic.play();}catch{status('Music playback was blocked. Tap play on the audio preview first, then export again.');}}
      await video.play();requestAnimationFrame(draw);await done;
      const blob=new Blob(chunks,{type:mime});if(!blob.size)throw Error('No video data was recorded. Try a shorter clip.');const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='tyb-video-effects.webm';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),5000);status(`Export complete (${(blob.size/1048576).toFixed(1)} MB) in ${aspect==='portrait'?'9:16 vertical':aspect==='square'?'1:1 square':'16:9 landscape'} format. Audio mixing depends on browser support.`);
    }catch(e){status(e.message||'Export failed. Try a shorter clip or another browser.');}
    finally{if(sourceStream)sourceStream.getTracks().forEach(t=>t.stop());sourceStream=null;activeRecorder=null;if(exportMusic){exportMusic.pause();exportMusic.src='';exportMusic=null;}if(exportAudioContext){exportAudioContext.close().catch(()=>{});exportAudioContext=null;}}
  });
})();
