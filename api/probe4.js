const { list, del } = require('@vercel/blob');
const rv = require('./review');
module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  if (!process.env.ADMIN_KEY || (req.query && req.query.k) !== process.env.ADMIN_KEY) { res.statusCode = 401; return res.end('{"error":"key"}'); }
  const host = 'https://' + req.headers.host; const out = {};
  const variants = {
    emptyAll: { stars: 5, tags: [], comment: '', name: '', website: '' },
    emoji: { stars: 4, tags: ['Great gift'], comment: 'Lovely diag 😍 frame', name: 'diag ✨', website: '' },
    hindi: { stars: 5, tags: [], comment: 'bahut sundar diag', name: 'diag Tuba', website: '' }
  };
  for (const [k, v] of Object.entries(variants)) {
    try {
      const r = await fetch(host + '/api/review', { method: 'POST', headers: { 'content-type': 'application/json', origin: host, 'cache-control': 'no-cache', 'user-agent': 'Mozilla/5.0 (Linux; Android 13) Chrome/120' }, body: JSON.stringify(v) });
      out[k] = r.status + ' ' + (await r.text()).slice(0, 200);
    } catch (e) { out[k] = 'ERR ' + e.message; }
  }
  try { const { blobs } = await list({ prefix: 'reviews/pending/' }); let n = 0; for (const b of blobs) { const t = await (await fetch(b.url + '?v=' + b.uploadedAt.getTime())).text(); if (t.includes('diag')) { await del(b.url); n++; } } out.cleanup = n; } catch (e) { out.cleanup = 'ERR ' + e.message; }
  res.end(JSON.stringify(out));
};
