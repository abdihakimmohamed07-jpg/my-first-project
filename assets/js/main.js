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

  // Homepage hero tilt — desktop pointer devices only, so touch and reduced-motion users get the plain flat hero
  var heroStage = document.querySelector('.hero-perspective');
  var heroTilt = document.querySelector('.hero-tilt');
  if (heroStage && heroTilt &&
      window.matchMedia('(hover: hover) and (pointer: fine)').matches &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    heroStage.addEventListener('pointermove', function (e) {
      var r = heroStage.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width - 0.5;
      var py = (e.clientY - r.top) / r.height - 0.5;
      heroTilt.style.transform = 'scale(1.04) rotateY(' + (px * 6) + 'deg) rotateX(' + (py * -6) + 'deg)';
    });
    heroStage.addEventListener('pointerleave', function () {
      heroTilt.style.transform = 'scale(1) rotateY(0deg) rotateX(0deg)';
    });
  }

  // Dimensional service cards — click/tap/keyboard toggle, independent of hover
  document.querySelectorAll('.card-flip').forEach(function (card) {
    card.querySelectorAll('.card-flip-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        card.classList.toggle('flipped');
      });
    });
  });
});
