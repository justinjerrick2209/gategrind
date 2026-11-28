/* Gate Zone: Question library upgrade.
   - "PYQ mode" switch (All questions | PYQ only) inside the Question library page
   - compact drop-down filters (multi-select): Year, Type, Subjects, Topics
   - "Practise" drop-down that starts a session from whatever is currently filtered
   Loaded after the main script in index.html (reuses bank, subjects, subjectOf, show, start helpers). */
(function () {
  var $$ = function (id) { return document.getElementById(id); };
  var lib = $$('library'); if (!lib) return;
  var S = { pyq: false, years: [], types: [], subs: [], tops: [], count: 20, mode: 'Practice', open: '', shown: 60 };
  var TYPES = ['MCQ', 'MSQ', 'NAT'], COUNTS = [10, 20, 30, 50, 'All'];
  var all = window.QUESTION_BANK || [];
  var base = function () { return S.pyq ? all.filter(function (q) { return q.year; }) : all; };
  var inSet = function (a, v) { return !a.length || a.indexOf(v) > -1; };
  function filt(skip) {
    return base().filter(function (q) {
      return (!S.pyq || skip === 'years' || inSet(S.years, q.year)) && (skip === 'types' || inSet(S.types, q.type)) &&
        (skip === 'subs' || inSet(S.subs, subjectOf(q))) && (skip === 'tops' || inSet(S.tops, q.topic));
    });
  }
  var toggle = function (a, v) { return a.indexOf(v) > -1 ? a.filter(function (x) { return x !== v; }) : a.concat([v]); };
  var sname = function (id) { var s = subjects.filter(function (x) { return x[0] === id; })[0]; return s ? s[2] : id; };

  var css = document.createElement('style');
  css.textContent =
    '#lib-subject,#lib-topic{display:none !important}' +
    '#lz-bar{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin:4px 0 16px;position:relative;z-index:30}' +
    '.lz-seg{display:inline-flex;padding:4px;border-radius:14px;border:1px solid rgba(59,130,246,.3);background:rgba(5,7,15,.55);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px)}' +
    '.lz-seg button{border:0;background:none;color:var(--muted);font:600 13.5px "IBM Plex Sans",sans-serif;padding:9px 16px;border-radius:10px;cursor:pointer;transition:.2s}' +
    '.lz-seg button.on{color:#fff;background:rgba(59,130,246,.26);box-shadow:0 0 14px -4px rgba(59,130,246,.65),inset 0 0 0 1px rgba(59,130,246,.5)}' +
    '.lz-dd{position:relative}' +
    '.lz-btn{display:inline-flex;align-items:center;gap:10px;padding:10px 14px;border-radius:12px;border:1px solid rgba(59,130,246,.3);background:rgba(5,7,15,.55);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);color:var(--ink);cursor:pointer;font:500 13.5px "IBM Plex Sans",sans-serif;transition:border-color .2s,transform .2s}' +
    '.lz-btn:hover{border-color:#93c5fd;transform:translateY(-1px)}' +
    '.lz-btn em{font-style:normal;color:var(--muted)}.lz-btn b{color:#93c5fd;font-weight:600}' +
    '.lz-btn i{font-style:normal;font-size:11px;transition:transform .2s;color:var(--muted)}' +
    '.lz-dd.open .lz-btn{border-color:#93c5fd}.lz-dd.open .lz-btn i{transform:rotate(180deg)}' +
    '.lz-pop{position:absolute;top:calc(100% + 8px);left:0;min-width:260px;max-width:340px;padding:10px;border-radius:14px;border:1px solid rgba(59,130,246,.35);background:rgba(5,7,15,.96);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);box-shadow:0 24px 60px rgba(0,0,0,.55);animation:lzpop .18s ease}' +
    '@keyframes lzpop{from{opacity:0;transform:translateY(-6px) scale(.98)}to{opacity:1;transform:none}}' +
    '.lz-acts{display:flex;justify-content:space-between;padding:2px 4px 8px}.lz-acts button{background:none;border:0;color:#93c5fd;cursor:pointer;font:600 12.5px "IBM Plex Sans",sans-serif}' +
    '.lz-opts{max-height:280px;overflow:auto}' +
    '.lz-opt{display:flex;align-items:center;gap:10px;padding:8px 8px;border-radius:9px;cursor:pointer;color:var(--ink);font-size:14px}' +
    '.lz-opt:hover{background:rgba(147,197,253,.14)}.lz-opt input{accent-color:#60a5fa;width:16px;height:16px}' +
    '.lz-opt span{flex:1}.lz-opt small{color:var(--muted);font:500 11.5px "IBM Plex Mono",monospace}' +
    '.lz-opt.off{opacity:.45}' +
    '.lz-chips{display:flex;flex-wrap:wrap;gap:6px;padding:2px 2px 10px}' +
    '.lz-chip{padding:8px 13px;border-radius:10px;border:1px solid rgba(59,130,246,.3);background:rgba(255,255,255,.05);color:var(--ink);cursor:pointer;font:500 13px "IBM Plex Sans",sans-serif}' +
    '.lz-chip.on{border-color:#60a5fa;color:#fff;background:rgba(59,130,246,.26)}' +
    '.lz-h{font:600 11px "IBM Plex Mono",monospace;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);padding:4px 4px 6px}' +
    '.lz-go{width:100%;padding:12px;border:0;border-radius:11px;cursor:pointer;color:#00040f;font:600 14.5px "IBM Plex Sans",sans-serif;border:1px solid rgba(147,197,253,.45);background:linear-gradient(135deg,#2563eb 0%,#2563eb 100%);box-shadow:0 10px 26px -12px rgba(37,99,235,.8)}' +
    '.lz-go:disabled{opacity:.4;cursor:not-allowed}' +
    '.lz-sp{flex:1}' +
    '.lz-more{display:block;margin:14px auto;padding:11px 22px;border-radius:12px;border:1px solid rgba(59,130,246,.35);background:rgba(5,7,15,.55);color:var(--ink);cursor:pointer;font:600 14px "IBM Plex Sans",sans-serif}';
  document.head.appendChild(css);

  var bar = document.createElement('div'); bar.id = 'lz-bar';
  var list = $$('library-list'); list.parentNode.insertBefore(bar, list);

  function sum(arr, fmt) { return arr.length ? (arr.length > 2 ? arr.length + ' selected' : arr.map(fmt || String).join(', ')) : 'All'; }
  function dd(key, label, arr, fmt, items, extraActs) {
    var open = S.open === key;
    return '<div class="lz-dd ' + (open ? 'open' : '') + '"><button type="button" class="lz-btn" data-dd="' + key + '"><em>' + label + '</em><b>' + esc(sum(arr, fmt)) + '</b><i>▾</i></button>' +
      (open ? '<div class="lz-pop"><div class="lz-acts"><button type="button" data-clear="' + key + '">Clear</button>' + (extraActs || '') + '</div><div class="lz-opts">' +
        items.map(function (it) {
          return '<label class="lz-opt ' + (it.n === 0 && arr.indexOf(it.v) < 0 ? 'off' : '') + '"><input type="checkbox" data-k="' + key + '" data-v="' + esc(String(it.v)) + '"' + (arr.indexOf(it.v) > -1 ? ' checked' : '') + '><span>' + esc(it.t) + '</span><small>' + it.n + '</small></label>';
        }).join('') + '</div></div>' : '') + '</div>';
  }
  function renderBar() {
    var keep = bar.querySelector('.lz-opts'), st = keep ? keep.scrollTop : 0;
    var fy = filt('years'), ft = filt('types'), fs = filt('subs'), fp = filt('tops');
    var years = [2024, 2025, 2026].map(function (y) { return { v: y, t: 'GATE ' + y, n: fy.filter(function (q) { return q.year === y; }).length }; });
    var types = TYPES.map(function (t) { return { v: t, t: t, n: ft.filter(function (q) { return q.type === t; }).length }; });
    var subs = subjects.map(function (s) { return { v: s[0], t: s[1], n: fs.filter(function (q) { return subjectOf(q) === s[0]; }).length }; });
    var tn = Array.from(new Set(base().filter(function (q) { return inSet(S.subs, subjectOf(q)); }).map(function (q) { return q.topic; }))).sort();
    S.tops = S.tops.filter(function (t) { return tn.indexOf(t) > -1; });
    var tops = tn.map(function (t) { return { v: t, t: t, n: fp.filter(function (q) { return q.topic === t; }).length }; });
    var m = filt().length, n = S.count === 'All' ? m : Math.min(S.count, m), pr = S.open === 'go';
    bar.innerHTML =
      '<div class="lz-seg"><button type="button" data-pyq="0" class="' + (S.pyq ? '' : 'on') + '">All questions</button><button type="button" data-pyq="1" class="' + (S.pyq ? 'on' : '') + '">PYQ mode</button></div>' +
      (S.pyq ? dd('years', 'Year', S.years, function (y) { return y; }, years) : '') +
      dd('types', 'Type', S.types, String, types) +
      dd('subs', 'Subjects', S.subs, sname, subs, '<button type="button" data-allsubs="1">Select all</button>') +
      dd('tops', 'Topics', S.tops, String, tops) +
      '<span class="lz-sp"></span>' +
      '<div class="lz-dd ' + (pr ? 'open' : '') + '"><button type="button" class="lz-btn" data-dd="go" style="background:rgba(59,130,246,.2)"><em>Practise</em><b>' + n + ' questions</b><i>▾</i></button>' +
      (pr ? '<div class="lz-pop" style="left:auto;right:0"><div class="lz-h">Number of questions</div><div class="lz-chips">' +
        COUNTS.map(function (c) { return '<button type="button" class="lz-chip ' + (S.count === c ? 'on' : '') + '" data-count="' + c + '">' + c + '</button>'; }).join('') + '</div><div class="lz-h">Mode</div><div class="lz-chips">' +
        ['Practice', 'Timed'].map(function (c) { return '<button type="button" class="lz-chip ' + (S.mode === c ? 'on' : '') + '" data-mode2="' + c + '">' + c + '</button>'; }).join('') + '</div>' +
        '<button type="button" class="lz-go" id="lz-go"' + (m ? '' : ' disabled') + '>Start ' + n + '-question set</button></div>' : '') + '</div>';
    var o = bar.querySelector('.lz-opts'); if (o) o.scrollTop = st;
  }

  function item(q) {
    return '<article class="item library-item"><span class="item-meta">' + esc(q.subject) + ' · ' + esc(q.topic) + ' · ' + q.type + (q.year ? ' · GATE ' + q.year + ' Q' + q.examQuestion : ' · Question bank') + '</span><div class="library-preview">' +
      (q.image ? '<a class="library-preview-link" href="' + esc(q.image) + '" target="_blank" rel="noreferrer"><img class="library-preview-image" src="' + esc(q.image) + '" alt="Full original question, including diagrams and formulas" loading="lazy"></a>' : '<p>' + esc(q.text) + '</p>') +
      '</div><div class="library-actions"><details><summary>' + (q.year ? 'Official answer & source note' : 'Solution') + '</summary><p class="answer">' + esc(q.answer) + '</p>' +
      (q.solutionImages || []).map(function (src) { return '<img class="review-visual" src="' + esc(src) + '" alt="Worked solution" loading="lazy">'; }).join('') +
      '</details><button data-practice-sub="' + subjectOf(q) + '" data-practice-topic="' + esc(q.topic) + '">Practise this topic →</button></div></article>';
  }
  function renderList() {
    var qy = ($$('search').value || '').toLowerCase();
    var pool = filt().filter(function (q) { return !qy || (q.text + ' ' + q.topic + ' ' + q.subject + ' ' + (q.year || '')).toLowerCase().indexOf(qy) > -1; });
    $$('library-count').textContent = pool.length + (S.pyq ? ' previous-year questions' : ' questions');
    list.innerHTML = pool.slice(0, S.shown).map(item).join('') +
      (pool.length > S.shown ? '<button type="button" class="lz-more" id="lz-more">Show more (' + (pool.length - S.shown) + ' left)</button>' : '') +
      (pool.length ? '' : '<p class="hint">No questions match these filters.</p>');
    document.querySelectorAll('[data-practice-topic]').forEach(function (b) {
      b.onclick = function () {
        selected = [b.dataset.practiceSub]; selectedTopics = [b.dataset.practiceTopic]; count = 20;
        document.querySelectorAll('.counts button').forEach(function (x) { x.classList.toggle('active', +x.textContent === count); });
        renderSubjects(); renderTopics(); show('home');
      };
    });
  }
  function refresh(resetShown) { if (resetShown) S.shown = 60; renderBar(); renderList(); }
  window.library = function () { refresh(true); };
  $$('search').oninput = window.library;

  function startSet() {
    var p = filt(); if (!p.length) return;
    var n = S.count === 'All' ? p.length : Math.min(S.count, p.length), sh = shuffleQuestions(p), picked;
    try { picked = shuffleQuestions(rrPick(Array.from(groupBy(sh, subjectOf).values()), n)); } catch (e) { picked = sh.slice(0, n); }
    mock = false; startedAt = Date.now(); mode = S.mode;
    document.querySelectorAll('[data-mode]').forEach(function (b) { b.classList.toggle('active', b.dataset.mode === mode); });
    questions = picked; limitedMessage = ''; answers = {}; checked = {}; index = 0; seconds = 0;
    sessionDescription = questions.length + ' questions · ' + (S.pyq ? 'PYQ' + (S.years.length ? ' ' + S.years.join(', ') : ' 2024–2026') : 'Library') +
      (S.types.length ? ' · ' + S.types.join('/') : '') + (S.subs.length ? ' · ' + S.subs.map(sname).join(', ') : ' · All subjects') + (S.tops.length ? ' · ' + S.tops.length + ' topics' : '');
    activeSession = questions.length > 0;
    $$('session-mode').textContent = mode === 'Timed' ? '◷ Timed mode · 00:00' : 'Practice mode';
    clearInterval(timer); S.open = ''; show('session'); renderQuestion();
    if (activeSession) { persistSession(); if (mode === 'Timed') timer = setInterval(tick, 1000); }
  }

  document.addEventListener('click', function (e) {
    var t = e.target, c;
    if (!t.closest) return;
    if (S.open && !t.closest('.lz-dd')) { S.open = ''; renderBar(); }
    if (t.closest('#lz-more')) { S.shown += 60; renderList(); return; }
    if (!t.closest('#lz-bar')) return;
    if ((c = t.closest('[data-dd]'))) { S.open = S.open === c.dataset.dd ? '' : c.dataset.dd; renderBar(); return; }
    if ((c = t.closest('[data-pyq]'))) { S.pyq = c.dataset.pyq === '1'; S.open = ''; refresh(true); return; }
    if ((c = t.closest('[data-clear]'))) { S[c.dataset.clear] = []; refresh(true); return; }
    if (t.closest('[data-allsubs]')) { S.subs = S.subs.length === subjects.length ? [] : subjects.map(function (s) { return s[0]; }); refresh(true); return; }
    if ((c = t.closest('[data-count]'))) { S.count = c.dataset.count === 'All' ? 'All' : +c.dataset.count; renderBar(); return; }
    if ((c = t.closest('[data-mode2]'))) { S.mode = c.dataset.mode2; renderBar(); return; }
    if (t.closest('#lz-go')) { startSet(); return; }
  });
  document.addEventListener('change', function (e) {
    var c = e.target; if (!c.dataset || !c.dataset.k || !c.closest('#lz-bar')) return;
    var v = c.dataset.k === 'years' ? +c.dataset.v : c.dataset.v;
    S[c.dataset.k] = toggle(S[c.dataset.k], v); refresh(true);
  });
  refresh();
})();