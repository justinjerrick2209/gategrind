// Cleans every question and solution picture in qimages/ so only the question (or solution) itself remains:
//   - removes the teal/blue section banners and thin colour strips (for example the "NAT  Enter the value..." box
//     that belongs to the NEXT question and the strip above a question)
//   - removes the small header line ("159 · MSQ · 2 marks"), because the site already shows type and marks
//   - trims the empty white margins, then adds a small even border
//   - enlarges small pictures and sharpens them so text is crisper
// It does NOT touch watermarks.
//
// Run from the site folder (the one with index.html, questions.js and qimages/):
//   Windows:  double-click run-clean-images.bat
//   Others:   npm install sharp   then   node Clean-Images.mjs
// Settings (environment variables): PREVIEW=12 (only process 12 sample pictures into qimages_preview/, change nothing)
//                                   SCALE=2 (enlarge factor for pictures narrower than 1000 px, default 2, use 1 to keep size)
// Originals are saved once into qimages_original/. Running again always starts from those originals, so it is safe to repeat.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

async function loadSharp() {
  try { return (await import('sharp')).default; } catch {}
  const dir = process.env.GG_TOOLS;
  if (dir) { try { return createRequire(path.join(dir, 'x.js'))('sharp'); } catch {} }
  return null;
}

// ---------- analysis (pure function on raw RGB pixels) ----------
export function analyze(data, W, H) {
  const bannerPx = (r, g, b) => {
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), ch = mx - mn;
    if (ch < 45 || mx > 235) return false;
    let h;
    if (mx === r) h = ((g - b) / ch) % 6; else if (mx === g) h = (b - r) / ch + 2; else h = (r - g) / ch + 4;
    h *= 60; if (h < 0) h += 360;
    return h >= 150 && h <= 260;                    // teal ... blue
  };
  const inkPx = (r, g, b) => {
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    return mn < 140 || (mx - mn >= 90 && mx < 215);  // dark text, or strongly coloured drawing; pale watermark is ignored
  };
  const redPx = (r, g, b) => r > 150 && g < 125 && b < 145 && r - g > 70;

  const bc = new Int32Array(H), bmin = new Int32Array(H).fill(W), bmax = new Int32Array(H).fill(-1), ic = new Int32Array(H);
  for (let y = 0; y < H; y++) {
    let o = y * W * 3;
    for (let x = 0; x < W; x++, o += 3) {
      const r = data[o], g = data[o + 1], b = data[o + 2];
      if (bannerPx(r, g, b)) { bc[y]++; if (x < bmin[y]) bmin[y] = x; if (x > bmax[y]) bmax[y] = x; }
      else if (inkPx(r, g, b)) ic[y]++;
    }
  }
  const isBannerRow = y => bc[y] >= 0.3 * W && bmax[y] - bmin[y] >= 0.6 * W;

  // bands of banner rows (small gaps allowed, because the banner contains text)
  const bands = []; let cur = null;
  for (let y = 0; y < H; y++) {
    if (isBannerRow(y)) { if (cur && y - cur.y1 <= 10) cur.y1 = y; else { cur = { y0: y, y1: y }; bands.push(cur); } }
  }
  let top = 0, bottom = H; const notes = [];
  for (const b of bands) {
    if (b.y1 < H * 0.3) { top = Math.max(top, b.y1 + 1); notes.push('top banner'); }
    else if (b.y0 > H * 0.4) { bottom = Math.min(bottom, b.y0); notes.push('bottom banner'); }
  }
  const inkRows = (a, z) => { let n = 0; for (let y = a; y < z; y++) if (ic[y] >= 2) n++; return n; };
  if ((top > 0 || bottom < H) && inkRows(top, bottom) < 12) { top = 0; bottom = H; notes.length = 0; notes.push('banner cut skipped (nothing would be left)'); }

  // first row of ink, then maybe drop the header line
  const firstInk = (a, z) => { for (let y = a; y < z; y++) if (ic[y] >= 2) return y; return -1; };
  let y0 = firstInk(top, bottom);
  if (y0 >= 0) {
    let y1 = y0, blank = 0;
    for (let y = y0; y < bottom; y++) { if (ic[y] >= 2) { y1 = y; blank = 0; } else if (++blank >= 2) break; }
    let minx = W, maxx = -1, redLeft = false;
    for (let y = y0; y <= y1; y++) {
      let o = y * W * 3;
      for (let x = 0; x < W; x++, o += 3) {
        const r = data[o], g = data[o + 1], b = data[o + 2];
        if (inkPx(r, g, b) || redPx(r, g, b)) { if (x < minx) minx = x; if (x > maxx) maxx = x; }
      }
    }
    for (let y = y0; y <= y1 && !redLeft; y++) {
      let o = (y * W + minx) * 3;
      for (let x = minx; x <= Math.min(maxx, minx + Math.max(40, (maxx - minx) * 0.3)); x++, o += 3) if (redPx(data[o], data[o + 1], data[o + 2])) { redLeft = true; break; }
    }
    if (redLeft && maxx - minx < 0.45 * W && y1 - y0 < 0.12 * H && inkRows(y1 + 1, bottom) >= 12) { top = y1 + 1; notes.push('header line'); }
  }
  y0 = firstInk(top, bottom);
  if (y0 < 0) return { crop: null, notes: ['no content found, left unchanged'] };
  let y1 = y0; for (let y = bottom - 1; y >= y0; y--) if (ic[y] >= 2) { y1 = y; break; }

  const cc = new Int32Array(W);
  for (let y = y0; y <= y1; y++) { let o = y * W * 3; for (let x = 0; x < W; x++, o += 3) if (inkPx(data[o], data[o + 1], data[o + 2])) cc[x]++; }
  let x0 = 0, x1 = W - 1; while (x0 < W - 1 && cc[x0] < 2) x0++; while (x1 > x0 && cc[x1] < 2) x1--;
  return { crop: { left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 }, notes };
}

// ---------- file handling ----------
async function main() {
  const sharp = await loadSharp();
  if (!sharp) { console.error('The image library "sharp" is missing. Run run-clean-images.bat (it installs it), or: npm install sharp'); process.exit(2); }
  const root = 'qimages';
  if (!fs.existsSync(root)) { console.error('Run this from the site folder, next to index.html and the qimages folder.'); process.exit(2); }
  const PREVIEW = Number(process.env.PREVIEW || 0), SCALE = Number(process.env.SCALE || 2), ORIG = 'qimages_original', PREV = 'qimages_preview';
  const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : /\.(webp|png|jpe?g)$/i.test(e.name) ? [path.join(d, e.name)] : []);
  let files = walk(root);
  if (!files.length) { console.error('No pictures found in qimages/.'); process.exit(2); }
  if (PREVIEW) { const step = Math.max(1, Math.floor(files.length / PREVIEW)); files = files.filter((_, i) => i % step === 0).slice(0, PREVIEW); }
  console.log(`${PREVIEW ? 'Previewing' : 'Cleaning'} ${files.length} pictures...`);

  const stat = { done: 0, banner: 0, header: 0, unchanged: 0, failed: 0 }, report = [];
  const one = async f => {
    const rel = path.relative(root, f), orig = path.join(ORIG, rel);
    let src = f;
    if (!PREVIEW) { if (!fs.existsSync(orig)) { fs.mkdirSync(path.dirname(orig), { recursive: true }); fs.copyFileSync(f, orig); } src = orig; }
    else if (fs.existsSync(path.join(ORIG, rel))) src = path.join(ORIG, rel);
    try {
      const buf = fs.readFileSync(src);
      const { data, info } = await sharp(buf).flatten({ background: '#ffffff' }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
      const { crop, notes } = analyze(data, info.width, info.height);
      let img = sharp(buf).flatten({ background: '#ffffff' });
      if (crop) img = img.extract(crop);
      const w = crop ? crop.width : info.width, pad = Math.max(10, Math.round(w * 0.012));
      img = img.extend({ top: pad, bottom: pad, left: pad, right: pad, background: '#ffffff' });
      const k = w < 1000 ? SCALE : 1;
      if (k > 1) img = img.resize({ width: Math.round((w + 2 * pad) * k), kernel: 'lanczos3' });
      img = img.sharpen({sigma: 0.9, m1: 0.9, m2: 2.5});
      const ext = path.extname(f).toLowerCase();
      img = ext === '.png' ? img.png({ compressionLevel: 9 }) : /jpe?g/.test(ext) ? img.jpeg({ quality: 93 }) : img.webp({ quality: 92, effort: 5 });
      const outPath = PREVIEW ? path.join(PREV, rel) : f;
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      fs.writeFileSync(outPath, await img.toBuffer());
      stat.done++; if (notes.some(n => /banner cut|banner$/.test(n)) ) stat.banner++; if (notes.includes('header line')) stat.header++;
      if (!notes.length) stat.unchanged++;
      if (notes.some(n => /skipped|unchanged/.test(n))) report.push(`${rel}: ${notes.join(', ')}`);
    } catch (e) { stat.failed++; report.push(`${rel}: FAILED ${e.message}`); }
    if (stat.done % 50 === 0 && stat.done) process.stdout.write(`  ${stat.done}/${files.length}\r`);
  };
  const queue = [...files];
  await Promise.all(Array.from({ length: 4 }, async () => { while (queue.length) await one(queue.shift()); }));
  console.log(`\nDone: ${stat.done} pictures. Banners/strips removed from ${stat.banner}, header line removed from ${stat.header}, ${stat.failed} failed.`);
  if (report.length) { fs.writeFileSync('clean-report.txt', report.join('\n') + '\n'); console.log(`${report.length} notes written to clean-report.txt`); }
  if (PREVIEW) console.log(`Samples are in ${PREV}/ . Nothing in qimages/ was changed.`);
  else console.log(`Originals are saved in ${ORIG}/ (do not upload that folder). To undo, copy them back into qimages/.`);
  process.exit(stat.failed ? 1 : 0);
}
if (import.meta.url === new URL(process.argv[1], 'file://').href || process.argv[1]?.endsWith('Clean-Images.mjs')) main();
