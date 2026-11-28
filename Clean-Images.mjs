// Computer-vision cleaner for question and solution pictures in qimages/.
// Run it BEFORE Convert.mjs, so the text model only ever sees the question itself.
//
// For every picture it:
//   1. removes coloured banners/strips of any thickness (teal "MSQ One or more options..." boxes, "NAT Enter the value..." bars,
//      thin colour lines) when they sit near the top or bottom,
//   2. removes the small header line ("42 . NAT . 1 mark", red number at the left) on question pictures,
//   3. fades pale watermarks (big pale red/blue/grey logos and words) so they cannot be mistaken for text,
//   4. in exam-paper tables: removes the grid lines and the question-number label ("Q.2"),
//   5. trims empty margins, adds an even border, enlarges small pictures and sharpens them.
// Blue graphs, dark lines, tables and diagrams are kept. Anything that changes a lot is listed in clean-report.txt and
// saved side by side (before | after) in qimages_review/ so you can check it by eye.
//
// Run from the site folder (next to index.html, questions.js and qimages/):
//   Windows: double-click run-clean-images.bat          Others: npm install sharp   then   node Clean-Images.mjs
// Settings (environment variables):
//   PREVIEW=12   process only 12 sample pictures into qimages_preview/ and change nothing
//   SCALE=2      enlarge pictures narrower than 1000 px (use 1 to keep size)
//   WATERMARK=0  do not fade watermarks (use this if pale shading inside graphs disappears)
// Originals are saved once into qimages_original/. Running again always starts from those originals, so it is safe to repeat.
// IMPORTANT: after cleaning, delete questions_text.js and run Convert.mjs again, because crop boxes refer to the cleaned pictures.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

async function loadSharp() {
  try { return (await import('sharp')).default; } catch {}
  const dir = process.env.GG_TOOLS;
  if (dir) { try { return createRequire(path.join(dir, 'x.js'))('sharp'); } catch {} }
  return null;
}

const lum = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;
const sat = (r, g, b) => Math.max(r, g, b) - Math.min(r, g, b);

// ---- analysis on raw RGB (works on a copy; returns the cleaned pixels and a crop box) ----
export function clean(src, W, H, { solution = false, watermark = true } = {}) {
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

// ---- file handling ----
async function main() {
  const sharp = await loadSharp();
  if (!sharp) { console.error('The image library "sharp" is missing. Run run-clean-images.bat (it installs it), or: npm install sharp'); process.exit(2); }
  const root = 'qimages';
  if (!fs.existsSync(root)) { console.error('Run this from the site folder, next to index.html and the qimages folder.'); process.exit(2); }
  const PREVIEW = Number(process.env.PREVIEW || 0), SCALE = Number(process.env.SCALE || 2), WM = process.env.WATERMARK !== '0';
  const ORIG = 'qimages_original', PREV = 'qimages_preview', REVIEWDIR = 'qimages_review';
  const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : /\.(webp|png|jpe?g)$/i.test(e.name) ? [path.join(d, e.name)] : []);
  let files = walk(root);
  if (!files.length) { console.error('No pictures found in qimages/.'); process.exit(2); }
  if (PREVIEW) { const step = Math.max(1, Math.floor(files.length / PREVIEW)); files = files.filter((_, i) => i % step === 0).slice(0, PREVIEW); }
  console.log(`${PREVIEW ? 'Previewing' : 'Cleaning'} ${files.length} pictures...`);

  const stat = { done: 0, banner: 0, header: 0, mark: 0, kept: 0, failed: 0 }, report = [];
  const one = async f => {
    const rel = path.relative(root, f), orig = path.join(ORIG, rel), isSol = /(^|[\\/])solutions[\\/]/i.test(rel);
    let src = f;
    if (!PREVIEW) { if (!fs.existsSync(orig)) { fs.mkdirSync(path.dirname(orig), { recursive: true }); fs.copyFileSync(f, orig); } src = orig; }
    else if (fs.existsSync(path.join(ORIG, rel))) src = path.join(ORIG, rel);
    try {
      const buf = fs.readFileSync(src);
      const { data, info } = await sharp(buf).flatten({ background: '#ffffff' }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
      const { out, crop, notes, removedPct = 0 } = clean(data, info.width, info.height, { solution: isSol, watermark: WM });
      if (!crop) { stat.kept++; report.push(`${rel}: ${notes.join(', ')}`); if (!PREVIEW) { fs.copyFileSync(orig, f); } stat.done++; return; }
      let img = sharp(Buffer.from(out.buffer), { raw: { width: info.width, height: info.height, channels: 3 } }).extract(crop);
      const w = crop.width, pad = Math.max(10, Math.round(w * 0.012));
      img = img.extend({ top: pad, bottom: pad, left: pad, right: pad, background: '#ffffff' });
      if (w < 1000 && SCALE > 1) img = img.resize({ width: Math.round((w + 2 * pad) * SCALE), kernel: 'lanczos3' });
      img = img.sharpen({ sigma: 0.9, m1: 0.9, m2: 2.5 });
      const ext = path.extname(f).toLowerCase();
      img = ext === '.png' ? img.png({ compressionLevel: 9 }) : /jpe?g/.test(ext) ? img.jpeg({ quality: 93 }) : img.webp({ quality: 92, effort: 5 });
      const outBuf = await img.toBuffer(), outPath = PREVIEW ? path.join(PREV, rel) : f;
      fs.mkdirSync(path.dirname(outPath), { recursive: true }); fs.writeFileSync(outPath, outBuf);
      stat.done++;
      if (notes.some(n => /banner/.test(n))) stat.banner++; if (notes.includes('header line')) stat.header++;
      const flag = notes.some(n => /REVIEW|kept/.test(n)) || removedPct > 35;
      if (flag) report.push(`${rel}: ${notes.join(', ') || 'trim'}${removedPct > 35 ? `, ${removedPct}% of the height removed` : ''}`);
      if (!PREVIEW && (flag || notes.length >= 2)) {
        try {
          const a = await sharp(buf).flatten({ background: '#ffffff' }).resize({ width: 640 }).png().toBuffer(), c = await sharp(outBuf).resize({ width: 640 }).png().toBuffer();
          const ha = (await sharp(a).metadata()).height, hc = (await sharp(c).metadata()).height, hh = Math.max(ha, hc);
          const sheet = await sharp({ create: { width: 1300, height: hh, channels: 3, background: '#cfd6e4' } }).composite([{ input: a, left: 0, top: 0 }, { input: c, left: 660, top: 0 }]).png().toBuffer();
          const rp = path.join(REVIEWDIR, rel.replace(/\.[^.]+$/, '') + '.png'); fs.mkdirSync(path.dirname(rp), { recursive: true }); fs.writeFileSync(rp, sheet);
        } catch {}
      }
    } catch (e) { stat.failed++; report.push(`${rel}: FAILED ${e.message}`); }
    if (stat.done % 50 === 0 && stat.done) process.stdout.write(`  ${stat.done}/${files.length}\r`);
  };
  const queue = [...files];
  await Promise.all(Array.from({ length: 4 }, async () => { while (queue.length) await one(queue.shift()); }));
  console.log(`\nDone: ${stat.done} pictures. Banners removed from ${stat.banner}, header line from ${stat.header}, ${stat.kept} left as they were, ${stat.failed} failed.`);
  if (report.length) { fs.writeFileSync('clean-report.txt', report.join('\n') + '\n'); console.log(`${report.length} notes written to clean-report.txt`); }
  if (PREVIEW) console.log(`Samples are in ${PREV}/ . Nothing in qimages/ was changed.`);
  else console.log(`Originals are saved in ${ORIG}/ (do not upload that folder). To undo, copy them back into qimages/.\nBefore/after sheets are in ${REVIEWDIR}/ (do not upload that folder either).\nNEXT: delete questions_text.js and run run-convert.bat again.`);
  process.exit(stat.failed ? 1 : 0);
}
if (process.argv[1] && /Clean-Images\.mjs$/.test(process.argv[1])) main();