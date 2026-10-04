/* Octane Transport chat widget.
   Talks to a Cloudflare Worker that holds the Anthropic API key — this file
   never sees the key. Set WORKER_URL below once the Worker is deployed
   (see cloudflare-worker/README.md); until then the widget stays hidden. */
(function () {
  var WORKER_URL = 'https://octane-chat.withered-morning-91b5.workers.dev/';
  var MAX_MESSAGES = 20; // per browser session, backstop for the server-side cap
  var STORAGE_KEY = 'octane_chat_session';
  var WEB3FORMS_KEY = '7f27c753-6019-4c9e-a7eb-9c432a0be1ca'; // public by design, same key as the contact form

  if (!WORKER_URL) return;

  document.addEventListener('DOMContentLoaded', function () {
    var session = loadSession();

    var launcher = document.createElement('button');
    launcher.className = 'chat-launcher';
    launcher.type = 'button';
    launcher.setAttribute('aria-label', 'Chat with Octane Transport');
    launcher.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 4h16a1 1 0 011 1v11a1 1 0 01-1 1H9l-4 4v-4H4a1 1 0 01-1-1V5a1 1 0 011-1z"/></svg>';
    document.body.appendChild(launcher);

    var panel = document.createElement('div');
    panel.className = 'chat-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Octane Transport chat');
    panel.innerHTML =
      '<div class="chat-head">' +
        '<span>Octane Transport</span>' +
        '<button type="button" class="chat-close" aria-label="Close chat">&times;</button>' +
      '</div>' +
      '<div class="chat-log" aria-live="polite"></div>' +
      '<p class="chat-note">Automated assistant. For a quote or booking, use the <a href="/contact#enquiry-form">contact form</a> or <a href="https://wa.me/260965732525" target="_blank" rel="noopener">WhatsApp</a>. Chats may be reviewed to improve our service.</p>' +
      '<form class="chat-form">' +
        '<input type="text" class="chat-input" maxlength="500" placeholder="Ask a question&hellip;" autocomplete="off" required>' +
        '<button type="submit" class="chat-send" aria-label="Send">&#8594;</button>' +
      '</form>';
    document.body.appendChild(panel);

    var log = panel.querySelector('.chat-log');
    var form = panel.querySelector('.chat-form');
    var input = panel.querySelector('.chat-input');

    session.history.forEach(function (turn) {
      renderMessage(turn.role, turn.text);
    });
    if (session.history.length === 0) {
      renderMessage('assistant', 'Hello! Ask me about our routes, services or fleet. For quotes, please use the contact form.');
    }

    launcher.addEventListener('click', function () {
      panel.classList.toggle('open');
      if (panel.classList.contains('open')) input.focus();
    });
    panel.querySelector('.chat-close').addEventListener('click', function () {
      panel.classList.remove('open');
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var text = input.value.trim();
      if (!text) return;

      if (session.history.length >= MAX_MESSAGES * 2) {
        renderMessage('assistant', 'We\'ve reached the limit for this chat. Please continue via the contact form or WhatsApp.');
        return;
      }

      renderMessage('user', text);
      session.history.push({ role: 'user', text: text });
      input.value = '';
      input.disabled = true;

      var thinking = renderMessage('assistant', 'Typing&hellip;');

      fetch(WORKER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session.id, message: text })
      }).then(function (res) {
        if (!res.ok) throw new Error('bad response');
        return res.json();
      }).then(function (data) {
        thinking.remove();
        var reply = (data && data.reply) ? data.reply : 'Sorry, something went wrong. Please try the contact form.';
        renderMessage('assistant', reply);
        session.history.push({ role: 'assistant', text: reply });
        saveSession(session);
        if (data && data.offerForm) renderQuoteForm();
      }).catch(function () {
        thinking.remove();
        renderMessage('assistant', 'Sorry, something went wrong. Please use the contact form or WhatsApp.');
      }).finally(function () {
        input.disabled = false;
        input.focus();
      });
    });

    function renderQuoteForm() {
      var f = document.createElement('form');
      f.className = 'chat-quote';
      f.innerHTML =
        '<input type="text" name="name" placeholder="Your name" maxlength="100" autocomplete="name" required>' +
        '<input type="tel" name="phone" placeholder="Phone / WhatsApp" maxlength="30" autocomplete="tel" required>' +
        '<input type="text" name="cargo" placeholder="Cargo" maxlength="200" required>' +
        '<input type="text" name="route" placeholder="Route (from &rarr; to)" maxlength="200" required>' +
        '<input type="checkbox" name="botcheck" tabindex="-1" autocomplete="off" style="display:none">' +
        '<button type="submit">Request a quote</button>';
      log.appendChild(f);
      log.scrollTop = log.scrollHeight;
      f.addEventListener('submit', function (e) {
        e.preventDefault();
        var btn = f.querySelector('button');
        btn.disabled = true;
        var v = function (n) { return f.elements[n].value.trim(); };
        fetch('https://api.web3forms.com/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({
            access_key: WEB3FORMS_KEY,
            subject: 'Chatbot quote request',
            from_name: 'Octane website chat',
            botcheck: f.elements.botcheck.checked,
            Name: v('name'), Phone: v('phone'), Cargo: v('cargo'), Route: v('route')
          })
        }).then(function (res) {
          if (!res.ok) throw new Error('bad response');
          f.remove();
          renderMessage('assistant', 'Thank you. Your request has been sent; we will reply within 24 hours.');
        }).catch(function () {
          btn.disabled = false;
          renderMessage('assistant', 'Sorry, the request could not be sent. Please use the contact form or WhatsApp.');
        });
      });
    }

    function renderMessage(role, text) {
      var row = document.createElement('div');
      row.className = 'chat-msg ' + role;
      row.textContent = text; // textContent only — never render reply text as HTML
      log.appendChild(row);
      log.scrollTop = log.scrollHeight;
      return row;
    }

    function loadSession() {
      try {
        // A fresh arrival from another site (or typed address) starts a new chat;
        // reloads, back/forward and page-to-page navigation on this site keep it.
        var nav = performance.getEntriesByType('navigation')[0];
        var fresh = nav && nav.type === 'navigate' && (!document.referrer || new URL(document.referrer).origin !== location.origin);
        if (fresh) sessionStorage.removeItem(STORAGE_KEY);
        var raw = sessionStorage.getItem(STORAGE_KEY);
        if (raw) return JSON.parse(raw);
      } catch (e) {}
      return { id: 'octane-' + Date.now() + '-' + Math.random().toString(36).slice(2), history: [] };
    }

    function saveSession(s) {
      try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch (e) {}
    }
  });
})();
