const { list, del } = require('@vercel/blob');
module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  if (!process.env.ADMIN_KEY || (req.query && req.query.k) !== process.env.ADMIN_KEY) { res.statusCode = 401; return res.end('{"error":"key"}'); }
  const out = [];
  try { const { blobs } = await list({ prefix: 'reviews/pending/' }); for (const b of blobs) { const t = await (await fetch(b.url + '?v=' + b.uploadedAt.getTime())).text(); out.push(b.pathname + ' ' + t.slice(0, 140)); if (t.includes('"comment":""') && t.includes('"name":"A happy customer"') && t.includes('"tags":""')) { await del(b.url); out.push('  -> removed blank test review'); } } } catch (e) { out.push('ERR ' + e.message); }
  res.end(JSON.stringify(out));
};
