/*
 * weather.js — a live weather layer for the homepage.
 *
 * Shows what the weather is doing in Oxford right now (Open-Meteo, free, no API key)
 * as a light layer behind the page: sun, clouds, rain, drizzle, storms, snow, fog,
 * night skies and (in autumn) a few falling leaves. Visitors can switch it from the
 * small pill in the top-right corner.
 *
 * - Never blocks clicks (canvases use pointer-events: none).
 * - Starts switched off for visitors who ask their OS to reduce motion.
 * - Pauses when the tab is hidden.
 *
 * To remove it, delete the <script src="js/weather.js"> line in index.html.
 */
(function () {
  'use strict';
  if (window.SiteWeather) return;

  // ------------------------------------------------------------------ config
  var PLACE = { name: 'Oxford', lat: 51.752, lon: -1.2577, tz: 'Europe/London' };
  var REFRESH_MS = 15 * 60 * 1000;
  var API = 'https://api.open-meteo.com/v1/forecast?latitude=' + PLACE.lat +
    '&longitude=' + PLACE.lon +
    '&current=temperature_2m,weather_code,is_day,wind_speed_10m,wind_direction_10m' +
    '&timezone=' + encodeURIComponent(PLACE.tz);

  var store = {
    get: function (k, d) {
      try { var v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; }
    },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* private mode */ } }
  };
  var reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  var CHOICES = ['live', 'clear', 'cloudy', 'rain', 'storm', 'snow', 'fog', 'leaves', 'off'];
  var LABEL = {
    live: 'Live', clear: 'Clear', cloudy: 'Clouds', overcast: 'Overcast', drizzle: 'Drizzle',
    rain: 'Rain', storm: 'Storm', snow: 'Snow', fog: 'Fog', leaves: 'Leaves', off: 'Off'
  };

  // WMO weather codes -> [effect, label, intensity]
  var WMO = {
    0: ['clear', 'Clear sky', 1], 1: ['clear', 'Mainly clear', 1], 2: ['cloudy', 'Partly cloudy', 1],
    3: ['overcast', 'Overcast', 1], 45: ['fog', 'Fog', 1], 48: ['fog', 'Freezing fog', 1],
    51: ['drizzle', 'Light drizzle', 0.6], 53: ['drizzle', 'Drizzle', 0.8], 55: ['drizzle', 'Heavy drizzle', 1],
    56: ['drizzle', 'Freezing drizzle', 0.8], 57: ['drizzle', 'Freezing drizzle', 1],
    61: ['rain', 'Light rain', 0.6], 63: ['rain', 'Rain', 1], 65: ['rain', 'Heavy rain', 1.5],
    66: ['rain', 'Freezing rain', 0.8], 67: ['rain', 'Freezing rain', 1.3],
    71: ['snow', 'Light snow', 0.6], 73: ['snow', 'Snow', 1], 75: ['snow', 'Heavy snow', 1.5],
    77: ['snow', 'Snow grains', 0.6], 80: ['rain', 'Light showers', 0.6], 81: ['rain', 'Showers', 1],
    82: ['rain', 'Heavy showers', 1.5], 85: ['snow', 'Snow showers', 0.8], 86: ['snow', 'Heavy snow showers', 1.4],
    95: ['storm', 'Thunderstorm', 1], 96: ['storm', 'Thunderstorm with hail', 1.2], 99: ['storm', 'Thunderstorm with hail', 1.4]
  };

  // ------------------------------------------------------------------ state
  var S = {
    mode: store.get('kc-wx-mode', reduceMotion ? 'off' : 'live'), // 'live' or an effect name
    time: store.get('kc-wx-time', 'auto'),                        // 'auto' | 'day' | 'night'
    live: null,     // last reading: {kind,label,temp,isDay,wind,intensity,at}
    kind: 'off', night: false, intensity: 1, wind: 0.15, label: ''
  };
  if (CHOICES.indexOf(S.mode) < 0) S.mode = 'live';

  function oxfordParts() {
    try {
      var p = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: PLACE.tz })
        .formatToParts(new Date());
      var h = 0, m = 0;
      p.forEach(function (x) { if (x.type === 'hour') h = +x.value; if (x.type === 'minute') m = +x.value; });
      return { h: h, m: m };
    } catch (e) { var d = new Date(); return { h: d.getHours(), m: d.getMinutes() }; }
  }
  function oxfordClock() { var p = oxfordParts(); return (p.h < 10 ? '0' : '') + p.h + ':' + (p.m < 10 ? '0' : '') + p.m; }
  function guessNight() { var h = oxfordParts().h; return h < 7 || h >= 19; }
  function oxfordMonth() {
    try { return +new Intl.DateTimeFormat('en-GB', { month: 'numeric', timeZone: PLACE.tz }).format(new Date()); }
    catch (e) { return new Date().getMonth() + 1; }
  }

  function resolve() {
    var live = S.live;
    var kind, intensity = 1, wind = 0.15, label;
    if (S.mode === 'live') {
      kind = live ? live.kind : 'cloudy';
      intensity = live ? live.intensity : 1;
      wind = live ? live.wind : 0.15;
      label = live ? live.label : 'Weather unavailable';
    } else {
      kind = S.mode;
      intensity = kind === 'storm' ? 1.3 : 1;
      wind = kind === 'storm' ? 0.55 : kind === 'leaves' ? 0.35 : 0.15;
      label = LABEL[kind];
    }
    var night;
    if (S.time === 'day') night = false;
    else if (S.time === 'night') night = true;
    else night = live ? !live.isDay : guessNight();

    S.kind = kind; S.intensity = intensity; S.wind = wind; S.night = night; S.label = label;
    setTargets();
    updateUI();
    try {
      window.dispatchEvent(new CustomEvent('siteweather:change', { detail: api.state }));
    } catch (e) { /* very old browser */ }
    wake();
  }

  // ------------------------------------------------------------------ live data
  function applyReading(c, at) {
    var m = WMO[c.weather_code] || ['cloudy', 'Cloudy', 1];
    var spd = c.wind_speed_10m || 0;                 // km/h
    var dir = (c.wind_direction_10m || 270) * Math.PI / 180; // where the wind comes FROM
    var sign = -Math.sin(dir) >= 0 ? 1 : -1;          // blowing towards east = to the right
    S.live = {
      kind: m[0], label: m[1], intensity: m[2],
      temp: typeof c.temperature_2m === 'number' ? Math.round(c.temperature_2m) : null,
      isDay: c.is_day === 1 || c.is_day === true,
      wind: sign * Math.min(1, 0.08 + spd / 45),
      at: at
    };
  }

  function fetchLive() {
    var cached = store.get('kc-wx-live', null);
    if (cached && cached.at && Date.now() - cached.at < REFRESH_MS && cached.current) {
      applyReading(cached.current, cached.at);
      resolve();
      return;
    }
    if (!window.fetch) { resolve(); return; }
    fetch(API, { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (j) {
        if (!j || !j.current) throw new Error('bad payload');
        var at = Date.now();
        store.set('kc-wx-live', { at: at, current: j.current });
        applyReading(j.current, at);
        resolve();
      })
      .catch(function () { resolve(); });
  }

  // ------------------------------------------------------------------ styles
  var css = [
    '#wx-back,#wx-front{position:fixed;left:0;top:0;width:100%;height:100%;pointer-events:none}',
    '#wx-back{z-index:0}#wx-front{z-index:50}',
    'body>table{position:relative;z-index:1}',
    '.wx-cap{position:absolute;pointer-events:none;z-index:3;transform-origin:50% 100%;transform:scaleY(0);will-change:transform}',
    '.wx-cap svg{display:block;width:100%;height:100%;overflow:visible}',
    '#wx-ui{position:fixed;top:12px;right:12px;z-index:70;font-family:var(--font,system-ui,sans-serif);font-size:13px;line-height:1.3;color:#1d2a3a}',
    '#wx-ui *{box-sizing:border-box}',
    '#wx-pill{display:flex;align-items:center;gap:7px;height:34px;padding:0 13px 0 10px;border-radius:17px;',
    'border:1px solid rgba(20,40,70,.13);background:rgba(255,255,255,.74);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);',
    'color:inherit;font:inherit;cursor:pointer;box-shadow:0 1px 4px rgba(20,40,70,.08);transition:background .15s,box-shadow .15s}',
    '#wx-pill:hover{background:rgba(255,255,255,.95);box-shadow:0 2px 10px rgba(20,40,70,.12)}',
    '#wx-pill:focus-visible,#wx-menu button:focus-visible,#wx-menu input:focus-visible{outline:2px solid var(--link,#064E8A);outline-offset:2px}',
    '.wx-ico{display:inline-flex;width:18px;height:18px;flex:none}.wx-ico svg{width:100%;height:100%}',
    '#wx-pill .wx-temp{font-variant-numeric:tabular-nums;font-weight:600}',
    '#wx-pill .wx-place{opacity:.75}',
    '#wx-menu{position:absolute;right:0;top:42px;width:264px;max-width:calc(100vw - 24px);padding:14px;border-radius:16px;',
    'background:rgba(255,255,255,.96);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);',
    'border:1px solid rgba(20,40,70,.1);box-shadow:0 10px 32px rgba(20,40,70,.18);transform-origin:top right;',
    'animation:wx-pop .16s ease-out}',
    '#wx-menu[hidden]{display:none}',
    '@keyframes wx-pop{from{opacity:0;transform:scale(.96) translateY(-4px)}to{opacity:1;transform:none}}',
    '.wx-head{display:flex;gap:10px;align-items:center}',
    '.wx-head .wx-ico{width:30px;height:30px;color:var(--link,#064E8A)}',
    '.wx-head small{display:block;opacity:.65;font-size:12px}',
    '.wx-head b{font-size:14px}',
    '.wx-sec{margin-top:12px;padding-top:12px;border-top:1px solid rgba(20,40,70,.09)}',
    '.wx-sec-title{font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;opacity:.55;margin-bottom:8px}',
    '.wx-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}',
    '.wx-opt{display:flex;flex-direction:column;align-items:center;gap:4px;padding:8px 2px 7px;border-radius:10px;',
    'border:1px solid transparent;background:transparent;cursor:pointer;font:inherit;font-size:12px;color:inherit}',
    '.wx-opt:hover{background:rgba(6,78,138,.06)}',
    '.wx-opt[aria-checked="true"]{background:rgba(6,78,138,.09);border-color:rgba(6,78,138,.35);color:var(--link,#064E8A);font-weight:600}',
    '.wx-row{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:8px}',
    '.wx-seg{display:flex;border:1px solid rgba(20,40,70,.15);border-radius:9px;overflow:hidden}',
    '.wx-seg button{border:0;background:transparent;padding:5px 10px;font:inherit;font-size:12px;color:inherit;cursor:pointer}',
    '.wx-seg button+button{border-left:1px solid rgba(20,40,70,.12)}',
    '.wx-seg button[aria-checked="true"]{background:var(--link,#064E8A);color:#fff}',
    '.wx-switch{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:6px;cursor:pointer}',
    '.wx-switch input{appearance:none;-webkit-appearance:none;width:34px;height:20px;border-radius:10px;background:rgba(20,40,70,.2);',
    'position:relative;cursor:pointer;transition:background .15s;flex:none;margin:0}',
    '.wx-switch input::after{content:"";position:absolute;left:2px;top:2px;width:16px;height:16px;border-radius:50%;background:#fff;',
    'box-shadow:0 1px 2px rgba(0,0,0,.25);transition:transform .15s}',
    '.wx-switch input:checked{background:var(--link,#064E8A)}',
    '.wx-switch input:checked::after{transform:translateX(14px)}',
    '.wx-hint{margin:8px 0 0;font-size:12px;opacity:.7;line-height:1.4}',
    '.wx-credit{margin-top:10px;font-size:11px;opacity:.5}',
    '.wx-credit a{font-size:11px}',
    '@media print{#wx-back,#wx-front,#wx-ui,.wx-cap{display:none!important}}',
    '@media (max-width:560px){#wx-pill .wx-place{display:none}#wx-ui{top:8px;right:8px}#wx-pill{height:30px;padding:0 10px 0 8px}#wx-menu{top:38px}}'
  ].join('');

  // ------------------------------------------------------------------ icons
  var SVG_OPEN = '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">';
  var CLOUD_LOW = '<path d="M5.5 15h9a3 3 0 0 0 .3-6 4.5 4.5 0 0 0-8.7 1.1A2.5 2.5 0 0 0 5.5 15z"/>';
  var CLOUD_HIGH = '<path d="M5.5 12h9a3 3 0 0 0 .3-6 4.5 4.5 0 0 0-8.7 1.1A2.5 2.5 0 0 0 5.5 12z"/>';
  var ICON = {
    live: '<path d="M10 18s-5.5-5.2-5.5-9.3a5.5 5.5 0 0 1 11 0C15.5 12.8 10 18 10 18z"/><circle cx="10" cy="8.7" r="2"/>',
    clear: '<circle cx="10" cy="10" r="3.5"/><path d="M10 1.8v2M10 16.2v2M1.8 10h2M16.2 10h2M4.2 4.2l1.4 1.4M14.4 14.4l1.4 1.4M4.2 15.8l1.4-1.4M14.4 5.6l1.4-1.4"/>',
    cloudy: CLOUD_LOW,
    overcast: '<path d="M7 7.5a4 4 0 0 1 7.6-.6"/>' + CLOUD_LOW,
    drizzle: CLOUD_HIGH + '<path d="M8 15v.5M12 15v.5M10 17.5v.5"/>',
    rain: CLOUD_HIGH + '<path d="M7 14.5l-1 2.5M10.5 14.5l-1 2.5M14 14.5l-1 2.5"/>',
    storm: CLOUD_HIGH + '<path d="M10.8 13l-2 3h3l-2 3"/>',
    snow: '<path d="M10 2v16M3.1 6l13.8 8M3.1 14l13.8-8M8 3.6l2 1.4 2-1.4M8 16.4l2-1.4 2 1.4"/>',
    fog: '<path d="M3 6.5h14M5 10h12M3 13.5h12M6 17h8"/>',
    leaves: '<path d="M4.5 15.5C4.5 9 9 4.5 16 4.5c0 7-4.5 11-11.5 11z"/><path d="M4.5 15.5l6.5-6.5"/>',
    off: '<circle cx="10" cy="10" r="7"/><path d="M5.2 14.8l9.6-9.6"/>',
    night: '<path d="M15.8 12.6A6.6 6.6 0 0 1 7.4 4.2a6.6 6.6 0 1 0 8.4 8.4z"/>',
    nightcloud: '<path d="M13.5 3.2a4 4 0 0 0 3.6 5.6"/>' + CLOUD_LOW
  };
  function icon(name) { return SVG_OPEN + (ICON[name] || ICON.cloudy) + '</svg>'; }
  function iconFor(kind, night) {
    if (night && kind === 'clear') return icon('night');
    if (night && kind === 'cloudy') return icon('nightcloud');
    return icon(kind);
  }

  // ------------------------------------------------------------------ UI
  var ui = {};
  function el(tag, attrs, html) {
    var e = document.createElement(tag);
    if (attrs) for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (html != null) e.innerHTML = html;
    return e;
  }

  function buildUI() {
    var root = el('div', { id: 'wx-ui' });
    var pill = el('button', { id: 'wx-pill', type: 'button', 'aria-haspopup': 'true', 'aria-expanded': 'false', 'aria-controls': 'wx-menu', title: 'Weather' });
    pill.innerHTML = '<span class="wx-ico"></span><span class="wx-place"></span><span class="wx-temp"></span>';
    var menu = el('div', { id: 'wx-menu', role: 'dialog', 'aria-label': 'Weather settings' });
    menu.hidden = true;

    var head = el('div', { class: 'wx-head' }, '<span class="wx-ico"></span><div><small></small><b></b></div>');
    menu.appendChild(head);

    var sec = el('div', { class: 'wx-sec' });
    sec.appendChild(el('div', { class: 'wx-sec-title' }, 'Weather on this page'));
    var grid = el('div', { class: 'wx-grid', role: 'radiogroup', 'aria-label': 'Weather effect' });
    CHOICES.forEach(function (c) {
      var b = el('button', { type: 'button', class: 'wx-opt', role: 'radio', 'data-mode': c, 'aria-checked': 'false' },
        '<span class="wx-ico">' + icon(c) + '</span><span>' + LABEL[c] + '</span>');
      b.addEventListener('click', function () { setMode(c); });
      grid.appendChild(b);
    });
    sec.appendChild(grid);

    var row = el('div', { class: 'wx-row' }, '<span>Time of day</span>');
    var seg = el('div', { class: 'wx-seg', role: 'radiogroup', 'aria-label': 'Time of day' });
    [['auto', 'Auto'], ['day', 'Day'], ['night', 'Night']].forEach(function (t) {
      var b = el('button', { type: 'button', role: 'radio', 'data-time': t[0], 'aria-checked': 'false' }, t[1]);
      b.addEventListener('click', function () { S.time = t[0]; store.set('kc-wx-time', S.time); resolve(); });
      seg.appendChild(b);
    });
    row.appendChild(seg);
    sec.appendChild(row);
    menu.appendChild(sec);

    var extra = el('div', { id: 'wx-extra' });
    menu.appendChild(extra);
    menu.appendChild(el('div', { class: 'wx-credit' },
      'Live data: <a href="https://open-meteo.com/" target="_blank" rel="noopener">Open-Meteo</a>'));

    root.appendChild(pill);
    root.appendChild(menu);
    document.body.appendChild(root);

    pill.addEventListener('click', function (e) { e.stopPropagation(); toggleMenu(); });
    document.addEventListener('click', function (e) { if (!menu.hidden && !root.contains(e.target)) toggleMenu(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !menu.hidden) { toggleMenu(false); pill.focus(); } });

    ui = { root: root, pill: pill, menu: menu, head: head, grid: grid, seg: seg, extra: extra };
  }

  function toggleMenu(force) {
    var open = typeof force === 'boolean' ? force : ui.menu.hidden;
    ui.menu.hidden = !open;
    ui.pill.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) updateUI();
  }

  function updateUI() {
    if (!ui.pill) return;
    var live = S.live;
    var shownKind = S.mode === 'off' ? (live ? live.kind : 'off') : S.kind;
    var shownNight = S.mode === 'off' ? (live ? !live.isDay : guessNight()) : S.night;
    ui.pill.querySelector('.wx-ico').innerHTML = iconFor(shownKind, shownNight);
    var t = live && live.temp != null ? live.temp + '°' : '';
    if (S.mode === 'live' || S.mode === 'off') {
      ui.pill.querySelector('.wx-place').textContent = PLACE.name;
      ui.pill.querySelector('.wx-temp').textContent = t;
    } else {
      ui.pill.querySelector('.wx-place').textContent = PLACE.name + ' ' + t;
      ui.pill.querySelector('.wx-temp').textContent = LABEL[S.mode];
    }
    ui.pill.title = live ? PLACE.name + ' now: ' + (live.temp != null ? live.temp + '°C, ' : '') + live.label.toLowerCase() : 'Weather';

    var hk = live ? live.kind : 'cloudy';
    ui.head.querySelector('.wx-ico').innerHTML = iconFor(hk, live ? !live.isDay : guessNight());
    ui.head.querySelector('small').textContent = PLACE.name + ' now · ' + oxfordClock();
    ui.head.querySelector('b').textContent = live
      ? (live.temp != null ? live.temp + '°C · ' : '') + live.label
      : 'Live weather unavailable';

    Array.prototype.forEach.call(ui.grid.children, function (b) {
      b.setAttribute('aria-checked', b.getAttribute('data-mode') === S.mode ? 'true' : 'false');
    });
    Array.prototype.forEach.call(ui.seg.children, function (b) {
      b.setAttribute('aria-checked', b.getAttribute('data-time') === S.time ? 'true' : 'false');
    });
  }

  function setMode(m) {
    if (CHOICES.indexOf(m) < 0) return;
    S.mode = m;
    store.set('kc-wx-mode', m);
    resolve();
  }

  // ------------------------------------------------------------------ canvases
  var back, front, bx, fx;
  var W = 0, H = 0, DPR = 1, small = false, T = 0;

  function resize() {
    W = window.innerWidth; H = window.innerHeight;
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    small = W < 600;
    [back, front].forEach(function (c) {
      c.width = Math.round(W * DPR); c.height = Math.round(H * DPR);
    });
    bx.setTransform(DPR, 0, 0, DPR, 0, 0);
    fx.setTransform(DPR, 0, 0, DPR, 0, 0);
    makePuddles();
    makeStars();
    makeFog();
    caps.layout();
    wake();
  }

  function rand(a, b) { return a + Math.random() * (b - a); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function approach(v, t, step) { return v < t ? Math.min(t, v + step) : Math.max(t, v - step); }
  function skyH() { return Math.min(380, H * 0.6); }
  function skyOffset() { return -(window.scrollY || window.pageYOffset || 0) * 0.85; }

  // ------------------------------------------------------------------ targets
  var TGT = { rain: 0, drizzle: false, snow: 0, leaves: 0, clouds: 0, cloudTone: 'light', cloudAlpha: 0.9,
    fog: 0, sun: 0, moon: 0, stars: 0, puddle: 0, lightning: false, sky: [0, 0, 0, 0], dim: 0, wind: 0.15 };
  var V = { sky: [0, 0, 0, 0], sun: 0, moon: 0, stars: 0, fog: 0, puddle: 0, dim: 0, wind: 0.15 };
  var accum = 0; // snow accumulation 0..1

  var SKY_DAY = {
    clear: [120, 182, 240, 0.40], cloudy: [140, 178, 222, 0.38], overcast: [150, 160, 178, 0.38],
    drizzle: [140, 154, 175, 0.38], rain: [118, 136, 164, 0.42], storm: [84, 94, 124, 0.50],
    snow: [170, 186, 214, 0.42], fog: [188, 194, 202, 0.36], leaves: [240, 176, 110, 0.30], off: [0, 0, 0, 0]
  };

  function setTargets() {
    var k = S.kind, n = S.night, I = S.intensity;
    var t = { rain: 0, drizzle: false, snow: 0, leaves: 0, clouds: 0, cloudTone: 'light', cloudAlpha: 0.9,
      fog: 0, sun: 0, moon: 0, stars: 0, puddle: 0, lightning: false, sky: [0, 0, 0, 0], dim: 0, wind: S.wind };
    switch (k) {
      case 'clear': t.clouds = 2; t.sun = 1; break;
      case 'cloudy': t.clouds = 6; t.sun = 0.7; break;
      case 'overcast': t.clouds = 10; t.cloudTone = 'grey'; break;
      case 'drizzle': t.clouds = 9; t.cloudTone = 'grey'; t.rain = 0.55 * I; t.drizzle = true; t.puddle = 0.5; break;
      case 'rain': t.clouds = 10; t.cloudTone = 'grey'; t.rain = I; t.puddle = 1; break;
      case 'storm': t.clouds = 12; t.cloudTone = 'dark'; t.rain = 1.25 * I; t.puddle = 1; t.lightning = true; t.dim = 0.05; break;
      case 'snow': t.clouds = 7; t.cloudTone = 'snow'; t.snow = I; break;
      case 'fog': t.fog = 1; break;
      case 'leaves': t.clouds = 3; t.sun = 0.8; t.leaves = 1; break;
    }
    if (k !== 'off') {
      var s = SKY_DAY[k] || SKY_DAY.cloudy;
      if (n) {
        var m = 0.72;
        t.sky = [s[0] + (24 - s[0]) * m, s[1] + (34 - s[1]) * m, s[2] + (86 - s[2]) * m, Math.min(0.5, s[3] + 0.08)];
        t.moon = t.sun; t.sun = 0;
        t.stars = k === 'clear' ? 1 : k === 'cloudy' || k === 'leaves' ? 0.55 : k === 'snow' ? 0.15 : 0;
        if (t.cloudTone === 'light') t.cloudTone = 'night';
        t.dim = Math.max(t.dim, 0.04);
      } else {
        t.sky = s.slice();
      }
      // a little seasonal garnish when the live weather is calm: autumn leaves in Oxford
      if (S.mode === 'live' && !n && (k === 'clear' || k === 'cloudy' || k === 'overcast')) {
        var mo = oxfordMonth();
        if (mo >= 9 && mo <= 11) t.leaves = 0.3;
      }
    }
    TGT = t;
  }

  // ------------------------------------------------------------------ particles
  var rain = [], flakes = [], leaves = [], splashes = [], ripples = [], clouds = [], puddles = [], stars = [], fogs = [];
  var flash = 0, strikeIn = 4, bolt = null, boltLife = 0, pendingThunder = [];

  function area() { return W * H; }
  function floorAt() { return H - accum * snowMax() * 0.8; }
  function snowMax() { return small ? 10 : 16; }

  // --- rain
  function rainTarget() { return Math.round(area() / (small ? 6500 : 6000) * TGT.rain); }
  function newDrop(d, initial) {
    d = d || {};
    d.front = Math.random() < 0.08;
    var base = TGT.drizzle ? rand(360, 480) : rand(680, 940);
    d.vy = base * (d.front ? 1.25 : 1);
    d.vx = V.wind * d.vy * 0.32;
    d.len = (TGT.drizzle ? 0.012 : 0.02) * d.vy * (d.front ? 1.5 : 1);
    d.y = initial ? -rand(0, H) - 20 : -d.len - rand(0, 80);
    var drift = d.vx / d.vy * H;
    d.x = rand(Math.min(0, -drift), W + Math.max(0, -drift));
    d.drizzle = TGT.drizzle;
    return d;
  }
  function updateRain(dt) {
    var target = rainTarget();
    var spawn = Math.min(target - rain.length, Math.ceil(target * dt * 1.6) + 1);
    for (var i = 0; i < spawn; i++) rain.push(newDrop(null, true));
    var fl = floorAt();
    for (var j = rain.length - 1; j >= 0; j--) {
      var d = rain[j];
      d.x += d.vx * dt; d.y += d.vy * dt;
      if (d.y > fl) {
        if (Math.random() < 0.35) hitFloor(d.x, d.front);
        if (rain.length > target) rain.splice(j, 1); else newDrop(d, false);
      }
    }
  }
  function hitFloor(x, isFront) {
    var fl = floorAt();
    var p = puddleAt(x);
    if (p && V.puddle > 0.25) {
      if (ripples.length < 40) ripples.push({ x: x, y: fl - 2, r: 1, life: 0 });
    } else if (splashes.length < 120) {
      for (var k = 0; k < 2; k++) {
        splashes.push({ x: x, y: fl - 1, vx: rand(-60, 60), vy: rand(-140, -60), life: 0, max: rand(0.25, 0.4),
          r: isFront ? 1.4 : 1, c: 'rgba(90,120,160,' });
      }
    }
  }

  // --- puddles
  function makePuddles() {
    puddles = [];
    var n = Math.max(2, Math.round(W / 320));
    for (var i = 0; i < n; i++) {
      puddles.push({ x: (i + 0.5) / n * W + rand(-60, 60), w: rand(60, small ? 90 : 130) });
    }
  }
  function puddleAt(x) {
    for (var i = 0; i < puddles.length; i++) if (Math.abs(x - puddles[i].x) < puddles[i].w / 2) return puddles[i];
    return null;
  }

  // --- snow
  var flakeSprites = null;
  function makeFlakeSprites() {
    flakeSprites = [];
    [1.6, 2.4, 3.3].forEach(function (r) {
      var s = Math.ceil(r * 4), c = document.createElement('canvas');
      c.width = c.height = s * 2;
      var g = c.getContext('2d');
      g.scale(2, 2);
      var h = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      h.addColorStop(0, 'rgba(110,130,165,.38)'); h.addColorStop(1, 'rgba(110,130,165,0)');
      g.fillStyle = h; g.fillRect(0, 0, s, s);
      g.fillStyle = '#fff';
      g.beginPath(); g.arc(s / 2, s / 2, r, 0, Math.PI * 2); g.fill();
      flakeSprites.push({ c: c, s: s });
    });
    // a six-armed crystal
    var s = 18, c = document.createElement('canvas');
    c.width = c.height = s * 2;
    var g = c.getContext('2d');
    g.scale(2, 2); g.translate(s / 2, s / 2);
    g.strokeStyle = '#fff'; g.lineWidth = 1.3; g.lineCap = 'round';
    g.shadowColor = 'rgba(90,110,150,.55)'; g.shadowBlur = 2.5;
    for (var a = 0; a < 6; a++) {
      g.save(); g.rotate(a * Math.PI / 3);
      g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -6.5);
      g.moveTo(0, -3.6); g.lineTo(-2, -5.2); g.moveTo(0, -3.6); g.lineTo(2, -5.2);
      g.stroke(); g.restore();
    }
    flakeSprites.push({ c: c, s: s });
    // soft out-of-focus foreground flake
    s = 22; c = document.createElement('canvas');
    c.width = c.height = s * 2;
    g = c.getContext('2d'); g.scale(2, 2);
    var r2 = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    r2.addColorStop(0, 'rgba(255,255,255,.95)'); r2.addColorStop(0.45, 'rgba(255,255,255,.75)');
    r2.addColorStop(0.7, 'rgba(150,170,200,.25)'); r2.addColorStop(1, 'rgba(150,170,200,0)');
    g.fillStyle = r2; g.fillRect(0, 0, s, s);
    flakeSprites.push({ c: c, s: s });
  }
  function snowTarget() { return Math.round(area() / (small ? 7000 : 7500) * TGT.snow); }
  function newFlake(f, initial) {
    f = f || {};
    f.front = Math.random() < 0.06;
    var r = Math.random();
    f.sp = f.front ? 4 : r < 0.14 ? 3 : r < 0.45 ? 0 : r < 0.8 ? 1 : 2;
    f.size = f.front ? rand(0.9, 1.3) : 1;
    f.vy = f.front ? rand(70, 100) : f.sp === 3 ? rand(28, 40) : rand(26, 30) + f.sp * 12 + rand(0, 14);
    f.amp = rand(10, 34); f.fq = rand(0.5, 1.4); f.ph = rand(0, 6.28);
    f.rot = rand(0, 6.28); f.vr = rand(-0.6, 0.6);
    f.x = rand(-20, W + 20);
    f.y = initial ? -rand(0, H) - 10 : -rand(10, 60);
    f.a = f.front ? rand(0.5, 0.75) : rand(0.8, 1);
    return f;
  }
  function updateSnow(dt) {
    var target = snowTarget();
    var spawn = Math.min(target - flakes.length, Math.ceil(target * dt * 0.7) + 1);
    for (var i = 0; i < spawn; i++) flakes.push(newFlake(null, true));
    var fl = floorAt();
    for (var j = flakes.length - 1; j >= 0; j--) {
      var f = flakes[j];
      f.y += f.vy * dt;
      f.x += (V.wind * 55 * (0.6 + f.sp * 0.15) + Math.cos(T * f.fq + f.ph) * f.amp * f.fq) * dt;
      f.rot += f.vr * dt;
      if (f.x < -30) f.x += W + 60; else if (f.x > W + 30) f.x -= W + 60;
      if (f.y > fl - 1) {
        if (flakes.length > target) flakes.splice(j, 1); else newFlake(f, false);
      }
    }
  }

  // --- leaves
  var LEAF_COLORS = ['#D9822B', '#C0532B', '#E3A33A', '#A8572B', '#C9762E', '#B8452A'];
  function leafTarget() { return Math.round((small ? 9 : 16) * TGT.leaves); }
  function newLeaf(initial) {
    return {
      x: rand(-20, W + 20), y: initial ? -rand(0, H * 0.8) : -rand(15, 40), vx: 0, vy: rand(35, 60),
      rot: rand(0, 6.28), vr: rand(-2, 2), flip: rand(0, 6.28), vf: rand(1.5, 4), ph: rand(0, 6.28),
      size: rand(8, 12.5), c: LEAF_COLORS[(Math.random() * LEAF_COLORS.length) | 0], state: 'fall', rest: 0,
      restMax: rand(18, 35), a: 1
    };
  }
  function updateLeaves(dt) {
    var falling = 0, resting = 0;
    leaves.forEach(function (l) { if (l.state === 'rest') resting++; else falling++; });
    var target = leafTarget();
    if (falling < target && Math.random() < dt * (1 + target * 0.25)) leaves.push(newLeaf(leaves.length === 0));
    var fl = floorAt();
    for (var i = leaves.length - 1; i >= 0; i--) {
      var l = leaves[i];
      if (l.state === 'fall') {
        l.vx = V.wind * 70 + Math.sin(T * 1.3 + l.ph) * 45;
        l.x += l.vx * dt; l.y += l.vy * dt;
        l.rot += l.vr * dt; l.flip += l.vf * dt;
      } else if (l.state === 'fly') {
        l.vy += 520 * dt; l.vx *= Math.pow(0.4, dt);
        l.x += l.vx * dt; l.y += l.vy * dt; l.rot += l.vr * dt; l.flip += l.vf * dt;
      } else {
        l.rest += dt;
        l.y = fl - 1.5;
        if (l.rest > l.restMax || (target === 0 && l.rest > 6)) l.a -= dt * 0.5;
      }
      if (l.state !== 'rest' && l.y >= fl - 1.5 && (l.state === 'fall' || l.vy > 0)) {
        l.state = 'rest'; l.y = fl - 1.5; l.rot = rand(-0.5, 0.5); l.flip = 0; l.rest = 0;
      }
      if (l.x < -40 || l.x > W + 40 || l.a <= 0) leaves.splice(i, 1);
    }
    if (resting > 40) { // keep the pile tidy
      for (var k = 0; k < leaves.length; k++) if (leaves[k].state === 'rest') { leaves[k].restMax = 0; break; }
    }
  }
  function drawLeaf(g, l) {
    g.save();
    g.globalAlpha = Math.max(0, l.a);
    g.translate(l.x, l.y);
    g.rotate(l.rot);
    var sx = Math.cos(l.flip); sx = (sx < 0 ? -1 : 1) * Math.max(0.2, Math.abs(sx));
    g.scale(sx, l.state === 'rest' ? 0.55 : 1);
    var s = l.size;
    g.fillStyle = l.c;
    g.beginPath();
    g.moveTo(-s, 0);
    g.quadraticCurveTo(-s * 0.2, -s * 0.62, s, 0);
    g.quadraticCurveTo(-s * 0.2, s * 0.62, -s, 0);
    g.fill();
    g.strokeStyle = 'rgba(90,40,10,.45)'; g.lineWidth = 0.8;
    g.beginPath(); g.moveTo(-s * 1.25, 0); g.lineTo(s * 0.85, 0); g.stroke();
    g.restore();
  }

  // --- clouds
  var cloudSprites = {};
  var CLOUD_TONE = {
    light: ['#ffffff', 'rgba(110,135,170,.16)'],
    snow: ['#f4f6fb', 'rgba(110,130,165,.22)'],
    grey: ['#c3cad5', 'rgba(60,75,100,.22)'],
    dark: ['#97a1b2', 'rgba(35,45,70,.28)'],
    night: ['#aab3c8', 'rgba(30,40,80,.25)']
  };
  function cloudSprite(tone, v) {
    var key = tone + v;
    if (cloudSprites[key]) return cloudSprites[key];
    var w = 300, h = 130, c = document.createElement('canvas');
    c.width = w * 2; c.height = h * 2;
    var g = c.getContext('2d');
    g.scale(2, 2);
    var seed = v * 9301 + 49297, rnd = function () { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    try { g.filter = 'blur(1.2px)'; } catch (e) { /* ignore */ }
    g.fillStyle = CLOUD_TONE[tone][0];
    var puffs = 5 + Math.floor(rnd() * 3);
    g.beginPath();
    g.moveTo(40, 100);
    for (var i = 0; i < puffs; i++) {
      var px = 50 + (i + 0.5) / puffs * 200, pr = 20 + rnd() * 26 + (i > 0 && i < puffs - 1 ? 10 : 0);
      g.moveTo(px + pr, 92 - pr * 0.55);
      g.arc(px, 92 - pr * 0.55, pr, 0, Math.PI * 2);
    }
    g.fill();
    g.beginPath();
    if (g.roundRect) g.roundRect(42, 70, 216, 36, 18); else g.rect(42, 70, 216, 36);
    g.fill();
    g.globalCompositeOperation = 'source-atop';
    var sh = g.createLinearGradient(0, 40, 0, 110);
    sh.addColorStop(0, 'rgba(0,0,0,0)'); sh.addColorStop(1, CLOUD_TONE[tone][1]);
    g.fillStyle = sh; g.fillRect(0, 0, w, h);
    cloudSprites[key] = c;
    return c;
  }
  function updateClouds(dt) {
    var want = small ? Math.ceil(TGT.clouds * 0.6) : TGT.clouds;
    var active = 0;
    clouds.forEach(function (c) {
      if (c.tone !== TGT.cloudTone) c.ta = 0;
      if (c.ta > 0) active++;
    });
    for (var i = clouds.length - 1; i >= 0 && active > want; i--) if (clouds[i].ta > 0) { clouds[i].ta = 0; active--; }
    while (active < want) {
      var sc = rand(0.45, 1) * (small ? 0.65 : 1);
      clouds.push({ x: rand(-120, W - 60), y: rand(-10, skyH() * 0.42), s: sc, v: (Math.random() * 4) | 0,
        tone: TGT.cloudTone, a: 0, ta: rand(0.65, 0.95), sp: rand(4, 10) });
      active++;
    }
    for (var j = clouds.length - 1; j >= 0; j--) {
      var c = clouds[j];
      c.a = approach(c.a, c.ta, dt * 0.35);
      c.x += (c.sp + V.wind * 14) * dt * (0.5 + c.s * 0.5);
      var cw = 300 * c.s;
      if (c.x > W + 20) c.x = -cw - 10; else if (c.x < -cw - 20) c.x = W + 10;
      if (c.ta === 0 && c.a <= 0.005) clouds.splice(j, 1);
    }
  }

  // --- stars and fog
  function makeStars() {
    stars = [];
    var n = Math.round(W / (small ? 18 : 22));
    for (var i = 0; i < n; i++) stars.push({ x: rand(0, W), y: Math.pow(Math.random(), 1.6) * skyH() * 0.55 + 6, r: rand(0.8, 2.1), f: rand(0.6, 2.2), p: rand(0, 6.28) });
  }
  var fogSprite = null;
  function makeFog() {
    if (!fogSprite) {
      fogSprite = document.createElement('canvas');
      fogSprite.width = 256; fogSprite.height = 128;
      var g = fogSprite.getContext('2d');
      g.translate(128, 64); g.scale(1, 0.5);
      var r = g.createRadialGradient(0, 0, 0, 0, 0, 128);
      r.addColorStop(0, 'rgba(176,186,198,.85)'); r.addColorStop(0.55, 'rgba(176,186,198,.45)'); r.addColorStop(1, 'rgba(176,186,198,0)');
      g.fillStyle = r; g.beginPath(); g.arc(0, 0, 128, 0, Math.PI * 2); g.fill();
    }
    fogs = [];
    for (var i = 0; i < 8; i++) {
      fogs.push({ x: rand(-W * 0.3, W), y: (i + 0.5) / 8 * H + rand(-40, 40), w: rand(0.7, 1.3) * W, h: rand(0.18, 0.32) * H,
        v: rand(6, 16) * (i % 2 ? -1 : 1), a: rand(0.5, 0.9) });
    }
  }

  // --- lightning
  function strike() {
    var x = rand(W * 0.1, W * 0.9), y = -10, pts = [[x, y]];
    var end = rand(H * 0.3, H * 0.6);
    while (y < end) { x += rand(-28, 28); y += rand(14, 34); pts.push([x, y]); }
    var branches = [];
    for (var b = 0; b < 2; b++) {
      var start = pts[2 + ((Math.random() * (pts.length - 3)) | 0)];
      if (!start) continue;
      var bx2 = start[0], by2 = start[1], br = [[bx2, by2]], dir = Math.random() < 0.5 ? -1 : 1;
      for (var k = 0; k < 4; k++) { bx2 += dir * rand(8, 26); by2 += rand(10, 24); br.push([bx2, by2]); }
      branches.push(br);
    }
    bolt = { main: pts, branches: branches };
    boltLife = 0.32; flash = 1;
    setTimeout(function () { flash = Math.max(flash, 0.7); boltLife = Math.max(boltLife, 0.12); }, 130);
    var delay = rand(350, 1400);
    setTimeout(function () {
      try { window.dispatchEvent(new CustomEvent('siteweather:thunder', { detail: { power: rand(0.6, 1) } })); } catch (e) { /* noop */ }
    }, delay);
  }
  function updateLightning(dt) {
    if (TGT.lightning) {
      strikeIn -= dt;
      if (strikeIn <= 0) { strike(); strikeIn = rand(7, 16); }
    } else strikeIn = rand(2, 5);
    flash = Math.max(0, flash - dt * 3.6);
    boltLife = Math.max(0, boltLife - dt);
  }

  // --- splashes & ripples
  function updateSmall(dt) {
    for (var i = splashes.length - 1; i >= 0; i--) {
      var s = splashes[i];
      s.life += dt; s.vy += 900 * dt; s.x += s.vx * dt; s.y += s.vy * dt;
      if (s.life > s.max) splashes.splice(i, 1);
    }
    for (var j = ripples.length - 1; j >= 0; j--) {
      var r = ripples[j];
      r.life += dt; r.r = 1 + r.life * 26;
      if (r.life > 0.55) ripples.splice(j, 1);
    }
  }

  // ------------------------------------------------------------------ snow caps on photos/thumbnails
  var caps = {
    list: [],
    init: function () {
      var targets = document.querySelectorAll('td > .one, img[alt="profile photo"]');
      Array.prototype.forEach.call(targets, function (t) {
        var d = document.createElement('div');
        d.className = 'wx-cap';
        d.setAttribute('aria-hidden', 'true');
        document.body.appendChild(d);
        caps.list.push({ t: t, d: d, w: 0 });
      });
      caps.layout();
    },
    layout: function () {
      var sx = window.scrollX || window.pageXOffset || 0, sy = window.scrollY || window.pageYOffset || 0;
      caps.list.forEach(function (c) {
        var r = c.t.getBoundingClientRect();
        if (r.width < 4) { c.d.style.display = 'none'; return; }
        var w = Math.round(r.width + 8), h = 14;
        c.d.style.left = (r.left + sx - 4) + 'px';
        c.d.style.top = (r.top + sy - h + 4) + 'px';
        c.d.style.width = w + 'px';
        c.d.style.height = h + 'px';
        if (c.w !== w) { c.w = w; c.d.innerHTML = capSVG(w, h); }
      });
      caps.apply(true);
    },
    last: -1,
    apply: function (force) {
      var a = Math.round(accum * 100) / 100;
      if (!force && a === caps.last) return;
      caps.last = a;
      caps.list.forEach(function (c) {
        c.d.style.display = a > 0.01 ? 'block' : 'none';
        c.d.style.transform = 'scaleY(' + a + ')';
      });
    }
  };
  function capSVG(w, h) {
    var pts = [], n = Math.max(4, Math.round(w / 12));
    for (var i = 0; i <= n; i++) {
      var x = i / n * w;
      var edge = Math.min(i, n - i) / n; // 0 at ends
      var y = h - (h - 3) * Math.min(1, edge * 5) * (0.72 + 0.28 * Math.sin(i * 1.7 + w));
      pts.push(x.toFixed(1) + ',' + y.toFixed(1));
    }
    return '<svg viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none"><path d="M0,' + h + ' L' + pts.join(' L') +
      ' L' + w + ',' + h + ' Q' + (w / 2) + ',' + (h + 3) + ' 0,' + h + 'Z" fill="#fff" stroke="rgba(130,150,185,.55)" stroke-width=".8"' +
      ' style="filter:drop-shadow(0 1px 1px rgba(60,80,120,.18))"/></svg>';
  }

  // ------------------------------------------------------------------ drawing
  function drawSky(g) {
    var a = V.sky[3];
    var off = skyOffset(), sh = skyH();
    if (off + sh < 0) return;
    if (a > 0.003) {
      var gr = g.createLinearGradient(0, off, 0, off + sh);
      var c = 'rgba(' + (V.sky[0] | 0) + ',' + (V.sky[1] | 0) + ',' + (V.sky[2] | 0) + ',';
      gr.addColorStop(0, c + a + ')');
      gr.addColorStop(0.28, c + (a * 0.55) + ')');
      gr.addColorStop(0.62, c + (a * 0.18) + ')');
      gr.addColorStop(1, c + '0)');
      g.fillStyle = gr;
      g.fillRect(0, Math.min(0, off), W, off + sh - Math.min(0, off));
    }
    // stars
    if (V.stars > 0.01) {
      g.fillStyle = '#fff';
      stars.forEach(function (s) {
        var tw = 0.45 + 0.55 * Math.sin(T * s.f + s.p);
        var fade = 1 - s.y / (sh * 0.6);
        var al = V.stars * tw * fade;
        if (al <= 0.02) return;
        var y = s.y + off, r = s.r;
        g.globalAlpha = al;
        g.beginPath();
        g.moveTo(s.x, y - r * 2.2); g.lineTo(s.x + r * 0.45, y - r * 0.45); g.lineTo(s.x + r * 2.2, y);
        g.lineTo(s.x + r * 0.45, y + r * 0.45); g.lineTo(s.x, y + r * 2.2); g.lineTo(s.x - r * 0.45, y + r * 0.45);
        g.lineTo(s.x - r * 2.2, y); g.lineTo(s.x - r * 0.45, y - r * 0.45);
        g.closePath(); g.fill();
      });
      g.globalAlpha = 1;
    }
    var cx = W - Math.min(150, W * 0.16), cy = 84 + off;
    if (small) { cx = W - 46; cy = 92 + off; }
    // sun
    if (V.sun > 0.01) {
      var R = small ? 18 : 24;
      g.save();
      g.globalAlpha = V.sun;
      var glow = g.createRadialGradient(cx, cy, R * 0.6, cx, cy, R * 5);
      glow.addColorStop(0, 'rgba(255,205,100,.45)'); glow.addColorStop(1, 'rgba(255,205,100,0)');
      g.fillStyle = glow; g.fillRect(cx - R * 5, cy - R * 5, R * 10, R * 10);
      g.translate(cx, cy); g.rotate(T * 0.05);
      g.fillStyle = 'rgba(255,190,70,.28)';
      for (var i = 0; i < 12; i++) {
        g.rotate(Math.PI / 6);
        g.beginPath(); g.moveTo(-3, R * 1.35); g.lineTo(3, R * 1.35); g.lineTo(0, R * (2.1 + 0.25 * Math.sin(T * 1.2 + i))); g.closePath(); g.fill();
      }
      var disk = g.createRadialGradient(-R * 0.3, -R * 0.3, 0, 0, 0, R);
      disk.addColorStop(0, '#FFE28A'); disk.addColorStop(1, '#FFB938');
      g.fillStyle = disk; g.beginPath(); g.arc(0, 0, R, 0, Math.PI * 2); g.fill();
      g.restore();
    }
    // moon
    if (V.moon > 0.01) {
      var MR = small ? 15 : 20;
      g.save();
      g.globalAlpha = V.moon;
      var mg = g.createRadialGradient(cx, cy, MR * 0.5, cx, cy, MR * 4.5);
      mg.addColorStop(0, 'rgba(235,240,255,.55)'); mg.addColorStop(1, 'rgba(235,240,255,0)');
      g.fillStyle = mg; g.fillRect(cx - MR * 5, cy - MR * 5, MR * 10, MR * 10);
      g.fillStyle = '#FFF6D8';
      g.beginPath();
      g.arc(cx, cy, MR, 0, Math.PI * 2);
      g.arc(cx + MR * 0.45, cy - MR * 0.3, MR * 0.86, 0, Math.PI * 2, true);
      g.fill('evenodd');
      g.restore();
    }
    // clouds
    clouds.forEach(function (c) {
      if (c.a <= 0.005) return;
      var spr = cloudSprite(c.tone, c.v);
      g.globalAlpha = c.a;
      g.drawImage(spr, c.x, c.y + off, 300 * c.s, 130 * c.s);
    });
    g.globalAlpha = 1;
  }

  function drawFog(g, k) {
    if (V.fog <= 0.005) return;
    fogs.forEach(function (f) {
      g.globalAlpha = V.fog * f.a * k;
      g.drawImage(fogSprite, f.x, f.y - f.h / 2, f.w, f.h);
    });
    g.globalAlpha = 1;
  }

  function drawRain(g, frontLayer) {
    if (!rain.length) return;
    g.lineCap = 'round';
    for (var pass = 0; pass < 2; pass++) {
      var driz = pass === 1;
      g.beginPath();
      var any = false;
      for (var i = 0; i < rain.length; i++) {
        var d = rain[i];
        if (d.front !== frontLayer || d.drizzle !== driz) continue;
        var k = d.len / d.vy;
        g.moveTo(d.x, d.y); g.lineTo(d.x - d.vx * k, d.y - d.len);
        any = true;
      }
      if (!any) continue;
      g.strokeStyle = frontLayer ? 'rgba(80,108,148,.30)' : driz ? 'rgba(80,108,148,.34)' : 'rgba(80,108,148,.42)';
      g.lineWidth = frontLayer ? 1.7 : 1;
      g.stroke();
    }
  }

  function drawSnow(g, frontLayer) {
    if (!flakes.length) return;
    for (var i = 0; i < flakes.length; i++) {
      var f = flakes[i];
      if (f.front !== frontLayer) continue;
      var sp = flakeSprites[f.sp], s = sp.s * f.size;
      g.globalAlpha = f.a;
      if (f.sp === 3) {
        g.save(); g.translate(f.x, f.y); g.rotate(f.rot); g.drawImage(sp.c, -s / 2, -s / 2, s, s); g.restore();
      } else g.drawImage(sp.c, f.x - s / 2, f.y - s / 2, s, s);
    }
    g.globalAlpha = 1;
  }

  function drawFloor(g) {
    var fl = floorAt();
    // puddles
    if (V.puddle > 0.01) {
      puddles.forEach(function (p) {
        g.fillStyle = 'rgba(95,125,165,' + (0.2 * V.puddle) + ')';
        g.beginPath(); g.ellipse(p.x, fl - 1, p.w / 2, 3.5, 0, 0, Math.PI * 2); g.fill();
        g.strokeStyle = 'rgba(255,255,255,' + (0.6 * V.puddle) + ')';
        g.lineWidth = 1;
        g.beginPath(); g.moveTo(p.x - p.w * 0.25, fl - 2.5); g.lineTo(p.x - p.w * 0.05, fl - 2.5); g.stroke();
      });
    }
    ripples.forEach(function (r) {
      g.strokeStyle = 'rgba(80,110,150,' + (0.5 * (1 - r.life / 0.55)) + ')';
      g.lineWidth = 0.9;
      g.beginPath(); g.ellipse(r.x, r.y, r.r, r.r * 0.3, 0, 0, Math.PI * 2); g.stroke();
    });
    splashes.forEach(function (s) {
      g.fillStyle = s.c + (0.55 * (1 - s.life / s.max)) + ')';
      g.beginPath(); g.arc(s.x, s.y, s.r, 0, Math.PI * 2); g.fill();
    });
    // snow bank
    if (accum > 0.01) {
      var d = accum * snowMax();
      g.beginPath(); g.moveTo(0, H);
      for (var x = 0; x <= W + 16; x += 16) {
        g.lineTo(x, H - d * (0.78 + 0.22 * Math.sin(x * 0.013 + 1.3) * Math.cos(x * 0.031)));
      }
      g.lineTo(W, H); g.closePath();
      g.fillStyle = '#fff'; g.fill();
      g.strokeStyle = 'rgba(130,150,185,.55)'; g.lineWidth = 1; g.stroke();
    }
    leaves.forEach(function (l) { drawLeaf(g, l); });
  }

  function drawBolt(g) {
    if (!bolt || boltLife <= 0) return;
    var a = Math.min(1, boltLife * 5);
    function line(pts, w1, w2) {
      g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
      for (var i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
      g.strokeStyle = 'rgba(140,120,255,' + (0.35 * a) + ')'; g.lineWidth = w1; g.stroke();
      g.strokeStyle = 'rgba(255,255,240,' + a + ')'; g.lineWidth = w2; g.stroke();
    }
    g.lineJoin = 'round'; g.lineCap = 'round';
    line(bolt.main, 7, 2.2);
    bolt.branches.forEach(function (b) { line(b, 4, 1.2); });
  }

  function draw() {
    bx.clearRect(0, 0, W, H);
    fx.clearRect(0, 0, W, H);
    if (V.dim > 0.002) { bx.fillStyle = 'rgba(20,30,70,' + V.dim + ')'; bx.fillRect(0, 0, W, H); }
    drawSky(bx);
    if (flash > 0.01) {
      var fg = bx.createLinearGradient(0, 0, 0, H * 0.65);
      fg.addColorStop(0, 'rgba(255,255,245,' + (flash * 0.55) + ')');
      fg.addColorStop(1, 'rgba(255,255,245,0)');
      bx.fillStyle = fg;
      bx.fillRect(0, 0, W, H * 0.65);
    }
    drawBolt(bx);
    drawFog(bx, 1);
    drawRain(bx, false);
    drawSnow(bx, false);
    drawFloor(bx);
    drawRain(fx, true);
    drawSnow(fx, true);
    drawFog(fx, 0.16);
    if (flash > 0.01) { fx.fillStyle = 'rgba(255,255,255,' + (flash * 0.22) + ')'; fx.fillRect(0, 0, W, H); }
  }

  // ------------------------------------------------------------------ loop
  var raf = 0, lastTs = 0;
  function update(dt) {
    T += dt;
    var k = 1 - Math.exp(-dt * 1.1);
    for (var i = 0; i < 4; i++) V.sky[i] += (TGT.sky[i] - V.sky[i]) * k;
    if (TGT.sky[3] === 0) { for (var j = 0; j < 3; j++) V.sky[j] = V.sky[3] < 0.01 ? TGT.sky[j] : V.sky[j]; }
    V.sun = approach(V.sun, TGT.sun, dt * 0.6);
    V.moon = approach(V.moon, TGT.moon, dt * 0.6);
    V.stars = approach(V.stars, TGT.stars, dt * 0.5);
    V.fog = approach(V.fog, TGT.fog, dt * 0.35);
    V.dim = approach(V.dim, TGT.dim, dt * 0.05);
    V.wind = approach(V.wind, TGT.wind, dt * 0.3);
    V.puddle = approach(V.puddle, TGT.puddle, dt * (TGT.puddle > V.puddle ? 0.06 : 0.03));
    if (TGT.snow > 0) accum = Math.min(1, accum + dt * 0.02 * TGT.snow);
    else accum = Math.max(0, accum - dt * 0.012);
    fogs.forEach(function (f) { f.x += f.v * dt; if (f.x > W + 40) f.x = -f.w; else if (f.x < -f.w - 40) f.x = W; });
    updateRain(dt); updateSnow(dt); updateLeaves(dt); updateClouds(dt); updateSmall(dt); updateLightning(dt);
    caps.apply(false);
  }
  function alive() {
    return TGT.rain || TGT.snow || TGT.leaves || TGT.clouds || TGT.fog || TGT.sun || TGT.moon || TGT.sky[3] ||
      rain.length || flakes.length || leaves.length || clouds.length || splashes.length || ripples.length ||
      V.sky[3] > 0.003 || V.sun > 0.01 || V.moon > 0.01 || V.stars > 0.01 || V.fog > 0.005 || V.puddle > 0.01 ||
      V.dim > 0.002 || accum > 0 || flash > 0 || boltLife > 0;
  }
  function frame(ts) {
    raf = 0;
    var dt = lastTs ? Math.min(0.05, (ts - lastTs) / 1000) : 0.016;
    lastTs = ts;
    update(dt);
    draw();
    if (alive()) schedule();
    else { bx.clearRect(0, 0, W, H); fx.clearRect(0, 0, W, H); caps.apply(true); }
  }
  function schedule() { if (!raf && !document.hidden && back) raf = requestAnimationFrame(frame); }
  function wake() { if (!raf) lastTs = 0; schedule(); }

  // ------------------------------------------------------------------ public API (used by pup.js)
  function disturb(x, dir, power) {
    power = power || 1;
    leaves.forEach(function (l) {
      if (l.state === 'rest' && Math.abs(l.x - x) < 34 * power) {
        l.state = 'fly'; l.vy = -rand(140, 280) * power; l.vx = (dir || (Math.random() < 0.5 ? -1 : 1)) * rand(40, 150) * power;
        l.vr = rand(-8, 8); l.vf = rand(4, 9); l.rest = 0; l.a = 1;
      }
    });
    if (V.puddle > 0.3 && puddleAt(x)) hitFloor(x, true);
    wake();
  }
  function addMenuSection(node) { if (ui.extra) ui.extra.appendChild(node); }

  var api = {
    get state() {
      return { mode: S.mode, kind: S.kind, night: S.night, intensity: S.intensity, wind: S.wind, label: S.label,
        temp: S.live ? S.live.temp : null, place: PLACE.name };
    },
    floorY: floorAt,
    snowDepth: function () { return accum * snowMax(); },
    restingLeaves: function () { return leaves.filter(function (l) { return l.state === 'rest' && l.a > 0.5; }).map(function (l) { return l.x; }); },
    puddleAt: function (x) { return V.puddle > 0.3 && !!puddleAt(x); },
    disturb: disturb,
    setMode: setMode,
    addMenuSection: addMenuSection,
    openMenu: function () { toggleMenu(true); }
  };
  window.SiteWeather = api;

  // ------------------------------------------------------------------ boot
  function init() {
    var style = document.createElement('style');
    style.id = 'wx-style';
    style.textContent = css;
    document.head.appendChild(style);

    back = el('canvas', { id: 'wx-back', 'aria-hidden': 'true' });
    front = el('canvas', { id: 'wx-front', 'aria-hidden': 'true' });
    document.body.insertBefore(back, document.body.firstChild);
    document.body.appendChild(front);
    bx = back.getContext('2d'); fx = front.getContext('2d');
    makeFlakeSprites();
    caps.init();
    buildUI();
    resize();
    setTargets();
    updateUI();

    window.addEventListener('resize', resize);
    window.addEventListener('load', function () { caps.layout(); });
    window.addEventListener('scroll', function () { if (V.sky[3] > 0.003 || clouds.length) wake(); }, { passive: true });
    document.addEventListener('visibilitychange', function () { if (!document.hidden) { lastTs = 0; schedule(); } });
    if (window.ResizeObserver) new ResizeObserver(function () { caps.layout(); }).observe(document.body);

    resolve();
    fetchLive();
    setInterval(function () {
      if (!document.hidden) { store.set('kc-wx-live', null); fetchLive(); }
    }, REFRESH_MS);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
