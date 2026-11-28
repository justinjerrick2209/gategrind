/* Gate Zone fixes (additive: does not change any of your existing code).
   1. Topics / Subjects drop-downs always open IN FRONT of the cards below them.
   2. Question pictures show ONLY the question: the coloured banner (MSQ / NAT strip), the small header line
      ("12 . MSQ . 2 marks" with the red number) and the question-number label are removed in the browser,
      using the same cleaning routine as Clean-Images.mjs. Graphs, tables and diagrams are kept.
      Pictures that are already clean are left exactly as they are. Solution pictures are never touched.
   3. The original exam number ("Q12") is hidden from the labels so every question looks the same.
   Loaded with ONE line at the end of index.html:  <script src="gz-fixes.js"></script> */
(function () {
  if (window.__gzFixes) return; window.__gzFixes = 1;

  /* ---------- 1. stacking: open drop-downs must not be painted over ---------- */
  var st = document.createElement('style');
  st.textContent =
    ':root body .builder{position:relative;z-index:30}' +
    ':root body .quick-mix,:root body .lower,:root body .lower-card{position:relative;z-index:1}' +
    ':root body #lz-bar{position:relative;z-index:60}' +
    'img[data-gz-q]{transition:opacity .18s}img[data-gz-q]:not([data-gz-done]){opacity:0}';
  document.head.appendChild(st);

  /* ---------- 2. clean question pictures in the browser ---------- */
  var lum = function (r, g, b) { return 0.299 * r + 0.587 * g + 0.114 * b; };
  var sat = function (r, g, b) { return Math.max(r, g, b) - Math.min(r, g, b); };
  function gzClean(src, W, H, { solution = false, watermark = true } = {}) {
    const D = Uint8Array.from(src), notes = [];
    const px = (x, y) => (y * W + x) * 3;
    const whiteRows = (a, z) => { for (let y = Math.max(0, a); y <= Math.min(H - 1, z); y++) D.fill(255, y * W * 3, (y + 1) * W * 3); };
  
    // 1. coloured banners: rows where most pixels are a mid-tone colour fill and the fill spans nearly the full width
    const fillRow = new Uint8Array(H);
    for (let y = 0; y < H; y++) {
      let n = 0, a = W, z = -1;
      for (let x = 0, o = y * W * 3; x < W; x++, o += 3) {
        const r = D[o], g = D[o + 1], b = D[o + 2], l = lum(r, g, b), s = sat(r, g, b);
        if (s >= 35 && l >= 40 && l <= 245) { n++; if (x < a) a = x; if (x > z) z = x; }
      }
      if (n >= 0.45 * W && z - a >= 0.8 * W) fillRow[y] = 1;
    }
    const bands = []; let cur = null;
    for (let y = 0; y < H; y++) if (fillRow[y]) { if (cur && y - cur.y1 <= 8) cur.y1 = y; else { cur = { y0: y, y1: y }; bands.push(cur); } }
    for (const b of bands) {
      const mid = (b.y0 + b.y1) / 2, thick = b.y1 - b.y0 + 1;
      if (thick > 0.5 * H) { notes.push('large colour area kept (part of the picture)'); continue; }
      if (mid < 0.4 * H || mid > 0.5 * H) { whiteRows(b.y0 - 3, b.y1 + 3); notes.push(mid < 0.4 * H ? 'top banner' : 'bottom banner'); }
      else notes.push('colour band in the middle kept');
    }
  
    // 2. watermark: pale coloured or pale grey pixels become white; mid-grey edges of real text are left alone
    if (watermark) {
      for (let o = 0; o < D.length; o += 3) {
        const r = D[o], g = D[o + 1], b = D[o + 2], l = lum(r, g, b), s = sat(r, g, b);
        if (s >= 22 && l >= 170) { D[o] = D[o + 1] = D[o + 2] = 255; }
        else if (l >= 215) { D[o] = D[o + 1] = D[o + 2] = 255; }
        else if (l > 175) { const f = (l - 175) / 40; D[o] = r + (255 - r) * f; D[o + 1] = g + (255 - g) * f; D[o + 2] = b + (255 - b) * f; }
      }
    }
    const ink = (x, y) => { const o = px(x, y); const r = D[o], g = D[o + 1], b = D[o + 2]; return lum(r, g, b) < 200 || sat(r, g, b) >= 45; };
  
    // 2b. exam-paper tables: remove the grid lines (long thin black rules) and the question-number label ("Q.2") in the first row
    let tableMode = false;
    {
      const dark = (x, y) => { const o = px(x, y); return lum(D[o], D[o + 1], D[o + 2]) < 190; };
      const hRows = [], vCols = [];
      for (let y = 0; y < H; y++) { let n = 0; for (let x = 0; x < W; x++) if (dark(x, y)) n++; if (n >= 0.7 * W) hRows.push(y); }
      for (let x = 0; x < W; x++) { let n = 0; for (let y = 0; y < H; y++) if (dark(x, y)) n++; if (n >= 0.7 * H) vCols.push(x); }
      const hLines = hRows.filter((y, i) => i === 0 || y - hRows[i - 1] > 1).length;
      if (hLines >= 2 && hRows.length <= 6 * hLines) {
        tableMode = true;
        for (const y of hRows) whiteRows(y - 1, y + 1);
        for (const x of vCols) for (let y = 0; y < H; y++) for (let k = -1; k <= 1; k++) { const xx = x + k; if (xx >= 0 && xx < W) { const o = px(xx, y); D[o] = D[o + 1] = D[o + 2] = 255; } }
        notes.push('table lines removed');
        // first text row: if it starts with a short label at the far left, followed by a clear gap, remove the label
        const rowHas = y => { for (let x = 0; x < W; x++) if (ink(x, y)) return true; return false; };
        let y0 = 0; while (y0 < H && !rowHas(y0)) y0++;
        let y1 = y0; while (y1 < H && rowHas(y1)) y1++;
        if (y0 < H) {
          const colInk = new Uint8Array(W);
          for (let y = y0; y < y1; y++) for (let x = 0; x < W; x++) if (ink(x, y)) colInk[x] = 1;
          let x = 0; while (x < W && !colInk[x]) x++;
          const start = x; let end = x, gap = 0;
          for (; x < W; x++) { if (colInk[x]) { end = x; gap = 0; } else if (++gap >= Math.max(16, 0.025 * W)) break; }
          let more = false; for (let k = end + 1; k < W; k++) if (colInk[k]) { more = true; break; }
          if (more && start < 0.15 * W && end - start < 0.14 * W) {
            for (let y = y0 - 1; y <= y1; y++) for (let k = Math.max(0, start - 2); k <= end + 2; k++) if (y >= 0 && y < H) { const o = px(k, y); D[o] = D[o + 1] = D[o + 2] = 255; }
            notes.push('question number');
          }
        }
      }
    }
  
    // 3. rows of ink, then the small header line (red number at the left) on question pictures
    const rowInk = new Int32Array(H);
    for (let y = 0; y < H; y++) { let n = 0; for (let x = 0; x < W; x++) if (ink(x, y)) n++; rowInk[y] = n; }
    const groups = []; let g = null;
    for (let y = 0; y < H; y++) { if (rowInk[y] >= 1) { if (g && y - g.y1 <= 2) g.y1 = y; else { g = { y0: y, y1: y }; groups.push(g); } } }
    // drop tiny leftovers (a few stray pixels, the end of a removed strip) so they cannot hide the header or widen the crop
    for (let i = groups.length - 1; i >= 0; i--) {
      const q = groups[i]; let n = 0;
      for (let y = q.y0; y <= q.y1; y++) for (let x = 0; x < W; x++) if (ink(x, y)) n++;
      if (n < 40 && groups.length > 1) { whiteRows(q.y0, q.y1); groups.splice(i, 1); notes.push('stray speck'); }
    }
    if (!solution && groups.length > 1) {
      const h = groups[0]; let a = W, z = -1, red = 0;
      for (let y = h.y0; y <= h.y1; y++) for (let x = 0; x < W; x++) if (ink(x, y)) {
        if (x < a) a = x; if (x > z) z = x;
        const o = px(x, y), r = D[o], gg = D[o + 1], b = D[o + 2];
        if (r > 150 && r - gg > 60 && r - b > 40) red++;
      }
      if (red >= 4 && z - a < 0.45 * W && a < 0.2 * W && h.y1 - h.y0 + 1 <= Math.max(34, 0.12 * H)) { whiteRows(h.y0 - 1, h.y1 + 1); groups.shift(); notes.push('header line'); }
    }
    if (!groups.length) return { out: D, crop: null, notes: ['no content found, left unchanged'] };
  
    // 4. crop to the ink
    const y0 = groups[0].y0, y1 = groups[groups.length - 1].y1;
    const col = new Int32Array(W);
    for (let y = y0; y <= y1; y++) for (let x = 0; x < W; x++) if (ink(x, y)) col[x]++;
    let x0 = 0, x1 = W - 1; while (x0 < W - 1 && col[x0] < 1) x0++; while (x1 > x0 && col[x1] < 1) x1--;
    const inkRows = groups.reduce((s, q) => s + q.y1 - q.y0 + 1, 0);
    const crop = { left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 };
    if (inkRows < 8 || crop.height < 0.12 * H) return { out: D, crop: null, notes: ['REVIEW: almost nothing left after cleaning, original kept'] };
    return { out: D, crop, notes, removedPct: Math.round(100 * (H - crop.height) / H) };
  }

  var file = function (p) { try { p = decodeURI(String(p || '')); } catch (e) { p = String(p || ''); } return p.split('?')[0].split('#')[0].split('/').pop(); };
  var QI = new Set(), bank = window.QUESTION_BANK || [];
  bank.forEach(function (q) { if (q.image) QI.add(file(q.image)); });
  bank.forEach(function (q) { (q.solutionImages || []).forEach(function (s) { QI.delete(file(s)); }); });
  var CACHE = new Map(), WAIT = new Map(), queue = [], busy = false;

  function apply(img, url) {
    if (url) {
      img.removeAttribute('srcset'); img.src = url;
      var a = img.closest && img.closest('a'); if (a && /qimages/.test(a.getAttribute('href') || '')) a.href = url;
    }
    img.setAttribute('data-gz-done', '');
  }
  /* the pixel-cleaning maths runs in a Web Worker, so scrolling and clicking never wait for it */
  var WK = null, WJOB = null;
  function worker() {
    if (WK !== null) return WK;
    try {
      var src = 'var lum=' + lum.toString() + ',sat=' + sat.toString() + ';' + gzClean.toString() +
        ';onmessage=function(e){var m=e.data,W=m.W,H=m.H,d=new Uint8Array(m.buf),rgb=new Uint8Array(W*H*3);' +
        'for(var i=0,j=0;i<d.length;i+=4,j+=3){rgb[j]=d[i];rgb[j+1]=d[i+1];rgb[j+2]=d[i+2]}' +
        'var res=gzClean(rgb,W,H,{solution:false,watermark:true}),changed=!!res.crop&&res.notes.some(function(n){return /top banner|bottom banner|header line|question number/.test(n)});' +
        'if(!changed){postMessage({id:m.id,none:1});return}' +
        'var o=res.out,out=new Uint8ClampedArray(W*H*4);for(i=0,j=0;j<o.length;i+=4,j+=3){out[i]=o[j];out[i+1]=o[j+1];out[i+2]=o[j+2];out[i+3]=255}' +
        'postMessage({id:m.id,buf:out.buffer,crop:res.crop},[out.buffer])};';
      WK = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })));
      WK.onmessage = function (e) { var j = WJOB; WJOB = null; if (j) j(e.data); };
      WK.onerror = function () { var j = WJOB; WJOB = null; WK = false; if (j) j({ none: 1 }); };
    } catch (e) { WK = false; }
    return WK;
  }
  function next() {
    if (busy || !queue.length) return; busy = true;
    var job = queue.shift();
    var finish = function (url) { CACHE.set(job.orig, url); (WAIT.get(job.orig) || []).forEach(function (im) { apply(im, url); }); WAIT.delete(job.orig); busy = false; setTimeout(next, 0); };
    var w = worker(), img = job.img, W = img.naturalWidth, H = img.naturalHeight;
    if (!w || !W || !H) return finish(null);
    var c, x, d;
    try {
      c = document.createElement('canvas'); c.width = W; c.height = H;
      x = c.getContext('2d', { willReadFrequently: true }); x.fillStyle = '#fff'; x.fillRect(0, 0, W, H); x.drawImage(img, 0, 0);
      d = x.getImageData(0, 0, W, H).data;       /* blocked on file:// pages: keep the original picture */
    } catch (e) { return finish(null); }
    WJOB = function (r) {
      if (r.none || !r.buf) return finish(null);
      try {
        x.putImageData(new ImageData(new Uint8ClampedArray(r.buf), W, H), 0, 0);
        var cr = r.crop, m = Math.round(Math.max(10, cr.width * 0.012)), oc = document.createElement('canvas');
        oc.width = cr.width + 2 * m; oc.height = cr.height + 2 * m;
        var ox = oc.getContext('2d'); ox.fillStyle = '#fff'; ox.fillRect(0, 0, oc.width, oc.height);
        ox.drawImage(c, cr.left, cr.top, cr.width, cr.height, m, m, cr.width, cr.height);
        oc.toBlob(function (b) { finish(b ? URL.createObjectURL(b) : null); }, 'image/webp', 0.92);
      } catch (e) { finish(null); }
    };
    w.postMessage({ id: 1, W: W, H: H, buf: d.buffer }, [d.buffer]);
  }
  function handle(img) {
    if (img.__gz) return;
    var orig = img.getAttribute('src'); if (!orig || !QI.has(file(orig))) return;
    img.__gz = orig; img.setAttribute('data-gz-q', '');
    setTimeout(function () { img.setAttribute('data-gz-done', ''); }, 3500);    /* never leave a picture invisible */
    if (CACHE.has(orig)) return apply(img, CACHE.get(orig));
    if (WAIT.has(orig)) { WAIT.get(orig).push(img); return; }
    WAIT.set(orig, [img]);
    var go = function () { queue.push({ img: img, orig: orig }); next(); };
    if (img.complete && img.naturalWidth) go(); else { img.addEventListener('load', go, { once: true }); img.addEventListener('error', function () { apply(img, null); }, { once: true }); }
  }

  /* ---------- 3. hide the original exam number in labels ---------- */
  var RX = [[/\s*·\s*Q\d+\b/g, ''], [/(GATE\s*\d{4})\s+Q\d+/g, '$1']], tid = 0;
  function strip() {
    tid = 0;
    document.querySelectorAll('.qno,.item-meta,.qmeta .chip').forEach(function (e) {
      if (e.children.length) return; var t = e.textContent, n = t;
      RX.forEach(function (r) { n = n.replace(r[0], r[1]); });
      if (n !== t) e.textContent = n;
    });
  }
  function scan(root) { (root.querySelectorAll ? root.querySelectorAll('img') : []).forEach(handle); if (root.tagName === 'IMG') handle(root); }

  new MutationObserver(function (ms) {
    ms.forEach(function (m) {
      if (m.type === 'attributes' && m.target.tagName === 'IMG') {
        var im = m.target, s = im.getAttribute('src');
        if (im.__gz && s !== im.__gz && !/^blob:/.test(s || '')) { im.__gz = 0; im.removeAttribute('data-gz-done'); handle(im); }
        return;
      }
      m.addedNodes.forEach(function (n) { if (n.nodeType === 1) scan(n); });
    });
    if (!tid) tid = requestAnimationFrame(strip);
  }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['src'] });
  scan(document); strip();
})();