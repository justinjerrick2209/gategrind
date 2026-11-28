/* Gate Zone tutor without Puter. No sign-in, no API key for students.
   Replaces aiCall() with a ROUND-ROBIN over several free routes, so no single quota is used up fast:
     1. your Cloudflare Worker (set TUTOR_ENDPOINT in Config.js; it rotates Gemini/Groq/OpenRouter/Mistral keys of YOURS)
     2. keyless public models on text.pollinations.ai (best effort; may be slow or limited at busy times)
   Each request starts at the next route in the list; a route that is rate limited rests for a while and the next one answers.
   Load LAST in practice.html and REMOVE the line that loads js.puter.com:  <script src="gz-ai.js"></script> */
(function () {
  if (window.__gzAI) return; window.__gzAI = 1;
  var CFG = window.GATEGRIND_CONFIG || {}, WORKER = String(CFG.TUTOR_ENDPOINT || '').trim();
  if (/YOUR-WORKER/.test(WORKER)) WORKER = '';

  var POOL = [];
  if (WORKER) POOL.push({ id: 'worker', kind: 'worker', v: 1 });
  POOL.push({ id: 'pol-openai', kind: 'pol', model: 'openai', v: 1 });
  if (WORKER) POOL.push({ id: 'worker2', kind: 'worker', v: 1 });
  POOL.push({ id: 'pol-mistral', kind: 'pol', model: 'mistral', v: 0 });
  POOL.push({ id: 'pol-llama', kind: 'pol', model: 'llama', v: 0 });

  var CK = 'gategrind-ai2-cool', PK = 'gategrind-ai2-ptr', cool = {}, ptr = 0;
  try { cool = JSON.parse(localStorage.getItem(CK) || '{}'); } catch (e) {}
  try { ptr = +localStorage.getItem(PK) || 0; } catch (e) {}
  var save = function () { try { localStorage.setItem(CK, JSON.stringify(cool)); localStorage.setItem(PK, String(ptr)); } catch (e) {} };
  var cdKey = function (p) { return p.kind === 'worker' ? 'worker' : p.id; };

  function order(vision) {
    var pool = POOL.filter(function (p) { return !vision || p.v; });
    if (!pool.length) return [];
    var s = ptr++ % pool.length, now = Date.now(); save();
    var rot = pool.slice(s).concat(pool.slice(0, s));
    return rot.filter(function (p) { return (cool[cdKey(p)] || 0) <= now; })
      .concat(rot.filter(function (p) { return (cool[cdKey(p)] || 0) > now; })).slice(0, 5);
  }
  function rest(p, status) {
    cool[cdKey(p)] = Date.now() + (status === 429 ? 90e3 : (status === 401 || status === 402 || status === 403 || status === 404) ? 3600e3 : 20e3);
    save();
  }
  function toDataUrl(file) {
    return new Promise(function (ok, no) { var r = new FileReader(); r.onload = function () { ok(String(r.result)); }; r.onerror = no; r.readAsDataURL(file); });
  }
  async function ask(p, prompt, url) {
    var ctl = new AbortController(), t = setTimeout(function () { ctl.abort(); }, 60000);
    try {
      var r, d;
      if (p.kind === 'worker') {
        r = await fetch(WORKER, { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: ctl.signal,
          body: JSON.stringify({ mode: 'raw', prompt: prompt, image: url ? { mime_type: url.slice(5, url.indexOf(';')), data: url.split(',')[1] } : null }) });
        d = await r.json().catch(function () { return {}; });
        if (!r.ok || d.error || !d.text) throw { status: r.status };
        return String(d.text).trim();
      }
      var content = url ? [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: url } }] : prompt;
      r = await fetch('https://text.pollinations.ai/openai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: ctl.signal,
        body: JSON.stringify({ model: p.model, messages: [{ role: 'user', content: content }], max_tokens: 4096 }) });
      d = await r.json().catch(function () { return {}; });
      if (!r.ok) throw { status: r.status };
      var c = d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content;
      return String(Array.isArray(c) ? c.map(function (x) { return x.text || ''; }).join('') : c || '').trim();
    } finally { clearTimeout(t); }
  }

  var gzCall = async function (prompt, file, onPart) {
    var url = null;
    if (file) { try { url = await toDataUrl(file); } catch (e) {} }
    var list = order(!!url), err = 'The tutor is busy right now. Please try again in a moment.';
    for (var i = 0; i < list.length; i++) {
      try {
        var out = await ask(list[i], prompt, url);
        if (out) { if (cool[cdKey(list[i])]) { delete cool[cdKey(list[i])]; save(); } if (typeof onPart === 'function') onPart(out); return out; }
        rest(list[i], 0);
      } catch (e) { rest(list[i], e && e.status); }
    }
    throw new Error(err);
  };
  window.aiCall = gzCall;
  addEventListener('load', function () { window.aiCall = gzCall; });   /* in case the page script ran after this file */
  window.aiPoolStatus = function () { console.table(POOL.map(function (p) { return { route: p.id, vision: !!p.v, resting_seconds: Math.max(0, Math.round(((cool[cdKey(p)] || 0) - Date.now()) / 1000)) }; })); };

  /* the old code only checks that "puter" exists and is signed in; this stub makes that check pass without Puter.
     It is locked, so even if the Puter script is still on the page it cannot replace it (no Puter sign-in window). */
  var STUB = { auth: { isSignedIn: function () { return true; }, signIn: function () { return Promise.resolve(); } },
    ai: { listModels: function () { return Promise.resolve([]); }, chat: function () { return Promise.reject(new Error('Puter removed')); } } };
  try { Object.defineProperty(window, 'puter', { get: function () { return STUB; }, set: function () {}, configurable: true }); }
  catch (e) { window.puter = STUB; }
  console.log('[gz-ai] active: tutor uses round robin, not Puter. Type aiPoolStatus() to see the routes.');
})();