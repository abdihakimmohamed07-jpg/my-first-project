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
    if (eta.state === 'contact') return 'Delayed, please contact us';
    if (eta.state === 'border_delay') {
      var e = fmtDate(eta.from);
      return e ? 'Delayed at the border. Earliest arrival ' + e : 'Delayed - updated ETA pending';
    }
    var a = fmtDate(eta.from), b = fmtDate(eta.to);
    if (!a && !b) return 'ETA not yet available';
    if (!a || !b || a === b) return a || b;
    return a + ' to ' + b;
  }

  // Once arrived there is no ETA to promise: show when the truck arrived (latest "Arrived" milestone).
  function arrivedText(ms) {
    var at = '';
    (Array.isArray(ms) ? ms : []).forEach(function (m) {
      if (m && m.type === 'arrived' && String(m.at) > at) at = String(m.at);
    });
    return fmtTime(at) || 'At destination';
  }

  // The first estimate, kept once the date has moved past it ("14 Nov to 16 Nov"), or ''.
  function firstText(eta) {
    if (!eta) return '';
    var a = fmtDate(eta.first_from), b = fmtDate(eta.first_to);
    if (!a || !b) return '';
    return a === b ? a : a + ' to ' + b;
  }

  // zone: null, {name: "Kitwe", at} -> "Near Kitwe, <time>", {name: null, at} -> "On the road, <time>".
  function zoneText(z) {
    if (!z || typeof z !== 'object') return '';
    var t = fmtTime(z.at);
    if (!t) return '';
    var place = typeof z.name === 'string' && z.name.trim() ? 'Near ' + z.name.trim() : 'On the road';
    return place + ', ' + t;
  }

  // Waiting time, worked out from the milestones the Worker already sends (times are whole hours).
  // At loading: arrived for loading -> loaded. At the border: arrived -> cleared (several borders add
  // up), or arrived -> arrived at destination when the driver never tapped Cleared border. A delay with one of the three named reasons runs from its first report until the next stage;
  // "Delay reported" (any other problem) is never counted. A wait still open counts up to 3 hours ago,
  // because milestones appear here only 3 hours after they happen, and says "so far".
  var DELAY_WAITS = [
    ['Delay: waiting for documents', 'Waiting for documents'],
    ['Delay: waiting for seals', 'Waiting for seals'],
    ['Delay: waiting for loading', 'Waiting for loading']
  ];
  var PUBLISH_LAG_MS = 3 * 36e5;
  function waitRows(ms, delivered) {
    var list = ms.filter(function (m) { return !isNaN(new Date(m.at)); })
      .sort(function (x, y) { return new Date(x.at) - new Date(y.at); });
    var upTo = Math.floor((Date.now() - PUBLISH_LAG_MS) / 36e5) * 36e5;
    var sums = {};
    function add(key, from, to, open, note) {
      var h = Math.max(0, Math.round((to - from) / 36e5));
      var o = sums[key] || (sums[key] = { h: 0, open: false, note: '' });
      o.h += h; o.open = o.open || open; o.note = o.note || note || '';
    }
    function nextStage(i, types) {
      for (var j = i + 1; j < list.length; j++) {
        if (list[j].type !== 'issue' && (!types || types.indexOf(list[j].type) >= 0)) return list[j];
      }
      return null;
    }
    var borderOpen = false;
    list.forEach(function (m, i) {
      var at = new Date(m.at).getTime(), end;
      if (m.type === 'arrived_loading') {
        end = nextStage(i);
        if (end && end.type === 'loaded') add('At loading', at, new Date(end.at).getTime(), false);
        else if (!end && !delivered) add('At loading', at, upTo, true);
      } else if (m.type === 'border_arrived' && !borderOpen) {
        borderOpen = true;
        end = nextStage(i, ['border_cleared', 'arrived', 'offloaded']);
        if (end && end.type === 'border_cleared') add('At the border', at, new Date(end.at).getTime(), false);
        // No "Cleared border" tap: keep the wait (needed for demurrage), counted up to arrival and marked so.
        else if (end) add('At the border', at, new Date(end.at).getTime(), false, 'to arrival');
        else if (!delivered) add('At the border', at, upTo, true);
      } else if (m.type === 'border_cleared') {
        borderOpen = false;
      } else if (m.type === 'issue') {
        var key = null;
        DELAY_WAITS.forEach(function (d) { if (m.label === d[0]) key = d[1]; });
        if (!key) return;
        // Only the first report of a reason in each stretch between stages counts.
        for (var k = i - 1; k >= 0 && list[k].type === 'issue'; k--) if (list[k].label === m.label) return;
        end = nextStage(i);
        if (end) add(key, at, new Date(end.at).getTime(), false);
        else if (!delivered) add(key, at, upTo, true);
      }
    });
    var order = ['At loading', 'At the border', 'Waiting for documents', 'Waiting for seals', 'Waiting for loading'];
    return order.filter(function (k) { return sums[k]; }).map(function (k) {
      var h = sums[k].h;
      var text = h < 24 ? h + ' h' : Math.floor(h / 24) + ' d ' + (h % 24) + ' h';
      return [k, text + (sums[k].open ? ' so far' : sums[k].note ? ' (' + sums[k].note + ')' : '')];
    });
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
    else if (s.status === 'arrived') row(dl, 'Arrived', arrivedText(s.milestones));
    else {
      row(dl, 'Estimated arrival', etaText(s.eta));
      row(dl, 'First estimate', firstText(s.eta));
      row(dl, 'Last known location', zoneText(s.zone));
    }
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
    // Delays reported after arrival (e.g. offloaded, waiting for POD) stay in the office records but are
    // not shown to clients, so they don't read as a problem with the delivery.
    var arrivedAt = '';
    ms.forEach(function (m) { if (m && m.type === 'arrived' && String(m.at) > arrivedAt) arrivedAt = String(m.at); });
    if (arrivedAt) ms = ms.filter(function (m) { return !(m && m.type === 'issue' && String(m.at) > arrivedAt); });
    var waits = waitRows(ms, s.status === 'delivered');
    if (waits.length) {
      card.appendChild(el('h2', 'track-sub', 'Waiting time'));
      var wdl = el('dl', 'track-facts');
      waits.forEach(function (w) { row(wdl, w[0], w[1]); });
      card.appendChild(wdl);
    }
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
