/*
 * pup.js — Biscuit, a cartoon golden retriever puppy who lives at the bottom of the page.
 *
 * He wanders, sits, sniffs, naps, chases his tail, plays with a football, follows the
 * cursor and reacts to the weather from weather.js (raincoat in the rain, scarf and paw
 * prints in the snow, sunglasses on sunny days, startled by thunder, sleepy at night).
 *
 *   click            -> he barks (a short synthesized "woof"; can be muted in the weather menu)
 *   stroke him       -> move the mouse back and forth over him (long-press on phones) to pet him
 *   drag him         -> pick him up and drop him
 *   drag the ball    -> fling it and he fetches it back to you
 *
 * To remove him, delete the <script src="js/pup.js"> line in index.html.
 */
(function () {
  'use strict';
  if (window.SitePup) return;

  var NAME = 'Biscuit';

  var store = {
    get: function (k, d) {
      try { var v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; }
    },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* private mode */ } }
  };
  var reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  function WX() { return window.SiteWeather || null; }
  function wx() { var w = WX(); return w ? w.state : { kind: 'off', night: false, temp: null }; }

  function rand(a, b) { return a + Math.random() * (b - a); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function pick(arr) { return arr[(Math.random() * arr.length) | 0]; }
  function now() { return performance.now() / 1000; }

  // ------------------------------------------------------------------ look
  var C = { gold: '#E9A94F', goldD: '#D08B3B', ear: '#C67D31', cream: '#F8DDA6', line: '#8E5420', nose: '#3A2A22' };

  var LEG = function (id, fill) {
    return '<g id="' + id + '"><rect x="-5" y="-8" width="10" height="32" rx="5" fill="' + fill + '" stroke="' + C.line + '" stroke-width="1.2"/>' +
      '<ellipse cx="1.5" cy="24" rx="6.3" ry="3.9" fill="' + fill + '" stroke="' + C.line + '" stroke-width="1.2"/></g>';
  };

  var SVG = '' +
    '<svg viewBox="0 0 120 100" overflow="visible" aria-hidden="true" focusable="false">' +
    '<g id="p-root"><g id="p-face">' +
    // tail
    '<g id="p-tail"><path d="M2,3 C-7,2 -17,-6 -20,-18 C-21,-24 -15,-26 -13.5,-21 C-11,-12 -4,-7 4,-3 Z" fill="' + C.gold + '" stroke="' + C.line + '" stroke-width="1.3" stroke-linejoin="round"/>' +
    '<path d="M-3,-0.5 C-10,-3 -14.5,-9 -16.5,-17" fill="none" stroke="' + C.cream + '" stroke-width="2.2" stroke-linecap="round" opacity=".85"/></g>' +
    // far legs
    LEG('p-l0', C.goldD) + LEG('p-l1', C.goldD) +
    // body + head
    '<g id="p-upper">' +
    '<ellipse cx="56" cy="60" rx="27" ry="16.5" fill="' + C.gold + '" stroke="' + C.line + '" stroke-width="1.4"/>' +
    '<path d="M37,67 q4,7 9,3 q5,7 10,3 q5,7 10,2 q4,5 8,0 Q60,73 37,67 Z" fill="' + C.cream + '"/>' +
    '<g id="p-coat" opacity="0"><path d="M32,58 C34,44 62,37 80,45 L82,58 C70,56 50,60 34,68 Z" fill="#F6C344" stroke="#B98A12" stroke-width="1.3" stroke-linejoin="round"/>' +
    '<path d="M35,63.5 C50,57 67,54 81,55.5" fill="none" stroke="#fff" stroke-width="1.6" opacity=".75"/>' +
    '<circle cx="66" cy="47" r="1.3" fill="#B98A12"/><circle cx="72" cy="48.3" r="1.3" fill="#B98A12"/></g>' +
    '<path d="M72,49 C80,50 84,57 83,64 C81,70 76,73 72,71 C74,68 70,66 72,63 C69,61 71,57 70,54 Z" fill="' + C.cream + '"/>' +
    '<g id="p-head">' +
    '<path d="M76,23 C70,26 67,36 70,45 C74,41 77,32 76,23 Z" fill="#B87430"/>' +
    '<circle cx="88" cy="38" r="19" fill="' + C.gold + '" stroke="' + C.line + '" stroke-width="1.4"/>' +
    '<path d="M82.5,20.5 C83.5,14.5 88,14.5 89,19.3 C90,15.2 94.5,15.8 94.5,20.6" fill="' + C.gold + '" stroke="' + C.line + '" stroke-width="1.2" stroke-linejoin="round"/>' +
    '<path id="p-mouthin" d="M99,48.5 L114,46.5 L109,58 Z" fill="#7A2E2E" opacity="0"/>' +
    '<g id="p-jaw"><path d="M98,49 C102,53 108,54 113,51 C112,56 106,59 101,56 C99,54.5 98,52 98,49 Z" fill="' + C.cream + '" stroke="' + C.line + '" stroke-width="1.2"/>' +
    '<ellipse id="p-tongue" cx="105.5" cy="56.5" rx="3.8" ry="5.4" fill="#E86A7A" stroke="#B24455" stroke-width="1" opacity="0"/></g>' +
    '<ellipse cx="103" cy="45.5" rx="12" ry="8.5" fill="' + C.cream + '" stroke="' + C.line + '" stroke-width="1.3"/>' +
    '<ellipse cx="114.2" cy="42.2" rx="4.3" ry="3.4" fill="' + C.nose + '"/>' +
    '<ellipse cx="113" cy="41" rx="1.4" ry=".9" fill="#fff" opacity=".7"/>' +
    '<path d="M114,45.6 Q111.5,50 106,49" stroke="' + C.nose + '" stroke-width="1.3" fill="none" stroke-linecap="round"/>' +
    '<ellipse cx="97" cy="44.5" rx="3.6" ry="2.1" fill="#F28B82" opacity=".45"/>' +
    '<g id="p-eye-open"><ellipse cx="95.5" cy="33.5" rx="3" ry="3.6" fill="' + C.nose + '"/><circle cx="96.6" cy="32.2" r="1.15" fill="#fff"/></g>' +
    '<path id="p-eye-shut" d="M92,34 Q95.5,36.6 99,34" stroke="' + C.nose + '" stroke-width="1.7" fill="none" stroke-linecap="round" opacity="0"/>' +
    '<path id="p-eye-happy" d="M92,35 Q95.5,30.8 99,35" stroke="' + C.nose + '" stroke-width="1.7" fill="none" stroke-linecap="round" opacity="0"/>' +
    '<path id="p-brow" d="M91.5,27.6 Q95.5,25.6 99.5,27.6" stroke="' + C.line + '" stroke-width="1.3" fill="none" stroke-linecap="round" opacity=".55"/>' +
    '<g id="p-shades" opacity="0"><path d="M90.3,29.6 h11 c.4,4.2 -1.6,7.2 -5.2,7.2 c-3.6,0 -5.8,-3 -5.8,-7.2 z" fill="#1d1d1f"/>' +
    '<path d="M90.5,30.3 L79.5,28.6" stroke="#1d1d1f" stroke-width="1.5"/><path d="M93.2,31.6 l3.2,0" stroke="#fff" stroke-width="1" opacity=".55"/></g>' +
    '<g id="p-ear"><path d="M0,0 C7,1 10,12 7,24 C5,31 -4,32 -7,25 C-10,17 -7,4 0,0 Z" fill="' + C.ear + '" stroke="' + C.line + '" stroke-width="1.3"/></g>' +
    '</g>' +
    '<path d="M76.5,44 Q80.5,52 79.5,61" stroke="#1B3A6B" stroke-width="4.6" fill="none" stroke-linecap="round"/>' +
    '<circle cx="80" cy="63.2" r="2.7" fill="#E2B33C" stroke="#9A7420" stroke-width="1"/>' +
    '<g id="p-scarf" opacity="0">' +
    '<g id="p-scarf-tail"><path d="M78,53 C72,57 65,59 59,58 L58.5,64.5 C65,65.5 72,63 79,59 Z" fill="#D0383E"/>' +
    '<path d="M59,58 L58.5,64.5" stroke="#fff" stroke-width="2" stroke-dasharray="1.4 1.4"/></g>' +
    '<path d="M75.5,43.5 Q80.5,52 79,61" stroke="#D0383E" stroke-width="7" fill="none" stroke-linecap="round"/>' +
    '<path d="M75.5,43.5 Q80.5,52 79,61" stroke="#fff" stroke-width="7" fill="none" stroke-dasharray="2 4.5" opacity=".9"/></g>' +
    '</g>' +
    // haunch for sitting / lying
    '<g id="p-haunch" opacity="0"><ellipse cx="42" cy="83" rx="13.5" ry="11" transform="rotate(-15 42 83)" fill="' + C.gold + '" stroke="' + C.line + '" stroke-width="1.4"/>' +
    '<ellipse cx="55" cy="92.2" rx="7" ry="3.8" fill="' + C.gold + '" stroke="' + C.line + '" stroke-width="1.2"/></g>' +
    // near legs
    LEG('p-l2', C.gold) + LEG('p-l3', C.gold) +
    '<g id="p-liepaws" opacity="0"><ellipse cx="93" cy="92.4" rx="8" ry="3.8" fill="' + C.goldD + '" stroke="' + C.line + '" stroke-width="1.2"/>' +
    '<ellipse cx="102" cy="92.8" rx="8" ry="3.8" fill="' + C.gold + '" stroke="' + C.line + '" stroke-width="1.2"/></g>' +
    '</g></g></svg>';

  var BALL_SVG = '<svg viewBox="-12 -12 24 24" aria-hidden="true" focusable="false"><defs><clipPath id="pb-clip"><circle r="10.4"/></clipPath></defs>' +
    '<g id="pb-rot"><circle r="10.6" fill="#fff" stroke="#2b2b2b" stroke-width="1.3"/>' +
    '<g clip-path="url(#pb-clip)" fill="#2b2b2b" stroke="#2b2b2b" stroke-width=".9" stroke-linecap="round">' +
    (function () {
      var s = '', i, a, pts = [];
      for (i = 0; i < 5; i++) { a = (-90 + i * 72) * Math.PI / 180; pts.push([Math.cos(a) * 4.1, Math.sin(a) * 4.1]); }
      s += '<path d="M' + pts.map(function (p) { return p[0].toFixed(2) + ',' + p[1].toFixed(2); }).join(' L') + 'Z"/>';
      for (i = 0; i < 5; i++) {
        a = (-90 + i * 72) * Math.PI / 180;
        s += '<line x1="' + (Math.cos(a) * 4.1).toFixed(2) + '" y1="' + (Math.sin(a) * 4.1).toFixed(2) +
          '" x2="' + (Math.cos(a) * 7.4).toFixed(2) + '" y2="' + (Math.sin(a) * 7.4).toFixed(2) + '" fill="none"/>';
        var b = (-90 + 36 + i * 72) * Math.PI / 180;
        s += '<circle cx="' + (Math.cos(b) * 11).toFixed(2) + '" cy="' + (Math.sin(b) * 11).toFixed(2) + '" r="3.6"/>';
      }
      return s;
    })() +
    '</g><ellipse cx="-3.5" cy="-5" rx="3" ry="1.6" fill="#fff" opacity=".55" transform="rotate(-30 -3.5 -5)"/></g></svg>';

  var css = [
    '#pup{position:fixed;left:0;top:0;z-index:45;touch-action:none;cursor:grab;-webkit-tap-highlight-color:transparent;',
    'user-select:none;-webkit-user-select:none;will-change:transform;outline:none;border-radius:14px}',
    '#pup svg{display:block;width:100%;height:100%;overflow:visible}',
    '#pup.held{cursor:grabbing}',
    '#pup:focus-visible{box-shadow:0 0 0 2px var(--link,#064E8A)}',
    '#pup-ball{position:fixed;left:0;top:0;z-index:45;touch-action:none;cursor:grab;-webkit-tap-highlight-color:transparent;',
    'user-select:none;-webkit-user-select:none;will-change:transform;border-radius:50%;outline:none;filter:drop-shadow(0 1px 1px rgba(0,0,0,.18))}',
    '#pup-ball svg{display:block;width:100%;height:100%}',
    '#pup-ball:focus-visible{box-shadow:0 0 0 2px var(--link,#064E8A)}',
    '#pup-ball.held{cursor:grabbing}',
    '#pup-fx{position:fixed;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:44}',
    '#pup-bubble{position:fixed;left:0;top:0;z-index:46;pointer-events:none;padding:4px 10px 5px;border-radius:13px;background:#fff;',
    'border:1.5px solid #3A2A22;color:#3A2A22;font:700 13px/1.15 var(--font,system-ui,sans-serif);white-space:nowrap;',
    'opacity:0;transition:opacity .15s;box-shadow:0 2px 6px rgba(0,0,0,.08)}',
    '#pup-bubble.on{opacity:1}',
    '#pup-bubble::after{content:"";position:absolute;bottom:-6px;left:12px;width:9px;height:9px;background:#fff;',
    'border-right:1.5px solid #3A2A22;border-bottom:1.5px solid #3A2A22;transform:rotate(45deg) skew(8deg,8deg)}',
    '#pup-bubble.flip::after{left:auto;right:12px}',
    '@media print{#pup,#pup-ball,#pup-bubble,#pup-fx{display:none!important}}',
    '.pup-off #pup,.pup-off #pup-ball,.pup-off #pup-bubble,.pup-off #pup-fx{display:none!important}'
  ].join('');

  // ------------------------------------------------------------------ DOM
  var wrap, E = {}, bubble, ballEl, ballRot, fxc, fx;
  var W = 0, H = 0, DPR = 1, S = 0.88;
  var hidden = !!store.get('kc-pup-hidden', false);
  var soundOn = store.get('kc-pup-sound', true) !== false;

  function build() {
    var st = document.createElement('style');
    st.id = 'pup-style';
    st.textContent = css;
    document.head.appendChild(st);

    fxc = document.createElement('canvas');
    fxc.id = 'pup-fx';
    fxc.setAttribute('aria-hidden', 'true');
    document.body.appendChild(fxc);
    fx = fxc.getContext('2d');

    wrap = document.createElement('div');
    wrap.id = 'pup';
    wrap.setAttribute('role', 'button');
    wrap.setAttribute('tabindex', '0');
    wrap.setAttribute('aria-label', NAME + ', a cartoon golden retriever puppy. Press to say hi.');
    wrap.title = NAME;
    wrap.innerHTML = SVG;
    document.body.appendChild(wrap);
    ['p-root', 'p-face', 'p-tail', 'p-l0', 'p-l1', 'p-l2', 'p-l3', 'p-upper', 'p-coat', 'p-head', 'p-mouthin', 'p-jaw',
      'p-tongue', 'p-eye-open', 'p-eye-shut', 'p-eye-happy', 'p-brow', 'p-shades', 'p-ear', 'p-scarf', 'p-scarf-tail',
      'p-haunch', 'p-liepaws'].forEach(function (id) { E[id.slice(2)] = wrap.querySelector('#' + id); });
    E.legs = [E.l0, E.l1, E.l2, E.l3].map(function (g) {
      return { g: g, rect: g.querySelector('rect'), paw: g.querySelector('ellipse') };
    });

    bubble = document.createElement('div');
    bubble.id = 'pup-bubble';
    bubble.setAttribute('aria-hidden', 'true');
    document.body.appendChild(bubble);

    ballEl = document.createElement('div');
    ballEl.id = 'pup-ball';
    ballEl.setAttribute('role', 'button');
    ballEl.setAttribute('tabindex', '0');
    ballEl.setAttribute('aria-label', 'Football. Drag and let go to throw it for ' + NAME + ', or press to kick it.');
    ballEl.title = 'Throw the ball for ' + NAME;
    ballEl.innerHTML = BALL_SVG;
    document.body.appendChild(ballEl);
    ballRot = ballEl.querySelector('#pb-rot');
  }

  // ------------------------------------------------------------------ state
  var dog = { x: -80, y: 0, vx: 0, vy: 0, face: 1, act: null, last: '', hasBall: false, idleSince: now(), dist: 0, printSide: 1 };
  var P = { sit: 0, lie: 0, bow: 0, head: 0, jaw: 0, eye: 0, happy: 0, ear: 0, tail: -28, wagAmp: 9, wagHz: 1.6, tongue: 0,
    rot: 0, sq: 0, face: 1, coat: 0, scarf: 0, shades: 0, brow: 0 };
  var gait = { ph: 0, amp: 0, run: 0 };
  var wagPh = 0, blinkAt = now() + 3, blinkUntil = 0, T = 0;
  var U = { tx: 0, ty: 0, sit: 0, bow: 0, pitch: 0, head: 0, headY: 0 };
  var ptr = { x: -1, y: -1, t: 0, type: 'mouse' };
  var ball = { x: 0, y: 0, vx: 0, vy: 0, r: 11, rot: 0, held: null };
  var wear = { coat: 0, scarf: 0 };
  var parts = [], prints = [];
  var pettingUntil = 0;

  function floorY() { var w = WX(); return (w ? w.floorY() : H) - 2; }
  function ballFloor() { return floorY() - ball.r + 1; }
  function onFloorBall() { return ball.y >= ballFloor() - 1.5; }

  // ------------------------------------------------------------------ geometry helpers
  function rotPt(p, deg, cx, cy) {
    var r = deg * Math.PI / 180, c = Math.cos(r), s = Math.sin(r), dx = p[0] - cx, dy = p[1] - cy;
    return [cx + dx * c - dy * s, cy + dx * s + dy * c];
  }
  function upperPt(px, py) {
    var p = [px, py];
    p = rotPt(p, U.pitch, 56, 66);
    p = rotPt(p, U.bow, 30, 70);
    p = rotPt(p, U.sit, 36, 80);
    return [p[0] + U.tx, p[1] + U.ty];
  }
  function headPt(px, py) {
    var p = rotPt([px, py], U.head, 82, 48);
    return upperPt(p[0], p[1] + U.headY);
  }
  function toScreen(p) {
    var lx = 60 + (p[0] - 60) * P.face;
    var left = dog.x - 60 * S, top = floorY() - 96 * S - dog.y;
    return [left + lx * S, top + p[1] * S];
  }
  function mouthScreen() { return toScreen(headPt(112, 52)); }
  function headTopScreen() { return toScreen(headPt(92, 16)); }
  function noseX() { return dog.x + 52 * S * dog.face; }

  // ------------------------------------------------------------------ bubble + particles
  var bubbleUntil = 0;
  function say(txt, ms) {
    bubble.textContent = txt;
    bubble.classList.add('on');
    bubbleUntil = now() + (ms || 1200) / 1000;
  }
  function placeBubble() {
    if (!bubble.classList.contains('on')) return;
    if (now() > bubbleUntil) { bubble.classList.remove('on'); return; }
    var h = headTopScreen();
    var bw = bubble.offsetWidth, bh = bubble.offsetHeight;
    var flip = dog.face < 0;
    var left = flip ? h[0] - bw + 8 : h[0] - 8;
    left = clamp(left, 6, W - bw - 6);
    bubble.classList.toggle('flip', flip);
    bubble.style.transform = 'translate(' + Math.round(left) + 'px,' + Math.round(h[1] - bh - 10) + 'px)';
  }

  function emit(k, x, y, o) {
    if (parts.length > 160) return;
    var p = { k: k, x: x, y: y, vx: 0, vy: 0, life: 0, max: 1, size: 1, rot: 0 };
    for (var key in o) p[key] = o[key];
    parts.push(p);
  }
  function heart(g, x, y, s) {
    g.beginPath();
    g.moveTo(x, y + s * 0.3);
    g.bezierCurveTo(x, y, x - s * 0.5, y, x - s * 0.5, y + s * 0.3);
    g.bezierCurveTo(x - s * 0.5, y + s * 0.6, x, y + s * 0.8, x, y + s);
    g.bezierCurveTo(x, y + s * 0.8, x + s * 0.5, y + s * 0.6, x + s * 0.5, y + s * 0.3);
    g.bezierCurveTo(x + s * 0.5, y, x, y, x, y + s * 0.3);
    g.fill();
  }
  function star(g, x, y, r) {
    g.beginPath();
    for (var i = 0; i < 10; i++) {
      var a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r;
      g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    g.closePath(); g.fill();
  }
  function updateParts(dt) {
    for (var i = parts.length - 1; i >= 0; i--) {
      var p = parts[i];
      p.life += dt;
      if (p.life > p.max) { parts.splice(i, 1); continue; }
      if (p.k === 'orbit') { p.ang += dt * 5; p.x = p.cx() + Math.cos(p.ang) * 16 * S; p.y = p.cy() + Math.sin(p.ang) * 5 * S; continue; }
      if (p.g) p.vy += p.g * dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.rot += (p.vr || 0) * dt;
    }
    for (var j = prints.length - 1; j >= 0; j--) { prints[j].life += dt; if (prints[j].life > 28) prints.splice(j, 1); }
  }
  function drawParts() {
    fx.clearRect(0, 0, W, H);
    var depth = WX() ? WX().snowDepth() : 0;
    if (prints.length) {
      var fl = floorY() + 2;
      prints.forEach(function (p) {
        var a = 0.42 * Math.min(1, (28 - p.life) / 6) * (depth > 1 ? 1 : 0.3);
        if (a <= 0.01) return;
        fx.fillStyle = 'rgba(115,135,170,' + a + ')';
        var y = fl - depth * 0.45;
        fx.beginPath(); fx.ellipse(p.x, y, 3.2 * S, 1.5 * S, 0, 0, Math.PI * 2); fx.fill();
        for (var t = -1; t <= 1; t++) { fx.beginPath(); fx.ellipse(p.x + p.dir * 3.2 * S + t * 0.4, y + t * 1.6 * S, 0.9 * S, 0.8 * S, 0, 0, Math.PI * 2); fx.fill(); }
      });
    }
    parts.forEach(function (p) {
      var k = 1 - p.life / p.max;
      fx.globalAlpha = Math.max(0, Math.min(1, k * 1.6));
      switch (p.k) {
        case 'heart': fx.fillStyle = '#E8577A'; heart(fx, p.x, p.y, p.size); break;
        case 'z':
          fx.fillStyle = '#5B6B8C';
          fx.font = '700 ' + Math.round(p.size) + 'px var(--font, system-ui), sans-serif';
          fx.fillText('z', p.x, p.y); break;
        case 'text':
          fx.fillStyle = p.c || '#7a6a55';
          fx.font = 'italic 600 ' + Math.round(p.size) + 'px system-ui, sans-serif';
          fx.fillText(p.txt, p.x, p.y); break;
        case 'drop':
          fx.fillStyle = 'rgba(90,130,190,.85)';
          fx.beginPath(); fx.arc(p.x, p.y, p.size, 0, Math.PI * 2); fx.fill(); break;
        case 'puff':
          fx.fillStyle = '#fff'; fx.strokeStyle = 'rgba(120,140,175,.6)'; fx.lineWidth = 0.8;
          fx.beginPath(); fx.arc(p.x, p.y, p.size * (1 + p.life * 1.5), 0, Math.PI * 2); fx.fill(); fx.stroke(); break;
        case 'dirt':
          fx.fillStyle = p.c || '#9b7350';
          fx.fillRect(p.x, p.y, p.size, p.size); break;
        case 'orbit':
        case 'star':
          fx.fillStyle = '#F2C230'; star(fx, p.x, p.y, p.size); break;
      }
    });
    fx.globalAlpha = 1;
  }

  // ------------------------------------------------------------------ sound
  var actx = null;
  function audio() {
    if (actx) return actx;
    var A = window.AudioContext || window.webkitAudioContext;
    if (!A) return null;
    try { actx = new A(); } catch (e) { actx = null; }
    return actx;
  }
  function yip(ctx, t0, pm, out) {
    var dur = 0.15, f0 = rand(520, 600) * pm;
    var o = ctx.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(f0 * 0.85, t0);
    o.frequency.linearRampToValueAtTime(f0 * 1.3, t0 + 0.028);
    o.frequency.exponentialRampToValueAtTime(f0 * 0.7, t0 + dur);
    var o2 = ctx.createOscillator(); o2.type = 'triangle';
    o2.frequency.setValueAtTime(f0 * 0.5, t0);
    o2.frequency.exponentialRampToValueAtTime(f0 * 0.36, t0 + dur);
    var bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 1.1;
    bp.frequency.setValueAtTime(1500, t0); bp.frequency.linearRampToValueAtTime(900, t0 + dur);
    var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3400;
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.9, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.4, t0 + 0.07);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    var g2 = ctx.createGain(); g2.gain.value = 0.35;
    o.connect(bp); o2.connect(g2); g2.connect(bp); bp.connect(lp); lp.connect(g); g.connect(out);
    // breathy noise burst
    var n = ctx.createBuffer(1, Math.round(ctx.sampleRate * 0.06), ctx.sampleRate), d = n.getChannelData(0);
    for (var i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    var ns = ctx.createBufferSource(); ns.buffer = n;
    var nf = ctx.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = 2200; nf.Q.value = 0.8;
    var ng = ctx.createGain(); ng.gain.value = 0.25;
    ns.connect(nf); nf.connect(ng); ng.connect(out);
    o.start(t0); o2.start(t0); ns.start(t0);
    o.stop(t0 + dur + 0.02); o2.stop(t0 + dur + 0.02); ns.stop(t0 + 0.07);
  }
  function barkSound(times) {
    if (!soundOn) return;
    var ctx = audio();
    if (!ctx) return;
    if (ctx.state === 'suspended' && ctx.resume) ctx.resume();
    var out = ctx.createGain(); out.gain.value = 0.22; out.connect(ctx.destination);
    var t = ctx.currentTime + 0.01;
    for (var i = 0; i < times; i++) yip(ctx, t + i * 0.19, 1 - i * 0.06, out);
  }

  // ------------------------------------------------------------------ behaviours
  function defaults() {
    return { sit: 0, lie: 0, bow: 0, head: 0, jaw: 0, eye: 0, happy: 0, ear: 0, tail: -28, wagAmp: 9, wagHz: 1.6, tongue: 0,
      rot: 0, coat: wear.coat, scarf: wear.scarf, shades: 0, brow: 0, speed: 0, run: false, face: 0, legs: null };
  }
  function margin() { return 50 * S + 10; }
  function pickX() {
    var tx = dog.x;
    for (var i = 0; i < 6; i++) { tx = rand(margin(), W - margin()); if (Math.abs(tx - dog.x) > 140) break; }
    return tx;
  }
  function moveTo(tg, tx, spd, run) {
    var dx = tx - dog.x;
    if (Math.abs(dx) < 4) return true;
    tg.speed = Math.sign(dx) * Math.min(spd, Math.max(25, Math.abs(dx) * 3));
    tg.run = !!run;
    return false;
  }
  function jump(vy, vx) { if (dog.y <= 0.5) { dog.vy = vy; dog.air = true; if (vx != null) dog.jvx = vx; } }

  var ACT = {
    enter: {
      start: function (a) { dog.x = -70 * S; a.tx = rand(W * 0.2, W * 0.35); },
      tick: function (a, dt, tg) {
        if (moveTo(tg, a.tx, 62)) { say('Woof!', 1500); return true; }
        tg.tail = -15; tg.wagAmp = 14; tg.wagHz = 3;
      }
    },
    walk: {
      start: function (a) { a.tx = pickX(); a.spd = rand(45, 62); a.fog = wx().kind === 'fog'; },
      tick: function (a, dt, tg) {
        tg.tail = -22; tg.wagAmp = 8; tg.wagHz = 1.8;
        if (a.fog) tg.head = 16;
        return moveTo(tg, a.tx, a.spd) || a.t > 14;
      }
    },
    run: {
      start: function (a) { a.tx = pickX(); },
      tick: function (a, dt, tg) {
        tg.ear = 28; tg.tongue = 0.8; tg.tail = -8; tg.wagAmp = 12; tg.wagHz = 4;
        return moveTo(tg, a.tx, 175, true) || a.t > 8;
      }
    },
    idle: {
      start: function (a) { a.dur = rand(2, 4.5); a.look = 0; a.next = 0; },
      tick: function (a, dt, tg) {
        if (a.t > a.next) { a.look = rand(-14, 8); a.next = a.t + rand(0.8, 1.6); }
        tg.head = a.look; tg.wagAmp = 7; tg.wagHz = 1.4;
        return a.t > a.dur;
      }
    },
    sit: {
      start: function (a) { a.dur = rand(4, 9); a.tilt = 0; a.next = 1; a.yawn = Math.random() < 0.3 ? rand(1.5, a.dur - 1) : -1; },
      tick: function (a, dt, tg) {
        tg.sit = 1; tg.tail = -62; tg.wagAmp = 6; tg.wagHz = 1.2;
        if (a.t > a.next) { a.tilt = Math.random() < 0.5 ? rand(-14, 10) : 0; a.next = a.t + rand(1.2, 2.5); }
        tg.head = a.tilt;
        if (a.yawn > 0 && a.t > a.yawn && a.t < a.yawn + 1.3) {
          var k = Math.sin((a.t - a.yawn) / 1.3 * Math.PI);
          tg.jaw = k * 1.1; tg.eye = k > 0.4 ? 1 : 0; tg.head = -12 * k;
        }
        return a.t > a.dur;
      }
    },
    lie: {
      start: function (a) { a.dur = rand(6, 12); },
      tick: function (a, dt, tg) { tg.lie = 1; tg.head = 12; tg.tail = -78; tg.wagAmp = 3; tg.wagHz = 0.8; return a.t > a.dur; }
    },
    sleep: {
      start: function (a) { a.dur = wx().night ? rand(25, 60) : rand(14, 28); a.z = 0.6; },
      tick: function (a, dt, tg) {
        tg.lie = 1; tg.eye = 1; tg.head = 16; tg.tail = -84; tg.wagAmp = 0; tg.ear = 6;
        a.z -= dt;
        if (a.z <= 0 && a.t > 1) {
          a.z = 1.4;
          var h = headTopScreen();
          emit('z', h[0] + 6 * dog.face, h[1] + 4, { vx: 10 * dog.face, vy: -16, max: 2.4, size: rand(10, 15) });
        }
        return a.t > a.dur;
      }
    },
    sniff: {
      start: function (a) { a.dur = rand(3, 5); a.s = 0; },
      tick: function (a, dt, tg) {
        tg.head = 26; tg.tail = -18; tg.wagAmp = 10; tg.wagHz = 2.4;
        if (Math.sin(a.t * 1.4) > 0.2) tg.speed = dog.face * 14;
        a.s -= dt;
        if (a.s <= 0) {
          a.s = 0.9;
          var m = mouthScreen();
          emit('text', m[0] + dog.face * 6, m[1] - 4, { txt: 'sniff', vy: -14, vx: dog.face * 6, max: 1.1, size: 11 });
        }
        return a.t > a.dur;
      }
    },
    spin: {
      start: function (a) { a.dur = 1.9; a.f = 0; },
      tick: function (a, dt, tg) {
        a.f -= dt;
        if (a.f <= 0) { dog.face = -dog.face; a.f = 0.2; }
        tg.face = dog.face;
        tg.speed = dog.face * 40; tg.run = true; tg.tail = -5; tg.wagAmp = 20; tg.wagHz = 5; tg.ear = 20;
        if (a.t > a.dur) { a.chain = 'dizzy'; return true; }
      }
    },
    dizzy: {
      start: function (a) {
        a.dur = 1.6;
        for (var i = 0; i < 3; i++) {
          emit('orbit', 0, 0, { ang: i * 2.1, max: 1.5, size: 3.5 * S + 1,
            cx: function () { return headTopScreen()[0]; }, cy: function () { return headTopScreen()[1] + 4; } });
        }
      },
      tick: function (a, dt, tg) { tg.sit = 0.7; tg.happy = 1; tg.rot = Math.sin(a.t * 6) * 3; tg.tail = -50; return a.t > a.dur; }
    },
    bow: {
      start: function (a) { a.dur = 1.7; say(pick(['!', 'play?', '♪']), 1100); },
      tick: function (a, dt, tg) { tg.bow = 1; tg.tail = 8; tg.wagAmp = 22; tg.wagHz = 4.5; tg.head = -10; tg.tongue = 0.8; return a.t > a.dur; }
    },
    bark: {
      start: function (a) {
        a.n = Math.random() < 0.55 ? 2 : 1; a.dur = 0.35 + a.n * 0.2;
        say(a.n === 2 ? pick(['Woof woof!', 'Arf arf!']) : pick(['Woof!', 'Arf!', 'Bork!']), 1300);
        if (a.sound) barkSound(a.n);
      },
      tick: function (a, dt, tg) {
        tg.head = -14; tg.tail = -10; tg.wagAmp = 16; tg.wagHz = 4;
        var ph = a.t / 0.19, k = ph < a.n ? Math.sin((ph % 1) * Math.PI) : 0;
        tg.jaw = k; tg.sq = -0.05 * k;
        P.jaw = Math.max(P.jaw, k * 0.9);
        return a.t > a.dur;
      }
    },
    startle: {
      start: function (a) { a.dur = 0.7; say('!', 900); jump(330); },
      tick: function (a, dt, tg) { tg.brow = 1; tg.ear = -10; tg.tail = -40; if (a.t > a.dur) { a.chain = 'bark'; a.chainOpts = { sound: a.sound }; return true; } }
    },
    pet: {
      start: function (a) { a.h = 0; },
      tick: function (a, dt, tg) {
        tg.sit = 1; tg.happy = 1; tg.tongue = 1; tg.tail = -40; tg.wagAmp = 24; tg.wagHz = 4.5; tg.head = Math.sin(a.t * 3) * 8 - 4;
        a.h -= dt;
        if (a.h <= 0 && now() < pettingUntil + 0.2) {
          a.h = 0.32;
          var h = headTopScreen();
          emit('heart', h[0] + rand(-10, 10), h[1] + 6, { vx: rand(-12, 12), vy: rand(-38, -26), max: 1.3, size: rand(8, 12) });
        }
        dog.idleSince = now();
        return now() > pettingUntil + 0.9;
      }
    },
    held: {
      start: function () { say(pick(['!?', 'wheee!', '?!']), 900); },
      tick: function (a, dt, tg) {
        tg.rot = Math.sin(a.t * 3) * 6 - 4; tg.tail = -95; tg.wagAmp = 4; tg.ear = -14; tg.brow = 0.6; tg.head = -6;
        tg.legs = 'paddle';
      }
    },
    fall: {
      tick: function (a, dt, tg) {
        tg.legs = 'air'; tg.ear = -20; tg.tail = -60; tg.brow = 0.5;
        if (!dog.air) {
          var k = wx().kind;
          a.chain = (k === 'rain' || k === 'drizzle' || k === 'storm' || k === 'snow') ? 'shake' : 'idle';
          P.sq = 0.28;
          return true;
        }
      }
    },
    shake: {
      start: function (a) { a.dur = 1.15; a.e = 0; },
      tick: function (a, dt, tg) {
        var k = 1 - a.t / a.dur;
        P.rot = Math.sin(a.t * 44) * 11 * k;
        P.ear = Math.sin(a.t * 44 + 1.2) * 40 * k;
        tg.tail = -30; tg.wagAmp = 25 * k; tg.wagHz = 6; tg.eye = 1;
        a.e -= dt;
        var kind = wx().kind;
        if (a.e <= 0) {
          a.e = 0.04;
          var cx = dog.x, cy = floorY() - 60 * S - dog.y, ang = rand(-Math.PI, 0), sp = rand(120, 240);
          if (kind === 'snow') emit('puff', cx + rand(-30, 30) * S, cy + rand(-10, 10), { vx: Math.cos(ang) * sp * 0.4, vy: Math.sin(ang) * sp * 0.4, max: 0.6, size: rand(1.5, 3), g: 200 });
          else if (kind === 'rain' || kind === 'drizzle' || kind === 'storm') emit('drop', cx + rand(-30, 30) * S, cy + rand(-10, 10), { vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, max: 0.6, size: rand(1, 2), g: 700 });
        }
        return a.t > a.dur;
      }
    },
    catchflake: {
      start: function (a) { a.phase = 0; },
      tick: function (a, dt, tg) {
        tg.head = -28; tg.tail = -12; tg.wagAmp = 14; tg.wagHz = 3;
        if (a.phase === 0 && a.t > 0.9) { a.phase = 1; jump(560); }
        if (a.phase === 1) {
          tg.jaw = dog.air ? 0.9 : 0; tg.legs = dog.air ? 'air' : null;
          if (!dog.air && a.t > 1.1) { say(pick(['chomp!', '❄?', 'cold!', 'mmm']), 1100); P.sq = 0.2; return true; }
        }
      }
    },
    dig: {
      start: function (a) { a.dur = 1.9; a.e = 0; },
      tick: function (a, dt, tg) {
        tg.head = 26; tg.bow = 0.5; tg.tail = -2; tg.wagAmp = 16; tg.wagHz = 4; tg.legs = 'dig';
        a.e -= dt;
        if (a.e <= 0) {
          a.e = 0.06;
          var kind = wx().kind, x = dog.x + 30 * S * dog.face, y = floorY() - 4;
          if (kind === 'snow') emit('puff', x, y, { vx: -dog.face * rand(60, 160), vy: rand(-220, -120), max: 0.7, size: rand(1.5, 3), g: 600 });
          else emit('dirt', x, y, { vx: -dog.face * rand(60, 160), vy: rand(-200, -100), max: 0.6, size: rand(1.5, 2.8), g: 700, c: pick(['#9b7350', '#7d5a3c', '#b38a5e']) });
          if (WX() && Math.random() < 0.15) WX().disturb(x, -dog.face, 0.6);
        }
        return a.t > a.dur;
      }
    },
    pounce: {
      start: function (a) {
        var L = WX() ? WX().restingLeaves() : [];
        a.tx = L.length ? pick(L) : pickX(); a.phase = 0;
      },
      tick: function (a, dt, tg) {
        var dx = a.tx - dog.x;
        if (a.phase === 0) {
          tg.head = 10;
          if (Math.abs(dx) > 90) { moveTo(tg, a.tx - Math.sign(dx) * 80, 60); return a.t > 10; }
          a.phase = 1; a.p0 = a.t; dog.face = Math.sign(dx) || 1;
        }
        if (a.phase === 1) {
          tg.bow = 1; tg.tail = 10; tg.wagAmp = 25; tg.wagHz = 6; tg.face = dog.face;
          if (a.t - a.p0 > 0.6) { a.phase = 2; jump(430, clamp(dx * 2.2, -260, 260)); }
        }
        if (a.phase === 2) {
          tg.legs = dog.air ? 'air' : null; tg.ear = 20; tg.face = dog.face;
          if (!dog.air) { if (WX()) WX().disturb(dog.x + 30 * S * dog.face, dog.face, 1.5); P.sq = 0.25; say(pick(['pounce!', 'got it!', '♪']), 1000); return true; }
        }
      }
    },
    follow: {
      start: function (a) { a.dur = rand(5, 8); a.jumpAt = 0; say('!', 700); },
      tick: function (a, dt, tg) {
        var tx = clamp(ptr.x, margin(), W - margin()), dx = tx - dog.x;
        tg.tail = -8; tg.wagAmp = 18; tg.wagHz = 4; tg.tongue = 0.7;
        if (Math.abs(dx) > 30) moveTo(tg, tx, Math.abs(dx) > 160 ? 180 : 70, Math.abs(dx) > 160);
        else {
          tg.face = ptr.x > dog.x ? 1 : -1; tg.head = -18;
          var above = floorY() - ptr.y;
          if (above > 70 * S && above < 260 && a.t > a.jumpAt) { jump(Math.min(640, 260 + above * 1.6)); a.jumpAt = a.t + 1.4; }
          if (dog.air) { tg.jaw = 0.8; tg.legs = 'air'; }
        }
        return a.t > a.dur || now() - ptr.t > 3;
      }
    },
    dribble: {
      start: function (a) { a.kicks = 0; a.cool = 0; },
      tick: function (a, dt, tg) {
        if (ball.held) return true;
        tg.tail = -6; tg.wagAmp = 16; tg.wagHz = 3.5; tg.tongue = 0.6; tg.ear = 12;
        a.cool -= dt;
        var dx = ball.x - dog.x;
        if (a.kicks === 0 && Math.abs(dx) > 70) {  // trot up to the ball, staying on the side that faces open space
          var side = ball.x < W / 2 ? -1 : 1;
          moveTo(tg, ball.x + side * 40 * S, 110, true);
          return a.t > 12;
        }
        moveTo(tg, ball.x - Math.sign(dx || 1) * 30 * S, 150, true);
        var nx = noseX();
        if (a.cool <= 0 && onFloorBall() && Math.abs(ball.x - nx) < ball.r + 8 && Math.sign(ball.x - dog.x) === dog.face) {
          var dir = dog.face;
          if ((dir > 0 && ball.x > W - 90) || (dir < 0 && ball.x < 90)) dir = -dir;
          ball.vx = dir * rand(200, 320); ball.vy = -rand(80, 220);
          a.kicks++; a.cool = 0.6;
        }
        return a.kicks >= 4 || a.t > 12;
      }
    },
    fetch: {
      start: function (a) { a.phase = 'chase'; a.p0 = 0; a.home = clamp(ptr.x >= 0 ? ptr.x : W / 2, margin(), W - margin()); say('!', 700); },
      tick: function (a, dt, tg) {
        tg.tail = -6; tg.wagAmp = 18; tg.wagHz = 4.5; tg.ear = 16; tg.tongue = 0.7;
        if (ball.held === 'user') {   // waiting for the throw
          var dxp = clamp(ptr.x, margin(), W - margin()) - dog.x;
          if (Math.abs(dxp) > 140) moveTo(tg, ptr.x - Math.sign(dxp) * 90, 80);
          else { tg.bow = 0.8; tg.face = Math.sign(ball.x - dog.x) || 1; tg.tail = 10; tg.wagAmp = 24; tg.wagHz = 6; }
          a.phase = 'chase';
          return a.t > 25;
        }
        if (a.phase === 'chase') {
          var lead = 50 * S;
          var want = ball.x - (Math.sign(ball.x - dog.x) || 1) * lead;
          if (Math.abs(ball.x - dog.x) < lead * 0.6) want = ball.x - dog.face * lead;
          moveTo(tg, want, 210, true);
          if (Math.abs(ball.x - dog.x) < lead * 1.5) tg.head = 18;
          var m = mouthScreen();
          if (onFloorBall() && Math.abs(ball.vx) < 180 && Math.abs(m[0] - ball.x) < ball.r + 10 && !dog.air) {
            dog.hasBall = true; ball.held = 'dog'; ball.vx = ball.vy = 0;
            a.phase = 'return'; a.p0 = a.t;
          }
          return a.t > 14;
        }
        if (a.phase === 'return') {
          if (!dog.hasBall) { a.phase = 'chase'; return; }
          if (moveTo(tg, a.home, 150, true)) { a.phase = 'drop'; a.p0 = a.t; }
          return a.t > 30;
        }
        if (a.phase === 'drop') {
          tg.head = 14;
          if (a.t - a.p0 > 0.3 && dog.hasBall) {
            dog.hasBall = false; ball.held = null;
            ball.vx = dog.face * 60; ball.vy = -140;
            a.phase = 'wait'; a.p0 = a.t;
            say(pick(['again!', 'again?', '♪', 'woof!']), 1300);
          }
          return;
        }
        if (a.phase === 'wait') {
          tg.sit = 1; tg.tail = -40; tg.wagAmp = 22; tg.wagHz = 5; tg.tongue = 1; tg.happy = Math.sin(a.t * 2) > 0.6 ? 1 : 0;
          tg.head = Math.sin(a.t * 1.5) * 10 - 6;
          return a.t - a.p0 > 6;
        }
      }
    },
    scared: {
      start: function (a) { a.dur = 2.6; say(pick(['!', 'eep!', '!!']), 900); },
      tick: function (a, dt, tg) {
        tg.lie = 0.5; tg.ear = 34; tg.tail = -100; tg.wagAmp = 0; tg.brow = 1; tg.head = 8;
        tg.rot = Math.sin(a.t * 55) * 1.6 * (1 - a.t / a.dur);
        return a.t > a.dur;
      }
    },
    sunbathe: {
      start: function (a) { a.dur = rand(9, 14); say(pick(['☀', '♪', 'ahh']), 1200); },
      tick: function (a, dt, tg) { tg.lie = 1; tg.shades = 1; tg.happy = 1; tg.head = 4; tg.tail = -74; tg.wagAmp = 6; tg.wagHz = 0.6; return a.t > a.dur; }
    },
    lookup: {
      start: function (a) { a.dur = 1.8; if (a.txt) say(a.txt, 1500); },
      tick: function (a, dt, tg) { tg.head = -26; tg.tail = -20; tg.wagAmp = 8; tg.wagHz = 2; return a.t > a.dur; }
    },
    calm: { // reduced-motion resting pose
      start: function (a) { a.dur = rand(8, 16); a.pose = pick(['sit', 'sit', 'lie']); },
      tick: function (a, dt, tg) { tg[a.pose] = 1; tg.tail = -64; tg.wagAmp = 3; tg.wagHz = 1; return a.t > a.dur; }
    }
  };

  function start(type, opts) {
    var a = { type: type, t: 0 };
    if (opts) for (var k in opts) a[k] = opts[k];
    dog.act = a;
    if (ACT[type].start) ACT[type].start(a);
  }

  function pickNext() {
    var w = wx(), k = w.kind, night = w.night, idle = now() - dog.idleSince;
    if (reduceMotion) return start('calm');
    var opts = [];
    function add(t, wt) { if (wt > 0 && t !== dog.last) opts.push([t, wt]); }
    add('walk', 26); add('idle', 12); add('sit', 12); add('lie', 5);
    add('sniff', k === 'fog' ? 30 : 10);
    add('sleep', night ? 30 : idle > 90 ? 12 : 3);
    if (night) add('lie', 12);
    add('spin', night ? 1 : 3); add('bow', 3); add('run', night ? 1 : 4);
    if (!ball.held && onFloorBall() && !night) add('dribble', 8);
    if (ptr.type === 'mouse' && now() - ptr.t < 3 && ptr.y > 0) add('follow', 6);
    if (k === 'rain' || k === 'drizzle') add('shake', 5);
    if (k === 'storm') add('lie', 14);
    if (k === 'snow') { add('catchflake', 9); add('dig', 6); }
    if (WX() && WX().restingLeaves().length) add('pounce', k === 'leaves' ? 10 : 5);
    if (k === 'leaves') add('dig', 3);
    if (k === 'clear' && !night) add('sunbathe', 6);
    var total = opts.reduce(function (s, o) { return s + o[1]; }, 0), r = Math.random() * total;
    for (var i = 0; i < opts.length; i++) { r -= opts[i][1]; if (r <= 0) return start(opts[i][0]); }
    start('idle');
  }

  // ------------------------------------------------------------------ update
  function smooth(cur, tgt, rate, dt) { return cur + (tgt - cur) * (1 - Math.exp(-rate * dt)); }

  function update(dt) {
    T += dt;
    var tg = defaults();
    var a = dog.act;
    if (!a) { pickNext(); a = dog.act; }
    a.t += dt;
    var done = ACT[a.type].tick(a, dt, tg);
    if (tg.sq) P.sq = Math.min(P.sq, tg.sq);
    if (done) {
      dog.last = a.type;
      if (a.chain) start(a.chain, a.chainOpts); else pickNext();
    }

    // horizontal motion
    if (dog.held) {
      dog.vx = 0;
    } else if (dog.air) {
      if (dog.jvx != null) dog.x += dog.jvx * dt; else dog.x += dog.vx * dt;
      dog.vy -= 1900 * dt;
      dog.y += dog.vy * dt;
      if (dog.y <= 0) {
        dog.y = 0; dog.vy = 0; dog.air = false; dog.jvx = null; P.sq = Math.max(P.sq, 0.14);
      }
    } else {
      var acc = 900 * dt;
      dog.vx = dog.vx < tg.speed ? Math.min(tg.speed, dog.vx + acc) : Math.max(tg.speed, dog.vx - acc);
      dog.x += dog.vx * dt;
    }
    if (!dog.held) dog.x = clamp(dog.x, a.type === 'enter' ? -100 : 30 * S, W - 30 * S);
    if (tg.face) dog.face = tg.face;
    else if (Math.abs(tg.speed) > 1) dog.face = tg.speed > 0 ? 1 : -1;

    // gait
    var spd = dog.air || dog.held ? 0 : Math.abs(dog.vx);
    var stride = tg.run ? 62 : 30;
    gait.ph += spd * dt / (stride * S / 0.88) * Math.PI * 2;
    gait.amp = smooth(gait.amp, Math.min(1, spd / 35), 10, dt);
    gait.run = smooth(gait.run, tg.run ? 1 : 0, 6, dt);

    // paw prints and puddle splashes
    if (spd > 5) {
      dog.dist += spd * dt;
      if (dog.dist > 16 * S) {
        dog.dist = 0; dog.printSide = -dog.printSide;
        var px = dog.x + dog.face * (dog.printSide > 0 ? 24 : -16) * S;
        var w = WX();
        if (w && w.snowDepth() > 1.5 && prints.length < 120) prints.push({ x: px, dir: dog.face, life: 0 });
        if (w && tg.run && Math.random() < 0.5) w.disturb(px, dog.face, 0.7);
        if (w && w.puddleAt(px)) {
          for (var i = 0; i < 3; i++) emit('drop', px, floorY() - 2, { vx: rand(-60, 60), vy: rand(-160, -80), max: 0.45, size: rand(1, 1.8), g: 800 });
        }
      }
    }

    // blink
    var tnow = now();
    if (tnow > blinkAt) { blinkUntil = tnow + 0.13; blinkAt = tnow + rand(2.5, 6); }

    // pose smoothing
    var r = 9;
    ['head', 'jaw', 'eye', 'happy', 'tongue', 'coat', 'scarf', 'shades', 'brow', 'bow'].forEach(function (k) { P[k] = smooth(P[k], tg[k], k === 'jaw' ? 18 : r, dt); });
    P.sit = smooth(P.sit, tg.sit, 6, dt);
    P.lie = smooth(P.lie, tg.lie, 5, dt);
    if (a.type !== 'shake') { P.ear = smooth(P.ear, tg.ear + gait.run * gait.amp * 18, 8, dt); P.rot = smooth(P.rot, tg.rot, 10, dt); }
    P.tail = smooth(P.tail, tg.tail, 6, dt);
    P.wagAmp = smooth(P.wagAmp, tg.wagAmp, 4, dt);
    P.wagHz = smooth(P.wagHz, tg.wagHz, 4, dt);
    P.face = smooth(P.face, dog.face, 16, dt);
    P.sq = smooth(P.sq, 0, 9, dt);
    wagPh += dt * Math.PI * 2 * P.wagHz;
    dog.legMode = tg.legs;

    // ball
    updateBall(dt);
    updateParts(dt);
  }

  function updateBall(dt) {
    if (ball.held === 'dog') {
      var m = mouthScreen();
      ball.x = m[0] + dog.face * 2; ball.y = m[1] + 3;
      return;
    }
    if (ball.held === 'user') return;
    var fb = ballFloor();
    ball.vy += 1700 * dt;
    ball.x += ball.vx * dt; ball.y += ball.vy * dt;
    if (ball.y >= fb) {
      ball.y = fb;
      if (ball.vy > 140) { ball.vy = -ball.vy * 0.52; ball.vx *= 0.9; } else ball.vy = 0;
    }
    if (ball.y < ball.r) { ball.y = ball.r; ball.vy = Math.abs(ball.vy) * 0.5; }
    if (ball.x < ball.r) { ball.x = ball.r; ball.vx = Math.abs(ball.vx) * 0.6; }
    if (ball.x > W - ball.r) { ball.x = W - ball.r; ball.vx = -Math.abs(ball.vx) * 0.6; }
    if (onFloorBall()) {
      ball.vx *= Math.pow(0.22, dt);
      if (Math.abs(ball.vx) < 4) ball.vx = 0;
      // the pup nudges the ball when he walks into it
      var nx = noseX();
      if (!dog.air && !dog.held && Math.abs(dog.vx) > 15 && Math.abs(ball.x - nx) < ball.r + 3 && Math.sign(ball.x - dog.x) === dog.face) {
        ball.vx = dog.vx * 1.35 + dog.face * 25;
      }
    }
    ball.rot += ball.vx * dt / ball.r;
  }

  // ------------------------------------------------------------------ render
  function f(n) { return Math.round(n * 100) / 100; }
  function render() {
    var lift = dog.y / S;
    var walkBob = -Math.abs(Math.sin(gait.ph)) * 1.4 * gait.amp * (1 - gait.run);
    var runBob = -Math.abs(Math.sin(gait.ph)) * 3 * gait.amp * gait.run;
    var breathe = P.eye > 0.5 && P.lie > 0.5 ? Math.sin(T * 2.2) * 0.8 : 0;
    U.sit = -21 * P.sit;
    U.bow = 14 * P.bow;
    U.pitch = Math.sin(gait.ph) * 5 * gait.amp * gait.run;
    U.tx = 0;
    U.ty = 12 * P.sit + 17 * P.lie + walkBob + runBob + breathe;
    U.head = P.head + 14 * P.sit + 6 * P.lie;
    U.headY = 6 * P.lie;

    wrap.style.transform = 'translate3d(' + f(dog.x - 60 * S) + 'px,' + f(floorY() - 96 * S) + 'px,0)';
    var sq = P.sq;
    E.root.setAttribute('transform', 'translate(0 ' + f(-lift) + ') rotate(' + f(P.rot) + ' 60 80) translate(60 96) scale(' + f(1 + sq * 0.6) + ' ' + f(1 - sq) + ') translate(-60 -96)');
    var fc = Math.abs(P.face) < 0.08 ? (P.face < 0 ? -0.08 : 0.08) : P.face;
    E.face.setAttribute('transform', 'translate(60 0) scale(' + f(fc) + ' 1) translate(-60 0)');
    E.upper.setAttribute('transform', 'translate(' + f(U.tx) + ' ' + f(U.ty) + ') rotate(' + f(U.sit) + ' 36 80) rotate(' + f(U.bow) + ' 30 70) rotate(' + f(U.pitch) + ' 56 66)');
    E.head.setAttribute('transform', 'translate(0 ' + f(U.headY) + ') rotate(' + f(U.head) + ' 82 48)');
    E.ear.setAttribute('transform', 'translate(80 24) rotate(' + f(P.ear + Math.sin(gait.ph) * 6 * gait.amp) + ')');

    var jaw = Math.max(P.jaw, P.tongue * (0.32 + Math.sin(T * 14) * 0.06));
    E.jaw.setAttribute('transform', 'rotate(' + f(jaw * 24) + ' 99 50)');
    E.mouthin.setAttribute('opacity', f(Math.min(1, jaw * 3)));
    E.tongue.setAttribute('opacity', P.tongue > 0.3 ? 1 : 0);

    var blinking = now() < blinkUntil;
    var eye = P.happy > 0.5 ? 'happy' : (P.eye > 0.5 || blinking) ? 'shut' : 'open';
    if (eye !== render.eye) {
      render.eye = eye;
      E['eye-open'].setAttribute('opacity', eye === 'open' ? 1 : 0);
      E['eye-shut'].setAttribute('opacity', eye === 'shut' ? 1 : 0);
      E['eye-happy'].setAttribute('opacity', eye === 'happy' ? 1 : 0);
    }
    E.brow.setAttribute('transform', 'rotate(' + f(-14 * P.brow) + ' 95.5 26.6) translate(0 ' + f(-1.5 * P.brow) + ')');
    E.coat.setAttribute('opacity', f(P.coat));
    E.scarf.setAttribute('opacity', f(P.scarf));
    E.shades.setAttribute('opacity', f(P.shades));
    E['scarf-tail'].setAttribute('transform', 'rotate(' + f(Math.sin(T * 7) * 6 * (0.4 + gait.amp)) + ' 78 56)');

    // tail
    var tp = upperPt(31, 57);
    var tailA = P.tail + Math.sin(wagPh) * P.wagAmp + 24 * P.sit * 0;
    E.tail.setAttribute('transform', 'translate(' + f(tp[0]) + ' ' + f(tp[1]) + ') rotate(' + f(tailA) + ')');

    // legs: 0 far back, 1 far front, 2 near back, 3 near front
    var pivots = [[40, 68], [76, 68], [47, 68], [82, 68]];
    var phaseOff = gait.run > 0.5 ? [Math.PI, 0, Math.PI + 0.5, 0.5] : [0, Math.PI, Math.PI, 0];
    var amp = (26 + 14 * gait.run) * gait.amp;
    var mode = dog.legMode;
    for (var i = 0; i < 4; i++) {
      var front = i === 1 || i === 3;
      var pp = upperPt(pivots[i][0], pivots[i][1]);
      var ang = 0, L = 96 - pp[1], op = 1;
      if (mode === 'paddle') { ang = Math.sin(T * 15 + i * 1.7) * 24; L = 26; }
      else if (mode === 'air') { ang = front ? -34 : 32; L = 24; }
      else if (mode === 'dig' && front) { ang = -20 + Math.sin(T * 24 + i * Math.PI) * 32; L = 22; }
      else {
        var ph = gait.ph + phaseOff[i];
        ang = -amp * Math.sin(ph);
        L = L / Math.cos(ang * Math.PI / 180) - Math.max(0, Math.cos(ph)) * 4 * gait.amp;
        if (P.bow > 0.05 && front) { ang -= 34 * P.bow; L = (96 - pp[1]) / Math.cos(ang * Math.PI / 180); }
      }
      if (front) op = clamp(1 - (P.lie - 0.6) * 4, 0, 1);
      else op = clamp(1 - (Math.max(P.sit, P.lie) - 0.5) * 4, 0, 1);
      L = clamp(L, 6, 46);
      var lg = E.legs[i];
      lg.g.setAttribute('transform', 'translate(' + f(pp[0]) + ' ' + f(pp[1]) + ') rotate(' + f(ang) + ')');
      lg.rect.setAttribute('height', f(L + 4.1));
      lg.paw.setAttribute('cy', f(L - 3.9));
      lg.g.setAttribute('opacity', f(Math.max(0, op)));
    }
    E.haunch.setAttribute('opacity', f(clamp((Math.max(P.sit, P.lie) - 0.55) * 4, 0, 1)));
    E.haunch.setAttribute('transform', 'translate(' + f(-4 * P.lie) + ' ' + f(2 * P.lie) + ')');
    E.liepaws.setAttribute('opacity', f(clamp((P.lie - 0.6) * 4, 0, 1)));

    // ball
    var bs = ball.r * 2;
    ballEl.style.width = ballEl.style.height = bs + 'px';
    ballEl.style.transform = 'translate3d(' + f(ball.x - ball.r) + 'px,' + f(ball.y - ball.r) + 'px,0)';
    ballRot.setAttribute('transform', 'rotate(' + f(ball.rot * 180 / Math.PI) + ')');

    placeBubble();
    drawParts();
  }
  render.eye = '';

  // ------------------------------------------------------------------ interaction
  function setPtr(e) { ptr.x = e.clientX; ptr.y = e.clientY; ptr.t = now(); ptr.type = e.pointerType || 'mouse'; }
  window.addEventListener('pointermove', setPtr, { passive: true });
  window.addEventListener('pointerdown', setPtr, { passive: true });

  var drag = null, pet = { dir: 0, lastX: 0, flips: [] };

  function interacted() { dog.idleSince = now(); }

  function clickDog() {
    interacted();
    var t = dog.act ? dog.act.type : '';
    if (t === 'sleep' || t === 'lie' || t === 'sunbathe') start('startle', { sound: true });
    else start('bark', { sound: true });
  }

  function bindDog() {
    wrap.addEventListener('pointerdown', function (e) {
      if (e.button !== undefined && e.button !== 0) return;
      e.preventDefault();
      try { wrap.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      drag = { id: e.pointerId, sx: e.clientX, sy: e.clientY, moved: false, samples: [[now(), e.clientX, e.clientY]],
        ox: e.clientX - dog.x, oy: e.clientY - (floorY() - dog.y), lp: null, longpress: false, type: e.pointerType };
      if (e.pointerType !== 'mouse') {
        drag.lp = setTimeout(function () {
          if (drag && !drag.moved) { drag.longpress = true; pettingUntil = now() + 1.6; if (dog.act.type !== 'pet') start('pet'); }
        }, 450);
      }
    });
    wrap.addEventListener('pointermove', function (e) {
      if (drag && drag.id === e.pointerId) {
        drag.samples.push([now(), e.clientX, e.clientY]);
        if (drag.samples.length > 8) drag.samples.shift();
        if (!drag.moved && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 7) {
          drag.moved = true;
          clearTimeout(drag.lp);
          if (drag.longpress) return;
          dog.held = true; dog.air = false; wrap.classList.add('held');
          if (dog.hasBall) { dog.hasBall = false; ball.held = null; }
          start('held');
          interacted();
        }
        if (dog.held) {
          dog.x = clamp(e.clientX - drag.ox, 20, W - 20);
          dog.y = clamp(floorY() - (e.clientY - drag.oy), 0, H - 60);
        } else if (drag.longpress) {
          pettingUntil = now() + 1.2;
        }
        return;
      }
      // stroking with the mouse = petting
      if (e.pointerType === 'mouse' && !e.buttons) {
        var dx = e.clientX - pet.lastX;
        pet.lastX = e.clientX;
        if (Math.abs(dx) < 2) return;
        var d = dx > 0 ? 1 : -1, t = now();
        if (d !== pet.dir) { pet.dir = d; pet.flips.push(t); }
        pet.flips = pet.flips.filter(function (x) { return t - x < 1.4; });
        if (pet.flips.length >= 4) {
          pettingUntil = t + 0.7;
          var type = dog.act ? dog.act.type : '';
          if (type !== 'pet' && type !== 'held' && type !== 'fall' && type !== 'fetch') start('pet');
          interacted();
        }
      }
    });
    function end(e) {
      if (!drag || drag.id !== e.pointerId) return;
      clearTimeout(drag.lp);
      var d = drag; drag = null;
      wrap.classList.remove('held');
      if (dog.held) {
        dog.held = false;
        var v = velocity(d.samples);
        dog.vy = clamp(-v[1], -400, 900); dog.jvx = clamp(v[0] * 0.5, -500, 500);
        dog.air = dog.y > 0.5 || dog.vy > 0;
        if (!dog.air) { dog.y = 0; start('idle'); } else start('fall');
      } else if (!d.moved && !d.longpress && e.type === 'pointerup') {
        clickDog();
      }
    }
    wrap.addEventListener('pointerup', end);
    wrap.addEventListener('pointercancel', end);
    wrap.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); clickDog(); }
    });
  }

  function velocity(samples) {
    if (samples.length < 2) return [0, 0];
    var a = samples[0], b = samples[samples.length - 1];
    for (var i = samples.length - 2; i >= 0; i--) { a = samples[i]; if (b[0] - a[0] > 0.06) break; }
    var dt = Math.max(0.016, b[0] - a[0]);
    return [(b[1] - a[1]) / dt, (b[2] - a[2]) / dt];
  }

  var bdrag = null;
  function bindBall() {
    ballEl.addEventListener('pointerdown', function (e) {
      if (e.button !== undefined && e.button !== 0) return;
      e.preventDefault();
      try { ballEl.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      if (ball.held === 'dog') { dog.hasBall = false; say(pick(['hey!', 'mine!', 'grr…♪']), 900); }
      ball.held = 'user'; ball.vx = ball.vy = 0;
      bdrag = { id: e.pointerId, sx: e.clientX, sy: e.clientY, ox: e.clientX - ball.x, oy: e.clientY - ball.y, moved: false,
        samples: [[now(), e.clientX, e.clientY]] };
      ballEl.classList.add('held');
      interacted();
      if (!dog.held && dog.act && dog.act.type !== 'fetch' && !reduceMotion) start('fetch');
    });
    ballEl.addEventListener('pointermove', function (e) {
      if (!bdrag || bdrag.id !== e.pointerId) return;
      bdrag.samples.push([now(), e.clientX, e.clientY]);
      if (bdrag.samples.length > 8) bdrag.samples.shift();
      if (Math.hypot(e.clientX - bdrag.sx, e.clientY - bdrag.sy) > 5) bdrag.moved = true;
      ball.x = clamp(e.clientX - bdrag.ox, ball.r, W - ball.r);
      ball.y = clamp(e.clientY - bdrag.oy, ball.r, ballFloor());
    });
    function end(e) {
      if (!bdrag || bdrag.id !== e.pointerId) return;
      var d = bdrag; bdrag = null;
      ballEl.classList.remove('held');
      ball.held = null;
      if (d.moved) {
        var v = velocity(d.samples);
        ball.vx = clamp(v[0], -2200, 2200); ball.vy = clamp(v[1], -2200, 2200);
      } else kickBall();
      throwStarted();
    }
    ballEl.addEventListener('pointerup', end);
    ballEl.addEventListener('pointercancel', end);
    ballEl.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (ball.held === 'dog') { dog.hasBall = false; ball.held = null; } kickBall(); throwStarted(); }
    });
  }
  function kickBall() {
    var dir = ball.x < W / 2 ? 1 : -1;
    ball.vx = dir * rand(300, 520); ball.vy = -rand(480, 700);
  }
  function throwStarted() {
    interacted();
    if (dog.held || reduceMotion) return;
    if (!dog.act || dog.act.type !== 'fetch') start('fetch');
    else { dog.act.phase = 'chase'; dog.act.home = clamp(ptr.x >= 0 ? ptr.x : W / 2, margin(), W - margin()); }
  }

  // ------------------------------------------------------------------ weather hooks
  function applyWeather(first) {
    var s = wx(), k = s.kind;
    wear.coat = (k === 'rain' || k === 'drizzle' || k === 'storm') ? 1 : 0;
    wear.scarf = (k === 'snow' || (s.temp != null && s.temp <= 4)) ? 1 : 0;
    if (wear.coat) wear.scarf = 0;
    if (first || reduceMotion || !dog.act) return;
    var busy = ['held', 'fall', 'fetch', 'pet', 'enter'].indexOf(dog.act.type) >= 0;
    if (busy) return;
    var txt = { rain: '☂?', drizzle: '☂?', storm: '!', snow: '❄!', clear: s.night ? '☾' : '☀', cloudy: '☁', overcast: '☁',
      fog: '?', leaves: '🍂', off: '' }[k];
    start('lookup', { txt: txt });
  }
  window.addEventListener('siteweather:change', function (e) {
    applyWeather(!booted);
  });
  window.addEventListener('siteweather:thunder', function () {
    if (hidden || !dog.act || reduceMotion) return;
    var t = dog.act.type;
    if (t === 'held' || t === 'fall' || t === 'fetch') return;
    start('scared');
  });

  // ------------------------------------------------------------------ menu
  function addMenu() {
    var w = WX();
    if (!w || !w.addMenuSection) return;
    var sec = document.createElement('div');
    sec.className = 'wx-sec';
    sec.innerHTML = '<div class="wx-sec-title">' + NAME + ' the pup</div>' +
      '<label class="wx-switch"><span>Show ' + NAME + '</span><input type="checkbox" role="switch" id="pup-opt-show"></label>' +
      '<label class="wx-switch"><span>Bark sound</span><input type="checkbox" role="switch" id="pup-opt-sound"></label>' +
      '<p class="wx-hint">Click him to say hi, stroke him to pet him, or pick him up. Drag the ball and let go: he fetches.</p>';
    w.addMenuSection(sec);
    var show = sec.querySelector('#pup-opt-show'), snd = sec.querySelector('#pup-opt-sound');
    show.checked = !hidden; snd.checked = soundOn;
    show.addEventListener('change', function () { setHidden(!show.checked); });
    snd.addEventListener('change', function () { soundOn = snd.checked; store.set('kc-pup-sound', soundOn); if (soundOn) barkSound(1); });
  }
  function setHidden(h) {
    hidden = h;
    store.set('kc-pup-hidden', h);
    document.documentElement.classList.toggle('pup-off', h);
    if (!h) { lastTs = 0; loop(); }
  }

  // ------------------------------------------------------------------ loop
  var lastTs = 0, raf = 0, booted = false;
  function resize() {
    W = window.innerWidth; H = window.innerHeight;
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    S = W < 600 ? 0.68 : 0.86;
    wrap.style.width = (120 * S) + 'px';
    wrap.style.height = (100 * S) + 'px';
    ball.r = Math.round(11 * S / 0.86);
    fxc.width = Math.round(W * DPR); fxc.height = Math.round(H * DPR);
    fx.setTransform(DPR, 0, 0, DPR, 0, 0);
    if (booted) {
      dog.x = clamp(dog.x, 30 * S, W - 30 * S);
      ball.x = clamp(ball.x, ball.r, W - ball.r);
      ball.y = Math.min(ball.y, ballFloor());
    }
  }
  function frame(ts) {
    raf = 0;
    if (hidden || document.hidden) return;
    var dt = lastTs ? Math.min(0.05, (ts - lastTs) / 1000) : 0.016;
    lastTs = ts;
    update(dt);
    render();
    loop();
  }
  function loop() { if (!raf && !hidden && !document.hidden) raf = requestAnimationFrame(frame); }

  function init() {
    build();
    resize();
    ball.x = W * 0.74; ball.y = ballFloor();
    applyWeather(true);
    P.coat = wear.coat; P.scarf = wear.scarf;
    bindDog();
    bindBall();
    addMenu();
    document.documentElement.classList.toggle('pup-off', hidden);
    if (reduceMotion) { dog.x = W - 90; start('calm'); } else start('enter');
    booted = true;
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) { lastTs = 0; loop(); } });
    loop();
  }

  window.SitePup = {
    bark: function () { start('bark', { sound: true }); },
    do: function (type, opts) { if (ACT[type]) start(type, opts); },
    get state() { return { act: dog.act && dog.act.type, x: dog.x, y: dog.y, face: dog.face, hasBall: dog.hasBall, ball: { x: ball.x, y: ball.y, held: ball.held } }; },
    show: function () { setHidden(false); },
    hide: function () { setHidden(true); }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
