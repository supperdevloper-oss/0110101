/* ══════════════════════════════════════════════════════════════════════════
   Paraveda CRM — اختبارات الإصلاح v3.106
   تشغيل:  node tests/sync.test.js
   ──────────────────────────────────────────────────────────────────────────
   كنخرّجو الكود الحقيقي ديال index.html (PV-STORAGE + PV-SYNC) وكنشغّلوه
   فـ VM مع localStorage و fetch مزوّرين، و سيرفر مزوّر كيقلّب نفس منطق
   api.php (delta + وقت السيرفر + merge الصفوف). بهادشي الاختبار كيغطّي
   الكود لي كيخدم فعلاً فالهاتف، ماشي نسخة مكتوبة بوحدها.
   ══════════════════════════════════════════════════════════════════════════ */
'use strict';
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

function between(text, start, end) {
  const a = text.indexOf(start);
  const b = text.indexOf(end, a);
  if (a < 0 || b < 0) throw new Error('marker missing: ' + start);
  return text.slice(a, b + end.length);
}
const STORAGE_CODE = between(html, '/* ══════════════════════════════════════════════════════════════════════════\n   PV-STORAGE:START', '/* ===== PV-STORAGE:END ===== */');
const SYNC_CODE = between(html, '/* ══════════════════════════════════════════════════════════════════════════\n   PV-SYNC:START', '/* ===== PV-SYNC:END ===== */');
/* v3.106: كنخرّجو حتى كود حساب الفترة (I4) باش نتأكدو «اليوم» كيجي من السيرفر */
const PERIOD_START = html.indexOf('const bp="paraveda_period_v2"');
const PERIOD_END = html.indexOf('const xg=ee.createContext(null);', PERIOD_START);
if (PERIOD_START < 0 || PERIOD_END < 0) throw new Error('period markers missing');
const PERIOD_CODE = html.slice(PERIOD_START, PERIOD_END);
/* نحيـدو الوسم ديال <script> لي جا فاللول ديال بلوك التخزين */
const GUARD_BODY = STORAGE_CODE.replace(/^<script type="module" crossorigin>\s*/, '');

let passed = 0, failed = 0;
function ok(cond, msg) {
  if (cond) { passed++; console.log('  ✅ ' + msg); }
  else { failed++; console.error('  ❌ ' + msg); }
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ── localStorage مزوّر بـ quota ديال الهاتف (5MB بـ UTF-16) ────────────── */
/* كل جهاز كياخد كلاس Storage بوحدو: فالمتصفح كيتpatch مرة وحدة،
   أما فالاختبار كنشغّلو بزاف ديال الأجهزة فنفس الـ process. */
function newStorageClass() {
  return class Storage {
    constructor(data, quota) {
      this._d = new Map(Object.entries(data || {}));
      this.quota = quota || 5 * 1024 * 1024;
    }
    get length() { return this._d.size; }
    key(i) { return Array.from(this._d.keys())[i] ?? null; }
    _used() {
      let n = 0;
      for (const [k, v] of this._d) n += (k.length + String(v).length) * 2;
      return n;
    }
    getItem(k) { return this._d.has(k) ? this._d.get(k) : null; }
    setItem(k, v) {
      const s = String(v);
      const delta = (k.length + s.length) * 2 - (this._d.has(k) ? (k.length + String(this._d.get(k)).length) * 2 : 0);
      if (this._used() + delta > this.quota) {
        const e = new Error('The quota has been exceeded.'); e.name = 'QuotaExceededError'; throw e;
      }
      this._d.set(k, s);
    }
    removeItem(k) { this._d.delete(k); }
    cloneData() { return Object.fromEntries(this._d); }
  };
}

/* ── منطق الدمج ديال api.php (crm_merge_row / crm_merge_orders) ─────────── */
const DATE_FIELDS = ['dateCreation', 'dateConfirmation', 'dateExp', 'dateLiv'];
function mergeRow(a, b) {                    // a = stocké, b = entrant
  const ua = Number(a._u) || 0, ub = Number(b._u) || 0;
  let base = ub >= ua ? { ...b } : { ...a };
  const oth = ub >= ua ? a : b;
  if (a._del || b._del) return a._del ? a : b;
  const bf = base._f || {}, of = oth._f || {};
  for (const k of Object.keys(of)) {
    if ((Number(of[k]) || 0) > (Number(bf[k]) || 0) && k in oth &&
        String(oth[k] ?? '') !== String(base[k] ?? '')) {
      base[k] = oth[k]; base._f = { ...(base._f || {}), [k]: of[k] };
    }
  }
  for (const dk of DATE_FIELDS) {
    if (!(dk in a)) continue;
    const av = String(a[dk]), bv = dk in b ? String(b[dk]) : '';
    if (av === bv) continue;
    const ta = Number((a._f || {})[dk]) || 0, tb = Number((b._f || {})[dk]) || 0;
    if (tb <= ta) { base[dk] = av; if (ta > 0) base._f = { ...(base._f || {}), [dk]: ta }; }
  }
  return base;
}
function mergeOrders(cur, incoming) {
  const byId = new Map(), order = [];
  for (const o of cur) if (o && o.id !== undefined) { byId.set(String(o.id), o); order.push(String(o.id)); }
  for (const o of incoming) {
    if (!o || o.id === undefined) continue;
    const id = String(o.id);
    if (byId.has(id)) byId.set(id, mergeRow(byId.get(id), o));
    else { byId.set(id, o); order.push(id); }
  }
  return Array.from(new Set(order)).map(id => byId.get(id)).sort((x, y) => Number(y.id) - Number(x.id));
}
function rebaseStamps(d, offset, now, ct) {
  if (!Array.isArray(d) || !offset || Math.abs(offset) < 2000) return d;
  const lo = ct - 600000, hi = ct + 600000;
  const fix = v => {
    if (typeof v !== 'number' || v < 1e12) return v;
    return Math.min(v >= lo && v <= hi ? v + offset : v, now);
  };
  return d.map(r => {
    if (!r || typeof r !== 'object') return r;
    const o = { ...r };
    if (o._u !== undefined) o._u = fix(o._u);
    if (o._f && typeof o._f === 'object') o._f = Object.fromEntries(Object.entries(o._f).map(([k, v]) => [k, fix(v)]));
    return o;
  });
}

/* ── السيرفر المزوّر ────────────────────────────────────────────────────── */
class MockServer {
  constructor(rows, opts) {
    opts = opts || {};
    this.serverDate = opts.serverDate || new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Casablanca', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    const now = Date.now();
    this.db = {
      paraveda_orders_v5: { t: now - 1000, d: rows.map(r => ({ ...r })) },
      paraveda_users_v1: { t: now - 1000, d: [{ id: 1, username: 'admin@paraveda.ma' }] },
      paraveda_history_v1: { t: now - 1000, d: [] },
      paraveda_reset_v1: { t: now - 60 * 86400000, d: 0 }   // طابع مسح قديم
    };
    this.requests = [];
    this.postDelay = 0;
    this.offline = false;
    this.etag = null;
  }
  snapshot() {
    const body = JSON.stringify(this.db);
    this.etag = '"' + crypto.createHash('md5').update(body).digest('hex') + '"';
    return { body, etag: this.etag };
  }
  async request(url, opts) {
    const isPost = opts && opts.method === 'POST';
    if (isPost && this.offline) throw new Error('network down');
    if (isPost && this.postDelay) await sleep(this.postDelay);
    const now = Date.now();
    if (!isPost) {
      const snap = this.snapshot();
      const inm = opts && opts.headers && opts.headers['If-None-Match'];
      if (inm && inm === snap.etag) return this.resp(null, 304, snap.etag, now);
      return this.resp(snap.body, 200, snap.etag, now);
    }
    const b = JSON.parse(opts.body);
    this.requests.push(b);
    const k = b.key;
    const ct = b.ct !== undefined ? b.ct : b.t;
    let offset = now - ct;
    offset = Math.max(-7 * 86400000, Math.min(7 * 86400000, offset));
    let d = rebaseStamps(b.d, offset, now, ct);
    const prev = this.db[k] || { t: 0, d: [] };
    if (b.delta && k === 'paraveda_orders_v5') {
      if (!d.length) return this.resp({ ok: true, noop: 'empty-delta', t: prev.t, serverTime: now }, 200, null, now);
      d = mergeOrders(prev.d, d);
    }
    if (k === 'paraveda_orders_v5') d = mergeOrders(prev.d, d);
    const prevJson = JSON.stringify(prev.d), newJson = JSON.stringify(d);
    if (prevJson === newJson) return this.resp({ ok: true, noop: 'same', t: prev.t, serverTime: now }, 200, null, now);
    const t = Math.max(prev.t + 1, now);
    this.db[k] = { t, d };
    return this.resp({ ok: true, t, serverTime: now }, 200, null, now);
  }
  resp(body, status, etag, now) {
    return {
      status, ok: status >= 200 && status < 300,
      headers: { get: n => n === 'X-CRM-Time' ? String(now) : n === 'X-CRM-Date' ? this.serverDate : (n === 'ETag' ? etag : null) },
      json: async () => JSON.parse(body),
      text: async () => body
    };
  }
}
function row(id, remarques) {
  return {
    id, dateCreation: '2026-11-09', dateConfirmation: '', statut: '', remarques,
    nom: 'زبون', telephone: '0612345678', ville: 'Casablanca', produit: 'Slim Bio',
    prix: 220, qte: 1, _u: 1, _f: {}
  };
}
function rowAgent(id, agent, date) {
  const r = row(id, '');
  r.agent = agent;
  if (date) r.dateCreation = date;
  return r;
}

/* ── مصنع الـ VM (جهاز / هاتف) ─────────────────────────────────────────── */
function makeClient(server, opts) {
  opts = opts || {};
  const ClientStorage = newStorageClass();
  const storage = new ClientStorage(opts.data || {}, opts.quota);
  const skew = opts.skew || 0;
  const RealDate = Date;
  class FakeDate extends RealDate {
    constructor(...args) { if (args.length === 0) super(RealDate.now() + skew); else super(...args); }
    static now() { return RealDate.now() + skew; }
  }
  const timers = new Set();
  const listeners = {};
  const windowObj = {
    PV_SYNC_MS: opts.pollMs || 5000,
    addEventListener: (n, f) => { (listeners[n] = listeners[n] || []).push(f); },
    dispatchEvent: e => { (listeners[e.type] || []).forEach(f => f(e)); return true; }
  };
  const documentObj = {
    hidden: false,
    readyState: 'complete',
    addEventListener: (n, f) => { (listeners['doc:' + n] = listeners['doc:' + n] || []).push(f); }
  };
  const sandbox = {
    console, Promise, JSON, Math, Number, String, Object, Array, Map, Set, Error, isFinite, Intl,
    Date: FakeDate, RegExp, Symbol, parseInt, parseFloat,
    Storage: ClientStorage, localStorage: storage, window: windowObj, document: documentObj,
    CustomEvent: class { constructor(type, o) { this.type = type; this.detail = o && o.detail; } },
    setTimeout: (f, ms) => { const t = setTimeout(() => { timers.delete(t); f(); }, ms); timers.add(t); return t; },
    clearTimeout: t => { timers.delete(t); clearTimeout(t); },
    setInterval: (f, ms) => { const t = setInterval(f, ms); timers.add(t); return t; },
    clearInterval: t => { timers.delete(t); clearInterval(t); },
    addEventListener: (n, f) => { (listeners[n] = listeners[n] || []).push(f); },
    fetch: (url, o) => server.request(url, o),
    b4: [], y4: [], O4: 400
  };
  sandbox.globalThis = sandbox;
  const ctx = vm.createContext(sandbox);
  vm.runInContext(GUARD_BODY, ctx, { filename: 'pv-storage.js' });
  vm.runInContext(SYNC_CODE, ctx, { filename: 'pv-sync.js' });
  vm.runInContext(PERIOD_CODE, ctx, { filename: 'pv-period.js' });
  return {
    ctx, storage, window: windowObj, document: documentObj, listeners, server,
    call: expr => vm.runInContext(expr, ctx),
    stop: () => { timers.forEach(t => { clearTimeout(t); clearInterval(t); }); timers.clear(); },
    fire: (name, detail) => { (listeners[name] || []).forEach(f => f({ type: name, detail })); }
  };
}
function setOrders(client, rows) { client.storage.setItem('paraveda_orders_v5', JSON.stringify(rows)); }

/* ══════════════════════════════════════════════════════════════════════ */
async function test1_mobileEditSurvives() {
  console.log('\n1) هاتف ساعتو متأخرة بساعة: التعديل كيوصل للسيرفر و كيبقى');
  const server = new MockServer([row(1, ''), row(2, ''), row(3, '')]);
  const c = makeClient(server, { skew: -3600000 });
  await c.call('S4()');
  const rows = JSON.parse(c.storage.getItem('paraveda_orders_v5'));
  const now = c.call('Date.now()');
  rows[0].remarques = 'Ttt'; rows[0]._u = now; rows[0]._f = { ...(rows[0]._f || {}), remarques: now };
  setOrders(c, rows);
  c.call('aa("paraveda_orders_v5")');
  await sleep(700);
  const post = server.requests.find(r => r.key === 'paraveda_orders_v5');
  ok(!!post, 'POST تصيفط');
  ok(!!post && post.delta === 1 && post.d.length === 1, 'POST صغير (دلتا = صف واحد)');
  ok(!!post && post.ct !== post.t, 'العميل صيفط ct (ساعتو) و t (ساعة السيرفر)');
  ok(server.db.paraveda_orders_v5.d.find(r => r.id === 1).remarques === 'Ttt', 'السيرفر حفظ «Ttt» رغم ساعة الهاتف الغالطة');
  await c.call('window.__pvForceRefresh()');
  const after = JSON.parse(c.storage.getItem('paraveda_orders_v5'));
  ok(after.find(r => r.id === 1).remarques === 'Ttt', 'الـ poll ما مسحش التعديل');
  c.stop();
}

async function test2_pollDoesNotKillPendingWrite() {
  console.log('\n2) سنابشوت كيجي فوسط POST: التعديل ما كيتمسحش');
  const server = new MockServer([row(1, ''), row(2, '')]);
  server.postDelay = 1200;
  const c = makeClient(server);
  await c.call('S4()');
  const rows = JSON.parse(c.storage.getItem('paraveda_orders_v5'));
  const now = c.call('Date.now()');
  rows[1].remarques = 'مهم'; rows[1]._u = now; rows[1]._f = { remarques: now };
  setOrders(c, rows);
  c.call('aa("paraveda_orders_v5")');
  await sleep(450);                       // POST بدا، مازال كيسنى الشبكة
  await c.call('window.__pvForceRefresh()');   // poll فنفس اللحظة
  const mid = JSON.parse(c.storage.getItem('paraveda_orders_v5'));
  ok(mid.find(r => r.id === 2).remarques === 'مهم', 'poll ما كتبش فوق التغيير المعلّق');
  await sleep(1900);
  ok(server.db.paraveda_orders_v5.d.find(r => r.id === 2).remarques === 'مهم', 'POST كمل والسيرفر حفظ');
  c.stop();
}

async function test3_offlineOutbox() {
  console.log('\n3) شبكة مقطوعة + إعادة فتح التطبيق: التعديل كيتصيفط من الـ outbox');
  const server = new MockServer([row(1, ''), row(2, '')]);
  const c = makeClient(server);
  await c.call('S4()');
  server.offline = true;
  const rows = JSON.parse(c.storage.getItem('paraveda_orders_v5'));
  const now = c.call('Date.now()');
  rows[0].remarques = 'Offline'; rows[0]._u = now; rows[0]._f = { remarques: now };
  setOrders(c, rows);
  c.call('aa("paraveda_orders_v5")');
  await sleep(700);
  ok(JSON.parse(c.storage.getItem('pv_outbox_keys') || '[]').includes('paraveda_orders_v5'), 'التعديل تسجّل فالـ outbox');
  ok(JSON.parse(c.storage.getItem('paraveda_orders_v5')).find(r => r.id === 1).remarques === 'Offline', 'التعديل باقي فالهاتف');
  c.call('window.__pvPersistBig()');
  const data = c.storage.cloneData();       // «إعادة فتح» بنفس localStorage
  c.stop();
  server.offline = false;
  const c2 = makeClient(server, { data });
  await c2.call('S4()');
  await sleep(600);
  ok(server.db.paraveda_orders_v5.d.find(r => r.id === 1).remarques === 'Offline', 'السيرفر استرجع التعديل بعد الرجوع للشبكة');
  ok(!JSON.parse(c2.storage.getItem('pv_outbox_keys') || '[]').includes('paraveda_orders_v5'), 'الـ outbox تنظّف');
  c2.stop();
}

async function test4_quotaAndOldReset() {
  console.log('\n4) كاش الهاتف (5MB) + طابع مسح قديم: حتى حاجة ما كتضيع');
  const raw = JSON.parse(fs.readFileSync(path.join(ROOT, 'crm_data.json'), 'utf8'));
  const big = JSON.stringify(raw.paraveda_orders_v5.d);
  const c = makeClient(new MockServer([]), { quota: 5 * 1024 * 1024 });
  c.storage.setItem('paraveda_orders_v5', big);   // 5.00MB → quota ديال الهاتف
  c.call('window.__pvPersistBig()');
  ok(String(c.storage._d.get('paraveda_orders_v5')).startsWith('PK1|'), 'تفعّل الضغط التلقائي (PK1)');
  ok(c.storage.getItem('paraveda_orders_v5') === big, 'getItem كيرجّع النص الأصلي بلا خسارة');
  ok(c.storage._used() < 4 * 1024 * 1024, 'الحجم تحت 4MB: ' + Math.round(c.storage._used() / 1024) + 'KB');
  ok(c.call('window.__pvStorageOK') === true, 'ما ضربش QuotaExceededError');
  /* طابع مسح قديم ما خاصوش يمسح الداتا ولا يعاود التحميل */
  const before = c.storage.getItem('paraveda_orders_v5');
  c.call('ig({paraveda_reset_v1:{t:1,d:0},paraveda_orders_v5:{t:Date.now()+5000,d:[]},paraveda_users_v1:{t:Date.now()+5000,d:[]}})');
  ok(c.storage.getItem('paraveda_orders_v5') === before, 'طابع المسح القديم ما مسحش الطلبيات');
  c.stop();
}

async function test5_twoDevicesNoOverwrite() {
  console.log('\n5) جوج أجهزة كيخدمو فنفس الوقت: كل تعديل كيبقى');
  const server = new MockServer([row(1, ''), row(2, '')]);
  const a = makeClient(server), b = makeClient(server, { skew: -1800000 });
  await a.call('S4()'); await b.call('S4()');
  const ra = JSON.parse(a.storage.getItem('paraveda_orders_v5'));
  const rb = JSON.parse(b.storage.getItem('paraveda_orders_v5'));
  ra[0].statut = 'Confirmé'; ra[0]._u = a.call('Date.now()'); ra[0]._f = { statut: ra[0]._u };
  rb[1].remarques = 'من الهاتف'; rb[1]._u = b.call('Date.now()'); rb[1]._f = { remarques: rb[1]._u };
  setOrders(a, ra); setOrders(b, rb);
  a.call('aa("paraveda_orders_v5")'); b.call('aa("paraveda_orders_v5")');
  await sleep(800);
  const s = server.db.paraveda_orders_v5.d;
  ok(s.find(r => r.id === 1).statut === 'Confirmé', 'تعديل الجهاز A باقي');
  ok(s.find(r => r.id === 2).remarques === 'من الهاتف', 'تعديل الجهاز B باقي');
  await a.call('window.__pvForceRefresh()'); await b.call('window.__pvForceRefresh()');
  ok(JSON.parse(a.storage.getItem('paraveda_orders_v5')).find(r => r.id === 2).remarques === 'من الهاتف', 'A شاف تعديل B');
  ok(JSON.parse(b.storage.getItem('paraveda_orders_v5')).find(r => r.id === 1).statut === 'Confirmé', 'B شاف تعديل A');
  a.stop(); b.stop();
}

async function test6_exactPhoneScenario() {
  console.log('\n6) السيناريو الحقيقي ديال 09/11: T → Tt → Ttt → Tttt + poll كل 5ث');
  const server = new MockServer([row(1, ''), row(2, ''), row(3, '')]);
  const c = makeClient(server, { skew: -2700000 });   // هاتف متأخر 45 دقيقة
  await c.call('S4()');
  let rows = JSON.parse(c.storage.getItem('paraveda_orders_v5'));
  for (const txt of ['T', 'Tt', 'Ttt', 'Tttt']) {
    const now = c.call('Date.now()');
    rows[0].remarques = txt;
    rows[0]._u = now;
    rows[0]._f = { ...(rows[0]._f || {}), remarques: now };
    setOrders(c, rows);              // نفس كتبة React فكل حرف
    c.call('aa("paraveda_orders_v5")');
    await sleep(150);
  }
  /* poll كيجي فنص الكتابة (هو لي كان كيمسح «Ttt» قديمًا) */
  await c.call('window.__pvForceRefresh()');
  ok(JSON.parse(c.storage.getItem('paraveda_orders_v5')).find(r => r.id === 1).remarques === 'Tttt',
     'الحرف الرابع باقي فالهاتف بعد الـ poll');
  await sleep(800);
  await c.call('window.__pvForceRefresh()');   // poll تاني (5ث）
  ok(server.db.paraveda_orders_v5.d.find(r => r.id === 1).remarques === 'Tttt', 'السيرفر حفظ «Tttt»');
  ok(JSON.parse(c.storage.getItem('paraveda_orders_v5')).find(r => r.id === 1).remarques === 'Tttt',
     'من بعد جوج polls مازال «Tttt» — حتى حاجة ما تمسحات');
  ok(server.requests.filter(r => r.key === 'paraveda_orders_v5').every(r => r.delta === 1 && r.d.length <= 2),
     'كل POST كان دلتا صغيرة (ماشي 2.5MB)');
  c.stop();
}


async function test7_serverDateFilter() {
  console.log('\n7) هاتف تاريخو غالط بيوم + فيلتر «اليوم»: كيشوف طلبيات الإدمن');
  const DAY = '2026-11-09';
  const server = new MockServer([rowAgent(1, 'HAJAR', DAY), rowAgent(2, 'Meryam', DAY)], { serverDate: DAY });
  const c = makeClient(server, { skew: 86400000 });   // الهاتف كيقول 10/11
  await c.call('S4()');
  ok(c.call('__pvServerDate') === DAY, 'السيرفر صيفط X-CRM-Date = 2026-11-09');
  ok(c.call('__pvToday()') === DAY, '«اليوم» كيجي من السيرفر ماشي من تاريخ الهاتف');
  const range = c.call("I4('today','2026-11-09','2026-11-09')");
  ok(range.from === DAY && range.to === DAY, 'فيلتر اليوم كيحسب 09/11 وخا الهاتف كيقول 10/11');
  const rows = JSON.parse(c.storage.getItem('paraveda_orders_v5'));
  const visible = rows.filter(o => !o._del && String(o.dateCreation || '').slice(0, 10) >= range.from && String(o.dateCreation || '').slice(0, 10) <= range.to);
  ok(visible.length === 2, 'الطلبيات اللي حطّهوم الأدمن كتبانو فالفيلتر');
  c.stop();
}

async function test8_futureCtSelfHeal() {
  console.log('\n8) ct قديم فالمستقبل: السنابشوت كيتطبّق بوحدو بلا ما يمسح الداتا');
  const DAY = '2026-11-09';
  const server = new MockServer([rowAgent(1, 'HAJAR', DAY), rowAgent(2, 'HAJAR', DAY), rowAgent(3, 'Meryam', DAY)], { serverDate: DAY });
  const future = Date.now() + 7 * 86400000;
  const c = makeClient(server, {
    data: {
      paraveda_orders_v5: '[]',
      ct_paraveda_orders_v5: String(future)
    }
  });
  await c.call('S4()');
  const rows = JSON.parse(c.storage.getItem('paraveda_orders_v5'));
  ok(rows.length === 3, 'الهاتف جاب الـ 3 طلبيات من السيرفر وخا ct كان قدّام بزاف');
  ok(Number(c.storage.getItem('ct_paraveda_orders_v5')) <= server.db.paraveda_orders_v5.t,
     'ct ت clamping لوقت السيرفر وما بقا فالمستقبل');
  ok(!server.requests.some(r => r.key === 'paraveda_orders_v5' && Array.isArray(r.d) && r.d.length === 0),
     'ما تصيفطش داتا خاوية باش يمسح السيرفر');
  c.stop();
}

async function test9_agentCanonicalMatch() {
  console.log('\n9) اسم البنت: مسافات / حالة حروف / تشكيل ما كيخبّيش الطلبية');
  const c = makeClient(new MockServer([]), {});
  ok(c.call('__pvAgentEq("HAJAR","hajar")') === true, 'HAJAR = hajar');
  ok(c.call('__pvAgentEq(" Meryam ","meryam")') === true, 'مسافات زايدة ما كتفرّقش');
  ok(c.call('__pvAgentEq("Méryam","meryam")') === true, 'التشكيل/الأكسون ما كتفرّقش');
  ok(c.call('__pvAgentEq("HAJAR","Meryam")') === false, 'بنتين مختلفين ما كيتخلطوش');
  c.stop();
}

(async () => {
  console.log('Paraveda CRM — v3.106 sync tests');
  for (const t of [test1_mobileEditSurvives, test2_pollDoesNotKillPendingWrite,
                   test3_offlineOutbox, test4_quotaAndOldReset, test5_twoDevicesNoOverwrite,
                   test6_exactPhoneScenario, test7_serverDateFilter,
                   test8_futureCtSelfHeal, test9_agentCanonicalMatch]) {
    try { await t(); } catch (e) { failed++; console.error('  ❌ EXCEPTION in ' + t.name + ': ' + e.stack); }
  }
  console.log('\n───────────────────────────────');
  console.log(passed + ' نجاح · ' + failed + ' فشل');
  process.exit(failed ? 1 : 0);
})();
