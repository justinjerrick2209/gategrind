/* Gate Zone profile bridge.
   Add ONE line just before </body> in index.html:  <script src="profile-bridge.js"></script>
   It does not touch your existing code. It (1) sends visitors who are not signed in to landing.html,
   (2) shows the signed-in user when "Profile" is opened, and (3) adds a Sign out button. */
(function () {
  var LANDING = 'landing.html', REQUIRE_LOGIN = true;

  function current() {
    try { var u = JSON.parse(localStorage.getItem('gg-user')); if (u && u.id) return u; } catch (e) {}
    for (var i = 0; i < localStorage.length; i++) {            // Supabase session saved by the landing page
      var k = localStorage.key(i);
      if (/^sb-.*-auth-token$/.test(k)) {
        try { var s = JSON.parse(localStorage.getItem(k)), m = s && (s.user || (s.currentSession && s.currentSession.user)); if (m && m.email) return { id: m.email.split('@')[0] }; } catch (e) {}
      }
    }
    return null;
  }

  var user = current();
  if (!user) { if (REQUIRE_LOGIN) location.replace(LANDING); return; }

  function signOut() {
    Object.keys(localStorage).forEach(function (k) { if (k === 'gg-user' || /^sb-.*-auth-token$/.test(k)) localStorage.removeItem(k); });
    location.replace(LANDING + '?logout=1');
  }

  var css = document.createElement('style');
  css.textContent =
    '.ggp-wrap{position:fixed;inset:0;z-index:99999;display:grid;place-items:center;background:rgba(3,6,14,.72);backdrop-filter:blur(8px)}' +
    '.ggp{width:min(380px,92vw);padding:28px;border-radius:20px;background:rgba(5,7,15,.92);border:1px solid rgba(59,130,246,.3);box-shadow:0 30px 90px rgba(0,0,0,.6),0 0 60px rgba(37,99,235,.25);color:#eef4ff;font:400 15px/1.5 "IBM Plex Sans",system-ui,sans-serif;text-align:center}' +
    '.ggp .av{width:72px;height:72px;margin:0 auto 14px;border-radius:24px 24px 24px 6px;display:grid;place-items:center;font:800 32px "Bricolage Grotesque",sans-serif;color:#00040f;background:linear-gradient(135deg,#60a5fa,#2563eb);box-shadow:0 0 40px rgba(59,130,246,.7)}' +
    '.ggp h3{margin:0 0 4px;font:800 22px "Bricolage Grotesque",sans-serif;color:#fff}' +
    '.ggp code{display:block;margin:6px 0 4px;font:600 15px "IBM Plex Mono",monospace;color:#93c5fd;word-break:break-all}' +
    '.ggp .ok{font-size:12.5px;color:#6be0a0;margin-bottom:18px}' +
    '.ggp button{width:100%;margin-top:8px;padding:12px;border-radius:12px;font:600 15px "IBM Plex Sans",sans-serif;cursor:pointer;border:1px solid rgba(59,130,246,.3);background:rgba(255,255,255,.04);color:#eef4ff}' +
    '.ggp button.out{border:0;color:#fff;background:linear-gradient(135deg,#ff6b6b,#d63a4a)}' +
    '.ggp-inline{margin:20px 0}';
  document.head.appendChild(css);

  function card() {
    var d = document.createElement('div');
    d.className = 'ggp';
    d.innerHTML = '<div class="av"></div><h3>Your profile</h3><code></code><div class="ok">● Signed in</div>';
    d.querySelector('.av').textContent = user.id[0].toUpperCase();
    d.querySelector('code').textContent = user.id;
    var b = document.createElement('button'); b.className = 'out'; b.textContent = 'Sign out'; b.onclick = signOut; d.appendChild(b);
    return d;
  }

  function open() {
    var host = document.querySelector('#page-profile,#profile-page,#profile,[data-page="profile"]');
    if (host && host.offsetParent !== null) {                    // your own Profile page exists: put the card inside it
      if (!host.querySelector('.ggp')) { var c = card(); c.classList.add('ggp-inline'); host.prepend(c); }
      return;
    }
    var w = document.createElement('div'); w.className = 'ggp-wrap';
    var c2 = card(), x = document.createElement('button'); x.textContent = 'Close'; x.onclick = function () { w.remove(); };
    c2.appendChild(x); w.appendChild(c2);
    w.addEventListener('click', function (e) { if (e.target === w) w.remove(); });
    document.body.appendChild(w);
  }

  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('button,a,li,[role="button"]');
    if (b && /^\s*Profile\s*$/i.test(b.textContent)) { setTimeout(open, 60); }
  }, true);

  /* ===== Page transitions (glow sweep + 3D slide/blur-in on every page switch) ===== */
  (function () {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var st = document.createElement('style');
    st.textContent =
      '.gz-bar{position:fixed;top:0;left:0;width:100%;height:3px;z-index:99998;pointer-events:none;opacity:0;transform:translateX(-100%);background:linear-gradient(90deg,transparent,#60a5fa,#93c5fd,transparent);box-shadow:0 0 18px #60a5fa}' +
      '.gz-bar.run{animation:gzbar .75s cubic-bezier(.65,0,.35,1)}' +
      '@keyframes gzbar{0%{transform:translateX(-100%);opacity:1}85%{opacity:1}100%{transform:translateX(100%);opacity:0}}' +
      '.gz-in{animation:gzin .55s cubic-bezier(.2,.8,.2,1) both;transform-origin:50% 0}' +
      '@keyframes gzin{from{opacity:0;transform:perspective(1200px) translateY(26px) rotateX(5deg) scale(.985);filter:blur(8px)}to{opacity:1;transform:none;filter:blur(0)}}' +
      '.gz-veil{position:fixed;inset:0;z-index:99997;pointer-events:none;background:radial-gradient(circle at 50% 45%,#191919,#000000 70%);animation:gzveil .9s ease forwards}' +
      '@keyframes gzveil{0%{opacity:1}60%{opacity:.5}100%{opacity:0;visibility:hidden}}';
    document.head.appendChild(st);
    var bar = document.createElement('div'); bar.className = 'gz-bar'; document.body.appendChild(bar);

    function targets() {
      var t = document.querySelector('.topbar'), p = t && t.parentElement;
      var list = p ? [].filter.call(p.children, function (e) {
        return e !== t && !/^(SCRIPT|STYLE)$/.test(e.tagName) && e.offsetParent !== null && getComputedStyle(e).position !== 'fixed';
      }) : [];
      if (!list.length) { var m = document.querySelector('main'); if (m) list = [m]; }
      return list;
    }
    function play() {
      bar.classList.remove('run'); void bar.offsetWidth; bar.classList.add('run');
      targets().forEach(function (e) {
        e.classList.remove('gz-in'); void e.offsetWidth; e.classList.add('gz-in');
        setTimeout(function () { e.classList.remove('gz-in'); }, 650);
      });
    }
    function wrap() {
      if (typeof window.show === 'function' && !window.show.gz) {
        var o = window.show;
        window.show = function () { var r = o.apply(this, arguments); play(); return r; };
        window.show.gz = 1;
      }
      return !!(window.show && window.show.gz);
    }
    var hooked = wrap();
    addEventListener('load', function () { hooked = wrap() || hooked; });
    /* fallback if the site has no global show(): animate after any sidebar / nav click */
    document.addEventListener('click', function (e) {
      if (hooked) return;
      if (e.target.closest && e.target.closest('.nav button,.rail button,aside button,aside a,nav button,nav a')) setTimeout(play, 40);
    }, true);

    var v = document.createElement('div'); v.className = 'gz-veil'; document.body.appendChild(v);
    setTimeout(function () { v.remove(); }, 1000); play();
  })();
})();