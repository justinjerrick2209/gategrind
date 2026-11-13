// One-time converter: turns EVERY question image (and worked-solution image) in questions.js into text,
// plus a crop box for any figure, so the site opens instantly in exam format with no images to wait for.
//
// Run from the site folder (the one holding index.html, questions.js and qimages/):
//   Windows:  double-click run-convert.bat        (or:  set GEMINI_API_KEY=your-key   then   node Convert.mjs)
//   Mac/Linux: export GEMINI_API_KEY=your-key  &&  node Convert.mjs
// It writes questions_text.js next to index.html. Safe to stop (Ctrl+C) and re-run: finished items are skipped.
// It keeps retrying failures (up to 4 passes) and, at the end, prints exactly which items are still missing.
// It checks your key and finds a working Gemini model by itself, and stops with a clear message if something is wrong.
// Exit codes: 0 = everything converted, 1 = some items still missing (just re-run), 2 = could not start (key, network, folder).
// Optional settings:  CONC=6 (parallel requests)   SOLUTIONS=0 (skip solutions)   GEMINI_MODEL=name   STATUS=1 (only report, no API calls)
// When it says "All done", upload questions_text.js together with index.html, questions.js and qimages/.
import fs from 'node:fs';
import vm from 'node:vm';

const KEY = (process.env.GEMINI_API_KEY || '').trim().replace(/^["']|["']$/g, '');
const BASE = process.env.GEMINI_BASE || 'https://generativelanguage.googleapis.com';
let MODELS = [...new Set([process.env.GEMINI_MODEL, 'gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-3.1-flash-lite'].filter(Boolean))];
const CONC = Number(process.env.CONC || 6);
const DO_SOL = process.env.SOLUTIONS !== '0';
const STATUS_ONLY = process.env.STATUS === '1';
class Fatal extends Error {}
const die = msg => { console.error('\nSTOPPED: ' + msg); process.exit(2); };
if (!KEY && !STATUS_ONLY) die('No API key. Get a free one at https://aistudio.google.com/apikey and set GEMINI_API_KEY (run-convert.bat asks for it).');
if (typeof fetch !== 'function') die('This Node.js is too old. Install the current LTS version from https://nodejs.org');

const TQ = String.raw`You transcribe exam question images into structured JSON. Copy the question exactly as printed; do not solve, correct or reword it. Ignore the small header line (question number, type, marks) and any watermark. Write mathematics in LaTeX with $...$ inline and $$...$$ for display. Use Markdown tables for tables and fenced code blocks for code. If the question has a figure (graph, scatter plot, tree, circuit, neural-network diagram, or any other diagram), write one short bracketed note in the question text such as [Figure: scatter plot with points A to G] and set has_figure to true, and also give figure_box: the tight bounding box of ONLY the figure itself (not the question text, not the tables, not the options) as [ymin, xmin, ymax, xmax], integers from 0 to 1000 relative to the whole image. If there are several figures, give one box that covers all of them. Return only JSON: {"question":"...","options":{"A":"...","B":"...","C":"...","D":"..."},"has_figure":false,"figure_box":null}. Use capital letters as option keys, and an empty object for options when there are none (NAT). If an option is itself a picture, describe it briefly. Never return an empty question.`;
const TS = String.raw`You transcribe worked-solution images into Markdown. Copy the content faithfully; do not shorten, solve or correct it. Ignore the small header (question number and the Answer line) and any watermark. Write mathematics in LaTeX with $...$ inline and $$...$$ for display. Use Markdown tables and fenced code blocks where needed. Return only JSON: {"solution":"...","has_figure":false}. Set has_figure to true if the solution contains a figure, graph, tree, plot or diagram, and describe it inside square brackets. Never return an empty solution.`;

const load = f => { const w = {}; vm.runInNewContext(fs.readFileSync(f, 'utf8'), { window: w, self: w, globalThis: w }); return w; };
if (!fs.existsSync('questions.js')) die('questions.js not found here. Run this from the site folder, next to index.html.');
const bank = load('questions.js').QUESTION_BANK || [];
let out = {};
try { out = load('questions_text.js').QUESTION_TEXT || {}; } catch {}

const sleep = ms => new Promise(r => setTimeout(r, ms));
const mime = p => /\.jpe?g$/i.test(p) ? 'image/jpeg' : /\.webp$/i.test(p) ? 'image/webp' : 'image/png';
const img = p => ({ inline_data: { mime_type: mime(p), data: fs.readFileSync(p).toString('base64') } });
let modelIdx = 0, cooldownUntil = 0, stopAll = false;

async function call(sys, parts) {
  let lastErr = 'gave up after retries';
  for (let i = 0; i < 8; i++) {
    if (stopAll) throw new Fatal('stopped');
    const wait = cooldownUntil - Date.now(); if (wait > 0) await sleep(wait);
    const model = MODELS[modelIdx];
    let r, d;
    try {
      r = await fetch(`${BASE}/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': KEY },
        body: JSON.stringify({ system_instruction: { parts: [{ text: sys }] }, contents: [{ role: 'user', parts }], generationConfig: { responseMimeType: 'application/json' } }),
      });
      if (r.status === 429 || r.status >= 500) {
        const txt = await r.text().catch(() => '');
        if (r.status === 429 && /PerDay|per day|daily/i.test(txt)) throw new Fatal('Your free daily quota is used up. Run this again tomorrow (progress is saved), or use a key with billing enabled.');
        lastErr = `HTTP ${r.status} (busy or rate limit)`;
        cooldownUntil = Math.max(cooldownUntil, Date.now() + Math.min(60000, 4000 * (i + 1)));
        continue;
      }
      d = await r.json();
    } catch (e) { if (e instanceof Fatal) throw e; lastErr = e.message; await sleep(3000 * (i + 1)); continue; }
    if (!r.ok) {
      const msg = d.error?.message || `HTTP ${r.status}`;
      if ((r.status === 404 || /not found|not supported/i.test(msg)) && modelIdx < MODELS.length - 1) { console.log(`  model ${model} not available, switching to ${MODELS[modelIdx + 1]}`); modelIdx++; continue; }
      if (r.status === 400 && /api key/i.test(msg) || r.status === 401 || r.status === 403) throw new Fatal('Google rejected the request: ' + msg);
      throw new Error(msg);
    }
    const t = (d.candidates?.[0]?.content?.parts || []).filter(x => x.text && !x.thought).map(x => x.text).join('').trim();
    try { return JSON.parse(t.replace(/^```json|```$/g, '').trim()); } catch { lastErr = 'unreadable reply'; await sleep(1000); }
  }
  throw new Error(lastErr);
}

const validBox = b => Array.isArray(b) && b.length === 4 && b.every(n => typeof n === 'number' && isFinite(n)) &&
  b[0] >= 0 && b[1] >= 0 && b[2] <= 1000 && b[3] <= 1000 && b[2] - b[0] >= 20 && b[3] - b[1] >= 20;
const has = v => typeof v === 'string' && v.trim().length > 0;

const save = () => fs.writeFileSync('questions_text.js', 'window.QUESTION_TEXT=' + JSON.stringify(out) + ';\n');
// needs work: no question text yet (empty counts as missing); OR it has a figure but no crop box has been tried; OR no solution text yet
const needsQ = q => q.image && (!out[q.id] || !has(out[q.id].q) || (out[q.id].fig && !out[q.id].box && !out[q.id].boxTried));
const needsS = q => DO_SOL && (q.solutionImages || []).length && (!out[q.id] || !has(out[q.id].sol));
const pending = () => bank.filter(q => needsQ(q) || needsS(q));

async function work(q, stats) {
  const c = out[q.id] = out[q.id] || {};
  const files = [needsQ(q) ? q.image : null, ...(needsS(q) ? q.solutionImages : [])].filter(Boolean), gone = files.filter(f => !fs.existsSync(f));
  if (gone.length) { stats.failed++; stats.last[q.id] = 'image file not found: ' + gone[0]; if (!c.q && !Object.keys(c).length) delete out[q.id]; return; }
  try {
    if (needsQ(q)) {
      const j = await call(TQ, [{ text: 'Transcribe this question.' }, img(q.image)]);
      const text = String(j.question || '');
      if (!has(text)) throw new Error('empty question text returned');
      c.q = text; c.opts = j.options && typeof j.options === 'object' ? j.options : {}; c.fig = !!j.has_figure;
      c.box = c.fig && validBox(j.figure_box) ? j.figure_box.map(Math.round) : null; c.boxTried = true;
    }
    if (needsS(q)) {
      const j = await call(TS, [{ text: 'Transcribe this worked solution.' }, ...q.solutionImages.map(img)]);
      const text = String(j.solution || '');
      if (!has(text)) throw new Error('empty solution text returned');
      c.sol = text; c.solFig = !!j.has_figure;
    }
  } catch (e) { if (e instanceof Fatal) { stopAll = true; stats.fatal = e.message; return; } stats.failed++; stats.last[q.id] = e.message; }
  if (++stats.done % 10 === 0) { save(); const mins = (Date.now() - t0) / 60000, eta = stats.done ? Math.max(0, Math.round(mins / stats.done * (stats.total - stats.done))) : 0; console.log(`  ${stats.done}/${stats.total} this pass, ${stats.failed} failed, about ${eta} min left`); }
}

function report() {
  const left = pending();
  const qLeft = bank.filter(needsQ).map(q => q.id), sLeft = bank.filter(needsS).map(q => q.id);
  const total = bank.length, withText = bank.filter(q => !needsQ(q)).length;
  console.log(`\nQuestions as text: ${withText} of ${total}. Solutions as text: ${bank.filter(q => (q.solutionImages || []).length && !needsS(q)).length} of ${bank.filter(q => (q.solutionImages || []).length).length}${DO_SOL ? '' : ' (solutions skipped)'}.`);
  if (left.length) { console.log(`Still missing: ${qLeft.length} questions${DO_SOL ? `, ${sLeft.length} solutions` : ''}.`); if (qLeft.length) console.log('  questions: ' + qLeft.slice(0, 60).join(', ') + (qLeft.length > 60 ? ' ...' : '')); if (sLeft.length) console.log('  solutions: ' + sLeft.slice(0, 60).join(', ') + (sLeft.length > 60 ? ' ...' : '')); console.log('Re-run to retry them (usually a rate limit: wait a minute, or lower CONC).'); }
  else console.log('All done. Every question and solution is now text. Upload questions_text.js with the site.');
  return left.length;
}

process.on('SIGINT', () => { save(); console.log('\nSaved progress. Re-run to continue.'); process.exit(0); });
if (STATUS_ONLY) { process.exit(report() ? 1 : 0); }

{ // folder check
  const refs = bank.flatMap(q => [q.image, ...(q.solutionImages || [])]).filter(Boolean), missing = refs.filter(f => !fs.existsSync(f));
  if (missing.length === refs.length) die('None of the images were found (looked for ' + refs[0] + '). Run this from the site folder, next to the qimages folder.');
  if (missing.length) console.log(`Warning: ${missing.length} image files are missing, for example ${missing[0]}. Those items will be skipped.`);
}
// key check + pick a working model from what this key can actually use
try {
  const names = []; let token = '';
  for (let k = 0; k < 6; k++) {
    const r = await fetch(`${BASE}/v1beta/models?pageSize=200${token ? '&pageToken=' + token : ''}`, { headers: { 'x-goog-api-key': KEY } });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) die(r.status === 400 || r.status === 401 || r.status === 403 ? 'Google rejected your API key: ' + (d.error?.message || 'HTTP ' + r.status) + '\nCreate a new key at https://aistudio.google.com/apikey and try again.' : 'Could not list models: ' + (d.error?.message || 'HTTP ' + r.status));
    for (const m of d.models || []) if ((m.supportedGenerationMethods || []).includes('generateContent')) names.push(m.name.replace(/^models\//, ''));
    if (!d.nextPageToken) break; token = d.nextPageToken;
  }
  const ok = n => /flash/i.test(n) && !/(image|tts|live|audio|embedding|thinking|robotics|computer|exp)/i.test(n);
  const preferred = MODELS.filter(m => names.includes(m)), others = names.filter(ok).filter(n => !preferred.includes(n)).sort().reverse();
  const chosen = [...preferred, ...others];
  if (!chosen.length) die('This key has no usable Gemini Flash model. Models it can see: ' + (names.slice(0, 8).join(', ') || 'none'));
  MODELS = chosen;
} catch (e) { if (!(e instanceof Fatal) && e.message) die('Could not reach Google (' + e.message + '). Check your internet connection and try again.'); throw e; }
const t0 = Date.now();
console.log(`${bank.length} questions; ${pending().length} still to convert. Model ${MODELS[0]}, ${CONC} at a time${DO_SOL ? ', including solutions' : ''}.`);
for (let pass = 1; pass <= 4; pass++) {
  const todo = pending();
  if (!todo.length) break;
  console.log(`Pass ${pass}: ${todo.length} to do`);
  const stats = { done: 0, failed: 0, total: todo.length, last: {} };
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(CONC, todo.length) }, async () => { while (next < todo.length) await work(todo[next++], stats); }));
  save();
  if (stats.fatal) { console.log('\nSTOPPED: ' + stats.fatal + '\nProgress is saved.'); report(); process.exit(2); }
  if (stats.failed) { const ex = Object.entries(stats.last).slice(0, 3).map(([k, v]) => `${k}: ${v}`).join(' | '); console.log(`  ${stats.failed} failed this pass (${ex})`); if (pass < 4) await sleep(8000); }
}
save();
process.exit(report() ? 1 : 0);
