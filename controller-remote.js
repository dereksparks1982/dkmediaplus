/* DK Media Plus v0.0.69: browser remote/controller navigation.
   Native emulators and drone flight intentionally never receive these inputs. */
(() => {
  'use strict';
  const state = { index: -1, connected: false, focus: null, held: '', repeatedAt: 0, running: false };
  const SETTINGS_KEY = 'dk-media-controller-v1';
  const defaults = Object.freeze({ deadzone: 0.55, repeatDelay: 320, repeatInterval: 115,
    enabled: true, buttons: { accept:0, back:1, previous:4, next:5, play:9 } });
  function sanitize(raw) {
    const settings = raw && typeof raw === 'object' ? raw : {};
    const clamp = (value, min, max, fallback) =>
      Number.isFinite(Number(value)) ? Math.min(max,Math.max(min,Number(value))) : fallback;
    const buttons = {};
    for (const [action,index] of Object.entries(defaults.buttons)) {
      const value = Number(settings.buttons?.[action]);
      buttons[action] = Number.isInteger(value) && value >= 0 && value <= 16 ? value : index;
    }
    return { enabled: settings.enabled !== false,
      deadzone: clamp(settings.deadzone,0.2,0.9,defaults.deadzone),
      repeatDelay: clamp(settings.repeatDelay,180,800,defaults.repeatDelay),
      repeatInterval: clamp(settings.repeatInterval,80,350,defaults.repeatInterval),
      buttons };
  }
  function load() {
    try { return sanitize(JSON.parse(localStorage.getItem(SETTINGS_KEY))); }
    catch (_) { return sanitize(null); }
  }
  let settings = load();
  function save(next) {
    const cleaned = sanitize(next);
    const assigned = Object.values(cleaned.buttons);
    if (new Set(assigned).size !== assigned.length) return false;
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(cleaned)); }
    catch (_) { return false; }
    settings = cleaned; state.held = '';
    window.dispatchEvent(new Event('dk-media:controller-settings'));
    return true;
  }
  const rail = () => [...document.querySelectorAll('.module-rail .rail-button')];
  const modal = () => [...document.querySelectorAll('dialog[open], [role="dialog"]:not([hidden])')]
    .filter(el => getComputedStyle(el).display !== 'none' && !el.inert).at(-1);
  const editable = el => !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
  const visible = el => !!el && !el.disabled && !el.closest('[hidden], [inert]') &&
    el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
  function status(message) {
    const label = document.getElementById('controllerStatus');
    if (label) label.textContent = message;
  }
  function scope() {
    const dialog = modal();
    if (dialog) return dialog;
    return document.querySelector('.view.active') || document.querySelector('main') || document.body;
  }
  function candidates() {
    const root = scope();
    const within = [...root.querySelectorAll('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex="0"]')];
    if (modal()) return within.filter(visible);
    return [...rail(), ...within].filter(visible);
  }
  function focus(el) {
    if (!el || !visible(el)) return false;
    if (state.focus) state.focus.classList.remove('controller-focused');
    state.focus = el;
    el.classList.add('controller-focused');
    el.focus({ preventScroll: true });
    el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'auto' });
    return true;
  }
  function navigate(direction) {
    const elements = candidates();
    if (!elements.length) return false;
    let current = elements.indexOf(state.focus);
    if (current < 0) current = elements.indexOf(document.activeElement);
    if (current < 0) return focus(elements[0]);
    const from = elements[current].getBoundingClientRect();
    const cx = from.left + from.width / 2, cy = from.top + from.height / 2;
    let best = null, score = Infinity;
    for (const el of elements) {
      if (el === elements[current]) continue;
      const b = el.getBoundingClientRect();
      const dx = b.left + b.width / 2 - cx;
      const dy = b.top + b.height / 2 - cy;
      const forward = direction === 'left' ? -dx : direction === 'right' ? dx :
        direction === 'up' ? -dy : dy;
      if (forward <= 3) continue;
      const perpendicular = direction === 'left' || direction === 'right' ? Math.abs(dy) : Math.abs(dx);
      const value = forward + perpendicular * 2.4;
      if (value < score) { score = value; best = el; }
    }
    if (best) return focus(best);
    // At viewport edges, remain on the current control rather than wrapping unpredictably.
    return false;
  }
  function playerActive() {
    return document.querySelector('#playerView.view.active') !== null;
  }
  function video() { return document.getElementById('player'); }
  function togglePlayback() {
    const v = video(); if (!v || !v.currentSrc) return;
    if (v.paused) void v.play().catch(() => status('Playback could not start'));
    else v.pause();
  }
  function seek(amount) {
    const v = video();
    if (v && Number.isFinite(v.duration) && v.duration > 0)
      v.currentTime = Math.max(0, Math.min(v.duration, v.currentTime + amount));
  }
  function goBack() {
    const dialog = modal();
    if (dialog) { if (dialog.tagName === 'DIALOG') dialog.close(); return; }
    if (editable(document.activeElement)) { document.activeElement.blur(); return; }
    const active = document.querySelector('.rail-button.active');
    if (active?.dataset.view !== 'home') document.querySelector('.rail-button[data-view="home"]')?.click();
    else focus(rail()[0]);
  }
  function action(name) {
    if (window.NougatLegalAccepted !== true || !settings.enabled) return;
    const dialog = modal();
    if (name === 'back') { goBack(); return; }
    if (name === 'accept') {
      const el = visible(state.focus) ? state.focus : document.activeElement;
      if (visible(el) && el.matches('button,a[href]')) el.click();
      else if (visible(el) && el.matches('input,select,textarea')) el.focus();
      else if (!dialog) focus(candidates()[0]);
      return;
    }
    if (dialog) { if (['up','down','left','right'].includes(name)) navigate(name); return; }
    if (name === 'play') { if (playerActive()) togglePlayback(); return; }
    if (name === 'previous' || name === 'next') {
      if (playerActive()) document.getElementById(name === 'previous' ? 'prevItem' : 'nextItem')?.click();
      else {
        const links = rail(), active = links.findIndex(x => x.classList.contains('active'));
        const next = links[Math.max(0, Math.min(links.length - 1, active + (name === 'previous' ? -1 : 1)))];
        next?.click(); if (next) focus(next);
      }
      return;
    }
    if (playerActive() && (name === 'left' || name === 'right') &&
        (!state.focus || state.focus === video() || state.focus.id === 'playPause')) {
      seek(name === 'left' ? -10 : 10); return;
    }
    navigate(name);
  }
  function gamepad() {
    if (typeof navigator.getGamepads !== 'function') return null;
    try { return [...navigator.getGamepads()].find(p => p && p.connected && p.mapping === 'standard') || null; }
    catch (_) { return null; }
  }
  function pressed(p, index) { return !!p.buttons[index]?.pressed; }
  function poll(time) {
    if (!state.running) return;
    requestAnimationFrame(poll);
    if (document.hidden || window.NougatLegalAccepted !== true || !settings.enabled) { state.held = ''; return; }
    const p = gamepad();
    if (!p) {
      if (state.connected) status('Controller disconnected');
      state.connected = false; state.held = '';
      return;
    }
    if (!state.connected || state.index !== p.index) status('Controller connected · D-pad to navigate · A select · B back');
    state.connected = true; state.index = p.index;
    const axisX = p.axes[0] || 0, axisY = p.axes[1] || 0;
    let command = '';
    if (pressed(p, settings.buttons.back)) command = 'back';
    else if (pressed(p, settings.buttons.accept)) command = 'accept';
    else if (pressed(p, settings.buttons.play)) command = 'play';
    else if (pressed(p, settings.buttons.previous)) command = 'previous';
    else if (pressed(p, settings.buttons.next)) command = 'next';
    else if (pressed(p, 12) || axisY < -settings.deadzone) command = 'up';
    else if (pressed(p, 13) || axisY > settings.deadzone) command = 'down';
    else if (pressed(p, 14) || axisX < -settings.deadzone) command = 'left';
    else if (pressed(p, 15) || axisX > settings.deadzone) command = 'right';
    if (!command) { state.held = ''; return; }
    if (state.held !== command) {
      state.held = command; state.repeatedAt = time + settings.repeatDelay; action(command);
    } else if (['up','down','left','right'].includes(command) && time >= state.repeatedAt) {
      state.repeatedAt = time + settings.repeatInterval; action(command);
    }
  }
  // Keyboard navigation is opt-in only when controller mode is active.
  // Do not hijack ordinary typing, video player shortcuts, or native keyboard behavior.
  document.addEventListener('keydown', event => {
    if (!state.connected || event.ctrlKey || event.altKey || event.metaKey ||
        editable(event.target) || event.target?.isContentEditable) return;
    const map = { Escape:'back', Enter:'accept' };
    const command = map[event.key];
    if (!command) return;
    event.preventDefault(); action(command);
  });
  document.addEventListener('focusin', event => {
    if (state.focus && state.focus !== event.target) state.focus.classList.remove('controller-focused');
    if (state.connected && visible(event.target)) {
      state.focus = event.target; state.focus.classList.add('controller-focused');
    }
  });
  window.addEventListener('gamepadconnected', () => { if (!state.running) start(); });
  window.addEventListener('gamepaddisconnected', () => { state.held = ''; });
  function start() {
    if (state.running) return;
    state.running = true;
    status('Connect a standard gamepad to navigate');
    requestAnimationFrame(poll);
  }
  if (window.NougatLegalAccepted === true) start();
  else window.addEventListener('nougat:legal-accepted', start, { once: true });
  window.addEventListener('storage', event => {
    if (event.key === SETTINGS_KEY) { settings = load(); state.held = ''; }
  });
  window.DKMediaController = Object.freeze({
    navigate, action, isConnected: () => state.connected,
    getSettings: () => JSON.parse(JSON.stringify(settings)),
    setSettings: save,
    resetSettings: () => save(defaults),
    getGamepad: gamepad,
    status
  });
})();
