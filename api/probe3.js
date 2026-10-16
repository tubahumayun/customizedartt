const { list, del } = require('@vercel/blob');
/* Temporary: tests the real public review endpoints. Needs ?k=<ADMIN_KEY>. */
module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  if (!process.env.ADMIN_KEY || (req.query && req.query.k) !== process.env.ADMIN_KEY) { res.statusCode = 401; return res.end('{"error":"key"}'); }
  const out = {}; const host = 'https://' + req.headers.host; const t0 = Date.now();
  const step = async (n, f) => { const s = Date.now(); try { out[n] = (await f()) + ' [' + (Date.now() - s) + 'ms]'; } catch (e) { out[n] = 'ERR ' + (e && e.message); } };
  await step('realPOST', async () => { const r = await fetch(host + '/api/review', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ stars: 5, tags: ['Great value'], name: 'diag', comment: 'diag real', website: '' }) }); return r.status + ' ' + (await r.text()).slice(0, 100); });
  await step('realGET', async () => { const r = await fetch(host + '/api/review?z=' + Date.now()); return r.status + ' ' + (await r.text()).slice(0, 200); });
  await step('cleanup', async () => { const { blobs } = await list({ prefix: 'reviews/pending/' }); let n = 0; for (const b of blobs) { const t = await (await fetch(b.url + '?v=' + b.uploadedAt.getTime())).text(); if (t.includes('"diag"')) { await del(b.url); n++; } } return 'removed ' + n; });
  out.total = (Date.now() - t0) + 'ms';
  res.end(JSON.stringify(out));
};
