const { put, list } = require('@vercel/blob');
const { rid, clean, json, body } = require('./_util');

/* Reviews: visitors POST a review (kept as pending). GET returns only approved reviews. */
module.exports = async (req, res) => {
  try {
    if (req.method === 'POST') {
      const d = await body(req);
      if (d.website) return json(res, 200, { ok: true });             // spam trap
      const stars = Math.min(5, Math.max(1, parseInt(d.stars, 10) || 0));
      if (!stars) return json(res, 400, { error: 'stars' });
      const rec = {
        time: new Date().toISOString(),
        name: clean(d.name, 50) || 'A happy customer',
        stars,
        tags: clean(Array.isArray(d.tags) ? d.tags.join(', ') : d.tags, 200),
        comment: clean(d.comment, 300)
      };
      const id = Date.now() + '-' + rid(5);
      await put('reviews/pending/' + id + '.json', JSON.stringify(rec), { access: 'public', contentType: 'application/json', addRandomSuffix: false, allowOverwrite: true });
      return json(res, 200, { ok: true });
    }
    if (req.method === 'GET') {
      const { blobs } = await list({ prefix: 'reviews/approved/', limit: 100 });
      blobs.sort((a, b) => (a.pathname < b.pathname ? 1 : -1));
      const out = [];
      for (const b of blobs.slice(0, 40)) {
        try {
          const r = await (await fetch(b.url + '?v=' + b.uploadedAt.getTime())).json();
          out.push({ name: r.name, stars: r.stars, tags: r.tags, comment: r.comment });
        } catch (e) { /* skip */ }
      }
      res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
      return json(res, 200, out);
    }
    res.setHeader('Allow', 'GET, POST');
    return json(res, 405, { error: 'method' });
  } catch (e) {
    return json(res, 500, { error: 'server' });
  }
};
