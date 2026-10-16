const { put, list, del } = require('@vercel/blob');
/* Temporary self-test. Needs ?k=<ADMIN_KEY>. Reports what the review store can and cannot do. */
module.exports = async (req, res) => {
  const out = { node: process.version, hasToken: !!process.env.BLOB_READ_WRITE_TOKEN, steps: {} };
  res.setHeader('Content-Type', 'application/json');
  if (!process.env.ADMIN_KEY || (req.query && req.query.k) !== process.env.ADMIN_KEY) { res.statusCode = 401; return res.end('{"error":"key"}'); }
  const step = async (n, f) => { try { out.steps[n] = await f(); } catch (e) { out.steps[n] = 'ERR ' + (e && e.name) + ': ' + (e && e.message); } };
  let url;
  await step('put', async () => { const r = await put('diag/test.json', '{"ok":1}', { access: 'public', contentType: 'application/json', addRandomSuffix: false, allowOverwrite: true }); url = r.url; return r.pathname; });
  await step('fetchTest', async () => { const r = await fetch(url + '?v=1'); return r.status + ' ' + (await r.text()).slice(0, 40); });
  await step('del', async () => { await del(url); return 'deleted'; });
  await step('listAll', async () => { const { blobs } = await list({ prefix: 'reviews/', limit: 100 }); return blobs.map(b => b.pathname + ' ' + b.size); });
  await step('fetchEach', async () => {
    const { blobs } = await list({ prefix: 'reviews/', limit: 100 }); const o = [];
    for (const b of blobs) { const r = await fetch(b.url + '?v=' + b.uploadedAt.getTime()); o.push(b.pathname + ' -> ' + r.status + ' ' + (await r.text()).slice(0, 120)); }
    return o;
  });
  res.end(JSON.stringify(out, null, 1));
};
