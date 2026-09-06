/* =====================================================================
   Paraphrase — landing page behaviour
   1. Phone demo  — replays the real in-app interaction: selection sweep,
      Android's floating toolbar, a tap on Paraphrase, then the sentence
      retyping itself into the rewrite.
   2. Playground  — a faithful port of the app's offline rewriter, so the
      page demonstrates the fallback honestly rather than faking a model.
   Everything degrades to a static end state when the visitor has asked
   for reduced motion.
   ===================================================================== */
(function () {
  "use strict";

  var $ = window.GA.$, $$ = window.GA.$$;
  var reduced = window.GA.reduced;

  /* ==================================================================
     Demo copy — one original, seven rewrites.
     ================================================================== */
  var ORIGINAL =
    "I wanted to reach out and let you know that we are not going to be able " +
    "to get the report done by Friday, so I was hoping we could maybe push it " +
    "to Monday if that works for you.";

  var REWRITES = {
    standard:
      "I wanted to let you know that we will not have the report finished by " +
      "Friday, and I was hoping we could move it to Monday if that suits you.",
    fluent:
      "I wanted to reach out and let you know that we will not be able to " +
      "finish the report by Friday, so I was hoping we could push it to " +
      "Monday if that works for you.",
    formal:
      "I am writing to let you know that the report will not be completed by " +
      "Friday. I would like to propose moving the deadline to Monday, should " +
      "that be acceptable.",
    casual:
      "Quick heads-up — the report won't be ready by Friday. Could we push it " +
      "to Monday instead?",
    concise:
      "The report will not be ready by Friday. Can we move it to Monday?",
    expand:
      "I wanted to reach out ahead of time and let you know that we will not " +
      "be able to finish the report by Friday, as a few of the figures are " +
      "still outstanding. If it works for you, I would like to move the " +
      "deadline to Monday, which gives us the weekend to close the remaining " +
      "gaps and hand over something complete.",
    simple:
      "I want to tell you that the report will not be ready on Friday. Can we " +
      "move it to Monday instead? Please let me know."
  };

  /* ==================================================================
     1. Text morpher — delete back to the common prefix, then type.
        The shape of watching someone edit a sentence, rather than a
        crossfade, which is what the app itself does.
     ================================================================== */
  function commonPrefix(a, b) {
    var n = Math.min(a.length, b.length), i = 0;
    while (i < n && a.charAt(i) === b.charAt(i)) i++;
    return i;
  }

  function Morpher(node) {
    var timer = null;
    function stop() { if (timer) { clearInterval(timer); timer = null; } }
    return {
      stop: stop,
      set: function (text) { stop(); node.nodeValue = text; },
      morph: function (to, done) {
        stop();
        var from = node.nodeValue;
        if (reduced || from === to) { node.nodeValue = to; if (done) done(); return; }
        var keep = commonPrefix(from, to);
        var steps = (from.length - keep) + (to.length - keep);
        var total = Math.max(700, Math.min(2200, steps * 11));
        var tick = Math.max(8, total / Math.max(1, steps));
        var i = from.length;
        var deleting = true;
        timer = setInterval(function () {
          if (deleting) {
            i--;
            node.nodeValue = from.slice(0, i);
            if (i <= keep) deleting = false;
          } else {
            i++;
            node.nodeValue = to.slice(0, i);
            if (i >= to.length) { stop(); if (done) done(); }
          }
        }, tick);
      }
    };
  }

  /* ==================================================================
     2. The phone demo sequencer
     ================================================================== */
  function initDemo() {
    var stage = $("[data-demo]");
    if (!stage) return;

    var sel = $(".sel", stage);
    var textNode = $(".txt", sel).firstChild;
    var tbar = $(".tbar", stage);
    var tapTarget = $(".tbar .us", stage);
    var done = $(".done", stage);
    var chips = $$("[data-style]", document);
    var morph = Morpher(textNode);

    var timers = [];
    var autoPlaysLeft = 2;
    var style = "standard";

    function at(ms, fn) { timers.push(setTimeout(fn, ms)); }
    function clearAll() { timers.forEach(clearTimeout); timers = []; morph.stop(); }

    function reset() {
      clearAll();
      sel.classList.remove("on", "typing");
      tbar.classList.remove("on");
      tapTarget.classList.remove("tap");
      done.classList.remove("on");
      morph.set(ORIGINAL);
    }

    function play() {
      reset();
      if (reduced) { morph.set(REWRITES[style]); done.classList.add("on"); return; }

      at(420, function () { sel.classList.add("on"); });
      at(700, function () { tbar.classList.add("on"); });
      at(1500, function () { tapTarget.classList.add("tap"); });
      at(1760, function () {
        tbar.classList.remove("on");
        tapTarget.classList.remove("tap");
        sel.classList.add("typing");
        morph.morph(REWRITES[style], function () {
          sel.classList.remove("typing");
          done.classList.add("on");
          if (autoPlaysLeft > 0) {
            autoPlaysLeft--;
            at(3400, play);
          }
        });
      });
    }

    /* Picking a style cancels the loop and morphs from whatever is on
       screen, so the chip responds now instead of after the sequence. */
    function pick(next) {
      autoPlaysLeft = 0;
      style = next;
      chips.forEach(function (c) {
        c.setAttribute("aria-pressed", String(c.dataset.style === next));
      });
      clearAll();
      tbar.classList.remove("on");
      sel.classList.add("on", "typing");
      done.classList.remove("on");
      morph.morph(REWRITES[next], function () {
        sel.classList.remove("typing");
        done.classList.add("on");
      });
    }

    chips.forEach(function (c) {
      c.addEventListener("click", function () { pick(c.dataset.style); });
    });

    stage.addEventListener("click", function (e) {
      if (e.target.closest("[data-style]")) return;
      autoPlaysLeft = 0;
      play();
    });

    /* Only run once the phone is actually on screen. */
    if (reduced || !("IntersectionObserver" in window)) { play(); return; }
    var started = false;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting && !started) { started = true; play(); }
        else if (!en.isIntersecting && started) clearAll();
      });
    }, { threshold: 0.35 });
    io.observe(stage);
  }

  /* ==================================================================
     3. Offline rewriter — a direct port of OfflineRewriter.kt, the
        deterministic fallback the app ships for when no key is set.
        Not a model, and the page says so.
     ================================================================== */
  var PHRASES = [
    ["in order to", "to"], ["due to the fact that", "because"],
    ["at this point in time", "now"], ["at the present time", "now"],
    ["in the event that", "if"], ["a large number of", "many"],
    ["a great deal of", "much"], ["for the purpose of", "for"],
    ["with regard to", "about"], ["with respect to", "about"],
    ["in spite of the fact that", "although"], ["as a matter of fact", "in fact"],
    ["in the near future", "soon"], ["on a daily basis", "daily"],
    ["is able to", "can"], ["are able to", "can"], ["has the ability to", "can"],
    ["make a decision", "decide"], ["give assistance to", "help"],
    ["take into consideration", "consider"], ["come to the conclusion", "conclude"],
    ["in my opinion", "I think"], ["please be advised that", ""],
    ["it should be noted that", ""], ["prior to", "before"],
    ["in the process of", ""]
  ];

  var SYNONYMS = {
    utilize: "use", utilise: "use", commence: "begin", terminate: "end",
    obtain: "get", purchase: "buy", require: "need", assist: "help",
    attempt: "try", demonstrate: "show", sufficient: "enough",
    additional: "more", numerous: "many", approximately: "about",
    subsequently: "later", previously: "earlier", currently: "now",
    however: "but", therefore: "so", furthermore: "also",
    moreover: "also", nevertheless: "still", regarding: "about",
    difficult: "hard", important: "key", quickly: "fast",
    happy: "glad", enormous: "huge", tiny: "small",
    endeavour: "try", endeavor: "try", ascertain: "find out",
    facilitate: "help", initiate: "start", modify: "change",
    provide: "give", receive: "get"
  };

  var FILLERS = ["actually", "basically", "really", "very", "just", "quite",
                 "literally", "simply", "definitely", "totally"];

  var CONTRACTIONS = [
    ["do not", "don't"], ["does not", "doesn't"], ["did not", "didn't"],
    ["cannot", "can't"], ["can not", "can't"], ["will not", "won't"],
    ["is not", "isn't"], ["are not", "aren't"], ["was not", "wasn't"],
    ["it is", "it's"], ["that is", "that's"], ["I am", "I'm"],
    ["we are", "we're"], ["you are", "you're"], ["they are", "they're"],
    ["I will", "I'll"], ["we will", "we'll"], ["I have", "I've"]
  ];

  function esc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

  /* Keeps the original capitalisation shape so replacements do not look
     pasted in. */
  function matchCase(original, replacement) {
    if (!replacement) return "";
    if (original.length > 1 && original === original.toUpperCase() &&
        /[A-Z]/.test(original)) return replacement.toUpperCase();
    if (original.charAt(0) === original.charAt(0).toUpperCase() &&
        /[A-Za-z]/.test(original.charAt(0))) {
      return replacement.charAt(0).toUpperCase() + replacement.slice(1);
    }
    return replacement;
  }

  function replacePhrases(text, pairs) {
    return pairs.reduce(function (out, pair) {
      return out.replace(new RegExp("\\b" + esc(pair[0]) + "\\b", "gi"), function (m) {
        return matchCase(m, pair[1]);
      });
    }, text);
  }

  function swapWords(text, map) {
    return text.replace(/[A-Za-z']+/g, function (w) {
      var r = map[w.toLowerCase()];
      return r == null ? w : matchCase(w, r);
    });
  }

  function dropWords(text, words) {
    return words.reduce(function (out, w) {
      return out.replace(new RegExp("\\b" + esc(w) + "\\b\\s*", "gi"), "");
    }, text);
  }

  function tidy(text) {
    return text.replace(/[ \t]{2,}/g, " ")
               .replace(/ ([,.;:!?])/g, "$1")
               .replace(/^\s+/gm, "")
               .trim();
  }

  var LONG_SYNONYMS = Object.keys(SYNONYMS).reduce(function (o, k) {
    if (SYNONYMS[k].length >= 4) o[k] = SYNONYMS[k];
    return o;
  }, {});

  function offlineRewrite(text, style) {
    var out = replacePhrases(text, PHRASES);
    if (style === "formal") {
      out = replacePhrases(out, CONTRACTIONS.map(function (p) { return [p[1], p[0]]; }));
      out = dropWords(out, FILLERS);
      out = swapWords(out, LONG_SYNONYMS);
    } else if (style === "casual") {
      out = replacePhrases(swapWords(out, SYNONYMS), CONTRACTIONS);
    } else if (style === "concise") {
      out = dropWords(swapWords(out, SYNONYMS), FILLERS);
    } else {
      out = swapWords(out, SYNONYMS);
    }
    return tidy(out);
  }

  /* ==================================================================
     4. Playground
     ================================================================== */
  var MAX_CHARS = 8000;   // the same cap the app enforces before any call

  function initPlayground() {
    var input = $("#tryIn");
    if (!input) return;

    var out = $("#tryOut");
    var run = $("#tryRun");
    var copyBtn = $("#tryCopy");
    var count = $("#tryCount");
    var seg = window.GA.initSeg("#trySeg", function () { render(); });
    var stream = null;

    function updateCount() {
      var n = input.value.length;
      count.textContent = n.toLocaleString() + " / " + MAX_CHARS.toLocaleString();
      count.style.color = n > MAX_CHARS ? "var(--bad)" : "";
      run.disabled = !input.value.trim() || n > MAX_CHARS;
    }

    /* Highlight words the rewriter introduced — everything the source
       sentence did not already contain. */
    function paint(text, source) {
      var had = Object.create(null);
      (source.toLowerCase().match(/[a-z']+/g) || []).forEach(function (w) { had[w] = 1; });
      var frag = document.createDocumentFragment();
      text.split(/(\s+)/).forEach(function (piece) {
        var bare = piece.toLowerCase().replace(/[^a-z']/g, "");
        if (bare && !had[bare]) {
          var m = document.createElement("mark");
          m.className = "diff";
          m.textContent = piece;
          frag.appendChild(m);
        } else {
          frag.appendChild(document.createTextNode(piece));
        }
      });
      return frag;
    }

    /* The real rewriter is instant, which next to a streaming model reads
       as "nothing happened" — so it is fed out word by word, exactly as
       the app does it. */
    function render() {
      if (stream) { clearTimeout(stream); stream = null; }
      var source = input.value.trim();
      if (!source) { out.textContent = ""; return; }
      var style = seg ? seg.value() : "standard";
      var result = offlineRewrite(source.slice(0, MAX_CHARS), style);

      if (reduced) {
        out.textContent = "";
        out.appendChild(paint(result, source));
        copyBtn.dataset.text = result;
        return;
      }

      var words = result.split(/(\s+)/);
      var i = 0;
      out.textContent = "";
      var caret = document.createElement("span");
      caret.className = "car";
      out.appendChild(caret);

      (function step() {
        if (i >= words.length) {
          caret.remove();
          out.textContent = "";
          out.appendChild(paint(result, source));
          copyBtn.dataset.text = result;
          return;
        }
        out.insertBefore(document.createTextNode(words[i]), caret);
        i++;
        stream = setTimeout(step, /\s/.test(words[i - 1]) ? 6 : 26);
      })();
    }

    input.addEventListener("input", window.GA.debounce(function () {
      updateCount();
      if (input.value.trim() && input.value.length <= MAX_CHARS) render();
    }, 420));
    input.addEventListener("input", updateCount);
    run.addEventListener("click", render);
    copyBtn.addEventListener("click", function () {
      window.GA.copy(copyBtn.dataset.text || out.textContent, "Rewrite copied");
    });

    updateCount();
    render();
  }

  /* ==================================================================
     5. Hero counters
     ================================================================== */
  function initCounters() {
    var els = $$("[data-count]");
    if (!els.length) return;
    if (reduced || !("IntersectionObserver" in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target;
        var to = parseInt(el.textContent, 10);
        if (to > 0) {
          el.dataset.v = "0";
          window.GA.animateNumber(el, to, function (v) { return String(Math.round(v)); }, 900);
        }
        io.unobserve(el);
      });
    }, { threshold: 0.6 });
    els.forEach(function (el) { io.observe(el); });
  }

  document.addEventListener("DOMContentLoaded", function () {
    initDemo();
    initPlayground();
    initCounters();
  });
})();
