/* DK Media Plus browser-only service readiness diagnostics.
   Never changes server settings or fetches private media bytes. */
(() => {
  'use strict';
  const routes = Object.freeze([
    ['health','/nougat/v1/health','Core'],
    ['catalog','/nougat/v1/catalog','Core'],
    ['capabilities','/nougat/v1/capabilities','Discovery'],
    ['live-tv','/nougat/v1/live-tv?action=status','Host module'],
    ['radio','/nougat/v1/radio?action=status','Host module'],
    ['games','/nougat/v1/games?action=status','Host module'],
    ['discover','/nougat/v1/discover?action=status','Host module'],
    ['studio','/nougat/v1/studio?action=status','Host module'],
    ['security','/nougat/v1/security?action=status','Host module'],
    ['p2p','/nougat/v1/p2p?action=status','Host module']
  ]);
  const CAPABILITY_TIMEOUT = 6000;
  let generation = 0;
  const esc = input => String(input ?? '').replace(/[&<>"']/g, c =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function base() {
    return window.NougatWebHost?.getBase() || '';
  }
  function stop() { generation++; }
  async function fetchJson(path, origin, signal) {
    const url = (origin || '') + path;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CAPABILITY_TIMEOUT);
    const abort = () => controller.abort();
    signal?.addEventListener('abort',abort,{once:true});
    try {
      const request = window.NougatWebAPI?.request ?
        window.NougatWebAPI.request(url,{signal:controller.signal,timeout:CAPABILITY_TIMEOUT}) :
        fetch(url,{signal:controller.signal,cache:'no-store',credentials:'omit',redirect:'error'});
      const response = await request;
      const snippet = await response.text();
      let data = null;
      try { data=JSON.parse(snippet); } catch (_) {}
      return {ok:response.ok && data !== null && typeof data === 'object' && data.ok !== false,code:response.status,data};
    } finally {clearTimeout(timeout);signal?.removeEventListener('abort',abort);}
  }
  const cleanError = err => {
    if (err?.name === 'AbortError' || /timed out/i.test(String(err))) return 'Timed out';
    if (err instanceof TypeError || /fetch failed|failed to fetch/i.test(String(err)))
      return 'Network, TLS or cross-origin browser restriction';
    return String(err?.message || err || 'Request failed').slice(0,160);
  };
  async function probe(origin=base(), names=['health','catalog','capabilities'], signal) {
    if (window.NougatLegalAccepted !== true) throw new Error('Accept the terms before testing the media host.');
    if (origin && !/^https:\/\/[^/]+$/i.test(origin) && origin!==location.origin)
      throw new Error('Only a secure HTTPS media-host origin is accepted.');
    const results = [];
    for (const name of names) {
      const route=routes.find(row=>row[0]===name);
      if (!route) continue;
      const started=performance.now();
      try {
        const response=await fetchJson(route[1],origin,signal);
        results.push({name,group:route[2],status:response.ok?'ready':'unavailable',
          code:response.code,latency:Math.round(performance.now()-started),
          detail:response.ok?'JSON endpoint responded':response.data?.error||'HTTP '+response.code+' or invalid JSON',
          data:response.data});
      } catch (err) {
        results.push({name,group:route[2],status:'unavailable',code:null,
          latency:null,detail:cleanError(err),data:null});
      }
      if (signal?.aborted) break;
    }
    return results;
  }
  function explanation(results) {
    const health=results.find(item=>item.name==='health');
    const catalog=results.find(item=>item.name==='catalog');
    const caps=results.find(item=>item.name==='capabilities');
    const advice=[];
    if (!health?.status || health.status!=='ready')
      advice.push('The browser cannot reach the selected server. Confirm the media host is online, its HTTPS certificate is valid, and the bridge permits this Pages origin.');
    else if (catalog?.code===403)
      advice.push('The host rejected catalog access (HTTP 403). A LAN-only terms cookie is not a remote authentication method; the HTTPS bridge needs its own authorized access.');
    else if (catalog?.status!=='ready')
      advice.push('Server health responds, but the media catalog does not. Playback and most library features cannot work until catalog access is repaired.');
    if (caps?.status!=='ready' && health?.status==='ready')
      advice.push('The server does not provide a capabilities document. Individual module availability cannot be assumed.');
    const unsupported=caps?.data?.unavailable;
    if (Array.isArray(unsupported) && unsupported.length)
      advice.push('The host explicitly reports unavailable modules: '+unsupported.join(', ')+'.');
    return advice;
  }
  function draw(root,results,origin) {
    if (!root?.isConnected) return;
    const table=root.querySelector('#dkServicesResults');
    const advice=root.querySelector('#dkServicesAdvice');
    if (!table || !advice) return;
    table.innerHTML='<table class="diagnostic-table"><thead><tr><th>Endpoint</th><th>Result</th><th>HTTP</th><th>Time</th><th>Details</th></tr></thead><tbody>'+
      results.map(item=>'<tr><th>'+esc(item.name)+'</th><td>'+
      esc(item.status==='ready'?'AVAILABLE':'UNAVAILABLE')+'</td><td>'+
      esc(item.code??'N/A')+'</td><td>'+esc(item.latency===null?'N/A':item.latency+' ms')+
      '</td><td>'+esc(item.detail)+'</td></tr>').join('')+'</tbody></table>';
    const tips=explanation(results);
    advice.replaceChildren();
    const summary=document.createElement('strong');
    summary.textContent=results.filter(x=>x.status==='ready').length+' of '+results.length+
      ' endpoints responded with successful JSON responses. This does not prove individual features work.';
    advice.append(summary);
    for (const tip of tips) {const p=document.createElement('p');p.textContent=tip;advice.append(p);}
    root.querySelector('#dkServicesHost').textContent=origin||location.origin;
    root.querySelector('#dkServicesStatus').textContent='Check complete';
  }
  function render(root) {
    if (!root) return;
    const page=++generation;
    root.innerHTML='<h2 class="module-heading">SYSTEM • WEB SERVICES</h2>'+
      '<p class="module-copy">Check what the selected server actually supports. This runs read-only requests and never downloads personal media.</p>'+
      '<p class="module-copy">Media host: <strong id="dkServicesHost"></strong></p>'+
      '<div class="module-toolbar"><button type="button" class="sheet-button" id="dkServicesCheck">Check core playback</button>'+
      '<button type="button" class="sheet-button" id="dkServicesCheckAll">Check module endpoints</button>'+
      '<button type="button" class="sheet-button" id="dkServicesConnect">Change media host</button></div>'+
      '<p class="status-line" id="dkServicesStatus" aria-live="polite">Ready to check.</p>'+
      '<div id="dkServicesResults"></div><div class="module-output" id="dkServicesAdvice"></div>';
    root.querySelector('#dkServicesHost').textContent=base()||location.origin;
    root.querySelector('#dkServicesConnect').addEventListener('click',()=>
      document.getElementById('webHostOpen')?.click());
    async function check(all) {
      if (page!==generation) return;
      const current=base();
      root.querySelector('#dkServicesStatus').textContent='Checking selected media host...';
      const chosen=all?routes.map(x=>x[0]):['health','catalog','capabilities'];
      const result=await probe(current,chosen);
      if (page!==generation) return;
      draw(root,result,current);
    }
    root.querySelector('#dkServicesCheck').addEventListener('click',()=>void check(false));
    root.querySelector('#dkServicesCheckAll').addEventListener('click',()=>void check(true));
    void check(false);
  }
  window.DKMediaWebServices=Object.freeze({probe,render,stop,routes:routes.map(x=>x[0])});
})();
