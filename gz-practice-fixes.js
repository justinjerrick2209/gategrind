/* Gate Zone practice fixes (additive: does not edit any of your existing code).
   1. The top bar ("GATE DA > Practice studio", countdown, questions-ready) always stays in front of the page content.
   2. The "Profile" item is removed from the sidebar; a round profile icon sits in the top-right corner instead.
   3. The Profile page no longer flickers (repeated re-renders are merged, "Loading..." never replaces content already shown,
      identical content is never redrawn).
   4. The small "Equal split / Per subject" tag in the builder header is removed.
   5. "Exit test": leave a test at any time. An exited test is thrown away: nothing is saved and nothing reaches your analysis.
      Only sets that are completed (Finish pressed, or the mock timer ends) are saved and analysed.
      A one-time clean-up also drops old unsent results kept on this device, to match the database reset (see database-reset.sql).
   6. "Build your practice set" is now a guided flow, repeated for every subject you want:
        Subject -> Topics -> Number of questions (1 to 30)  ...  then "Generate practice set".
   Load near the end of practice.html, before gz-ai.js:  <script src="gz-practice-fixes.js"></script> */
(function () {
  if (window.__gzPF) return; window.__gzPF = 1;
  var g = function (id) { return document.getElementById(id); };
  var MAX = 30;

  /* ---------------------------------------------------------------- styles */
  var css = document.createElement('style');
  css.id = 'gz-pf-css';
  css.textContent =
    /* 1. top bar in front of everything on the page (cards are z-index 30, library filter bar 60); solid enough that content never shows through */
    ':root body header.topbar,:root.dark body header.topbar,:root:not(.dark) body header.topbar{position:sticky;top:0;z-index:62 !important;padding-right:72px !important;background:rgba(7,12,26,.9) !important}' +
    ':root:not(.dark) body header.topbar{background:rgba(244,248,255,.93) !important}' +
    /* sidebar + top bar share one fill and one edge line, so they read as a single frame */
    ':root:root body aside.sidebar{background:rgba(7,12,26,.9) !important;box-shadow:inset -1px 0 0 rgba(59,130,246,.2) !important}' +
    ':root:root:not(.dark) body aside.sidebar{background:rgba(244,248,255,.93) !important}' +
    ':root:root body header.topbar{box-shadow:inset 0 -1px 0 rgba(59,130,246,.2) !important}' +
    /* 2. round profile icon, top-right corner */
    '.gz-hide{display:none !important}' +
    ':root body button.gz-pfab{position:fixed;top:8px;right:18px;z-index:66;width:42px;height:42px;min-width:0;padding:0;display:grid;place-items:center;cursor:pointer;overflow:visible;' +
      'border:2px solid transparent;border-radius:15px 15px 15px 4px;font:800 17px "Bricolage Grotesque","IBM Plex Sans",sans-serif;color:#60a5fa;text-shadow:0 0 12px rgba(59,130,246,.6);' +
      'background:linear-gradient(145deg,#0a1226,#070707) padding-box,linear-gradient(135deg,#93c5fd,#60a5fa 45%,#1d4ed8) border-box !important;' +
      'box-shadow:0 0 0 1px rgba(0,0,0,.6),0 8px 22px -6px rgba(59,130,246,.55),inset 0 0 14px rgba(59,130,246,.18) !important;transition:box-shadow .2s,color .2s,border-radius .25s}' +
    ':root body button.gz-pfab::after{content:"";position:absolute;right:-4px;bottom:-4px;width:11px;height:11px;border-radius:50%;background:#60a5fa;border:2px solid #050505;box-shadow:0 0 8px #60a5fa}' +
    ':root body button.gz-pfab::before{content:"";position:absolute;inset:0;border-radius:inherit;pointer-events:none;background:linear-gradient(115deg,transparent 35%,rgba(147,197,253,.3) 50%,transparent 65%);background-size:250% 100%;background-position:130% 0;transition:background-position .6s}' +
    ':root body button.gz-pfab:hover{color:#fff;border-radius:15px 4px 15px 15px;box-shadow:0 0 0 1px rgba(0,0,0,.6),0 10px 28px -4px rgba(59,130,246,.85),inset 0 0 16px rgba(59,130,246,.3) !important}' +
    ':root body button.gz-pfab:hover::before{background-position:-30% 0}' +
    ':root body button.gz-pfab.on{box-shadow:0 0 0 2px #60a5fa,0 0 22px rgba(59,130,246,.6),inset 0 0 14px rgba(59,130,246,.25) !important}' +
    '@media(max-width:620px){:root body button.gz-pfab{right:10px}}' +
    /* 3. profile page: reserve space so swapping content never makes the page jump */
    '#progress-body{min-height:70vh}' +
    /* 4. guided builder */
    '.gzw{margin:16px 0 20px}' +
    '.gzw h3{margin:0 0 4px;font:700 19px "Bricolage Grotesque","IBM Plex Sans",sans-serif;color:var(--ink)}' +
    '.gzw .gzw-sub{margin:0 0 14px;color:var(--muted);font-size:14px}' +
    '.gzw-steps{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 16px}' +
    '.gzw-step{display:inline-flex;align-items:center;gap:8px;padding:7px 13px;border-radius:99px;border:1px solid rgba(59,130,246,.25);background:rgba(5,7,15,.4);color:var(--muted);font:600 12.5px "IBM Plex Sans",sans-serif}' +
    '.gzw-step b{display:grid;place-items:center;width:20px;height:20px;border-radius:50%;background:rgba(59,130,246,.18);color:#93c5fd;font-size:11.5px}' +
    '.gzw-step.on{color:#fff;border-color:#60a5fa;background:rgba(59,130,246,.24)}' +
    '.gzw-step.done{color:#93c5fd}' +
    '.gzw-topics{display:flex;flex-wrap:wrap;gap:8px;margin:8px 0 6px}' +
    '.gzw-chip{display:inline-flex;align-items:center;gap:8px;padding:9px 14px;border-radius:11px;border:1px solid rgba(59,130,246,.3);background:rgba(255,255,255,.05);color:var(--ink);cursor:pointer;font:500 13.5px "IBM Plex Sans",sans-serif}' +
    '.gzw-chip small{color:var(--muted);font:500 11.5px "IBM Plex Mono",monospace}' +
    ':root body .gzw-chip.on{border-color:#60a5fa !important;color:#fff;background:rgba(59,130,246,.28) !important}' +
    '.gzw-chip.on::before{content:"\\2713";color:#93c5fd;font-weight:700}' +
    '.gzw-nav{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-top:16px}' +
    '.gzw-nav .gzw-hint{color:var(--muted);font-size:13px}' +
    '.gzw-mini{padding:8px 13px !important;font-size:13px !important}' +
    '.gzw-bigrow{display:flex;align-items:center;gap:20px;flex-wrap:wrap;margin:10px 0 8px}' +
    '.gzw-big{font:800 46px/1 "Bricolage Grotesque","IBM Plex Sans",sans-serif;color:#fff;min-width:2ch}' +
    '.gzw-range{flex:1;min-width:200px;accent-color:#60a5fa;height:28px}' +
    '.gzw-num{width:84px;padding:10px;border-radius:10px;border:1px solid rgba(59,130,246,.35);background:rgba(5,7,15,.55);color:var(--ink);text-align:center;font:600 16px "IBM Plex Mono",monospace}' +
    '.gzw-presets{display:flex;gap:8px;flex-wrap:wrap;margin:6px 0}' +
    '.gzw-row{display:flex;align-items:center;gap:14px;flex-wrap:wrap;padding:12px 14px;margin-bottom:10px;border-radius:14px;border:1px solid rgba(59,130,246,.25);background:rgba(5,7,15,.45)}' +
    '.gzw-row .ico{display:grid;place-items:center;width:34px;height:34px;border-radius:10px;background:rgba(59,130,246,.18);color:#93c5fd}' +
    '.gzw-row .nm{flex:1;min-width:170px}.gzw-row .nm strong{display:block;color:var(--ink);font-weight:600}.gzw-row .nm small{color:var(--muted);font-size:12.5px}' +
    '.gzw-row .q{font:600 15px "IBM Plex Mono",monospace;color:#93c5fd;white-space:nowrap}' +
    '.gzw-total{margin:12px 0 2px;color:var(--muted);font-size:14px}.gzw-total b{color:#fff;font:700 22px "Bricolage Grotesque","IBM Plex Sans",sans-serif;margin-right:4px}' +
    '#start:disabled{opacity:.45;cursor:not-allowed}' +
    '.builder-head .tag{display:none !important}' +
    /* exit test */
    ':root body button.gzx-exit{color:#ff9a9a;background:rgba(255,107,107,.1) !important;border:1px solid rgba(255,107,107,.45) !important;border-radius:10px;padding:9px 14px;font:600 13.5px "IBM Plex Sans",system-ui,sans-serif;cursor:pointer}' +
    ':root body button.gzx-exit:hover{background:rgba(255,107,107,.2) !important}' +
    '.gzx-wrap{position:fixed;inset:0;z-index:100001;display:grid;place-items:center;padding:18px;background:rgba(3,6,14,.72)}' +
    '.gzx{width:min(440px,100%);padding:26px;border-radius:18px;background:rgba(5,7,15,.98);border:1px solid rgba(59,130,246,.3);box-shadow:0 30px 90px rgba(0,0,0,.6);color:var(--ink,#eef4ff);font:400 15px/1.55 "IBM Plex Sans",system-ui,sans-serif}' +
    '.gzx h3{margin:0 0 8px;font:800 21px "Bricolage Grotesque","IBM Plex Sans",sans-serif;color:#fff}.gzx p{margin:0 0 6px;color:#c3d3f5}' +
    '.gzx-row{display:flex;gap:10px;margin-top:20px;flex-wrap:wrap}.gzx-row button{flex:1;min-width:130px}' +
    ':root body button.gzx-go{color:#fff;background:linear-gradient(135deg,#ff6b6b,#d63a4a) !important;border:0 !important;border-radius:11px;padding:12px;font:600 14.5px "IBM Plex Sans",sans-serif;cursor:pointer}';
  document.head.appendChild(css);

  /* ------------------------------------------- 2. profile out of the sidebar */
  var np = g('nav-progress');
  if (np) {
    var navBox = np.parentElement;
    if (navBox) {
      navBox.classList.add('gz-hide');
      var tt = navBox.previousElementSibling;
      if (tt && /side-title/.test(tt.className || '')) tt.classList.add('gz-hide');
    }
  }
  var fab = document.createElement('button');
  fab.id = 'gz-pfab'; fab.type = 'button'; fab.className = 'gz-pfab'; fab.title = 'Profile'; fab.setAttribute('aria-label', 'Open profile');
  var ab = g('acct-btn');
  var letter = function () { fab.textContent = ((ab && ab.textContent.trim()) || 'G').charAt(0).toUpperCase(); };
  fab.onclick = function () { if (np) np.click(); };
  document.body.appendChild(fab); letter();
  if (ab) new MutationObserver(letter).observe(ab, { childList: true, characterData: true, subtree: true });
  if (np) new MutationObserver(function () { fab.classList.toggle('on', np.classList.contains('active')); }).observe(np, { attributes: true, attributeFilter: ['class'] });

  /* ------------------------------------------------ 3. profile: no flicker */
  (function () {
    if (typeof renderProgress !== 'function') return;
    var orig = renderProgress, running = false, last = null;
    var desc = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
    function guard(el) {
      if (el.__gzg) return; el.__gzg = 1;
      Object.defineProperty(el, 'innerHTML', {
        configurable: true,
        get: function () { return desc.get.call(this); },
        set: function (v) {
          v = String(v);
          if (v === last) return;                                                   /* same content: do not redraw */
          if (/gem-load/.test(v) && v.length < 200 && this.children.length) return;  /* keep what is on screen while loading */
          last = v; desc.set.call(this, v);
        }
      });
    }
    window.renderProgress = function () {
      var el = g('progress-body'); if (el) guard(el);
      if (running) return Promise.resolve();                                         /* overlapping calls are merged into the one in progress */
      running = true;
      var p;
      try { p = Promise.resolve(orig.apply(this, arguments)); } catch (e) { running = false; throw e; }
      return p.catch(function () {}).then(function () { running = false; });
    };
  })();

  /* ------------------------------------------------------ 5. exit test */
  function resetLiveSession() {
    try { clearInterval(timer); } catch (e) {}
    try { if (typeof clearSession === 'function') clearSession(); } catch (e) {}
    questions = []; answers = {}; checked = {}; index = 0; seconds = 0; mock = false; limitedMessage = ''; sessionDescription = ''; activeSession = false;
    try { if (typeof updateResumeUI === 'function') updateResumeUI(); } catch (e) {}
  }
  function exitTest() { resetLiveSession(); show('home'); }
  function confirmExit() {
    if (g('gzx-wrap')) return;
    var w = document.createElement('div'); w.id = 'gzx-wrap'; w.className = 'gzx-wrap';
    w.innerHTML = '<div class="gzx" role="dialog" aria-modal="true" aria-labelledby="gzx-t"><h3 id="gzx-t">Exit this test?</h3>' +
      '<p>Your answers in this set will <b>not be saved</b> and will <b>not appear in your analysis</b>.</p>' +
      '<p>Analysis is only created for sets you complete. To pause instead, use \u201cBack to studio\u201d and resume later.</p>' +
      '<div class="gzx-row"><button type="button" class="secondary" data-gzx="stay">Keep going</button><button type="button" class="gzx-go" data-gzx="exit">Exit test</button></div></div>';
    var close = function () { w.remove(); document.removeEventListener('keydown', esc); };
    var esc = function (e) { if (e.key === 'Escape') close(); };
    w.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('[data-gzx]');
      if (a && a.dataset.gzx === 'exit') { close(); exitTest(); } else if (a || e.target === w) close();
    });
    document.addEventListener('keydown', esc); document.body.appendChild(w);
    var first = w.querySelector('[data-gzx="stay"]'); if (first) first.focus();
  }
  var ph = document.querySelector('#session .page-head');
  if (ph && !g('gzx-exit')) {
    var xb = document.createElement('button'); xb.id = 'gzx-exit'; xb.type = 'button'; xb.className = 'gzx-exit'; xb.textContent = 'Exit test'; xb.onclick = confirmExit; ph.appendChild(xb);
  }
  var bn = g('active-session-banner');
  if (bn && !g('gzx-exit2')) {
    var xb2 = document.createElement('button'); xb2.id = 'gzx-exit2'; xb2.type = 'button'; xb2.className = 'gzx-exit'; xb2.textContent = 'Exit test'; xb2.onclick = confirmExit;
    var hr = g('home-resume'); if (hr && hr.parentNode) { var holder = document.createElement('div'); holder.style.cssText = 'display:flex;gap:10px;flex-wrap:wrap;align-items:center'; hr.parentNode.insertBefore(holder, hr); holder.appendChild(xb2); holder.appendChild(hr); }
  }
  /* one-time clean-up to match the database reset: unsent results and any paused test from before are dropped on this device */
  try {
    var RESET = 'gz-reset-20261124';
    if (!localStorage.getItem(RESET)) {
      localStorage.removeItem('gategrind-outbox-v1');
      if (typeof activeSession !== 'undefined' && activeSession) resetLiveSession(); else localStorage.removeItem('gategrind-active-session');
      localStorage.setItem(RESET, '1');
    }
  } catch (e) {}

  /* ------------------------------------ 4. builder: subject > topics > count */
  var builder = document.querySelector('.builder');
  if (!builder || typeof subjects === 'undefined' || typeof bank === 'undefined') return;

  var W = { plan: [], step: 'subject', cur: null, editing: -1 }, lastSig = '';
  var sig = function () { return JSON.stringify([selected, selectedTopics]); };
  var S = function (id) { return subjects.filter(function (s) { return s[0] === id; })[0]; };
  var short = function (id) { var s = S(id); return s ? s[2] : id; };
  function topicsOf(id) {
    var m = {}; bank.forEach(function (q) { if (subjectOf(q) === id) m[q.topic] = (m[q.topic] || 0) + 1; });
    return Object.keys(m).sort().map(function (t) { return { t: t, n: m[t] }; });
  }
  function poolOf(id, tops) { return bank.filter(function (q) { return subjectOf(q) === id && (!tops.length || tops.indexOf(q.topic) > -1); }); }
  function planIdx(id) { for (var i = 0; i < W.plan.length; i++) if (W.plan[i].sub === id) return i; return -1; }
  function total() { return W.plan.reduce(function (a, p) { return a + p.n; }, 0); }
  function toGlobals() {
    selected = W.plan.map(function (p) { return p.sub; });
    selectedTopics = [].concat.apply([], W.plan.map(function (p) { return p.topics; }));
    lastSig = sig();
  }

  /* hide the old subject cards / topic drop-down / count buttons (they stay in the page, untouched, just not shown) */
  ['.field-head', '#subjects', '#selection-note', '.filters'].forEach(function (sel) {
    var e = builder.querySelector(':scope > ' + sel); if (e) e.classList.add('gz-hide');
  });
  var rules = builder.querySelectorAll(':scope > hr.rule');
  if (rules[1]) rules[1].classList.add('gz-hide');
  var wiz = document.createElement('div'); wiz.id = 'gz-wiz'; wiz.className = 'gzw';
  if (rules[0]) rules[0].insertAdjacentElement('afterend', wiz); else builder.insertBefore(wiz, builder.children[1] || null);
  var hp = builder.querySelector('.builder-head p'); if (hp) hp.textContent = 'Pick a subject, choose its topics, then set how many questions. Repeat for every subject you want.';
  var htag = builder.querySelector('.builder-head .tag'); if (htag) htag.remove();

  function stepper(s) {
    var order = ['subject', 'topics', 'count'], names = ['Subject', 'Topics', 'Questions'], at = order.indexOf(s);
    return '<div class="gzw-steps">' + order.map(function (k, i) {
      return '<span class="gzw-step ' + (i === at ? 'on' : i < at ? 'done' : '') + '"><b>' + (i < at ? '\u2713' : i + 1) + '</b>' + names[i] + '</span>';
    }).join('') + '</div>';
  }
  function vSubject() {
    return '<h3>Choose a subject</h3><p class="gzw-sub">' + (W.plan.length ? 'Pick another subject to add to your set, or tap one you already added to change it.' : 'Start with one subject. Next you will choose its topics and how many questions you want.') + '</p>' +
      '<div class="subjects">' + subjects.map(function (s) {
        var i = planIdx(s[0]), p = W.plan[i];
        return '<button type="button" class="subject ' + (p ? 'selected' : '') + '" data-gzs="' + s[0] + '"><span class="ico">' + s[4] + '</span><strong>' + esc(s[1]) + '</strong><small>' +
          (p ? '\u2713 Added \u00b7 ' + p.n + ' question' + (p.n === 1 ? '' : 's') : poolOf(s[0], []).length + ' questions \u00b7 ' + topicsOf(s[0]).length + ' topics') + '</small></button>';
      }).join('') + '</div>' +
      (W.plan.length ? '<div class="gzw-nav"><button type="button" class="secondary" data-gz="cancel">\u2190 Back to my set</button></div>' : '');
  }
  function vTopics() {
    var c = W.cur, T = topicsOf(c.sub);
    return '<h3>Topics in ' + esc(S(c.sub)[1]) + '</h3><p class="gzw-sub">Tick the topics you want. Leave everything unticked to include all topics.</p>' +
      '<div class="gzw-nav" style="margin:0"><button type="button" class="secondary gzw-mini" data-gz="topall">Select all</button><button type="button" class="secondary gzw-mini" data-gz="topnone">Clear</button>' +
      '<span class="gzw-hint">' + (c.topics.length ? c.topics.length + ' of ' + T.length + ' selected' : 'All ' + T.length + ' topics') + '</span></div>' +
      '<div class="gzw-topics">' + T.map(function (x, i) {
        return '<button type="button" class="gzw-chip ' + (c.topics.indexOf(x.t) > -1 ? 'on' : '') + '" data-gzt="' + i + '">' + esc(x.t) + ' <small>' + x.n + '</small></button>';
      }).join('') + '</div>' +
      '<div class="gzw-nav"><button type="button" class="secondary" data-gz="t2s">\u2190 Back</button><button type="button" class="primary" data-gz="t2c">Next: number of questions \u2192</button></div>';
  }
  function limitOf(c) { return Math.min(MAX, poolOf(c.sub, c.topics).length); }
  function vCount() {
    var c = W.cur, mx = Math.max(1, limitOf(c)), avail = poolOf(c.sub, c.topics).length;
    var pre = [5, 10, 15, 20, 25, 30].filter(function (n) { return n <= mx; });
    if (pre.indexOf(mx) < 0) pre.push(mx);
    return '<h3>How many ' + esc(S(c.sub)[2]) + ' questions?</h3><p class="gzw-sub">Choose any number from 1 to ' + mx + (avail < MAX ? ' (that is all ' + avail + ' available for your topics)' : ' (maximum ' + MAX + ' per subject)') + '.</p>' +
      '<div class="gzw-bigrow"><span class="gzw-big" id="gzw-big">' + c.n + '</span><input class="gzw-range" id="gzw-range" type="range" min="1" max="' + mx + '" value="' + c.n + '" aria-label="Number of questions">' +
      '<input class="gzw-num" id="gzw-num" type="number" min="1" max="' + mx + '" value="' + c.n + '" aria-label="Number of questions"></div>' +
      '<div class="gzw-presets">' + pre.map(function (n) { return '<button type="button" class="gzw-chip ' + (n === c.n ? 'on' : '') + '" data-gzn="' + n + '">' + n + '</button>'; }).join('') + '</div>' +
      '<div class="gzw-nav"><button type="button" class="secondary" data-gz="c2t">\u2190 Back</button><button type="button" class="primary" data-gz="save">' + (W.editing > -1 ? 'Save changes' : 'Add ' + esc(S(c.sub)[2])) + '</button></div>';
  }
  function vSummary() {
    var rows = W.plan.map(function (p, i) {
      var T = topicsOf(p.sub), k = p.topics.length;
      return '<div class="gzw-row"><span class="ico">' + S(p.sub)[4] + '</span><div class="nm"><strong>' + esc(S(p.sub)[1]) + '</strong><small>' + (k ? k + ' of ' + T.length + ' topics' : 'All ' + T.length + ' topics') + '</small></div>' +
        '<span class="q">' + p.n + ' question' + (p.n === 1 ? '' : 's') + '</span>' +
        '<button type="button" class="secondary gzw-mini" data-gz="edit" data-i="' + i + '">Edit</button><button type="button" class="secondary gzw-mini" data-gz="rm" data-i="' + i + '">Remove</button></div>';
    }).join('');
    return '<h3>Your practice set</h3><p class="gzw-sub">Add as many subjects as you like. Each subject has its own topics and question count.</p>' + rows +
      '<div class="gzw-total"><b>' + total() + '</b> question' + (total() === 1 ? '' : 's') + ' across ' + W.plan.length + ' subject' + (W.plan.length === 1 ? '' : 's') + '</div>' +
      '<div class="gzw-nav">' + (W.plan.length < subjects.length ? '<button type="button" class="secondary" data-gz="add">+ Add another subject</button>' : '') + '<button type="button" class="secondary" data-gz="reset">Clear all</button></div>';
  }
  function upStart() {
    var b = g('start'); if (!b) return;
    b.disabled = !W.plan.length;
    b.textContent = W.plan.length ? 'Generate practice set \u00b7 ' + total() + ' questions' : 'Generate practice set';
    b.title = W.plan.length ? '' : 'Add at least one subject first';
  }
  function render() {
    var h = W.step === 'summary' ? vSummary() : stepper(W.step) + (W.step === 'subject' ? vSubject() : W.step === 'topics' ? vTopics() : vCount());
    wiz.innerHTML = h; upStart();
  }
  function setN(v, mx) {
    v = Math.max(1, Math.min(mx, Math.round(+v) || 1)); W.cur.n = v;
    var a = g('gzw-big'), r = g('gzw-range'), n = g('gzw-num');
    if (a) a.textContent = v; if (r) r.value = v; if (n && document.activeElement !== n) n.value = v;
    wiz.querySelectorAll('[data-gzn]').forEach(function (b) { b.classList.toggle('on', +b.dataset.gzn === v); });
  }

  wiz.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest('[data-gzs],[data-gz],[data-gzt],[data-gzn]'); if (!t) return;
    var d = t.dataset, c = W.cur;
    if (d.gzs) {
      var i = planIdx(d.gzs);
      W.editing = i; W.cur = i > -1 ? { sub: d.gzs, topics: W.plan[i].topics.slice(), n: W.plan[i].n } : { sub: d.gzs, topics: [], n: 10 };
      W.step = 'topics'; return render();
    }
    if (d.gzt !== undefined && c) {
      var T = topicsOf(c.sub), name = T[+d.gzt].t, k = c.topics.indexOf(name);
      if (k > -1) c.topics.splice(k, 1); else c.topics.push(name);
      return render();
    }
    if (d.gzn !== undefined && c) return setN(d.gzn, Math.max(1, limitOf(c)));
    switch (d.gz) {
      case 'cancel': W.step = 'summary'; break;
      case 'add': W.step = 'subject'; W.editing = -1; break;
      case 'topall': c.topics = topicsOf(c.sub).map(function (x) { return x.t; }); break;
      case 'topnone': c.topics = []; break;
      case 't2s': W.step = 'subject'; break;
      case 't2c': var mx = Math.max(1, limitOf(c)); c.n = Math.max(1, Math.min(mx, c.n || 10)); W.step = 'count'; break;
      case 'c2t': W.step = 'topics'; break;
      case 'save':
        if (c.topics.length === topicsOf(c.sub).length) c.topics = [];
        c.n = Math.max(1, Math.min(Math.max(1, limitOf(c)), c.n || 1));
        var at = planIdx(c.sub);
        if (at > -1) W.plan[at] = c; else W.plan.push(c);
        W.cur = null; W.editing = -1; W.step = 'summary'; toGlobals(); break;
      case 'edit': var p = W.plan[+t.dataset.i]; W.editing = +t.dataset.i; W.cur = { sub: p.sub, topics: p.topics.slice(), n: p.n }; W.step = 'topics'; break;
      case 'rm': W.plan.splice(+t.dataset.i, 1); W.step = W.plan.length ? 'summary' : 'subject'; toGlobals(); break;
      case 'reset': W.plan = []; W.cur = null; W.editing = -1; W.step = 'subject'; toGlobals(); break;
    }
    render();
  });
  wiz.addEventListener('input', function (e) {
    if (!W.cur) return;
    var mx = Math.max(1, limitOf(W.cur));
    if (e.target.id === 'gzw-range') setN(e.target.value, mx);
    else if (e.target.id === 'gzw-num' && e.target.value !== '') setN(e.target.value, mx);
  });
  wiz.addEventListener('change', function (e) {
    if (e.target.id === 'gzw-num' && W.cur) { var mx = Math.max(1, limitOf(W.cur)); setN(e.target.value, mx); e.target.value = W.cur.n; }
  });

  /* generate: every subject contributes exactly the number you chose, spread evenly over its topics */
  function generate() {
    if (!W.plan.length) return;
    var out = [], parts = [];
    W.plan.forEach(function (p) {
      var pool = poolOf(p.sub, p.topics), n = Math.min(p.n, pool.length), pick;
      try { pick = rrPick(Array.from(groupBy(shuffleQuestions(pool), function (q) { return q.topic; }).values()), n); }
      catch (err) { pick = shuffleQuestions(pool).slice(0, n); }
      out = out.concat(shuffleQuestions(pick)); parts.push(short(p.sub) + ' ' + pick.length);
    });
    toGlobals();
    mock = false; startedAt = Date.now(); questions = out; limitedMessage = '';
    answers = {}; checked = {}; index = 0; seconds = 0;
    sessionDescription = questions.length + ' questions \u00b7 ' + parts.join(', ');
    activeSession = questions.length > 0;
    g('session-mode').textContent = mode === 'Timed' ? '\u25f7 Timed mode \u00b7 00:00' : 'Practice mode';
    clearInterval(timer);
    show('session'); renderQuestion();
    if (activeSession) { persistSession(); if (mode === 'Timed') timer = setInterval(tick, 1000); }
    else { clearSession(); g('next').disabled = true; }
  }
  var startBtn = g("start"); if (startBtn) startBtn.onclick = generate;

  /* when other parts of the site pre-select things ("Practise this topic", weak topics, resume), mirror that in the flow */
  function fromGlobals() {
    if (sig() === lastSig) return;
    var cnt = (typeof count === 'number' && count) || 20, subs = selected.slice();
    W.plan = subs.map(function (id) {
      var tl = topicsOf(id).map(function (x) { return x.t; }), chosen = selectedTopics.filter(function (t) { return tl.indexOf(t) > -1; });
      if (chosen.length === tl.length) chosen = [];
      var av = poolOf(id, chosen).length, n = Math.max(1, Math.min(MAX, av, subs.length === 1 ? cnt : Math.round(cnt / subs.length)));
      return { sub: id, topics: chosen, n: n };
    });
    W.cur = null; W.editing = -1; W.step = W.plan.length ? 'summary' : 'subject'; lastSig = sig(); render();
  }
  if (typeof renderSubjects === 'function') {
    var rs = renderSubjects;
    window.renderSubjects = function () { var r = rs.apply(this, arguments); try { fromGlobals(); } catch (err) {} return r; };
  }

  fromGlobals(); lastSig = sig(); render();
})();