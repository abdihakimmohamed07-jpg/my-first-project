/* Shared renderer for /card/* staff contact-card pages.
   Each page sets window.CARD_PERSON to a key below, then loads this file. */
(function () {
  var PEOPLE = {
    abdihakim: {
      name: "Abdihakim Mohamed",
      title: "Managing Director, Octane Transport Zambia Limited",
      vcf: "/card/abdihakim-mohamed.vcf",
      telHref: "tel:+260973821013",
      telDisplay: "+260 973 821 013",
      whatsapp: "https://wa.me/260965732525",
      email: "abdihakim.mohamed@octanetransport.com"
    },
    zephaniah: {
      name: "Zephaniah Mpakani",
      title: "Operations Manager, Octane Transport Zambia Limited",
      vcf: "/card/zephaniah/zephaniah-mpakani.vcf",
      telHref: "tel:+260973547176",
      telDisplay: "+260 973 547 176",
      whatsapp: "https://wa.me/260973547176",
      email: "operations@octanetransport.com"
    }
  };

  var MAPS_LINK = "https://www.google.com/maps?cid=7074308477456269480";
  var ADDRESS_HTML = "19 Kafironda Drive, Itawa<br>Ndola, Zambia";

  var ICONS = {
    save: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20V10M12 20l-5-5M12 20l5-5"/><path d="M5 20h14"/></svg>',
    phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>',
    whatsapp: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.77.46 3.5 1.34 5.02L2.05 22l5.2-1.37a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.84 9.84 0 0 0 12.04 2zm0 1.67c2.21 0 4.29.86 5.85 2.42a8.21 8.21 0 0 1 2.42 5.82c0 4.55-3.71 8.25-8.27 8.25a8.27 8.27 0 0 1-4.21-1.15l-.3-.18-3.09.81.82-3-.2-.31a8.2 8.2 0 0 1-1.26-4.4c0-4.55 3.71-8.26 8.24-8.26zm-4.52 4.3c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.09 0 1.23.9 2.42 1.02 2.59.13.17 1.76 2.8 4.35 3.81 2.15.84 2.59.67 3.06.63.46-.04 1.49-.61 1.7-1.19.21-.59.21-1.09.15-1.19-.06-.11-.23-.17-.48-.29-.25-.13-1.49-.74-1.72-.82-.23-.08-.4-.13-.56.13-.17.25-.65.82-.79.98-.15.17-.29.19-.54.06-.25-.13-1.05-.39-2-1.23-.74-.66-1.24-1.47-1.39-1.72-.15-.25-.02-.38.11-.51.11-.11.25-.29.38-.44.13-.14.17-.25.25-.42.08-.17.04-.31-.02-.44-.06-.13-.56-1.37-.78-1.87-.2-.49-.41-.42-.56-.43h-.05z"/></svg>',
    email: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/></svg>'
  };

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function render() {
    var key = window.CARD_PERSON;
    var p = PEOPLE[key];
    var root = document.getElementById("card-root");
    if (!p || !root) return;

    document.title = p.name + " | Octane Transport Zambia Limited";

    root.innerHTML =
      '<div class="logo-tile"><img src="/assets/img/logo.png" alt="Octane Transport" width="160" height="48"></div>' +
      '<h1>' + escapeHtml(p.name) + '</h1>' +
      '<p class="title">' + escapeHtml(p.title) + '</p>' +
      '<a class="btn btn-primary" href="' + p.vcf + '">' + ICONS.save + 'Save Contact</a>' +
      '<a class="btn btn-secondary" href="' + p.telHref + '">' + ICONS.phone + 'Call ' + escapeHtml(p.telDisplay) + '</a>' +
      '<a class="btn btn-secondary" href="' + p.whatsapp + '" target="_blank" rel="noopener">' + ICONS.whatsapp + 'WhatsApp</a>' +
      '<a class="btn btn-secondary" href="mailto:' + p.email + '">' + ICONS.email + 'Email</a>' +
      '<p class="address"><a href="' + MAPS_LINK + '" target="_blank" rel="noopener">' + ADDRESS_HTML + '</a></p>' +
      '<p class="back-link"><a href="https://www.octanetransport.com/">www.octanetransport.com &rarr;</a></p>';
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", render);
  } else {
    render();
  }
})();
