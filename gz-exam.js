/* Gate Zone exam interface (additive: changes none of your existing code).
   Turns the test screen (Practice, Timed, Full mock) into a GATE exam-portal layout:
     - header with Exit, test title, timer and a Calculator button
     - question-number strip (answered / not answered / flagged) with a Submit button
     - two panels: the question on the left, "Your answer" on the right
     - Previous / Next bar, arrow-key navigation, "Flag for review"
     - on-screen numeric keypad for NAT questions
     - Submit asks for confirmation with a summary (also when you press Next on the last question)
     - draggable scientific calculator (Deg/Rad, memory keys, trig, hyperbolic, inverse, log, powers, roots, factorial)
   Only the test screen is affected. Library, Saved, Profile, Review and the studio look exactly as before.
   Load LAST in practice.html:  <script src="gz-exam.js"></script> */
(function () {
  if (window.__gzExam) return; window.__gzExam = 1;
  var $ = function (id) { return document.getElementById(id); };
  var sess = $('session'); if (!sess) return;

  /* ====================================================================
     1. Scientific calculator engine (no eval). Tested separately.
     ==================================================================== */
  /*CALC-START*/
  function calcEval(src, deg) {
    var T = [], i = 0, s = String(src).replace(/\*/g, '×').replace(/÷/g, '/').replace(/−/g, '-'), m;
    var FN = ['asinh', 'acosh', 'atanh', 'sinh', 'cosh', 'tanh', 'asin', 'acos', 'atan', 'sin', 'cos', 'tan', 'sqrt', 'cbrt', 'log', 'ln'];
    while (i < s.length) {
      var c = s[i];
      if (c === ' ') { i++; continue; }
      if ((m = /^(\d+\.?\d*|\.\d+)(E[+-]?\d+)?/.exec(s.slice(i)))) { T.push({ t: 'n', v: parseFloat(m[0]) }); i += m[0].length; continue; }
      if (s.substr(i, 4) === 'root') { T.push({ t: 'o', v: 'root' }); i += 4; continue; }
      if (s.substr(i, 4) === 'logb') { T.push({ t: 'o', v: 'logb' }); i += 4; continue; }
      var hit = null;
      for (var k = 0; k < FN.length; k++) if (s.substr(i, FN[k].length) === FN[k]) { hit = FN[k]; break; }
      if (hit) { T.push({ t: 'f', v: hit }); i += hit.length; continue; }
      if (c === 'π' || c === 'e') { T.push({ t: 'c', v: c }); i++; continue; }
      if ('+-×/^!()'.indexOf(c) > -1) { T.push({ t: 'o', v: c }); i++; continue; }
      throw new Error('bad');
    }
    if (!T.length) throw new Error('empty');
    var p = 0;
    var isO = function (k, v) { return k && k.t === 'o' && k.v === v; };
    var toRad = function (x) { return deg ? x * Math.PI / 180 : x; };
    var toDeg = function (x) { return deg ? x * 180 / Math.PI : x; };
    var tiny = function (x) { return Math.abs(x) < 1e-12 ? 0 : x; };
    function fact(n) {
      if (n < 0 || n !== Math.floor(n) || n > 170) throw new Error('fact');
      var r = 1; for (var j = 2; j <= n; j++) r *= j; return r;
    }
    function nroot(x, n) {
      if (n === 0) throw new Error('root');
      if (x < 0) { if (Math.abs(n % 2) === 1) return -Math.pow(-x, 1 / n); throw new Error('root'); }
      return Math.pow(x, 1 / n);
    }
    function apply(f, a) {
      switch (f) {
        case 'sin': return tiny(Math.sin(toRad(a)));
        case 'cos': return tiny(Math.cos(toRad(a)));
        case 'tan': if (deg && Math.abs(a % 180) === 90) throw new Error('tan'); return tiny(Math.tan(toRad(a)));
        case 'asin': return toDeg(Math.asin(a));
        case 'acos': return toDeg(Math.acos(a));
        case 'atan': return toDeg(Math.atan(a));
        case 'sinh': return Math.sinh(a);
        case 'cosh': return Math.cosh(a);
        case 'tanh': return Math.tanh(a);
        case 'asinh': return Math.asinh(a);
        case 'acosh': return Math.acosh(a);
        case 'atanh': return Math.atanh(a);
        case 'sqrt': return Math.sqrt(a);
        case 'cbrt': return Math.cbrt(a);
        case 'log': return Math.log10(a);
        case 'ln': return Math.log(a);
      }
      throw new Error('fn');
    }
    function primary() {
      var k = T[p++];
      if (!k) throw new Error('end');
      if (k.t === 'n') return k.v;
      if (k.t === 'c') return k.v === 'π' ? Math.PI : Math.E;
      if (k.t === 'f') {
        if (!isO(T[p], '(')) throw new Error('paren');
        p++; var a = expr(); if (isO(T[p], ')')) p++;
        return apply(k.v, a);
      }
      if (isO(k, '(')) { var v = expr(); if (isO(T[p], ')')) p++; return v; }
      throw new Error('syntax');
    }
    function post() {
      var v = primary();
      while (isO(T[p], '!')) { p++; v = fact(v); }
      return v;
    }
    function pow() {
      var b = post(), k = T[p];
      if (k && k.t === 'o' && (k.v === '^' || k.v === 'root' || k.v === 'logb')) {
        p++; var e = unary();
        if (k.v === '^') return Math.pow(b, e);
        if (k.v === 'root') return nroot(e, b);
        return Math.log(e) / Math.log(b);
      }
      return b;
    }
    function unary() {
      if (isO(T[p], '-')) { p++; return -unary(); }
      if (isO(T[p], '+')) { p++; return unary(); }
      return pow();
    }
    function term() {
      var v = unary();
      for (;;) {
        var k = T[p]; if (!k) break;
        if (isO(k, '×')) { p++; v = v * unary(); }
        else if (isO(k, '/')) { p++; v = v / unary(); }
        else if (k.t === 'n' || k.t === 'c' || k.t === 'f' || isO(k, '(')) { v = v * unary(); }
        else break;
      }
      return v;
    }
    function expr() {
      var v = term();
      for (;;) {
        var k = T[p];
        if (isO(k, '+')) { p++; v = v + term(); }
        else if (isO(k, '-')) { p++; v = v - term(); }
        else break;
      }
      return v;
    }
    var r = expr();
    if (p < T.length) throw new Error('extra');
    if (typeof r !== 'number' || !isFinite(r)) throw new Error('math');
    return r;
  }
  function calcFmt(x) {
    if (!isFinite(x)) return 'Error';
    var v = parseFloat(x.toPrecision(12));
    if (v === 0) return '0';
    var a = Math.abs(v);
    if (a >= 1e12 || a < 1e-9) return v.toExponential().replace('e', 'E');
    return String(v);
  }
  /*CALC-END*/

  /* ====================================================================
     2. Styles (everything is scoped to the test screen)
     ==================================================================== */
  var st = document.createElement('style');
  st.textContent =
    /* hide the old chrome while a test is running */
    'body.in-session .topbar,body.in-session #ml-bg,body.in-session #session .page-head,body.in-session #session .eyebrow,body.in-session #session .page-title,body.in-session #session .lede,body.in-session #session .progress,body.in-session #session .layout>aside,body.in-session #session #position{display:none !important}' +
    'body.in-session .content{max-width:none !important;padding:16px 30px 30px !important}' +
    'body.in-session #session.page{max-width:none !important}' +
    'body.in-session #session .layout{display:block !important}' +
    'body.in-session #question{background:none !important;border:0 !important;box-shadow:none !important;padding:0 !important;margin:0 !important;-webkit-backdrop-filter:none !important;backdrop-filter:none !important}' +
    'body.in-session #session #availability-note{margin:0 0 10px}' +
    /* header */
    '#gxe-head,#gxe-strip{display:none}' +
    'body.in-session #gxe-head{display:flex;align-items:center;gap:12px;margin:0 0 12px;padding:12px 70px 12px 18px;border:1px solid var(--line,#272727);border-radius:16px;background:var(--card,#0b1c2a)}' +
    '.gxe-btn{display:inline-flex;align-items:center;gap:8px;padding:9px 14px;border-radius:11px;border:1px solid var(--line,#272727);background:transparent;color:var(--ink,#f5f1ea);font:600 13.5px "IBM Plex Sans",system-ui,sans-serif;cursor:pointer;white-space:nowrap}' +
    '.gxe-btn:hover{border-color:var(--pen,#60a5fa)}' +
    '.gxe-btn svg{width:17px;height:17px}' +
    '.gxe-title{min-width:0;display:flex;flex-direction:column}' +
    '.gxe-title b{font:700 16px "IBM Plex Sans",system-ui,sans-serif;color:var(--ink,#f5f1ea);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '.gxe-title small{color:var(--muted,#aeacc0);font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '.gxe-sp{flex:1}' +
    '.gxe-timer{display:flex;align-items:baseline;gap:8px;padding:7px 14px;border-radius:999px;border:1px solid var(--line,#272727);color:var(--muted,#aeacc0);font-size:12px}' +
    '.gxe-timer b{font:600 17px "IBM Plex Mono",monospace;color:var(--ink,#f5f1ea);letter-spacing:.03em}' +
    '.gxe-timer.low b{color:#ff6b6b}' +
    /* number strip */
    'body.in-session #gxe-strip{display:flex;align-items:center;gap:10px;margin:0 0 16px;padding:12px 14px;border:1px solid var(--line,#272727);border-radius:16px;background:var(--card,#0b1c2a)}' +
    '.gxe-arr{flex:none;width:30px;height:34px;border:0;background:none;color:var(--muted,#aeacc0);font-size:22px;cursor:pointer;border-radius:8px}' +
    '.gxe-arr:hover{color:var(--ink,#f5f1ea);background:rgba(255,255,255,.07)}' +
    '.gxe-nums{position:relative;flex:1;display:flex;gap:10px;overflow-x:auto;padding:5px 4px;scrollbar-width:none;scroll-behavior:smooth}' +
    '.gxe-nums::-webkit-scrollbar{display:none}' +
    '.gxe-n{position:relative;flex:none;width:38px;height:38px;border-radius:50%;border:1.5px solid var(--line,#272727);background:rgba(255,255,255,.04);color:var(--ink,#f5f1ea);font:600 13.5px "IBM Plex Sans",system-ui,sans-serif;cursor:pointer;transition:transform .15s}' +
    '.gxe-n:hover{transform:translateY(-1px);border-color:var(--pen,#60a5fa)}' +
    '.gxe-n.vis{border-color:#ef6a6a;color:#ff9a9a}' +
    '.gxe-n.ans{background:#60a5fa;border-color:#60a5fa;color:#04211d}' +
    '.gxe-n.flag::after{content:"";position:absolute;top:-3px;right:-3px;width:12px;height:12px;border-radius:50%;background:#60a5fa;box-shadow:0 0 0 2px var(--card,#0b1c2a)}' +
    '.gxe-n.cur{background:var(--pen,#60a5fa);border-color:var(--pen,#60a5fa);color:#1a1206;box-shadow:0 0 0 3px rgba(59,130,246,.28)}' +
    '.gxe-legend{display:flex;gap:12px;color:var(--muted,#aeacc0);font-size:11.5px;white-space:nowrap}' +
    '.gxe-legend i{display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:5px;vertical-align:baseline}' +
    '.gxe-submit{flex:none;padding:10px 18px;border-radius:12px;border:0;cursor:pointer;color:#1a1206;font:700 14px "IBM Plex Sans",system-ui,sans-serif;background:var(--gr,linear-gradient(120deg,#60a5fa,#3b82f6))}' +
    '.gxe-submit:disabled{opacity:.4;cursor:not-allowed}' +
    /* two panels */
    '.gxe-split{display:grid;grid-template-columns:minmax(0,1fr) 330px;gap:18px;align-items:start}' +
    '.gxe-left,.gxe-right{background:var(--card,#0b1c2a);border:1px solid var(--line,#272727);border-radius:18px;padding:26px 34px;overflow:visible}'+
    '.gxe-left{min-height:0;height:auto;align-self:start}'+
    '.gxe-right{padding:20px 20px;position:sticky;top:12px;max-height:calc(100vh - 40px)}' +
    '.gxe-left .qtop{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px}' +
    '.gxe-flag{display:inline-flex;align-items:center;gap:7px;padding:7px 13px;border-radius:10px;border:1px solid #60a5fa;background:transparent;color:#93c5fd;font:600 12.5px "IBM Plex Sans",system-ui,sans-serif;cursor:pointer}' +
    '.gxe-flag.on{background:#60a5fa;color:#fff}' +
    '.gxe-left .gz-qtext{font-size:clamp(20px,1.55vw,25px) !important;line-height:1.75 !important}'+
    '.gxe-left .qmeta{margin-bottom:14px}'+
    '.gxe-left .visual{margin-top:10px}'+
    '.gxe-left img[data-gz-q],.gxe-left img.qimg,.gxe-left .visual img{width:100% !important;max-width:none !important;height:auto !important}'+
    '.gxe-left .gz-fig{max-width:100% !important}'+
    '.gxe-more{margin-top:22px;padding-top:18px;border-top:1px solid var(--line,#272727)}'+
    '.gxe-hint{margin-top:18px;text-align:center;color:var(--muted,#aeacc0);font-size:12px}' +
    '.gxe-hint kbd{display:inline-block;min-width:22px;padding:2px 6px;margin:0 3px;border:1px solid var(--line,#272727);border-radius:6px;font:600 11px "IBM Plex Mono",monospace;color:var(--ink,#f5f1ea)}' +
    '.gxe-rh{display:flex;align-items:center;gap:12px;margin:0 0 14px;font:600 14px "IBM Plex Sans",system-ui,sans-serif;color:var(--ink,#f5f1ea)}' +
    '.gxe-rh::after{content:"";flex:1;height:1px;background:var(--line,#272727)}' +
    '.gxe-right .opts{display:grid !important;grid-template-columns:1fr !important;gap:8px}'+
    '.gxe-right .opt-row{padding:10px 14px !important;min-height:0 !important}'+
    '.gxe-right .opt-label{font-size:12.5px;margin-bottom:8px}'+
    '.gxe-right .check-row{margin-top:12px;gap:8px}' +
    '.gxe-right .opt-row{width:100%}' +
    '.gxe-right #nat-answer{width:100%;font-size:18px;padding:10px 14px;letter-spacing:.04em}' +
    /* NAT keypad */
    '.gxe-pad{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin:10px 0 2px}' +
    '.gxe-pad button{padding:8px 0;border-radius:10px;border:1px solid var(--line,#272727);background:rgba(255,255,255,.05);color:var(--ink,#f5f1ea);font:600 16px "IBM Plex Mono",monospace;cursor:pointer}' +
    '.gxe-pad button:hover{border-color:var(--pen,#60a5fa)}' +
    '.gxe-pad button.w{grid-column:span 2;font:600 12px "IBM Plex Sans",system-ui,sans-serif}' +
    /* bottom bar */
    'body.in-session #session .session-bottom{display:grid !important;grid-template-columns:1fr 1fr;gap:14px;margin-top:12px;padding:0}' +
    'body.in-session #session .session-bottom button{width:100%;padding:14px;border-radius:14px;font:600 15px "IBM Plex Sans",system-ui,sans-serif}' +
    'body.in-session #session #previous::before{content:"\\2190\\00a0\\00a0"}' +
    'body.in-session #session #next::after{content:"\\00a0\\00a0\\2192"}' +
    /* submit dialog */
    '.gxe-modal{position:fixed;inset:0;z-index:100000;display:grid;place-items:center;background:rgba(3,8,16,.72);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)}' +
    '.gxe-box{width:min(440px,92vw);padding:26px;border-radius:18px;border:1px solid var(--line,#272727);background:var(--card,#0b1c2a);color:var(--ink,#f5f1ea);font:400 15px/1.5 "IBM Plex Sans",system-ui,sans-serif;box-shadow:0 30px 90px rgba(0,0,0,.6)}' +
    '.gxe-box h3{margin:0 0 4px;font:700 20px "IBM Plex Sans",system-ui,sans-serif}' +
    '.gxe-box p{margin:0 0 14px;color:var(--muted,#aeacc0);font-size:13.5px}' +
    '.gxe-sum{display:grid;grid-template-columns:1fr auto;gap:8px 16px;margin:0 0 18px;padding:14px;border-radius:12px;border:1px solid var(--line,#272727)}' +
    '.gxe-sum b{font-family:"IBM Plex Mono",monospace;text-align:right}' +
    '.gxe-acts{display:flex;gap:10px;justify-content:flex-end}' +
    /* calculator */
    '#gxe-calc{position:fixed;z-index:99990;right:28px;top:96px;width:318px;display:none;font-family:"IBM Plex Sans",system-ui,sans-serif;user-select:none;-webkit-user-select:none}' +
    'body.in-session #gxe-calc.open{display:block}' +
    '#gxe-calc .bar{display:flex;justify-content:flex-end;gap:8px;margin:0 0 6px}' +
    '#gxe-calc .bar button{width:30px;height:30px;border-radius:50%;border:0;background:#f0443a;color:#fff;font-size:15px;cursor:pointer;display:grid;place-items:center;box-shadow:0 4px 12px rgba(0,0,0,.4)}' +
    '#gxe-calc .bar .mv{cursor:move}' +
    '#gxe-calc .body{padding:10px;border-radius:16px;background:#2b2d33;box-shadow:0 24px 60px rgba(0,0,0,.6);border:1px solid #44464e}' +
    '#gxe-calc .scr{height:78px;margin-bottom:8px;padding:8px 12px;border-radius:10px;background:#3a3c44;color:#fff;text-align:right;display:flex;flex-direction:column;justify-content:space-between}' +
    '#gxe-calc .up{height:16px;font-size:12px;color:#b9bcc6;display:flex;justify-content:space-between;white-space:nowrap;overflow:hidden}' +
    '#gxe-calc .mi{color:#93c5fd;font-weight:700}' +
    '#gxe-calc .mn{font:500 32px/1.1 "IBM Plex Mono",monospace;white-space:nowrap;overflow-x:auto;scrollbar-width:none}' +
    '#gxe-calc .mn::-webkit-scrollbar{display:none}' +
    '#gxe-calc .row{display:grid;gap:5px;margin-bottom:5px}' +
    '#gxe-calc .r3{grid-template-columns:1fr 1.15fr 1.3fr}' +
    '#gxe-calc .r5{grid-template-columns:repeat(5,1fr)}' +
    '#gxe-calc .r6{grid-template-columns:repeat(6,1fr)}' +
    '#gxe-calc .r2{grid-template-columns:1fr 1fr}' +
    '#gxe-calc button.k{height:38px;border:0;border-radius:5px;background:#60636b;color:#fff;font:500 16px "IBM Plex Sans",system-ui,sans-serif;cursor:pointer;padding:0}' +
    '#gxe-calc button.k:hover{filter:brightness(1.15)}#gxe-calc button.k:active{filter:brightness(.9)}' +
    '#gxe-calc .big button.k{height:42px;font-size:18px}' +
    '#gxe-calc button.k.o{background:#2563eb;color:#fff;font-size:20px}' +
    '#gxe-calc button.k.s{height:30px;font-size:12.5px;background:#4a4d55}' +
    '#gxe-calc button.k.m{height:32px;font-size:13px}' +
    '#gxe-calc .deg{display:flex;align-items:center;justify-content:center;gap:5px;height:32px;border-radius:5px;background:#60636b;color:#b9bcc6;font-size:13px;cursor:pointer;border:0}' +
    '#gxe-calc .deg b{color:#fff;font-weight:600}' +
    '#gxe-calc .deg span{opacity:.55}' +
    /* small screens */
    '@media (max-width:1000px){.gxe-split{grid-template-columns:1fr}.gxe-left,.gxe-right{height:auto;min-height:0;max-height:none;position:static}.gxe-legend{display:none}#gxe-head{flex-wrap:wrap}}';
  document.head.appendChild(st);

  /* ====================================================================
     3. Header, number strip
     ==================================================================== */
  var CALC_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="3" width="14" height="18" rx="2.5"/><rect x="8" y="6" width="8" height="3.5" rx=".6"/><path d="M8.5 13h.01M12 13h.01M15.5 13h.01M8.5 16.5h.01M12 16.5h.01M15.5 16.5h.01"/></svg>';
  var head = document.createElement('div'); head.id = 'gxe-head';
  head.innerHTML =
    '<button type="button" class="gxe-btn" id="gxe-exit">\u2190 Exit</button>' +
    '<div class="gxe-title"><b id="gxe-t">GATE DA</b><small id="gxe-s"></small></div><span class="gxe-sp"></span>' +
    '<div class="gxe-timer" id="gxe-timer"></div>' +
    '<button type="button" class="gxe-btn" id="gxe-calcbtn" title="Scientific calculator">' + CALC_SVG + 'Calculator</button>';
  var strip = document.createElement('div'); strip.id = 'gxe-strip';
  strip.innerHTML =
    '<button type="button" class="gxe-arr" data-dir="-1" aria-label="Scroll left">\u2039</button><div class="gxe-nums" id="gxe-nums"></div>' +
    '<button type="button" class="gxe-arr" data-dir="1" aria-label="Scroll right">\u203A</button>' +
    '<div class="gxe-legend"><span><i style="background:#60a5fa"></i>Answered</span><span><i style="border:1.5px solid #ef6a6a"></i>Not answered</span><span><i style="background:#60a5fa"></i>Flagged</span></div>' +
    '<button type="button" class="gxe-submit" id="gxe-submit">Submit</button>';
  sess.insertBefore(strip, sess.firstChild); sess.insertBefore(head, sess.firstChild);
  var nums = $('gxe-nums');

  var flags = {}, seen = {};
  function fresh() { if (window.__gxeQs !== questions) { window.__gxeQs = questions; flags = {}; seen = {}; } }
  function has(q) { return String(answers[q.id] == null ? '' : answers[q.id]).trim() !== ''; }

  function pad(n) { return String(n).padStart(2, '0'); }
  function drawHead() {
    var timed = typeof mode !== 'undefined' && mode === 'Timed', isMock = typeof mock !== 'undefined' && mock;
    $('gxe-t').textContent = isMock ? 'GATE DA \u00b7 Full Mock Test' : timed ? 'GATE DA \u00b7 Timed Test' : 'GATE DA \u00b7 Practice';
    var d = (typeof sessionDescription !== 'undefined' && sessionDescription) ? sessionDescription : (questions.length + ' questions');
    $('gxe-s').textContent = d;
    var t = $('gxe-timer'), sec = typeof seconds !== 'undefined' ? seconds : 0;
    if (isMock && typeof MOCK_SECONDS !== 'undefined') {
      var left = Math.max(0, MOCK_SECONDS - sec);
      t.className = 'gxe-timer' + (left < 600 ? ' low' : '');
      t.innerHTML = 'Time left <b>' + pad(Math.floor(left / 3600)) + ':' + pad(Math.floor(left % 3600 / 60)) + ':' + pad(left % 60) + '</b>';
    } else if (timed) {
      t.className = 'gxe-timer';
      t.innerHTML = 'Time <b>' + pad(Math.floor(sec / 60)) + ':' + pad(sec % 60) + '</b>';
    } else { t.className = 'gxe-timer'; t.innerHTML = 'Untimed practice'; }
    $('gxe-submit').textContent = timed || isMock ? 'Submit Assessment' : 'Finish';
    $('gxe-submit').disabled = !questions.length;
  }
  function drawStrip() {
    fresh();
    nums.innerHTML = questions.map(function (x, i) {
      var c = 'gxe-n' + (i === index ? ' cur' : has(x) ? ' ans' : seen[x.id] ? ' vis' : '') + (flags[x.id] ? ' flag' : '');
      return '<button type="button" class="' + c + '" data-i="' + i + '" aria-label="Question ' + (i + 1) + '">' + (i + 1) + '</button>';
    }).join('');
    var cur = nums.querySelector('.cur');
    if (cur) nums.scrollLeft = cur.offsetLeft - nums.clientWidth / 2 + cur.offsetWidth / 2;
  }

  /* ====================================================================
     4. Re-arrange the question card into two panels after every render
     ==================================================================== */
  function arrange() {
    var q = $('question'); if (!q) return;
    fresh();
    if (questions[index]) seen[questions[index].id] = 1;
    drawHead(); drawStrip();
    if (q.querySelector(':scope > .gxe-split')) return;
    var box = q.querySelector(':scope > .answer-box'); if (!box) return;
    var split = document.createElement('div'); split.className = 'gxe-split';
    var L = document.createElement('div'); L.className = 'gxe-left';
    var R = document.createElement('div'); R.className = 'gxe-right';
    Array.prototype.slice.call(q.children).forEach(function (c) { if (c !== box) L.appendChild(c); });
    var rh = document.createElement('div'); rh.className = 'gxe-rh'; rh.textContent = 'Your answer';
    R.appendChild(rh); R.appendChild(box);
    var nat = box.querySelector('#nat-answer');
    if (nat && !nat.disabled) {
      var pd = document.createElement('div'); pd.className = 'gxe-pad';
      pd.innerHTML = ['7', '8', '9', '\u2212', '4', '5', '6', '.', '1', '2', '3', '0'].map(function (k) { return '<button type="button" data-k="' + k + '">' + k + '</button>'; }).join('') +
        '<button type="button" class="w" data-k="bk">\u232B Backspace</button><button type="button" class="w" data-k="clr">Clear</button>';
      box.insertBefore(pd, nat.nextSibling);
    }
    var more = document.createElement('div');
    Array.prototype.slice.call(box.querySelectorAll(':scope > details, :scope > .gem')).forEach(function (n) {
      if (n.classList.contains('gem') && !n.querySelector('button')) return;
      more.appendChild(n);
    });
    if (more.children.length) { more.className = 'gxe-more'; L.appendChild(more); }
    var qt = L.querySelector('.qtop');
    if (qt) {
      var fb = document.createElement('button'); fb.type = 'button'; fb.className = 'gxe-flag';
      var paint = function () { var on = questions[index] && flags[questions[index].id]; fb.classList.toggle('on', !!on); fb.textContent = on ? '\u2691 Flagged' : '\u2691 Flag for review'; };
      paint();
      fb.onclick = function () { var id = questions[index] && questions[index].id; if (!id) return; if (flags[id]) delete flags[id]; else flags[id] = 1; paint(); drawStrip(); };
      var sv = qt.querySelector('.save-q'); qt.insertBefore(fb, sv || null);
    }
    var hint = document.createElement('div'); hint.className = 'gxe-hint'; hint.innerHTML = 'Use <kbd>\u2190</kbd> and <kbd>\u2192</kbd> to navigate';
    L.appendChild(hint);
    split.appendChild(L); split.appendChild(R); q.appendChild(split);
  }
  new MutationObserver(arrange).observe($('question'), { childList: true });
  setInterval(function () { if (document.body.classList.contains('in-session')) drawHead(); }, 500);

  /* ====================================================================
     5. Clicks: strip, NAT keypad, Exit, Calculator button, Submit
     ==================================================================== */
  function go(i) { remember(); index = i; renderQuestion(); persistSession(); }
  function summary() {
    var a = 0, f = 0, v = 0;
    questions.forEach(function (x) { if (has(x)) a++; if (flags[x.id]) f++; if (seen[x.id]) v++; });
    return { total: questions.length, answered: a, left: questions.length - a, flagged: f };
  }
  function submitDialog() {
    if (!questions.length || document.querySelector('.gxe-modal')) return;
    remember(); arrange();
    var s = summary(), isMock = typeof mock !== 'undefined' && mock;
    var w = document.createElement('div'); w.className = 'gxe-modal';
    w.innerHTML = '<div class="gxe-box" role="dialog" aria-modal="true"><h3>Submit ' + (isMock ? 'assessment' : 'test') + '?</h3><p>' +
      (isMock ? 'After you submit you cannot return to the paper.' : 'Your answers will be marked and shown in the review.') + '</p><div class="gxe-sum">' +
      '<span>Total questions</span><b>' + s.total + '</b><span>Answered</span><b>' + s.answered + '</b><span>Not answered</span><b>' + s.left + '</b><span>Flagged for review</span><b>' + s.flagged + '</b></div>' +
      '<div class="gxe-acts"><button type="button" class="gxe-btn" data-a="no">Go back</button><button type="button" class="gxe-submit" data-a="yes">Submit</button></div></div>';
    var close = function () { w.remove(); document.removeEventListener('keydown', esc, true); };
    var esc = function (e) { if (e.key === 'Escape') close(); };
    w.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-a]');
      if (b && b.dataset.a === 'yes') { close(); finish(); } else if (b || e.target === w) close();
    });
    document.addEventListener('keydown', esc, true);
    document.body.appendChild(w);
    var y = w.querySelector('[data-a="no"]'); if (y) y.focus();
  }

  document.addEventListener('click', function (e) {
    var t = e.target; if (!t.closest) return;
    /* Next on the last question: ask first instead of ending the test at once */
    if (document.body.classList.contains('in-session') && t.closest('#next') && questions.length && index === questions.length - 1 && !t.closest('#next').disabled) {
      e.stopPropagation(); e.preventDefault(); submitDialog(); return;
    }
    var n = t.closest('.gxe-n'); if (n) { go(+n.dataset.i); return; }
    var ar = t.closest('.gxe-arr'); if (ar) { nums.scrollBy({ left: +ar.dataset.dir * 320, behavior: 'smooth' }); return; }
    var pk = t.closest('.gxe-pad button');
    if (pk) {
      var inp = $('nat-answer'); if (!inp || inp.disabled) return;
      var k = pk.dataset.k, v = inp.value;
      if (k === 'bk') v = v.slice(0, -1);
      else if (k === 'clr') v = '';
      else if (k === '\u2212') v = v.charAt(0) === '-' ? v.slice(1) : '-' + v;
      else if (k === '.') { if (v.indexOf('.') < 0) v += '.'; }
      else v += k;
      inp.value = v; inp.dispatchEvent(new Event('input', { bubbles: true })); return;
    }
    if (t.closest('#gxe-exit')) {
      var x = $('gzx-exit') || document.querySelector('#session .back'); if (x) x.click(); return;
    }
    if (t.closest('#gxe-submit')) { submitDialog(); return; }
    if (t.closest('#gxe-calcbtn')) { toggleCalc(); return; }
  }, true);
  document.addEventListener('input', function (e) { if (e.target && e.target.id === 'nat-answer') setTimeout(drawStrip, 0); });

  /* arrow keys move between questions (never while typing, never past the last question) */
  document.addEventListener('keydown', function (e) {
    if (!document.body.classList.contains('in-session') || document.querySelector('.gxe-modal')) return;
    var tg = e.target, tag = tg && tg.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (tg && tg.isContentEditable)) return;
    if (e.key === 'ArrowLeft') { var p = $('previous'); if (p && !p.disabled) p.click(); }
    else if (e.key === 'ArrowRight' && index < questions.length - 1) { var nx = $('next'); if (nx && !nx.disabled) nx.click(); }
  });

  /* ====================================================================
     6. Calculator panel
     ==================================================================== */
  var C = { expr: '', ans: '', done: false, err: false, deg: true, mem: 0 };
  var calc = document.createElement('div'); calc.id = 'gxe-calc'; calc.setAttribute('aria-label', 'Scientific calculator');
  /* [label, text to insert, kind, class]  kind: d = starts new input, o = continues from the result */
  var KEYS_MAIN = [
    ['7', '7', 'd'], ['8', '8', 'd'], ['9', '9', 'd'], ['(', '(', 'd'], [')', ')', 'o'],
    ['4', '4', 'd'], ['5', '5', 'd'], ['6', '6', 'd'], ['\u00d7', '\u00d7', 'o', 'o'], ['/', '/', 'o', 'o'],
    ['1', '1', 'd'], ['2', '2', 'd'], ['3', '3', 'd'], ['+', '+', 'o', 'o'], ['\u2212', '-', 'o', 'o'],
    ['0', '0', 'd'], ['.', '.', 'd'], ['+/\u2212', '@neg', 'o'], ['=', '@eq', 'o', 'o w2']
  ];
  var KEYS_SCI = [
    ['sin', 'sin(', 'd'], ['cos', 'cos(', 'd'], ['tan', 'tan(', 'd'], ['sinh', 'sinh(', 'd'], ['cosh', 'cosh(', 'd'], ['tanh', 'tanh(', 'd'],
    ['sin\u207b\u00b9', 'asin(', 'd'], ['cos\u207b\u00b9', 'acos(', 'd'], ['tan\u207b\u00b9', 'atan(', 'd'], ['sinh\u207b\u00b9', 'asinh(', 'd'], ['cosh\u207b\u00b9', 'acosh(', 'd'], ['tanh\u207b\u00b9', 'atanh(', 'd'],
    ['x\u00b2', '^2', 'o'], ['x\u00b3', '^3', 'o'], ['x\u02b8', '^', 'o'], ['\u02b8\u221ax', ' root ', 'o'], ['x\u207b\u00b9', '^(-1)', 'o'], ['x!', '!', 'o'],
    ['\u221a', 'sqrt(', 'd'], ['\u221b', 'cbrt(', 'd'], ['log', 'log(', 'd'], ['ln', 'ln(', 'd'], ['log\u2093', ' logb ', 'o'], ['e\u02e3', 'e^(', 'd']
  ];
  function keyHTML(k, cls) { return '<button type="button" class="k ' + (cls || '') + ' ' + (k[3] || '') + '" data-t="' + k[1] + '" data-kind="' + k[2] + '"' + (k[3] && /w2/.test(k[3]) ? ' style="grid-column:span 2"' : '') + '>' + k[0] + '</button>'; }
  calc.innerHTML =
    '<div class="bar"><button type="button" class="mv" id="gxe-mv" title="Drag to move" aria-label="Move calculator">\u2237</button><button type="button" id="gxe-cx" title="Close" aria-label="Close calculator">\u2715</button></div>' +
    '<div class="body"><div class="scr"><div class="up"><span class="mi" id="gxe-mi"></span><span id="gxe-up"></span></div><div class="mn" id="gxe-mn">0</div></div>' +
    '<div class="row r3"><button type="button" class="k m" data-a="clear">Clear</button><button type="button" class="deg" id="gxe-deg" data-a="deg"></button><button type="button" class="k m" data-a="bk">Backspace</button></div>' +
    '<div class="row r5">' + ['MC', 'MR', 'MS', 'M+', 'M-'].map(function (m) { return '<button type="button" class="k m" data-a="' + m + '">' + m.replace('-', '\u2212') + '</button>'; }).join('') + '</div>' +
    '<div class="row r5 big">' + KEYS_MAIN.map(function (k) { return keyHTML(k); }).join('') + '</div>' +
    '<div class="row r2"><button type="button" class="k s" data-t="\u03c0" data-kind="d">\u03c0</button><button type="button" class="k s" data-t="e" data-kind="d">e</button></div>' +
    '<div class="row r6">' + KEYS_SCI.map(function (k) { return keyHTML(k, 's'); }).join('') + '</div></div>';
  document.body.appendChild(calc);

  var PRETTY = [[/a(sinh|cosh|tanh|sin|cos|tan)\(/g, '$1\u207b\u00b9('], [/sqrt\(/g, '\u221a('], [/cbrt\(/g, '\u221b('], [/ root /g, ' \u02b8\u221a '], [/ logb /g, ' log\u2093 ']];
  function pretty(s) { PRETTY.forEach(function (r) { s = s.replace(r[0], r[1]); }); return s; }
  function paintCalc() {
    var mn = $('gxe-mn'), txt = C.err ? 'Error' : (C.expr ? pretty(C.expr) : '0');
    mn.textContent = txt;
    mn.style.fontSize = txt.length > 22 ? '17px' : txt.length > 15 ? '22px' : txt.length > 10 ? '27px' : '32px';
    mn.scrollLeft = mn.scrollWidth;
    $('gxe-up').textContent = C.done && C.ans ? pretty(C.ans) + ' =' : '';
    $('gxe-mi').textContent = C.mem !== 0 ? 'M' : '';
    $('gxe-deg').innerHTML = C.deg ? '<b>Deg</b><span>|</span>Rad' : 'Deg<span>|</span><b>Rad</b>';
  }
  function curVal() {
    if (!C.expr) return 0;
    try { return calcEval(C.expr, C.deg); } catch (e) { return null; }
  }
  function evaluate() {
    if (!C.expr) return;
    try { var r = calcEval(C.expr, C.deg); C.ans = C.expr; C.expr = calcFmt(r); C.done = true; }
    catch (e) { C.err = true; C.expr = ''; C.done = false; }
  }
  function press(text, kind) {
    if (C.err) { C.err = false; C.expr = ''; C.done = false; }
    if (text === '@eq') { evaluate(); return paintCalc(); }
    if (text === '@neg') {
      if (!C.expr) C.expr = '-';
      else {
        var m = /(\(-)?(\d+\.?\d*(?:E[+-]?\d+)?|\.\d+)(\))?$/.exec(C.expr);
        if (m && m[1] && m[3]) C.expr = C.expr.slice(0, m.index) + m[2];
        else if (m) C.expr = C.expr.slice(0, m.index) + '(-' + m[2] + ')';
        else if (/^-\(.*\)$/.test(C.expr)) C.expr = C.expr.slice(2, -1);
        else C.expr = '-(' + C.expr + ')';
      }
      C.done = false; return paintCalc();
    }
    if (C.done) { if (kind === 'd') C.expr = ''; C.done = false; }
    if (text === '.' && /(^|[^\d.])\d*\.\d*$/.test(C.expr)) return paintCalc();
    if (C.expr.length < 80) C.expr += text;
    paintCalc();
  }
  function backspace() {
    if (C.err) { C.err = false; C.expr = ''; return paintCalc(); }
    C.done = false;
    var t = /(asinh\(|acosh\(|atanh\(|sinh\(|cosh\(|tanh\(|asin\(|acos\(|atan\(|sin\(|cos\(|tan\(|sqrt\(|cbrt\(| root | logb |log\(|ln\()$/.exec(C.expr);
    C.expr = t ? C.expr.slice(0, t.index) : C.expr.slice(0, -1);
    paintCalc();
  }
  function memory(a) {
    if (a === 'MC') C.mem = 0;
    else if (a === 'MR') { var s = calcFmt(C.mem); press(C.mem < 0 ? '(' + s + ')' : s, 'd'); return; }
    else { var v = curVal(); if (v === null) return paintCalc(); if (a === 'MS') C.mem = v; else if (a === 'M+') C.mem += v; else if (a === 'M-') C.mem -= v; }
    paintCalc();
  }
  calc.addEventListener('mousedown', function (e) { if (e.target.closest && e.target.closest('button') && !e.target.closest('.mv')) e.preventDefault(); });
  calc.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('button'); if (!b) return;
    if (b.id === 'gxe-cx') { calc.classList.remove('open'); return; }
    var a = b.dataset.a;
    if (a === 'clear') { C.expr = ''; C.ans = ''; C.done = false; C.err = false; paintCalc(); }
    else if (a === 'bk') backspace();
    else if (a === 'deg') { C.deg = !C.deg; paintCalc(); }
    else if (a) memory(a);
    else if (b.dataset.t != null) press(b.dataset.t, b.dataset.kind);
  });

  /* drag by the move handle */
  (function () {
    var mv = $('gxe-mv'), ox = 0, oy = 0, drag = false;
    mv.addEventListener('pointerdown', function (e) {
      drag = true; var r = calc.getBoundingClientRect(); ox = e.clientX - r.left; oy = e.clientY - r.top;
      calc.style.right = 'auto'; calc.style.left = r.left + 'px'; calc.style.top = r.top + 'px';
      mv.setPointerCapture(e.pointerId); e.preventDefault();
    });
    mv.addEventListener('pointermove', function (e) {
      if (!drag) return;
      var x = Math.min(Math.max(0, e.clientX - ox), innerWidth - 80), y = Math.min(Math.max(0, e.clientY - oy), innerHeight - 60);
      calc.style.left = x + 'px'; calc.style.top = y + 'px';
    });
    var up = function () { drag = false; };
    mv.addEventListener('pointerup', up); mv.addEventListener('pointercancel', up);
  })();

  function toggleCalc() { calc.classList.toggle('open'); paintCalc(); }

  /* keyboard for the calculator: only when it is open and you are not typing in a box */
  document.addEventListener('keydown', function (e) {
    if (!calc.classList.contains('open') || !document.body.classList.contains('in-session') || document.querySelector('.gxe-modal')) return;
    var tg = e.target, tag = tg && tg.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (tg && tg.isContentEditable)) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    var k = e.key, used = true;
    if (/^[0-9]$/.test(k)) press(k, 'd');
    else if (k === '.') press('.', 'd');
    else if (k === '+') press('+', 'o');
    else if (k === '-') press('-', 'o');
    else if (k === '*') press('\u00d7', 'o');
    else if (k === '/') press('/', 'o');
    else if (k === '^') press('^', 'o');
    else if (k === '!') press('!', 'o');
    else if (k === '(') press('(', 'd');
    else if (k === ')') press(')', 'o');
    else if (k === 'Enter' || k === '=') press('@eq', 'o');
    else if (k === 'Backspace') backspace();
    else if (k === 'Delete') { C.expr = ''; C.ans = ''; C.done = false; C.err = false; paintCalc(); }
    else used = false;
    if (used) e.preventDefault();
  });
  paintCalc();

  /* the test may already be on screen when this file loads (resumed test) */
  try { if (document.body.classList.contains('in-session')) arrange(); } catch (e) {}
})();