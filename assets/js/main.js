document.addEventListener('DOMContentLoaded', function () {
  var toggle = document.querySelector('.nav-toggle');
  var navMain = document.querySelector('.nav-main');
  var overlay = document.querySelector('.nav-overlay');

  function closeNav() {
    navMain.classList.remove('open');
    overlay.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
  }

  if (toggle && navMain) {
    toggle.addEventListener('click', function () {
      var isOpen = navMain.classList.toggle('open');
      overlay.classList.toggle('open', isOpen);
      toggle.setAttribute('aria-expanded', String(isOpen));
    });
  }
  if (overlay) overlay.addEventListener('click', closeNav);

  document.querySelectorAll('.nav-main > li').forEach(function (li) {
    var btn = li.querySelector('button');
    if (!btn) return;
    btn.addEventListener('click', function (e) {
      if (window.innerWidth <= 980) {
        e.preventDefault();
        var isOpen = li.classList.toggle('open');
        document.querySelectorAll('.nav-main > li').forEach(function (other) {
          if (other !== li) other.classList.remove('open');
        });
        btn.setAttribute('aria-expanded', String(isOpen));
      }
    });

    // Keep aria-expanded truthful when the dropdown is revealed via
    // hover or keyboard focus on wide (non-mobile-menu) viewports.
    function open() { btn.setAttribute('aria-expanded', 'true'); }
    function close() { if (!li.classList.contains('open')) btn.setAttribute('aria-expanded', 'false'); }
    li.addEventListener('mouseenter', open);
    li.addEventListener('mouseleave', close);
    li.addEventListener('focusin', open);
    li.addEventListener('focusout', function (e) {
      if (!li.contains(e.relatedTarget)) close();
    });
  });

  var path = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-main a, .dropdown a').forEach(function (a) {
    var href = a.getAttribute('href');
    if (href === path) {
      a.closest('li').classList.add('active');
      var parentLi = a.closest('.dropdown') && a.closest('.dropdown').closest('li');
      if (parentLi) parentLi.classList.add('active');
    }
  });

  var backToTop = document.querySelector('.back-to-top');
  if (backToTop) {
    window.addEventListener('scroll', function () {
      backToTop.classList.toggle('show', window.scrollY > 500);
    });
    backToTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  var form = document.getElementById('enquiry-form');
  var status = document.getElementById('form-status');
  if (form && status) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = form.querySelector('#name');
      var email = form.querySelector('#email');
      var submitBtn = form.querySelector('button[type="submit"]');
      var valid = form.checkValidity();

      if (!valid) {
        status.textContent = 'Please complete all required fields with a valid email address.';
        status.className = 'err';
        return;
      }

      if (submitBtn) submitBtn.disabled = true;
      status.textContent = 'Sending your enquiry...';
      status.className = 'ok';

      fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { 'Accept': 'application/json' }
      }).then(function (response) {
        if (response.ok) {
          status.textContent = 'Thank you, ' + name.value.split(' ')[0] + '. Your enquiry has been received. Our team will respond to ' + email.value + ' shortly.';
          status.className = 'ok';
          form.reset();
        } else {
          status.textContent = 'Sorry, something went wrong sending your enquiry. Please email us directly at info@octanetransport.com.';
          status.className = 'err';
        }
      }).catch(function () {
        status.textContent = 'Sorry, something went wrong sending your enquiry. Please email us directly at info@octanetransport.com.';
        status.className = 'err';
      }).finally(function () {
        if (submitBtn) submitBtn.disabled = false;
      });
    });
  }

  var tabButtons = document.querySelectorAll('.tab-btn');
  if (tabButtons.length) {
    tabButtons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var target = btn.getAttribute('data-tab');
        document.querySelectorAll('.tab-btn').forEach(function (b) {
          b.classList.remove('active');
          if (b.hasAttribute('aria-selected')) b.setAttribute('aria-selected', 'false');
        });
        document.querySelectorAll('.tab-panel').forEach(function (p) { p.classList.remove('active'); });
        btn.classList.add('active');
        if (btn.hasAttribute('aria-selected')) btn.setAttribute('aria-selected', 'true');
        document.getElementById(target).classList.add('active');
      });
    });
  }

  // Vendor & Compliance Documentation Request forms (New Customer / Existing Customer)
  function isGroupChecked(groupName) {
    var boxes = document.querySelectorAll('[data-group="' + groupName + '"]');
    return Array.prototype.slice.call(boxes).some(function (b) { return b.checked; });
  }

  function attachGroupListeners(form) {
    form.querySelectorAll('fieldset[data-min-checked]').forEach(function (fieldset) {
      var groupName = fieldset.getAttribute('data-group-name');
      var errorEl = form.querySelector('[data-error-for="' + groupName + '"]');
      fieldset.querySelectorAll('[data-group="' + groupName + '"]').forEach(function (box) {
        box.addEventListener('change', function () {
          if (errorEl) errorEl.classList.toggle('show', !isGroupChecked(groupName));
        });
      });
    });
  }

  function validateCheckboxGroups(form) {
    var allValid = true;
    form.querySelectorAll('fieldset[data-min-checked]').forEach(function (fieldset) {
      var groupName = fieldset.getAttribute('data-group-name');
      var satisfied = isGroupChecked(groupName);
      var errorEl = form.querySelector('[data-error-for="' + groupName + '"]');
      if (errorEl) errorEl.classList.toggle('show', !satisfied);
      if (!satisfied) allValid = false;
    });
    return allValid;
  }

  function wireVendorDocForm(formId, statusId, successHtml) {
    var form = document.getElementById(formId);
    var status = document.getElementById(statusId);
    if (!form || !status) return;

    attachGroupListeners(form);

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var submitBtn = form.querySelector('button[type="submit"]');
      var nativeValid = form.checkValidity();
      var groupsValid = validateCheckboxGroups(form);

      if (!nativeValid || !groupsValid) {
        status.innerHTML = 'Please complete all required fields, select at least one option where requested, and confirm the declaration.';
        status.className = 'err';
        if (!nativeValid) form.reportValidity();
        else {
          var firstError = form.querySelector('.field-error.show');
          if (firstError) firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return;
      }

      if (submitBtn) submitBtn.disabled = true;
      status.innerHTML = 'Sending your documentation request...';
      status.className = 'ok';

      fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { 'Accept': 'application/json' }
      }).then(function (response) {
        if (response.ok) {
          status.innerHTML = successHtml;
          status.className = 'ok';
          form.reset();
          form.querySelectorAll('.field-error.show').forEach(function (el) { el.classList.remove('show'); });
        } else {
          status.innerHTML = 'Sorry, something went wrong sending your request. Please email us directly at info@octanetransport.com.';
          status.className = 'err';
        }
      }).catch(function () {
        status.innerHTML = 'Sorry, something went wrong sending your request. Please email us directly at info@octanetransport.com.';
        status.className = 'err';
      }).finally(function () {
        if (submitBtn) submitBtn.disabled = false;
      });
    });
  }

  var vendorDocSuccessMessage =
    '<p style="margin:0 0 10px;">Thank you. Your documentation request has been received. Our team will review the request and contact you using the details provided.</p>' +
    '<p style="margin:0;">If your request relates to a tender, supplier registration or other deadline, please include the relevant reference and required-by date so we can prioritise the request.</p>';

  wireVendorDocForm('new-customer-form', 'new-customer-status', vendorDocSuccessMessage);
  wireVendorDocForm('existing-customer-form', 'existing-customer-status', vendorDocSuccessMessage);

  if (!document.querySelector('.wa-float')) {
    var waFloat = document.createElement('a');
    waFloat.className = 'wa-float';
    waFloat.href = 'https://wa.me/260965732525?text=Hello%20Octane%20Transport%2C%20I%27d%20like%20to%20request%20a%20quote.';
    waFloat.target = '_blank';
    waFloat.rel = 'noopener';
    waFloat.setAttribute('aria-label', 'Chat with Octane Transport on WhatsApp');
    waFloat.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.64.07-.3-.15-1.26-.46-2.39-1.47-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.61-.92-2.21-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.7.63.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35zM12.05 21.5h-.01a9.4 9.4 0 01-4.8-1.31l-.34-.2-3.57.94.95-3.48-.22-.36a9.4 9.4 0 01-1.44-5.02c0-5.2 4.23-9.43 9.44-9.43 2.52 0 4.89.98 6.67 2.77a9.37 9.37 0 012.76 6.67c0 5.2-4.24 9.43-9.44 9.43zm8.03-17.46A11.28 11.28 0 0012.05.72C5.8.72.7 5.8.7 12.07c0 2 .52 3.95 1.52 5.67L.6 23.64l6.03-1.58a11.33 11.33 0 005.42 1.38h.01c6.26 0 11.35-5.09 11.35-11.35 0-3.03-1.18-5.88-3.32-8.02z"/></svg><span>WhatsApp us</span>';
    document.body.appendChild(waFloat);
  }
});
