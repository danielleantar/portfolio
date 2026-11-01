(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const seg = (p, a, b) => clamp((p - a) / (b - a));
  const lerp = (a, b, t) => a + (b - a) * t;

  function bez(x1, y1, x2, y2) {
    const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
    const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
    const X = t => ((ax * t + bx) * t + cx) * t, Y = t => ((ay * t + by) * t + cy) * t;
    const dX = t => (3 * ax * t + 2 * bx) * t + cx;
    return x => {
      if (x <= 0) return 0; if (x >= 1) return 1;
      let t = x;
      for (let i = 0; i < 6; i++) { const d = dX(t); if (Math.abs(d) < 1e-6) break; t -= (X(t) - x) / d; }
      return Y(clamp(t));
    };
  }
  const eOut = bez(.23, 1, .32, 1), eIO = bez(.77, 0, .175, 1);

  /* ---------- bar, menu, links ---------- */
  const up = $('.bar__up'), menuBtn = $('.bar__menu'), sheet = $('.sheet');
  const toTop = () => scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  up.addEventListener('click', toTop);
  $$('[data-top]').forEach(b => b.addEventListener('click', toTop));

  let lbOpen = false;
  const setMenu = open => {
    sheet.classList.toggle('open', open);
    menuBtn.setAttribute('aria-expanded', open);
    sheet.toggleAttribute('inert', !open);
    document.documentElement.style.overflow = open || lbOpen ? 'hidden' : '';
  };
  sheet.setAttribute('inert', '');
  menuBtn.addEventListener('click', () => setMenu(!sheet.classList.contains('open')));
  addEventListener('keydown', e => { if (e.key === 'Escape') { setMenu(false); closeLb(); } });
  addEventListener('pageshow', () => setMenu(false));

  $$('a[href*="#"]').forEach(a => a.addEventListener('click', e => {
    const u = new URL(a.href, location.href);
    if (u.pathname !== location.pathname || !u.hash) { setMenu(false); return; }
    const t = document.getElementById(u.hash.slice(1)); if (!t) return;
    e.preventDefault();
    const wasOpen = sheet.classList.contains('open'); setMenu(false);
    setTimeout(() => t.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }), wasOpen ? 60 : 0);
  }));

  let ticking = false;
  const onScroll = () => {
    up.classList.toggle('on', scrollY > 40);
    if (!ticking) { ticking = true; requestAnimationFrame(frame); }
  };

  /* ---------- HOME: one house, one motion ---------- */
  const hero = $('.hero');
  const H = hero && {
    cam: $('.cam'), elev: $('.elev'), scene: $('.scene'), axo: $('.axo'),
    
    ax: ['roof', 'slab', 'vault', 'house'].map(k => $('.a-' + k)),
    title: $('.hero__title'), hint: $('.hint'), stat: $('.hero__stat'), num: $('#heroNum'),
    wa: $$('.w[data-set=a]'), wb: $$('.w[data-set=b]')
  };
  // Exploded-sketch units (px in the original drawing). Layers sit DYA above their place on the assembled house.
  const DYA = [705, 456, 240, 0], SHIFT = -444, EXTRA = [-70, -45, -20, 12];
  // The facade of the elevation lands on the balcony face of the small house, the roof on its roof.
  const FACE = { tl: [115, 973], tr: [351, 1123], bl: [115, 1179] };           // balcony face, drawing px
  const SRC_BODY = { x0: 13.87, x1: 78.4, y0: 42.4, y1: 98.6 };                 // % of the elevation image
  const SRC_ROOF = { x0: 13.1, x1: 79.6, y0: 12.1, y1: 42.75 };
  const DST_ROOF = { x0: 116, x1: 595, y0: 92 + DYA[0], y1: 383 + DYA[0] };     // drawing px
  let K = 1, MB = null, MR = null, M0 = null;
  const mix = (A, B, t) => A.map((v, i) => lerp(v, B[i], t));
  const css6 = m => `matrix(${m.map(v => v.toFixed(5)).join(',')})`;
  function measure() { if (H) K = H.axo.offsetWidth / 496; }
  function words(list, tIn, tOut, step) {
    list.forEach((el, i) => {
      const a = eOut(clamp((tIn - i * step) / (1 - i * step))), o = eIO(clamp((tOut - i * step) / (1 - i * step)));
      const dir = i === 1 ? 1 : -1;
      el.style.opacity = (a * (1 - o)).toFixed(3);
      el.style.transform = `translate3d(${(dir * 34 * (1 - a) - dir * 22 * o).toFixed(1)}px,0,0)`;
    });
  }
  function hlayout(p) {
    if (reduce || !H) return;
    const t = eOut(seg(p, .05, .14));
    H.title.style.opacity = (1 - t).toFixed(3); H.title.style.transform = `translate3d(0,${(-16 * t).toFixed(1)}px,0)`;
    H.hint.style.opacity = (1 - seg(p, .02, .07)).toFixed(3);
    words(H.wa, seg(p, .06, .16), seg(p, .34, .44), .12);
    words(H.wb, seg(p, .56, .68), seg(p, .90, .98), .12);
    // the assembled house is there from the first pixel; scrolling pulls it apart: roof, slab, vault, house
    const sep = [eIO(seg(p, .10, .32)), eIO(seg(p, .16, .38)), eIO(seg(p, .22, .44)), 1];
    const gc = eIO(seg(p, .10, .44)), e = eIO(seg(p, .46, .62));
    H.axo.style.transform = `translate3d(-50%,${(SHIFT * K * (1 - gc)).toFixed(1)}px,0)`;
    H.ax.forEach((el, i) => {
      const dy = (DYA[i] * (1 - sep[i]) + EXTRA[i] * e) * K;
      el.style.transform = `translate3d(0,${dy.toFixed(1)}px,0) scale(${(i === 3 ? 1 + e * .05 : 1).toFixed(4)})`;
      el.style.opacity = 1;
    });
    const so = eOut(seg(p, .62, .74));
    H.stat.style.opacity = so.toFixed(3); H.stat.style.transform = `translate3d(0,${(22 * (1 - so)).toFixed(1)}px,0)`;
    H.num.textContent = Math.round(60 * eOut(seg(p, .64, .82)));
  }

  /* ---------- HOME: the projects, one by one ---------- */
  const reel = $('.reel');
  const scs = $$('.sc'), N = scs.length, bar = $('.reel__bar');
  let activeSc = -1;
  // Pen-drawn icons (thesis, Palazzo Reale, Comm-Unify): a per-pixel timing map is baked into ic-*-draw.png
  const pens = $$('.sc__draw').map(cv => {
    const o = { cv, g: cv.getContext('2d'), k: +cv.dataset.k, dur: +cv.dataset.dur || 1400, src: null, start: -1, last: -1 };
    const im = new Image();
    im.onload = () => {
      const t = document.createElement('canvas'); t.width = t.height = im.naturalWidth;
      const c = t.getContext('2d', { willReadFrequently: true }); c.drawImage(im, 0, 0);
      o.src = c.getImageData(0, 0, t.width, t.height); cv.width = cv.height = t.width;
      penPaint(o, reduce ? 1 : 0);
    };
    im.src = (window.PENDATA && window.PENDATA[cv.dataset.src]) || cv.dataset.src;
    return o;
  });
  function penPaint(o, P) {
    if (!o.src) return;
    P = clamp(P); if (Math.abs(P - o.last) < .0015 && P < 1 && P > 0) return; o.last = P;
    const s = o.src.data, out = o.g.createImageData(o.src.width, o.src.height), d = out.data;
    const fp = eOut(clamp((P - .76) / .24)), pk = (P / .76) * 254;
    for (let i = 0; i < s.length; i += 4) {
      const a = s[i];
      if (!a) continue;
      const v = s[i + 2] ? fp : clamp((pk - s[i + 1]) / 5);
      d[i] = 46; d[i + 1] = 42; d[i + 2] = 37; d[i + 3] = a * v;
    }
    o.g.putImageData(out, 0, 0);
  }
  function penTick(o, now) {
    if (o.start < 0) return;
    const P = (now - o.start) / o.dur; penPaint(o, P);
    if (P < 1) requestAnimationFrame(n => penTick(o, n));
  }
  // Speculum: built from the bottom up, course by course, like bricks dropping into place
  const legos = $$('.sc__ic i');
  const eBk = bez(.3, 1.5, .6, 1);
  let lStart = -1;
  const spL = $('.sc__ic .spL'), spF = $('.sc__ic .spF'), spT = $('.sc__ic .spT');
  function legoPaint(P) {
    const n = legos.length;
    // 1. the slabs are stacked, lowest first
    legos.forEach((el, j) => {
      const q = clamp((P - (n - 1 - j) * .045) / .2);
      el.style.opacity = clamp(q * 4).toFixed(3);
      el.style.transform = `translate3d(0,${(-60 * (1 - eBk(q))).toFixed(1)}px,0)`;
    });
    // 2. the two cubes drop on their stacks, 3. the towers grow up
    const drop = (el, q) => { el.style.opacity = clamp(q * 5).toFixed(3); el.style.transform = `translate3d(0,${(-100 * (1 - eBk(q))).toFixed(1)}px,0)`; };
    drop(spL, clamp((P - .42) / .22)); drop(spF, clamp((P - .56) / .22));
    const r = eOut(clamp((P - .68) / .32));
    spT.style.opacity = r > 0 ? 1 : 0;
    spT.style.clipPath = `inset(${((1 - r) * 100).toFixed(1)}% 0 0 0)`;
    spT.style.transform = `translate3d(0,${(26 * (1 - r)).toFixed(1)}px,0)`;
  }
  function legoTick(now) {
    if (lStart < 0) return;
    const P = (now - lStart) / 1700; legoPaint(clamp(P));
    if (P < 1) requestAnimationFrame(legoTick);
  }
  if (legos.length && !reduce) legoPaint(0);
  // Green Summit: the white block lands first, then the black block drops onto it
  const gw = $('.sc__ic .gw'), gb = $('.sc__ic .gb'), eBack = bez(.34, 1.4, .64, 1);
  let gStart = -1;
  function gsPaint(P) {
    const w = eOut(clamp(P / .4)), k = eBack(clamp((P - .28) / .72));
    gw.style.opacity = clamp(w * 3).toFixed(3); gw.style.transform = `translate3d(0,${(-46 * (1 - w)).toFixed(1)}px,0)`;
    gb.style.opacity = clamp((P - .28) * 8).toFixed(3); gb.style.transform = `translate3d(0,${(-130 * (1 - k)).toFixed(1)}px,0)`;
  }
  function gsTick(now) {
    if (gStart < 0) return;
    const P = (now - gStart) / 950; gsPaint(clamp(P));
    if (P < 1) requestAnimationFrame(gsTick);
  }
  if (gw && !reduce) gsPaint(0);
  function rlayout(P) {
    if (reduce || !N) return;
    scs.forEach((sc, k) => {
      const t = k === 0 ? 1 : eIO(seg(P, k - .75, k));
      const nt = k < N - 1 ? eIO(seg(P, k + 1 - .75, k + 1)) : 0;
      const te = eOut(seg(P, k - .45, k + .05)), hold = seg(P, k, k + 1);
      sc.style.transform = `translate3d(0,${((1 - t) * 100 - nt * 16).toFixed(2)}%,0)`;
      sc.style.visibility = t <= .001 && k > 0 ? 'hidden' : 'visible';
      const ic = $('.sc__ic', sc), w1 = $('.sc__w1', sc), w2 = $('.sc__w2', sc), meta = $('.sc__meta', sc), cta = $('.sc__cta', sc);
      ic.style.transform = `translate3d(0,${(-hold * 24).toFixed(1)}px,0) scale(${(1 + hold * .06).toFixed(4)})`;
      w1.style.opacity = te.toFixed(3); w1.style.transform = `translate3d(${(-60 * (1 - te)).toFixed(1)}px,0,0)`;
      w2.style.opacity = te.toFixed(3); w2.style.transform = `translate3d(${(60 * (1 - te)).toFixed(1)}px,0,0)`;
      meta.style.opacity = te.toFixed(3); meta.style.transform = `translate3d(0,${(14 * (1 - te)).toFixed(1)}px,0)`;
      cta.style.opacity = te.toFixed(3); cta.style.transform = `translate3d(0,${(24 * (1 - te)).toFixed(1)}px,0)`;
    });
    if (bar) bar.style.transform = `scaleX(${clamp(P / (N - .45)).toFixed(4)})`;
    const a = clamp(Math.round(P), 0, N - 1);
    if (!reduce) pens.forEach(o => {
      const on = o.k === 0 ? (reel.getBoundingClientRect().top < innerHeight * .35 && a === 0) : (P > o.k - .12 && P < o.k + .6);
      if (on && o.start < 0) { o.start = performance.now(); requestAnimationFrame(n => penTick(o, n)); }
      else if (!on && o.start >= 0 && (o.k === 0 ? a !== 0 : (P < o.k - .45 || P > o.k + 1))) { o.start = -1; o.last = -1; penPaint(o, 0); }
    });
    if (legos.length && !reduce) {
      if (P > N - 1 - .12 && lStart < 0) { lStart = performance.now(); requestAnimationFrame(legoTick); }
      else if (P < N - 1 - .45 && lStart >= 0) { lStart = -1; legoPaint(0); }
    }
    if (gw && !reduce) {
      if (P > .88 && P < 1.6 && gStart < 0) { gStart = performance.now(); requestAnimationFrame(gsTick); }
      else if ((P < .55 || P > 2) && gStart >= 0) { gStart = -1; gsPaint(0); }
    }
    if (a !== activeSc) { activeSc = a; scs.forEach((sc, k) => sc.toggleAttribute('inert', k !== a)); }
  }

  function frame() {
    ticking = false;
    if (hero) {
      const r = hero.getBoundingClientRect(), span = hero.offsetHeight - innerHeight;
      if (r.bottom > -50 && r.top < innerHeight + 50) hlayout(clamp(-r.top / span));
    }
    if (reel) {
      const r = reel.getBoundingClientRect(), span = reel.offsetHeight - innerHeight;
      if (r.bottom > -50 && r.top < innerHeight + 50) rlayout(clamp(-r.top / span) * (N - .45));
    }
  }
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', () => { measure(); onScroll(); });
  measure(); onScroll(); if (H) hlayout(0); if (N) rlayout(0);
  addEventListener('load', () => { measure(); onScroll(); });

  /* ---------- reveal, lazy fade, counters ---------- */
  function countTo(el) {
    const end = parseFloat(el.dataset.count), d = (el.dataset.count.split('.')[1] || '').length;
    if (reduce) { el.textContent = el.dataset.count; return; }
    const t0 = performance.now(), D = 1100;
    (function tick(now) {
      const k = clamp((now - t0) / D);
      el.textContent = k >= 1 ? el.dataset.count : (end * eOut(k)).toFixed(d);
      if (k < 1) requestAnimationFrame(tick);
    })(t0);
  }
  const io = new IntersectionObserver(es => es.forEach(en => {
    if (!en.isIntersecting) return;
    const el = en.target; el.classList.add('in'); io.unobserve(el);
    $$('[data-count]', el).forEach(countTo);
    if (el.matches('[data-count]')) countTo(el);
  }), { threshold: .12, rootMargin: '0px 0px -2% 0px' });
  $$('[data-r], .chart, [data-count]').forEach(el => io.observe(el));

  $$('img.lazy').forEach(img => {
    const ok = () => img.classList.add('ok');
    img.complete && img.naturalWidth ? ok() : img.addEventListener('load', ok, { once: true });
    img.addEventListener('error', ok, { once: true });
  });

  /* ---------- case explorer (thesis) ---------- */
  if ($('#xImg')) {
    const CASES = [
      { img: 'sec-N.webp', red: null, hot: '9.7', roof: '2.49', wall: '0.97', win: '5.89', note: 'Semi-refurbished house: uninsulated sandstone walls, single glazing, wood-fueled “Sobia” stove.', label: 'Case N' },
      { img: 'sec-low.webp', red: '47', hot: '11.2', roof: '0.67', wall: '0.76', win: '5.00', note: 'Draft-proofing, hemp-lime plaster, reversible roof insulation, new clear single glazing.', label: 'Low impact' },
      { img: 'sec-mod.webp', red: '60', hot: '10.7', roof: '0.67', wall: '0.44', win: '1.60', note: 'Slim-line insulation, low-e double glazing, LED lighting, new heating system.', label: 'Moderate impact', key: true },
      { img: 'sec-high.webp', red: '64', hot: '5.9', roof: '0.19', wall: '0.19', win: '0.60', note: 'Hypothetical: external insulation, stone cladding, triple glazing, radiant heating.', label: 'High impact' }
    ];
    const btns = $$('[role=tab]'), pill = $('.pill'), segEl = $('.seg');
    const img = $('#xImg'), n1 = $('#xRed'), n2 = $('#xHot'), l1 = $('#xRedL'), tag = $('#xTag'), numsEl = $('#xNums');
    const uR = $('#uRoof'), uW = $('#uWall'), uG = $('#uWin'), note = $('#xNote'), lbl = $('#xCase');
    let cur = -1, tmr;
    function set(i, instant) {
      if (i === cur) return; cur = i; const c = CASES[i];
      btns.forEach((b, j) => { b.setAttribute('aria-selected', j === i); b.tabIndex = j === i ? 0 : -1; });
      pill.style.transform = `translateX(${i * 100}%)`;
      segEl.classList.toggle('is-key', !!c.key); numsEl.classList.toggle('key', !!c.key); tag.classList.toggle('on', !!c.key);
      lbl.textContent = c.label;
      const swapImg = () => { img.src = c.img; img.alt = c.label + ' section with U-values'; };
      clearTimeout(tmr);
      if (instant || reduce) swapImg();
      else { img.classList.add('swap'); tmr = setTimeout(() => { img.onload = () => img.classList.remove('swap'); swapImg(); if (img.complete) img.classList.remove('swap'); }, 170); }
      if (c.red) { n1.className = 'big'; n1.innerHTML = `<span data-c>${c.red}</span><sup>%</sup>`; l1.textContent = 'Primary energy reduction'; }
      else { n1.className = 'big txt'; n1.textContent = 'Base'; l1.textContent = 'Starting point, no retrofit'; }
      n2.innerHTML = `<span data-c>${c.hot}</span><sup>%</sup>`;
      uR.textContent = c.roof; uW.textContent = c.wall; uG.textContent = c.win; note.textContent = c.note;
      if (!instant) $$('[data-c]').forEach(el => { el.dataset.count = el.textContent; countTo(el); });
    }
    btns.forEach((b, i) => b.addEventListener('click', () => set(i)));
    segEl.addEventListener('keydown', e => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const n = clamp(cur + (e.key === 'ArrowRight' ? 1 : -1), 0, 3); set(n); btns[n].focus();
    });
    set(2, true);
  }

  /* ---------- lightbox ---------- */
  const lb = $('.lb'), lbImg = $('.lb img');
  function openLb(src) {
    lbImg.src = src; lb.classList.add('open'); lbOpen = true; document.documentElement.style.overflow = 'hidden';
    const c = () => { lb.scrollLeft = (lb.scrollWidth - lb.clientWidth) / 2; lb.scrollTop = 0; };
    lbImg.complete ? c() : lbImg.addEventListener('load', c, { once: true });
  }
  function closeLb() { if (!lbOpen) return; lb.classList.remove('open'); lbOpen = false; document.documentElement.style.overflow = ''; }
  document.addEventListener('click', e => { const z = e.target.closest('.zoomable'); if (z) openLb(z.currentSrc || z.src); });
  $('.lb button').addEventListener('click', closeLb);
})();
