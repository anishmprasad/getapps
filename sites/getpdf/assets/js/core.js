/* =====================================================================
   GetApps Product Suite — Shared runtime
   Source of truth: sites/_shared/js/core.js  (sync with tools/sync-shared.sh)
   Exposes window.GA — theme, nav, reveal, tabs, FAQ, toasts, formatting.
   ===================================================================== */
(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $  = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------- Theme ---------- */
  function applyTheme(t) {
    document.documentElement.setAttribute("data-theme", t);
    try { localStorage.setItem("ga-theme", t); } catch (e) {}
    var meta = $('meta[name="theme-color"]:not([media])');
    if (meta) meta.setAttribute("content", t === "light" ? "#FBFBFD" : "#06070B");
  }
  function initTheme() {
    $$(".theme-btn").forEach(function (b) {
      b.addEventListener("click", function () {
        applyTheme(document.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light");
      });
    });
  }

  /* ---------- Nav ---------- */
  function initNav() {
    var nav = $(".nav");
    var prog = $(".progress");
    function onScroll() {
      var y = window.scrollY || 0;
      if (nav) nav.classList.toggle("stuck", y > 12);
      if (prog) {
        var h = document.documentElement.scrollHeight - window.innerHeight;
        prog.style.transform = "scaleX(" + (h > 0 ? Math.min(1, y / h) : 0) + ")";
      }
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    var burger = $(".burger"), drawer = $(".drawer");
    if (burger && drawer) {
      burger.addEventListener("click", function () {
        var open = burger.getAttribute("aria-expanded") === "true";
        burger.setAttribute("aria-expanded", String(!open));
        drawer.classList.toggle("open", !open);
        document.body.classList.toggle("is-locked", !open);
      });
      $$("a", drawer).forEach(function (a) {
        a.addEventListener("click", function () {
          burger.setAttribute("aria-expanded", "false");
          drawer.classList.remove("open");
          document.body.classList.remove("is-locked");
        });
      });
    }

    // Product switcher (uses <details class="switcher">)
    document.addEventListener("click", function (e) {
      $$("details.switcher[open]").forEach(function (d) {
        if (!d.contains(e.target)) d.removeAttribute("open");
      });
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") $$("details.switcher[open]").forEach(function (d) { d.removeAttribute("open"); });
    });

    // Mark the current page in the nav
    var here = location.pathname.replace(/\/index\.html$/, "/").replace(/\.html$/, "");
    $$(".nav__link").forEach(function (a) {
      var href = a.getAttribute("href") || "";
      var p = href.split("#")[0].replace(/\/index\.html$/, "/").replace(/\.html$/, "");
      if (p && p === here) a.setAttribute("aria-current", "page");
    });
  }

  /* ---------- Reveal on scroll ---------- */
  function initReveal() {
    var els = $$("[data-reveal]");
    if (!els.length) return;
    if (reduced || !("IntersectionObserver" in window)) {
      els.forEach(function (el) { el.classList.add("in"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var d = parseFloat(en.target.getAttribute("data-delay") || "0");
        setTimeout(function () { en.target.classList.add("in"); }, d * 1000);
        io.unobserve(en.target);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ---------- Segmented tabs ---------- */
  function initSeg(root, onChange) {
    var seg = typeof root === "string" ? $(root) : root;
    if (!seg) return null;
    var ind = $(".seg__ind", seg);
    var btns = $$(".seg__btn", seg);

    function move(btn) {
      if (!ind) return;
      ind.style.width = btn.offsetWidth + "px";
      ind.style.transform = "translateX(" + (btn.offsetLeft - 4) + "px)";
    }
    function select(value, silent) {
      var btn = btns.filter(function (b) { return b.dataset.value === value; })[0] || btns[0];
      if (!btn) return;
      btns.forEach(function (b) { b.setAttribute("aria-selected", String(b === btn)); });
      move(btn);
      btn.scrollIntoView({ block: "nearest", inline: "nearest" });
      if (!silent && onChange) onChange(btn.dataset.value, btn);
    }
    btns.forEach(function (b) { b.addEventListener("click", function () { select(b.dataset.value); }); });
    seg.addEventListener("keydown", function (e) {
      var i = btns.indexOf(document.activeElement);
      if (i < 0) return;
      var n = e.key === "ArrowRight" ? i + 1 : e.key === "ArrowLeft" ? i - 1 : -1;
      if (n < 0 || n >= btns.length) return;
      e.preventDefault(); btns[n].focus(); select(btns[n].dataset.value);
    });
    window.addEventListener("resize", function () {
      var cur = btns.filter(function (b) { return b.getAttribute("aria-selected") === "true"; })[0];
      if (cur) move(cur);
    });
    /* Re-resolve the selection inside the frame: on a throttled or
       background tab this callback can be deferred long enough for the
       user to have already picked something else, and capturing the
       button up front would snap the indicator back. */
    requestAnimationFrame(function () {
      var cur = btns.filter(function (b) { return b.getAttribute("aria-selected") === "true"; })[0] || btns[0];
      if (cur) move(cur);
    });
    return { select: select, value: function () {
      var c = btns.filter(function (b) { return b.getAttribute("aria-selected") === "true"; })[0];
      return c && c.dataset.value;
    } };
  }

  /* ---------- FAQ ---------- */
  function initFaq() {
    $$(".faq__q").forEach(function (q) {
      q.addEventListener("click", function () {
        var item = q.closest(".faq__item");
        var open = item.classList.toggle("open");
        q.setAttribute("aria-expanded", String(open));
      });
    });
  }

  /* ---------- Range sliders ---------- */
  function paintRange(el) {
    var min = parseFloat(el.min || 0), max = parseFloat(el.max || 100);
    var pct = max > min ? ((parseFloat(el.value) - min) / (max - min)) * 100 : 0;
    el.style.setProperty("--fill", pct + "%");
  }
  function initRanges(root) {
    $$('input[type="range"].range', root).forEach(function (el) {
      paintRange(el);
      el.addEventListener("input", function () { paintRange(el); });
    });
  }

  /* ---------- Toasts ---------- */
  function toast(msg, kind, ms) {
    var host = $(".toasts");
    if (!host) { host = document.createElement("div"); host.className = "toasts"; document.body.appendChild(host); }
    var el = document.createElement("div");
    el.className = "toast" + (kind ? " toast--" + kind : "");
    el.setAttribute("role", "status");
    el.innerHTML = '<span class="toast__dot"></span><span></span>';
    el.lastChild.textContent = msg;
    host.appendChild(el);
    setTimeout(function () {
      el.classList.add("out");
      setTimeout(function () { el.remove(); }, 360);
    }, ms || 3200);
    return el;
  }

  async function copy(text, okMsg) {
    try {
      await navigator.clipboard.writeText(text);
      toast(okMsg || "Copied to clipboard");
      return true;
    } catch (e) {
      var ta = document.createElement("textarea");
      ta.value = text; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      var ok = false;
      try { ok = document.execCommand("copy"); } catch (e2) {}
      ta.remove();
      toast(ok ? (okMsg || "Copied to clipboard") : "Copy failed — select and copy manually", ok ? "" : "err");
      return ok;
    }
  }

  /* ---------- Animated numbers ---------- */
  function animateNumber(el, to, format, ms) {
    var from = parseFloat(el.dataset.v || "0");
    if (!isFinite(from)) from = 0;
    el.dataset.v = String(to);
    if (reduced || from === to) { el.textContent = format(to); return; }
    var start = performance.now(), dur = ms || 620;
    (function step(now) {
      var t = Math.min(1, (now - start) / dur);
      var e = 1 - Math.pow(1 - t, 3);
      el.textContent = format(from + (to - from) * e);
      if (t < 1) requestAnimationFrame(step);
    })(start);
  }

  /* ---------- Formatting ---------- */
  var CUR = {
    INR: { code: "INR", locale: "en-IN", sym: "₹" },
    USD: { code: "USD", locale: "en-US", sym: "$" },
    AED: { code: "AED", locale: "en-AE", sym: "AED" },
    SAR: { code: "SAR", locale: "en-SA", sym: "SAR" },
    QAR: { code: "QAR", locale: "en-QA", sym: "QAR" },
    KWD: { code: "KWD", locale: "en-KW", sym: "KWD" },
    BHD: { code: "BHD", locale: "en-BH", sym: "BHD" },
    OMR: { code: "OMR", locale: "en-OM", sym: "OMR" }
  };
  function money(n, cur, decimals) {
    var c = CUR[cur] || CUR.USD;
    if (!isFinite(n)) n = 0;
    try {
      return new Intl.NumberFormat(c.locale, {
        style: "currency", currency: c.code,
        minimumFractionDigits: decimals == null ? 0 : decimals,
        maximumFractionDigits: decimals == null ? 0 : decimals
      }).format(n);
    } catch (e) {
      return c.sym + " " + Math.round(n).toLocaleString();
    }
  }
  function num(n, decimals) {
    if (!isFinite(n)) n = 0;
    return n.toLocaleString(undefined, {
      minimumFractionDigits: decimals || 0, maximumFractionDigits: decimals == null ? 0 : decimals
    });
  }
  /* Short form: 1.2 Cr / 45.6 L for INR, 1.2M / 45.6K elsewhere */
  function compact(n, cur) {
    if (!isFinite(n)) return "0";
    var a = Math.abs(n);
    if (cur === "INR") {
      if (a >= 1e7) return (n / 1e7).toFixed(2).replace(/\.00$/, "") + " Cr";
      if (a >= 1e5) return (n / 1e5).toFixed(2).replace(/\.00$/, "") + " L";
      if (a >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, "") + " K";
      return String(Math.round(n));
    }
    if (a >= 1e9) return (n / 1e9).toFixed(2).replace(/\.00$/, "") + "B";
    if (a >= 1e6) return (n / 1e6).toFixed(2).replace(/\.00$/, "") + "M";
    if (a >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, "") + "K";
    return String(Math.round(n));
  }
  function bytes(n) {
    if (n < 1024) return n + " B";
    if (n < 1048576) return (n / 1024).toFixed(1) + " KB";
    return (n / 1048576).toFixed(2) + " MB";
  }
  function relTime(iso) {
    var ms = new Date(iso).getTime() - Date.now();
    var abs = Math.abs(ms), past = ms < 0;
    var units = [["day", 86400000], ["hour", 3600000], ["minute", 60000], ["second", 1000]];
    for (var i = 0; i < units.length; i++) {
      if (abs >= units[i][1] || i === units.length - 1) {
        var v = Math.round(abs / units[i][1]);
        var label = v + " " + units[i][0] + (v === 1 ? "" : "s");
        return past ? label + " ago" : "in " + label;
      }
    }
    return "";
  }

  /* ---------- URL state ---------- */
  function readParams() {
    var o = {};
    new URLSearchParams(location.search).forEach(function (v, k) { o[k] = v; });
    return o;
  }
  function writeParams(obj, replace) {
    var p = new URLSearchParams();
    Object.keys(obj).forEach(function (k) {
      if (obj[k] !== "" && obj[k] != null) p.set(k, obj[k]);
    });
    var url = location.pathname + (p.toString() ? "?" + p : "") + location.hash;
    history[replace === false ? "pushState" : "replaceState"](null, "", url);
  }
  function debounce(fn, ms) {
    var t; return function () {
      var a = arguments, c = this;
      clearTimeout(t); t = setTimeout(function () { fn.apply(c, a); }, ms || 200);
    };
  }

  /* ---------- Year stamps ---------- */
  function initYear() {
    $$("[data-year]").forEach(function (el) { el.textContent = String(new Date().getFullYear()); });
  }

  window.GA = {
    $: $, $$: $$, reduced: reduced,
    initSeg: initSeg, initRanges: initRanges, paintRange: paintRange,
    toast: toast, copy: copy, animateNumber: animateNumber,
    money: money, num: num, compact: compact, bytes: bytes, relTime: relTime,
    readParams: readParams, writeParams: writeParams, debounce: debounce,
    CUR: CUR
  };

  document.addEventListener("DOMContentLoaded", function () {
    initTheme(); initNav(); initReveal(); initFaq(); initRanges(document); initYear();
  });
})();
