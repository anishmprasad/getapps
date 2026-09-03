/* ============================================================
   GetEA — code generator.
   Takes a strategy object and returns a complete, compilable
   .mq5 / .mq4 / .cs file. The pipeline is the same for all three:
     1. plan()   walk the rules, collect indicator instances,
                 dedupe them and work out which helpers are needed
     2. cond()   turn each condition into a boolean expression
     3. emit     wrap the signals in a full trading skeleton
   ============================================================ */
(function () {
  "use strict";

  var EA = window.EA;

  /* ---------------- operators ---------------- */
  var OPS = [
    { k: "gt",          l: "is greater than",        b: true },
    { k: "lt",          l: "is less than",           b: true },
    { k: "gte",         l: "is greater or equal",    b: true },
    { k: "lte",         l: "is less or equal",       b: true },
    { k: "cross_above", l: "crosses above",          b: true },
    { k: "cross_below", l: "crosses below",          b: true },
    { k: "cross_any",   l: "crosses (either way)",   b: true },
    { k: "rising",      l: "is rising over",         b: false, bars: true },
    { k: "falling",     l: "is falling over",        b: false, bars: true },
    { k: "between",     l: "is between",             b: true, c: true },
    { k: "outside",     l: "is outside",             b: true, c: true },
    { k: "near",        l: "is within N points of",  b: true, tol: true }
  ];
  var OPS_BY = {};
  OPS.forEach(function (o) { OPS_BY[o.k] = o; });

  /* ---------------- planning ---------------- */
  function keyOf(op) {
    return op.id + "|" + JSON.stringify(op.p || {});
  }

  function Plan(platform) {
    this.platform = platform;
    this.inst = {};      /* key -> { id, p, name, outs:{} } */
    this.order = [];
    this.helpers = {};
    this.pats = {};
    this.warn = [];
  }
  Plan.prototype.useInd = function (id, p) {
    var k = keyOf({ id: id, p: p }), rec = this.inst[k];
    if (!rec) {
      rec = { id: id, p: p, key: k, n: this.order.length + 1, name: "ind" + (this.order.length + 1) };
      this.inst[k] = rec;
      this.order.push(rec);
    }
    return rec;
  };
  Plan.prototype.useHelper = function (list) {
    var self = this;
    (list || []).forEach(function (h) { self.helpers[h] = true; });
  };
  Plan.prototype.usePattern = function (id) { this.pats[id] = true; };

  /* ---------------- operand → expression ---------------- */
  function operand(plan, op, shiftExpr) {
    var lang = plan.platform;
    if (!op) return "0";
    if (op.t === "const") return EA.MT.f(op.value);
    if (op.t === "price") {
      var sh = shiftExpr + (op.shift ? " + " + op.shift : "");
      plan.useHelper(["px"]);
      var m = { open: "pO", high: "pH", low: "pL", close: "pC" };
      if (m[op.field]) return m[op.field] + "(" + sh + ")";
      if (op.field === "median")   return "((pH(" + sh + ") + pL(" + sh + ")) / 2.0)";
      if (op.field === "typical")  return "((pH(" + sh + ") + pL(" + sh + ") + pC(" + sh + ")) / 3.0)";
      if (op.field === "weighted") return "((pH(" + sh + ") + pL(" + sh + ") + 2.0 * pC(" + sh + ")) / 4.0)";
      return "pC(" + sh + ")";
    }
    /* indicator */
    var def = EA.IND_BY[op.id];
    if (!def) { plan.warn.push("Unknown indicator: " + op.id); return "0"; }
    var params = Object.assign({}, defaults(def), op.p || {});
    var out = op.out || def.outs[0].k;
    var sh2 = shiftExpr + (op.shift ? " + " + op.shift : "");

    if (lang === "ct") {
      var ce = EA.CT.IND[op.id];
      plan.useHelper(["px"].concat(ce.req || []));
      if (ce.extra) plan.helpers["x_" + op.id] = ce.extra;
      return ce.v(params, out, sh2);
    }
    var me = EA.MT.IND[op.id];
    plan.useHelper(["px"]);
    if (me.raw && me.raw[out]) { plan.useHelper(me.req); return me.raw[out](params, out, sh2); }
    if (me.derive && me.derive[out]) {
      var d = me.derive[out];
      var a = operand(plan, Object.assign({}, op, { out: d[0] }), shiftExpr);
      var b = operand(plan, Object.assign({}, op, { out: d[1] }), shiftExpr);
      return "(" + a + " " + d[2] + " " + b + ")";
    }
    if (me.both) { plan.useHelper(me.req); return me.both(params, out, sh2); }
    if (lang === "mt4") return me.mt4(params, out, sh2);
    var rec = plan.useInd(op.id, params);
    rec.create = me.mt5(params);
    return "Bf(h_" + rec.name + ", " + me.buf[out] + ", " + sh2 + ")";
  }

  function defaults(def) {
    var o = {};
    def.params.forEach(function (p) { o[p.k] = p.def; });
    return o;
  }

  /* ---------------- pattern → expression ---------------- */
  var PATFN = { ABS: "MathAbs", MAX: "MathMax", MIN: "MathMin" };
  var PATFN_CS = { ABS: "System.Math.Abs", MAX: "System.Math.Max", MIN: "System.Math.Min" };

  function patternExpr(plan, id, shiftExpr) {
    var p = EA.PAT_BY[id];
    if (!p) { plan.warn.push("Unknown pattern: " + id); return "false"; }
    plan.useHelper(["px", "cand"]);
    var fn = plan.platform === "ct" ? PATFN_CS : PATFN;
    var e = p.expr;
    /* AVG(n, k) -> cAvg(s + n, k) */
    e = e.replace(/AVG\(\s*(\d+)\s*,\s*(\d+)\s*\)/g, function (m, n, k) {
      return "cAvg(" + shiftExpr + " + " + n + ", " + k + ")";
    });
    /* single-argument bar accessors */
    var map = { O: "pO", H: "pH", L: "pL", C: "pC", BODY: "cBody", RANGE: "cRange", USH: "cUsh", LSH: "cLsh", UP: "cUp", DN: "cDn", MID: "cMid" };
    e = e.replace(/\b(O|H|L|C|BODY|RANGE|USH|LSH|UP|DN|MID)\(\s*(\d+)\s*\)/g, function (m, name, n) {
      return map[name] + "(" + shiftExpr + " + " + n + ")";
    });
    e = e.replace(/\bABS\(/g, fn.ABS + "(").replace(/\bMAX\(/g, fn.MAX + "(").replace(/\bMIN\(/g, fn.MIN + "(");
    return "(" + e + ")";
  }

  /* ---------------- condition → expression ---------------- */
  function condExpr(plan, c, sVar) {
    if (!c) return "false";
    if (c.kind === "pattern") return patternExpr(plan, c.pid, sVar);

    var abs = plan.platform === "ct" ? "System.Math.Abs" : "MathAbs";
    var point = plan.platform === "ct" ? "Symbol.TickSize" : "_Point";
    var A0 = operand(plan, c.a, sVar);
    var A1 = operand(plan, c.a, sVar + " + 1");
    var B0 = c.b ? operand(plan, c.b, sVar) : "0";
    var B1 = c.b ? operand(plan, c.b, sVar + " + 1") : "0";
    var bars = Math.max(1, c.bars || 1);
    var An = operand(plan, c.a, sVar + " + " + bars);

    switch (c.op) {
      case "gt":  return "(" + A0 + " > " + B0 + ")";
      case "lt":  return "(" + A0 + " < " + B0 + ")";
      case "gte": return "(" + A0 + " >= " + B0 + ")";
      case "lte": return "(" + A0 + " <= " + B0 + ")";
      case "cross_above": return "(" + A0 + " > " + B0 + " && " + A1 + " <= " + B1 + ")";
      case "cross_below": return "(" + A0 + " < " + B0 + " && " + A1 + " >= " + B1 + ")";
      case "cross_any":   return "((" + A0 + " > " + B0 + " && " + A1 + " <= " + B1 + ") || (" + A0 + " < " + B0 + " && " + A1 + " >= " + B1 + "))";
      case "rising":  return "(" + A0 + " > " + An + ")";
      case "falling": return "(" + A0 + " < " + An + ")";
      case "between": return "(" + A0 + " >= " + B0 + " && " + A0 + " <= " + operand(plan, c.c, sVar) + ")";
      case "outside": return "(" + A0 + " < " + B0 + " || " + A0 + " > " + operand(plan, c.c, sVar) + ")";
      case "near":    return "(" + abs + "(" + A0 + " - " + B0 + ") <= " + EA.MT.f(c.tol || 10) + " * " + point + ")";
      default: return "false";
    }
  }

  function groupExpr(plan, g, sVar) {
    if (!g || !g.conds || !g.conds.length) return null;
    var parts = g.conds.map(function (c) { return condExpr(plan, c, sVar); });
    var joiner = g.join === "any" ? " || " : " && ";
    return parts.length === 1 ? parts[0] : "(" + parts.join(joiner) + ")";
  }

  function rulesExpr(plan, groups, sVar) {
    var parts = (groups || []).map(function (g) { return groupExpr(plan, g, sVar); }).filter(Boolean);
    if (!parts.length) return null;
    return parts.length === 1 ? parts[0] : "(" + parts.join(" && ") + ")";
  }

  /* ---------------- helper ordering ---------------- */
  var MT_ORDER = ["px", "cand", "wma", "hma", "emaser", "dema", "tema", "trix", "vwma", "kama", "atrw", "natr",
    "supertrend", "keltner", "hhll", "donch", "aroon", "vortex", "linreg", "rsiw", "stochrsi", "roc", "cmo",
    "uo", "fisher", "bbw", "vwap", "bucket", "pivot", "session", "fib", "swing", "round"];
  var CT_ORDER = ["px", "cand", "ma", "bands", "atrw", "supertrend", "hhll", "osc", "dm", "vol", "levels"];

  function helperBlock(plan) {
    var out = [], seen = {};
    var order = plan.platform === "ct" ? CT_ORDER : MT_ORDER;
    var lib = plan.platform === "ct" ? EA.CT.H : EA.MT.H;
    order.forEach(function (k) {
      if (plan.helpers[k] && lib[k] && !seen[k]) { out.push(lib[k]); seen[k] = true; }
    });
    Object.keys(plan.helpers).forEach(function (k) {
      if (k.indexOf("x_") === 0) out.push(plan.helpers[k]);
    });
    return out.join("\n\n");
  }

  window.EA.CG = {
    OPS: OPS, OPS_BY: OPS_BY, Plan: Plan, operand: operand, condExpr: condExpr,
    groupExpr: groupExpr, rulesExpr: rulesExpr, helperBlock: helperBlock,
    patternExpr: patternExpr, defaults: defaults
  };
})();
