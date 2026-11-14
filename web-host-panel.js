(() => {
  'use strict';
  const host = window.NougatWebHost;
  const dialog = document.getElementById('webHostDialog');
  const open = document.getElementById('webHostOpen');
  const address = document.getElementById('webHostAddress');
  const message = document.getElementById('webHostStatus');
  const form = document.getElementById('webHostForm');
  if (!host || !dialog || !open || !form) return;
  function say(text) { message.textContent = text; }
  function show() {
    if (window.NougatLegalAccepted !== true) return;
    address.value = host.getBase();
    say('Your media host must be online, reachable over HTTPS, and allow this site through CORS.');
    if (!dialog.open) dialog.showModal();
    address.focus();
  }
  open.addEventListener('click', show);
  document.getElementById('webHostClose').addEventListener('click', () => dialog.close());
  document.getElementById('webHostDefault').addEventListener('click', () => {
    if (!host.reset()) { say('Could not reset settings: local browser storage is unavailable.'); return; }
    address.value = host.getBase();
    say('Restored default server. Library is refreshing.');
  });
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!host.setServer(address.value)) {
      say('Enter a valid HTTPS server origin without a path, query, username or password.');
      return;
    }
    say('Server saved for the full player and Quick Watch.');
    dialog.close();
  });
  document.getElementById('webHostTest').addEventListener('click', async () => {
    const valid = host.validate(address.value);
    if (!valid) { say('Enter a valid HTTPS origin, such as https://media.example.org'); return; }
    const trigger=document.getElementById('webHostTest');
    trigger.disabled=true;
    say('Checking server health and media catalog...');
    try {
      const tester=window.DKMediaWebServices;
      if (!tester) throw new Error('Browser diagnostics module did not load');
      const results=await tester.probe(valid,['health','catalog','capabilities']);
      const health=results.find(item=>item.name==='health');
      const catalog=results.find(item=>item.name==='catalog');
      const capabilities=results.find(item=>item.name==='capabilities');
      if(health?.status!=='ready') {
        say('Cannot reach media host: '+(health?.detail||'No health response')+
          '. Check HTTPS, the host address and browser CORS permission.');
      } else if(catalog?.status!=='ready') {
        say('Server responds, but your library cannot load: '+
          (catalog?.detail||'Catalog unavailable')+
          '. Check bridge authentication and catalog permissions before saving.');
      } else {
        const count=Array.isArray(catalog.data?.items)?catalog.data.items.length:
          Number.isFinite(Number(catalog.data?.count))?Number(catalog.data.count):'unknown';
        say('Media host and catalog are reachable ('+count+' titles reported). '+
          (capabilities?.status==='ready'?'Module capability list available. ':'Module support unverified. ')+
          'Choose Save & connect to use this host.');
      }
    } catch(error) {
      say('Connection test could not complete: '+String(error?.message||error));
    } finally { trigger.disabled=false; }
  });
})();
