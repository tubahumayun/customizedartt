/* Customer reviews. Kept in its own file so nothing else on the page can stop it from running. */
(function () {
  var URL_ = '/api/review';
  var grid = document.getElementById('revGrid');
  if (!grid) return;
  var sum = document.getElementById('revSum'), more = document.getElementById('revMore');
  var prev = document.querySelector('.rev-arrow.prev'), next = document.querySelector('.rev-arrow.next');
  var started = false;

  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function stars(n) { n = Math.max(1, Math.min(5, n || 5)); return new Array(n + 1).join('★') + new Array(6 - n).join('☆'); }
  function safeUrl(u) { u = String(u || ''); return /^https:\/\//.test(u) ? u : ''; }

  function note(html) { grid.innerHTML = '<p class="rev-empty">' + html + '</p>'; }

  function get(cb) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', URL_ + '?t=' + Date.now() + Math.random().toString(36).slice(2, 6), true);
    xhr.setRequestHeader('Cache-Control', 'no-cache');
    xhr.timeout = 15000;
    xhr.onload = function () {
      if (xhr.status !== 200) return cb(new Error('status ' + xhr.status));
      try { var d = JSON.parse(xhr.responseText); cb(null, d); } catch (e) { cb(e); }
    };
    xhr.onerror = xhr.ontimeout = function () { cb(new Error('network')); };
    xhr.send();
  }

  function render(list) {
    var avg = 0, i;
    for (i = 0; i < list.length; i++) avg += +list[i].stars || 0;
    avg = avg / list.length;
    if (sum) {
      sum.style.display = 'flex';
      document.getElementById('revAvg').textContent = avg.toFixed(1);
      document.getElementById('revStars').textContent = stars(Math.round(avg));
      document.getElementById('revCount').textContent = list.length + ' review' + (list.length > 1 ? 's' : '');
    }
    grid.innerHTML = list.slice(0, 30).map(function (r, n) {
      var text = r.comment || r.tags || 'Lovely frame.';
      var p = safeUrl(r.photo);
      var ph = p ? '<img class="rev-photo" src="' + esc(p) + '" alt="Frame received by ' + esc(r.name || 'a customer') + '" loading="lazy">' : '';
      return '<article class="rev-card' + (p ? ' has-photo' : '') + (n > 1 ? ' extra' : '') + '">' + ph +
        '<div class="rev-stars" aria-label="' + (+r.stars || 5) + ' out of 5">' + stars(+r.stars || 5) + '</div>' +
        '<p>“' + esc(text) + '”</p><small>' + esc(r.name || 'Happy customer') + '</small></article>';
    }).join('');
    if (more) {
      more.hidden = list.length < 3;
      if (!started) more.addEventListener('click', function () { var o = grid.classList.toggle('all'); more.innerHTML = o ? 'Fewer reviews &#8963;' : 'More reviews &#8964;'; });
    }
    if (!started) {
      grid.addEventListener('click', function (e) {
        var im = e.target && e.target.closest ? e.target.closest('.rev-photo') : null; if (!im) return;
        var lb = document.getElementById('lb'), li = document.getElementById('lbImg'), lc = document.getElementById('lbCap');
        if (lb && li) { li.src = im.src; li.alt = im.alt; if (lc) lc.textContent = im.alt; lb.hidden = false; } else { window.open(im.src, '_blank'); }
      });
      var step = function () { var c = grid.querySelector('.rev-card'); return c ? c.getBoundingClientRect().width + 18 : 300; };
      if (prev) prev.addEventListener('click', function () { grid.scrollBy({ left: -step(), behavior: 'smooth' }); });
      if (next) next.addEventListener('click', function () { grid.scrollBy({ left: step(), behavior: 'smooth' }); });
      grid.addEventListener('scroll', arrows, { passive: true });
      window.addEventListener('resize', arrows);
    }
    started = true;
    arrows(); setTimeout(arrows, 400);
    if (window.fitHeads) { try { window.fitHeads(); } catch (e) { } }
  }

  function arrows() {
    if (!prev || !next) return;
    var many = window.innerWidth > 760 && grid.scrollWidth > grid.clientWidth + 4;
    prev.hidden = !(many && grid.scrollLeft > 4);
    next.hidden = !(many && grid.scrollLeft < grid.scrollWidth - grid.clientWidth - 4);
  }

  var tries = 0;
  function load() {
    note('Loading reviews…');
    get(function (err, list) {
      if (!err && Object.prototype.toString.call(list) === '[object Array]') {
        if (list.length) { try { localStorage.setItem('ca_rev', JSON.stringify(list.slice(0, 30))); } catch (e) { } return render(list); }
        return note('Reviews from our customers will appear here. Be the first to rate your frame.');
      }
      tries++;
      if (tries < 4) return setTimeout(load, 900 * tries);
      try { var c = JSON.parse(localStorage.getItem('ca_rev') || '[]'); if (c.length) return render(c); } catch (e) { }
      note('Reviews are taking a moment to load. <a href="#reviews" id="revRetry" style="text-decoration:underline">Tap to try again</a>');
      var rt = document.getElementById('revRetry');
      if (rt) rt.addEventListener('click', function (e) { e.preventDefault(); tries = 0; load(); });
    });
  }
  load();
  document.addEventListener('visibilitychange', function () { if (!document.hidden && started) get(function (e, l) { if (!e && l && l.length) render(l); }); });
})();
