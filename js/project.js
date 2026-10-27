(function () {
  'use strict';

  var root = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Theme (shared localStorage key with home page) ---------- */
  document.getElementById('themeBtn').addEventListener('click', function () {
    var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
  });

  /* ---------- Mobile menu ---------- */
  var navLinks = document.getElementById('navLinks');
  document.getElementById('menuBtn').addEventListener('click', function () {
    navLinks.classList.toggle('open');
  });
  navLinks.addEventListener('click', function (e) {
    if (e.target.closest('a')) navLinks.classList.remove('open');
  });

  /* ---------- Nav border + scrollspy ---------- */
  var nav = document.getElementById('nav');
  var spyLinks = Array.prototype.filter.call(navLinks.querySelectorAll('a'), function (a) {
    return a.getAttribute('href').charAt(0) === '#';
  });
  var sections = spyLinks.map(function (a) { return document.querySelector(a.getAttribute('href')); });
  function onScroll() {
    nav.classList.toggle('scrolled', window.scrollY > 8);
    var pos = window.scrollY + 120;
    var current = -1;
    sections.forEach(function (s, i) { if (s && s.offsetTop <= pos) current = i; });
    spyLinks.forEach(function (a, i) { a.classList.toggle('active', i === current); });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Reveal on scroll ---------- */
  var reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.06, rootMargin: '0px 0px -40px 0px' });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('in'); });
  }

  /* ---------- Lightbox ---------- */
  var lb = document.getElementById('lightbox');
  var lbImg = lb.querySelector('img');
  function closeLb() {
    lb.classList.remove('open');
    document.body.style.overflow = '';
  }
  document.querySelectorAll('.fig-frame img').forEach(function (img) {
    img.parentNode.addEventListener('click', function () {
      lbImg.src = img.currentSrc || img.src;
      lbImg.alt = img.alt;
      lb.classList.add('open');
      document.body.style.overflow = 'hidden';
    });
  });
  lb.addEventListener('click', closeLb);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && lb.classList.contains('open')) closeLb();
  });

  /* ---------- Copy BibTeX ---------- */
  var copyBtn = document.getElementById('copyBib');
  var bibText = document.getElementById('bibText');
  copyBtn.addEventListener('click', function () {
    var text = bibText.textContent;
    var done = function () {
      copyBtn.classList.add('done');
      copyBtn.querySelector('use').setAttribute('href', '#i-check');
      copyBtn.querySelector('span').textContent = 'Copied';
      setTimeout(function () {
        copyBtn.classList.remove('done');
        copyBtn.querySelector('use').setAttribute('href', '#i-copy');
        copyBtn.querySelector('span').textContent = 'Copy';
      }, 1800);
    };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(done);
    } else {
      var ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); done(); } catch (e) { /* noop */ }
      document.body.removeChild(ta);
    }
  });

  /* ---------- Footer year ---------- */
  document.getElementById('year').textContent = new Date().getFullYear();
})();
