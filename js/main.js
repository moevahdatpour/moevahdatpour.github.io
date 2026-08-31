/* ==========================================================================
   Behaviour only. Every word on the site lives in index.html — this file
   never creates content, it just makes what's there work.

   1 image fallback · 2 scroll reveal · 3 nav + dock · 4 project filters
   5 modal · 6 hero spiking lattice
   ========================================================================== */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $  = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* --- 1. Image fallback --------------------------------------------------
     A missing file becomes a labelled frame instead of a broken-image glyph.
     Handles images that already failed before this script ran.               */
  function watchImages(root) {
    $$('.js-img img', root).forEach(function (img) {
      var fail = function () {
        var wrap = img.closest('.js-img');
        if (wrap) wrap.classList.add('is-missing');
        img.remove();
      };
      if (img.complete && img.naturalWidth === 0) return fail();
      img.addEventListener('error', fail, { once: true });
    });
  }

  /* --- 2. Scroll reveal ---------------------------------------------------
     Stagger delays are applied here so the markup stays clean.               */
  function initReveal() {
    $$('[data-stagger]').forEach(function (group) {
      $$('.reveal', group).forEach(function (el, i) {
        el.style.setProperty('--reveal-delay', (i % 4) * 70 + 'ms');
      });
    });

    var els = $$('.reveal');
    if (reduced || !('IntersectionObserver' in window)) {
      els.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.06 });
    els.forEach(function (el) { io.observe(el); });
  }

  /* --- 3. Nav + dock ------------------------------------------------------
     Top bar keeps identity and the two primary actions. Section links live
     in a dock that rises from the bottom once the hero is behind you.        */
  function initNav() {
    var nav  = $('#nav');
    var bar  = $('#nav-progress');
    var dock = $('#dock');
    var links = $$('[data-nav]');
    var sections = links.map(function (a) { return document.getElementById(a.dataset.nav); });
    var ticking = false;
    var pinned = false;

    // a keyboard user gets the dock on their first Tab, so it is never an
    // invisible tab stop
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Tab') { pinned = true; dock.classList.add('is-up'); }
    }, { once: true });

    function update() {
      var y = window.scrollY;
      var doc = document.documentElement.scrollHeight - window.innerHeight;
      nav.classList.toggle('is-stuck', y > 12);
      bar.style.transform = 'scaleX(' + (doc > 0 ? Math.min(y / doc, 1) : 0) + ')';
      dock.classList.toggle('is-up', pinned || y > window.innerHeight * 0.35);

      var active = -1;
      for (var i = 0; i < sections.length; i++) {
        if (sections[i] && sections[i].getBoundingClientRect().top <= 160) active = i;
      }
      links.forEach(function (a, i) {
        if (i === active) a.setAttribute('aria-current', 'true');
        else a.removeAttribute('aria-current');
      });
      ticking = false;
    }

    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    window.addEventListener('resize', update, { passive: true });
    update();
  }

  /* --- 4. Project filters -------------------------------------------------
     Counts are derived from the cards, so they never go stale.               */
  var visibleCards = [];

  function initFilters() {
    var buttons = $$('[data-filter]');
    var cards = $$('[data-groups]');
    var empty = $('#proj-empty');
    var live = $('#proj-live');
    if (!buttons.length) return;

    buttons.forEach(function (b) {
      var id = b.dataset.filter;
      var n = id === 'all' ? cards.length : cards.filter(function (c) {
        return c.dataset.groups.split(/\s+/).indexOf(id) > -1;
      }).length;
      var tally = b.querySelector('em');
      if (tally) tally.textContent = n;
      b.addEventListener('click', function () { apply(id); });
    });

    function apply(id) {
      visibleCards = [];
      cards.forEach(function (c) {
        var on = id === 'all' || c.dataset.groups.split(/\s+/).indexOf(id) > -1;
        c.classList.toggle('is-hidden', !on);
        if (on) visibleCards.push(c);
      });
      buttons.forEach(function (b) {
        b.setAttribute('aria-pressed', String(b.dataset.filter === id));
      });
      if (empty) empty.hidden = visibleCards.length > 0;
      if (live) {
        live.textContent = visibleCards.length + ' project' +
          (visibleCards.length === 1 ? '' : 's') + ' shown.';
      }
    }

    apply('all');
  }

  /* --- 5. Modal -----------------------------------------------------------
     Content is cloned out of the <template> whose data-detail matches the
     card's data-modal. Projects also get prev/next.                          */
  var modal, current = null, lastTrigger = null;

  function paint(trigger) {
    var tpl = $('template[data-detail="' + trigger.dataset.modal + '"]');
    if (!tpl) return;
    current = trigger;

    $('#modal-eyebrow').textContent = tpl.dataset.eyebrow || '';
    $('#modal-title').textContent = tpl.dataset.title || '';

    var body = $('#modal-body');
    body.textContent = '';
    body.appendChild(tpl.content.cloneNode(true));

    if (trigger.classList.contains('card')) {
      var at = visibleCards.indexOf(trigger);
      var foot = document.createElement('div');
      foot.className = 'modal__foot';
      foot.innerHTML =
        '<span class="mono" style="color:var(--text-3)">' +
          (at + 1) + ' / ' + visibleCards.length + '</span>' +
        '<div class="modal__step">' +
          '<button type="button" class="stepper" data-step="-1" aria-label="Previous project">' +
            '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>' +
          '</button>' +
          '<button type="button" class="stepper" data-step="1" aria-label="Next project">' +
            '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>' +
          '</button>' +
        '</div>';
      // a paper link, if the template has one, shares the row with the stepper
      // and replaces the position counter
      var papers = body.querySelectorAll('[data-paper]');

      if (papers.length) {
        var paperGroup = document.createElement('div');
        paperGroup.className = 'modal__papers';

        papers.forEach(function (paper) {
          paperGroup.appendChild(paper);
        });

        foot.replaceChild(paperGroup, foot.firstChild);
      }

      body.appendChild(foot);
    }

    watchImages(body);
    $('#modal-scroll').scrollTop = 0;

    $$('[data-step]', body).forEach(function (b) {
      b.addEventListener('click', function () { step(Number(b.dataset.step)); });
    });
  }

  function step(dir) {
    if (!current || !current.classList.contains('card') || !visibleCards.length) return;
    var at = visibleCards.indexOf(current);
    paint(visibleCards[(at + dir + visibleCards.length) % visibleCards.length]);
  }

  function openModal(trigger) {
    lastTrigger = trigger;
    paint(trigger);
    modal.showModal();
    document.body.classList.add('is-locked');
    requestAnimationFrame(function () { modal.classList.add('is-open'); });
  }

  function closeModal() {
    modal.classList.remove('is-open');
    var done = function () {
      modal.close();
      document.body.classList.remove('is-locked');
      if (lastTrigger) lastTrigger.focus();
    };
    reduced ? done() : setTimeout(done, 200);
  }

  function initModal() {
    modal = $('#modal');
    if (!modal || !modal.showModal) return;

    document.addEventListener('click', function (e) {
      var trigger = e.target.closest('[data-modal]');
      if (trigger) openModal(trigger);
    });

    $('#modal-close').addEventListener('click', closeModal);
    modal.addEventListener('click', function (e) { if (e.target === modal) closeModal(); });
    // run the exit animation instead of the instant native dismiss
    modal.addEventListener('cancel', function (e) { e.preventDefault(); closeModal(); });
    modal.addEventListener('keydown', function (e) {
      if (!current || !current.classList.contains('card')) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
      if (e.key === 'ArrowLeft')  { e.preventDefault(); step(-1); }
    });
  }

  /* --- 6. Hero spiking lattice --------------------------------------------
     Every spike originates at the cursor. Nodes fire at a latency
     proportional to their distance from it, so the wavefront radiates out of
     the pointer — the same latency code as the SNN motion work. Moving fires
     immediately; holding still keeps pulsing from that spot.                 */
  function initField() {
    var canvas = $('#field');
    if (!canvas || !canvas.getContext) return;
    var ctx = canvas.getContext('2d');
    var host = canvas.parentElement;

    var nodes = [], spikes = [], w = 0, h = 0, raf = 0, running = false, lastEmit = 0;
    var srcX = 0, srcY = 0;   // the emission point — always the cursor
    var SPEED = 0.55;         // px per ms — wavefront velocity
    var DECAY = 700;          // ms a node stays lit after firing
    var GAP = 34;
    var REACH = 900;          // how far a spike carries; set from the canvas

    function build() {
      var r = host.getBoundingClientRect();
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = r.width; h = r.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      GAP = w < 700 ? 42 : 34;
      REACH = Math.max(420, Math.hypot(w, h) * 0.8);
      nodes = [];
      var cols = Math.ceil(w / GAP) + 1;
      var rows = Math.ceil(h / GAP) + 1;
      for (var y = 0; y < rows; y++) {
        for (var x = 0; x < cols; x++) {
          // deterministic jitter keeps it from reading as graph paper
          var j = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
          var k = Math.sin(y * 39.3468 + x * 11.135) * 24634.6345;
          nodes.push({
            x: x * GAP + (j - Math.floor(j) - 0.5) * GAP * 0.5,
            y: y * GAP + (k - Math.floor(k) - 0.5) * GAP * 0.5
          });
        }
      }
    }

    function emit(x, y, strength) {
      if (spikes.length > 3) spikes.shift();   // at most four waves at once
      spikes.push({ x: x, y: y, t: performance.now(), s: strength || 1 });
    }

    function draw(now) {
      ctx.clearRect(0, 0, w, h);

      ctx.beginPath();
      for (var i = 0; i < nodes.length; i++) {
        ctx.moveTo(nodes[i].x + 1, nodes[i].y);
        ctx.arc(nodes[i].x, nodes[i].y, 1, 0, 6.2832);
      }
      ctx.fillStyle = 'rgba(233, 230, 244, 0.06)';
      ctx.fill();

      for (var n = 0; n < nodes.length; n++) {
        var node = nodes[n], best = 0;
        for (var s = 0; s < spikes.length; s++) {
          var sp = spikes[s];
          var dx = node.x - sp.x, dy = node.y - sp.y;
          var d = Math.sqrt(dx * dx + dy * dy);
          var age = (now - sp.t) - d / SPEED;      // latency ∝ distance
          if (age < 0 || age > DECAY) continue;
          var lit = Math.exp(-age / (DECAY * 0.38)) * sp.s * Math.max(0, 1 - d / REACH);
          if (lit > best) best = lit;
        }
        if (best <= 0.04) continue;            // trim the faintest of the tail
        ctx.beginPath();
        ctx.arc(node.x, node.y, 1 + best * 1.6, 0, 6.2832);
        ctx.fillStyle = 'rgba(140, 123, 255, ' + Math.min(best * 0.68, 0.58).toFixed(3) + ')';
        ctx.fill();
      }
    }

    function frame(now) {
      if (!running) return;
      if (now - lastEmit > 3000) {          // idle pulse, from wherever the cursor is
        lastEmit = now;
        emit(srcX, srcY, 0.65);
      }
      spikes = spikes.filter(function (sp) { return now - sp.t < REACH / SPEED + DECAY; });
      draw(now);
      raf = requestAnimationFrame(frame);
    }

    function start() { if (running) return; running = true; raf = requestAnimationFrame(frame); }
    function stop() { running = false; cancelAnimationFrame(raf); }

    // Run only when the tab is visible AND the hero is on screen. Tracked
    // separately so one gate cannot re-start what the other paused.
    var pageVisible = !document.hidden, heroOnScreen = true;
    function sync() { (pageVisible && heroOnScreen) ? start() : stop(); }

    build();
    srcX = w * 0.68;
    srcY = h * 0.42;
    draw(performance.now());   // paint the resting lattice before the first frame

    if (reduced) return;

    // Track the cursor anywhere on the page. Coordinates outside the hero are
    // kept (loosely clamped) so the wavefront still arrives from the right
    // direction when the pointer sits off to one side.
    // The source follows the pointer continuously, but a wave is only released
    // occasionally — after a real distance travelled and a decent gap — so
    // moving the mouse leaves an occasional ripple rather than a constant trail.
    var lastPointer = 0, emitX = 0, emitY = 0;
    window.addEventListener('pointermove', function (e) {
      var r = host.getBoundingClientRect();
      srcX = Math.max(-0.35 * w, Math.min(1.35 * w, e.clientX - r.left));
      srcY = Math.max(-0.35 * h, Math.min(1.35 * h, e.clientY - r.top));

      var now = performance.now();
      if (now - lastPointer < 450) return;
      if (Math.hypot(srcX - emitX, srcY - emitY) < 55) return;

      lastPointer = now;
      lastEmit = now;
      emitX = srcX;
      emitY = srcY;
      emit(srcX, srcY, 0.62);
    }, { passive: true });

    var rz;
    window.addEventListener('resize', function () {
      clearTimeout(rz);
      rz = setTimeout(function () {
        build();
        srcX = Math.max(0, Math.min(w, srcX));
        srcY = Math.max(0, Math.min(h, srcY));
      }, 180);
    }, { passive: true });

    document.addEventListener('visibilitychange', function () {
      pageVisible = !document.hidden;
      sync();
    });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) {
        heroOnScreen = en[0].isIntersecting;
        sync();
      }, { threshold: 0 }).observe(host);
    }

    emit(srcX, srcY, 0.7);
    sync();
  }

  function initAboutToggle() {
    var openBtn = $('.js-toggle-story');
    var closeBtn = $('.js-close-story');
    var target = $('#about-story');
    if (!openBtn || !target) return;

    openBtn.addEventListener('click', function () {
      target.hidden = false;
      requestAnimationFrame(function () {
        target.classList.add('is-expanded');
        openBtn.classList.add('is-hidden');
        openBtn.setAttribute('aria-expanded', 'true');
      });
    });

    if (closeBtn) {
      closeBtn.addEventListener('click', function () {
        openBtn.setAttribute('aria-expanded', 'false');
        openBtn.classList.remove('is-hidden');
        target.classList.remove('is-expanded');

        setTimeout(function () {
          if (openBtn.getAttribute('aria-expanded') === 'false') {
            target.hidden = true;
          }
        }, 300);

        var aboutSection = $('#about');
        if (aboutSection) {
          aboutSection.scrollIntoView({ behavior: 'smooth' });
        }
      });
    }
  }

  /* --- boot ---------------------------------------------------------------- */
  function boot() {
    var year = $('#year');
    if (year) year.textContent = new Date().getFullYear();

    var meta = $('#pub-meta');
    if (meta) meta.textContent = $$('.pubs .pub').length + ' papers';

    watchImages(document);
    initNav();
    initFilters();
    initModal();
    initAboutToggle();
    initReveal();
    initField();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();