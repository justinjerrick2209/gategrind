// Cloudflare Worker: the tutor behind the "Give me a hint" and "Explain all options" buttons.
// It keeps your Gemini key secret on the server, so visitors never see or enter a key.
//
// Setup (Cloudflare dashboard, free plan is enough):
//   1. Workers & Pages > Create > Create Worker > Deploy, then "Edit code", paste this file, Deploy.
//   2. Settings > Variables and Secrets > add a SECRET named GEMINI_API_KEY (your key from aistudio.google.com/apikey).
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

const MODELS = ['gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-3.1-flash-lite'];
const wait = ms => new Promise(r => setTimeout(r, ms));
const clip = (v, n) => String(v == null ? '' : v).slice(0, n);

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
    if (!env.GEMINI_API_KEY) return send({ error: 'The tutor is not configured yet.' }, 500);

    let b;
    try { b = await req.json(); } catch { return send({ error: 'Bad request' }, 400); }
    if (b.mode !== 'hint' && b.mode !== 'full') return send({ error: 'Bad request' }, 400);
    const img = b.image && typeof b.image.data === 'string' && b.image.data.length < 2_000_000 ? b.image : null;
    if (!img && !b.text) return send({ error: 'No question was sent.' }, 400);

    if (env.RL) {
      const ip = req.headers.get('CF-Connecting-IP') || 'x', day = new Date().toISOString().slice(0, 10), k = ip + ':' + day;
      const n = +(await env.RL.get(k) || 0), lim = +(env.DAILY_LIMIT || 60);
      if (n >= lim) return send({ error: 'Daily limit reached (' + lim + ' requests). Please come back tomorrow.' }, 429);
      await env.RL.put(k, String(n + 1), { expirationTtl: 90000 });
    }

    const m = b.meta || {}, hints = (Array.isArray(b.hints) ? b.hints : []).slice(0, 8).map(h => clip(h, 3000));
    let text = 'Subject: ' + clip(m.subject, 80) + '. Topic: ' + clip(m.topic, 120) + '. Type: ' + clip(m.type, 10) + ', ' + clip(m.marks, 3) + ' mark(s).\n'
      + (b.student ? 'The student submitted: ' + clip(b.student, 40) + '.\n' : '')
      + (b.mode === 'hint'
        ? 'MODE: HINT. This is hint number ' + (hints.length + 1) + '.' + (hints.length ? '\nHints already given (do not repeat them):\n' + hints.map((h, i) => (i + 1) + '. ' + h).join('\n') : '')
        : 'MODE: FULL. Write the complete detailed explanation as specified in your instructions. For MCQ and MSQ, analyse every option separately.');
    const parts = [{ text }];
    if (img) parts.push({ inline_data: { mime_type: clip(img.mime_type, 30) || 'image/png', data: img.data } });
    else parts[0].text += '\n\nQuestion:\n' + clip(b.text, 4000);

    const body = JSON.stringify({
      system_instruction: { parts: [{ text: SYS }] },
      contents: [{ role: 'user', parts }],
      generationConfig: { maxOutputTokens: b.mode === 'hint' ? 2048 : 8192 },
    });

    let last = 'The tutor is busy right now. Please try again in a moment.';
    for (const model of MODELS) {
      for (let a = 0; a < 2; a++) {
        let r, d;
        try {
          r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY }, body });
          d = await r.json();
        } catch { await wait(1500 * (a + 1)); continue; }
        if (r.ok) {
          const t = ((d.candidates && d.candidates[0] && d.candidates[0].content && d.candidates[0].content.parts) || []).filter(x => x.text && !x.thought).map(x => x.text).join('\n').trim();
          if (t) return send({ text: t });
          last = 'The tutor could not answer this one. Please try again.';
          break;
        }
        if ([429, 500, 502, 503, 504].includes(r.status)) { await wait(2000 * (a + 1)); continue; }
        if (r.status === 404) break;
        return send({ error: 'The tutor is unavailable right now.' }, 502);
      }
    }
    return send({ error: last }, 503);
  },
};