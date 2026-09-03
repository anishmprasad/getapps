/* ============================================================
   GetEA — builder UI.
   Holds the strategy in one plain object, renders each step from
   it, and writes it to localStorage. Nothing leaves the browser:
   there is no account and no server to send it to.
   ============================================================ */
(function () {
  "use strict";
  var EA = window.EA, GA = window.GA;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var LS_CUR = "getea.current", LS_LIB = "getea.library";

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function uid() { return Math.random().toString(36).slice(2, 9); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function num(v, dflt) { var n = parseFloat(v); return isFinite(n) ? n : dflt; }

  /* ---------------- default strategy ---------------- */
  function blank() {
    return {
      v: 1,
      name: "My first robot",
      platform: "mt5",
      setup: {
        tf: "PERIOD_CURRENT", signalBar: 1, onBarClose: true, direction: "both",
        magic: 20250904, comment: "GetEA", slippage: 5, maxSpread: 0
      },
      entry: { long: [{ id: uid(), join: "all", conds: [] }], short: [{ id: uid(), join: "all", conds: [] }] },
      exit: {
        long: [], short: [], oppositeSignal: true,
        sl: { mode: "pips", pips: 30, atrPeriod: 14, atrMult: 1.5, pct: 1, swingWing: 2 },
        tp: { mode: "pips", pips: 60, atrPeriod: 14, atrMult: 3, pct: 2, rr: 2 },
        trail: { mode: "off", dist: 20, start: 20, step: 5, atrPeriod: 14, atrMult: 2 },
        be: { on: false, trigger: 20, offset: 2 },
        partial: { on: false, at: 25, pct: 50 },
        timeExit: { onBars: false, bars: 48, fridayClose: false, fridayHour: 20 }
      },
      risk: {
        lotMode: "fixed", lots: 0.01, riskPct: 1, riskMoney: 50, lotsPer1k: 0.01, maxLots: 5,
        maxPositions: 1, maxTradesPerDay: 0, minBarsBetween: 0, hedge: false,
        martOn: false, martMult: 2, martMax: 3,
        gridOn: false, gridStep: 20, gridMult: 1.5, gridMax: 3,
        dailyLoss: 0, dailyProfit: 0, equityStopPct: 0, maxConsecLoss: 0
      },
      filters: {
        hoursOn: false, hourFrom: 7, hourTo: 20, days: [1, 1, 1, 1, 1, 0, 0],
        newsOn: false, newsWindows: [{ from: "12:25", to: "13:05" }],
        volOn: false, atrPeriod: 14, atrMin: 0, atrMax: 0
      },
      alerts: { popup: true, push: false, email: false, mailFrom: "bot@example.com", mailTo: "you@example.com" },
      test: { balance: 10000, spreadPips: 1.2, commission: 7, slippagePips: 0.2, instrument: "fx4", pip: 0.0001, pipValue: 10 }
    };
  }

  var ST = blank();
  var lastResult = null, lastData = null, lastMeta = null;

  /* ---------------- shortcuts for building conditions ---------------- */
  function ind(id, p, out) { return { t: "ind", id: id, p: p || {}, out: out || "main", shift: 0 }; }
  function price(f) { return { t: "price", field: f || "close", shift: 0 }; }
  function konst(v) { return { t: "const", value: v }; }
  function cmp(a, op, b, extra) {
    return Object.assign({ id: uid(), kind: "cmp", a: a, op: op, b: b }, extra || {});
  }
  function patCond(pid) { return { id: uid(), kind: "pattern", pid: pid }; }

  /* ---------------- presets ---------------- */
  var PRESETS = [
    {
      k: "ema-cross", name: "EMA 20/50 crossover", tag: "Trend",
      note: "The classic. Buy when the fast average crosses up through the slow one, with RSI confirming the side.",
      apply: function (s) {
        s.name = "EMA 20-50 crossover";
        s.entry.long[0].conds = [
          cmp(ind("ma", { period: 20, method: "ema", price: "close" }), "cross_above", ind("ma", { period: 50, method: "ema", price: "close" })),
          cmp(ind("rsi", { period: 14, price: "close" }), "gt", konst(45))
        ];
        s.entry.short[0].conds = [
          cmp(ind("ma", { period: 20, method: "ema", price: "close" }), "cross_below", ind("ma", { period: 50, method: "ema", price: "close" })),
          cmp(ind("rsi", { period: 14, price: "close" }), "lt", konst(55))
        ];
        s.exit.sl = Object.assign(s.exit.sl, { mode: "atr", atrPeriod: 14, atrMult: 2 });
        s.exit.tp = Object.assign(s.exit.tp, { mode: "rr", rr: 2 });
      }
    },
    {
      k: "rsi-mr", name: "RSI mean reversion", tag: "Counter-trend",
      note: "Fade the extremes: buy oversold inside a Bollinger band, sell overbought. Wants a ranging market.",
      apply: function (s) {
        s.name = "RSI mean reversion";
        s.entry.long[0].conds = [
          cmp(ind("rsi", { period: 14, price: "close" }), "cross_above", konst(30)),
          cmp(price("close"), "lt", ind("bbands", { period: 20, dev: 2, price: "close" }, "lower"))
        ];
        s.entry.short[0].conds = [
          cmp(ind("rsi", { period: 14, price: "close" }), "cross_below", konst(70)),
          cmp(price("close"), "gt", ind("bbands", { period: 20, dev: 2, price: "close" }, "upper"))
        ];
        s.exit.long = [{ id: uid(), join: "any", conds: [cmp(ind("rsi", { period: 14, price: "close" }), "gt", konst(60))] }];
        s.exit.short = [{ id: uid(), join: "any", conds: [cmp(ind("rsi", { period: 14, price: "close" }), "lt", konst(40))] }];
        s.exit.sl = Object.assign(s.exit.sl, { mode: "atr", atrMult: 2.5, atrPeriod: 14 });
        s.exit.tp = Object.assign(s.exit.tp, { mode: "atr", atrMult: 2, atrPeriod: 14 });
      }
    },
    {
      k: "breakout", name: "Donchian breakout", tag: "Momentum",
      note: "Turtle-style: buy a new 20-bar high while ADX says the market is actually moving.",
      apply: function (s) {
        s.name = "Donchian breakout";
        s.entry.long[0].conds = [
          cmp(price("close"), "gt", ind("donchian", { period: 20, exclude: 1 }, "upper")),
          cmp(ind("adx", { period: 14 }), "gt", konst(22))
        ];
        s.entry.short[0].conds = [
          cmp(price("close"), "lt", ind("donchian", { period: 20, exclude: 1 }, "lower")),
          cmp(ind("adx", { period: 14 }), "gt", konst(22))
        ];
        s.exit.sl = Object.assign(s.exit.sl, { mode: "atr", atrMult: 2, atrPeriod: 14 });
        s.exit.tp = Object.assign(s.exit.tp, { mode: "none" });
        s.exit.trail = Object.assign(s.exit.trail, { mode: "atr", atrMult: 3, atrPeriod: 14, start: 10, step: 5 });
      }
    },
    {
      k: "supertrend", name: "SuperTrend rider", tag: "Trend",
      note: "Follow the SuperTrend flip, filtered by the 200 EMA so you only trade with the bigger picture.",
      apply: function (s) {
        s.name = "SuperTrend rider";
        s.entry.long[0].conds = [
          cmp(ind("supertrend", { period: 10, mult: 3 }, "dir"), "gt", konst(0)),
          cmp(price("close"), "gt", ind("ma", { period: 200, method: "ema", price: "close" })),
          cmp(price("close"), "cross_above", ind("supertrend", { period: 10, mult: 3 }, "main"))
        ];
        s.entry.short[0].conds = [
          cmp(ind("supertrend", { period: 10, mult: 3 }, "dir"), "lt", konst(0)),
          cmp(price("close"), "lt", ind("ma", { period: 200, method: "ema", price: "close" })),
          cmp(price("close"), "cross_below", ind("supertrend", { period: 10, mult: 3 }, "main"))
        ];
        s.exit.sl = Object.assign(s.exit.sl, { mode: "atr", atrMult: 2, atrPeriod: 10 });
        s.exit.tp = Object.assign(s.exit.tp, { mode: "rr", rr: 3 });
      }
    },
    {
      k: "fib-pullback", name: "Fibonacci pullback", tag: "Retracement",
      note: "Wait for a trend, then buy the 61.8% retracement of the last swing with a bullish engulfing to confirm.",
      apply: function (s) {
        s.name = "Fibonacci pullback";
        s.entry.long[0].conds = [
          cmp(ind("ma", { period: 50, method: "ema", price: "close" }), "gt", ind("ma", { period: 200, method: "ema", price: "close" })),
          cmp(price("low"), "near", ind("fib", { period: 50, level: "61.8", dir: "auto" }), { tol: 80 }),
          patCond("engulf_bull")
        ];
        s.entry.short[0].conds = [
          cmp(ind("ma", { period: 50, method: "ema", price: "close" }), "lt", ind("ma", { period: 200, method: "ema", price: "close" })),
          cmp(price("high"), "near", ind("fib", { period: 50, level: "61.8", dir: "auto" }), { tol: 80 }),
          patCond("engulf_bear")
        ];
        s.exit.sl = Object.assign(s.exit.sl, { mode: "swing", swingWing: 3 });
        s.exit.tp = Object.assign(s.exit.tp, { mode: "rr", rr: 2.5 });
      }
    },
    {
      k: "pinbar", name: "Pin bar at support", tag: "Price action",
      note: "Pure price action: a rejection candle at the previous day's low or high, no indicator required.",
      apply: function (s) {
        s.name = "Pin bar reversal";
        s.entry.long[0].conds = [
          patCond("pin_bull"),
          cmp(price("low"), "near", ind("dayohlc", { period: "day" }, "l"), { tol: 150 })
        ];
        s.entry.short[0].conds = [
          patCond("pin_bear"),
          cmp(price("high"), "near", ind("dayohlc", { period: "day" }, "h"), { tol: 150 })
        ];
        s.exit.sl = Object.assign(s.exit.sl, { mode: "swing", swingWing: 2 });
        s.exit.tp = Object.assign(s.exit.tp, { mode: "rr", rr: 2 });
      }
    },
    {
      k: "macd-momentum", name: "MACD momentum", tag: "Momentum",
      note: "Trade the MACD line crossing its signal, but only in the direction of the 100 EMA.",
      apply: function (s) {
        s.name = "MACD momentum";
        s.entry.long[0].conds = [
          cmp(ind("macd", { fast: 12, slow: 26, signal: 9, price: "close" }, "main"), "cross_above", ind("macd", { fast: 12, slow: 26, signal: 9, price: "close" }, "signal")),
          cmp(price("close"), "gt", ind("ma", { period: 100, method: "ema", price: "close" }))
        ];
        s.entry.short[0].conds = [
          cmp(ind("macd", { fast: 12, slow: 26, signal: 9, price: "close" }, "main"), "cross_below", ind("macd", { fast: 12, slow: 26, signal: 9, price: "close" }, "signal")),
          cmp(price("close"), "lt", ind("ma", { period: 100, method: "ema", price: "close" }))
        ];
        s.exit.sl = Object.assign(s.exit.sl, { mode: "pips", pips: 40 });
        s.exit.tp = Object.assign(s.exit.tp, { mode: "pips", pips: 80 });
      }
    },
    {
      k: "london", name: "London session breakout", tag: "Session",
      note: "Break of the Asian range in the first hours of London, flat before the weekend.",
      apply: function (s) {
        s.name = "London breakout";
        s.entry.long[0].conds = [cmp(price("close"), "cross_above", ind("session", { from: 0, to: 7 }, "high"))];
        s.entry.short[0].conds = [cmp(price("close"), "cross_below", ind("session", { from: 0, to: 7 }, "low"))];
        s.filters.hoursOn = true; s.filters.hourFrom = 7; s.filters.hourTo = 12;
        s.exit.sl = Object.assign(s.exit.sl, { mode: "atr", atrMult: 1.5, atrPeriod: 14 });
        s.exit.tp = Object.assign(s.exit.tp, { mode: "rr", rr: 2 });
        s.exit.timeExit = Object.assign(s.exit.timeExit, { fridayClose: true, fridayHour: 20 });
      }
    },
    {
      k: "stoch-pivot", name: "Stochastic at pivot", tag: "Levels",
      note: "Buy an oversold stochastic turning up at the daily S1 pivot; mirror it at R1.",
      apply: function (s) {
        s.name = "Stochastic pivot";
        s.entry.long[0].conds = [
          cmp(ind("stoch", { k: 5, d: 3, slow: 3 }, "main"), "cross_above", ind("stoch", { k: 5, d: 3, slow: 3 }, "signal")),
          cmp(ind("stoch", { k: 5, d: 3, slow: 3 }, "main"), "lt", konst(30)),
          cmp(price("low"), "near", ind("pivot", { kind: "classic", period: "day" }, "s1"), { tol: 120 })
        ];
        s.entry.short[0].conds = [
          cmp(ind("stoch", { k: 5, d: 3, slow: 3 }, "main"), "cross_below", ind("stoch", { k: 5, d: 3, slow: 3 }, "signal")),
          cmp(ind("stoch", { k: 5, d: 3, slow: 3 }, "main"), "gt", konst(70)),
          cmp(price("high"), "near", ind("pivot", { kind: "classic", period: "day" }, "r1"), { tol: 120 })
        ];
        s.exit.sl = Object.assign(s.exit.sl, { mode: "pips", pips: 35 });
        s.exit.tp = Object.assign(s.exit.tp, { mode: "pips", pips: 70 });
      }
    },
    {
      k: "ichimoku", name: "Ichimoku cloud break", tag: "Trend",
      note: "Price closing above the cloud with Tenkan over Kijun — a full Ichimoku entry.",
      apply: function (s) {
        s.name = "Ichimoku cloud break";
        s.entry.long[0].conds = [
          cmp(price("close"), "gt", ind("ichimoku", { tenkan: 9, kijun: 26, senkou: 52 }, "spana")),
          cmp(price("close"), "gt", ind("ichimoku", { tenkan: 9, kijun: 26, senkou: 52 }, "spanb")),
          cmp(ind("ichimoku", { tenkan: 9, kijun: 26, senkou: 52 }, "tenkan"), "cross_above", ind("ichimoku", { tenkan: 9, kijun: 26, senkou: 52 }, "kijun"))
        ];
        s.entry.short[0].conds = [
          cmp(price("close"), "lt", ind("ichimoku", { tenkan: 9, kijun: 26, senkou: 52 }, "spana")),
          cmp(price("close"), "lt", ind("ichimoku", { tenkan: 9, kijun: 26, senkou: 52 }, "spanb")),
          cmp(ind("ichimoku", { tenkan: 9, kijun: 26, senkou: 52 }, "tenkan"), "cross_below", ind("ichimoku", { tenkan: 9, kijun: 26, senkou: 52 }, "kijun"))
        ];
        s.exit.sl = Object.assign(s.exit.sl, { mode: "atr", atrMult: 2, atrPeriod: 14 });
        s.exit.trail = Object.assign(s.exit.trail, { mode: "atr", atrMult: 2.5, atrPeriod: 14, start: 15, step: 5 });
      }
    }
  ];

  /* ---------------- storage ---------------- */
  function save() {
    try { localStorage.setItem(LS_CUR, JSON.stringify(ST)); } catch (e) {}
  }
  function load() {
    try {
      var raw = localStorage.getItem(LS_CUR);
      if (raw) {
        var o = JSON.parse(raw);
        if (o && o.entry) ST = Object.assign(blank(), o);
      }
    } catch (e) {}
  }
  function library() {
    try { return JSON.parse(localStorage.getItem(LS_LIB) || "[]"); } catch (e) { return []; }
  }
  function saveLibrary(list) {
    try { localStorage.setItem(LS_LIB, JSON.stringify(list.slice(0, 40))); } catch (e) {}
  }
  function storeStrategy(extra) {
    var list = library();
    var entry = {
      id: uid(), name: ST.name, platform: ST.platform, saved: Date.now(),
      strategy: clone(ST), stats: extra || null
    };
    list.unshift(entry);
    saveLibrary(list);
    return entry;
  }

  window.EA.BUILDER = {
    ST: function () { return ST; },
    set: function (s) { ST = s; save(); },
    blank: blank, save: save, load: load, library: library, saveLibrary: saveLibrary,
    storeStrategy: storeStrategy, PRESETS: PRESETS, esc: esc, uid: uid, clone: clone, num: num,
    cmp: cmp, ind: ind, price: price, konst: konst, patCond: patCond,
    result: function (r, d, m) { if (arguments.length) { lastResult = r; lastData = d; lastMeta = m; } return { r: lastResult, d: lastData, m: lastMeta }; }
  };
})();
