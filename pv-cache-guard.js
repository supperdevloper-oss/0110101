/* ══════════════════════════════════════════════════════════════════════════
   Paraveda CRM — «لعيبة الكاش» (v3.105)
   ──────────────────────────────────────────────────────────────────────────
   كل بضع ثوان (5 ثواني بالافتراض) كنمسحو **الكاش التقني**:
     • CacheStorage ديال Service Workers القدام (صفحات/JS قديم مخزّن)
     • كنحدّثو الـ Service Worker باش الهاتف ياخد أحدث كود
     • كنطلبو سنابشوت طري بـ cache-buster (?_=...) — والسيرفر كيرجّع
       304 رخيص إلا ما تبدّل والو (ETag).
   ⚠️ ما كنمسحوا **أبداً** localStorage ديال الطلبيات/اليوزرز/السجل:
      هادشي هو بالضبط لي كان كيضيّع التغييرات. كنمسحو غير الكاش ديال
      المتصفح/الشبكة، والداتا كتبقى فالسيرفر وفالهاتف.
   تقدر تبدّل المدة: window.PV_CACHE_MS = 3000;  (قبل ما يحل index.html)
   ══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var VERSION = 'paraveda-v105';
  var TICK = Number(window.PV_CACHE_MS) || 5000;   // «من بعد كولا تواني»
  var SW_TICK = 30000;
  var lastPurge = 0;

  function toast(msg) {
    try {
      var el = document.createElement('div');
      el.setAttribute('dir', 'rtl');
      el.textContent = msg;
      el.style.cssText = 'position:fixed;bottom:52px;left:12px;z-index:100002;' +
        'background:#0f172a;color:#fff;padding:9px 14px;border-radius:12px;' +
        'font:12px system-ui;max-width:82vw;box-shadow:0 6px 20px rgba(0,0,0,.3)';
      document.body.appendChild(el);
      setTimeout(function () { el.remove(); }, 4200);
    } catch (e) {}
  }

  /* 1) مسح كاش الـ HTTP / Service Worker القديم — بلا مسح بيانات CRM */
  function purgeCaches(verbose) {
    try {
      if (!window.caches || !caches.keys) { if (verbose) toast('✅ الكاش التقني نقي'); return; }
      caches.keys().then(function (names) {
        var removed = 0;
        return Promise.all(names.map(function (n) {
          if (n === VERSION) return null;
          removed++;
          return caches.delete(n);
        })).then(function () {
          lastPurge = Date.now();
          if (verbose) toast('🧹 تمسح الكاش التقني (' + removed + ') — الداتا بقات ✅');
        });
      }).catch(function () {});
    } catch (e) {}
  }

  /* 2) تحديث الـ Service Worker + حيد أي SW قديم من نسخة أخرى */
  function updateSW() {
    try {
      if (!navigator.serviceWorker || !navigator.serviceWorker.getRegistrations) return;
      navigator.serviceWorker.getRegistrations().then(function (regs) {
        regs.forEach(function (r) {
          var url = (r.active && r.active.scriptURL) || (r.installing && r.installing.scriptURL) || '';
          if (url && url.indexOf('sw.js') === -1) { r.unregister(); return; }
          try { r.update(); } catch (e) {}
        });
      }).catch(function () {});
    } catch (e) {}
  }

  /* 3) طلب طري للسيرفر (cache-buster + ETag) */
  function refresh() {
    try { if (window.__pvForceRefresh) window.__pvForceRefresh(); } catch (e) {}
  }

  /* ── الشريط الصغير ديال حالة الحفظ ─────────────────────────────────── */
  function buildBadge() {
    if (document.getElementById('pv-sync-badge')) return;
    var b = document.createElement('button');
    b.id = 'pv-sync-badge';
    b.type = 'button';
    b.setAttribute('dir', 'rtl');
    b.title = 'اضغط باش تمسح الكاش التقني وتجيب أحدث داتا (الداتا ما كتمسحش)';
    b.style.cssText = 'position:fixed;bottom:10px;left:10px;z-index:100001;' +
      'border:0;cursor:pointer;background:rgba(15,23,42,.82);color:#e2e8f0;' +
      'padding:4px 10px;border-radius:999px;font:11px/1.6 system-ui;' +
      'backdrop-filter:blur(6px);opacity:.72;transition:opacity .2s';
    b.textContent = '✅ محفوظ';
    b.onmouseenter = function () { b.style.opacity = '1'; };
    b.onmouseleave = function () { b.style.opacity = '.72'; };
    b.onclick = function () { purgeCaches(true); updateSW(); refresh(); };
    (document.body || document.documentElement).appendChild(b);
    window.__pvBadge = b;
  }

  var hideTimer = null;
  function setBadge(state) {
    var b = window.__pvBadge;
    if (!b) return;
    var txt = state === 'saving' ? '⏳ كيتسجل…'
      : state === 'offline' ? '⚠️ الشبكة مقطوعة — غيتحفظ أوتوماتيك'
      : '✅ محفوظ';
    b.textContent = txt;
    b.style.background = state === 'offline' ? 'rgba(153,27,27,.9)'
      : state === 'saving' ? 'rgba(180,83,9,.9)' : 'rgba(15,23,42,.82)';
    if (hideTimer) clearTimeout(hideTimer);
    if (state === 'saved') {
      hideTimer = setTimeout(function () {
        b.style.opacity = '.35';
      }, 6000);
    } else {
      b.style.opacity = '.95';
    }
  }

  try {
    window.addEventListener('pv:sync-status', function (e) {
      setBadge(e && e.detail && e.detail.state ? e.detail.state : 'saved');
    });
  } catch (e) {}

  function boot() {
    buildBadge();
    purgeCaches(false);
    /* مسح الكاش التقني كل بضع ثوان. طلب الداتا الطرية كيديرو مفعّل
       التزامن فـ index.html (نفس الـ 5 ثوان، بـ cache-buster + ETag)
       → ما كنديروش جوج طلبات فكل مرة. */
    setInterval(function () { purgeCaches(false); }, TICK);
    setInterval(updateSW, SW_TICK);
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) { purgeCaches(false); refresh(); }
    });
    window.addEventListener('online', function () { purgeCaches(false); updateSW(); refresh(); });
    setTimeout(updateSW, 2000);
  }

  window.PVCache = {
    version: VERSION,
    purge: function () { purgeCaches(true); },
    refresh: refresh,
    tick: TICK
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
