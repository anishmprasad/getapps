/* ============================================================
   GetEA — block catalogue.
   One source of truth for every indicator, pattern and operator:
   metadata for the UI, and the maths for the in-browser backtest.
   Code generation lives in emit-mt.js / emit-ct.js, keyed by the
   same ids. Series are chronological (index 0 = oldest bar);
   a "shift" of 1 therefore means i-1.
   ============================================================ */
(function () {
  "use strict";

  var NaNv = NaN;
  function arr(n, fill) { var a = new Float64Array(n); if (fill !== 0) a.fill(fill === undefined ? NaNv : fill); return a; }

  /* ---------------- price sources ---------------- */
  var PRICE_FIELDS = [
    { k: "close",    l: "Close" },
    { k: "open",     l: "Open" },
    { k: "high",     l: "High" },
    { k: "low",      l: "Low" },
    { k: "median",   l: "Median (H+L)/2" },
    { k: "typical",  l: "Typical (H+L+C)/3" },
    { k: "weighted", l: "Weighted (H+L+2C)/4" }
  ];

  function src(d, field) {
    var n = d.c.length, out, i;
    switch (field) {
      case "open": return d.o;
      case "high": return d.h;
      case "low": return d.l;
      case "median":   out = arr(n, 0); for (i = 0; i < n; i++) out[i] = (d.h[i] + d.l[i]) / 2; return out;
      case "typical":  out = arr(n, 0); for (i = 0; i < n; i++) out[i] = (d.h[i] + d.l[i] + d.c[i]) / 3; return out;
      case "weighted": out = arr(n, 0); for (i = 0; i < n; i++) out[i] = (d.h[i] + d.l[i] + 2 * d.c[i]) / 4; return out;
      default: return d.c;
    }
  }

  /* ---------------- small maths kit ---------------- */
  function first(s) { var i; for (i = 0; i < s.length; i++) if (!isNaN(s[i])) return i; return s.length; }
  function sma(s, p) {
    var n = s.length, o = arr(n), f = first(s), sum = 0, i;
    for (i = f; i < n; i++) {
      sum += s[i];
      if (i >= f + p) sum -= s[i - p];
      if (i >= f + p - 1) o[i] = sum / p;
    }
    return o;
  }
  function ema(s, p) {
    var n = s.length, o = arr(n), k = 2 / (p + 1), f = first(s), i, seed = 0;
    if (n < f + p) return o;
    for (i = f; i < f + p; i++) seed += s[i];
    o[f + p - 1] = seed / p;
    for (i = f + p; i < n; i++) o[i] = s[i] * k + o[i - 1] * (1 - k);
    return o;
  }
  function rma(s, p) {           /* Wilder / smoothed */
    var n = s.length, o = arr(n), f = first(s), i, seed = 0;
    if (n < f + p) return o;
    for (i = f; i < f + p; i++) seed += s[i];
    o[f + p - 1] = seed / p;
    for (i = f + p; i < n; i++) o[i] = (o[i - 1] * (p - 1) + s[i]) / p;
    return o;
  }
  function lwma(s, p) {
    var n = s.length, o = arr(n), denom = p * (p + 1) / 2, f = first(s), i, j, sum;
    for (i = f + p - 1; i < n; i++) {
      sum = 0;
      for (j = 0; j < p; j++) sum += s[i - j] * (p - j);
      o[i] = sum / denom;
    }
    return o;
  }
  function wildersum(s, p) { return rma(s, p); }
  function maBy(s, p, method) {
    switch (method) {
      case "ema": return ema(s, p);
      case "smma": return rma(s, p);
      case "lwma": return lwma(s, p);
      default: return sma(s, p);
    }
  }
  function hma(s, p) {
    var half = Math.max(1, Math.round(p / 2)), sq = Math.max(1, Math.round(Math.sqrt(p)));
    var a = lwma(s, half), b = lwma(s, p), n = s.length, raw = arr(n), i;
    for (i = 0; i < n; i++) raw[i] = 2 * a[i] - b[i];
    return lwma(raw, sq);
  }
  function dema(s, p) {
    var e1 = ema(s, p), e2 = ema(e1, p), n = s.length, o = arr(n), i;
    for (i = 0; i < n; i++) o[i] = 2 * e1[i] - e2[i];
    return o;
  }
  function tema(s, p) {
    var e1 = ema(s, p), e2 = ema(e1, p), e3 = ema(e2, p), n = s.length, o = arr(n), i;
    for (i = 0; i < n; i++) o[i] = 3 * e1[i] - 3 * e2[i] + e3[i];
    return o;
  }
  function vwma(s, vol, p) {
    var n = s.length, o = arr(n), i, j, a, b;
    for (i = p - 1; i < n; i++) {
      a = 0; b = 0;
      for (j = 0; j < p; j++) { a += s[i - j] * vol[i - j]; b += vol[i - j]; }
      o[i] = b > 0 ? a / b : NaNv;
    }
    return o;
  }
  function kama(s, p, fast, slow) {
    var n = s.length, o = arr(n), i, j, noise, dir, er, sc;
    var fc = 2 / (fast + 1), sc2 = 2 / (slow + 1);
    if (n <= p) return o;
    o[p] = s[p];
    for (i = p + 1; i < n; i++) {
      dir = Math.abs(s[i] - s[i - p]); noise = 0;
      for (j = 0; j < p; j++) noise += Math.abs(s[i - j] - s[i - j - 1]);
      er = noise === 0 ? 0 : dir / noise;
      sc = Math.pow(er * (fc - sc2) + sc2, 2);
      o[i] = o[i - 1] + sc * (s[i] - o[i - 1]);
    }
    return o;
  }
  function stdev(s, p) {
    var n = s.length, o = arr(n), f = first(s), i, j, m, v;
    for (i = f + p - 1; i < n; i++) {
      m = 0; for (j = 0; j < p; j++) m += s[i - j];
      m /= p; v = 0;
      for (j = 0; j < p; j++) v += (s[i - j] - m) * (s[i - j] - m);
      o[i] = Math.sqrt(v / p);
    }
    return o;
  }
  function highest(s, p, off) {
    off = off || 0;
    var n = s.length, o = arr(n), i, j, m;
    for (i = p - 1 + off; i < n; i++) {
      m = -Infinity;
      for (j = 0; j < p; j++) m = Math.max(m, s[i - off - j]);
      o[i] = m;
    }
    return o;
  }
  function lowest(s, p, off) {
    off = off || 0;
    var n = s.length, o = arr(n), i, j, m;
    for (i = p - 1 + off; i < n; i++) {
      m = Infinity;
      for (j = 0; j < p; j++) m = Math.min(m, s[i - off - j]);
      o[i] = m;
    }
    return o;
  }
  function trueRange(d) {
    var n = d.c.length, o = arr(n, 0), i;
    o[0] = d.h[0] - d.l[0];
    for (i = 1; i < n; i++) {
      o[i] = Math.max(d.h[i] - d.l[i], Math.abs(d.h[i] - d.c[i - 1]), Math.abs(d.l[i] - d.c[i - 1]));
    }
    return o;
  }
  function atr(d, p) { return rma(trueRange(d), p); }

  var U = {
    arr: arr, first: first, src: src, sma: sma, ema: ema, rma: rma, lwma: lwma, maBy: maBy, hma: hma,
    dema: dema, tema: tema, vwma: vwma, kama: kama, stdev: stdev, highest: highest,
    lowest: lowest, trueRange: trueRange, atr: atr
  };

  /* ---------------- parameter shorthands ---------------- */
  function P(k, l, def, opt) {
    var o = { k: k, l: l, t: "num", def: def, step: 1, min: 1, max: 100000 };
    if (opt) for (var x in opt) o[x] = opt[x];
    return o;
  }
  var pPrice = { k: "price", l: "Applied price", t: "enum", def: "close", opts: PRICE_FIELDS };
  var pMethod = {
    k: "method", l: "Method", t: "enum", def: "sma",
    opts: [{ k: "sma", l: "Simple" }, { k: "ema", l: "Exponential" }, { k: "smma", l: "Smoothed (Wilder)" }, { k: "lwma", l: "Linear weighted" }]
  };

  /* ============================================================
     INDICATORS
     Each entry: id, name, group, note, params, outs, calc(d, p)
     `calc` returns an object of Float64Array keyed by output id.
     ============================================================ */
  var IND = [

  /* ---- moving averages & trend ---- */
  { id: "ma", name: "Moving average", group: "Trend", note: "Simple, exponential, smoothed or linear-weighted average.",
    params: [P("period", "Period", 20), pMethod, pPrice], outs: [{ k: "main", l: "MA" }],
    calc: function (d, p) { return { main: maBy(src(d, p.price), p.period, p.method) }; } },

  { id: "hma", name: "Hull moving average", group: "Trend", note: "Fast, low-lag average. Turns early, whipsaws in chop.",
    params: [P("period", "Period", 21), pPrice], outs: [{ k: "main", l: "HMA" }],
    calc: function (d, p) { return { main: hma(src(d, p.price), p.period) }; } },

  { id: "dema", name: "DEMA", group: "Trend", note: "Double exponential average — less lag than EMA.",
    params: [P("period", "Period", 21), pPrice], outs: [{ k: "main", l: "DEMA" }],
    calc: function (d, p) { return { main: dema(src(d, p.price), p.period) }; } },

  { id: "tema", name: "TEMA", group: "Trend", note: "Triple exponential average.",
    params: [P("period", "Period", 21), pPrice], outs: [{ k: "main", l: "TEMA" }],
    calc: function (d, p) { return { main: tema(src(d, p.price), p.period) }; } },

  { id: "vwma", name: "Volume weighted MA", group: "Trend", note: "Average weighted by tick volume.",
    params: [P("period", "Period", 20), pPrice], outs: [{ k: "main", l: "VWMA" }],
    calc: function (d, p) { return { main: vwma(src(d, p.price), d.v, p.period) }; } },

  { id: "kama", name: "Kaufman AMA", group: "Trend", note: "Adapts its speed to the efficiency of the move.",
    params: [P("period", "Period", 10), P("fast", "Fast EMA", 2), P("slow", "Slow EMA", 30), pPrice],
    outs: [{ k: "main", l: "KAMA" }],
    calc: function (d, p) { return { main: kama(src(d, p.price), p.period, p.fast, p.slow) }; } },

  { id: "supertrend", name: "SuperTrend", group: "Trend", note: "ATR band that flips with trend. Direction output is +1 up, -1 down.",
    params: [P("period", "ATR period", 10), P("mult", "Multiplier", 3, { t: "num", step: 0.1, min: 0.1, max: 20 })],
    outs: [{ k: "main", l: "Line" }, { k: "dir", l: "Direction (+1/-1)" }],
    calc: function (d, p) {
      var n = d.c.length, a = atr(d, p.period), line = arr(n), dir = arr(n), i;
      var up = arr(n), dn = arr(n), mid;
      for (i = 0; i < n; i++) {
        mid = (d.h[i] + d.l[i]) / 2;
        up[i] = mid + p.mult * a[i];
        dn[i] = mid - p.mult * a[i];
        if (i > 0) {
          if (d.c[i - 1] > up[i - 1]) up[i] = Math.max(up[i], up[i - 1]);
          if (d.c[i - 1] < dn[i - 1]) dn[i] = Math.min(dn[i], dn[i - 1]);
          dir[i] = dir[i - 1] || 1;
          if (d.c[i] > up[i - 1]) dir[i] = 1;
          else if (d.c[i] < dn[i - 1]) dir[i] = -1;
        } else dir[i] = 1;
        line[i] = dir[i] > 0 ? dn[i] : up[i];
      }
      return { main: line, dir: dir };
    } },

  { id: "sar", name: "Parabolic SAR", group: "Trend", note: "Trailing stop-and-reverse dots.",
    params: [P("step", "Step", 0.02, { t: "num", step: 0.001, min: 0.001, max: 1 }), P("max", "Maximum", 0.2, { t: "num", step: 0.01, min: 0.01, max: 1 })],
    outs: [{ k: "main", l: "SAR" }],
    calc: function (d, p) {
      var n = d.c.length, o = arr(n), i, bull = true, af = p.step, ep = d.h[0], s = d.l[0];
      for (i = 1; i < n; i++) {
        s = s + af * (ep - s);
        if (bull) {
          if (d.l[i] < s) { bull = false; s = ep; ep = d.l[i]; af = p.step; }
          else if (d.h[i] > ep) { ep = d.h[i]; af = Math.min(p.max, af + p.step); }
        } else {
          if (d.h[i] > s) { bull = true; s = ep; ep = d.h[i]; af = p.step; }
          else if (d.l[i] < ep) { ep = d.l[i]; af = Math.min(p.max, af + p.step); }
        }
        o[i] = s;
      }
      o[0] = o[1];
      return { main: o };
    } },

  { id: "bbands", name: "Bollinger Bands", group: "Volatility", note: "Average plus and minus N standard deviations.",
    params: [P("period", "Period", 20), P("dev", "Deviations", 2, { t: "num", step: 0.1, min: 0.1, max: 10 }), pPrice],
    outs: [{ k: "upper", l: "Upper" }, { k: "main", l: "Middle" }, { k: "lower", l: "Lower" }],
    calc: function (d, p) {
      var s = src(d, p.price), m = sma(s, p.period), sd = stdev(s, p.period), n = s.length;
      var u = arr(n), l = arr(n), i;
      for (i = 0; i < n; i++) { u[i] = m[i] + p.dev * sd[i]; l[i] = m[i] - p.dev * sd[i]; }
      return { upper: u, main: m, lower: l };
    } },

  { id: "bbwidth", name: "Bollinger width / %B", group: "Volatility", note: "Band width as a share of the middle band, plus %B position inside the bands.",
    params: [P("period", "Period", 20), P("dev", "Deviations", 2, { t: "num", step: 0.1, min: 0.1, max: 10 }), pPrice],
    outs: [{ k: "main", l: "Width %" }, { k: "pctb", l: "%B" }],
    calc: function (d, p) {
      var s = src(d, p.price), m = sma(s, p.period), sd = stdev(s, p.period), n = s.length;
      var w = arr(n), b = arr(n), i, u, lo;
      for (i = 0; i < n; i++) {
        u = m[i] + p.dev * sd[i]; lo = m[i] - p.dev * sd[i];
        w[i] = m[i] ? (u - lo) / m[i] * 100 : NaNv;
        b[i] = (u - lo) ? (s[i] - lo) / (u - lo) * 100 : NaNv;
      }
      return { main: w, pctb: b };
    } },

  { id: "keltner", name: "Keltner channel", group: "Volatility", note: "EMA with ATR bands — smoother than Bollinger.",
    params: [P("period", "EMA period", 20), P("atr", "ATR period", 10), P("mult", "Multiplier", 2, { t: "num", step: 0.1, min: 0.1, max: 10 })],
    outs: [{ k: "upper", l: "Upper" }, { k: "main", l: "Middle" }, { k: "lower", l: "Lower" }],
    calc: function (d, p) {
      var m = ema(d.c, p.period), a = atr(d, p.atr), n = d.c.length, u = arr(n), l = arr(n), i;
      for (i = 0; i < n; i++) { u[i] = m[i] + p.mult * a[i]; l[i] = m[i] - p.mult * a[i]; }
      return { upper: u, main: m, lower: l };
    } },

  { id: "donchian", name: "Donchian channel", group: "Levels", note: "Highest high and lowest low of the last N bars.",
    params: [P("period", "Period", 20), P("exclude", "Skip current bar", 1, { t: "bool", def: 1 })],
    outs: [{ k: "upper", l: "Upper" }, { k: "main", l: "Middle" }, { k: "lower", l: "Lower" }],
    calc: function (d, p) {
      var off = p.exclude ? 1 : 0, u = highest(d.h, p.period, off), l = lowest(d.l, p.period, off);
      var n = d.c.length, m = arr(n), i;
      for (i = 0; i < n; i++) m[i] = (u[i] + l[i]) / 2;
      return { upper: u, main: m, lower: l };
    } },

  { id: "envelopes", name: "Envelopes", group: "Volatility", note: "Moving average shifted by a fixed percentage.",
    params: [P("period", "Period", 14), pMethod, P("dev", "Deviation %", 0.1, { t: "num", step: 0.01, min: 0.01, max: 20 }), pPrice],
    outs: [{ k: "upper", l: "Upper" }, { k: "lower", l: "Lower" }],
    calc: function (d, p) {
      var m = maBy(src(d, p.price), p.period, p.method), n = m.length, u = arr(n), l = arr(n), i;
      for (i = 0; i < n; i++) { u[i] = m[i] * (1 + p.dev / 100); l[i] = m[i] * (1 - p.dev / 100); }
      return { upper: u, lower: l };
    } },

  { id: "ichimoku", name: "Ichimoku", group: "Trend", note: "Tenkan, Kijun and both Senkou spans (cloud), shifted as on the chart.",
    params: [P("tenkan", "Tenkan", 9), P("kijun", "Kijun", 26), P("senkou", "Senkou B", 52)],
    outs: [{ k: "tenkan", l: "Tenkan-sen" }, { k: "kijun", l: "Kijun-sen" }, { k: "spana", l: "Senkou A" }, { k: "spanb", l: "Senkou B" }],
    calc: function (d, p) {
      var n = d.c.length, t = arr(n), k = arr(n), a = arr(n), b = arr(n), i;
      function mid(per, i) {
        if (i < per - 1) return NaNv;
        var hi = -Infinity, lo = Infinity, j;
        for (j = 0; j < per; j++) { hi = Math.max(hi, d.h[i - j]); lo = Math.min(lo, d.l[i - j]); }
        return (hi + lo) / 2;
      }
      for (i = 0; i < n; i++) { t[i] = mid(p.tenkan, i); k[i] = mid(p.kijun, i); }
      for (i = 0; i < n; i++) {
        var sh = i - p.kijun;
        a[i] = sh >= 0 ? (t[sh] + k[sh]) / 2 : NaNv;
        b[i] = sh >= 0 ? mid(p.senkou, sh) : NaNv;
      }
      return { tenkan: t, kijun: k, spana: a, spanb: b };
    } },

  { id: "alligator", name: "Alligator", group: "Trend", note: "Three smoothed averages, each pushed forward.",
    params: [P("jaw", "Jaw period", 13), P("jawS", "Jaw shift", 8, { min: 0 }), P("teeth", "Teeth period", 8), P("teethS", "Teeth shift", 5, { min: 0 }), P("lips", "Lips period", 5), P("lipsS", "Lips shift", 3, { min: 0 })],
    outs: [{ k: "jaw", l: "Jaw" }, { k: "teeth", l: "Teeth" }, { k: "lips", l: "Lips" }],
    calc: function (d, p) {
      var med = src(d, "median"), n = med.length;
      function push(s, sh) { var o = arr(n), i; for (i = 0; i < n; i++) o[i] = (i - sh >= 0 ? s[i - sh] : NaNv); return o; }
      return { jaw: push(rma(med, p.jaw), p.jawS), teeth: push(rma(med, p.teeth), p.teethS), lips: push(rma(med, p.lips), p.lipsS) };
    } },

  { id: "adx", name: "ADX / DMI", group: "Trend", note: "Trend strength plus the two directional lines.",
    params: [P("period", "Period", 14)],
    outs: [{ k: "main", l: "ADX" }, { k: "plus", l: "+DI" }, { k: "minus", l: "-DI" }],
    calc: function (d, p) {
      var n = d.c.length, pd = arr(n, 0), md = arr(n, 0), tr = trueRange(d), i, up, dn;
      for (i = 1; i < n; i++) {
        up = d.h[i] - d.h[i - 1]; dn = d.l[i - 1] - d.l[i];
        pd[i] = (up > dn && up > 0) ? up : 0;
        md[i] = (dn > up && dn > 0) ? dn : 0;
      }
      var str = rma(tr, p.period), sp = rma(pd, p.period), sm = rma(md, p.period);
      var plus = arr(n), minus = arr(n), dx = arr(n);
      for (i = 0; i < n; i++) {
        plus[i] = str[i] ? 100 * sp[i] / str[i] : NaNv;
        minus[i] = str[i] ? 100 * sm[i] / str[i] : NaNv;
        var s = plus[i] + minus[i];
        dx[i] = s ? 100 * Math.abs(plus[i] - minus[i]) / s : NaNv;
      }
      return { main: rma(dx, p.period), plus: plus, minus: minus };
    } },

  { id: "aroon", name: "Aroon", group: "Trend", note: "How recently the highest high and lowest low occurred.",
    params: [P("period", "Period", 14)],
    outs: [{ k: "up", l: "Aroon Up" }, { k: "down", l: "Aroon Down" }, { k: "osc", l: "Oscillator" }],
    calc: function (d, p) {
      var n = d.c.length, u = arr(n), dw = arr(n), o = arr(n), i, j, hi, lo, hidx, lidx;
      for (i = p.period; i < n; i++) {
        hi = -Infinity; lo = Infinity; hidx = 0; lidx = 0;
        for (j = 0; j <= p.period; j++) {
          if (d.h[i - j] > hi) { hi = d.h[i - j]; hidx = j; }
          if (d.l[i - j] < lo) { lo = d.l[i - j]; lidx = j; }
        }
        u[i] = 100 * (p.period - hidx) / p.period;
        dw[i] = 100 * (p.period - lidx) / p.period;
        o[i] = u[i] - dw[i];
      }
      return { up: u, down: dw, osc: o };
    } },

  { id: "vortex", name: "Vortex", group: "Trend", note: "Two lines whose crossings mark trend changes.",
    params: [P("period", "Period", 14)],
    outs: [{ k: "plus", l: "VI+" }, { k: "minus", l: "VI-" }],
    calc: function (d, p) {
      var n = d.c.length, vp = arr(n, 0), vm = arr(n, 0), tr = trueRange(d), i, j, sp, sm, st;
      for (i = 1; i < n; i++) { vp[i] = Math.abs(d.h[i] - d.l[i - 1]); vm[i] = Math.abs(d.l[i] - d.h[i - 1]); }
      var op = arr(n), om = arr(n);
      for (i = p.period; i < n; i++) {
        sp = 0; sm = 0; st = 0;
        for (j = 0; j < p.period; j++) { sp += vp[i - j]; sm += vm[i - j]; st += tr[i - j]; }
        op[i] = st ? sp / st : NaNv; om[i] = st ? sm / st : NaNv;
      }
      return { plus: op, minus: om };
    } },

  { id: "linreg", name: "Linear regression", group: "Trend", note: "Least-squares line value and its slope over N bars.",
    params: [P("period", "Period", 34), pPrice],
    outs: [{ k: "main", l: "Value" }, { k: "slope", l: "Slope" }],
    calc: function (d, p) {
      var s = src(d, p.price), n = s.length, v = arr(n), sl = arr(n), i, j, N = p.period;
      var sx = N * (N - 1) / 2, sxx = (N - 1) * N * (2 * N - 1) / 6;
      for (i = N - 1; i < n; i++) {
        var sy = 0, sxy = 0;
        for (j = 0; j < N; j++) { sy += s[i - j]; sxy += j * s[i - j]; }
        var den = N * sxx - sx * sx;
        var b = den ? (N * sxy - sx * sy) / den : 0;
        var a = (sy - b * sx) / N;
        v[i] = a; sl[i] = -b;
      }
      return { main: v, slope: sl };
    } },

  /* ---- oscillators ---- */
  { id: "rsi", name: "RSI", group: "Oscillator", note: "Relative strength, 0–100. Classic bounds are 30 and 70.",
    params: [P("period", "Period", 14), pPrice], outs: [{ k: "main", l: "RSI" }],
    calc: function (d, p) {
      var s = src(d, p.price), n = s.length, up = arr(n, 0), dn = arr(n, 0), i;
      for (i = 1; i < n; i++) { var ch = s[i] - s[i - 1]; up[i] = ch > 0 ? ch : 0; dn[i] = ch < 0 ? -ch : 0; }
      var au = rma(up, p.period), ad = rma(dn, p.period), o = arr(n);
      for (i = 0; i < n; i++) o[i] = ad[i] === 0 ? 100 : 100 - 100 / (1 + au[i] / ad[i]);
      return { main: o };
    } },

  { id: "stochrsi", name: "Stochastic RSI", group: "Oscillator", note: "Stochastic applied to RSI — faster, noisier.",
    params: [P("rsiP", "RSI period", 14), P("stoP", "Stoch period", 14), P("k", "%K smoothing", 3), P("dP", "%D smoothing", 3)],
    outs: [{ k: "main", l: "%K" }, { k: "signal", l: "%D" }],
    calc: function (d, p) {
      var r = IND_BY.rsi.calc(d, { period: p.rsiP, price: "close" }).main, n = r.length, raw = arr(n), i, j, hi, lo;
      for (i = p.stoP - 1; i < n; i++) {
        hi = -Infinity; lo = Infinity;
        for (j = 0; j < p.stoP; j++) { if (!isNaN(r[i - j])) { hi = Math.max(hi, r[i - j]); lo = Math.min(lo, r[i - j]); } }
        raw[i] = (hi - lo) ? 100 * (r[i] - lo) / (hi - lo) : 0;
      }
      var k = sma(raw, p.k);
      return { main: k, signal: sma(k, p.dP) };
    } },

  { id: "stoch", name: "Stochastic", group: "Oscillator", note: "Where price sits in its recent range.",
    params: [P("k", "%K period", 5), P("d", "%D period", 3), P("slow", "Slowing", 3)],
    outs: [{ k: "main", l: "%K" }, { k: "signal", l: "%D" }],
    calc: function (d, p) {
      var n = d.c.length, raw = arr(n), i, j, hi, lo;
      var num = arr(n, 0), den = arr(n, 0);
      for (i = p.k - 1; i < n; i++) {
        hi = -Infinity; lo = Infinity;
        for (j = 0; j < p.k; j++) { hi = Math.max(hi, d.h[i - j]); lo = Math.min(lo, d.l[i - j]); }
        num[i] = d.c[i] - lo; den[i] = hi - lo;
      }
      var sn = sma(num, p.slow), sd = sma(den, p.slow);
      for (i = 0; i < n; i++) raw[i] = sd[i] ? 100 * sn[i] / sd[i] : NaNv;
      return { main: raw, signal: sma(raw, p.d) };
    } },

  { id: "macd", name: "MACD", group: "Oscillator", note: "Fast EMA minus slow EMA, with its signal line and histogram.",
    params: [P("fast", "Fast EMA", 12), P("slow", "Slow EMA", 26), P("signal", "Signal", 9), pPrice],
    outs: [{ k: "main", l: "MACD" }, { k: "signal", l: "Signal" }, { k: "hist", l: "Histogram" }],
    calc: function (d, p) {
      var s = src(d, p.price), f = ema(s, p.fast), sl = ema(s, p.slow), n = s.length, m = arr(n), i;
      for (i = 0; i < n; i++) m[i] = f[i] - sl[i];
      var sig = ema(m, p.signal), h = arr(n);
      for (i = 0; i < n; i++) h[i] = m[i] - sig[i];
      return { main: m, signal: sig, hist: h };
    } },

  { id: "osma", name: "OsMA", group: "Oscillator", note: "MACD minus its signal line, on its own scale.",
    params: [P("fast", "Fast EMA", 12), P("slow", "Slow EMA", 26), P("signal", "Signal", 9), pPrice],
    outs: [{ k: "main", l: "OsMA" }],
    calc: function (d, p) { return { main: IND_BY.macd.calc(d, p).hist }; } },

  { id: "cci", name: "CCI", group: "Oscillator", note: "Deviation from the typical-price average, ±100 is the usual band.",
    params: [P("period", "Period", 14), pPrice], outs: [{ k: "main", l: "CCI" }],
    calc: function (d, p) {
      var s = src(d, p.price === "close" ? "typical" : p.price), n = s.length, m = sma(s, p.period), o = arr(n), i, j, dev;
      for (i = p.period - 1; i < n; i++) {
        dev = 0; for (j = 0; j < p.period; j++) dev += Math.abs(s[i - j] - m[i]);
        dev /= p.period;
        o[i] = dev ? (s[i] - m[i]) / (0.015 * dev) : 0;
      }
      return { main: o };
    } },

  { id: "wpr", name: "Williams %R", group: "Oscillator", note: "Inverted stochastic, -100 to 0.",
    params: [P("period", "Period", 14)], outs: [{ k: "main", l: "%R" }],
    calc: function (d, p) {
      var n = d.c.length, o = arr(n), i, j, hi, lo;
      for (i = p.period - 1; i < n; i++) {
        hi = -Infinity; lo = Infinity;
        for (j = 0; j < p.period; j++) { hi = Math.max(hi, d.h[i - j]); lo = Math.min(lo, d.l[i - j]); }
        o[i] = (hi - lo) ? -100 * (hi - d.c[i]) / (hi - lo) : 0;
      }
      return { main: o };
    } },

  { id: "momentum", name: "Momentum", group: "Oscillator", note: "Price now as a percentage of price N bars ago.",
    params: [P("period", "Period", 14), pPrice], outs: [{ k: "main", l: "Momentum" }],
    calc: function (d, p) {
      var s = src(d, p.price), n = s.length, o = arr(n), i;
      for (i = p.period; i < n; i++) o[i] = s[i - p.period] ? s[i] / s[i - p.period] * 100 : NaNv;
      return { main: o };
    } },

  { id: "roc", name: "Rate of change", group: "Oscillator", note: "Percent change over N bars, zero-centred.",
    params: [P("period", "Period", 14), pPrice], outs: [{ k: "main", l: "ROC %" }],
    calc: function (d, p) {
      var s = src(d, p.price), n = s.length, o = arr(n), i;
      for (i = p.period; i < n; i++) o[i] = s[i - p.period] ? (s[i] - s[i - p.period]) / s[i - p.period] * 100 : NaNv;
      return { main: o };
    } },

  { id: "cmo", name: "Chande momentum", group: "Oscillator", note: "Momentum oscillator between -100 and +100.",
    params: [P("period", "Period", 14), pPrice], outs: [{ k: "main", l: "CMO" }],
    calc: function (d, p) {
      var s = src(d, p.price), n = s.length, o = arr(n), i, j, up, dn, ch;
      for (i = p.period; i < n; i++) {
        up = 0; dn = 0;
        for (j = 0; j < p.period; j++) { ch = s[i - j] - s[i - j - 1]; if (ch > 0) up += ch; else dn -= ch; }
        o[i] = (up + dn) ? 100 * (up - dn) / (up + dn) : 0;
      }
      return { main: o };
    } },

  { id: "trix", name: "TRIX", group: "Oscillator", note: "Rate of change of a triple-smoothed EMA.",
    params: [P("period", "Period", 14), pPrice], outs: [{ k: "main", l: "TRIX" }],
    calc: function (d, p) {
      var s = src(d, p.price), e = ema(ema(ema(s, p.period), p.period), p.period), n = s.length, o = arr(n), i;
      for (i = 1; i < n; i++) o[i] = e[i - 1] ? (e[i] - e[i - 1]) / e[i - 1] * 10000 : NaNv;
      return { main: o };
    } },

  { id: "ao", name: "Awesome oscillator", group: "Oscillator", note: "SMA5 minus SMA34 of the median price.",
    params: [], outs: [{ k: "main", l: "AO" }],
    calc: function (d) {
      var m = src(d, "median"), a = sma(m, 5), b = sma(m, 34), n = m.length, o = arr(n), i;
      for (i = 0; i < n; i++) o[i] = a[i] - b[i];
      return { main: o };
    } },

  { id: "ac", name: "Accelerator", group: "Oscillator", note: "AO minus its own 5-period average.",
    params: [], outs: [{ k: "main", l: "AC" }],
    calc: function (d) {
      var ao = IND_BY.ao.calc(d).main, s = sma(ao, 5), n = ao.length, o = arr(n), i;
      for (i = 0; i < n; i++) o[i] = ao[i] - s[i];
      return { main: o };
    } },

  { id: "demarker", name: "DeMarker", group: "Oscillator", note: "0–1 exhaustion measure built from bar extremes.",
    params: [P("period", "Period", 14)], outs: [{ k: "main", l: "DeM" }],
    calc: function (d, p) {
      var n = d.c.length, dmax = arr(n, 0), dmin = arr(n, 0), i;
      for (i = 1; i < n; i++) {
        dmax[i] = Math.max(0, d.h[i] - d.h[i - 1]);
        dmin[i] = Math.max(0, d.l[i - 1] - d.l[i]);
      }
      var a = sma(dmax, p.period), b = sma(dmin, p.period), o = arr(n);
      for (i = 0; i < n; i++) o[i] = (a[i] + b[i]) ? a[i] / (a[i] + b[i]) : NaNv;
      return { main: o };
    } },

  { id: "rvi", name: "Relative vigour", group: "Oscillator", note: "Close-open versus high-low, with a signal line.",
    params: [P("period", "Period", 10)], outs: [{ k: "main", l: "RVI" }, { k: "signal", l: "Signal" }],
    calc: function (d, p) {
      var n = d.c.length, num = arr(n, 0), den = arr(n, 0), i;
      for (i = 3; i < n; i++) {
        num[i] = ((d.c[i] - d.o[i]) + 2 * (d.c[i - 1] - d.o[i - 1]) + 2 * (d.c[i - 2] - d.o[i - 2]) + (d.c[i - 3] - d.o[i - 3])) / 6;
        den[i] = ((d.h[i] - d.l[i]) + 2 * (d.h[i - 1] - d.l[i - 1]) + 2 * (d.h[i - 2] - d.l[i - 2]) + (d.h[i - 3] - d.l[i - 3])) / 6;
      }
      var a = sma(num, p.period), b = sma(den, p.period), m = arr(n), sig = arr(n);
      for (i = 0; i < n; i++) m[i] = b[i] ? a[i] / b[i] : NaNv;
      for (i = 3; i < n; i++) sig[i] = (m[i] + 2 * m[i - 1] + 2 * m[i - 2] + m[i - 3]) / 6;
      return { main: m, signal: sig };
    } },

  { id: "uo", name: "Ultimate oscillator", group: "Oscillator", note: "Three timeframes of buying pressure in one line.",
    params: [P("p1", "Fast", 7), P("p2", "Middle", 14), P("p3", "Slow", 28)],
    outs: [{ k: "main", l: "UO" }],
    calc: function (d, p) {
      var n = d.c.length, bp = arr(n, 0), tr = arr(n, 0), i, j, o = arr(n);
      for (i = 1; i < n; i++) {
        var tl = Math.min(d.l[i], d.c[i - 1]), th = Math.max(d.h[i], d.c[i - 1]);
        bp[i] = d.c[i] - tl; tr[i] = th - tl;
      }
      function avg(i, per) { var a = 0, b = 0, j; for (j = 0; j < per; j++) { a += bp[i - j]; b += tr[i - j]; } return b ? a / b : 0; }
      for (i = p.p3; i < n; i++) o[i] = 100 * (4 * avg(i, p.p1) + 2 * avg(i, p.p2) + avg(i, p.p3)) / 7;
      return { main: o };
    } },

  { id: "fisher", name: "Fisher transform", group: "Oscillator", note: "Sharp turning points from a normalised price.",
    params: [P("period", "Period", 10)], outs: [{ k: "main", l: "Fisher" }, { k: "signal", l: "Trigger" }],
    calc: function (d, p) {
      var med = src(d, "median"), n = med.length, o = arr(n, 0), v = 0, i, j, hi, lo, x;
      for (i = p.period - 1; i < n; i++) {
        hi = -Infinity; lo = Infinity;
        for (j = 0; j < p.period; j++) { hi = Math.max(hi, med[i - j]); lo = Math.min(lo, med[i - j]); }
        x = (hi - lo) ? 2 * ((med[i] - lo) / (hi - lo) - 0.5) : 0;
        v = 0.33 * 2 * x + 0.67 * v;
        v = Math.max(-0.999, Math.min(0.999, v));
        o[i] = 0.5 * Math.log((1 + v) / (1 - v)) + 0.5 * (o[i - 1] || 0);
      }
      var sig = arr(n);
      for (i = 1; i < n; i++) sig[i] = o[i - 1];
      return { main: o, signal: sig };
    } },

  { id: "bears", name: "Bears power", group: "Oscillator", note: "Low minus an EMA — how far sellers pushed.",
    params: [P("period", "Period", 13)], outs: [{ k: "main", l: "Bears" }],
    calc: function (d, p) { var e = ema(d.c, p.period), n = d.c.length, o = arr(n), i; for (i = 0; i < n; i++) o[i] = d.l[i] - e[i]; return { main: o }; } },

  { id: "bulls", name: "Bulls power", group: "Oscillator", note: "High minus an EMA — how far buyers pushed.",
    params: [P("period", "Period", 13)], outs: [{ k: "main", l: "Bulls" }],
    calc: function (d, p) { var e = ema(d.c, p.period), n = d.c.length, o = arr(n), i; for (i = 0; i < n; i++) o[i] = d.h[i] - e[i]; return { main: o }; } },

  { id: "force", name: "Force index", group: "Volume", note: "Price change multiplied by volume, smoothed.",
    params: [P("period", "Period", 13), pMethod], outs: [{ k: "main", l: "Force" }],
    calc: function (d, p) {
      var n = d.c.length, r = arr(n, 0), i;
      for (i = 1; i < n; i++) r[i] = d.v[i] * (d.c[i] - d.c[i - 1]);
      return { main: maBy(r, p.period, p.method) };
    } },

  /* ---- volatility & volume ---- */
  { id: "atr", name: "ATR", group: "Volatility", note: "Average true range — the workhorse for stops and sizing.",
    params: [P("period", "Period", 14)], outs: [{ k: "main", l: "ATR" }],
    calc: function (d, p) { return { main: atr(d, p.period) }; } },

  { id: "natr", name: "Normalised ATR", group: "Volatility", note: "ATR as a percentage of price — comparable across symbols.",
    params: [P("period", "Period", 14)], outs: [{ k: "main", l: "NATR %" }],
    calc: function (d, p) { var a = atr(d, p.period), n = a.length, o = arr(n), i; for (i = 0; i < n; i++) o[i] = d.c[i] ? a[i] / d.c[i] * 100 : NaNv; return { main: o }; } },

  { id: "stddev", name: "Standard deviation", group: "Volatility", note: "Dispersion of price around its average.",
    params: [P("period", "Period", 20), pPrice], outs: [{ k: "main", l: "StdDev" }],
    calc: function (d, p) { return { main: stdev(src(d, p.price), p.period) }; } },

  { id: "volume", name: "Volume", group: "Volume", note: "Tick volume, with an optional average to compare against.",
    params: [P("period", "Average period", 20)], outs: [{ k: "main", l: "Volume" }, { k: "avg", l: "Average" }],
    calc: function (d, p) { return { main: d.v, avg: sma(d.v, p.period) }; } },

  { id: "obv", name: "On balance volume", group: "Volume", note: "Running volume total, signed by the close.",
    params: [], outs: [{ k: "main", l: "OBV" }],
    calc: function (d) {
      var n = d.c.length, o = arr(n, 0), i;
      for (i = 1; i < n; i++) o[i] = o[i - 1] + (d.c[i] > d.c[i - 1] ? d.v[i] : d.c[i] < d.c[i - 1] ? -d.v[i] : 0);
      return { main: o };
    } },

  { id: "mfi", name: "Money flow index", group: "Volume", note: "Volume-weighted RSI, 0–100.",
    params: [P("period", "Period", 14)], outs: [{ k: "main", l: "MFI" }],
    calc: function (d, p) {
      var tp = src(d, "typical"), n = tp.length, pos = arr(n, 0), neg = arr(n, 0), i, j, a, b, o = arr(n);
      for (i = 1; i < n; i++) {
        if (tp[i] > tp[i - 1]) pos[i] = tp[i] * d.v[i];
        else if (tp[i] < tp[i - 1]) neg[i] = tp[i] * d.v[i];
      }
      for (i = p.period; i < n; i++) {
        a = 0; b = 0;
        for (j = 0; j < p.period; j++) { a += pos[i - j]; b += neg[i - j]; }
        o[i] = b ? 100 - 100 / (1 + a / b) : 100;
      }
      return { main: o };
    } },

  { id: "ad", name: "Accumulation / distribution", group: "Volume", note: "Volume weighted by where the close sits in the bar.",
    params: [], outs: [{ k: "main", l: "A/D" }],
    calc: function (d) {
      var n = d.c.length, o = arr(n, 0), i, r, m;
      for (i = 1; i < n; i++) {
        r = d.h[i] - d.l[i];
        m = r ? ((d.c[i] - d.l[i]) - (d.h[i] - d.c[i])) / r : 0;
        o[i] = o[i - 1] + m * d.v[i];
      }
      return { main: o };
    } },

  { id: "vwap", name: "Session VWAP", group: "Levels", note: "Volume weighted average price, reset at the start of each day.",
    params: [], outs: [{ k: "main", l: "VWAP" }],
    calc: function (d) {
      var n = d.c.length, tp = src(d, "typical"), o = arr(n), i, pv = 0, vv = 0, day = -1, cur;
      for (i = 0; i < n; i++) {
        cur = Math.floor(d.t[i] / 86400000);
        if (cur !== day) { day = cur; pv = 0; vv = 0; }
        pv += tp[i] * d.v[i]; vv += d.v[i];
        o[i] = vv ? pv / vv : tp[i];
      }
      return { main: o };
    } },

  /* ---- structure & levels ---- */
  { id: "hhll", name: "Highest high / lowest low", group: "Levels", note: "Breakout levels over a lookback window.",
    params: [P("period", "Lookback bars", 20), P("exclude", "Skip current bar", 1, { t: "bool", def: 1 })],
    outs: [{ k: "hh", l: "Highest high" }, { k: "ll", l: "Lowest low" }, { k: "mid", l: "Midpoint" }],
    calc: function (d, p) {
      var off = p.exclude ? 1 : 0, u = highest(d.h, p.period, off), l = lowest(d.l, p.period, off), n = d.c.length, m = arr(n), i;
      for (i = 0; i < n; i++) m[i] = (u[i] + l[i]) / 2;
      return { hh: u, ll: l, mid: m };
    } },

  { id: "fractals", name: "Fractals (swing points)", group: "Levels", note: "Most recent confirmed swing high and swing low.",
    params: [P("wing", "Bars each side", 2, { min: 1, max: 20 })],
    outs: [{ k: "high", l: "Last swing high" }, { k: "low", l: "Last swing low" }],
    calc: function (d, p) {
      var n = d.c.length, hi = arr(n), lo = arr(n), i, j, w = p.wing, isH, isL, lastH = NaNv, lastL = NaNv;
      for (i = 0; i < n; i++) {
        var c = i - w;
        if (c >= w) {
          isH = true; isL = true;
          for (j = 1; j <= w; j++) {
            if (d.h[c] <= d.h[c - j] || d.h[c] <= d.h[c + j]) isH = false;
            if (d.l[c] >= d.l[c - j] || d.l[c] >= d.l[c + j]) isL = false;
          }
          if (isH) lastH = d.h[c];
          if (isL) lastL = d.l[c];
        }
        hi[i] = lastH; lo[i] = lastL;
      }
      return { high: hi, low: lo };
    } },

  { id: "fib", name: "Fibonacci level", group: "Levels", note: "Retracement or extension of the last swing, as a live price level.",
    params: [
      P("period", "Swing lookback", 50),
      { k: "level", l: "Level", t: "enum", def: "61.8", opts: [
        { k: "0", l: "0%" }, { k: "23.6", l: "23.6%" }, { k: "38.2", l: "38.2%" }, { k: "50", l: "50%" },
        { k: "61.8", l: "61.8%" }, { k: "78.6", l: "78.6%" }, { k: "100", l: "100%" },
        { k: "127.2", l: "127.2% ext" }, { k: "161.8", l: "161.8% ext" }, { k: "261.8", l: "261.8% ext" }] },
      { k: "dir", l: "Swing direction", t: "enum", def: "auto", opts: [
        { k: "auto", l: "Auto (last leg)" }, { k: "up", l: "Up leg (low → high)" }, { k: "down", l: "Down leg (high → low)" }] }
    ],
    outs: [{ k: "main", l: "Level price" }, { k: "hi", l: "Swing high" }, { k: "lo", l: "Swing low" }],
    calc: function (d, p) {
      var n = d.c.length, o = arr(n), oh = arr(n), ol = arr(n), i, j, hi, lo, hidx, lidx, lvl = parseFloat(p.level) / 100, up;
      for (i = p.period; i < n; i++) {
        hi = -Infinity; lo = Infinity; hidx = i; lidx = i;
        for (j = 0; j < p.period; j++) {
          if (d.h[i - j] > hi) { hi = d.h[i - j]; hidx = i - j; }
          if (d.l[i - j] < lo) { lo = d.l[i - j]; lidx = i - j; }
        }
        up = p.dir === "up" ? true : p.dir === "down" ? false : hidx > lidx;
        oh[i] = hi; ol[i] = lo;
        o[i] = up ? hi - (hi - lo) * lvl : lo + (hi - lo) * lvl;
      }
      return { main: o, hi: oh, lo: ol };
    } },

  { id: "pivot", name: "Pivot points", group: "Levels", note: "Daily floor pivots — classic, Fibonacci, Camarilla or Woodie.",
    params: [
      { k: "kind", l: "Formula", t: "enum", def: "classic", opts: [
        { k: "classic", l: "Classic" }, { k: "fib", l: "Fibonacci" }, { k: "cam", l: "Camarilla" }, { k: "wood", l: "Woodie" }] },
      { k: "period", l: "Based on", t: "enum", def: "day", opts: [{ k: "day", l: "Previous day" }, { k: "week", l: "Previous week" }] }
    ],
    outs: [{ k: "pp", l: "Pivot" }, { k: "r1", l: "R1" }, { k: "r2", l: "R2" }, { k: "r3", l: "R3" },
           { k: "s1", l: "S1" }, { k: "s2", l: "S2" }, { k: "s3", l: "S3" }],
    calc: function (d, p) {
      var n = d.c.length, out = {}, keys = ["pp", "r1", "r2", "r3", "s1", "s2", "s3"], i, k;
      keys.forEach(function (k) { out[k] = arr(n); });
      var bucket = -1, ph = -Infinity, pl = Infinity, pc = NaNv, ch = -Infinity, cl = Infinity, co = NaNv, cc = NaNv, cur;
      var div = p.period === "week" ? 604800000 : 86400000;
      for (i = 0; i < n; i++) {
        cur = Math.floor(d.t[i] / div);
        if (cur !== bucket) {
          if (bucket >= 0) { ph = ch; pl = cl; pc = cc; }
          bucket = cur; ch = -Infinity; cl = Infinity; co = d.o[i];
        }
        ch = Math.max(ch, d.h[i]); cl = Math.min(cl, d.l[i]); cc = d.c[i];
        if (isNaN(pc)) continue;
        var rng = ph - pl, pp;
        if (p.kind === "wood") pp = (ph + pl + 2 * co) / 4; else pp = (ph + pl + pc) / 3;
        var r1, r2, r3, s1, s2, s3;
        if (p.kind === "fib") {
          r1 = pp + 0.382 * rng; r2 = pp + 0.618 * rng; r3 = pp + rng;
          s1 = pp - 0.382 * rng; s2 = pp - 0.618 * rng; s3 = pp - rng;
        } else if (p.kind === "cam") {
          r1 = pc + rng * 1.1 / 12; r2 = pc + rng * 1.1 / 6; r3 = pc + rng * 1.1 / 4;
          s1 = pc - rng * 1.1 / 12; s2 = pc - rng * 1.1 / 6; s3 = pc - rng * 1.1 / 4;
        } else {
          r1 = 2 * pp - pl; s1 = 2 * pp - ph;
          r2 = pp + rng; s2 = pp - rng;
          r3 = ph + 2 * (pp - pl); s3 = pl - 2 * (ph - pp);
        }
        out.pp[i] = pp; out.r1[i] = r1; out.r2[i] = r2; out.r3[i] = r3;
        out.s1[i] = s1; out.s2[i] = s2; out.s3[i] = s3;
      }
      return out;
    } },

  { id: "dayohlc", name: "Previous day / week levels", group: "Levels", note: "Yesterday's open, high, low and close as levels.",
    params: [{ k: "period", l: "Window", t: "enum", def: "day", opts: [{ k: "day", l: "Day" }, { k: "week", l: "Week" }] }],
    outs: [{ k: "o", l: "Open" }, { k: "h", l: "High" }, { k: "l", l: "Low" }, { k: "c", l: "Close" }],
    calc: function (d, p) {
      var n = d.c.length, out = { o: arr(n), h: arr(n), l: arr(n), c: arr(n) }, i;
      var div = p.period === "week" ? 604800000 : 86400000;
      var bucket = -1, co = NaNv, ch = -Infinity, cl = Infinity, cc = NaNv, po = NaNv, ph = NaNv, pl = NaNv, pc = NaNv, cur;
      for (i = 0; i < n; i++) {
        cur = Math.floor(d.t[i] / div);
        if (cur !== bucket) {
          if (bucket >= 0) { po = co; ph = ch; pl = cl; pc = cc; }
          bucket = cur; co = d.o[i]; ch = -Infinity; cl = Infinity;
        }
        ch = Math.max(ch, d.h[i]); cl = Math.min(cl, d.l[i]); cc = d.c[i];
        out.o[i] = po; out.h[i] = ph; out.l[i] = pl; out.c[i] = pc;
      }
      return out;
    } },

  { id: "session", name: "Session range", group: "Levels", note: "High and low of a chosen trading session, in server time.",
    params: [P("from", "Start hour", 0, { min: 0, max: 23 }), P("to", "End hour", 8, { min: 0, max: 23 })],
    outs: [{ k: "high", l: "Session high" }, { k: "low", l: "Session low" }],
    calc: function (d, p) {
      var n = d.c.length, hi = arr(n), lo = arr(n), i, day = -1, ch = NaNv, cl = NaNv, h, cur;
      for (i = 0; i < n; i++) {
        cur = Math.floor(d.t[i] / 86400000);
        if (cur !== day) { day = cur; ch = NaNv; cl = NaNv; }
        h = new Date(d.t[i]).getUTCHours();
        var inS = p.from <= p.to ? (h >= p.from && h < p.to) : (h >= p.from || h < p.to);
        if (inS) {
          ch = isNaN(ch) ? d.h[i] : Math.max(ch, d.h[i]);
          cl = isNaN(cl) ? d.l[i] : Math.min(cl, d.l[i]);
        }
        hi[i] = ch; lo[i] = cl;
      }
      return { high: hi, low: lo };
    } },

  { id: "round", name: "Round number level", group: "Levels", note: "Nearest psychological level above and below price.",
    params: [P("stepPips", "Grid (pips)", 50, { min: 1, max: 100000 })],
    outs: [{ k: "above", l: "Level above" }, { k: "below", l: "Level below" }],
    calc: function (d, p, ctx) {
      var n = d.c.length, a = arr(n), b = arr(n), i, st = p.stepPips * (ctx && ctx.pip ? ctx.pip : 0.0001);
      for (i = 0; i < n; i++) { b[i] = Math.floor(d.c[i] / st) * st; a[i] = b[i] + st; }
      return { above: a, below: b };
    } },

  { id: "spread", name: "Spread", group: "Levels", note: "Current spread in points. In the backtest this is your assumed spread.",
    params: [], outs: [{ k: "main", l: "Spread (points)" }],
    calc: function (d, p, ctx) {
      var n = d.c.length, o = arr(n, 0), i, s = ctx && ctx.spreadPoints ? ctx.spreadPoints : 0;
      for (i = 0; i < n; i++) o[i] = s;
      return { main: o };
    } }
  ];

  var IND_BY = {};
  IND.forEach(function (x) { IND_BY[x.id] = x; });

  window.EA = window.EA || {};
  window.EA.U = U;
  window.EA.PRICE_FIELDS = PRICE_FIELDS;
  window.EA.IND = IND;
  window.EA.IND_BY = IND_BY;
})();
