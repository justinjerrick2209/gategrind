/* Gate Zone fit: question pictures / text fill the question box in Library, Saved and Review (no empty side space).
   Additive. Load LAST in practice.html:  <script src="gz-fit.js"></script> */
(function () {
  if (window.__gzFit) return; window.__gzFit = 1;
  var st = document.createElement('style');
  st.textContent =
    /* picture questions: use the full width of the card, scale up to a readable size */
    '.app .library-preview-link,.app a.saved-question-image{display:block !important;width:100% !important;max-width:none !important}' +
    '.app .item img.qimg,.app .item img.library-preview-image,.app .item img[data-gz-q],.app .saved-question-image img{' +
      'display:block;width:100% !important;max-width:1100px !important;height:auto !important;margin:6px auto !important}' +
    '.app .library-preview,.app .visual{max-width:none !important;width:100%}' +
    /* tighter card so no dead space around the question */
    '.app .library-item,.app .item{padding-top:14px !important;padding-bottom:14px !important}' +
    '.app .library-preview{margin:6px 0 !important;padding:0 !important}' +
    /* text questions (gz-text.js): bigger type, figure centred and as wide as the box allows */
    '.app .gz-qtext{width:100%;max-width:none !important;font-size:clamp(17px,1.4vw,20px) !important;line-height:1.7 !important}' +
    '.app .gz-fig{width:100% !important;max-width:min(100%,920px) !important;margin:16px auto 8px !important}' +
    '.app .gz-opts{margin-top:16px !important;gap:10px !important}' +
    '.app .gz-opt{font-size:inherit}';
  document.head.appendChild(st);
})();