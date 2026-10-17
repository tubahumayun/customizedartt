const { list } = require('@vercel/blob');
module.exports = async (req, res) => {
  try {
    const out = { now: new Date().toISOString(), blobs: [] };
    let cursor;
    do {
      const r = await list({ prefix: 'reviews/', limit: 1000, cursor });
      for (const b of r.blobs) {
        const row = { p: b.pathname, size: b.size, up: b.uploadedAt };
        if (b.pathname.endsWith('.json')) { try { const t = await (await fetch(b.url + '?v=' + b.uploadedAt.getTime())).text(); row.body = t.slice(0, 260); } catch (e) { row.err = String(e.message); } }
        out.blobs.push(row);
      }
      cursor = r.hasMore ? r.cursor : undefined;
    } while (cursor);
    res.setHeader('Cache-Control', 'no-store'); res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(out, null, 1));
  } catch (e) { res.statusCode = 500; res.end(String(e && e.stack || e)); }
};
