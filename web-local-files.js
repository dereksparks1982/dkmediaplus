/* DK Media Plus v0.0.69 browser-local media queue.
   Files stay in browser memory. No media content is uploaded or persisted. */
(() => {
  'use strict';
  const picker=document.getElementById('dkLocalMediaFile');
  const open=document.getElementById('dkLocalMediaOpen');
  const status=document.getElementById('dkLocalMediaStatus');
  const list=document.getElementById('dkLocalMediaQueue');
  const clear=document.getElementById('dkLocalMediaClear');
  const player=document.getElementById('player');
  if(!picker||!open||!player||!list||!clear)return;
  let files=[],index=-1,url='',serial=0;
  const extensions=/\.(mp4|m4v|webm|mov|ogv|ogg|mp3|m4a|wav|flac|aac)$/i;
  const valid=file=>file && file.size>0 && (/^(video|audio)\//.test(file.type)||extensions.test(file.name));
  const say=text=>{if(status)status.textContent=text};
  const localActive=()=>player.dataset.dkLocalFile==='1';
  function release(){if(url){URL.revokeObjectURL(url);url='';}}
  function queueView(){
    clear.disabled=!files.length;
    list.replaceChildren();
    if(!files.length){list.hidden=true;return;}
    list.hidden=false;
    const caption=document.createElement('span');
    caption.textContent='LOCAL QUEUE • '+files.length+' FILE'+(files.length===1?'':'S');
    caption.className='dk-local-caption';
    list.append(caption);
    files.forEach((file,i)=>{
      const b=document.createElement('button');
      b.type='button'; b.className='sheet-button'+(i===index?' active-tool':'');
      b.textContent=(i===index?'▶ ':'')+file.name;
      b.title=file.name;
      b.addEventListener('click',()=>void select(i));
      list.append(b);
    });
  }
  function abandon(){
    serial++;
    release(); files=[];index=-1;
    delete player.dataset.dkLocalFile;
    queueView();
    say('Select audio or video files from this device.');
  }
  async function select(i){
    if(window.NougatLegalAccepted!==true||i<0||i>=files.length)return;
    const token=++serial;
    const file=files[i];
    // Let the primary player clear the prior server item and save its position.
    window.dispatchEvent(new CustomEvent('nougat:external-stream',{
      detail:{url:'local-file',label:file.name}
    }));
    player.pause();release();
    index=i;url=URL.createObjectURL(file);
    player.dataset.dkLocalFile='1';
    player.dataset.nougatExternalStream='1';
    player.dataset.nougatExternalLabel=file.name;
    const empty=document.getElementById('emptyPlayer');
    const title=document.getElementById('playerTitleHud');
    if(empty)empty.hidden=true;
    if(title){title.hidden=false;title.textContent=file.name;}
    player.src=url;
    document.querySelector('.rail-button[data-view="player"]')?.click();
    player.load();
    queueView();
    say('LOCAL FILE '+(i+1)+' OF '+files.length+' • '+file.name+' • No upload');
    try{await player.play();}
    catch(_){if(serial===token)say('Ready: '+file.name+'. Press Play. The browser must support this codec.');}
  }
  open.addEventListener('click',()=>{if(window.NougatLegalAccepted===true)picker.click();});
  picker.addEventListener('change',()=>{
    const incoming=Array.from(picker.files||[]);
    picker.value='';
    if(!incoming.length)return;
    const accepted=incoming.filter(valid).slice(0,200);
    const rejected=incoming.length-accepted.length;
    if(!accepted.length){say('No supported audio or video files selected.');return;}
    files=accepted;
    index=-1;
    void select(0);
    if(rejected) say(rejected+' unsupported or empty file(s) skipped. '+accepted.length+' queued.');
  });
  clear.addEventListener('click',()=>{
    const wasLocal=localActive();
    player.pause();
    if(wasLocal){
      player.removeAttribute('src');player.load();
      delete player.dataset.nougatExternalStream;
      delete player.dataset.nougatExternalLabel;
      const title=document.getElementById('playerTitleHud');
      if(title)title.hidden=true;
      const empty=document.getElementById('emptyPlayer');
      if(empty)empty.hidden=false;
    }
    abandon();
  });
  document.getElementById('prevItem')?.addEventListener('click',()=>{
    if(localActive() && index>0) void select(index-1);
  });
  document.getElementById('nextItem')?.addEventListener('click',()=>{
    if(localActive() && index+1<files.length) void select(index+1);
  });
  player.addEventListener('ended',()=>{
    if(localActive()&&index+1<files.length) void select(index+1);
  });
  player.addEventListener('loadstart',()=>{
    if(url && player.getAttribute('src')!==url && !localActive())abandon();
  });
  // Primary app switches sources without dispatching an external-stream event.
  // Detect that change and discard stale object URLs safely.
  const observer=new MutationObserver(()=>{
    if(url && player.getAttribute('src')!==url && !localActive())abandon();
  });
  observer.observe(player,{attributes:true,attributeFilter:['src']});
  window.addEventListener('nougat:host-changed',()=>{
    // The server change may stop playback in app.js. Do not keep stale blobs.
    if(localActive())abandon();
  });
  window.addEventListener('pagehide',()=>{release();observer.disconnect();});
  queueView();
})();
