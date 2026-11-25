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

  // The big line under the status, plus a warning pill when the ETA has slipped.
  function etaHero(eta) {
    if (!eta || eta.state === 'unavailable') return { main: 'ETA not yet available', pill: '' };
    if (eta.state === 'delayed') return { main: 'Updated ETA pending', pill: 'Delayed' };
    if (eta.state === 'contact') return { main: 'Please contact us for an update', pill: 'Delayed' };
    if (eta.state === 'border_delay') {
      var e = fmtDate(eta.from);
      return { main: e ? 'Earliest arrival ' + e : 'Updated ETA pending', pill: 'Delayed at the border' };
    }
    var a = fmtDate(eta.from), b = fmtDate(eta.to);
    if (!a && !b) return { main: 'ETA not yet available', pill: '' };
    return { main: 'Estimated arrival ' + (!a || !b || a === b ? a || b : a + ' to ' + b), pill: '' };
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

  // Waiting time in days, hours and minutes, worked out from the milestones the Worker already sends (times are to
  // the minute since driver-app SQL step 43; before that they were whole hours and minutes would have been made up).
  // At loading: arrived for loading -> loaded. At the border: arrived -> cleared (several borders add
  // up), or arrived -> arrived at destination when the driver never tapped Cleared border. At offloading: arrived
  // at destination -> "Offloaded, POD being processed", only once that milestone is here. A delay with one of the three named reasons runs from its first report until the next stage;
  // "Delay reported" (any other problem) is never counted. A wait still open counts up to 3 hours ago, never to the
  // clock: milestones appear here only 3 hours after they happen, so a truck that left 2 hours ago still looks
  // parked. It is tagged "Still waiting" and keeps counting while the page is open (see startWaitClock).
  var DELAY_WAITS = [
    ['Delay: waiting for documents', 'Waiting for documents'],
    ['Delay: waiting for seals', 'Waiting for seals'],
    ['Delay: waiting for loading', 'Waiting for loading']
  ];
  var PUBLISH_LAG_MS = 3 * 36e5;
  function waitRows(ms, delivered) {
    var list = ms.filter(function (m) { return !isNaN(new Date(m.at)); })
      .sort(function (x, y) { return new Date(x.at) - new Date(y.at); });
    var upTo = Math.floor((Date.now() - PUBLISH_LAG_MS) / 6e4) * 6e4;
    var sums = {};
    function add(key, from, to, open, note) {
      var min = Math.max(0, Math.floor((to - from) / 6e4));
      var o = sums[key] || (sums[key] = { min: 0, open: false, note: '' });
      o.min += min; o.open = o.open || open; o.note = o.note || note || '';
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
      } else if (m.type === 'arrived') {
        // At offloading: arrived -> the driver's "Offloaded" tap. Only once that tap is on the page: never an
        // open "so far" wait and never counted to the POD, which can come back days after offloading.
        end = nextStage(i);
        if (end && end.type === 'unloaded') add('At offloading', at, new Date(end.at).getTime(), false);
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
    var order = ['At loading', 'At the border', 'Waiting for documents', 'Waiting for seals', 'Waiting for loading', 'At offloading'];
    return order.filter(function (k) { return sums[k]; }).map(function (k) {
      return [k, durText(sums[k].min) + (sums[k].note ? ' (' + sums[k].note + ')' : ''), sums[k].open];
    });
  }
  // 3125 minutes -> "2d 4h 5m"; under a day "4h 5m"; under an hour "5m".
  function durText(min) {
    var d = Math.floor(min / 1440), h = Math.floor(min % 1440 / 60), m = min % 60;
    return d ? d + 'd ' + h + 'h ' + m + 'm' : h ? h + 'h ' + m + 'm' : m + 'm';
  }
  // While a wait is open, recount it every minute so it runs like a clock (still up to 3 hours ago).
  var waitTimer = null;
  function startWaitClock(ms, delivered, dds) {
    clearInterval(waitTimer);
    waitTimer = setInterval(function () {
      if (!document.body.contains(dds[0].node)) return clearInterval(waitTimer);
      var now = waitRows(ms, delivered);
      dds.forEach(function (x) {
        now.forEach(function (w) { if (w[0] === x.key && w[2]) x.node.firstChild.nodeValue = w[1]; });
      });
    }, 6e4);
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

  // Small line icons for the updates list, drawn as SVG elements (no HTML strings).
  var SVG_NS = 'http://www.w3.org/2000/svg';
  var ICONS = {
    pin: ['M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z', 'M12 12.2a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z'],
    box: ['M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5z', 'M3.5 7.5 12 12l8.5-4.5', 'M12 12v9'],
    truck: ['M2.5 6.5h11v9h-11z', 'M13.5 9.5h4l3 3.5v2.5h-7z', 'M6.5 18.5a1.8 1.8 0 1 0 0-3.6 1.8 1.8 0 0 0 0 3.6z', 'M17 18.5a1.8 1.8 0 1 0 0-3.6 1.8 1.8 0 0 0 0 3.6z'],
    flag: ['M5 21V4', 'M5 4h12l-2 4 2 4H5'],
    check: ['M5 12.5l4.5 4.5L19 7.5'],
    alert: ['M12 3.5 21.5 20h-19z', 'M12 10v4.5', 'M12 17.2v.3']
  };
  var TYPE_ICON = {
    arrived_loading: 'pin', loaded: 'box', departed: 'truck', border_arrived: 'flag', border_cleared: 'flag',
    arrived: 'pin', unloaded: 'box', offloaded: 'check', issue: 'alert'
  };
  function icon(name) {
    var svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    (ICONS[name] || ICONS.pin).forEach(function (d) {
      var path = document.createElementNS(SVG_NS, 'path');
      path.setAttribute('d', d);
      svg.appendChild(path);
    });
    return svg;
  }

  // Progress bar: Loaded, Departed, [Border], Arrived, Delivered. The Border step appears only once the
  // trip is known to cross a border (a border milestone, a border status or a border ETA), never guessed.
  var RANK = { booked: 0, at_loading: 0, loaded: 1, departed: 2, at_border: 3, border_cleared: 4, arrived: 5, delivered: 6 };
  function progressSteps(s, ms) {
    var rank = RANK[s.status] != null ? RANK[s.status] : 0;
    var border = s.status === 'at_border' || s.status === 'border_cleared' ||
      (s.eta && s.eta.state === 'border_delay') ||
      ms.some(function (m) { return m && (m.type === 'border_arrived' || m.type === 'border_cleared'); });
    var steps = [['Loaded', 1], ['Departed', 2]];
    if (border) steps.push(['Border', 4]);
    steps.push(['Arrived', 5], ['Delivered', 6]);
    var current = -1;
    return steps.map(function (st, i) {
      var done = rank >= st[1];
      var now = !done && current < 0;
      if (now) current = i;
      return { label: st[0], state: done ? 'done' : now ? 'now' : 'todo' };
    });
  }

  // "Sun 23 Nov" in Lusaka time, for grouping updates by day.
  function fmtDay(iso) {
    var d = new Date(iso);
    if (isNaN(d)) return '';
    return new Intl.DateTimeFormat('en-GB', { timeZone: TZ, weekday: 'short', day: 'numeric', month: 'short' }).format(d);
  }
  function fmtClock(iso) {
    var d = new Date(iso);
    if (isNaN(d)) return '';
    return new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false }).format(d);
  }

  var SHOW_FIRST = 3;

  function render(s) {
    out.textContent = '';
    var ms = Array.isArray(s.milestones) ? s.milestones.filter(function (m) { return m && typeof m === 'object'; }) : [];
    // Delays reported after arrival (e.g. offloaded, waiting for POD) stay in the office records but are
    // not shown to clients, so they don't read as a problem with the delivery.
    var arrivedAt = '';
    ms.forEach(function (m) { if (m.type === 'arrived' && String(m.at) > arrivedAt) arrivedAt = String(m.at); });
    if (arrivedAt) ms = ms.filter(function (m) { return !(m.type === 'issue' && String(m.at) > arrivedAt); });

    var delivered = s.status === 'delivered';
    // Status stays "arrived" after the driver's "Offloaded" tap; the header says so.
    var offloaded = s.status === 'arrived' && ms.some(function (m) { return m.type === 'unloaded'; });

    // 1. Status header: big status, the date that matters, route, progress bar.
    var main = '', sub = '', pill = '';
    if (delivered) main = fmtDate(s.delivered_on);
    else if (s.status === 'arrived') {
      main = 'Arrived ' + arrivedText(ms);
      if (offloaded) sub = 'Proof of delivery being processed';
    } else {
      var h = etaHero(s.eta);
      main = h.main; pill = h.pill; sub = firstText(s.eta) ? 'First estimate was ' + firstText(s.eta) : '';
    }
    var hero = el('section', 'track-hero track-hero--' + (delivered ? 'done' : pill ? 'warn' : 'live'));
    var top = el('div', 'track-hero-top');
    top.appendChild(el('p', 'track-code', s.code || ''));
    if (navigator.clipboard && s.code) {
      var copy = el('button', 'track-copy', 'Copy link');
      copy.type = 'button';
      copy.addEventListener('click', function () {
        navigator.clipboard.writeText(location.origin + '/track?code=' + encodeURIComponent(s.code)).then(function () {
          copy.textContent = 'Link copied';
          setTimeout(function () { copy.textContent = 'Copy link'; }, 2500);
        }, function () { copy.textContent = 'Could not copy'; });
      });
      top.appendChild(copy);
    }
    hero.appendChild(top);
    hero.appendChild(el('h2', 'track-status', offloaded ? 'Offloaded' : STATUS[s.status] || 'In progress'));
    if (main) hero.appendChild(el('p', 'track-when', main));
    if (sub) hero.appendChild(el('p', 'track-when-sub', sub));
    if (pill) hero.appendChild(el('p', 'track-pill', pill));

    if (s.origin || s.destination) {
      var route = el('div', 'track-route');
      var from = el('p', null, 'From');
      from.appendChild(el('strong', null, s.origin || '-'));
      var to = el('p', null, 'To');
      to.appendChild(el('strong', null, s.destination || '-'));
      route.appendChild(from);
      route.appendChild(to);
      hero.appendChild(route);
    }

    var steps = progressSteps(s, ms);
    var bar = el('ol', 'track-steps');
    bar.setAttribute('aria-label', 'Progress');
    steps.forEach(function (st) {
      var li = el('li', 'is-' + st.state);
      var dot = el('span', 'track-dot');
      if (st.state === 'done') dot.appendChild(icon('check'));
      li.appendChild(dot);
      li.appendChild(el('span', 'track-step-label', st.label));
      if (st.state !== 'todo') {
        li.appendChild(el('span', 'sr-only', st.state === 'done' ? ' (done)' : ' (current)'));
        if (st.state === 'now') li.setAttribute('aria-current', 'step');
      }
      bar.appendChild(li);
    });
    hero.appendChild(bar);

    if (!delivered && s.status !== 'arrived') {
      var loc = zoneText(s.zone);
      if (loc) {
        var lp = el('p', 'track-loc', 'Last known location: ');
        lp.appendChild(el('strong', null, loc));
        hero.appendChild(lp);
      }
    }

    // ePOD: the Worker's link is a signed Supabase link valid for 5 minutes, so each click
    // asks the Worker again for a fresh one, then navigates in the same tab (the link sends
    // Content-Disposition: attachment). window.open() after an async fetch is blocked on phones.
    if (isHttps(s.epod_url)) {
      var box = el('div', 'track-epod');
      var txt = el('p', null);
      txt.appendChild(el('strong', null, 'Proof of delivery'));
      txt.appendChild(el('span', null, 'PDF document'));
      box.appendChild(txt);
      var btn = el('button', 'track-btn track-btn--ok', 'Download ePOD');
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
      box.appendChild(btn);
      hero.appendChild(box);
      hero.appendChild(note);
    }
    out.appendChild(hero);

    // 2. Waiting time as tiles.
    clearInterval(waitTimer);
    var waits = waitRows(ms, delivered);
    if (waits.length) {
      var openDds = [];
      var wcard = el('section', 'track-card');
      wcard.appendChild(el('h2', 'track-sub', 'Waiting time'));
      var tiles = el('dl', 'track-tiles');
      waits.forEach(function (w) {
        var t = el('div', 'track-tile');
        t.appendChild(el('dt', null, w[0]));
        var dd = el('dd', null, w[1]);
        if (w[2]) {
          dd.appendChild(el('span', 'track-still', 'Still waiting'));
          openDds.push({ key: w[0], node: dd });
        }
        t.appendChild(dd);
        tiles.appendChild(t);
      });
      if (openDds.length) startWaitClock(ms.slice(), delivered, openDds);
      wcard.appendChild(tiles);
      out.appendChild(wcard);
    }

    // 3. Updates, newest first, grouped by day; the first few shown, the rest behind "Show all".
    ms.sort(function (x, y) { return String(y.at).localeCompare(String(x.at)); });
    if (ms.length) {
      var ucard = el('section', 'track-card');
      ucard.appendChild(el('h2', 'track-sub', 'Shipment updates'));
      var hidden = [], day = null, ol = null;
      ms.forEach(function (m, i) {
        var d = fmtDay(m.at) || 'Date unknown';
        if (d !== day) {
          day = d;
          var dh = el('h3', 'track-day', d);
          ol = el('ol', 'track-timeline');
          ucard.appendChild(dh);
          ucard.appendChild(ol);
          if (i >= SHOW_FIRST) { dh.hidden = true; hidden.push(dh); }
        }
        var li = el('li', (i === 0 ? 'is-current ' : '') + (m.type === 'issue' ? 'is-issue' : ''));
        var ic = el('span', 'track-ic');
        ic.appendChild(icon(m.type === 'unloaded' ? 'box' : TYPE_ICON[m.type]));
        li.appendChild(ic);
        var body = el('div', null);
        body.appendChild(el('span', 'track-label', m.label || ''));
        var t = fmtClock(m.at);
        if (t) {
          var time = el('time', null, t);
          time.dateTime = m.at;
          body.appendChild(time);
        }
        li.appendChild(body);
        ol.appendChild(li);
        if (i >= SHOW_FIRST) { li.hidden = true; hidden.push(li); }
      });
      if (hidden.length) {
        var more = el('button', 'track-more', 'Show all ' + ms.length + ' updates');
        more.type = 'button';
        more.addEventListener('click', function () {
          hidden.forEach(function (n) { n.hidden = false; });
          more.remove();
        });
        ucard.appendChild(more);
      }
      ucard.appendChild(el('p', 'track-note',
        'Times are Zambia time (CAT). Updates can take a few hours to appear.'));
      out.appendChild(ucard);
    }

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
