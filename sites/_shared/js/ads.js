/* =====================================================================
   GetApps — Ad slot manager (inventory reserved, no network wired)
   Source of truth: sites/_shared/js/ads.js (sync with tools/sync-shared.sh)

   Markup:  <div class="ad" data-slot="results-native"></div>
   The slot's format, reserved geometry and page position come from
   GA_ADS.inventory below, so a slot is one attribute — nothing else.

   Wiring a network later is one function:
       GAds.setAdapter(function (slot) { ...inject tag into slot.mount... });
       GAds.enable();
   Until an adapter is registered every slot renders a neutral reserved
   placeholder at exactly the height the real creative will occupy, so
   turning ads on causes zero cumulative layout shift.
   See docs/AD-INVENTORY.md for the full slot map and policy notes.
   ===================================================================== */
(function () {
  "use strict";

  /* ---- Inventory: the single place slot geometry is defined ---- */
  var INVENTORY = {
    /* id                  format         sizes (w x h, desktop → mobile)          notes */
    "top-leaderboard":  { fmt: "leaderboard", sizes: [[970, 90], [728, 90], [320, 100]], label: "Above the fold" },
    "results-native":   { fmt: "native",      sizes: [[970, 132], [336, 280], [300, 250]], label: "Post-result, high intent" },
    "inline-rect":      { fmt: "rectangle",   sizes: [[336, 280], [300, 250]], label: "In-content" },
    "sidebar-sticky":   { fmt: "sidebar",     sizes: [[300, 600], [160, 600]], desktopOnly: true, label: "Sticky rail" },
    "content-mid":      { fmt: "native",      sizes: [[728, 132], [300, 250]], label: "Mid-article" },
    "footer-banner":    { fmt: "footer",      sizes: [[728, 90], [320, 100]], label: "Footer" }
  };

  var cfg = window.GA_ADS = Object.assign({
    enabled: false,      // flip to true once an adapter is registered
    inventory: INVENTORY,
    showPlaceholders: true,
    lazyMargin: "320px"  // how far ahead of the viewport a slot warms up
  }, window.GA_ADS || {});

  var adapter = null;
  var slots = [];
  var placeholders = [];

  /* Name the size actually reserved at this viewport width, not the
     desktop one — otherwise a phone claims to be holding a 970x90. */
  function bestSize(def) {
    var avail = Math.min(window.innerWidth - 40, 1200);
    for (var i = 0; i < def.sizes.length; i++) {
      if (def.sizes[i][0] <= avail) return def.sizes[i];
    }
    return def.sizes[def.sizes.length - 1];
  }

  function label(ph, id, def) {
    var size = bestSize(def);
    ph.lastChild.textContent = size[0] + "\u00d7" + size[1] + " \u00b7 " + id;
  }

  var relabel = null;
  window.addEventListener("resize", function () {
    clearTimeout(relabel);
    relabel = setTimeout(function () {
      placeholders.forEach(function (p) { label(p.el, p.id, p.def); });
    }, 200);
  });

  function reserve(el, id, def) {
    el.dataset.fmt = def.fmt;
    el.setAttribute("role", "complementary");
    el.setAttribute("aria-label", "Advertisement");
    if (def.desktopOnly) el.setAttribute("data-desktop-only", "");

    var inner = document.createElement("div");
    inner.className = "ad__inner";
    el.appendChild(inner);

    if (cfg.showPlaceholders && !cfg.enabled) {
      var ph = document.createElement("div");
      ph.className = "ad__ph";
      ph.innerHTML = '<span>Ad space</span><b></b>';
      inner.appendChild(ph);
      label(ph, id, def);
      placeholders.push({ el: ph, id: id, def: def });
    }
    return inner;
  }

  function fill(slot) {
    if (slot.filled || !cfg.enabled || !adapter) return;
    slot.filled = true;
    slot.mount.innerHTML = "";
    try {
      adapter(slot);
    } catch (e) {
      slot.filled = false;
      if (window.console) console.warn("[GAds] adapter failed for", slot.id, e);
    }
  }

  function observe() {
    if (!("IntersectionObserver" in window)) { slots.forEach(fill); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var slot = slots.filter(function (s) { return s.el === en.target; })[0];
        if (slot) { fill(slot); io.unobserve(en.target); }
      });
    }, { rootMargin: cfg.lazyMargin });
    slots.forEach(function (s) { io.observe(s.el); });
  }

  function mount(root) {
    (root || document).querySelectorAll(".ad[data-slot]").forEach(function (el) {
      if (el.dataset.gaMounted) return;
      var id = el.dataset.slot;
      var def = cfg.inventory[id];
      if (!def) { if (window.console) console.warn("[GAds] unknown slot:", id); return; }
      el.dataset.gaMounted = "1";
      var inner = reserve(el, id, def);
      slots.push({ id: id, el: el, mount: inner, def: def, filled: false });
    });
    observe();
  }

  window.GAds = {
    inventory: cfg.inventory,
    slots: function () { return slots.slice(); },
    setAdapter: function (fn) { adapter = fn; },
    enable: function () { cfg.enabled = true; slots.forEach(fill); },
    disable: function () { cfg.enabled = false; },
    mount: mount,
    /* Call after a user action that creates new inventory (e.g. a result panel) */
    refresh: function (root) { mount(root); }
  };

  document.addEventListener("DOMContentLoaded", function () { mount(document); });
})();
