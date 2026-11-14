/* Browser-only local playback: uses an object URL, never uploads the file. */
(() => {
  'use strict';
  const picker=document.getElementById('dkLocalMediaFile');
  const button=document.getElementById('dkLocalMediaOpen');
  const status=document.getElementById('dkLocalMediaStatus');
  const video=document.getElementById('player');
  if (!picker || !button || !video) return;
  let url='';
  function release() {
    if (!url) return;
    const old=url; url='';
    URL.revokeObjectURL(old);
  }
  function say(message) { if(status) status.textContent=message; }
  function valid(file) {
    const name=String(file?.name||'');
    return !!file && file.size>0 &&
      (/^(video|audio)\//.test(file.type) ||
       /\.(mp4|m4v|webm|mov|ogv|ogg|mp3|m4a|wav|flac|aac)$/i.test(name));
  }
  button.addEventListener('click',()=>{
    if (window.NougatLegalAccepted!==true) return;
    picker.click();
  });
  picker.addEventListener('change',async()=>{
    const file=picker.files?.[0];
    picker.value='';
    if(!valid(file)){say('Choose a non-empty local audio or video file.');return;}
    if(window.NougatLegalAccepted!==true)return;
    // Preserve a selected remote playback position before replacing its source.
    // app.js owns that state and handles the event.
    window.dispatchEvent(new CustomEvent('nougat:external-stream',{
      detail:{url:'local-file',label:file.name}
    }));
    video.pause();
    release();
    url=URL.createObjectURL(file);
    video.dataset.nougatExternalStream='1';
    video.dataset.nougatExternalLabel=file.name;
    video.dataset.dkLocalFile='1';
    const empty=document.getElementById('emptyPlayer');
    if(empty)empty.hidden=true;
    const title=document.getElementById('playerTitleHud');
    if(title){title.hidden=false;title.textContent=file.name;}
    video.src=url;
    document.querySelector('.rail-button[data-view="player"]')?.click();
    video.load();
    say('Local file: '+file.name+'. Stored only on your device; no upload.');
    try {await video.play();}catch(_){say('File loaded. Press Play to start. Your browser must support this codec.');}
  });
  video.addEventListener('loadstart',()=>{
    // A remote item replaced our object URL; release memory immediately.
    if(url && video.getAttribute('src')!==url){
      release(); delete video.dataset.dkLocalFile;
      say('');
    }
  });
  window.addEventListener('nougat:host-changed',()=>{
    if(video.dataset.dkLocalFile==='1'){
      // Host switching should not leak the old object URL.
      release();delete video.dataset.dkLocalFile;say('');
    }
  });
  window.addEventListener('pagehide',release);
})();
