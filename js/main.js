(function () {
  'use strict';

  var root = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Theme ---------- */
  document.getElementById('themeBtn').addEventListener('click', function () {
    var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    if (window.__pcRefreshColors) window.__pcRefreshColors();
  });

  /* ---------- Mobile menu ---------- */
  var navLinks = document.getElementById('navLinks');
  document.getElementById('menuBtn').addEventListener('click', function () {
    navLinks.classList.toggle('open');
  });
  navLinks.addEventListener('click', function (e) {
    if (e.target.tagName === 'A') navLinks.classList.remove('open');
  });

  /* ---------- Nav border + scrollspy ---------- */
  var nav = document.getElementById('nav');
  var links = Array.prototype.slice.call(navLinks.querySelectorAll('a'));
  var sections = links.map(function (a) { return document.querySelector(a.getAttribute('href')); });
  function onScroll() {
    nav.classList.toggle('scrolled', window.scrollY > 8);
    var pos = window.scrollY + 120;
    var current = 0;
    sections.forEach(function (s, i) { if (s && s.offsetTop <= pos) current = i; });
    if (window.innerHeight + window.scrollY >= document.body.scrollHeight - 4) current = sections.length - 1;
    links.forEach(function (a, i) { a.classList.toggle('active', i === current); });
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
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('in'); });
  }

  /* ---------- Publication filter & search ---------- */
  var pubs = Array.prototype.slice.call(document.querySelectorAll('.pub'));
  var groups = document.querySelectorAll('.year-group');
  var filterBtns = document.querySelectorAll('.filter');
  var searchInput = document.getElementById('pubSearch');
  var emptyMsg = document.getElementById('pubEmpty');
  var activeFilter = 'all';

  function tagsOf(p) { return (p.getAttribute('data-tags') || '').split(/\s+/); }

  filterBtns.forEach(function (btn) {
    var f = btn.getAttribute('data-filter');
    var n = f === 'all' ? pubs.length : pubs.filter(function (p) { return tagsOf(p).indexOf(f) > -1; }).length;
    btn.querySelector('.cnt').textContent = n;
    btn.addEventListener('click', function () {
      filterBtns.forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      activeFilter = f;
      applyFilter();
    });
  });

  function applyFilter() {
    var q = searchInput.value.trim().toLowerCase();
    var visible = 0;
    pubs.forEach(function (p) {
      var okF = activeFilter === 'all' || tagsOf(p).indexOf(activeFilter) > -1;
      var okQ = !q || p.textContent.toLowerCase().indexOf(q) > -1;
      var show = okF && okQ;
      p.classList.toggle('hidden', !show);
      if (show) { visible++; p.classList.add('in'); }
    });
    groups.forEach(function (g) {
      g.style.display = g.querySelector('.pub:not(.hidden)') ? '' : 'none';
    });
    emptyMsg.style.display = visible ? 'none' : 'block';
  }
  searchInput.addEventListener('input', applyFilter);

  /* ---------- Footer year ---------- */
  document.getElementById('year').textContent = new Date().getFullYear();

  /* ---------- Hero point cloud (torus knot) ---------- */
  var canvas = document.getElementById('pointcloud');
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');
  var W = 0, H = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);
  var colA = [79, 70, 229], colB = [6, 182, 212];

  function hexToRgb(h) {
    h = h.trim().replace('#', '');
    if (h.length === 3) h = h.split('').map(function (c) { return c + c; }).join('');
    var n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  window.__pcRefreshColors = function () {
    var cs = getComputedStyle(root);
    try {
      colA = hexToRgb(cs.getPropertyValue('--accent'));
      colB = hexToRgb(cs.getPropertyValue('--accent-2'));
    } catch (e) { /* keep defaults */ }
  };
  window.__pcRefreshColors();

  var N = window.innerWidth < 760 ? 900 : 1800;
  var pts = [];
  for (var i = 0; i < N; i++) {
    var t = (i / N) * Math.PI * 2;
    var p = 2, q = 3;
    var r = Math.cos(q * t) + 2.2;
    var cx = r * Math.cos(p * t), cy = r * Math.sin(p * t), cz = -Math.sin(q * t);
    var a = Math.random() * Math.PI * 2, b = Math.random() * Math.PI * 2;
    var rad = 0.38 + (Math.random() - 0.5) * 0.08;
    pts.push([
      cx + rad * Math.cos(a) * Math.cos(b),
      cy + rad * Math.sin(a) * Math.cos(b),
      cz + rad * Math.sin(b)
    ]);
  }

  function resize() {
    var rect = canvas.getBoundingClientRect();
    W = rect.width; H = rect.height;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener('resize', resize);
  resize();

  var mx = 0, my = 0, tmx = 0, tmy = 0;
  window.addEventListener('mousemove', function (e) {
    tmx = (e.clientX / window.innerWidth - 0.5) * 0.6;
    tmy = (e.clientY / window.innerHeight - 0.5) * 0.6;
  }, { passive: true });

  var running = true, angle = 0;
  var proj = new Array(N);

  function frame() {
    if (!running) return;
    angle += reduceMotion ? 0 : 0.0035;
    mx += (tmx - mx) * 0.05; my += (tmy - my) * 0.05;
    var ay = angle + mx, ax = 0.5 + my;
    var cY = Math.cos(ay), sY = Math.sin(ay), cX = Math.cos(ax), sX = Math.sin(ax);
    var scale = Math.min(W, H) / 7.5;
    var ox = W / 2, oy = H / 2;

    for (var i = 0; i < N; i++) {
      var v = pts[i];
      var x = v[0] * cY + v[2] * sY;
      var z = -v[0] * sY + v[2] * cY;
      var y = v[1] * cX - z * sX;
      z = v[1] * sX + z * cX;
      var persp = 5 / (5 + z);
      proj[i] = [ox + x * scale * persp, oy + y * scale * persp, z, persp];
    }
    proj.sort(function (a, b) { return b[2] - a[2]; });

    ctx.clearRect(0, 0, W, H);
    for (var j = 0; j < N; j++) {
      var P = proj[j];
      var k = Math.max(0, Math.min(1, (P[2] + 3) / 6));
      var rr = Math.round(colA[0] * k + colB[0] * (1 - k));
      var gg = Math.round(colA[1] * k + colB[1] * (1 - k));
      var bb = Math.round(colA[2] * k + colB[2] * (1 - k));
      ctx.fillStyle = 'rgba(' + rr + ',' + gg + ',' + bb + ',' + (0.35 + 0.6 * (1 - k)).toFixed(2) + ')';
      ctx.beginPath();
      ctx.arc(P[0], P[1], 1.6 * P[3], 0, 6.2832);
      ctx.fill();
    }
    requestAnimationFrame(frame);
  }

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (en) {
      var vis = en[0].isIntersecting;
      if (vis && !running) { running = true; requestAnimationFrame(frame); }
      else if (!vis) running = false;
    }).observe(canvas);
  }
  requestAnimationFrame(frame);
})();
