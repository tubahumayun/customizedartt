const { put, list } = require('@vercel/blob');
const { rid, clean, esc, json, body } = require('./_util');

const WA = '919004217186';

/* POST: store a design picture and its details, return a short id.
   GET ?id=xxxx: a clean page that shows the picture and the order details. */
module.exports = async (req, res) => {
  try {
    if (req.method === 'POST') {
      const d = await body(req);
      const m = /^data:image\/(jpeg|png);base64,(.+)$/.exec(String(d.image || ''));
      if (!m) return json(res, 400, { error: 'image' });
      const buf = Buffer.from(m[2], 'base64');
      if (buf.length > 3.5 * 1024 * 1024 || buf.length < 500) return json(res, 400, { error: 'size' });
      const id = rid(8);
      const ext = m[1] === 'png' ? 'png' : 'jpg';
      const img = await put('designs/' + id + '.' + ext, buf, { access: 'public', contentType: 'image/' + (ext === 'png' ? 'png' : 'jpeg'), addRandomSuffix: false, allowOverwrite: false });
      const info = {};
      ['size', 'qty', 'border', 'paper', 'colour', 'font', 'text', 'price'].forEach(k => { info[k] = clean(d.info && d.info[k], 200); });
      info.image = img.url;
      await put('designs/' + id + '.json', JSON.stringify(info), { access: 'public', contentType: 'application/json', addRandomSuffix: false, allowOverwrite: false });
      return json(res, 200, { id, url: '/d/' + id });
    }
    if (req.method === 'GET') {
      const id = String((req.query && req.query.id) || '').replace(/[^a-z0-9]/gi, '').slice(0, 16);
      const found = id && (await list({ prefix: 'designs/' + id + '.json', limit: 1 })).blobs[0];
      if (!found) { res.statusCode = 404; res.setHeader('Content-Type', 'text/html; charset=utf-8'); return res.end(page('Design not found', '<p>This design link has expired or is not valid.</p>', '')); }
      const info = await (await fetch(found.url + '?v=' + found.uploadedAt.getTime())).json();
      const rows = [['Size', info.size], ['Quantity', info.qty], ['Price', info.price], ['Border', info.border], ['Paper', info.paper], ['Text colour', info.colour], ['Font', info.font], ['Text', info.text]]
        .filter(r => r[1]).map(r => '<tr><th>' + esc(r[0]) + '</th><td>' + esc(r[1]) + '</td></tr>').join('');
      const reply = 'https://wa.me/' + WA + '?text=' + encodeURIComponent('Hi, this is about the design I sent: https://' + req.headers.host + '/d/' + id);
      const html = '<img class="pic" src="' + esc(info.image) + '" alt="Frame design"><table>' + rows + '</table>' +
        '<p class="row"><a class="btn" href="' + esc(info.image) + '" download="customizedartt-design.jpg">Download the picture</a></p>';
      res.setHeader('Cache-Control', 'public, s-maxage=3600');
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.end(page('A frame design for customizedartt', html, info.image, 'https://' + req.headers.host + '/d/' + id));
    }
    res.setHeader('Allow', 'GET, POST');
    return json(res, 405, { error: 'method' });
  } catch (e) {
    return json(res, 500, { error: 'server' });
  }
};

function page(title, inner, og, url) {
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<meta name="robots" content="noindex"><title>' + esc(title) + '</title>' +
    '<meta property="og:title" content="' + esc(title) + '"><meta property="og:description" content="A design made on the customizedartt website.">' +
    (og ? '<meta property="og:image" content="' + esc(og) + '"><meta name="twitter:card" content="summary_large_image">' : '') +
    (url ? '<meta property="og:url" content="' + esc(url) + '">' : '') +
    '<style>body{margin:0;background:#fdfcfa;color:#1a171c;font:16px/1.5 Georgia,serif;display:grid;justify-items:center;padding:28px 18px}main{max-width:560px;width:100%}h1{font-size:26px;margin:0 0 16px;font-weight:600}' +
    '.pic{width:100%;height:auto;display:block;border:1px solid #e5dfd6;background:#fff;box-shadow:0 18px 40px rgba(0,0,0,.12)}table{width:100%;border-collapse:collapse;margin-top:18px;font-size:15px}th{text-align:left;color:#6a636d;font-weight:600;padding:8px 12px 8px 0;border-bottom:1px solid #eee7dd;width:34%}td{padding:8px 0;border-bottom:1px solid #eee7dd}' +
    '.row{margin:22px 0 0}.btn{display:inline-block;background:#1a171c;color:#fff;text-decoration:none;padding:12px 20px;font-size:14px;letter-spacing:.06em;text-transform:uppercase}</style></head><body><main><h1>' + esc(title) + '</h1>' + inner + '</main></body></html>';
}
