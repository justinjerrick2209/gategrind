// Cloudflare Worker: the tutor behind the hint, explanation and chat buttons (optional upgrade, so visitors need no sign-in).
// ROUND-ROBIN across several AI providers and keys, so no single free quota is used up quickly.
// Every request starts at the next provider in the rotation; if one is rate limited or down, it is
// put on a short cooldown and the next provider answers instead.
//
// Setup (Cloudflare dashboard, free plan is enough):
//   1. Workers & Pages > Create > Create Worker > Deploy, then "Edit code", paste this file, Deploy.
//   2. Settings > Variables and Secrets > add SECRETS for every provider you have (all are optional, use 2 or more):
//        GEMINI_API_KEY      key(s) from aistudio.google.com/apikey  (several keys allowed, comma-separated, ideally from different Google accounts)
//        GROQ_API_KEY        key from console.groq.com
//        OPENROUTER_API_KEY  key from openrouter.ai (the ":free" models cost nothing)
//        MISTRAL_API_KEY     key from console.mistral.ai
//      Optional variables to choose models: GEMINI_MODELS, GROQ_MODELS, OPENROUTER_MODELS, MISTRAL_MODELS (comma-separated).
//   3. Add a plain variable ALLOWED_ORIGINS = https://thegategrind.online   (comma-separate extra sites; localhost always works).
//   4. Optional daily limit per visitor: Storage & Databases > KV > create a namespace, then in the Worker
//      Settings > Bindings add a KV binding named RL. Optional variable DAILY_LIMIT (default 60).
//   5. Copy the worker URL (https://NAME.SUBDOMAIN.workers.dev) into GEMINI_ENDPOINT near the top of index.html.

const SYS = String.raw`You are an expert GATE Data Science and AI (DA) tutor. The question is in the attached image or text. Each message states a MODE, either HINT or FULL, and may state the answer the student submitted. The student has already attempted the question and checked it, so they are coming to you to learn, not to be handed a result.

MODE: HINT
Give exactly one new hint, in 2 to 4 short sentences. Hints are progressive: the earlier hints are listed in the message, so never repeat them and always be one level more specific than the last.
- Hint 1: name the concept or topic the question tests and what to look at first.
- Hint 2: give the key formula, property or rule and how it applies here.
- Hint 3 and later: outline the approach and carry out the first calculation step or two, but stop before the result.
Hard rules for every hint: never state the final answer or the final numeric result; never say which option is correct or incorrect, not even by elimination; never evaluate the options one by one. If the next step would unavoidably give the answer away, give the closest safe step and tell the student to ask for the full explanation. If the student's submitted answer is shown, aim the hint at the misconception that choice suggests, without saying whether it is right. Use LaTeX for any mathematics.

MODE: FULL
Write a complete study explanation. For MCQ and MSQ questions use these Markdown sections:
1. Concept: the theory, definitions, formulas and properties needed, explained properly, not just named.
2. Option A, Option B, Option C, Option D (one heading each, never skip or merge any): restate the option in a few words, give a clear verdict (Correct or Incorrect), then explain in detail why, with the full working, a counterexample for wrong options, and the exact misconception or trap it is built on. If the student submitted an answer, make sure the explanation of that option says clearly why their choice is right or wrong.
3. Answer: the final option letter(s). For MSQ, list every correct option.
4. GATE takeaway: a shortcut or quick check, common mistakes, and related topics that appear in the exam.
For NAT questions (no options): Concept, then a numbered step-by-step solution showing every calculation, then a sanity check or second method, then Answer (the number, noting any accepted range), then GATE takeaway.
Never call an option correct or wrong without proving it. If the question or the image is unclear, say exactly what you cannot read instead of guessing.

Formatting rules for both modes, because your reply is rendered:
- Write all mathematics in LaTeX: inline as $x^2$ and display equations as $$ ... $$ on their own lines. Use aligned environments for multi-step derivations and bmatrix for matrices. Never use Unicode math symbols or plain-text fractions.
- Use Markdown tables for truth tables, data, probability tables, confusion matrices and comparisons.
- Put algorithms, pseudocode and code in fenced code blocks.
- For graphs and diagrams, describe them precisely (axes, intercepts, slopes, shape, key points), add a small table of values where useful, and a simple ASCII sketch in a fenced code block if it helps.
- Use bold for key terms and short paragraphs. In FULL mode be thorough and complete rather than brief.`;

const CHAT_SYS = String.raw`You are the GATE DA assistant on the Gategrind practice site. GATE DA is the Data Science and Artificial Intelligence paper of the GATE exam in India. Help students with: the syllabus (Probability and Statistics, Linear Algebra, Calculus and Optimization, Programming with Data Structures and Algorithms, Database Management and Warehousing, Machine Learning, Artificial Intelligence, General Aptitude), solving and explaining problems, formulas and shortcuts, exam pattern and marking (a wrong MCQ costs one third of the marks on a 1-mark question and two thirds on a 2-mark question; MSQ and NAT have no negative marking), preparation strategy, study plans and revision, and discussion of previous year questions.

Rules:
- Stay on GATE DA and the maths, computer science and AI behind it. If the request is unrelated, say briefly that you only help with GATE DA and suggest a related topic.
- Be accurate. For official details that can change (exam dates, cutoffs, syllabus changes, eligibility, fees, rules), say you may be out of date and tell the student to confirm on the official GATE website of the organising institute. Never invent facts, statistics, ranks or sources.
- Teach step by step. Keep answers focused and as short as the question allows; go deep only when asked.
- If the student attached the question they are viewing, use it, and refer to it directly.
- Write all mathematics in LaTeX: inline as $x^2$ and display as $$ ... $$. Use Markdown tables where a table helps and fenced code blocks for code or pseudocode.`;

const wait = ms => new Promise(r => setTimeout(r, ms));
const clip = (v, n) => String(v == null ? '' : v).slice(0, n);
const list = v => String(v || '').split(',').map(x => x.trim()).filter(Boolean);

// ---- Provider catalogue. A provider is used only when its key secret is set. All of these accept images. ----
const GEMINI_MODELS = ['gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-3.1-flash-lite'];
const OAI = [
  { id: 'groq', url: 'https://api.groq.com/openai/v1/chat/completions', keyVar: 'GROQ_API_KEY', modelsVar: 'GROQ_MODELS', models: ['meta-llama/llama-4-scout-17b-16e-instruct'] },
  { id: 'openrouter', url: 'https://openrouter.ai/api/v1/chat/completions', keyVar: 'OPENROUTER_API_KEY', modelsVar: 'OPENROUTER_MODELS', models: ['google/gemma-3-27b-it:free', 'meta-llama/llama-4-maverick:free'] },
  { id: 'mistral', url: 'https://api.mistral.ai/v1/chat/completions', keyVar: 'MISTRAL_API_KEY', modelsVar: 'MISTRAL_MODELS', models: ['mistral-small-latest'] },
];

// Builds one list that alternates between providers (gemini, groq, openrouter, mistral, gemini, ...).
function buildPool(env) {
  const groups = [], g = [], gm = list(env.GEMINI_MODELS).length ? list(env.GEMINI_MODELS) : GEMINI_MODELS;
  for (const m of gm) for (const k of list(env.GEMINI_API_KEY)) g.push({ name: 'gemini/' + m + '#' + k.slice(-4), type: 'gemini', model: m, key: k });
  groups.push(g);
  for (const P of OAI) {
    const ms = list(env[P.modelsVar]).length ? list(env[P.modelsVar]) : P.models, o = [];
    for (const m of ms) for (const k of list(env[P.keyVar])) o.push({ name: P.id + '/' + m + '#' + k.slice(-4), type: 'oai', url: P.url, model: m, key: k });
    groups.push(o);
  }
  const out = [];
  for (let i = 0; ; i++) {
    let any = false;
    for (const x of groups) if (i < x.length) { out.push(x[i]); any = true; }
    if (!any) break;
  }
  return out;
}

let rr = 0;          // round-robin pointer (per worker instance)
const down = {};     // provider name -> time (ms) until which it is skipped

async function callProvider(p, sys, turns, maxTokens) {
  let r, d;
  if (p.type === 'gemini') {
    const contents = turns.map(t => ({ role: t.role === 'assistant' ? 'model' : 'user', parts: [{ text: t.text }].concat(t.img ? [{ inline_data: { mime_type: t.img.mime, data: t.img.data } }] : []) }));
    r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + p.model + ':generateContent', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': p.key },
      body: JSON.stringify({ system_instruction: { parts: [{ text: sys }] }, contents, generationConfig: { maxOutputTokens: maxTokens } }),
    });
    d = await r.json().catch(() => ({}));
    if (!r.ok) throw { status: r.status };
    return ((d.candidates && d.candidates[0] && d.candidates[0].content && d.candidates[0].content.parts) || []).filter(x => x.text && !x.thought).map(x => x.text).join('\n').trim();
  }
  const messages = [{ role: 'system', content: sys }].concat(turns.map(t => ({
    role: t.role,
    content: t.img ? [{ type: 'text', text: t.text }, { type: 'image_url', image_url: { url: 'data:' + t.img.mime + ';base64,' + t.img.data } }] : t.text,
  })));
  r = await fetch(p.url, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + p.key },
    body: JSON.stringify({ model: p.model, messages, max_tokens: maxTokens }),
  });
  d = await r.json().catch(() => ({}));
  if (!r.ok) throw { status: r.status };
  const c = d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content;
  return (Array.isArray(c) ? c.map(x => x.text || '').join('') : String(c || '')).trim();
}

export default {
  async fetch(req, env) {
    const origin = req.headers.get('Origin') || '';
    const allowed = (env.ALLOWED_ORIGINS || '').split(',').map(x => x.trim()).filter(Boolean);
    const ok = !allowed.length || allowed.includes(origin) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
    const cors = { 'Access-Control-Allow-Origin': ok ? origin : 'null', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', Vary: 'Origin' };
    const send = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (req.method !== 'POST') return send({ error: 'POST only' }, 405);
    if (!ok) return send({ error: 'This site is not allowed to use the tutor.' }, 403);
    const pool = buildPool(env);
    if (!pool.length) return send({ error: 'The tutor is not configured yet.' }, 500);

    let b;
    try { b = await req.json(); } catch { return send({ error: 'Bad request' }, 400); }
    if (b.mode !== 'hint' && b.mode !== 'full' && b.mode !== 'chat') return send({ error: 'Bad request' }, 400);
    const im = b.image && typeof b.image.data === 'string' && b.image.data.length < 2_000_000 ? b.image : null;
    const img = im ? { mime: clip(im.mime_type, 30) || 'image/png', data: im.data } : null;
    if (b.mode !== 'chat' && !img && !b.text) return send({ error: 'No question was sent.' }, 400);

    if (env.RL) {
      const ip = req.headers.get('CF-Connecting-IP') || 'x', day = new Date().toISOString().slice(0, 10), k = ip + ':' + day;
      const n = +(await env.RL.get(k) || 0), lim = +(env.DAILY_LIMIT || 60);
      if (n >= lim) return send({ error: 'Daily limit reached (' + lim + ' requests). Please come back tomorrow.' }, 429);
      await env.RL.put(k, String(n + 1), { expirationTtl: 90000 });
    }

    let sys, turns, maxTokens;
    if (b.mode === 'chat') {
      turns = (Array.isArray(b.messages) ? b.messages : []).slice(-12)
        .map(x => ({ role: x && x.role === 'assistant' ? 'assistant' : 'user', text: clip(x && x.content, 4000) }))
        .filter(x => x.text);
      if (!turns.length || turns[turns.length - 1].role !== 'user') return send({ error: 'Bad request' }, 400);
      const last = turns[turns.length - 1], mt = b.meta;
      if (mt) {
        last.text = 'The student is viewing this question (' + clip(mt.subject, 80) + ', ' + clip(mt.topic, 120) + ', ' + clip(mt.type, 10) + ', ' + clip(mt.marks, 3) + ' mark(s)).'
          + (b.student ? ' Their selected answer so far: ' + clip(b.student, 40) + '.' : '') + '\n\n' + last.text;
        if (img) last.img = img;
        else if (b.text) last.text += '\n\nQuestion:\n' + clip(b.text, 4000);
      }
      sys = CHAT_SYS; maxTokens = 4096;
    } else {
      const m = b.meta || {}, hints = (Array.isArray(b.hints) ? b.hints : []).slice(0, 8).map(h => clip(h, 3000));
      let text = 'Subject: ' + clip(m.subject, 80) + '. Topic: ' + clip(m.topic, 120) + '. Type: ' + clip(m.type, 10) + ', ' + clip(m.marks, 3) + ' mark(s).\n'
        + (b.student ? 'The student submitted: ' + clip(b.student, 40) + '.\n' : '')
        + (b.mode === 'hint'
          ? 'MODE: HINT. This is hint number ' + (hints.length + 1) + '.' + (hints.length ? '\nHints already given (do not repeat them):\n' + hints.map((h, i) => (i + 1) + '. ' + h).join('\n') : '')
          : 'MODE: FULL. Write the complete detailed explanation as specified in your instructions. For MCQ and MSQ, analyse every option separately.');
      if (!img) text += '\n\nQuestion:\n' + clip(b.text, 4000);
      turns = [{ role: 'user', text, img }];
      sys = SYS; maxTokens = b.mode === 'hint' ? 2048 : 8192;
    }

    // Round robin: start at the next provider, put providers on cooldown at the back of the line.
    const start = rr++ % pool.length, now = Date.now();
    const rot = pool.slice(start).concat(pool.slice(0, start));
    const order = rot.filter(p => (down[p.name] || 0) <= now).concat(rot.filter(p => (down[p.name] || 0) > now)).slice(0, 6);
    let lastErr = 'The tutor is busy right now. Please try again in a moment.';
    for (const p of order) {
      try {
        const t = await callProvider(p, sys, turns, maxTokens);
        if (t) return send({ text: t });
        down[p.name] = Date.now() + 30000;
        lastErr = 'The tutor could not answer this one. Please try again.';
      } catch (e) {
        const s = (e && e.status) || 0;
        // rate limited: rest 90s; bad key / model gone: rest 1h; anything else: 20s
        down[p.name] = Date.now() + (s === 429 ? 90000 : (s === 401 || s === 403 || s === 404) ? 3600000 : 20000);
        if (!s) await wait(300);
      }
    }
    return send({ error: lastErr }, 503);
  },
};