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
      }
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
      var message = form.querySelector('#message');
      var valid = form.checkValidity();

      if (!valid) {
        status.textContent = 'Please complete all required fields with a valid email address.';
        status.className = 'err';
        return;
      }

      status.textContent = 'Thank you, ' + name.value.split(' ')[0] + '. Your enquiry has been received. Our team will respond to ' + email.value + ' shortly.';
      status.className = 'ok';
      form.reset();
    });
  }

  var tabButtons = document.querySelectorAll('.tab-btn');
  if (tabButtons.length) {
    tabButtons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var target = btn.getAttribute('data-tab');
        document.querySelectorAll('.tab-btn').forEach(function (b) { b.classList.remove('active'); });
        document.querySelectorAll('.tab-panel').forEach(function (p) { p.classList.remove('active'); });
        btn.classList.add('active');
        document.getElementById(target).classList.add('active');
      });
    });
  }
});
