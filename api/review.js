const { put, list } = require('@vercel/blob');
const { rid, clean, json, body, retry } = require('./_util');

/* Reviews: visitors POST a review (kept as pending). GET returns only approved reviews. */
module.exports = async (req, res) => {
  try {
    if (req.method === 'POST') {
      const d = await body(req);
      if (d.website) return json(res, 200, { ok: true });             // spam trap
      const stars = Math.min(5, Math.max(1, parseInt(d.stars, 10) || 0));
      if (!stars) return json(res, 400, { error: 'stars' });
      const name = clean(d.name, 50);
      if (!name) return json(res, 400, { error: 'name', detail: 'Please add your name.' });
      const id = Date.now() + '-' + rid(5);
      let photo = '';
      if (typeof d.photo === 'string' && d.photo.startsWith('data:image/')) {
        const b64 = d.photo.slice(d.photo.indexOf(',') + 1);
        if (b64.length > 2400000) return json(res, 413, { error: 'photo', detail: 'Photo is too large.' });
        const buf = Buffer.from(b64, 'base64');
        if (buf.length > 10 && buf[0] === 0xff && buf[1] === 0xd8) {
          try {
            const p = await retry(() => put('reviews/photos/' + id + '.jpg', buf, { access: 'public', contentType: 'image/jpeg', addRandomSuffix: false, allowOverwrite: true }));
            photo = p.url;
          } catch (e) { /* keep the review even if the photo could not be stored */ }
        }
      }
      const rec = {
        time: new Date().toISOString(),
        name,
        photo,
        stars,
        tags: clean(Array.isArray(d.tags) ? d.tags.join(', ') : d.tags, 200),
        comment: clean(d.comment, 300)
      };
      await retry(() => put('reviews/pending/' + id + '.json', JSON.stringify(rec), { access: 'public', contentType: 'application/json', addRandomSuffix: false, allowOverwrite: true }));
      return json(res, 200, { ok: true });
    }
    if (req.method === 'GET') {
      const { blobs } = await list({ prefix: 'reviews/approved/', limit: 100 });
      blobs.sort((a, b) => (a.pathname < b.pathname ? 1 : -1));
      const out = [];
      for (const b of blobs.slice(0, 40)) {
        try {
          const r = await (await fetch(b.url + '?v=' + b.uploadedAt.getTime())).json();
          out.push({ name: r.name, stars: r.stars, tags: r.tags, comment: r.comment, photo: r.photo || '' });
        } catch (e) { /* skip */ }
      }
      res.setHeader('Cache-Control', 'no-store');
      return json(res, 200, out);
    }
    res.setHeader('Allow', 'GET, POST');
    return json(res, 405, { error: 'method' });
  } catch (e) {
    return json(res, 500, { error: 'server', detail: String((e && e.name) || '') + ': ' + String((e && e.message) || '').slice(0, 160) });
  }
};
