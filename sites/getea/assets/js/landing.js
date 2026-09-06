/* ============================================================
   GetEA — landing page motion.
   The chart draws itself, the rules assemble under it, and the
   code panel shows the real output of the real generator, so the
   thing on the home page is the thing you actually get.
   ============================================================ */
(function () {
  "use strict";
  var EA = window.EA;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------- 1. the hero chart ---------------- */
  function chart() {
    var cv = $("#heroChart");
    if (!cv) return;
    var g = cv.getContext("2d");
    var N = 74, bars = [], seed = 20250904;
    function rnd() { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; }
    var px = 100, trend = 0.16;
    for (var i = 0; i < N; i++) {
      if (i % 17 === 0) trend = (rnd() - 0.42) * 0.9;
      var o = px;
      px += trend + (rnd() - 0.5) * 1.5;
      var c = px;
      bars.push({ o: o, c: c, h: Math.max(o, c) + rnd() * 0.7, l: Math.min(o, c) - rnd() * 0.7 });
    }
    var ema = [], k = 2 / 13;
    bars.forEach(function (b, i) { ema.push(i ? b.c * k + ema[i - 1] * (1 - k) : b.c); });
    var sma = [], win = 26;
    bars.forEach(function (b, i) {
      var s = 0, n = 0;
      for (var j = Math.max(0, i - win + 1); j <= i; j++) { s += bars[j].c; n++; }
      sma.push(s / n);
    });
    var signals = [];
    for (var q = 1; q < N; q++) {
      if (ema[q] > sma[q] && ema[q - 1] <= sma[q - 1]) signals.push({ i: q, buy: true });
      if (ema[q] < sma[q] && ema[q - 1] >= sma[q - 1]) signals.push({ i: q, buy: false });
    }

    var lo = Infinity, hi = -Infinity;
    bars.forEach(function (b) { lo = Math.min(lo, b.l); hi = Math.max(hi, b.h); });
    var pad = (hi - lo) * 0.1; lo -= pad; hi += pad;

    var shown = reduced ? N : 0, w = 0, h = 0;
    function size() {
      var dpr = window.devicePixelRatio || 1;
      w = cv.clientWidth; h = cv.clientHeight;
      cv.width = w * dpr; cv.height = h * dpr;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function X(i) { return 14 + i / (N - 1) * (w - 28); }
    function Y(v) { return h - 16 - (v - lo) / (hi - lo) * (h - 32); }

    function frame() {
      var css = getComputedStyle(document.documentElement);
      var ok = css.getPropertyValue("--ok").trim() || "#3DDC97";
      var bad = css.getPropertyValue("--bad").trim() || "#FF6B6B";
      var acc = css.getPropertyValue("--accent").trim() || "#F5B944";
      var acc2 = css.getPropertyValue("--accent-2").trim() || "#22D3EE";
      var line = css.getPropertyValue("--line").trim() || "rgba(255,255,255,.09)";
      g.clearRect(0, 0, w, h);

      g.strokeStyle = line; g.lineWidth = 1;
      for (var r = 0; r <= 4; r++) {
        var y = 16 + r * (h - 32) / 4;
        g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke();
      }

      var bw = Math.max(2.5, (w - 28) / N * 0.6);
      for (var i = 0; i < Math.min(shown, N); i++) {
        var b = bars[i], up = b.c >= b.o;
        g.strokeStyle = up ? ok : bad;
        g.fillStyle = up ? ok : bad;
        g.lineWidth = 1;
        g.beginPath(); g.moveTo(X(i), Y(b.h)); g.lineTo(X(i), Y(b.l)); g.stroke();
        var top = Y(Math.max(b.o, b.c)), bot = Y(Math.min(b.o, b.c));
        g.globalAlpha = up ? 0.9 : 0.85;
        g.fillRect(X(i) - bw / 2, top, bw, Math.max(1.2, bot - top));
        g.globalAlpha = 1;
      }
      function poly(series, colour, width) {
        g.beginPath();
        for (var i2 = 0; i2 < Math.min(shown, N); i2++) {
          if (i2 === 0) g.moveTo(X(i2), Y(series[i2])); else g.lineTo(X(i2), Y(series[i2]));
        }
        g.strokeStyle = colour; g.lineWidth = width; g.lineJoin = "round"; g.stroke();
      }
      poly(sma, acc2 + "aa", 1.4);
      poly(ema, acc, 1.9);

      /* signal pins */
      var host = $("#heroPins");
      if (host) {
        signals.forEach(function (s, idx) {
          var el = host.children[idx];
          if (!el) return;
          if (s.i <= shown) {
            el.style.left = X(s.i) + "px";
            el.style.top = (Y(s.buy ? bars[s.i].l : bars[s.i].h) + (s.buy ? 22 : -22)) + "px";
            el.classList.add("on");
          } else el.classList.remove("on");
        });
      }
    }

    function buildPins() {
      var host = $("#heroPins");
      if (!host) return;
      host.innerHTML = signals.map(function (s) {
        return '<span class="signal signal--' + (s.buy ? "buy" : "sell") + '">' + (s.buy ? "▲ BUY" : "▼ SELL") + "</span>";
      }).join("");
    }

    size(); buildPins();
    window.addEventListener("resize", function () { size(); frame(); }, { passive: true });

    if (reduced) { frame(); return; }
    var t0 = null;
    function tick(ts) {
      if (!t0) t0 = ts;
      shown = Math.min(N, (ts - t0) / 26);
      frame();
      if (shown < N) requestAnimationFrame(tick);
      else setTimeout(function () { t0 = null; shown = 0; requestAnimationFrame(tick); }, 4200);
    }
    var io = new IntersectionObserver(function (en) {
      if (en[0].isIntersecting) { requestAnimationFrame(tick); io.disconnect(); }
    }, { threshold: 0.2 });
    io.observe(cv);
  }

  /* ---------------- 2. rule chips ---------------- */
  function rules() {
    var host = $("#heroRules");
    if (!host) return;
    var items = $$(".rulechip", host);
    if (reduced) { items.forEach(function (i) { i.classList.add("on"); }); return; }
    var io = new IntersectionObserver(function (en) {
      if (!en[0].isIntersecting) return;
      items.forEach(function (el, i) { setTimeout(function () { el.classList.add("on"); }, 260 + i * 220); });
      io.disconnect();
    }, { threshold: 0.3 });
    io.observe(host);
  }

  /* ---------------- 3. real generated code ---------------- */
  var DEMO = null;
  function demoStrategy() {
    if (DEMO) return DEMO;
    var B = EA.BUILDER;
    var s = B.blank();
    s.name = "Trend Rider";
    B.PRESETS.filter(function (p) { return p.k === "supertrend"; })[0].apply(s);
    s.exit.trail = { mode: "atr", atrPeriod: 14, atrMult: 2.5, start: 15, step: 5, dist: 20 };
    s.exit.be = { on: true, trigger: 18, offset: 2 };
    s.risk.lotMode = "percent"; s.risk.riskPct = 0.75;
    s.filters.hoursOn = true; s.filters.hourFrom = 7; s.filters.hourTo = 21;
    DEMO = s;
    return s;
  }

  var typingTimer = null;
  function showCode(platform, animate) {
    var host = $("#demoCode");
    if (!host || !EA.CG) return;
    var st = demoStrategy();
    st.platform = platform;
    var built;
    try { built = EA.CG.build(st, platform); } catch (e) { host.textContent = "// " + e.message; return; }
    var label = { mt5: "MQL5", mt4: "MQL4", ct: "C# — cAlgo" }[platform];
    $("#demoFile").textContent = built.file;
    $("#demoLang").textContent = built.code.split("\n").length.toLocaleString() + " lines · " + label;

    /* show the interesting middle, not 600 lines of helpers */
    var lines = built.code.split("\n");
    var start = 0;
    for (var i = 0; i < lines.length; i++) {
      if (/Entry and exit rules|---------------- rules ----------------/.test(lines[i])) { start = Math.max(0, i - 1); break; }
    }
    if (!start) start = Math.max(0, lines.length - 60);
    var snippet = lines.slice(start, start + 34).join("\n");

    clearTimeout(typingTimer);
    if (reduced || !animate) { host.innerHTML = hl(snippet); return; }
    var k = 0;
    (function type() {
      k += Math.max(3, Math.round(snippet.length / 260));
      host.innerHTML = hl(snippet.slice(0, k)) + '<span class="caret"></span>';
      if (k < snippet.length) typingTimer = setTimeout(type, 16);
      else host.innerHTML = hl(snippet);
    })();
  }

  function hl(code) {
    var e = code.replace(/[&<>]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]; });
    e = e.replace(/(\/\/[^\n]*)/g, '<span class="tok-com">$1</span>');
    e = e.replace(/("(?:[^"\\]|\\.)*")/g, '<span class="tok-str">$1</span>');
    e = e.replace(/^(#\w+)/gm, '<span class="tok-pre">$1</span>');
    e = e.replace(/\b(\d+\.?\d*)\b/g, '<span class="tok-num">$1</span>');
    e = e.replace(/\b(input|int|double|bool|string|void|return|if|else|for|while|true|false|private|public|group|override|protected)\b/g, '<span class="tok-key">$1</span>');
    return e;
  }

  function codeTabs() {
    var seg = $("#demoTabs");
    if (!seg) return;
    $$("button", seg).forEach(function (b) {
      b.addEventListener("click", function () {
        $$("button", seg).forEach(function (x) { x.setAttribute("aria-selected", String(x === b)); });
        showCode(b.dataset.plat, true);
      });
    });
    var io = new IntersectionObserver(function (en) {
      if (en[0].isIntersecting) { showCode("mt5", true); io.disconnect(); }
    }, { threshold: 0.25 });
    io.observe(seg);
  }

  /* ---------------- 4. catalogue marquee + counts ---------------- */
  function catalogue() {
    var m = $("#marquee");
    if (m && EA.IND) {
      var names = EA.IND.map(function (i) { return i.name; })
        .concat(EA.PAT.map(function (p) { return p.name; }));
      var half = Math.ceil(names.length / 2);
      var rowA = names.slice(0, half), rowB = names.slice(half);
      function row(list) {
        var cells = list.concat(list).map(function (t) { return "<span>" + t + "</span>"; }).join("");
        return '<div class="marquee__row">' + cells + "</div>";
      }
      m.innerHTML = row(rowA) + row(rowB);
    }
    $$("[data-count]").forEach(function (el) {
      var key = el.dataset.count;
      var v = key === "ind" ? EA.IND.length
            : key === "pat" ? EA.PAT.length
            : key === "ops" ? EA.CG.OPS.length
            : key === "presets" ? EA.BUILDER.PRESETS.length
            : key === "blocks" ? (EA.IND.length + EA.PAT.length) : 0;
      el.textContent = String(v);
      /* Count up only once the element is on screen and the tab is visible —
         requestAnimationFrame never fires in a background tab, so the plain
         value above has to be correct on its own. */
      if (reduced || !window.GA || !window.GA.animateNumber) return;
      var io = new IntersectionObserver(function (en) {
        if (!en[0].isIntersecting || document.hidden) return;
        io.disconnect();
        el.dataset.v = "0";
        window.GA.animateNumber(el, v, function (x) { return String(Math.round(x)); }, 1100);
      }, { threshold: 0.6 });
      io.observe(el);
    });
  }

  /* ---------------- 5. platform card spotlight ---------------- */
  function tilt() {
    $$(".platcard").forEach(function (b) {
      b.addEventListener("mousemove", function (e) {
        var r = b.getBoundingClientRect();
        b.style.setProperty("--mx", (e.clientX - r.left) + "px");
        b.style.setProperty("--my", (e.clientY - r.top) + "px");
      });
    });
  }

  function init() {
    chart(); rules(); codeTabs(); catalogue(); tilt();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
