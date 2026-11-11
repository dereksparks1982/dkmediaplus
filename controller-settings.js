/* DK Media Plus browser controller configuration. Available in System > Controller. */
(() => {
  'use strict';
  const labels = { accept:'Select / Cross (A)', back:'Back / Circle (B)', previous:'Previous item / L1',
    next:'Next item / R1', play:'Play / Start' };
  const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const buttonChoices = Array.from({length:17},(_,index) =>
    '<option value="'+index+'">Button '+index+'</option>').join('');
  let monitor = null;
  function stopMonitor() { if (monitor) cancelAnimationFrame(monitor); monitor = null; }
  function render(root) {
    stopMonitor();
    const api = window.DKMediaController;
    if (!root || !api) return;
    const current = api.getSettings();
    root.innerHTML = '<h2 class="module-heading">SYSTEM • CONTROLLER</h2>'+
      '<p class="module-copy">Browser navigation settings. No drone-flight or emulator inputs are changed. '+
      'A standard gamepad is required for full support; mapping labels depend on the browser.</p>'+
      '<form id="dkControllerSettings" class="controller-settings">'+
      '<label class="controller-field controller-toggle"><span>Enable browser controller navigation</span>'+
      '<input type="checkbox" name="enabled"></label>'+
      '<label class="controller-field"><span>Left-stick dead zone: <output id="controllerDeadzoneValue"></output></span>'+
      '<input type="range" name="deadzone" min="0.2" max="0.9" step="0.05"></label>'+
      '<label class="controller-field"><span>Initial repeat delay: <output id="controllerDelayValue"></output> ms</span>'+
      '<input type="range" name="repeatDelay" min="180" max="800" step="20"></label>'+
      '<label class="controller-field"><span>Repeat interval: <output id="controllerIntervalValue"></output> ms</span>'+
      '<input type="range" name="repeatInterval" min="80" max="350" step="5"></label>'+
      '<fieldset class="controller-mapping"><legend>Button mappings</legend>'+
      Object.entries(labels).map(([name,label]) =>
        '<label class="controller-field"><span>'+esc(label)+'</span><select name="'+name+'">'+buttonChoices+'</select></label>').join('')+
      '</fieldset><div class="module-toolbar">'+
      '<button class="sheet-button" type="submit">Save settings</button>'+
      '<button class="sheet-button" type="button" id="controllerReset">Restore defaults</button>'+
      '<button class="sheet-button" type="button" id="controllerTest">Focus controller test</button>'+
      '</div></form>'+
      '<div id="controllerSettingsResult" class="module-output" role="status" aria-live="polite"></div>'+
      '<div class="controller-live"><h3>Live controller test</h3>'+
      '<p id="controllerLiveStatus">Connect a standard USB or Bluetooth controller and press a button.</p>'+
      '<div class="controller-test-pad" id="controllerTestPad" tabindex="0">Controller input will appear here</div></div>';
    const form = root.querySelector('#dkControllerSettings');
    const result = root.querySelector('#controllerSettingsResult');
    const fill = data => {
      form.elements.enabled.checked = data.enabled;
      for (const key of ['deadzone','repeatDelay','repeatInterval'])
        form.elements[key].value = data[key];
      for (const [key,value] of Object.entries(data.buttons))
        form.elements[key].value = String(value);
      showValues();
    };
    const showValues = () => {
      root.querySelector('#controllerDeadzoneValue').textContent = Number(form.elements.deadzone.value).toFixed(2);
      root.querySelector('#controllerDelayValue').textContent = form.elements.repeatDelay.value;
      root.querySelector('#controllerIntervalValue').textContent = form.elements.repeatInterval.value;
    };
    form.addEventListener('input', showValues);
    fill(current);
    form.addEventListener('submit', event => {
      event.preventDefault();
      const buttons = {};
      for (const name of Object.keys(labels)) buttons[name] = Number(form.elements[name].value);
      if (new Set(Object.values(buttons)).size !== Object.keys(buttons).length) {
        result.textContent = 'Each command needs a different button. Change duplicate assignments.';
        return;
      }
      const ok = api.setSettings({ enabled: form.elements.enabled.checked,
        deadzone: Number(form.elements.deadzone.value),
        repeatDelay: Number(form.elements.repeatDelay.value),
        repeatInterval: Number(form.elements.repeatInterval.value), buttons });
      result.textContent = ok ? 'Controller settings saved in this browser.' :
        'Could not save settings. Check browser local storage.';
    });
    root.querySelector('#controllerReset').addEventListener('click', () => {
      if (api.resetSettings()) { fill(api.getSettings()); result.textContent = 'Default controller mappings restored.'; }
      else result.textContent = 'Unable to save defaults.';
    });
    root.querySelector('#controllerTest').addEventListener('click', () => root.querySelector('#controllerTestPad').focus());
    result.textContent = 'Settings are stored only in this browser. They do not control native games or aircraft.';
    const watch = () => {
      if (!root.isConnected || !root.querySelector('#controllerLiveStatus')) { stopMonitor(); return; }
      const pad = api.getGamepad();
      const label = root.querySelector('#controllerLiveStatus');
      const surface = root.querySelector('#controllerTestPad');
      if (!pad) {
        label.textContent = 'No standard gamepad detected. Press a gamepad button to activate browser detection.';
        surface.textContent = 'Waiting for controller input';
      } else {
        const active = pad.buttons.flatMap((item,i) => item.pressed ? ['Button '+i] : []);
        const axes = pad.axes.slice(0,4).map(n => Number(n).toFixed(2));
        label.textContent = 'Connected: '+pad.id.slice(0,110)+' (index '+pad.index+')';
        surface.textContent = (active.length ? active.join(' • ') : 'No buttons pressed')+' | Axes: '+axes.join(', ');
      }
      monitor = requestAnimationFrame(watch);
    };
    monitor = requestAnimationFrame(watch);
  }
  window.DKMediaControllerSettings = Object.freeze({ render, stopMonitor });
})();
