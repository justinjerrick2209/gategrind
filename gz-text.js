/* Gate Zone: show every question as real text in the UI instead of a picture (additive: changes none of your existing code).
   - Reads questions_text.js (made by run-all.bat / Convert.mjs). It contains ONLY the question and its options:
     no "12 . MSQ . 2 marks" header, no question number, no blue/teal banner lines, no watermark.
   - Every question picture (Library, Practice session, Review, Saved) is replaced by that text, with maths shown by KaTeX.
   - If a question has a graph/diagram, only that figure is cropped out of the picture and shown under the text.
   - A question with no text yet keeps its (cleaned) picture, so nothing ever disappears. Solution pictures are never touched.
   Loaded with ONE line at the end of index.html, after gz-fixes.js:  <script src="gz-text.js"></script> */
(function () {
  if (window.__gzText) return; window.__gzText = 1;

  var st = document.createElement('style');
  st.textContent =
    '.gz-qtext{color:var(--ink,#fff);font:400 17px/1.65 "IBM Plex Sans",system-ui,sans-serif;padding:4px 2px;border:0;box-shadow:none;background:none}' +
    '.gz-qtext p{margin:0 0 .7em}.gz-qtext pre{overflow:auto;padding:12px;border-radius:10px;background:rgba(255,255,255,.06)}' +
    '.gz-qtext table{border-collapse:collapse;margin:.6em 0}.gz-qtext th,.gz-qtext td{border:1px solid rgba(59,130,246,.3);padding:6px 12px}' +
    '.gz-qtext .katex-display{overflow-x:auto;overflow-y:hidden}' +
    '.gz-opts{margin-top:14px;display:grid;gap:8px}' +
    '.gz-opt{display:flex;gap:10px;align-items:baseline}.gz-opt>b{flex:none;min-width:2.2em;color:#93c5fd;font-weight:600}.gz-opt>div p{margin:0}' +
    '.gz-fig{position:relative;overflow:hidden;width:100%;margin:14px 0 4px;background:#fff;border-radius:10px;box-shadow:0 0 0 1px rgba(59,130,246,.25)}' +
    '.gz-fig img{display:block}' +
    /* pictures that are still pictures: fill the column instead of the fixed pixel width the page gives them */
    '.app img.qimg,.app img[data-gz-q]{width:100% !important;max-width:1100px !important;height:auto !important}' +
    '.app .library-preview-link{width:100% !important;max-width:1100px}' +
    '.app .library-preview,.app .visual,.app .gz-qtext{max-width:none}';
  document.head.appendChild(st);

  var file = function (p) { try { p = decodeURI(String(p || '')); } catch (e) { p = String(p || ''); } return p.split('?')[0].split('#')[0].split('/').pop(); };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var BY = null;   /* image file name -> question id */

  function md(t) {
    t = String(t == null ? '' : t);
    if (!(window.marked && window.DOMPurify)) return esc(t).replace(/\n/g, '<br>');
    var M = [], hold = function (e, d) { M.push([e, d]); return '@@M' + (M.length - 1) + '@@'; };
    var x = t.replace(/\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\]/g, function (a, b, c) { return hold(b || c, true); })
             .replace(/\$([^$\n]+?)\$|\\\(([\s\S]+?)\\\)/g, function (a, b, c) { return hold(b || c, false); });
    return DOMPurify.sanitize(marked.parse(x, { gfm: true })).replace(/@@M(\d+)@@/g, function (a, i) {
      var m = M[i];
      try { return window.katex ? katex.renderToString(m[0].trim(), { displayMode: m[1], throwOnError: false }) : esc(m[0]); } catch (e) { return esc(m[0]); }
    });
  }

  function figure(src, box) {
    var w = document.createElement('div'); w.className = 'gz-fig';
    var im = new Image(); im.alt = 'Figure'; im.setAttribute('data-gz-fig', ''); im.src = src;
    im.onload = function () {
      var W = im.naturalWidth, H = im.naturalHeight, x0 = box[1] / 1000 * W, y0 = box[0] / 1000 * H, bw = (box[3] - box[1]) / 1000 * W, bh = (box[2] - box[0]) / 1000 * H;
      w.style.aspectRatio = bw + ' / ' + bh; w.style.maxWidth = Math.round(Math.min(bw, 720)) + 'px';
      im.style.cssText = 'position:absolute;max-width:none;width:' + (W / bw * 100) + '%;left:' + (-x0 / bw * 100) + '%;top:' + (-y0 / bh * 100) + '%';
    };
    w.appendChild(im); return w;
  }

  function build(c, src) {
    var d = document.createElement('div'); d.className = 'gz-qtext';
    d.innerHTML = md(c.q);
    if (c.fig && c.box) d.appendChild(figure(src, c.box));
    var keys = Object.keys(c.opts || {}).sort();
    if (keys.length) {
      var o = document.createElement('div'); o.className = 'gz-opts';
      o.innerHTML = keys.map(function (k) { return '<div class="gz-opt"><b>(' + esc(k) + ')</b><div>' + md(c.opts[k]) + '</div></div>'; }).join('');
      d.appendChild(o);
    }
    return d;
  }

  function handle(img) {
    if (!BY || img.hasAttribute('data-gz-fig') || img.__gzt) return;
    var src = img.__gz || img.getAttribute('src'); if (!src) return;
    var id = BY[file(src)], c = id && window.QUESTION_TEXT && window.QUESTION_TEXT[id];
    if (!c || !c.q) return;
    img.__gzt = 1;
    var a = img.closest && img.closest('a.library-preview-link'), host = a || img;
    var node = build(c, src);
    if (host.parentNode) host.parentNode.replaceChild(node, host);
  }
  function scan(root) { if (!root || root.nodeType !== 1) return; if (root.tagName === 'IMG') handle(root); else root.querySelectorAll('img').forEach(handle); }

  function start() {
    var bank = window.QUESTION_BANK || [], sol = new Set();
    BY = {};
    bank.forEach(function (q) { (q.solutionImages || []).forEach(function (s) { sol.add(file(s)); }); });
    bank.forEach(function (q) { if (q.image && !sol.has(file(q.image))) BY[file(q.image)] = q.id; });
    new MutationObserver(function (ms) { ms.forEach(function (m) { m.addedNodes.forEach(scan); }); })
      .observe(document.body, { childList: true, subtree: true });
    scan(document.body);
  }

  /* load the text file, then start; if it does not exist yet, do nothing and the pictures stay as they are */
  var s = document.createElement('script'); s.src = 'questions_text.js';
  s.onload = function () { if (window.QUESTION_TEXT) start(); };
  document.head.appendChild(s);
})();