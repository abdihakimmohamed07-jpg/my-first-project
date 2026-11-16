// Public shipment tracking page (/track?code=OTZ-XXXXX-XXXXX).
// Asks the Octane tracking Worker about one shipment and shows the answer.
// Everything from the Worker is written with textContent, never as HTML.
(function () {
  'use strict';

  // The tracking Worker's address (Cloudflare > Workers & Pages > octane-tracking).
  var TRACK_API = 'https://octane-tracking.withered-morning-91b5.workers.dev/';

  var CODE_RE = /^OTZ-[A-HJ-NP-Z2-9]{5}-[A-HJ-NP-Z2-9]{5}$/;
  var TZ = 'Africa/Lusaka';
  var PHONE = '+260 973 821 013';
  var STATUS = {
    booked: 'Booked',
    at_loading: 'At loading point',
    loaded: 'Loaded',
    departed: 'In transit',
    at_border: 'At the border',
    border_cleared: 'Border cleared',
    arrived: 'Arrived at destination',
    delivered: 'Delivered'
  };

  var $ = function (id) { return document.getElementById(id); };
  var form = $('track-form'), input = $('track-code'), out = $('track-result');

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  // "2026-11-16T12:00:00Z" -> "16 Nov 2026, 14:00" in Lusaka time.
  function fmtTime(iso) {
    var d = new Date(iso);
    if (isNaN(d)) return '';
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: TZ, day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: false
    }).format(d);
  }

  // "2026-11-18" (already a Lusaka date) -> "Wed 18 Nov 2026", without any time-zone shift.
  function fmtDate(ymd) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd || '');
    if (!m) return '';
    var d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
    }).format(d);
  }

  function etaText(eta) {
    if (!eta || eta.state === 'unavailable') return 'ETA not yet available';
    if (eta.state === 'delayed') return 'Delayed - updated ETA pending';
    var a = fmtDate(eta.from), b = fmtDate(eta.to);
    if (!a && !b) return 'ETA not yet available';
    if (!a || !b || a === b) return a || b;
    return a + ' to ' + b;
  }

  function message(title, body, kind) {
    out.textContent = '';
    var box = el('div', 'track-msg' + (kind ? ' track-msg--' + kind : ''));
    box.appendChild(el('h2', null, title));
    box.appendChild(el('p', null, body));
    out.appendChild(box);
    out.hidden = false;
    out.focus();
  }

  function row(dl, label, value) {
    if (!value) return;
    dl.appendChild(el('dt', null, label));
    dl.appendChild(el('dd', null, value));
  }

  function render(s) {
    out.textContent = '';
    var card = el('article', 'track-card');

    var head = el('div', 'track-head');
    head.appendChild(el('p', 'track-code', s.code || ''));
    var badge = el('p', 'track-status track-status--' + (s.status === 'delivered' ? 'done' : 'live'),
      STATUS[s.status] || 'In progress');
    head.appendChild(badge);
    card.appendChild(head);

    if (s.origin || s.destination) {
      var route = el('p', 'track-route');
      route.appendChild(el('span', null, s.origin || '-'));
      route.appendChild(el('span', 'track-arrow', ' → '));
      route.appendChild(el('span', null, s.destination || '-'));
      card.appendChild(route);
    }

    var dl = el('dl', 'track-facts');
    if (s.status === 'delivered') row(dl, 'Delivered on', fmtDate(s.delivered_on) || 'Delivered');
    else row(dl, 'Estimated arrival', etaText(s.eta));
    if (s.zone) row(dl, 'Last known area', String(s.zone));
    card.appendChild(dl);

    // ePOD: the Worker's link is a signed Supabase link valid for 5 minutes, so each click
    // asks the Worker again for a fresh one, then navigates in the same tab (the link sends
    // Content-Disposition: attachment). window.open() after an async fetch is blocked on phones.
    if (isHttps(s.epod_url)) {
      var btn = el('button', 'track-btn', 'Download ePOD');
      btn.type = 'button';
      var note = el('p', 'track-note track-epod-note');
      note.hidden = true;
      btn.addEventListener('click', function () {
        btn.disabled = true;
        note.hidden = true;
        fetchShipment(s.code).then(function (res) {
          if (res.status !== 200 && res.status !== 404) throw new Error('lookup failed');
          var fresh = res.status === 200 && res.body && res.body.found ? res.body.epod_url : null;
          if (isHttps(fresh)) { window.location.assign(fresh); btn.disabled = false; return; }
          btn.hidden = true;
          note.textContent = 'The delivery document is not available right now.';
          note.hidden = false;
        }).catch(function () {
          btn.disabled = false;
          note.textContent = 'Could not reach tracking. Please try again.';
          note.hidden = false;
        });
      });
      card.appendChild(btn);
      card.appendChild(note);
    }

    var ms = Array.isArray(s.milestones) ? s.milestones.slice() : [];
    ms.sort(function (x, y) { return String(y.at).localeCompare(String(x.at)); });
    // Show at most one "Delay reported": the newest, and only if it is newer than the latest
    // stage (the Worker will do the same from SQL step 25; this keeps older answers tidy).
    var stages = ms.filter(function (m) { return m.type !== 'issue'; });
    var issue = ms.filter(function (m) { return m.type === 'issue'; })[0];
    if (issue && stages.length && String(issue.at) <= String(stages[0].at)) issue = null;
    ms = issue ? [issue].concat(stages) : stages;
    if (ms.length) {
      card.appendChild(el('h2', 'track-sub', 'Progress'));
      var ol = el('ol', 'track-timeline');
      ms.forEach(function (m) {
        var li = el('li', m.type === 'issue' ? 'is-issue' : null);
        li.appendChild(el('span', 'track-label', m.label || ''));
        var t = fmtTime(m.at);
        if (t) {
          var time = el('time', null, t);
          time.dateTime = m.at;
          li.appendChild(time);
        }
        ol.appendChild(li);
      });
      card.appendChild(ol);
      card.appendChild(el('p', 'track-note',
        'Times are Zambia time (CAT). Updates can take a few hours to appear.'));
    }

    out.appendChild(card);
    out.hidden = false;
    out.focus();
  }

  function isHttps(u) { return typeof u === 'string' && /^https:\/\//i.test(u); }

  // Resolves {status, body}; rejects on network error or timeout.
  function fetchShipment(code) {
    var ctrl = typeof AbortController === 'function' ? new AbortController() : null;
    var timer = ctrl && setTimeout(function () { ctrl.abort(); }, 15000);
    return fetch(TRACK_API + '?code=' + encodeURIComponent(code), {
      method: 'GET', credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer',
      signal: ctrl ? ctrl.signal : undefined
    }).then(function (r) {
      if (timer) clearTimeout(timer);
      if (r.status !== 200) return { status: r.status, body: null };
      return r.json().then(function (body) { return { status: 200, body: body }; });
    }, function (e) { if (timer) clearTimeout(timer); throw e; });
  }

  function lookup(code) {
    message('Checking\u2026', 'Looking up ' + code + '.', 'wait');
    fetchShipment(code).then(function (res) {
      if (res.status === 200) return res.body && res.body.found ? render(res.body) : notFound();
      if (res.status === 404) return notFound();
      if (res.status === 429) {
        return message('Too many lookups', 'Please wait a minute and try again.', 'warn');
      }
      unavailable();
    }).catch(unavailable);
  }

  function notFound() {
    message('Shipment not found',
      'We could not find a shipment with that code. Check the code in your tracking link, ' +
      'or call us on ' + PHONE + '.', 'warn');
  }

  function unavailable() {
    message('Tracking is unavailable right now',
      'Please try again in a few minutes, or call us on ' + PHONE + '.', 'warn');
  }

  function clean(v) { return String(v || '').trim().toUpperCase(); }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var code = clean(input.value);
    if (!CODE_RE.test(code)) {
      message('Check the code', 'A tracking code looks like OTZ-ABCDE-23456.', 'warn');
      return;
    }
    // Keep the code in the address so the page can be reloaded or bookmarked.
    history.replaceState(null, '', location.pathname + '?code=' + encodeURIComponent(code));
    lookup(code);
  });

  var start = clean(new URLSearchParams(location.search).get('code'));
  if (start) {
    input.value = start;
    if (CODE_RE.test(start)) lookup(start);
    else message('Check the code', 'A tracking code looks like OTZ-ABCDE-23456.', 'warn');
  }
})();
