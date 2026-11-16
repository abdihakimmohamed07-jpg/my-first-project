// Public shipment tracking page (/track?code=OTZ-XXXXX-XXXXX).
// Asks the Octane tracking Worker about one shipment and shows the answer.
// Everything from the Worker is written with textContent, never as HTML.
(function () {
  'use strict';

  // The tracking Worker's address. Change this one line when the Worker is created
  // (its workers.dev address, from Cloudflare > Workers & Pages > octane-tracking).
  var TRACK_API = 'https://octane-tracking.REPLACE-ME.workers.dev/';

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

    // Ready for ePOD sharing (sub-step B): shown only when the Worker sends an https link.
    if (typeof s.epod_url === 'string' && /^https:\/\//i.test(s.epod_url)) {
      var a = el('a', 'track-btn', 'Download ePOD');
      a.href = s.epod_url;
      a.rel = 'noopener noreferrer';
      a.target = '_blank';
      card.appendChild(a);
    }

    var ms = Array.isArray(s.milestones) ? s.milestones.slice() : [];
    ms.sort(function (x, y) { return String(y.at).localeCompare(String(x.at)); });
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

  function lookup(code) {
    message('Checking…', 'Looking up ' + code + '.', 'wait');
    var ctrl = typeof AbortController === 'function' ? new AbortController() : null;
    var timer = ctrl && setTimeout(function () { ctrl.abort(); }, 15000);
    fetch(TRACK_API + '?code=' + encodeURIComponent(code), {
      method: 'GET', credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer',
      signal: ctrl ? ctrl.signal : undefined
    }).then(function (r) {
      if (r.status === 200) {
        return r.json().then(function (s) {
          if (s && s.found) render(s); else notFound();
        });
      }
      if (r.status === 404) return notFound();
      if (r.status === 429) {
        return message('Too many lookups',
          'Please wait a minute and try again.', 'warn');
      }
      unavailable();
    }).catch(unavailable).then(function () { if (timer) clearTimeout(timer); });
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
