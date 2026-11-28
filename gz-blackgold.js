/* Gate Zone: NEON COBALT theme (black + blue glow), new profile button. (file name kept so no HTML change is needed)  Additive: load LAST in practice.html
   <script src="gz-blackgold.js"></script>   (after gz-exam.js)
   Replaces the navy/blue shades with near-black + gold, restyles every profile avatar
   (sidebar, profile page, and the round top-right button) into a gold-ringed tile. */
(function () {
  if (window.__gzBG) return; window.__gzBG = 1;
  var G1 = '#93c5fd', G2 = '#60a5fa', G3 = '#1d4ed8';
  var css = [
  /* ---------- palette ---------- */
  ':root.dark{--paper:#000;--card:#05070f;--ink:#eef4ff;--text:#dbe6ff;--muted:#7f93c4;--line:rgba(59,130,246,.30);--rail:#030303;--hi:rgba(59,130,246,.18);--hi-ink:#93c5fd;--blue-soft:#93c5fd;--pen-edge:#1d4ed8;--glow:rgba(59,130,246,.5);--ok:#34d399;--bad:#ff8f7a}',
  'html:root.dark body{background-color:#000 !important}',
  'html:root.dark body::before{background:radial-gradient(900px 620px at 92% -6%,rgba(59,130,246,.20),transparent 65%),radial-gradient(760px 560px at -6% 104%,rgba(37,99,235,.16),transparent 65%),#000 !important}',
  /* panels / cards that were hard-coded navy */
  'html:root.dark body :is(.builder,.lower-card,.quick-mix,.scorecard,.pg-card,.library-item,.pg-insight,.item,.subject,.modal-card,.intro,.question,.active-session-banner){background-color:rgba(5,7,15,.97) !important;border-color:rgba(59,130,246,.20) !important}',
  'html:root.dark body :is(.builder,.lower-card,.quick-mix,.scorecard,.pg-card,.library-item,.item,.modal-card,.question){background-image:none !important;background:linear-gradient(rgba(5,7,15,.97),rgba(5,7,15,.97)) padding-box,linear-gradient(140deg,rgba(59,130,246,.55),rgba(59,130,246,.08) 45%,rgba(37,99,235,.45)) border-box !important}',
  'html:root.dark body .subject.selected{background:linear-gradient(140deg,rgba(59,130,246,.22),rgba(37,99,235,.12)) !important;border-color:#60a5fa !important}',
  'html:root.dark body .pg-hero{background:linear-gradient(135deg,rgba(59,130,246,.16),rgba(10,10,10,.97) 62%) !important}',
  'html:root.dark body :is(.search,input.search,input,select,textarea){background-color:#070a14 !important;color:#f8f2e4;border-color:rgba(59,130,246,.28)}',
  'html:root.dark body aside.sidebar{border-right:1px solid rgba(59,130,246,.16) !important;background:linear-gradient(180deg,rgba(8,8,8,.94),rgba(4,4,4,.97)) !important}',
  'html:root.dark body header.topbar{background:linear-gradient(180deg,rgba(8,8,8,.9),rgba(5,5,5,.6)) !important;border-bottom:1px solid rgba(59,130,246,.16) !important}',
  'html:root.dark body .brand-mark{background:linear-gradient(135deg,' + G1 + ',' + G3 + ') !important;color:#00040f !important}',
  'html:root.dark body .side-bottom{background:linear-gradient(160deg,rgba(59,130,246,.10),rgba(255,255,255,.02)) !important}',
  'html:root.dark body .exam-countdown-pill{background:linear-gradient(160deg,rgba(59,130,246,.24),rgba(10,10,10,.9)) !important;border-color:rgba(59,130,246,.5) !important;box-shadow:0 12px 30px -12px rgba(59,130,246,.5) !important}',
  'html:root.dark body .exam-countdown-clock{text-shadow:0 0 14px rgba(59,130,246,.8) !important}',
  'html:root.dark body :is(.primary,button.primary,#start){background:linear-gradient(135deg,' + G2 + ',#2563eb) !important;color:#00040f !important;text-shadow:none !important;border:1px solid rgba(147,197,253,.55) !important}',
  'html:root.dark ::selection{background:rgba(59,130,246,.35)}',
  /* ---------- exam screen: black + gold ---------- */
  'html:root.dark body.in-session #gxe-head,html:root.dark body.in-session #gxe-strip,html:root.dark .gxe-left,html:root.dark .gxe-right,html:root.dark .gxe-box{background:#06080f !important;border-color:rgba(59,130,246,.22) !important}',
  'html:root.dark .gxe-left,html:root.dark .gxe-right{box-shadow:0 18px 50px -28px rgba(59,130,246,.35),inset 0 1px 0 rgba(255,255,255,.04)}',
  'html:root.dark .gxe-n{background:#111;border-color:rgba(59,130,246,.28)}',
  'html:root.dark .gxe-n.ans{background:' + G2 + ';border-color:' + G2 + ';color:#00040f}',
  'html:root.dark .gxe-n.vis{border-color:#ff8a70;color:#ffb3a0}',
  'html:root.dark .gxe-n.cur{background:linear-gradient(135deg,' + G1 + ',#3b82f6);color:#00040f;box-shadow:0 0 0 3px rgba(59,130,246,.3)}',
  'html:root.dark .gxe-legend i[style*="1fb7a5"]{background:' + G2 + ' !important}',
  'html:root.dark .gxe-submit{background:linear-gradient(120deg,' + G1 + ',' + G2 + ' 55%,#2563eb) !important;box-shadow:0 8px 22px -10px rgba(59,130,246,.7)}',
  'html:root.dark .gxe-btn,html:root.dark .gxe-timer,html:root.dark .gxe-pad button{border-color:rgba(59,130,246,.28);background:#070a14}',
  'html:root.dark .gxe-btn:hover,html:root.dark .gxe-pad button:hover{border-color:' + G2 + ';background:rgba(59,130,246,.08)}',
  'html:root.dark .gxe-hint kbd{background:#111;border-color:rgba(59,130,246,.3)}',
  'html:root.dark #gxe-calc .body{background:#05070f;border:1px solid rgba(59,130,246,.35);box-shadow:0 24px 60px rgba(0,0,0,.8),0 0 0 1px rgba(59,130,246,.08)}',
  'html:root.dark #gxe-calc .scr{background:#070b16;color:#93c5fd}',
  'html:root.dark #gxe-calc button.k{background:#1c1c1e;color:#e6eeff}',
  'html:root.dark #gxe-calc button.k.s,html:root.dark #gxe-calc .deg{background:#141416;color:#9fb2e0}',
  'html:root.dark #gxe-calc button.k.o{background:linear-gradient(135deg,' + G2 + ',#2563eb);color:#00040f}',
  /* ---------- PROFILE BUTTON: gold-ringed leaf tile (not a circle) ---------- */
  'html:root body .avatar,html:root body #acct-btn,html:root body .pg-av,html:root body .xx-none{',
  ' position:relative;display:inline-grid;place-items:center;border:2px solid transparent !important;border-radius:15px 15px 15px 4px !important;',
  ' background:linear-gradient(145deg,#0a1226,#05070f) padding-box,linear-gradient(135deg,' + G1 + ',' + G2 + ' 45%,' + G3 + ') border-box !important;',
  ' color:' + G2 + ' !important;font:800 15px/1 "IBM Plex Sans",system-ui,sans-serif !important;letter-spacing:.02em;text-shadow:0 0 12px rgba(59,130,246,.55) !important;',
  ' box-shadow:0 0 0 1px rgba(0,0,0,.6),0 8px 22px -6px rgba(59,130,246,.55),inset 0 0 14px rgba(59,130,246,.18) !important;',
  ' overflow:visible !important;cursor:pointer;transition:box-shadow .2s,color .2s,border-radius .25s !important}',
  'html:root body .avatar,html:root body #acct-btn{width:38px;height:38px}',
  'html:root body .pg-av{width:68px;height:68px;font-size:28px !important;border-radius:24px 24px 24px 6px !important}',
  'html:root body .pg-hero .pg-av{width:84px;height:84px;font-size:34px !important;border-radius:28px 28px 28px 7px !important}',
  /* online dot + shine */
  'html:root body :is(.avatar,#acct-btn,.gzbg-prof,.pg-av)::after{content:"";position:absolute;right:-4px;bottom:-4px;width:11px;height:11px;border-radius:50%;background:#34d399;border:2px solid #05070f;box-shadow:0 0 8px #34d399}',
  'html:root body :is(.avatar,#acct-btn,.gzbg-prof,.pg-av)::before{content:"";position:absolute;inset:0;border-radius:inherit;pointer-events:none;background:linear-gradient(115deg,transparent 35%,rgba(147,197,253,.28) 50%,transparent 65%);background-size:250% 100%;background-position:130% 0;transition:background-position .6s}',
  'html:root body :is(.avatar,#acct-btn,.gzbg-prof):hover{color:#fff !important;border-radius:15px 4px 15px 15px !important;box-shadow:0 0 0 1px rgba(0,0,0,.6),0 10px 28px -4px rgba(59,130,246,.85),inset 0 0 16px rgba(59,130,246,.3) !important}',
  'html:root body :is(.avatar,#acct-btn,.gzbg-prof):hover::before{background-position:-30% 0}',
  /* ---------- DEEPER black + gold ---------- */
  'html:root.dark body :is(h1,h2,h3,.pg-hero h2){color:#eef4ff !important;text-shadow:0 0 22px rgba(59,130,246,.28)}',
  'html:root.dark body :is(small,.hint,.sub,.muted,label,p){color:#8da0cf}',
  'html:root.dark body :is(.item-meta,.qno,.eyebrow,.kicker){color:#60a5fa !important}',
  'html:root.dark body :is(.builder,.lower-card,.quick-mix,.scorecard,.pg-card,.library-item,.item,.modal-card,.question){background:linear-gradient(#05070f,#05070f) padding-box,linear-gradient(140deg,rgba(147,197,253,.85),rgba(59,130,246,.22) 45%,rgba(37,99,235,.7)) border-box !important;box-shadow:0 0 0 1px rgba(59,130,246,.06),0 22px 60px -30px rgba(59,130,246,.45) !important}',
  'html:root.dark body :is(.chip,.pill,.counts button,button[data-mode],.subject,.lz-btn,.lz-seg,.lz-chip){background-color:#06080f !important;border-color:rgba(59,130,246,.38) !important;color:#dbe6ff}',
  'html:root.dark body :is(.counts button.active,button[data-mode].active,.lz-seg button.on,.lz-chip.on){background:linear-gradient(135deg,#60a5fa,#2563eb) !important;color:#00040f !important;border-color:#93c5fd !important}',
  'html:root.dark body .opt{background:#05070f !important;border:1px solid rgba(59,130,246,.3) !important;color:#dbe6ff}',
  'html:root.dark body .opt:hover:not(:disabled){border-color:#60a5fa !important;background:rgba(59,130,246,.10) !important;box-shadow:0 0 22px -8px rgba(59,130,246,.7)}',
  'html:root.dark body .opt.on{background:linear-gradient(135deg,rgba(59,130,246,.30),rgba(37,99,235,.18)) !important;border-color:#93c5fd !important;color:#eef4ff !important}',
  'html:root.dark body :is(button,.btn,.ghost):not(.primary):not(.gxe-submit):not(.opt):not(.gz-pfab):not(.avatar):not(#acct-btn){border-color:rgba(59,130,246,.34)}',
  'html:root.dark body :is(.ghost,button.secondary,.gxe-btn){background-color:#070a14;color:#dbe6ff}',
  'html:root.dark .gxe-title,html:root.dark .gxe-rh,html:root.dark .gxe-left h3{color:#93c5fd !important}',
  'html:root.dark .gxe-left,html:root.dark .gxe-right,html:root.dark #gxe-head,html:root.dark #gxe-strip{background:#05070f !important;border-color:rgba(59,130,246,.38) !important;box-shadow:0 0 0 1px rgba(59,130,246,.05),0 26px 70px -34px rgba(59,130,246,.6) !important}',
  'html:root.dark .gxe-n{background:#000;border-color:rgba(59,130,246,.4);color:#dbe6ff}',
  'html:root.dark .gxe-btn,html:root.dark .gxe-timer{background:#000;border-color:rgba(59,130,246,.45);color:#93c5fd}',
  'html:root.dark .gxe-right button:not(.gxe-submit):not(.primary){background:#070a14;border-color:rgba(59,130,246,.35);color:#dbe6ff}',
  'html:root.dark .gxe-right input[type=radio],html:root.dark .gxe-right input[type=checkbox]{accent-color:#60a5fa}',
  'html:root.dark input[type=radio],html:root.dark input[type=checkbox]{accent-color:#60a5fa}',
  'html:root.dark body .nav button,html:root.dark body aside .nav a{color:#a9bbe6}',
  'html:root.dark body .nav button svg,html:root.dark body aside svg{color:#60a5fa;stroke:currentColor}',
  'html:root.dark body .nav button:hover{background:rgba(59,130,246,.10) !important;color:#93c5fd}',
  'html:root.dark body :is(input,select,textarea):focus{outline:none;border-color:#60a5fa !important;box-shadow:0 0 0 3px rgba(59,130,246,.22)}',
  'html:root.dark body hr,html:root.dark body .divider{border-color:rgba(59,130,246,.25)}',
  'html:root.dark *{scrollbar-color:#1d4ed8 #05070f}',
  'html:root.dark ::-webkit-scrollbar{width:11px;height:11px}html:root.dark ::-webkit-scrollbar-track{background:#05070f}html:root.dark ::-webkit-scrollbar-thumb{background:linear-gradient(#60a5fa,#1d4ed8);border-radius:8px;border:2px solid #05070f}',
  'html:root.dark body .gz-qtext{color:#eef4ff}',
  'html:root.dark body .gz-opt>b{color:#60a5fa}',
  'html:root.dark body :is(.crumbs,.opt-label){color:#a9bbe6 !important}',
  'html:root.dark body button.secondary{background:#05070f !important;border:1px solid rgba(59,130,246,.5) !important;color:#93c5fd !important}',
  'html:root.dark body button.secondary:hover:not(:disabled){background:rgba(59,130,246,.14) !important;box-shadow:0 0 22px -8px rgba(59,130,246,.7)}',
  /* ---------- NEON COBALT: glows + gradients ---------- */
  'html:root.dark body :is(.builder,.lower-card,.quick-mix,.scorecard,.pg-card,.library-item,.item,.modal-card,.question,.gxe-left,.gxe-right){box-shadow:0 0 0 1px rgba(59,130,246,.10),0 0 26px -6px rgba(59,130,246,.45),0 22px 60px -30px rgba(37,99,235,.55) !important}',
  'html:root.dark body :is(.library-item,.item,.pg-card):hover{box-shadow:0 0 0 1px rgba(96,165,250,.35),0 0 34px -4px rgba(59,130,246,.6) !important}',
  'html:root.dark body :is(.primary,button.primary,#start,.gxe-submit,.lz-go){background:linear-gradient(120deg,#2563eb,#60a5fa) !important;color:#00040f !important;border:1px solid rgba(147,197,253,.55) !important;box-shadow:0 0 22px -4px rgba(59,130,246,.75) !important}',
  'html:root.dark body :is(.primary,button.primary,#start,.gxe-submit,.lz-go):hover:not(:disabled){box-shadow:0 0 30px -2px rgba(96,165,250,.95) !important;filter:brightness(1.08)}',
  'html:root.dark body .opt.on,html:root.dark body .gxe-n.cur{box-shadow:0 0 22px -4px rgba(59,130,246,.75) !important}',
  'html:root.dark body .gxe-n.ans{background:linear-gradient(135deg,#2563eb,#60a5fa) !important;color:#00040f !important}',
  'html:root.dark body :is(.counts button.active,button[data-mode].active,.lz-seg button.on,.lz-chip.on){background:linear-gradient(120deg,#2563eb,#60a5fa) !important;color:#00040f !important;box-shadow:0 0 16px -4px rgba(59,130,246,.8)}',
  'html:root.dark body :is(h1,h2,h3,.pg-hero h2){text-shadow:0 0 24px rgba(59,130,246,.45)}',
  'html:root.dark body :is(.avatar,#acct-btn,.pg-av){box-shadow:0 0 0 1px rgba(0,0,0,.6),0 0 22px -2px rgba(59,130,246,.8),inset 0 0 14px rgba(59,130,246,.25) !important}',
  /* ---------- logo: plain white "gatezone" (no gradient block) + readable active menu item ---------- */
  'html:root body .brand,html:root body .brand span:last-child,html:root body .gate-brand,html:root body .gate-brand b,html:root body .gate-brand i{background:none !important;-webkit-background-clip:border-box !important;background-clip:border-box !important;-webkit-text-fill-color:#fff !important;color:#fff !important;text-shadow:none !important;box-shadow:none !important;font-style:normal !important}',
  'html:root body .brand .brand-mark,html:root body .gate-brand .brand-mark{-webkit-text-fill-color:#00040f !important;color:#00040f !important;background:linear-gradient(135deg,#2563eb,#60a5fa) !important;box-shadow:0 0 18px -2px rgba(59,130,246,.8) !important}',
  'html:root.dark body aside.sidebar .nav button.active,html:root.dark body .resume-nav.active{background:linear-gradient(120deg,rgba(37,99,235,.38),rgba(96,165,250,.16)) !important;color:#eef4ff !important;font-weight:600;box-shadow:inset 3px 0 0 #60a5fa,0 0 24px -8px rgba(59,130,246,.7) !important}',
  'html:root.dark body aside.sidebar .nav button.active svg,html:root.dark body aside.sidebar .nav button.active::before{color:#93c5fd !important;stroke:currentColor}',
  /* ---------- sidebar menu hover: only a calm blue highlight, text stays fully visible, nothing moves or glows ---------- */
  'html:root body aside.sidebar .nav button:not(.active):is(:hover,:focus-visible,:active){background:rgba(37,99,235,.20) !important;color:#eef4ff !important;-webkit-text-fill-color:#eef4ff !important;text-shadow:none !important;opacity:1 !important;filter:none !important;box-shadow:none !important;transform:none !important;padding-left:10px !important;border-color:transparent !important;backdrop-filter:none !important}',
  'html:root body aside.sidebar .nav button:not(.active):is(:hover,:focus-visible,:active) *{color:#eef4ff !important;-webkit-text-fill-color:#eef4ff !important;opacity:1 !important}',
  'html:root body aside.sidebar .nav button:not(.active):is(:hover,:focus-visible,:active)::before{opacity:1 !important;color:#93c5fd !important;filter:none !important}',
  'html:root body aside.sidebar .nav button:not(.active):is(:hover,:focus-visible,:active)::after{display:none !important}',
  'html:root body aside.sidebar .nav button{transition:background .15s,color .15s !important}',
  /* ---------- question card: height follows the question ---------- */
  'body.in-session .gxe-split{align-items:start !important}',
  'body.in-session .gxe-left{min-height:0 !important;height:auto !important}'
  ].join('\n');
  var st = document.createElement('style'); st.id = 'gz-blackgold'; st.textContent = css;
  document.head.appendChild(st);

})();