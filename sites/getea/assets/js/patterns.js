/* ============================================================
   GetEA — candlestick and price-action patterns.
   Every pattern is written ONCE, as a C-style boolean expression
   over a tiny vocabulary. The same string is compiled to a JS
   function for the backtest and transliterated into MQL4, MQL5
   and C# by the emitters, so the browser and the robot can never
   disagree about what a hammer is.

   Vocabulary (n = bars back from the signal bar):
     O(n) H(n) L(n) C(n)   bar prices
     BODY(n) RANGE(n)      |close-open|, high-low
     USH(n) LSH(n)         upper / lower shadow
     UP(n) DN(n)           bullish / bearish body
     MID(n)                (open+close)/2
     AVG(n,k)              mean range of k bars starting n back
     ABS MAX MIN           maths
   ============================================================ */
(function () {
  "use strict";

  var DEF = [
  /* ---- single bar ---- */
  ["doji", "Doji", "Indecision", 1, "Open and close all but equal — the market could not choose.",
    "RANGE(0) > 0 && BODY(0) <= 0.10 * RANGE(0)"],
  ["doji_long", "Long-legged doji", "Indecision", 1, "A doji with long shadows both ways — violent indecision.",
    "RANGE(0) > 0 && BODY(0) <= 0.10 * RANGE(0) && USH(0) >= 0.30 * RANGE(0) && LSH(0) >= 0.30 * RANGE(0)"],
  ["dragonfly", "Dragonfly doji", "Bullish reversal", 1, "Long lower wick, no body, no upper wick — sellers rejected.",
    "RANGE(0) > 0 && BODY(0) <= 0.10 * RANGE(0) && LSH(0) >= 0.60 * RANGE(0) && USH(0) <= 0.10 * RANGE(0)"],
  ["gravestone", "Gravestone doji", "Bearish reversal", 1, "Long upper wick, no body — buyers rejected.",
    "RANGE(0) > 0 && BODY(0) <= 0.10 * RANGE(0) && USH(0) >= 0.60 * RANGE(0) && LSH(0) <= 0.10 * RANGE(0)"],
  ["marubozu_bull", "Bullish marubozu", "Bullish continuation", 1, "A full green body with almost no wicks.",
    "UP(0) && RANGE(0) > 0 && BODY(0) >= 0.90 * RANGE(0)"],
  ["marubozu_bear", "Bearish marubozu", "Bearish continuation", 1, "A full red body with almost no wicks.",
    "DN(0) && RANGE(0) > 0 && BODY(0) >= 0.90 * RANGE(0)"],
  ["spinning", "Spinning top", "Indecision", 1, "Small body between two visible shadows.",
    "RANGE(0) > 0 && BODY(0) <= 0.35 * RANGE(0) && USH(0) >= 0.25 * RANGE(0) && LSH(0) >= 0.25 * RANGE(0)"],
  ["pin_bull", "Bullish pin bar", "Bullish reversal", 1, "Lower wick at least twice the body — a rejection of lower prices.",
    "RANGE(0) > 0 && LSH(0) >= 2.0 * BODY(0) && LSH(0) >= 0.55 * RANGE(0) && USH(0) <= 0.25 * RANGE(0)"],
  ["pin_bear", "Bearish pin bar", "Bearish reversal", 1, "Upper wick at least twice the body.",
    "RANGE(0) > 0 && USH(0) >= 2.0 * BODY(0) && USH(0) >= 0.55 * RANGE(0) && LSH(0) <= 0.25 * RANGE(0)"],
  ["wide_bar", "Wide range bar", "Volatility", 21, "A bar far larger than the recent average — expansion.",
    "RANGE(0) >= 1.5 * AVG(1, 20)"],
  ["narrow_bar", "Narrow range bar", "Volatility", 21, "A compressed bar — often the coil before a move.",
    "RANGE(0) <= 0.5 * AVG(1, 20)"],

  /* ---- two bars ---- */
  ["hammer", "Hammer", "Bullish reversal", 3, "Long lower wick after a push down — buyers took control.",
    "RANGE(0) > 0 && LSH(0) >= 0.50 * RANGE(0) && USH(0) <= 0.25 * RANGE(0) && L(0) <= MIN(L(1), L(2))"],
  ["inv_hammer", "Inverted hammer", "Bullish reversal", 3, "Long upper wick at the bottom of a move.",
    "RANGE(0) > 0 && USH(0) >= 0.50 * RANGE(0) && LSH(0) <= 0.25 * RANGE(0) && L(0) <= MIN(L(1), L(2))"],
  ["hanging_man", "Hanging man", "Bearish reversal", 3, "Hammer shape, but printed at the top of a rally.",
    "RANGE(0) > 0 && LSH(0) >= 0.50 * RANGE(0) && USH(0) <= 0.25 * RANGE(0) && H(0) >= MAX(H(1), H(2))"],
  ["shooting_star", "Shooting star", "Bearish reversal", 3, "Long upper wick at the top of a rally.",
    "RANGE(0) > 0 && USH(0) >= 0.50 * RANGE(0) && LSH(0) <= 0.25 * RANGE(0) && H(0) >= MAX(H(1), H(2))"],
  ["engulf_bull", "Bullish engulfing", "Bullish reversal", 2, "A green body that swallows the previous red one.",
    "DN(1) && UP(0) && C(0) >= O(1) && O(0) <= C(1) && BODY(0) > BODY(1)"],
  ["engulf_bear", "Bearish engulfing", "Bearish reversal", 2, "A red body that swallows the previous green one.",
    "UP(1) && DN(0) && O(0) >= C(1) && C(0) <= O(1) && BODY(0) > BODY(1)"],
  ["piercing", "Piercing line", "Bullish reversal", 2, "Gaps down, then closes back above the midpoint of the red bar.",
    "DN(1) && UP(0) && O(0) < C(1) && C(0) > MID(1) && C(0) < O(1)"],
  ["darkcloud", "Dark cloud cover", "Bearish reversal", 2, "Gaps up, then closes back below the midpoint of the green bar.",
    "UP(1) && DN(0) && O(0) > C(1) && C(0) < MID(1) && C(0) > O(1)"],
  ["harami_bull", "Bullish harami", "Bullish reversal", 2, "A small green body held inside the previous red body.",
    "DN(1) && UP(0) && O(0) > C(1) && C(0) < O(1) && BODY(0) < 0.6 * BODY(1)"],
  ["harami_bear", "Bearish harami", "Bearish reversal", 2, "A small red body held inside the previous green body.",
    "UP(1) && DN(0) && O(0) < C(1) && C(0) > O(1) && BODY(0) < 0.6 * BODY(1)"],
  ["harami_cross_bull", "Bullish harami cross", "Bullish reversal", 2, "Harami where the inside bar is a doji.",
    "DN(1) && BODY(0) <= 0.10 * RANGE(0) && MAX(O(0), C(0)) < O(1) && MIN(O(0), C(0)) > C(1)"],
  ["harami_cross_bear", "Bearish harami cross", "Bearish reversal", 2, "Harami where the inside bar is a doji.",
    "UP(1) && BODY(0) <= 0.10 * RANGE(0) && MAX(O(0), C(0)) < C(1) && MIN(O(0), C(0)) > O(1)"],
  ["tweezer_bottom", "Tweezer bottom", "Bullish reversal", 11, "Two bars sharing the same low.",
    "DN(1) && UP(0) && ABS(L(0) - L(1)) <= 0.10 * AVG(0, 10)"],
  ["tweezer_top", "Tweezer top", "Bearish reversal", 11, "Two bars sharing the same high.",
    "UP(1) && DN(0) && ABS(H(0) - H(1)) <= 0.10 * AVG(0, 10)"],
  ["belt_bull", "Bullish belt hold", "Bullish reversal", 2, "Opens at its low and runs — no lower wick.",
    "DN(1) && UP(0) && RANGE(0) > 0 && ABS(O(0) - L(0)) <= 0.05 * RANGE(0) && BODY(0) >= 0.70 * RANGE(0)"],
  ["belt_bear", "Bearish belt hold", "Bearish reversal", 2, "Opens at its high and falls — no upper wick.",
    "UP(1) && DN(0) && RANGE(0) > 0 && ABS(O(0) - H(0)) <= 0.05 * RANGE(0) && BODY(0) >= 0.70 * RANGE(0)"],
  ["kicker_bull", "Bullish kicker", "Bullish reversal", 2, "A red bar, then a green bar opening above it and never looking back.",
    "DN(1) && UP(0) && O(0) > O(1) && RANGE(0) > 0 && BODY(0) >= 0.60 * RANGE(0)"],
  ["kicker_bear", "Bearish kicker", "Bearish reversal", 2, "A green bar, then a red bar opening below it.",
    "UP(1) && DN(0) && O(0) < O(1) && RANGE(0) > 0 && BODY(0) >= 0.60 * RANGE(0)"],
  ["inside", "Inside bar", "Continuation", 2, "The whole bar sits inside the previous range — compression.",
    "H(0) < H(1) && L(0) > L(1)"],
  ["outside", "Outside bar", "Volatility", 2, "The bar covers the previous range in both directions.",
    "H(0) > H(1) && L(0) < L(1)"],
  ["gap_up", "Gap up", "Bullish continuation", 2, "The whole bar trades above the previous bar.",
    "L(0) > H(1)"],
  ["gap_down", "Gap down", "Bearish continuation", 2, "The whole bar trades below the previous bar.",
    "H(0) < L(1)"],
  ["hh_hl", "Higher high & higher low", "Bullish continuation", 2, "Textbook uptrend structure on the last two bars.",
    "H(0) > H(1) && L(0) > L(1)"],
  ["lh_ll", "Lower high & lower low", "Bearish continuation", 2, "Textbook downtrend structure on the last two bars.",
    "H(0) < H(1) && L(0) < L(1)"],

  /* ---- three bars and more ---- */
  ["morning_star", "Morning star", "Bullish reversal", 3, "Down bar, small pause, then a strong green close.",
    "DN(2) && BODY(1) <= 0.5 * BODY(2) && UP(0) && C(0) > MID(2)"],
  ["evening_star", "Evening star", "Bearish reversal", 3, "Up bar, small pause, then a strong red close.",
    "UP(2) && BODY(1) <= 0.5 * BODY(2) && DN(0) && C(0) < MID(2)"],
  ["morning_doji", "Morning doji star", "Bullish reversal", 3, "Morning star whose middle bar is a doji.",
    "DN(2) && BODY(1) <= 0.10 * RANGE(1) && UP(0) && C(0) > MID(2)"],
  ["evening_doji", "Evening doji star", "Bearish reversal", 3, "Evening star whose middle bar is a doji.",
    "UP(2) && BODY(1) <= 0.10 * RANGE(1) && DN(0) && C(0) < MID(2)"],
  ["abandoned_bull", "Bullish abandoned baby", "Bullish reversal", 3, "An isolated doji gapped away from both neighbours.",
    "DN(2) && BODY(1) <= 0.10 * RANGE(1) && H(1) < L(2) && L(0) > H(1) && UP(0)"],
  ["abandoned_bear", "Bearish abandoned baby", "Bearish reversal", 3, "The mirror image, at a top.",
    "UP(2) && BODY(1) <= 0.10 * RANGE(1) && L(1) > H(2) && H(0) < L(1) && DN(0)"],
  ["soldiers", "Three white soldiers", "Bullish reversal", 3, "Three strong green bars, each opening inside the last body.",
    "UP(0) && UP(1) && UP(2) && C(0) > C(1) && C(1) > C(2) && O(0) > O(1) && O(0) < C(1) && O(1) > O(2) && O(1) < C(2)"],
  ["crows", "Three black crows", "Bearish reversal", 3, "Three strong red bars stepping down.",
    "DN(0) && DN(1) && DN(2) && C(0) < C(1) && C(1) < C(2) && O(0) < O(1) && O(0) > C(1) && O(1) < O(2) && O(1) > C(2)"],
  ["inside_up", "Three inside up", "Bullish reversal", 3, "A bullish harami confirmed by a third green bar.",
    "DN(2) && UP(1) && O(1) > C(2) && C(1) < O(2) && UP(0) && C(0) > C(1)"],
  ["inside_down", "Three inside down", "Bearish reversal", 3, "A bearish harami confirmed by a third red bar.",
    "UP(2) && DN(1) && O(1) < C(2) && C(1) > O(2) && DN(0) && C(0) < C(1)"],
  ["outside_up", "Three outside up", "Bullish reversal", 3, "A bullish engulfing confirmed by a third green bar.",
    "DN(2) && UP(1) && C(1) >= O(2) && O(1) <= C(2) && UP(0) && C(0) > C(1)"],
  ["outside_down", "Three outside down", "Bearish reversal", 3, "A bearish engulfing confirmed by a third red bar.",
    "UP(2) && DN(1) && O(1) >= C(2) && C(1) <= O(2) && DN(0) && C(0) < C(1)"],
  ["rising3", "Rising three methods", "Bullish continuation", 5, "A big green bar, a small pullback inside it, then a new high close.",
    "UP(4) && DN(3) && DN(2) && DN(1) && H(3) < H(4) && L(3) > L(4) && H(2) < H(4) && L(2) > L(4) && H(1) < H(4) && L(1) > L(4) && UP(0) && C(0) > C(4)"],
  ["falling3", "Falling three methods", "Bearish continuation", 5, "The bearish mirror of rising three methods.",
    "DN(4) && UP(3) && UP(2) && UP(1) && H(3) < H(4) && L(3) > L(4) && H(2) < H(4) && L(2) > L(4) && H(1) < H(4) && L(1) > L(4) && DN(0) && C(0) < C(4)"]
  ];

  /* ---- compile each expression into a JS predicate ---- */
  var ARGS = ["O", "H", "L", "C", "BODY", "RANGE", "USH", "LSH", "UP", "DN", "MID", "AVG", "ABS", "MAX", "MIN"];

  var PAT = DEF.map(function (r) {
    var fn;
    try { fn = new Function(ARGS.join(","), "return (" + r[5] + ");"); }
    catch (e) { fn = function () { return false; }; if (window.console) console.error("pattern " + r[0], e); }
    return { id: r[0], name: r[1], group: r[2], bars: r[3], note: r[4], expr: r[5], fn: fn };
  });

  var PAT_BY = {};
  PAT.forEach(function (p) { PAT_BY[p.id] = p; });

  /* ---- evaluate a pattern on chronological OHLC arrays at index i ---- */
  function make(d, i) {
    function at(n) { return i - n; }
    function O(n) { return d.o[at(n)]; }
    function H(n) { return d.h[at(n)]; }
    function L(n) { return d.l[at(n)]; }
    function C(n) { return d.c[at(n)]; }
    function BODY(n) { return Math.abs(C(n) - O(n)); }
    function RANGE(n) { return H(n) - L(n); }
    function USH(n) { return H(n) - Math.max(O(n), C(n)); }
    function LSH(n) { return Math.min(O(n), C(n)) - L(n); }
    function UP(n) { return C(n) > O(n); }
    function DN(n) { return C(n) < O(n); }
    function MID(n) { return (O(n) + C(n)) / 2; }
    function AVG(n, k) { var s = 0, j; for (j = 0; j < k; j++) s += RANGE(n + j); return s / k; }
    return [O, H, L, C, BODY, RANGE, USH, LSH, UP, DN, MID, AVG, Math.abs, Math.max, Math.min];
  }

  function test(id, d, i) {
    var p = PAT_BY[id];
    if (!p || i - p.bars - 1 < 0) return false;
    try { return !!p.fn.apply(null, make(d, i)); } catch (e) { return false; }
  }

  window.EA = window.EA || {};
  window.EA.PAT = PAT;
  window.EA.PAT_BY = PAT_BY;
  window.EA.patTest = test;
})();
