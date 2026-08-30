/* =====================================================================
   GetApps — interaction layer
   Vanilla, dependency-free, motion-safe.
   ===================================================================== */
(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ---------------- Theme ---------------- */
  function initTheme() {
    var btn = $(".theme-btn");
    if (!btn) return;
    btn.addEventListener("click", function () {
      var next = document.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light";
      document.documentElement.setAttribute("data-theme", next);
      try { localStorage.setItem("ga-theme", next); } catch (e) {}
      btn.setAttribute("aria-label", next === "light" ? "Switch to dark theme" : "Switch to light theme");
    });
  }

  /* ---------------- Preloader ---------------- */
  function initPreload() {
    var el = $(".preload");
    if (!el) return;
    var bar = $(".preload__bar i", el);
    var num = $(".preload__num", el);
    var pct = 0;
    var done = false;

    function finish() {
      if (done) return;
      done = true;
      pct = 100;
      if (bar) bar.style.width = "100%";
      if (num) num.textContent = "100";
      setTimeout(function () {
        el.classList.add("done");
        document.body.classList.remove("is-locked");
        document.dispatchEvent(new CustomEvent("ga:ready"));
      }, 260);
    }

    if (reduced) { finish(); return; }

    document.body.classList.add("is-locked");
    var tick = setInterval(function () {
      pct += Math.random() * 16 + 6;
      if (pct >= 96) pct = 96;
      if (bar) bar.style.width = pct + "%";
      if (num) num.textContent = String(Math.floor(pct)).padStart(3, "0");
    }, 130);

    window.addEventListener("load", function () {
      clearInterval(tick);
      setTimeout(finish, 220);
    });
    setTimeout(function () { clearInterval(tick); finish(); }, 3200);
  }

  /* ---------------- Custom cursor ---------------- */
  function initCursor() {
    if (!finePointer || reduced) return;
    var dot = document.createElement("div");
    var ring = document.createElement("div");
    dot.className = "cursor";
    ring.className = "cursor-ring";
    document.body.appendChild(dot);
    document.body.appendChild(ring);

    var mx = window.innerWidth / 2, my = window.innerHeight / 2;
    var rx = mx, ry = my;

    window.addEventListener("mousemove", function (e) {
      mx = e.clientX; my = e.clientY;
      dot.style.transform = "translate3d(" + mx + "px," + my + "px,0)";
      document.body.classList.add("cursor-on");
    }, { passive: true });

    document.addEventListener("mouseleave", function () { document.body.classList.remove("cursor-on"); });

    (function loop() {
      rx += (mx - rx) * 0.16;
      ry += (my - ry) * 0.16;
      ring.style.transform = "translate3d(" + rx + "px," + ry + "px,0)";
      requestAnimationFrame(loop);
    })();

    var hot = "a, button, input, [data-magnetic], .card, .pcard, .acc__btn, .pill, .dots button";
    document.addEventListener("mouseover", function (e) {
      if (e.target.closest && e.target.closest(hot)) document.body.classList.add("cursor-hot");
    });
    document.addEventListener("mouseout", function (e) {
      if (e.target.closest && e.target.closest(hot)) document.body.classList.remove("cursor-hot");
    });
  }

  /* ---------------- Magnetic elements ---------------- */
  function initMagnetic() {
    if (!finePointer || reduced) return;
    $$("[data-magnetic]").forEach(function (el) {
      var str = parseFloat(el.getAttribute("data-magnetic")) || 0.28;
      el.addEventListener("mousemove", function (e) {
        var r = el.getBoundingClientRect();
        var x = (e.clientX - r.left - r.width / 2) * str;
        var y = (e.clientY - r.top - r.height / 2) * str;
        el.style.transform = "translate3d(" + x + "px," + y + "px,0)";
      });
      el.addEventListener("mouseleave", function () { el.style.transform = ""; });
    });
  }

  /* ---------------- Navigation ---------------- */
  function initNav() {
    var nav = $(".nav");
    var burger = $(".burger");
    var drawer = $(".drawer");

    if (nav) {
      var onScroll = function () { nav.classList.toggle("stuck", window.scrollY > 24); };
      onScroll();
      window.addEventListener("scroll", onScroll, { passive: true });
    }

    if (burger && drawer) {
      var toggle = function (force) {
        var open = force !== undefined ? force : !drawer.classList.contains("open");
        drawer.classList.toggle("open", open);
        burger.classList.toggle("on", open);
        burger.setAttribute("aria-expanded", String(open));
        document.body.classList.toggle("is-locked", open);
      };
      burger.addEventListener("click", function () { toggle(); });
      $$("a", drawer).forEach(function (a) {
        a.addEventListener("click", function () { toggle(false); });
      });
      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && drawer.classList.contains("open")) toggle(false);
      });
    }
  }

  /* ---------------- Scroll progress ---------------- */
  function initProgress() {
    var bar = $(".progress");
    if (!bar) return;
    var run = function () {
      var h = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.transform = "scaleX(" + (h > 0 ? window.scrollY / h : 0) + ")";
    };
    run();
    window.addEventListener("scroll", run, { passive: true });
    window.addEventListener("resize", run);
  }

  /* ---------------- Split text ---------------- */
  function splitNode(node, bucket) {
    Array.prototype.slice.call(node.childNodes).forEach(function (child) {
      if (child.nodeType === 3) {
        var parts = child.textContent.split(/(\s+)/);
        var frag = document.createDocumentFragment();
        parts.forEach(function (p) {
          if (!p) return;
          if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(" ")); return; }
          var mask = document.createElement("span");
          mask.className = "wdm";
          var word = document.createElement("span");
          word.className = "wd";
          word.textContent = p;
          mask.appendChild(word);
          frag.appendChild(mask);
          bucket.push(word);
        });
        node.replaceChild(frag, child);
      } else if (child.nodeType === 1) {
        splitNode(child, bucket);
      }
    });
  }

  function initSplit() {
    $$("[data-split]").forEach(function (el) {
      if (reduced) { el.classList.add("split", "in"); return; }
      var bucket = [];
      splitNode(el, bucket);
      bucket.forEach(function (w, i) { w.style.setProperty("--i", i); });
      el.classList.add("split");
    });
  }

  /* ---------------- Reveal on scroll ---------------- */
  function initReveal() {
    var targets = $$(".rv, .rv-l, .rv-s, .split, .tl-item");
    if (!("IntersectionObserver" in window) || reduced) {
      targets.forEach(function (t) { t.classList.add("in"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add("in");
        io.unobserve(en.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });

    targets.forEach(function (t) { io.observe(t); });

    /* auto-stagger direct children of [data-stagger] */
    $$("[data-stagger]").forEach(function (group) {
      var step = parseInt(group.getAttribute("data-stagger"), 10) || 70;
      $$(":scope > *", group).forEach(function (child, i) {
        child.style.setProperty("--d", i * step + "ms");
      });
    });
  }

  /* ---------------- Counters ---------------- */
  function initCounters() {
    var nodes = $$("[data-count]");
    if (!nodes.length) return;
    if (reduced || !("IntersectionObserver" in window)) {
      nodes.forEach(function (n) { n.textContent = fmt(n, parseFloat(n.getAttribute("data-count"))); });
      return;
    }
    function fmtLocal(n, v) { return fmt(n, v); }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target;
        io.unobserve(el);
        var end = parseFloat(el.getAttribute("data-count"));
        var dur = parseInt(el.getAttribute("data-dur"), 10) || 1500;
        var t0 = performance.now();
        (function step(now) {
          var p = Math.min((now - t0) / dur, 1);
          var e = 1 - Math.pow(1 - p, 3);
          el.textContent = fmtLocal(el, end * e);
          if (p < 1) requestAnimationFrame(step);
        })(t0);
      });
    }, { threshold: 0.5 });
    nodes.forEach(function (n) { io.observe(n); });
  }

  function fmt(el, v) {
    var dec = parseInt(el.getAttribute("data-dec"), 10) || 0;
    var pre = el.getAttribute("data-pre") || "";
    var suf = el.getAttribute("data-suf") || "";
    var num = dec ? v.toFixed(dec) : Math.round(v).toLocaleString("en-US");
    return pre + num + suf;
  }

  /* ---------------- Card spotlight + tilt ---------------- */
  function initCards() {
    if (!finePointer) return;
    $$(".card, .pcard").forEach(function (card) {
      var tilt = card.hasAttribute("data-tilt") && !reduced;
      card.addEventListener("mousemove", function (e) {
        var r = card.getBoundingClientRect();
        var x = e.clientX - r.left, y = e.clientY - r.top;
        card.style.setProperty("--mx", x + "px");
        card.style.setProperty("--my", y + "px");
        if (tilt) {
          var rx = ((y / r.height) - 0.5) * -6;
          var ry = ((x / r.width) - 0.5) * 6;
          card.style.transform = "perspective(900px) rotateX(" + rx + "deg) rotateY(" + ry + "deg) translateY(-5px)";
        }
      });
      card.addEventListener("mouseleave", function () {
        if (tilt) card.style.transform = "";
      });
    });
  }

  /* ---------------- Parallax ---------------- */
  function initParallax() {
    if (reduced) return;
    var items = $$("[data-para]");
    if (!items.length) return;
    var ticking = false;
    function run() {
      var vh = window.innerHeight;
      items.forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) return;
        var speed = parseFloat(el.getAttribute("data-para")) || 0.08;
        var offset = (r.top + r.height / 2 - vh / 2) * speed;
        el.style.transform = "translate3d(0," + (-offset).toFixed(2) + "px,0)";
      });
      ticking = false;
    }
    window.addEventListener("scroll", function () {
      if (!ticking) { ticking = true; requestAnimationFrame(run); }
    }, { passive: true });
    run();
  }

  /* ---------------- Hero particle field ---------------- */
  function initField() {
    var cv = document.getElementById("field");
    if (!cv) return;
    var ctx = cv.getContext("2d");
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = 0, h = 0, pts = [], raf = null, visible = true;
    var mouse = { x: -9999, y: -9999 };

    function accent() {
      var s = getComputedStyle(document.documentElement);
      return {
        node: s.getPropertyValue("--brand-2").trim() || "#22D3EE",
        link: s.getPropertyValue("--brand").trim() || "#6D5EF8"
      };
    }
    var col = accent();

    function size() {
      var r = cv.getBoundingClientRect();
      w = r.width; h = r.height;
      cv.width = Math.floor(w * dpr);
      cv.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
    }

    function seed() {
      var count = Math.max(26, Math.min(72, Math.round((w * h) / 22000)));
      pts = [];
      for (var i = 0; i < count; i++) {
        pts.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.22,
          vy: (Math.random() - 0.5) * 0.22,
          r: Math.random() * 1.7 + 0.7
        });
      }
    }

    function frame() {
      ctx.clearRect(0, 0, w, h);
      var i, j, a, b, dx, dy, d;

      for (i = 0; i < pts.length; i++) {
        a = pts[i];
        a.x += a.vx; a.y += a.vy;
        if (a.x < -20) a.x = w + 20; else if (a.x > w + 20) a.x = -20;
        if (a.y < -20) a.y = h + 20; else if (a.y > h + 20) a.y = -20;

        dx = a.x - mouse.x; dy = a.y - mouse.y;
        d = Math.sqrt(dx * dx + dy * dy);
        if (d < 130 && d > 0.1) {
          a.x += (dx / d) * (130 - d) * 0.014;
          a.y += (dy / d) * (130 - d) * 0.014;
        }
      }

      ctx.lineWidth = 1;
      for (i = 0; i < pts.length; i++) {
        a = pts[i];
        for (j = i + 1; j < pts.length; j++) {
          b = pts[j];
          dx = a.x - b.x; dy = a.y - b.y;
          d = Math.sqrt(dx * dx + dy * dy);
          if (d < 138) {
            ctx.globalAlpha = (1 - d / 138) * 0.24;
            ctx.strokeStyle = col.link;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      for (i = 0; i < pts.length; i++) {
        a = pts[i];
        ctx.globalAlpha = 0.62;
        ctx.fillStyle = col.node;
        ctx.beginPath();
        ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(frame);
    }

    size();
    window.addEventListener("resize", debounce(function () { col = accent(); size(); }, 180));
    window.addEventListener("mousemove", function (e) {
      var r = cv.getBoundingClientRect();
      mouse.x = e.clientX - r.left;
      mouse.y = e.clientY - r.top;
    }, { passive: true });

    if (reduced) { frame(); cancelAnimationFrame(raf); return; }

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (en) {
        visible = en[0].isIntersecting;
        if (visible && !raf) raf = requestAnimationFrame(frame);
        else if (!visible && raf) { cancelAnimationFrame(raf); raf = null; }
      }, { threshold: 0 }).observe(cv);
    }
    document.addEventListener("visibilitychange", function () {
      if (document.hidden && raf) { cancelAnimationFrame(raf); raf = null; }
      else if (!document.hidden && visible && !raf) raf = requestAnimationFrame(frame);
    });
    raf = requestAnimationFrame(frame);

    var themeObserver = new MutationObserver(function () { col = accent(); });
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  }

  /* ---------------- Testimonials ---------------- */
  function initQuotes() {
    var wrap = $(".quotes");
    if (!wrap) return;
    var slides = $$(".quote", wrap);
    var dots = $$(".dots button");
    if (slides.length < 2) return;
    var idx = 0, timer = null;

    function go(n) {
      idx = (n + slides.length) % slides.length;
      slides.forEach(function (s, i) { s.classList.toggle("on", i === idx); });
      dots.forEach(function (d, i) { d.setAttribute("aria-selected", String(i === idx)); });
    }
    function play() { if (!reduced) timer = setInterval(function () { go(idx + 1); }, 6000); }
    function stop() { clearInterval(timer); }

    dots.forEach(function (d, i) {
      d.addEventListener("click", function () { stop(); go(i); play(); });
    });
    wrap.addEventListener("mouseenter", stop);
    wrap.addEventListener("mouseleave", play);
    go(0); play();
  }

  /* ---------------- Accordion ---------------- */
  function initAccordion() {
    $$(".acc__item").forEach(function (item) {
      var btn = $(".acc__btn", item);
      var panel = $(".acc__panel", item);
      if (!btn || !panel) return;
      btn.addEventListener("click", function () {
        var open = item.classList.contains("open");
        var siblings = $$(".acc__item", item.parentElement);
        siblings.forEach(function (s) {
          if (s === item) return;
          s.classList.remove("open");
          var p = $(".acc__panel", s);
          var b = $(".acc__btn", s);
          if (p) p.style.height = "0px";
          if (b) b.setAttribute("aria-expanded", "false");
        });
        item.classList.toggle("open", !open);
        btn.setAttribute("aria-expanded", String(!open));
        panel.style.height = open ? "0px" : panel.scrollHeight + "px";
      });
    });
    window.addEventListener("resize", debounce(function () {
      $$(".acc__item.open .acc__panel").forEach(function (p) { p.style.height = p.scrollHeight + "px"; });
    }, 180));
  }

  /* ---------------- Product filter + search ---------------- */
  function initFilter() {
    var grid = $("[data-grid]");
    if (!grid) return;
    var cards = $$(".pcard", grid);
    var pills = $$(".pill");
    var input = $("#psearch");
    var out = $("[data-count-out]");
    var empty = $(".empty");
    var active = "all";

    function apply() {
      var q = (input && input.value || "").trim().toLowerCase();
      var shown = 0;
      cards.forEach(function (c) {
        var cat = c.getAttribute("data-cat") || "";
        var hay = (c.getAttribute("data-keywords") || "") + " " + c.textContent.toLowerCase();
        var ok = (active === "all" || cat === active) && (!q || hay.toLowerCase().indexOf(q) > -1);
        c.classList.toggle("hide", !ok);
        if (ok) {
          shown++;
          c.classList.remove("pop");
          void c.offsetWidth;
          if (!reduced) {
            c.style.animationDelay = (shown * 32) + "ms";
            c.classList.add("pop");
          }
        }
      });
      if (out) out.textContent = shown;
      if (empty) empty.classList.toggle("show", shown === 0);
    }

    pills.forEach(function (p) {
      p.addEventListener("click", function () {
        pills.forEach(function (x) { x.classList.remove("on"); x.setAttribute("aria-pressed", "false"); });
        p.classList.add("on");
        p.setAttribute("aria-pressed", "true");
        active = p.getAttribute("data-filter");
        apply();
      });
    });
    if (input) input.addEventListener("input", debounce(apply, 120));

    var hash = decodeURIComponent(location.hash.replace("#", ""));
    if (hash) {
      var match = pills.filter(function (p) { return p.getAttribute("data-filter") === hash; })[0];
      if (match) match.click();
    }
    apply();
  }

  /* ---------------- Timeline progress ---------------- */
  function initTimeline() {
    var tl = $(".timeline");
    if (!tl) return;
    var fill = $(".timeline__fill", tl);
    if (!fill) return;
    function run() {
      var r = tl.getBoundingClientRect();
      var vh = window.innerHeight;
      var p = (vh * 0.62 - r.top) / r.height;
      fill.style.height = Math.max(0, Math.min(1, p)) * 100 + "%";
    }
    run();
    window.addEventListener("scroll", run, { passive: true });
    window.addEventListener("resize", run);
  }

  /* ---------------- Page transition ---------------- */
  function initSwipe() {
    if (reduced) return;
    var veil = document.createElement("div");
    veil.className = "swipe";
    document.body.appendChild(veil);

    document.addEventListener("click", function (e) {
      var a = e.target.closest && e.target.closest("a");
      if (!a) return;
      var href = a.getAttribute("href");
      if (!href || href.charAt(0) === "#" || a.target === "_blank" || a.hasAttribute("download")) return;
      if (a.origin && a.origin !== location.origin) return;
      if (a.pathname === location.pathname) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      e.preventDefault();
      veil.classList.add("in");
      setTimeout(function () { window.location.href = a.href; }, 470);
    });

    window.addEventListener("pageshow", function (ev) {
      if (ev.persisted) veil.classList.remove("in");
    });
  }


  /* ---------------- Contact form (demo handler) ---------------- */
  function initForm() {
    $$("[data-form]").forEach(function (form) {
      var note = $(".form-note", form);
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var missing = $$("[required]", form).filter(function (f) { return !f.value.trim(); });
        var email = $("input[type=email]", form);
        var badMail = email && email.value && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.value);
        if (!note) return;
        note.classList.remove("bad");
        if (missing.length || badMail) {
          note.textContent = badMail && !missing.length
            ? "That email address doesn't look right — mind checking it?"
            : "Please fill in the required fields before sending.";
          note.classList.add("show", "bad");
          (missing[0] || email).focus();
          return;
        }
        /* Wire this up to your own endpoint (fetch POST) to make it live. */
        note.textContent = "Thanks — this is a demo form, so nothing was sent. Connect it to your endpoint in assets/js/main.js.";
        note.classList.add("show");
      });
    });
  }

  /* ---------------- Year stamp ---------------- */
  function initYear() {
    $$("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });
  }

  /* ---------------- utils ---------------- */
  function debounce(fn, ms) {
    var t;
    return function () {
      var args = arguments, self = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(self, args); }, ms);
    };
  }

  /* ---------------- boot ---------------- */
  function boot() {
    initTheme();
    initPreload();
    initCursor();
    initMagnetic();
    initNav();
    initProgress();
    initSplit();
    initReveal();
    initCounters();
    initCards();
    initParallax();
    initField();
    initQuotes();
    initAccordion();
    initFilter();
    initTimeline();
    initSwipe();
    initForm();
    initYear();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
