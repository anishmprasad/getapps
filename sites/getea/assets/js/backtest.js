/* ============================================================
   GetEA — in-browser backtester.
   Reads an OHLC CSV, runs the same rules the generated robot
   will run, and reports what would have happened. Everything
   stays in this tab: the file is never uploaded anywhere.

   It is a bar-by-bar simulation, not a tick engine, so treat the
   numbers as an order-of-magnitude sanity check on the logic —
   not as a promise about live trading.
   ============================================================ */
(function () {
  "use strict";
  var EA = window.EA;

  /* ---------------- instrument presets ---------------- */
  var INSTRUMENTS = [
    { k: "fx4",   l: "Forex, 4-digit pip (EURUSD, GBPUSD…)", pip: 0.0001, pipValue: 10,  digits: 5 },
    { k: "fxjpy", l: "Forex JPY pair (USDJPY, EURJPY…)",     pip: 0.01,   pipValue: 9.2, digits: 3 },
    { k: "gold",  l: "Gold XAUUSD (100 oz lot)",             pip: 0.1,    pipValue: 10,  digits: 2 },
    { k: "silver",l: "Silver XAGUSD (5000 oz lot)",          pip: 0.01,   pipValue: 50,  digits: 3 },
    { k: "index", l: "Index CFD (US30, NAS100, DAX…)",       pip: 1,      pipValue: 1,   digits: 1 },
    { k: "oil",   l: "Oil WTI/Brent (1000 barrel lot)",      pip: 0.01,   pipValue: 10,  digits: 2 },
    { k: "crypto",l: "Crypto (BTCUSD, 1 coin lot)",          pip: 1,      pipValue: 1,   digits: 2 },
    { k: "custom",l: "Custom — set pip size and value below", pip: 0.0001, pipValue: 10, digits: 5 }
  ];

  /* ---------------- CSV parsing ---------------- */
  var MONTH_RE = /^\d{4}[-./]\d{1,2}[-./]\d{1,2}$/;

  function sniffDelimiter(line) {
    var best = ",", n = -1;
    [",", ";", "\t", "|"].forEach(function (d) {
      var c = line.split(d).length;
      if (c > n) { n = c; best = d; }
    });
    return best;
  }

  function parseDate(dateStr, timeStr) {
    var s = String(dateStr).trim().replace(/^"|"$/g, "");
    var t = timeStr ? String(timeStr).trim().replace(/^"|"$/g, "") : "";
    if (/^\d{10}$/.test(s)) return parseInt(s, 10) * 1000;
    if (/^\d{13}$/.test(s)) return parseInt(s, 10);
    if (s.indexOf("T") > 0 || (s.indexOf(":") > 0 && !t)) {
      var iso = Date.parse(s.replace(" ", "T").replace(/(?:Z|[+-]\d{2}:?\d{2})$/, "") + "Z");
      if (!isNaN(iso)) return iso;
    }
    var m = s.match(/^(\d{4})[-./](\d{1,2})[-./](\d{1,2})$/);
    var y, mo, dy;
    if (m) { y = +m[1]; mo = +m[2]; dy = +m[3]; }
    else {
      m = s.match(/^(\d{1,2})[-./](\d{1,2})[-./](\d{4})$/);
      if (!m) return NaN;
      dy = +m[1]; mo = +m[2]; y = +m[3];
      if (dy > 12) { /* dd/mm/yyyy */ } else { /* ambiguous — assume dd/mm */ }
    }
    var hh = 0, mi = 0, ss = 0;
    if (t) {
      var tp = t.split(":");
      hh = parseInt(tp[0], 10) || 0; mi = parseInt(tp[1], 10) || 0; ss = parseInt(tp[2], 10) || 0;
    }
    return Date.UTC(y, mo - 1, dy, hh, mi, ss);
  }

  function parseCSV(text, limit) {
    var out = { errors: [], warnings: [] };
    text = String(text).replace(/^﻿/, "");
    var lines = text.split(/\r\n|\n|\r/).filter(function (l) { return l.trim().length; });
    if (lines.length < 20) { out.errors.push("Need at least 20 rows of data — this file has " + lines.length + "."); return out; }

    var delim = sniffDelimiter(lines[0]);
    var first = lines[0].split(delim).map(function (x) { return x.trim().replace(/^"|"$/g, ""); });
    var hasHeader = first.some(function (c) { return c && isNaN(Number(c)) && !MONTH_RE.test(c) && c.indexOf(":") < 0; });

    var idx = { date: -1, time: -1, o: -1, h: -1, l: -1, c: -1, v: -1 };
    if (hasHeader) {
      first.forEach(function (name, k) {
        var v = name.toLowerCase().replace(/[^a-z]/g, "");
        if (/^(date|datetime|timestamp|time)$/.test(v) && idx.date < 0) idx.date = k;
        else if (v === "time" && idx.date >= 0 && idx.time < 0) idx.time = k;
        else if (/^(open|o)$/.test(v)) idx.o = k;
        else if (/^(high|h)$/.test(v)) idx.h = k;
        else if (/^(low|l)$/.test(v)) idx.l = k;
        else if (/^(close|c|last|price)$/.test(v)) idx.c = k;
        else if (/^(volume|vol|v|tickvol|tickvolume)$/.test(v) && idx.v < 0) idx.v = k;
      });
    }
    var body = hasHeader ? lines.slice(1) : lines;
    if (idx.o < 0 || idx.h < 0 || idx.l < 0 || idx.c < 0) {
      /* positional fallback: MetaTrader export shapes */
      var probe = body[0].split(delim);
      if (probe.length >= 7 && probe[1].indexOf(":") > 0) { idx = { date: 0, time: 1, o: 2, h: 3, l: 4, c: 5, v: 6 }; }
      else if (probe.length >= 6) { idx = { date: 0, time: -1, o: 1, h: 2, l: 3, c: 4, v: 5 }; }
      else if (probe.length >= 5) { idx = { date: 0, time: -1, o: 1, h: 2, l: 3, c: 4, v: -1 }; }
      else { out.errors.push("Could not find open/high/low/close columns. Expected a header row or date,open,high,low,close,volume."); return out; }
      out.warnings.push("No usable header — read the columns positionally as " +
        (idx.time >= 0 ? "date, time, " : "date, ") + "open, high, low, close" + (idx.v >= 0 ? ", volume." : "."));
    }

    var n = body.length;
    if (limit && n > limit) { body = body.slice(n - limit); out.warnings.push("Using the most recent " + limit.toLocaleString() + " of " + n.toLocaleString() + " rows."); n = limit; }

    var o = new Float64Array(n), h = new Float64Array(n), l = new Float64Array(n),
        c = new Float64Array(n), v = new Float64Array(n), t = new Float64Array(n);
    var w = 0, bad = 0;
    for (var k = 0; k < n; k++) {
      var f = body[k].split(delim);
      var to = parseFloat(f[idx.o]), th = parseFloat(f[idx.h]), tl = parseFloat(f[idx.l]), tc = parseFloat(f[idx.c]);
      var tt = parseDate(f[idx.date], idx.time >= 0 ? f[idx.time] : "");
      if (!isFinite(to) || !isFinite(th) || !isFinite(tl) || !isFinite(tc) || !isFinite(tt)) { bad++; continue; }
      if (th < tl) { var sw = th; th = tl; tl = sw; }
      o[w] = to; h[w] = Math.max(th, to, tc); l[w] = Math.min(tl, to, tc); c[w] = tc;
      v[w] = idx.v >= 0 ? (parseFloat(f[idx.v]) || 1) : 1;
      t[w] = tt;
      w++;
    }
    if (w < 20) { out.errors.push("Only " + w + " rows parsed cleanly — check the date format and column order."); return out; }
    if (bad) out.warnings.push(bad.toLocaleString() + " row(s) skipped as unreadable.");

    var d = { o: o.slice(0, w), h: h.slice(0, w), l: l.slice(0, w), c: c.slice(0, w), v: v.slice(0, w), t: t.slice(0, w) };
    /* ensure chronological order */
    if (d.t[0] > d.t[w - 1]) {
      ["o", "h", "l", "c", "v", "t"].forEach(function (key) { d[key] = d[key].slice().reverse(); });
      out.warnings.push("File was newest-first — reversed into chronological order.");
    }

    var gaps = [];
    for (var q = 1; q < Math.min(w, 400); q++) gaps.push(d.t[q] - d.t[q - 1]);
    gaps.sort(function (a, b) { return a - b; });
    var tfMs = gaps[Math.floor(gaps.length / 2)] || 3600000;

    out.d = d;
    out.meta = {
      rows: w, from: d.t[0], to: d.t[w - 1],
      tfMinutes: Math.round(tfMs / 60000),
      digits: (String(d.c[0]).split(".")[1] || "").length,
      delim: delim === "\t" ? "tab" : delim
    };
    return out;
  }

  /* ---------------- rule evaluation ---------------- */
  function compile(st, d, ctx) {
    var cache = {};
    function series(op) {
      var key = op.id + "|" + JSON.stringify(op.p || {});
      if (!cache[key]) {
        var def = EA.IND_BY[op.id];
        var p = Object.assign({}, EA.CG.defaults(def), op.p || {});
        cache[key] = def.calc(d, p, ctx);
      }
      return cache[key];
    }
    function val(op) {
      if (!op) return function () { return 0; };
      if (op.t === "const") { var cv = Number(op.value) || 0; return function () { return cv; }; }
      if (op.t === "price") {
        var sh = op.shift || 0, fld = op.field;
        return function (i) {
          var k = i - sh;
          if (k < 0) return NaN;
          if (fld === "median") return (d.h[k] + d.l[k]) / 2;
          if (fld === "typical") return (d.h[k] + d.l[k] + d.c[k]) / 3;
          if (fld === "weighted") return (d.h[k] + d.l[k] + 2 * d.c[k]) / 4;
          return d[fld === "open" ? "o" : fld === "high" ? "h" : fld === "low" ? "l" : "c"][k];
        };
      }
      var def = EA.IND_BY[op.id];
      if (!def) return function () { return NaN; };
      var out = op.out || def.outs[0].k, sh2 = op.shift || 0;
      var arr = series(op)[out];
      return function (i) { var k = i - sh2; return k >= 0 && arr ? arr[k] : NaN; };
    }

    function cond(c) {
      if (!c) return function () { return false; };
      if (c.kind === "pattern") {
        var pid = c.pid;
        return function (i, s) { return EA.patTest(pid, d, i - s); };
      }
      var A = val(c.a), B = val(c.b), C = val(c.c);
      var bars = Math.max(1, c.bars || 1);
      var tol = (Number(c.tol) || 10) * (ctx.point || 0.00001);
      switch (c.op) {
        case "gt":  return function (i, s) { return A(i - s) >  B(i - s); };
        case "lt":  return function (i, s) { return A(i - s) <  B(i - s); };
        case "gte": return function (i, s) { return A(i - s) >= B(i - s); };
        case "lte": return function (i, s) { return A(i - s) <= B(i - s); };
        case "cross_above": return function (i, s) { return A(i - s) > B(i - s) && A(i - s - 1) <= B(i - s - 1); };
        case "cross_below": return function (i, s) { return A(i - s) < B(i - s) && A(i - s - 1) >= B(i - s - 1); };
        case "cross_any":   return function (i, s) {
          return (A(i - s) > B(i - s) && A(i - s - 1) <= B(i - s - 1)) || (A(i - s) < B(i - s) && A(i - s - 1) >= B(i - s - 1));
        };
        case "rising":  return function (i, s) { return A(i - s) > A(i - s - bars); };
        case "falling": return function (i, s) { return A(i - s) < A(i - s - bars); };
        case "between": return function (i, s) { return A(i - s) >= B(i - s) && A(i - s) <= C(i - s); };
        case "outside": return function (i, s) { return A(i - s) <  B(i - s) || A(i - s) >  C(i - s); };
        case "near":    return function (i, s) { return Math.abs(A(i - s) - B(i - s)) <= tol; };
        default: return function () { return false; };
      }
    }

    function group(g) {
      if (!g || !g.conds || !g.conds.length) return null;
      var fns = g.conds.map(cond), any = g.join === "any";
      return function (i, s) {
        for (var k = 0; k < fns.length; k++) {
          var r = fns[k](i, s);
          if (any && r) return true;
          if (!any && !r) return false;
        }
        return !any;
      };
    }
    function rules(gs) {
      var fns = (gs || []).map(group).filter(Boolean);
      if (!fns.length) return null;
      return function (i, s) {
        for (var k = 0; k < fns.length; k++) if (!fns[k](i, s)) return false;
        return true;
      };
    }

    return { rules: rules, series: series, val: val };
  }

  /* ---------------- the simulation ---------------- */
  function run(st, d, opts) {
    opts = opts || {};
    var S = st.setup || {}, X = st.exit || {}, R = st.risk || {}, F = st.filters || {};
    var inst = opts.instrument || INSTRUMENTS[0];
    var pip = Number(opts.pip) || inst.pip;
    var pipValue = Number(opts.pipValue) || inst.pipValue;
    var point = pip / 10;
    var ctx = { pip: pip, point: point, spreadPoints: (Number(opts.spreadPips) || 0) * 10 };

    var C = compile(st, d, ctx);
    var longEntry  = C.rules((st.entry || {}).long)  || function () { return false; };
    var shortEntry = C.rules((st.entry || {}).short) || function () { return false; };
    var longExitR  = C.rules(X.long);
    var shortExitR = C.rules(X.short);
    var opp = X.oppositeSignal !== false;

    var atrSeries = null;
    function atr(period) {
      if (!atrSeries) atrSeries = {};
      var k = "p" + period;
      if (!atrSeries[k]) atrSeries[k] = EA.IND_BY.atr.calc(d, { period: period }).main;
      return atrSeries[k];
    }
    var SL = X.sl || { mode: "pips", pips: 30 }, TP = X.tp || { mode: "pips", pips: 60 };
    var TR = X.trail || { mode: "off" }, BE = X.be || {}, PC = X.partial || {}, TE = X.timeExit || {};
    if (SL.mode === "atr") atr(SL.atrPeriod || 14);
    if (TP.mode === "atr") atr(TP.atrPeriod || 14);
    if (TR.mode === "atr") atr(TR.atrPeriod || 14);
    var volFilter = F.volOn ? atr(F.atrPeriod || 14) : null;
    var swingSeries = SL.mode === "swing" ? EA.IND_BY.fractals.calc(d, { wing: SL.swingWing || 2 }) : null;

    var signalBar = S.signalBar === 0 ? 0 : 1;
    var spread = (Number(opts.spreadPips) || 0) * pip;
    var slipPips = Number(opts.slippagePips) || 0;
    var commission = Number(opts.commission) || 0;      /* per lot, round turn */
    var balance = Number(opts.balance) || 10000;
    var startBalance = balance;
    var equityPeak = balance, maxDD = 0, maxDDpct = 0;

    function slDist(i, isLong) {
      switch (SL.mode) {
        case "none": return 0;
        case "atr": return (SL.atrMult || 1.5) * (atr(SL.atrPeriod || 14)[i] || 0);
        case "percent": return d.c[i] * (SL.pct || 1) / 100;
        case "swing": {
          var v = isLong ? d.c[i] - (swingSeries.low[i] || d.l[i]) : (swingSeries.high[i] || d.h[i]) - d.c[i];
          return v > 0 ? v : (SL.pips || 30) * pip;
        }
        default: return (SL.pips || 30) * pip;
      }
    }
    function tpDist(i, isLong, sl) {
      switch (TP.mode) {
        case "none": return 0;
        case "atr": return (TP.atrMult || 3) * (atr(TP.atrPeriod || 14)[i] || 0);
        case "percent": return d.c[i] * (TP.pct || 2) / 100;
        case "rr": return sl * (TP.rr || 2);
        default: return (TP.pips || 60) * pip;
      }
    }
    function trailDist(i) {
      if (TR.mode === "atr") return (TR.atrMult || 2) * (atr(TR.atrPeriod || 14)[i] || 0);
      return (TR.dist || 20) * pip;
    }

    function lotsFor(sl) {
      var lots = Number(R.lots) || 0.01;
      if (R.lotMode === "percent" && sl > 0) lots = (balance * (R.riskPct || 1) / 100) / ((sl / pip) * pipValue);
      if (R.lotMode === "money" && sl > 0)   lots = (R.riskMoney || 50) / ((sl / pip) * pipValue);
      if (R.lotMode === "per1k")             lots = balance / 1000 * (R.lotsPer1k || 0.01);
      if (R.martOn && lossRun > 0)           lots *= Math.pow(R.martMult || 2, Math.min(lossRun, R.martMax || 3));
      lots = Math.max(0.01, Math.min(Number(R.maxLots) || 10, lots));
      return Math.round(lots * 100) / 100;
    }

    var days = F.days || [1, 1, 1, 1, 1, 0, 0];
    function filtersOk(i) {
      var dt = new Date(d.t[i]);
      var dow = dt.getUTCDay();                 /* 0 Sun … 6 Sat */
      var idx = dow === 0 ? 6 : dow - 1;        /* 0 Mon … 6 Sun */
      if (!days[idx]) return false;
      if (F.hoursOn) {
        var hh = dt.getUTCHours(), a = F.hourFrom || 0, b = F.hourTo === 0 ? 0 : (F.hourTo || 24);
        var ok = a <= b ? (hh >= a && hh < b) : (hh >= a || hh < b);
        if (!ok) return false;
      }
      if (F.newsOn && (F.newsWindows || []).length) {
        var mins = dt.getUTCHours() * 60 + dt.getUTCMinutes();
        for (var k = 0; k < F.newsWindows.length; k++) {
          var w = F.newsWindows[k];
          var fa = toMin(w.from), fb = toMin(w.to);
          if (mins >= fa && mins < fb) return false;
        }
      }
      if (volFilter) {
        var a2 = (volFilter[i] || 0) / pip;
        if (F.atrMin > 0 && a2 < F.atrMin) return false;
        if (F.atrMax > 0 && a2 > F.atrMax) return false;
      }
      return true;
    }
    function toMin(v) { var p = String(v || "0:00").split(":"); return (parseInt(p[0], 10) || 0) * 60 + (parseInt(p[1], 10) || 0); }

    var open = [], trades = [], equity = [], lossRun = 0, tradesToday = 0, curDay = -1, lastEntryIdx = -1e9;
    var maxPos = Math.max(1, R.maxPositions || 1);
    var dayPnL = 0, stoppedOut = false;

    function money(p) { return (p.diff / pip) * pipValue * p.lots; }

    function closeAt(p, price, i, why) {
      var raw = (p.dir > 0 ? price - p.entry : p.entry - price) - slipPips * pip;
      var profit = (raw / pip) * pipValue * p.lots - commission * p.lots;
      balance += profit;
      dayPnL += profit;
      lossRun = profit < 0 ? lossRun + 1 : 0;
      trades.push({
        dir: p.dir, lots: p.lots, entry: p.entry, exit: price, profit: profit, why: why,
        openTime: d.t[p.i], closeTime: d.t[i], bars: i - p.i, balance: balance,
        pips: raw / pip
      });
    }

    var start = 250;
    for (var i = start; i < d.c.length; i++) {
      var dt = new Date(d.t[i]);
      if (dt.getUTCDate() !== curDay) { curDay = dt.getUTCDate(); tradesToday = 0; dayPnL = 0; stoppedOut = false; }

      /* --- manage open positions on this bar --- */
      for (var q = open.length - 1; q >= 0; q--) {
        var p = open[q];
        var hitSL = p.sl && (p.dir > 0 ? d.l[i] <= p.sl : d.h[i] >= p.sl);
        var hitTP = p.tp && (p.dir > 0 ? d.h[i] >= p.tp : d.l[i] <= p.tp);
        if (hitSL) { closeAt(p, p.sl, i, "stop loss"); open.splice(q, 1); continue; }
        if (hitTP) { closeAt(p, p.tp, i, "take profit"); open.splice(q, 1); continue; }

        var px = d.c[i];
        var gain = (p.dir > 0 ? px - p.entry : p.entry - px) / pip;

        if (BE.on && !p.be && gain >= (BE.trigger || 20)) {
          p.sl = p.dir > 0 ? p.entry + (BE.offset || 0) * pip : p.entry - (BE.offset || 0) * pip;
          p.be = true;
        }
        if (TR.mode && TR.mode !== "off" && gain >= (TR.start || 20)) {
          var dist = trailDist(i);
          var want = p.dir > 0 ? px - dist : px + dist;
          var step = (TR.step || 5) * pip;
          if (!p.sl || (p.dir > 0 && want - p.sl >= step) || (p.dir < 0 && p.sl - want >= step)) p.sl = want;
        }
        if (PC.on && !p.part && gain >= (PC.at || 25)) {
          var cut = Math.max(0.01, Math.round(p.lots * (PC.pct || 50)) / 100);
          if (cut < p.lots) {
            var partial = { dir: p.dir, lots: cut, entry: p.entry, i: p.i };
            closeAt(partial, px, i, "partial close");
            p.lots = Math.round((p.lots - cut) * 100) / 100;
          }
          p.part = true;
        }
        if (TE.onBars && i - p.i >= (TE.bars || 20)) { closeAt(p, px, i, "time exit"); open.splice(q, 1); continue; }
        if (TE.fridayClose && dt.getUTCDay() === 5 && dt.getUTCHours() >= (TE.fridayHour || 20)) {
          closeAt(p, px, i, "weekend flat"); open.splice(q, 1); continue;
        }
        var exitL = longExitR ? longExitR(i, signalBar) : (opp ? shortEntry(i, signalBar) : false);
        var exitS = shortExitR ? shortExitR(i, signalBar) : (opp ? longEntry(i, signalBar) : false);
        if (p.dir > 0 && exitL) { closeAt(p, px, i, "exit rule"); open.splice(q, 1); continue; }
        if (p.dir < 0 && exitS) { closeAt(p, px, i, "exit rule"); open.splice(q, 1); continue; }
      }

      /* --- equity curve --- */
      var floating = 0;
      for (var z = 0; z < open.length; z++) {
        var op2 = open[z];
        floating += (((op2.dir > 0 ? d.c[i] - op2.entry : op2.entry - d.c[i]) / pip) * pipValue * op2.lots);
      }
      var eq = balance + floating;
      equity.push(eq);
      if (eq > equityPeak) equityPeak = eq;
      var dd = equityPeak - eq;
      if (dd > maxDD) { maxDD = dd; maxDDpct = equityPeak > 0 ? dd / equityPeak * 100 : 0; }

      /* --- guards --- */
      if (R.dailyLoss > 0 && dayPnL <= -R.dailyLoss) stoppedOut = true;
      if (R.dailyProfit > 0 && dayPnL >= R.dailyProfit) stoppedOut = true;
      if (R.equityStopPct > 0 && equityPeak > 0 && (equityPeak - eq) / equityPeak * 100 >= R.equityStopPct) continue;
      if (R.maxConsecLoss > 0 && lossRun >= R.maxConsecLoss) continue;
      if (stoppedOut) continue;
      if (R.maxTradesPerDay > 0 && tradesToday >= R.maxTradesPerDay) continue;
      if (R.minBarsBetween > 0 && i - lastEntryIdx < R.minBarsBetween) continue;
      if (!filtersOk(i)) continue;
      if (open.length >= maxPos) continue;
      if (balance <= 0) break;

      /* --- entries: decide on bar i using bar i-signalBar, fill at this bar's open --- */
      var fillBase = signalBar >= 1 ? d.o[i] : d.c[i];
      var wantL = S.direction !== "short" && longEntry(i, signalBar);
      var wantS = S.direction !== "long"  && shortEntry(i, signalBar);

      if (wantL || wantS) {
        var isLong = !!wantL;
        var entry = isLong ? fillBase + spread + slipPips * pip : fillBase - slipPips * pip;
        var sd = slDist(i, isLong);
        var td = tpDist(i, isLong, sd);
        var lots = lotsFor(sd);
        open.push({
          dir: isLong ? 1 : -1, entry: entry, lots: lots, i: i,
          sl: sd > 0 ? (isLong ? entry - sd : entry + sd) : 0,
          tp: td > 0 ? (isLong ? entry + td : entry - td) : 0,
          be: false, part: false
        });
        tradesToday++;
        lastEntryIdx = i;
      }
    }

    /* close anything still open at the last bar */
    var lastI = d.c.length - 1;
    while (open.length) { closeAt(open[0], d.c[lastI], lastI, "end of data"); open.shift(); }

    return summarise(trades, equity, d, startBalance, balance, maxDD, maxDDpct, start);
  }

  /* ---------------- statistics ---------------- */
  function summarise(trades, equity, d, startBalance, balance, maxDD, maxDDpct, startIdx) {
    var wins = 0, losses = 0, gp = 0, gl = 0, bigWin = 0, bigLoss = 0, bars = 0;
    var streakW = 0, streakL = 0, bestW = 0, bestL = 0, rets = [];
    trades.forEach(function (t) {
      if (t.profit > 0) { wins++; gp += t.profit; streakW++; streakL = 0; bestW = Math.max(bestW, streakW); bigWin = Math.max(bigWin, t.profit); }
      else { losses++; gl += -t.profit; streakL++; streakW = 0; bestL = Math.max(bestL, streakL); bigLoss = Math.min(bigLoss, t.profit); }
      bars += t.bars;
      rets.push(t.profit);
    });
    var n = trades.length;
    var mean = n ? rets.reduce(function (a, b) { return a + b; }, 0) / n : 0;
    var sd = 0, dsd = 0;
    rets.forEach(function (r) { sd += (r - mean) * (r - mean); if (r < 0) dsd += r * r; });
    sd = n > 1 ? Math.sqrt(sd / (n - 1)) : 0;
    dsd = n ? Math.sqrt(dsd / n) : 0;

    var months = {};
    trades.forEach(function (t) {
      var dt = new Date(t.closeTime);
      var k = dt.getUTCFullYear() + "-" + String(dt.getUTCMonth() + 1).padStart(2, "0");
      months[k] = (months[k] || 0) + t.profit;
    });

    var spanMs = d.t[d.t.length - 1] - d.t[startIdx];
    var years = spanMs / (365.25 * 24 * 3600 * 1000);

    return {
      trades: trades,
      equity: equity,
      startBalance: startBalance,
      endBalance: balance,
      netProfit: balance - startBalance,
      netProfitPct: startBalance ? (balance - startBalance) / startBalance * 100 : 0,
      total: n, wins: wins, losses: losses,
      winRate: n ? wins / n * 100 : 0,
      grossProfit: gp, grossLoss: gl,
      profitFactor: gl > 0 ? gp / gl : (gp > 0 ? Infinity : 0),
      expectancy: mean,
      avgWin: wins ? gp / wins : 0,
      avgLoss: losses ? gl / losses : 0,
      payoff: (losses && wins) ? (gp / wins) / (gl / losses) : 0,
      largestWin: bigWin, largestLoss: bigLoss,
      maxDD: maxDD, maxDDpct: maxDDpct,
      recovery: maxDD > 0 ? (balance - startBalance) / maxDD : 0,
      sharpe: sd > 0 ? mean / sd * Math.sqrt(Math.max(1, n / Math.max(years, 0.08))) : 0,
      sortino: dsd > 0 ? mean / dsd * Math.sqrt(Math.max(1, n / Math.max(years, 0.08))) : 0,
      streakWin: bestW, streakLoss: bestL,
      avgBars: n ? bars / n : 0,
      months: months,
      years: years,
      cagr: (years > 0.1 && startBalance > 0 && balance > 0) ? (Math.pow(balance / startBalance, 1 / years) - 1) * 100 : 0,
      tradesPerMonth: years > 0 ? n / (years * 12) : 0
    };
  }

  window.EA.BT = { parseCSV: parseCSV, run: run, INSTRUMENTS: INSTRUMENTS, compile: compile };
})();
