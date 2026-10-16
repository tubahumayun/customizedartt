const { put, list, del } = require('@vercel/blob');
const { json, body } = require('./_util');

/* Admin: list pending and approved reviews, approve or delete. Needs the ADMIN_KEY header. */
module.exports = async (req, res) => {
  const key = process.env.ADMIN_KEY;
  if (!key || req.headers['x-admin-key'] !== key) return json(res, 401, { error: 'key' });
  try {
    if (req.method === 'GET') {
      const out = [];
      for (const state of ['pending', 'approved']) {
        const { blobs } = await list({ prefix: 'reviews/' + state + '/', limit: 200 });
        for (const b of blobs) {
          try {
            const r = await (await fetch(b.url + '?v=' + b.uploadedAt.getTime())).json();
            out.push({ id: b.pathname.split('/').pop().replace(/\.json$/, ''), state, ...r });
          } catch (e) { /* skip */ }
        }
      }
      out.sort((a, b) => (a.id < b.id ? 1 : -1));
      return json(res, 200, out);
    }
    if (req.method === 'POST') {
      const d = await body(req);
      const id = String(d.id || '').replace(/[^a-z0-9-]/gi, '');
      if (!id) return json(res, 400, { error: 'id' });
      const find = async state => (await list({ prefix: 'reviews/' + state + '/' + id + '.json', limit: 1 })).blobs[0];
      if (d.action === 'approve') {
        const p = await find('pending'); if (!p) return json(res, 404, { error: 'missing' });
        const text = await (await fetch(p.url + '?v=' + p.uploadedAt.getTime())).text();
        await put('reviews/approved/' + id + '.json', text, { access: 'public', contentType: 'application/json', addRandomSuffix: false, allowOverwrite: true });
        await del(p.url);
        return json(res, 200, { ok: true });
      }
      if (d.action === 'unapprove') {
        const a = await find('approved'); if (!a) return json(res, 404, { error: 'missing' });
        const text = await (await fetch(a.url + '?v=' + a.uploadedAt.getTime())).text();
        await put('reviews/pending/' + id + '.json', text, { access: 'public', contentType: 'application/json', addRandomSuffix: false, allowOverwrite: true });
        await del(a.url);
        return json(res, 200, { ok: true });
      }
      if (d.action === 'delete') {
        for (const s of ['pending', 'approved']) { const b = await find(s); if (b) await del(b.url); }
        return json(res, 200, { ok: true });
      }
      return json(res, 400, { error: 'action' });
    }
    return json(res, 405, { error: 'method' });
  } catch (e) {
    return json(res, 500, { error: 'server', detail: String((e && e.name) || '') + ': ' + String((e && e.message) || '').slice(0, 160) });
  }
};
