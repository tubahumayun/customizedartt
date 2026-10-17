const { list } = require('@vercel/blob');
const review = require('./review');
module.exports = async (req, res) => {
  const out = { now: new Date().toISOString(), handler: null, per: [] };
  try {
    let body = '', code = 0;
    const fres = { statusCode: 200, setHeader() {}, end(b) { body = b; } };
    await review({ method: 'GET', headers: {} }, fres);
    out.handler = { code: fres.statusCode, body: body.slice(0, 600) };
    const { blobs } = await list({ prefix: 'reviews/approved/', limit: 100 });
    for (const b of blobs) {
      const row = { p: b.pathname, upType: typeof b.uploadedAt, up: String(b.uploadedAt) };
      try { const r = await fetch(b.url + '?v=' + b.uploadedAt.getTime()); row.status = r.status; row.ct = r.headers.get('content-type'); const t = await r.text(); row.len = t.length; try { JSON.parse(t); row.json = 'ok'; } catch (e) { row.json = 'BAD ' + t.slice(0, 80); } } catch (e) { row.err = String(e.message); }
      out.per.push(row);
    }
  } catch (e) { out.fatal = String(e && e.stack || e); }
  res.setHeader('Cache-Control', 'no-store'); res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(out, null, 1));
};
