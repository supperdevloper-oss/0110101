/* ══════════════════════════════════════════════════════════════════════════
   Paraveda CRM — سيرفر معاينة محلي (للاختبار فقط، ماشي للإنتاج)
   تشغيل:  node tools/dev-server.js      → http://0.0.0.0:3000
   ──────────────────────────────────────────────────────────────────────────
   كيخدم index.html الحقيقي بلا PHP: كيقلّب نفس عقد api.php (GET سنابشوت
   + POST عادي/دلتا + ETag/304 + X-CRM-Time). الداتا كتجي من crm_data.json
   (قراءة فقط) وتكتب فـ tools/preview-data.json باش ما نلمسوش الداتا الأصلية.
   ══════════════════════════════════════════════════════════════════════════ */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const PORT = Number(process.env.PORT) || 3000;
const PREVIEW_DATA = path.join(__dirname, 'preview-data.json');
const TOKEN = '8c907fc0f4ffe0b9775a6b7c3c0fc7700e5724c0d78343df';
function businessDate() {
  try { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Casablanca', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()); }
  catch (e) { return new Date().toISOString().slice(0, 10); }
}

const MIME = {
  '.html': 'text/html; charset=utf-8', '.php': 'application/json; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.wasm': 'application/wasm', '.txt': 'text/plain; charset=utf-8',
  '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.zip': 'application/zip'
};

/* ── الداتا ─────────────────────────────────────────────────────────────── */
let db;
try {
  const src = fs.existsSync(PREVIEW_DATA) ? PREVIEW_DATA : path.join(ROOT, 'crm_data.json');
  db = JSON.parse(fs.readFileSync(src, 'utf8'));
  console.log('[preview] data:', path.basename(src));
} catch (e) {
  db = {
    paraveda_orders_v5: { t: Date.now(), d: [] },
    paraveda_users_v1: { t: Date.now(), d: [{ id: 1, username: 'admin@paraveda.ma', password: 'rOYtKv0cd9UW', role: 'admin', agent: '' }] },
    paraveda_history_v1: { t: Date.now(), d: [] },
    paraveda_reset_v1: { t: 1, d: 0 }
  };
  console.log('[preview] no data file → demo dataset');
}
function save() { try { fs.writeFileSync(PREVIEW_DATA, JSON.stringify(db)); } catch (e) {} }

/* ── نفس منطق الدمج ديال api.php ────────────────────────────────────────── */
const DATE_FIELDS = ['dateCreation', 'dateConfirmation', 'dateExp', 'dateLiv'];
function mergeRow(a, b) {
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
function rebase(d, offset, now, ct) {
  if (!Array.isArray(d) || !offset || Math.abs(offset) < 2000) return d;
  const lo = ct - 600000, hi = ct + 600000;
  const fix = v => typeof v === 'number' && v >= 1e12 ? Math.min(v >= lo && v <= hi ? v + offset : v, now) : v;
  return d.map(r => {
    if (!r || typeof r !== 'object') return r;
    const o = { ...r };
    if (o._u !== undefined) o._u = fix(o._u);
    if (o._f && typeof o._f === 'object') o._f = Object.fromEntries(Object.entries(o._f).map(([k, v]) => [k, fix(v)]));
    return o;
  });
}
function unwrap(v) {
  let g = 0;
  while (v && typeof v === 'object' && !Array.isArray(v) && typeof v.t === 'number' && 'd' in v && Object.keys(v).length <= 2 && g++ < 5) v = v.d;
  return v;
}

/* ── HTTP ───────────────────────────────────────────────────────────────── */
function send(req, res, status, obj, extra) {
  const body = typeof obj === 'string' ? obj : JSON.stringify(obj);
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, X-Sync-Token, If-None-Match',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Expose-Headers': 'X-CRM-Time, X-CRM-Date, ETag',
    'X-CRM-Time': String(Date.now()),
    'X-CRM-Date': businessDate(),
    ...(extra || {})
  };
  let payload = Buffer.from(body, 'utf8');
  if (payload.length > 40000 && /\bgzip\b/.test(String(req.headers['accept-encoding'] || ''))) {
    payload = zlib.gzipSync(payload, { level: 5 });
    headers['Content-Encoding'] = 'gzip';
    headers['Vary'] = 'Accept-Encoding';
  }
  headers['Content-Length'] = payload.length;
  res.writeHead(status, headers);
  res.end(payload);
}

function api(req, res, url, bodyStr) {
  const now = Date.now();
  if (req.method === 'GET') {
    const what = url.searchParams.get('export');
    if (what === 'version') return send(req, res, 200, { ok: true, apiVersion: '3.106', senderGen: 4, built: '2026-11-09', diag: {} });
    if (url.searchParams.get('pushkey')) return send(req, res, 200, { ok: false, err: 'no-vapid-keys' });
    if (what === 'stats') return send(req, res, 200, { ok: true, apiVersion: '3.106', live_orders: (db.paraveda_orders_v5.d || []).length });
    if (what === 'csv') return send(req, res, 200, '', { 'Content-Type': 'text/csv; charset=utf-8' });
    if (what) return send(req, res, 200, { ok: true, t: now, rows: [] });
    const snap = {};
    for (const [k, v] of Object.entries(db)) {
      if (k === 'paraveda_backup_v1' || k === 'paraveda_backup_v1_agents') continue;
      snap[k] = { t: v.t, d: unwrap(v.d) };
    }
    const json = JSON.stringify(snap);
    const etag = '"' + crypto.createHash('md5').update(json).digest('hex') + '"';
    if (req.headers['if-none-match'] === etag) return send(req, res, 304, '', { ETag: etag });
    return send(req, res, 200, json, { ETag: etag });
  }

  /* POST */
  let b;
  try { b = JSON.parse(bodyStr || '{}'); } catch (e) { return send(req, res, 400, { ok: false, err: 'bad-json' }); }
  if (b.action) return send(req, res, 200, { ok: true, sent: 0, failed: 0, skipped: 0, applied: 0, checked: 0, linked: 0, updated: 0, apiVersion: '3.106' });
  const k = String(b.key || '');
  if (!k || !('d' in b)) return send(req, res, 400, { ok: false, err: 'bad-body' });
  const ct = b.ct !== undefined ? Number(b.ct) : Number(b.t || now);
  let offset = now - ct;
  offset = Math.max(-7 * 86400000, Math.min(7 * 86400000, offset));
  let d = rebase(unwrap(b.d), offset, now, ct);
  const prev = db[k] || { t: 0, d: [] };
  const isDelta = !!b.delta && k === 'paraveda_orders_v5' && Array.isArray(d);
  if (isDelta && d.length === 0) return send(req, res, 200, { ok: true, noop: 'empty-delta', t: 0, serverTime: now });
  if (isDelta) d = mergeOrders(unwrap(prev.d), d);
  if (Array.isArray(d) && d.length === 0 && Array.isArray(unwrap(prev.d)) && unwrap(prev.d).length) {
    return send(req, res, 200, { ok: true, noop: 'ghost', t: prev.t, serverTime: now });
  }
  if (k === 'paraveda_orders_v5' && Array.isArray(d)) d = mergeOrders(unwrap(prev.d), d);
  if (k === 'paraveda_users_v1' && Array.isArray(d)) {
    const m = new Map(unwrap(prev.d).map(u => [String(u.id), u]));
    d.forEach(u => { m.set(String(u.id), mergeRow(m.get(String(u.id)) || {}, u)); });
    d = Array.from(m.values());
  }
  if (JSON.stringify(prev.d) === JSON.stringify(d)) {
    return send(req, res, 200, { ok: true, noop: 'same', t: prev.t, serverTime: now });
  }
  const t = Math.max(prev.t + 1, now);
  db[k] = { t, d };
  save();
  console.log('[preview] write', k, isDelta ? '(delta ' + b.d.length + ' rows)' : '', 't=' + t);
  return send(req, res, 200, { ok: true, t, serverTime: now });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (req.method === 'OPTIONS') return send(req, res, 200, {});
  let chunks = [];
  req.on('data', c => chunks.push(c));
  req.on('end', () => {
    const body = Buffer.concat(chunks).toString('utf8');
    if (url.pathname === '/api.php') {
      try { return api(req, res, url, body); }
      catch (e) { console.error('[preview] api error', e); return send(req, res, 500, { ok: false, err: String(e.message || e) }); }
    }
    let rel = decodeURIComponent(url.pathname.replace(/^\/+/, '') || 'index.html');
    const full = path.resolve(ROOT, rel);
    if (!full.startsWith(ROOT + path.sep) && full !== path.join(ROOT, 'index.html')) {
      return send(req, res, 403, 'forbidden');
    }
    let file = full;
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!fs.existsSync(file)) return send(req, res, 404, 'not found');
    const ext = path.extname(file).toLowerCase();
    const buf = fs.readFileSync(file);
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': ext === '.html' || ext === '.js' || ext === '.json' ? 'no-cache, must-revalidate' : 'public, max-age=86400',
      'Content-Length': buf.length
    });
    res.end(buf);
  });
});

server.listen(PORT, '0.0.0.0', () => console.log('[preview] Paraveda CRM → http://0.0.0.0:' + PORT));
