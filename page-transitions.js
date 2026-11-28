/* Gate Zone page transitions: glow sweep + 3D slide/blur-in on every page switch (Practice studio, Library, Saved, Profile, sessions). */
(function () {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var st = document.createElement('style');
  st.textContent =
    '.gz-bar{position:fixed;top:0;left:0;width:100%;height:3px;z-index:99998;pointer-events:none;opacity:0;transform:translateX(-100%);background:linear-gradient(90deg,transparent,#60a5fa,#93c5fd,transparent);box-shadow:0 0 18px #60a5fa}' +
    '.gz-bar.run{animation:gzbar .75s cubic-bezier(.65,0,.35,1)}' +
    '@keyframes gzbar{0%{transform:translateX(-100%);opacity:1}85%{opacity:1}100%{transform:translateX(100%);opacity:0}}' +
    '.gz-in{animation:gzin .55s cubic-bezier(.2,.8,.2,1) both;transform-origin:50% 0}' +
    '@keyframes gzin{from{opacity:0;transform:perspective(1200px) translateY(26px) rotateX(5deg) scale(.985);filter:blur(8px)}to{opacity:1;transform:none;filter:blur(0)}}';
  document.head.appendChild(st);
  var bar = document.createElement('div'); bar.className = 'gz-bar'; document.body.appendChild(bar);
  var IDS = ['home', 'session', 'review', 'library', 'saved', 'progress'];
  function play() {
    bar.classList.remove('run'); void bar.offsetWidth; bar.classList.add('run');
    IDS.forEach(function (id) {
      var e = document.getElementById(id);
      if (!e || e.classList.contains('hide')) return;
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
  }
  wrap(); addEventListener('load', wrap);
})();