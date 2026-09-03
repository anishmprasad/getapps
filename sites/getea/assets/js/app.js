/* ============================================================
   GetEA — builder rendering and interaction.
   ============================================================ */
(function () {
  "use strict";
  var EA = window.EA, B = EA.BUILDER, GA = window.GA;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = B.esc, uid = B.uid, num = B.num;

  var STEPS = [
    { k: "setup",   l: "Setup",          n: 1 },
    { k: "entry",   l: "Entry rules",    n: 2 },
    { k: "exit",    l: "Exits & stops",  n: 3 },
    { k: "risk",    l: "Money & risk",   n: 4 },
    { k: "filters", l: "Filters",        n: 5 },
    { k: "alerts",  l: "Alerts",         n: 6 },
    { k: "test",    l: "Backtest",       n: 7 },
    { k: "export",  l: "Export code",    n: 8 }
  ];
  var PLATFORMS = {
    mt5: { name: "MetaTrader 5", short: "MT5", lang: "MQL5", ext: ".mq5", color: "#22D3EE" },
    mt4: { name: "MetaTrader 4", short: "MT4", lang: "MQL4", ext: ".mq4", color: "#F5B944" },
    ct:  { name: "cTrader",      short: "cTrader", lang: "C# / cAlgo", ext: ".cs", color: "#8B7DFF" }
  };
  var current = "setup";

  /* ---------------- path binding ---------------- */
  function getPath(o, p) {
    return p.split(".").reduce(function (a, k) { return a == null ? a : a[k]; }, o);
  }
  function setPath(o, p, v) {
    var ks = p.split("."), last = ks.pop();
    var t = ks.reduce(function (a, k) { if (a[k] == null) a[k] = {}; return a[k]; }, o);
    t[last] = v;
  }

  /* ---------------- small markup helpers ---------------- */
  function field(label, inner, hint) {
    return '<div class="f"><label>' + esc(label) + "</label>" + inner +
      (hint ? '<span class="hint">' + hint + "</span>" : "") + "</div>";
  }
  function input(path, type, attrs) {
    var v = getPath(B.ST(), path);
    return '<input class="input" data-path="' + path + '" data-t="' + (type === "number" ? "num" : "str") +
      '" type="' + (type || "text") + '" value="' + esc(v == null ? "" : v) + '" ' + (attrs || "") + ">";
  }
  function select(path, opts, rerender) {
    var v = String(getPath(B.ST(), path));
    return '<select class="select" data-path="' + path + '" data-t="str"' + (rerender ? ' data-rerender="1"' : "") + ">" +
      opts.map(function (o) {
        return '<option value="' + esc(o.k) + '"' + (String(o.k) === v ? " selected" : "") + ">" + esc(o.l) + "</option>";
      }).join("") + "</select>";
  }
  function toggle(path, label, rerender) {
    var v = !!getPath(B.ST(), path);
    return '<label class="switch"><input type="checkbox" data-path="' + path + '" data-t="bool"' +
      (rerender ? ' data-rerender="1"' : "") + (v ? " checked" : "") + '><i class="switch__t"></i><span>' + esc(label) + "</span></label>";
  }
  function togglecard(path, label, rerender) {
    return '<div class="togglecard"><span>' + esc(label) + "</span>" + toggle(path, "", rerender) + "</div>";
  }

  /* ---------------- rail ---------------- */
  function renderRail() {
    var st = B.ST();
    var counts = {
      entry: (st.entry.long[0].conds.length + st.entry.short[0].conds.length),
      exit: ((st.exit.long[0] ? st.exit.long[0].conds.length : 0) + (st.exit.short[0] ? st.exit.short[0].conds.length : 0))
    };
    $("#rail").innerHTML = STEPS.map(function (s) {
      var badge = s.k === "entry" && counts.entry ? '<span class="rail__badge">' + counts.entry + "</span>" : "";
      return '<button class="rail__btn" type="button" data-step="' + s.k + '"' +
        (current === s.k ? ' aria-current="true"' : "") + '><i class="rail__n">' + s.n + "</i><span>" + esc(s.l) + "</span>" + badge + "</button>";
    }).join("") + '<div class="rail__sep"></div>' +
      '<button class="rail__btn" type="button" data-act="platform"><i class="rail__n">↺</i><span>Change platform</span></button>';
  }

  /* ============================================================
     Step 1 — setup
     ============================================================ */
  var TF_MT = [
    { k: "PERIOD_CURRENT", l: "Chart timeframe" }, { k: "PERIOD_M1", l: "M1" }, { k: "PERIOD_M5", l: "M5" },
    { k: "PERIOD_M15", l: "M15" }, { k: "PERIOD_M30", l: "M30" }, { k: "PERIOD_H1", l: "H1" },
    { k: "PERIOD_H4", l: "H4" }, { k: "PERIOD_D1", l: "D1" }, { k: "PERIOD_W1", l: "W1" }, { k: "PERIOD_MN1", l: "MN1" }
  ];

  function stepSetup() {
    var st = B.ST(), ct = st.platform === "ct";
    return block("Setup", "The basics every robot needs: which bars it reads, when it is allowed to act, and how it labels its own trades.",
      '<div class="fields">' +
      field("Robot name", input("name", "text"), "Becomes the file name and the class name.") +
      (ct
        ? field("Timeframe", '<input class="input" value="Chart timeframe" disabled>', "A cTrader cBot reads the chart it is attached to. Attach it to the timeframe you designed on.")
        : field("Signal timeframe", select("setup.tf", TF_MT), "Leave on chart timeframe unless you want the robot locked to one period.")) +
      field("Signal bar", select("setup.signalBar", [{ k: "1", l: "Last closed bar (recommended)" }, { k: "0", l: "Live, still-forming bar" }]),
        "Rules read this bar. The closed bar cannot repaint; the live bar can change under you.") +
      field("Trade direction", select("setup.direction", [{ k: "both", l: "Long and short" }, { k: "long", l: "Long only" }, { k: "short", l: "Short only" }])) +
      field("Magic number / label", input(ct ? "setup.comment" : "setup.magic", ct ? "text" : "number"),
        ct ? "Every position carries this label so the bot only manages its own." : "How the robot recognises its own orders. Give each robot a different one.") +
      (ct ? "" : field("Order comment", input("setup.comment", "text"))) +
      field("Max deviation / slippage", input("setup.slippage", "number"), "Points of price movement you will accept on a market order.") +
      field("Max spread (points, 0 = off)", input("setup.maxSpread", "number"), "Skips entries when the spread is unusually wide.") +
      "</div>" +
      '<div class="toggles">' + togglecard("setup.onBarClose", "Act once per bar only") + "</div>" +
      '<div class="note">A robot that only acts on a closed bar behaves the same in a backtest as it does live. That single setting removes most of the difference between the two.</div>'
    ) + presetBlock();
  }

  function presetBlock() {
    return block("Start from a known strategy", "Load one of these, then change whatever you like. They are starting points, not recommendations.",
      '<div class="grid grid--3" style="gap:12px">' + B.PRESETS.map(function (p) {
        return '<button class="pitem" type="button" data-preset="' + p.k + '"><b>' + esc(p.name) +
          ' <em>' + esc(p.tag) + "</em></b><span>" + esc(p.note) + "</span></button>";
      }).join("") + "</div>");
  }

  /* ============================================================
     Steps 2 and 3 — rules
     ============================================================ */
  function operandOptions() {
    var out = ['<optgroup label="Value"><option value="const">Fixed number</option></optgroup>'];
    out.push('<optgroup label="Price">' + EA.PRICE_FIELDS.map(function (p) {
      return '<option value="price:' + p.k + '">' + esc(p.l) + "</option>";
    }).join("") + "</optgroup>");
    var groups = {};
    EA.IND.forEach(function (i) { (groups[i.group] = groups[i.group] || []).push(i); });
    Object.keys(groups).forEach(function (g) {
      out.push('<optgroup label="' + esc(g) + '">' + groups[g].map(function (i) {
        return i.outs.map(function (o) {
          return '<option value="ind:' + i.id + ":" + o.k + '">' + esc(i.name) + (i.outs.length > 1 ? " — " + esc(o.l) : "") + "</option>";
        }).join("");
      }).join("") + "</optgroup>");
    });
    return out.join("");
  }
  var OPERAND_OPTIONS = null;

  function operandValue(op) {
    if (!op) return "const";
    if (op.t === "const") return "const";
    if (op.t === "price") return "price:" + op.field;
    return "ind:" + op.id + ":" + (op.out || "main");
  }

  function operandHTML(side, gi, ci, which, op) {
    if (!OPERAND_OPTIONS) OPERAND_OPTIONS = operandOptions();
    var v = operandValue(op);
    var sel = '<select class="select" data-op="' + which + '" data-side="' + side + '" data-g="' + gi + '" data-c="' + ci + '">' +
      OPERAND_OPTIONS.replace('value="' + v + '"', 'value="' + v + '" selected') + "</select>";
    var params = "";
    if (!op || op.t === "const") {
      params = '<div class="cond__params"><input class="input" type="number" step="any" data-opval="' + which +
        '" data-side="' + side + '" data-g="' + gi + '" data-c="' + ci + '" value="' + esc(op && op.value != null ? op.value : 0) + '"></div>';
    } else if (op.t === "ind") {
      var def = EA.IND_BY[op.id];
      if (def && def.params.length) {
        params = '<div class="cond__params">' + def.params.map(function (pp) {
          var val = op.p && op.p[pp.k] != null ? op.p[pp.k] : pp.def;
          var attrs = 'data-opp="' + which + '" data-key="' + pp.k + '" data-side="' + side + '" data-g="' + gi + '" data-c="' + ci + '"';
          if (pp.t === "enum") {
            return '<select class="select" ' + attrs + ' title="' + esc(pp.l) + '">' + pp.opts.map(function (o) {
              return '<option value="' + esc(o.k) + '"' + (String(o.k) === String(val) ? " selected" : "") + ">" + esc(o.l) + "</option>";
            }).join("") + "</select>";
          }
          if (pp.t === "bool") {
            return '<select class="select" ' + attrs + ' title="' + esc(pp.l) + '"><option value="1"' + (val ? " selected" : "") +
              '>' + esc(pp.l) + ": on</option><option value=\"0\"" + (!val ? " selected" : "") + ">" + esc(pp.l) + ": off</option></select>";
          }
          return '<input class="input" type="number" step="' + (pp.step || 1) + '" ' + attrs + ' value="' + esc(val) + '" title="' + esc(pp.l) + '">';
        }).join("") + "</div>";
      }
    } else if (op.t === "price" && (op.shift || 0) > 0) {
      params = '<div class="cond__params"><span class="tag">' + op.shift + " bars back</span></div>";
    }
    return '<div class="cond__side">' + sel + params + "</div>";
  }

  function condHTML(side, gi, ci, c, join) {
    var joinLabel = ci === 0 ? "" : (join === "any" ? "OR" : "AND");
    if (c.kind === "pattern") {
      var p = EA.PAT_BY[c.pid];
      return '<div class="cond"><div class="cond__join">' + joinLabel + "</div>" +
        '<div class="cond__side" style="grid-column:2 / 5"><div class="row"><span class="tag">Pattern</span><b>' +
        esc(p ? p.name : c.pid) + '</b><span class="faint">' + esc(p ? p.note : "") + "</span></div></div>" +
        '<button class="cond__x" type="button" data-del="1" data-side="' + side + '" data-g="' + gi + '" data-c="' + ci + '" aria-label="Remove">✕</button></div>';
    }
    var op = EA.CG.OPS_BY[c.op] || EA.CG.OPS[0];
    var extra = "";
    if (op.bars) extra = '<div class="cond__params"><input class="input" type="number" min="1" data-bars="1" data-side="' + side +
      '" data-g="' + gi + '" data-c="' + ci + '" value="' + (c.bars || 1) + '" title="bars"><span class="tag">bars</span></div>';
    if (op.tol) extra = '<div class="cond__params"><input class="input" type="number" min="0" data-tol="1" data-side="' + side +
      '" data-g="' + gi + '" data-c="' + ci + '" value="' + (c.tol || 10) + '" title="points"><span class="tag">points</span></div>';

    return '<div class="cond">' +
      '<div class="cond__join">' + joinLabel + "</div>" +
      operandHTML(side, gi, ci, "a", c.a) +
      '<div class="cond__side cond__op"><select class="select" data-opsel="1" data-side="' + side + '" data-g="' + gi + '" data-c="' + ci + '">' +
        EA.CG.OPS.map(function (o) {
          return '<option value="' + o.k + '"' + (o.k === c.op ? " selected" : "") + ">" + esc(o.l) + "</option>";
        }).join("") + "</select>" + extra + "</div>" +
      (op.b ? operandHTML(side, gi, ci, "b", c.b) : '<div class="cond__side"></div>') +
      '<button class="cond__x" type="button" data-del="1" data-side="' + side + '" data-g="' + gi + '" data-c="' + ci + '" aria-label="Remove condition">✕</button>' +
      (op.c ? '<div class="cond__note">…and</div>' + operandHTML(side, gi, ci, "c", c.c) : "") +
      "</div>";
  }

  function groupsHTML(side, groups, emptyText) {
    return groups.map(function (g, gi) {
      var body = g.conds.length
        ? g.conds.map(function (c, ci) { return condHTML(side, gi, ci, c, g.join); }).join("")
        : '<div class="faint" style="text-align:center;padding:14px 0;font-size:.84rem">' + esc(emptyText) + "</div>";
      return '<div class="grp' + (g.conds.length ? "" : " grp--empty") + '">' +
        '<div class="grp__head"><span class="grp__title"><i>' + (side.indexOf("long") === 0 ? "LONG" : "SHORT") + "</i>" +
        (side.indexOf("exit") >= 0 ? "Exit when" : "Enter when") + "</span>" +
        '<select class="select" style="width:auto;font-size:.78rem;padding:6px 28px 6px 10px" data-join="1" data-side="' + side + '" data-g="' + gi + '">' +
        '<option value="all"' + (g.join !== "any" ? " selected" : "") + ">all of these are true</option>" +
        '<option value="any"' + (g.join === "any" ? " selected" : "") + ">any one is true</option></select>" +
        '<div class="right"><button class="addbtn" type="button" data-add="cond" data-side="' + side + '" data-g="' + gi + '">+ Condition</button>' +
        '<button class="addbtn addbtn--accent" type="button" data-add="block" data-side="' + side + '" data-g="' + gi + '">+ From library</button></div></div>' +
        '<div class="grp__body">' + body + "</div></div>";
    }).join("");
  }

  function stepEntry() {
    var st = B.ST();
    return block("Entry rules", "Both sides are independent. Leave one empty to trade only the other way — or set the direction in Setup.",
      groupsHTML("long", st.entry.long, "No conditions yet. Add one, or load a preset from Setup.") +
      groupsHTML("short", st.entry.short, "No conditions yet.") +
      '<div class="note">Every condition is evaluated on the signal bar you chose in Setup. <b>Crosses above</b> compares the signal bar with the one before it, so it fires once per crossing rather than every bar the lines are apart.</div>'
    );
  }

  function stepExit() {
    var st = B.ST(), X = st.exit;
    var slFields = "";
    if (X.sl.mode === "pips") slFields = field("Stop distance (pips)", input("exit.sl.pips", "number"));
    if (X.sl.mode === "atr") slFields = field("ATR period", input("exit.sl.atrPeriod", "number")) + field("ATR multiple", input("exit.sl.atrMult", "number", 'step="0.1"'));
    if (X.sl.mode === "percent") slFields = field("Percent of price", input("exit.sl.pct", "number", 'step="0.1"'));
    if (X.sl.mode === "swing") slFields = field("Swing lookback (bars each side)", input("exit.sl.swingWing", "number"));

    var tpFields = "";
    if (X.tp.mode === "pips") tpFields = field("Target distance (pips)", input("exit.tp.pips", "number"));
    if (X.tp.mode === "atr") tpFields = field("ATR period", input("exit.tp.atrPeriod", "number")) + field("ATR multiple", input("exit.tp.atrMult", "number", 'step="0.1"'));
    if (X.tp.mode === "percent") tpFields = field("Percent of price", input("exit.tp.pct", "number", 'step="0.1"'));
    if (X.tp.mode === "rr") tpFields = field("Reward : risk", input("exit.tp.rr", "number", 'step="0.1"'), "Target = stop distance × this.");

    var trFields = X.trail.mode === "off" ? "" :
      field("Start after (pips in profit)", input("exit.trail.start", "number")) +
      (X.trail.mode === "pips" ? field("Trail distance (pips)", input("exit.trail.dist", "number"))
        : field("ATR period", input("exit.trail.atrPeriod", "number")) + field("ATR multiple", input("exit.trail.atrMult", "number", 'step="0.1"'))) +
      field("Minimum step (pips)", input("exit.trail.step", "number"), "Stops the robot rewriting the stop on every tick.");

    return block("Stop loss and take profit", "A robot without a stop is a robot with an unlimited loss. Pick one you can live with.",
      '<div class="fields fields--2">' +
      field("Stop loss", select("exit.sl.mode", [
        { k: "pips", l: "Fixed pips" }, { k: "atr", l: "ATR multiple (adaptive)" },
        { k: "percent", l: "Percent of price" }, { k: "swing", l: "Last swing high / low" }, { k: "none", l: "None (not recommended)" }
      ], true) + '<div class="fields" style="margin-top:10px">' + slFields + "</div>") +
      field("Take profit", select("exit.tp.mode", [
        { k: "pips", l: "Fixed pips" }, { k: "atr", l: "ATR multiple" }, { k: "percent", l: "Percent of price" },
        { k: "rr", l: "Multiple of the stop (R:R)" }, { k: "none", l: "None — exit on rules only" }
      ], true) + '<div class="fields" style="margin-top:10px">' + tpFields + "</div>") +
      "</div>"
    ) +
    block("Trade management", "What happens to a position while it is open.",
      '<div class="fields fields--2">' +
      field("Trailing stop", select("exit.trail.mode", [
        { k: "off", l: "Off" }, { k: "pips", l: "Fixed pips behind price" }, { k: "atr", l: "ATR multiple behind price" }
      ], true) + '<div class="fields" style="margin-top:10px">' + trFields + "</div>") +
      '<div class="f"><label>Break-even and partials</label><div class="toggles">' +
        togglecard("exit.be.on", "Move stop to break-even", true) +
        togglecard("exit.partial.on", "Close part of the position", true) +
      "</div>" +
      '<div class="fields" style="margin-top:10px">' +
      (X.be.on ? field("Break-even trigger (pips)", input("exit.be.trigger", "number")) + field("Break-even offset (pips)", input("exit.be.offset", "number")) : "") +
      (X.partial.on ? field("Partial close at (pips)", input("exit.partial.at", "number")) + field("Close how much (%)", input("exit.partial.pct", "number")) : "") +
      "</div></div>" +
      "</div>" +
      '<div class="toggles" style="margin-top:6px">' +
      togglecard("exit.oppositeSignal", "Close when the opposite entry signal appears") +
      togglecard("exit.timeExit.onBars", "Close after a fixed number of bars", true) +
      togglecard("exit.timeExit.fridayClose", "Flat before the weekend", true) +
      "</div>" +
      '<div class="fields">' +
      (X.timeExit.onBars ? field("Bars in trade before exit", input("exit.timeExit.bars", "number")) : "") +
      (X.timeExit.fridayClose ? field("Friday close hour (server)", input("exit.timeExit.fridayHour", "number")) : "") +
      "</div>"
    ) +
    block("Custom exit rules", "Optional. If you leave these empty the robot uses the stop, the target and the opposite signal.",
      groupsHTML("exitlong", B.ST().exit.long.length ? B.ST().exit.long : (B.ST().exit.long = [{ id: uid(), join: "any", conds: [] }]), "No custom long exit — using stops and the opposite signal.") +
      groupsHTML("exitshort", B.ST().exit.short.length ? B.ST().exit.short : (B.ST().exit.short = [{ id: uid(), join: "any", conds: [] }]), "No custom short exit.")
    );
  }

  /* ---------------- generic block wrapper ---------------- */
  function block(title, sub, body, foot) {
    return '<section class="block"><div class="block__head"><h2>' + esc(title) + "</h2>" +
      (sub ? "<p>" + esc(sub) + "</p>" : "") + '</div><div class="block__body">' + body + "</div>" +
      (foot ? '<div class="block__foot">' + foot + "</div>" : "") + "</section>";
  }

  window.EA.UI = {
    STEPS: STEPS, PLATFORMS: PLATFORMS,
    getPath: getPath, setPath: setPath, field: field, input: input, select: select,
    toggle: toggle, togglecard: togglecard, block: block, renderRail: renderRail,
    stepSetup: stepSetup, stepEntry: stepEntry, stepExit: stepExit,
    groupsHTML: groupsHTML, condHTML: condHTML, operandValue: operandValue,
    step: function (v) { if (v) current = v; return current; }
  };
})();

/* ============================================================
   GetEA — steps 4 to 8, charts and all the wiring.
   ============================================================ */
(function () {
  "use strict";
  var EA = window.EA, B = EA.BUILDER, U = EA.UI, GA = window.GA;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = B.esc, uid = B.uid, num = B.num;
  var field = U.field, input = U.input, select = U.select, togglecard = U.togglecard, block = U.block;

  /* ============================================================
     Step 4 — money and risk
     ============================================================ */
  function stepRisk() {
    var st = B.ST(), R = st.risk;
    var sizeFields =
      R.lotMode === "fixed"   ? field("Lot size", input("risk.lots", "number", 'step="0.01"')) :
      R.lotMode === "percent" ? field("Risk per trade (% of balance)", input("risk.riskPct", "number", 'step="0.1"'), "Position size is derived from your stop distance, so a wider stop means a smaller position.") :
      R.lotMode === "money"   ? field("Risk per trade (account currency)", input("risk.riskMoney", "number")) :
                                field("Lots per 1000 of balance", input("risk.lotsPer1k", "number", 'step="0.01"'));

    return block("Position sizing", "How big each trade is. Percent risk is the only mode that keeps your loss constant when your stop distance changes.",
      '<div class="fields fields--2">' +
      field("Sizing method", select("risk.lotMode", [
        { k: "fixed", l: "Fixed lots" }, { k: "percent", l: "Percent of balance at risk" },
        { k: "money", l: "Fixed money at risk" }, { k: "per1k", l: "Lots per 1000 of balance" }
      ], true) + '<div class="fields" style="margin-top:10px">' + sizeFields + "</div>") +
      field("Hard lot ceiling", input("risk.maxLots", "number", 'step="0.01"'), "A safety net against a sizing bug or a runaway martingale.") +
      "</div>" +
      '<div class="fields">' +
      field("Max open positions", input("risk.maxPositions", "number")) +
      field("Max new trades per day", input("risk.maxTradesPerDay", "number"), "0 = no limit.") +
      field("Minimum bars between entries", input("risk.minBarsBetween", "number")) +
      "</div>" +
      '<div class="toggles">' + togglecard("risk.hedge", "Allow long and short at the same time") + "</div>"
    ) +
    block("Account guards", "Circuit breakers. These are what stop a bad day becoming a bad month.",
      '<div class="fields">' +
      field("Daily loss cap", input("risk.dailyLoss", "number"), "Stops trading for the rest of the day. 0 = off.") +
      field("Daily profit target", input("risk.dailyProfit", "number"), "Also stops for the day. 0 = off.") +
      field("Equity stop (% drawdown)", input("risk.equityStopPct", "number"), "Halts on a drawdown from the equity peak.") +
      field("Stop after N losses in a row", input("risk.maxConsecLoss", "number")) +
      "</div>"
    ) +
    block("Averaging strategies", "Both of these increase risk. Read the warning before you switch either on.",
      '<div class="toggles">' +
      togglecard("risk.martOn", "Martingale — multiply size after a loss", true) +
      togglecard("risk.gridOn", "Grid / averaging down", true) +
      "</div>" +
      '<div class="fields" style="margin-top:12px">' +
      (R.martOn ? field("Multiplier after a loss", input("risk.martMult", "number", 'step="0.1"')) + field("Maximum multiplications", input("risk.martMax", "number")) : "") +
      (R.gridOn ? field("Distance between entries (pips)", input("risk.gridStep", "number")) +
                  field("Lot multiplier per level", input("risk.gridMult", "number", 'step="0.1"')) +
                  field("Maximum levels", input("risk.gridMax", "number")) : "") +
      "</div>" +
      ((R.martOn || R.gridOn) ? '<div class="note note--bad"><b>Read this.</b> Martingale and grid systems produce long, smooth equity curves and then give it all back in one move. Doubling after four losses means the fifth trade is sixteen times the first. Backtests flatter them badly, because the sequence that kills them may not be in your data. If you use either, set the lot ceiling, the equity stop and the loss-run limit above — and size as if the worst run you have seen is only half of what is coming.</div>' : '<div class="note">Leaving both off is the right default. Constant or percent-risk sizing is what almost every durable strategy uses.</div>')
    );
  }

  /* ============================================================
     Step 5 — filters
     ============================================================ */
  function stepFilters() {
    var st = B.ST(), F = st.filters;
    var dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    return block("When may it trade?", "Most strategies have hours where they work and hours where they only pay the spread.",
      '<div class="toggles">' + togglecard("filters.hoursOn", "Restrict trading hours", true) + "</div>" +
      (F.hoursOn ? '<div class="fields">' + field("From hour (server time)", input("filters.hourFrom", "number")) +
        field("To hour (server time)", input("filters.hourTo", "number"), "Wraps around midnight if the start is after the end.") + "</div>" : "") +
      '<div class="f" style="margin-top:6px"><label>Days of the week</label><div class="checks">' +
      dayNames.map(function (dn, k) {
        return '<label><input type="checkbox" data-day="' + k + '"' + (F.days[k] ? " checked" : "") + "><span>" + dn + "</span></label>";
      }).join("") + "</div></div>"
    ) +
    block("News and volatility", "Two ways to stay out of conditions your strategy was not designed for.",
      '<div class="toggles">' +
      togglecard("filters.newsOn", "Blackout windows (news times)", true) +
      togglecard("filters.volOn", "Volatility filter (ATR)", true) +
      "</div>" +
      (F.newsOn ? '<div style="margin-top:12px" id="newsList">' + F.newsWindows.map(function (w, k) {
        return '<div class="row" style="margin-bottom:8px"><span class="tag">Window ' + (k + 1) + '</span>' +
          '<input class="input" style="width:120px" type="time" data-news="from" data-i="' + k + '" value="' + esc(w.from) + '">' +
          '<span class="faint">to</span>' +
          '<input class="input" style="width:120px" type="time" data-news="to" data-i="' + k + '" value="' + esc(w.to) + '">' +
          '<button class="cond__x" type="button" data-newsdel="' + k + '">✕</button></div>';
      }).join("") + '<button class="addbtn" type="button" data-newsadd="1">+ Add window</button>' +
      '<div class="hint" style="margin-top:8px">Server time, repeated every trading day. This is a simple clock blackout — it does not read an economic calendar.</div></div>' : "") +
      (F.volOn ? '<div class="fields" style="margin-top:12px">' +
        field("ATR period", input("filters.atrPeriod", "number")) +
        field("Minimum ATR (pips)", input("filters.atrMin", "number"), "Skips dead, rangebound conditions. 0 = off.") +
        field("Maximum ATR (pips)", input("filters.atrMax", "number"), "Skips panic volatility. 0 = off.") +
        "</div>" : "")
    );
  }

  /* ============================================================
     Step 6 — alerts
     ============================================================ */
  function stepAlerts() {
    var ct = B.ST().platform === "ct";
    return block("Alerts", "What the robot tells you when it acts.",
      '<div class="toggles">' +
      togglecard("alerts.popup", ct ? "Print to the cBot log" : "Terminal alert popup") +
      (ct ? "" : togglecard("alerts.push", "Push notification to the mobile terminal")) +
      togglecard("alerts.email", "Email", true) +
      "</div>" +
      (B.ST().alerts.email ? '<div class="fields" style="margin-top:12px">' +
        (ct ? field("From address", input("alerts.mailFrom", "text")) + field("To address", input("alerts.mailTo", "text")) : "") +
        "</div>" : "") +
      '<div class="note">' + (ct
        ? "cTrader needs an SMTP server configured in the platform settings before Notifications.SendEmail will do anything."
        : "MetaTrader sends push notifications through the MetaQuotes ID in Tools → Options → Notifications, and email through the Email tab. The robot cannot configure those for you.") + "</div>"
    );
  }

  /* ============================================================
     Step 7 — backtest
     ============================================================ */
  function stepTest() {
    var st = B.ST(), T = st.test;
    var got = B.result().r;
    return block("Backtest with your own data", "Drop in a CSV of OHLC bars. It is parsed and simulated in this tab — the file never leaves your machine.",
      '<label class="drop" id="drop">' +
        '<span class="drop__ico"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/></svg></span>' +
        "<b>Drop a CSV here, or click to choose one</b>" +
        "<span>Date, time, open, high, low, close, volume — a MetaTrader history export, a TradingView export or anything with those columns. Up to about 300,000 bars.</span>" +
        '<input type="file" id="csv" accept=".csv,.txt,text/csv">' +
      "</label>" +
      '<div id="dataInfo">' + dataInfoHTML() + "</div>" +
      '<div class="fields" style="margin-top:14px">' +
      field("Instrument type", select("test.instrument", EA.BT.INSTRUMENTS.map(function (i) { return { k: i.k, l: i.l }; }), true)) +
      (T.instrument === "custom" ? field("Pip size", input("test.pip", "number", 'step="0.00001"')) + field("Value of 1 pip per lot", input("test.pipValue", "number", 'step="0.01"')) : "") +
      field("Starting balance", input("test.balance", "number")) +
      field("Spread (pips)", input("test.spreadPips", "number", 'step="0.1"')) +
      field("Commission per lot (round turn)", input("test.commission", "number", 'step="0.1"')) +
      field("Slippage (pips)", input("test.slippagePips", "number", 'step="0.1"')) +
      "</div>" +
      '<div class="row" style="margin-top:6px"><button class="btn btn--accent" type="button" id="runTest">Run the backtest</button>' +
      '<span class="faint" id="testNote">' + (got ? "Showing the last run." : "Load data first.") + "</span></div>",
      null) +
      '<div id="results">' + (got ? resultsHTML(got) : "") + "</div>" +
      block("What this number is, and is not", "",
        '<div class="disclaimer">A backtest replays your rules over bars you supplied. It assumes every fill happens at the price shown, ' +
        'that your spread and commission are constant, and that nothing inside a bar happened in an order other than the conservative one ' +
        '(a stop is checked before a target). It cannot model requotes, weekend gaps in your broker\'s feed, swap, or the fact that a market ' +
        'that produced this data may not produce anything like it again. <b>A high win rate here is evidence that the logic does what you think ' +
        'it does. It is not evidence that it will make money.</b> Test the generated robot in the platform\'s own strategy tester, then on a ' +
        'demo account, before it sees real money.</div>');
  }


  function dataInfoHTML() {
    var m = B.result().m;
    if (!m) return "";
    var tf = m.tfMinutes >= 1440 ? (m.tfMinutes / 1440) + "-day"
           : m.tfMinutes >= 60 ? (m.tfMinutes / 60) + "-hour"
           : m.tfMinutes + "-minute";
    return '<div class="note"><b>' + esc(m.fileName || "Loaded data") + "</b> — " + m.rows.toLocaleString() + " bars, " +
      new Date(m.from).toISOString().slice(0, 10) + " to " + new Date(m.to).toISOString().slice(0, 10) +
      ", about " + tf + " bars." + (m.warnings && m.warnings.length ? " " + esc(m.warnings.join(" ")) : "") + "</div>";
  }

  function fmt(n, dp) {
    if (!isFinite(n)) return "∞";
    return (Math.round(n * Math.pow(10, dp || 0)) / Math.pow(10, dp || 0)).toLocaleString(undefined, { minimumFractionDigits: dp || 0, maximumFractionDigits: dp || 0 });
  }
  function money(n) { return (n < 0 ? "−" : "") + fmt(Math.abs(n), 2); }

  function metric(label, value, sub, kind) {
    return '<div class="metric' + (kind ? " metric--" + kind : "") + '"><span>' + esc(label) + "</span><b>" + value + "</b>" +
      (sub ? "<small>" + sub + "</small>" : "") + "</div>";
  }

  function resultsHTML(r) {
    var wr = r.winRate;
    var grade = wr >= 55 && r.profitFactor >= 1.3 ? "ok" : (r.profitFactor >= 1 ? "warn" : "bad");
    var circ = 2 * Math.PI * 52;
    var months = Object.keys(r.months).sort();
    var monthCells = months.map(function (k) {
      var v = r.months[k];
      var strength = Math.min(1, Math.abs(v) / (Math.abs(r.netProfit) / Math.max(1, months.length) * 2 || 1));
      var col = v >= 0 ? "61,220,151" : "255,107,107";
      return '<div style="background:rgba(' + col + "," + (0.12 + strength * 0.5) + ')" title="' + k + ": " + money(v) + '">' +
        k.slice(2) + "<br>" + fmt(v, 0) + "</div>";
    }).join("");

    var rows = r.trades.slice(-300).reverse().map(function (t) {
      return "<tr><td>" + new Date(t.openTime).toISOString().slice(0, 16).replace("T", " ") + "</td>" +
        "<td>" + (t.dir > 0 ? "Buy" : "Sell") + "</td><td>" + fmt(t.lots, 2) + "</td>" +
        "<td>" + t.entry.toFixed(5) + "</td><td>" + t.exit.toFixed(5) + "</td>" +
        '<td class="' + (t.profit >= 0 ? "num-ok" : "num-bad") + '">' + money(t.profit) + "</td>" +
        '<td class="' + (t.pips >= 0 ? "num-ok" : "num-bad") + '">' + fmt(t.pips, 1) + "</td>" +
        "<td>" + t.bars + "</td><td>" + esc(t.why) + "</td></tr>";
    }).join("");

    return block("Result", "Simulated on the bars you provided, with your spread, commission and slippage applied to every trade.",
      '<div class="split">' +
        '<div class="gauge"><svg viewBox="0 0 120 120"><circle class="gauge__track" cx="60" cy="60" r="52" fill="none" stroke-width="10"/>' +
        '<circle class="gauge__fill" cx="60" cy="60" r="52" fill="none" stroke-width="10" stroke-dasharray="' + circ.toFixed(1) +
        '" stroke-dashoffset="' + (circ * (1 - Math.min(1, wr / 100))).toFixed(1) + '" transform="rotate(-90 60 60)"/></svg>' +
        '<div class="gauge__label"><b>' + fmt(wr, 1) + "%</b><span>win rate over " + fmt(r.total) + " trades</span></div></div>" +
        '<div class="metrics">' +
        metric("Net profit", money(r.netProfit), fmt(r.netProfitPct, 1) + "% of starting balance", r.netProfit >= 0 ? "ok" : "bad") +
        metric("Profit factor", fmt(r.profitFactor, 2), "gross win ÷ gross loss", r.profitFactor >= 1.3 ? "ok" : r.profitFactor >= 1 ? "warn" : "bad") +
        metric("Expectancy", money(r.expectancy), "average per trade", r.expectancy >= 0 ? "ok" : "bad") +
        metric("Max drawdown", fmt(r.maxDDpct, 1) + "%", money(r.maxDD) + " from the peak", r.maxDDpct > 30 ? "bad" : r.maxDDpct > 15 ? "warn" : "ok") +
        "</div>" +
      "</div>" +
      '<div class="metrics" style="margin-top:12px">' +
      metric("Trades", fmt(r.total), fmt(r.tradesPerMonth, 1) + " per month") +
      metric("Wins / losses", fmt(r.wins) + " / " + fmt(r.losses), "") +
      metric("Payoff ratio", fmt(r.payoff, 2), "avg win ÷ avg loss") +
      metric("Average win", money(r.avgWin), "") +
      metric("Average loss", money(r.avgLoss), "") +
      metric("Largest win", money(r.largestWin), "") +
      metric("Largest loss", money(r.largestLoss), "") +
      metric("Longest losing run", fmt(r.streakLoss), "trades in a row") +
      metric("Longest winning run", fmt(r.streakWin), "trades in a row") +
      metric("Recovery factor", fmt(r.recovery, 2), "net profit ÷ max drawdown") +
      metric("Sharpe (approx)", fmt(r.sharpe, 2), "per-trade, annualised") +
      metric("Sortino (approx)", fmt(r.sortino, 2), "downside only") +
      metric("CAGR", fmt(r.cagr, 1) + "%", fmt(r.years, 1) + " years of data") +
      metric("Avg bars in trade", fmt(r.avgBars, 1), "") +
      "</div>" +
      '<div class="plot" style="margin-top:16px"><canvas id="eqPlot"></canvas><div class="plot__tip" id="eqTip"></div></div>' +
      '<div class="hint" style="text-align:center">Equity curve — the filled band underneath is drawdown from the running peak.</div>' +
      (months.length ? '<h3 style="margin:20px 0 10px;font-size:.95rem">Month by month</h3><div class="monthgrid">' + monthCells + "</div>" : "") +
      '<h3 style="margin:20px 0 10px;font-size:.95rem">Trades <span class="faint" style="font-weight:400">(most recent 300)</span></h3>' +
      '<div class="tblwrap"><table class="tbl"><thead><tr><th>Opened</th><th>Side</th><th>Lots</th><th>Entry</th><th>Exit</th><th>P/L</th><th>Pips</th><th>Bars</th><th>Closed by</th></tr></thead><tbody>' +
      rows + "</tbody></table></div>",
      '<button class="btn btn--ghost" type="button" id="saveRun">Save this strategy with its result</button>' +
      '<button class="btn btn--ghost" type="button" id="exportTrades">Download trades as CSV</button>' +
      '<span class="faint">Saved locally, in this browser only.</span>'
    );
  }

  /* ---------------- equity chart ---------------- */
  function drawEquity() {
    var cv = $("#eqPlot"), got = B.result().r;
    if (!cv || !got || !got.equity.length) return;
    var dpr = window.devicePixelRatio || 1;
    var w = cv.clientWidth, h = cv.clientHeight;
    cv.width = w * dpr; cv.height = h * dpr;
    var g = cv.getContext("2d");
    g.scale(dpr, dpr);
    var eq = got.equity, n = eq.length;
    var mn = Infinity, mx = -Infinity, i;
    for (i = 0; i < n; i++) { mn = Math.min(mn, eq[i]); mx = Math.max(mx, eq[i]); }
    var pad = (mx - mn) * 0.08 || 1;
    mn -= pad; mx += pad;
    var css = getComputedStyle(document.documentElement);
    var accent = css.getPropertyValue("--accent").trim() || "#F5B944";
    var line = css.getPropertyValue("--line").trim() || "rgba(255,255,255,.1)";
    var bad = css.getPropertyValue("--bad").trim() || "#FF6B6B";
    function X(k) { return k / (n - 1) * (w - 8) + 4; }
    function Y(v) { return h - 10 - (v - mn) / (mx - mn) * (h - 22); }

    g.clearRect(0, 0, w, h);
    g.strokeStyle = line; g.lineWidth = 1;
    for (i = 0; i <= 4; i++) {
      var y = 10 + i * (h - 22) / 4;
      g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke();
    }
    /* drawdown band */
    var peak = -Infinity;
    g.beginPath();
    g.moveTo(X(0), Y(eq[0]));
    for (i = 0; i < n; i++) { peak = Math.max(peak, eq[i]); g.lineTo(X(i), Y(peak)); }
    for (i = n - 1; i >= 0; i--) g.lineTo(X(i), Y(eq[i]));
    g.closePath();
    g.fillStyle = bad.replace(")", ", .16)").replace("rgb", "rgba");
    if (g.fillStyle === bad) g.fillStyle = "rgba(255,107,107,.16)";
    g.fill();

    var grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, accent + "55");
    grad.addColorStop(1, accent + "00");
    g.beginPath(); g.moveTo(X(0), h);
    for (i = 0; i < n; i++) g.lineTo(X(i), Y(eq[i]));
    g.lineTo(X(n - 1), h); g.closePath();
    g.fillStyle = grad; g.fill();

    g.beginPath();
    for (i = 0; i < n; i++) { if (i === 0) g.moveTo(X(i), Y(eq[i])); else g.lineTo(X(i), Y(eq[i])); }
    g.strokeStyle = accent; g.lineWidth = 1.8; g.stroke();

    var tip = $("#eqTip");
    cv.onmousemove = function (e) {
      var rect = cv.getBoundingClientRect();
      var k = Math.round((e.clientX - rect.left - 4) / (w - 8) * (n - 1));
      k = Math.max(0, Math.min(n - 1, k));
      tip.textContent = fmt(eq[k], 2);
      tip.style.left = X(k) + "px";
      tip.style.top = Y(eq[k]) + "px";
      tip.classList.add("on");
    };
    cv.onmouseleave = function () { tip.classList.remove("on"); };
  }

  /* ============================================================
     Step 8 — export
     ============================================================ */
  var KEYWORDS = /\b(input|extern|int|double|bool|string|void|return|if|else|for|while|switch|case|break|continue|true|false|new|class|public|private|protected|override|static|namespace|using|var|group|datetime|ulong|long|const|struct|enum|default|this|null)\b/g;

  function highlight(code) {
    var out = esc(code);
    out = out.replace(/(\/\/[^\n]*|\/\*[\s\S]*?\*\/)/g, '<span class="tok-com">$1</span>');
    out = out.replace(/(&quot;(?:[^&]|&(?!quot;))*?&quot;)/g, '<span class="tok-str">$1</span>');
    out = out.replace(/^(#\w+)/gm, '<span class="tok-pre">$1</span>');
    out = out.replace(/\b(\d+\.?\d*)\b/g, '<span class="tok-num">$1</span>');
    out = out.replace(KEYWORDS, '<span class="tok-key">$1</span>');
    out = out.replace(/\b(i[A-Z]\w+|h[A-Z]\w+|p[OHLCVTA]\w*|c[A-Z]\w+)\(/g, '<span class="tok-fn">$1</span>(');
    return out;
  }

  function auditHTML(st, res) {
    var items = [];
    function add(kind, text) { items.push('<li><i class="' + kind + '">' + (kind === "ok" ? "✓" : kind === "bad" ? "✕" : "!") + "</i><span>" + text + "</span></li>"); }
    var nLong = st.entry.long[0].conds.length, nShort = st.entry.short[0].conds.length;
    if (!nLong && !nShort) add("bad", "<b>No entry rules.</b> The robot will compile but never trade.");
    else add("ok", "Entry rules: " + nLong + " long, " + nShort + " short.");
    if (st.exit.sl.mode === "none") add("bad", "<b>No stop loss.</b> One bad move can take the whole account.");
    else add("ok", "Stop loss: " + st.exit.sl.mode + ".");
    if (st.exit.tp.mode === "none" && st.exit.trail.mode === "off" && !st.exit.oppositeSignal && !st.exit.long.length)
      add("warn", "Nothing closes a winning trade — no target, no trail, no exit rule.");
    if (st.risk.martOn) add("warn", "<b>Martingale is on.</b> Size multiplies after losses. Check the lot ceiling.");
    if (st.risk.gridOn) add("warn", "<b>Grid is on.</b> Losing positions get added to rather than closed.");
    if (st.risk.lotMode === "fixed") add("warn", "Fixed lots ignore your stop distance and your balance.");
    else add("ok", "Risk-based position sizing.");
    if (!st.risk.dailyLoss && !st.risk.equityStopPct) add("warn", "No daily loss cap and no equity stop.");
    else add("ok", "Account guards are set.");
    if (st.setup.signalBar === 0 || st.setup.signalBar === "0") add("warn", "Reading the live bar — signals can appear and disappear within the same bar.");
    else add("ok", "Signals read the last closed bar.");
    if (res) {
      if (res.total < 30) add("warn", "Only " + res.total + " trades in the backtest — far too few to mean anything.");
      else add("ok", res.total + " trades in the backtest.");
      if (res.profitFactor < 1) add("bad", "Backtest profit factor is below 1: the rules lost money on your own data.");
    } else add("warn", "Not backtested yet.");
    return '<ul class="checklist">' + items.join("") + "</ul>";
  }

  function stepExport() {
    var st = B.ST(), p = st.platform, meta = U.PLATFORMS[p];
    var built;
    try { built = EA.CG.build(st, p); }
    catch (e) { built = { code: "// Generation failed: " + e.message, file: "error.txt", warnings: [String(e.message)] }; }
    window.__built = built;
    var lines = built.code.split("\n").length;

    return block("Your " + meta.lang + " file", "One self-contained file. No extra indicators to install, no library to copy.",
      '<div class="code"><div class="code__bar"><span>' + esc(built.file) + "</span><span class=\"faint\">" + lines + " lines · " + meta.lang + "</span>" +
      '<span class="spacer"></span><button class="addbtn" type="button" id="copyCode">Copy</button>' +
      '<button class="addbtn addbtn--accent" type="button" id="dlCode">Download</button></div>' +
      "<pre><code>" + highlight(built.code) + "</code></pre></div>" +
      (built.warnings.length ? '<div class="note note--warn"><b>Generator warnings:</b> ' + esc(built.warnings.join("; ")) + "</div>" : ""),
      '<button class="btn" type="button" id="dlCode2">Download ' + esc(built.file) + "</button>" +
      '<button class="btn btn--ghost" type="button" id="dlJson">Save strategy as JSON</button>' +
      '<button class="btn btn--ghost" type="button" id="loadJson">Load a JSON strategy</button>' +
      '<input type="file" id="jsonFile" accept=".json,application/json" hidden>'
    ) +
    '<div class="exportgrid">' +
    block("Pre-flight check", "Read this before you attach the robot to anything.", auditHTML(st, B.result().r)) +
    block("Install", "", installHTML(p, built.file)) +
    "</div>" +
    block("Saved strategies", "Kept in this browser's local storage. Clearing site data deletes them, so export the JSON for anything you care about.",
      '<div class="saved" id="savedList"></div>');
  }

  function installHTML(p, file) {
    if (p === "ct") {
      return '<ol class="checklist" style="counter-reset:none">' +
        "<li><i class=\"ok\">1</i><span>In cTrader open <b>Automate</b> → <b>cBots</b> → <b>New</b>.</span></li>" +
        "<li><i class=\"ok\">2</i><span>Delete the template code and paste this file in whole.</span></li>" +
        "<li><i class=\"ok\">3</i><span>Press <b>Build</b> (F6). It should compile with no references added.</span></li>" +
        "<li><i class=\"ok\">4</i><span>Open a chart on the symbol and timeframe you designed for, add the cBot, set parameters, <b>Play</b>.</span></li>" +
        "<li><i class=\"warn\">5</i><span>Run <b>Backtest</b> in Automate first, on a demo account after that.</span></li>" +
        "</ol>";
    }
    var five = p === "mt5";
    return '<ol class="checklist">' +
      "<li><i class=\"ok\">1</i><span>In MetaTrader " + (five ? "5" : "4") + " press <b>F4</b> to open MetaEditor.</span></li>" +
      "<li><i class=\"ok\">2</i><span><b>File → New → Expert Advisor</b>, name it, then replace everything with this file.</span></li>" +
      "<li><i class=\"ok\">3</i><span>Or drop <b>" + esc(file) + "</b> straight into <span class=\"mono\">MQL" + (five ? "5" : "4") + "/Experts</span> and refresh the Navigator.</span></li>" +
      "<li><i class=\"ok\">4</i><span>Press <b>F7</b> to compile. Zero errors expected.</span></li>" +
      "<li><i class=\"ok\">5</i><span>Drag it onto a chart, tick <b>Allow Algo Trading</b>, set the inputs.</span></li>" +
      "<li><i class=\"warn\">6</i><span>Run the <b>Strategy Tester</b> on real broker history before anything else.</span></li>" +
      "</ol>";
  }

  /* ============================================================
     rendering
     ============================================================ */
  var RENDER = {
    setup: U.stepSetup, entry: U.stepEntry, exit: U.stepExit,
    risk: stepRisk, filters: stepFilters, alerts: stepAlerts, test: stepTest, export: stepExport
  };

  function render() {
    var k = U.step();
    U.renderRail();
    $("#steps").innerHTML = '<div class="step on">' + RENDER[k]() + "</div>";
    if (k === "test") { drawEquity(); }
    if (k === "export") renderSaved();
    var st = B.ST();
    $("#platPill").innerHTML = '<i style="background:' + U.PLATFORMS[st.platform].color + '"></i><b>' + esc(U.PLATFORMS[st.platform].short) + "</b>";
    $("#nameField").value = st.name;
    B.save();
  }

  function renderSaved() {
    var list = B.library(), el = $("#savedList");
    if (!el) return;
    if (!list.length) { el.innerHTML = '<span class="faint">Nothing saved yet.</span>'; return; }
    el.innerHTML = list.map(function (s) {
      return '<div class="saveditem"><b>' + esc(s.name) + "</b>" +
        '<span class="tag">' + esc(U.PLATFORMS[s.platform] ? U.PLATFORMS[s.platform].short : s.platform) + "</span>" +
        '<span>' + new Date(s.saved).toLocaleDateString() +
        (s.stats ? " · " + fmt(s.stats.winRate, 1) + "% win, PF " + fmt(s.stats.profitFactor, 2) + ", " + fmt(s.stats.total) + " trades" : "") +
        "</span>" +
        '<span class="grow"><button class="addbtn" type="button" data-loadsaved="' + s.id + '">Load</button>' +
        '<button class="cond__x" type="button" data-delsaved="' + s.id + '">✕</button></span></div>';
    }).join("");
  }

  /* ============================================================
     palette
     ============================================================ */
  var palTarget = null, palTab = "ind", palQuery = "";

  function openPalette(side, gi) {
    palTarget = { side: side, gi: gi };
    palTab = "ind"; palQuery = "";
    $("#palette").classList.add("on");
    document.body.style.overflow = "hidden";
    renderPalette();
    setTimeout(function () { $("#palSearch").focus(); }, 60);
  }
  function closePalette() {
    $("#palette").classList.remove("on");
    document.body.style.overflow = "";
  }
  function renderPalette() {
    var q = palQuery.toLowerCase();
    var list = [], groups = {};
    if (palTab === "ind") {
      EA.IND.forEach(function (i) {
        if (q && (i.name + " " + i.group + " " + i.note).toLowerCase().indexOf(q) < 0) return;
        (groups[i.group] = groups[i.group] || []).push({ id: i.id, name: i.name, note: i.note, kind: "ind" });
      });
    } else {
      EA.PAT.forEach(function (p) {
        if (q && (p.name + " " + p.group + " " + p.note).toLowerCase().indexOf(q) < 0) return;
        (groups[p.group] = groups[p.group] || []).push({ id: p.id, name: p.name, note: p.note, kind: "pat" });
      });
    }
    var html = Object.keys(groups).map(function (g) {
      return '<div class="modal__grp">' + esc(g) + "</div>" + groups[g].map(function (x) {
        return '<button class="pitem" type="button" data-pick="' + x.kind + ":" + x.id + '"><b>' + esc(x.name) +
          "</b><span>" + esc(x.note) + "</span></button>";
      }).join("");
    }).join("");
    $("#palList").innerHTML = html || '<div class="faint" style="padding:24px;text-align:center">Nothing matches “' + esc(palQuery) + "”.</div>";
    $$("#palette .modal__tabs button").forEach(function (b) {
      b.setAttribute("aria-selected", String(b.dataset.tab === palTab));
    });
  }
  function pickFromPalette(v) {
    var parts = v.split(":"), kind = parts[0], id = parts[1];
    var st = B.ST();
    var g = groupFor(palTarget.side, palTarget.gi);
    if (kind === "pat") g.conds.push(B.patCond(id));
    else {
      var def = EA.IND_BY[id];
      var a = B.ind(id, EA.CG.defaults(def), def.outs[0].k);
      var isOsc = /Oscillator/.test(def.group);
      g.conds.push(B.cmp(a, isOsc ? "cross_above" : "gt", isOsc ? B.konst(50) : B.price("close")));
    }
    closePalette();
    render();
  }

  function groupFor(side, gi) {
    var st = B.ST();
    if (side === "long") return st.entry.long[gi];
    if (side === "short") return st.entry.short[gi];
    if (side === "exitlong") return st.exit.long[gi];
    return st.exit.short[gi];
  }

  /* ============================================================
     events
     ============================================================ */
  function onChange(e) {
    var t = e.target, st = B.ST(), need = false;

    if (t.dataset.path) {
      var v;
      if (t.dataset.t === "bool") v = t.checked;
      else if (t.dataset.t === "num") v = num(t.value, 0);
      else v = t.value;
      if (t.dataset.path === "setup.signalBar") v = parseInt(t.value, 10);
      U.setPath(st, t.dataset.path, v);
      if (t.dataset.rerender) need = true;
      B.save();
      if (t.dataset.path.indexOf("test.") === 0 && !need) return;
      if (need) render();
      return;
    }
    if (t.dataset.day != null) {
      st.filters.days[+t.dataset.day] = t.checked ? 1 : 0; B.save(); return;
    }
    if (t.dataset.news) {
      st.filters.newsWindows[+t.dataset.i][t.dataset.news] = t.value; B.save(); return;
    }
    var g, c;
    if (t.dataset.join) { groupFor(t.dataset.side, +t.dataset.g).join = t.value; render(); return; }
    if (t.dataset.op) {
      g = groupFor(t.dataset.side, +t.dataset.g); c = g.conds[+t.dataset.c];
      c[t.dataset.op] = operandFromValue(t.value);
      render(); return;
    }
    if (t.dataset.opval) {
      g = groupFor(t.dataset.side, +t.dataset.g); c = g.conds[+t.dataset.c];
      c[t.dataset.opval] = { t: "const", value: num(t.value, 0) };
      B.save(); return;
    }
    if (t.dataset.opp) {
      g = groupFor(t.dataset.side, +t.dataset.g); c = g.conds[+t.dataset.c];
      var op = c[t.dataset.opp];
      if (op && op.t === "ind") {
        var def = EA.IND_BY[op.id];
        var pd = def.params.filter(function (x) { return x.k === t.dataset.key; })[0];
        op.p = op.p || {};
        op.p[t.dataset.key] = (pd && pd.t === "enum") ? t.value : num(t.value, pd ? pd.def : 0);
      }
      B.save(); return;
    }
    if (t.dataset.opsel) {
      g = groupFor(t.dataset.side, +t.dataset.g); c = g.conds[+t.dataset.c];
      c.op = t.value;
      var spec = EA.CG.OPS_BY[c.op];
      if (spec.c && !c.c) c.c = B.konst(0);
      if (spec.b && !c.b) c.b = B.konst(0);
      render(); return;
    }
    if (t.dataset.bars) { groupFor(t.dataset.side, +t.dataset.g).conds[+t.dataset.c].bars = num(t.value, 1); B.save(); return; }
    if (t.dataset.tol)  { groupFor(t.dataset.side, +t.dataset.g).conds[+t.dataset.c].tol = num(t.value, 10); B.save(); return; }
  }

  function operandFromValue(v) {
    if (v === "const") return B.konst(0);
    if (v.indexOf("price:") === 0) return B.price(v.slice(6));
    var p = v.split(":");
    var def = EA.IND_BY[p[1]];
    return B.ind(p[1], EA.CG.defaults(def), p[2]);
  }

  function onClick(e) {
    var t = e.target.closest("[data-step],[data-act],[data-add],[data-del],[data-preset],[data-pick],[data-tab],[data-newsadd],[data-newsdel],[data-loadsaved],[data-delsaved],#copyCode,#dlCode,#dlCode2,#dlJson,#loadJson,#runTest,#saveRun,#exportTrades,#palClose,[data-plat]");
    if (!t) return;
    var st = B.ST();

    if (t.dataset.plat) { st.platform = t.dataset.plat; B.save(); showWork(); render(); return; }
    if (t.dataset.step) { U.step(t.dataset.step); location.hash = t.dataset.step; render(); window.scrollTo({ top: 0, behavior: "smooth" }); return; }
    if (t.dataset.act === "platform") { $("#gate").hidden = false; $("#work").hidden = true; window.scrollTo({ top: 0, behavior: "smooth" }); return; }
    if (t.dataset.preset) {
      var p = B.PRESETS.filter(function (x) { return x.k === t.dataset.preset; })[0];
      if (!p) return;
      var fresh = B.blank();
      fresh.platform = st.platform;
      p.apply(fresh);
      B.set(fresh);
      U.step("entry"); render();
      if (GA) GA.toast("Loaded “" + p.name + "”. Have a look at the entry rules.", "ok");
      return;
    }
    if (t.dataset.add) {
      if (t.dataset.add === "block") { openPalette(t.dataset.side, +t.dataset.g); return; }
      var g = groupFor(t.dataset.side, +t.dataset.g);
      g.conds.push(B.cmp(B.price("close"), "gt", B.ind("ma", { period: 20, method: "ema", price: "close" }, "main")));
      render(); return;
    }
    if (t.dataset.del) {
      groupFor(t.dataset.side, +t.dataset.g).conds.splice(+t.dataset.c, 1);
      render(); return;
    }
    if (t.dataset.pick) { pickFromPalette(t.dataset.pick); return; }
    if (t.dataset.tab) { palTab = t.dataset.tab; renderPalette(); return; }
    if (t.id === "palClose") { closePalette(); return; }
    if (t.dataset.newsadd != null) { st.filters.newsWindows.push({ from: "12:25", to: "13:05" }); render(); return; }
    if (t.dataset.newsdel != null) { st.filters.newsWindows.splice(+t.dataset.newsdel, 1); render(); return; }
    if (t.dataset.loadsaved) {
      var rec = B.library().filter(function (x) { return x.id === t.dataset.loadsaved; })[0];
      if (rec) { B.set(rec.strategy); U.step("setup"); render(); if (GA) GA.toast("Loaded “" + rec.name + "”.", "ok"); }
      return;
    }
    if (t.dataset.delsaved) {
      B.saveLibrary(B.library().filter(function (x) { return x.id !== t.dataset.delsaved; }));
      renderSaved(); return;
    }
    if (t.id === "copyCode") { if (GA) GA.copy(window.__built.code, "Code copied."); return; }
    if (t.id === "dlCode" || t.id === "dlCode2") { download(window.__built.file, window.__built.code); return; }
    if (t.id === "dlJson") { download(EA.CG.ident(st.name) + ".getea.json", JSON.stringify(st, null, 2)); return; }
    if (t.id === "loadJson") { $("#jsonFile").click(); return; }
    if (t.id === "runTest") { runTest(); return; }
    if (t.id === "saveRun") {
      var r = B.result().r;
      B.storeStrategy(r ? { winRate: r.winRate, profitFactor: r.profitFactor, total: r.total, netProfit: r.netProfit } : null);
      if (GA) GA.toast("Saved to this browser.", "ok");
      renderSaved();
      return;
    }
    if (t.id === "exportTrades") { exportTrades(); return; }
  }

  function download(name, text) {
    var blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 400);
  }

  function exportTrades() {
    var r = B.result().r;
    if (!r) return;
    var rows = ["open_time,close_time,side,lots,entry,exit,pips,profit,bars,closed_by,balance"];
    r.trades.forEach(function (t) {
      rows.push([new Date(t.openTime).toISOString(), new Date(t.closeTime).toISOString(),
        t.dir > 0 ? "buy" : "sell", t.lots, t.entry, t.exit, t.pips.toFixed(1), t.profit.toFixed(2), t.bars, t.why, t.balance.toFixed(2)].join(","));
    });
    download(EA.CG.ident(B.ST().name) + "-trades.csv", rows.join("\n"));
  }

  /* ---------------- backtest wiring ---------------- */
  function readFile(file) {
    var note = $("#testNote");
    note.textContent = "Reading " + file.name + "…";
    var fr = new FileReader();
    fr.onload = function () {
      var out = EA.BT.parseCSV(fr.result, 300000);
      if (out.errors.length) {
        $("#dataInfo").innerHTML = '<div class="note note--bad">' + esc(out.errors.join(" ")) + "</div>";
        note.textContent = "";
        return;
      }
      out.meta.fileName = file.name;
      out.meta.warnings = out.warnings;
      B.result(B.result().r, out.d, out.meta);
      $("#dataInfo").innerHTML = dataInfoHTML();
      note.textContent = "Ready. Press run.";
      runTest();
    };
    fr.readAsText(file);
  }

  function runTest() {
    var got = B.result();
    if (!got.d) { if (GA) GA.toast("Load a CSV first.", "warn"); return; }
    var st = B.ST(), T = st.test;
    var inst = EA.BT.INSTRUMENTS.filter(function (i) { return i.k === T.instrument; })[0] || EA.BT.INSTRUMENTS[0];
    var opts = {
      balance: T.balance, spreadPips: T.spreadPips, commission: T.commission, slippagePips: T.slippagePips,
      instrument: inst,
      pip: T.instrument === "custom" ? T.pip : inst.pip,
      pipValue: T.instrument === "custom" ? T.pipValue : inst.pipValue
    };
    $("#testNote").textContent = "Running…";
    setTimeout(function () {
      try {
        var r = EA.BT.run(st, got.d, opts);
        B.result(r, got.d, got.m);
        render();
        $("#testNote").textContent = "Done — " + r.total + " trades.";
      } catch (e) {
        $("#dataInfo").innerHTML = '<div class="note note--bad">The simulation failed: ' + esc(e.message) + "</div>";
        if (window.console) console.error(e);
      }
    }, 30);
  }

  /* ---------------- platform gate ---------------- */
  function showWork() {
    $("#gate").hidden = true;
    $("#work").hidden = false;
  }

  /* ---------------- init ---------------- */
  function init() {
    if (!$("#steps")) return;
    B.load();
    var params = new URLSearchParams(location.search);
    if (params.get("platform") && U.PLATFORMS[params.get("platform")]) B.ST().platform = params.get("platform");
    if (params.get("preset")) {
      var p = B.PRESETS.filter(function (x) { return x.k === params.get("preset"); })[0];
      if (p) { var fresh = B.blank(); fresh.platform = B.ST().platform; p.apply(fresh); B.set(fresh); }
    }
    var hash = location.hash.replace("#", "");
    if (U.STEPS.filter(function (s) { return s.k === hash; }).length) U.step(hash);

    $$("[data-plat]").forEach(function (b) {
      b.addEventListener("mousemove", function (e) {
        var r = b.getBoundingClientRect();
        b.style.setProperty("--mx", (e.clientX - r.left) + "px");
        b.style.setProperty("--my", (e.clientY - r.top) + "px");
      });
    });

    if (params.get("platform") || localStorage.getItem("getea.current")) showWork();

    document.addEventListener("change", onChange);
    document.addEventListener("input", function (e) {
      if (e.target.matches("input.input, .textarea")) onChange(e);
    });
    document.addEventListener("click", onClick);

    $("#nameField").addEventListener("input", function () { B.ST().name = this.value || "Untitled robot"; B.save(); });
    $("#palSearch").addEventListener("input", function () { palQuery = this.value; renderPalette(); });
    $("#palette").addEventListener("click", function (e) { if (e.target === this) closePalette(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closePalette(); });

    var drop = null;
    document.addEventListener("dragover", function (e) {
      if (!$("#drop")) return;
      e.preventDefault(); $("#drop").classList.add("over");
    });
    document.addEventListener("dragleave", function () { if ($("#drop")) $("#drop").classList.remove("over"); });
    document.addEventListener("drop", function (e) {
      if (!$("#drop")) return;
      e.preventDefault(); $("#drop").classList.remove("over");
      if (e.dataTransfer.files && e.dataTransfer.files[0]) readFile(e.dataTransfer.files[0]);
    });
    document.addEventListener("change", function (e) {
      if (e.target.id === "csv" && e.target.files[0]) readFile(e.target.files[0]);
      if (e.target.id === "jsonFile" && e.target.files[0]) {
        var fr = new FileReader();
        fr.onload = function () {
          try {
            var o = JSON.parse(fr.result);
            if (!o.entry) throw new Error("Not a GetEA strategy file.");
            B.set(Object.assign(B.blank(), o));
            U.step("setup"); render();
            if (GA) GA.toast("Strategy loaded.", "ok");
          } catch (err) { if (GA) GA.toast("Could not read that file.", "bad"); }
        };
        fr.readAsText(e.target.files[0]);
      }
    });
    window.addEventListener("resize", function () { if (U.step() === "test") drawEquity(); });
    window.addEventListener("hashchange", function () {
      var h = location.hash.replace("#", "");
      if (U.STEPS.filter(function (s) { return s.k === h; }).length && h !== U.step()) { U.step(h); render(); }
    });

    render();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

  window.EA.UI.render = render;
})();
