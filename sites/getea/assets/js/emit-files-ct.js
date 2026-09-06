/* ============================================================
   GetEA — cTrader (cAlgo) file assembly.
   Produces one self-contained .cs cBot: no Indicators.* calls,
   no external references, only the core Robot API.
   ============================================================ */
(function () {
  "use strict";
  var EA = window.EA, CG = EA.CG, Hh = EA.CG._helpers;
  var n = Hh.n, d = Hh.d, esc = Hh.esc, J = Hh.J, hm = Hh.hm;

  function buildCT(st) {
    var plan = new CG.Plan("ct");
    var s = "s";
    var S = st.setup || {}, X = st.exit || {}, R = st.risk || {}, F = st.filters || {}, A = st.alerts || {};

    var longEntry  = CG.rulesExpr(plan, (st.entry || {}).long, s);
    var shortEntry = CG.rulesExpr(plan, (st.entry || {}).short, s);
    var longExit   = CG.rulesExpr(plan, X.long, s);
    var shortExit  = CG.rulesExpr(plan, X.short, s);

    var atrRefs = {};
    function atrExpr(period) {
      var k = "a" + period;
      if (!atrRefs[k]) atrRefs[k] = CG.operand(plan, { t: "ind", id: "atr", p: { period: Number(period) || 14 }, out: "main" }, "1");
      return atrRefs[k];
    }

    var SL = X.sl || { mode: "pips", pips: 30 }, TP = X.tp || { mode: "pips", pips: 60 };
    var TR = X.trail || { mode: "off" }, BE = X.be || {}, PC = X.partial || {}, TE = X.timeExit || {};

    var slExpr = "0";
    if (SL.mode === "pips")    slExpr = "InpSLPips * Symbol.PipSize";
    if (SL.mode === "atr")     slExpr = d(SL.atrMult || 1.5) + " * " + atrExpr(SL.atrPeriod || 14);
    if (SL.mode === "percent") slExpr = "Price(isLong) * " + d((SL.pct || 1) / 100);
    if (SL.mode === "swing") {
      plan.useHelper(["px", "levels", "hhll"]);
      slExpr = "(isLong ? Price(true) - hSwing(" + n(SL.swingWing || 2) + ", 1, 1) : hSwing(" + n(SL.swingWing || 2) + ", 1, 0) - Price(false))";
    }
    var tpExpr = "0";
    if (TP.mode === "pips")    tpExpr = "InpTPPips * Symbol.PipSize";
    if (TP.mode === "atr")     tpExpr = d(TP.atrMult || 3) + " * " + atrExpr(TP.atrPeriod || 14);
    if (TP.mode === "percent") tpExpr = "Price(isLong) * " + d((TP.pct || 2) / 100);
    if (TP.mode === "rr")      tpExpr = "slDist * " + d(TP.rr || 2);

    var trailExpr = "0";
    if (TR.mode === "pips") trailExpr = "InpTrailPips * Symbol.PipSize";
    if (TR.mode === "atr")  trailExpr = d(TR.atrMult || 2) + " * " + atrExpr(TR.atrPeriod || 14);

    var volExpr = F.volOn ? atrExpr(F.atrPeriod || 14) : null;

    var sigLong  = longEntry  || "false";
    var sigShort = shortEntry || "false";
    var exLong   = longExit   || (X.oppositeSignal !== false ? sigShort : "false");
    var exShort  = shortExit  || (X.oppositeSignal !== false ? sigLong  : "false");

    /* ---- parameters ---- */
    function P(label, name, val, type) {
      var v = type === "bool" ? (val ? "true" : "false") : type === "int" ? n(val) : type === "string" ? '"' + esc(val) + '"' : d(val);
      var t = type === "bool" ? "bool" : type === "int" ? "int" : type === "string" ? "string" : "double";
      return '        [Parameter("' + label + '", DefaultValue = ' + v + ')]\n' +
             "        public " + t + " " + name + " { get; set; }\n";
    }
    var pars = [];
    pars.push(P("Signal bar (0 live, 1 closed)", "InpSignalBar", S.signalBar === 0 ? 0 : 1, "int"));
    pars.push(P("Act once per bar", "InpOnBarClose", S.onBarClose !== false, "bool"));
    pars.push(P("Label", "InpLabel", (S.comment || "GetEA"), "string"));
    pars.push(P("Lot mode 0 fixed 1 %risk 2 money 3 per1k", "InpLotMode", ({ fixed: 0, percent: 1, money: 2, per1k: 3 }[R.lotMode] || 0), "int"));
    pars.push(P("Lots", "InpLots", R.lots || 0.01));
    pars.push(P("Risk per trade %", "InpRiskPct", R.riskPct || 1));
    pars.push(P("Risk per trade (money)", "InpRiskMoney", R.riskMoney || 50));
    pars.push(P("Lots per 1000 balance", "InpLotsPer1k", R.lotsPer1k || 0.01));
    pars.push(P("Max lots", "InpMaxLots", R.maxLots || 10));
    pars.push(P("Stop loss (pips)", "InpSLPips", SL.pips || 30));
    pars.push(P("Take profit (pips)", "InpTPPips", TP.pips || 60));
    pars.push(P("Trailing distance (pips)", "InpTrailPips", TR.dist || 20));
    pars.push(P("Start trailing after (pips)", "InpTrailStart", TR.start || 20));
    pars.push(P("Trail step (pips)", "InpTrailStep", TR.step || 5));
    pars.push(P("Break-even trigger (pips)", "InpBETrigger", BE.trigger || 20));
    pars.push(P("Break-even offset (pips)", "InpBEOffset", BE.offset || 2));
    pars.push(P("Partial close at (pips)", "InpPartialAt", PC.at || 25));
    pars.push(P("Partial close (%)", "InpPartialPct", PC.pct || 50));
    pars.push(P("Max open positions", "InpMaxPos", R.maxPositions || 1, "int"));
    pars.push(P("Max trades per day (0 off)", "InpMaxPerDay", R.maxTradesPerDay || 0, "int"));
    pars.push(P("Min bars between entries", "InpMinBars", R.minBarsBetween || 0, "int"));
    pars.push(P("Daily loss cap (0 off)", "InpDailyLoss", R.dailyLoss || 0));
    pars.push(P("Daily profit target (0 off)", "InpDailyProfit", R.dailyProfit || 0));
    pars.push(P("Equity stop % (0 off)", "InpEquityStop", R.equityStopPct || 0));
    pars.push(P("Stop after N losses (0 off)", "InpMaxLossRun", R.maxConsecLoss || 0, "int"));
    pars.push(P("Max spread (pips, 0 off)", "InpMaxSpread", (S.maxSpread || 0) / 10));
    if (R.martOn) {
      pars.push(P("Martingale multiplier", "InpMartMult", R.martMult || 2));
      pars.push(P("Max martingale steps", "InpMartMax", R.martMax || 3, "int"));
    }
    if (R.gridOn) {
      pars.push(P("Grid step (pips)", "InpGridStep", R.gridStep || 20));
      pars.push(P("Grid lot multiplier", "InpGridMult", R.gridMult || 1));
      pars.push(P("Max grid levels", "InpGridMax", R.gridMax || 3, "int"));
    }
    pars.push(P("Restrict trading hours", "InpHoursOn", !!F.hoursOn, "bool"));
    pars.push(P("From hour (server)", "InpHourFrom", F.hourFrom || 0, "int"));
    pars.push(P("To hour (server)", "InpHourTo", F.hourTo || 24, "int"));
    var days = F.days || [1, 1, 1, 1, 1, 0, 0];
    ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].forEach(function (dn, k) {
      pars.push(P("Trade on " + dn, "InpTrade" + dn, !!days[k], "bool"));
    });
    if (F.volOn) {
      pars.push(P("Minimum ATR (pips, 0 off)", "InpMinATR", F.atrMin || 0));
      pars.push(P("Maximum ATR (pips, 0 off)", "InpMaxATR", F.atrMax || 0));
    }
    pars.push(P("Print alerts", "InpAlertPopup", !!A.popup, "bool"));
    pars.push(P("Email alerts", "InpAlertMail", !!A.email, "bool"));
    pars.push(P("Alert email from", "InpMailFrom", A.mailFrom || "bot@example.com", "string"));
    pars.push(P("Alert email to", "InpMailTo", A.mailTo || "you@example.com", "string"));

    var helperSrc = CG.helperBlock(plan);
    var cls = CG.ident(st.name || "GetEaRobot");

    var newsGuard = (F.newsOn && (F.newsWindows || []).length)
      ? (function () {
          var out = ["            int mins = t.Hour * 60 + t.Minute;"];
          F.newsWindows.forEach(function (w) {
            out.push("            if (mins >= " + hm(w.from) + " && mins < " + hm(w.to) + ") return false;");
          });
          return out.join("\n");
        })()
      : null;

    var body = J([
      "using System;",
      "using cAlgo.API;",
      "using cAlgo.API.Internals;",
      "",
      "/* ------------------------------------------------------------------",
      "   " + esc(st.name || "GetEA robot") + ".cs",
      "   Generated by GetEA — https://getea.getapps.tech",
      "   " + new Date().toISOString().slice(0, 10) + "   cTrader Automate (cAlgo, C#)",
      "",
      "   Attach the cBot to the chart timeframe you designed the strategy",
      "   on: every rule reads that chart's bars. Test on a demo account",
      "   first — a backtest is a description of the past, not a forecast.",
      "   ------------------------------------------------------------------ */",
      "",
      "namespace cAlgo.Robots",
      "{",
      "    [Robot(AccessRights = AccessRights.None)]",
      "    public class " + cls + " : Robot",
      "    {",
      pars.join("\n"),
      "        private System.DateTime _lastBar;",
      "        private System.DateTime _lastEntry;",
      "        private double _peakEquity;",
      "        private int _tradesToday;",
      "        private int _today = -1;",
      "        private System.Collections.Generic.List<int> _partial = new System.Collections.Generic.List<int>();",
      "",
      "        /* ---------------- bar and price access ---------------- */",
      helperSrc.split("\n").map(function (l) { return l ? "        " + l : ""; }).join("\n"),
      "",
      "        private double Price(bool isLong) { return isLong ? Symbol.Ask : Symbol.Bid; }",
      "",
      "        private bool IsNewBar()",
      "        {",
      "            var t = Bars.OpenTimes.Last(0);",
      "            if (t == _lastBar) return false;",
      "            _lastBar = t;",
      "            return true;",
      "        }",
      "",
      "        private void Notify(string msg)",
      "        {",
      "            string full = SymbolName + \" \" + msg;",
      "            if (InpAlertPopup) Print(full);",
      "            if (InpAlertMail)",
      "            {",
      "                try { Notifications.SendEmail(InpMailFrom, InpMailTo, \"" + esc(st.name || "GetEA") + "\", full); }",
      "                catch (System.Exception e) { Print(\"Email failed: \" + e.Message); }",
      "            }",
      "        }",
      "",
      "        /* ---------------- rules ---------------- */",
      "        private bool LongSignal()      { int s = InpSignalBar; return " + sigLong + "; }",
      "        private bool ShortSignal()     { int s = InpSignalBar; return " + sigShort + "; }",
      "        private bool LongExitSignal()  { int s = InpSignalBar; return " + exLong + "; }",
      "        private bool ShortExitSignal() { int s = InpSignalBar; return " + exShort + "; }",
      "",
      "        /* ---------------- account helpers ---------------- */",
      "        private int OpenCount(int dir)",
      "        {",
      "            int c = 0;",
      "            foreach (var p in Positions)",
      "            {",
      "                if (p.SymbolName != SymbolName || p.Label != InpLabel) continue;",
      "                if (dir == 1 && p.TradeType != TradeType.Buy) continue;",
      "                if (dir == -1 && p.TradeType != TradeType.Sell) continue;",
      "                c++;",
      "            }",
      "            return c;",
      "        }",
      "",
      "        private Position Newest(int dir)",
      "        {",
      "            Position best = null;",
      "            foreach (var p in Positions)",
      "            {",
      "                if (p.SymbolName != SymbolName || p.Label != InpLabel) continue;",
      "                if (dir == 1 && p.TradeType != TradeType.Buy) continue;",
      "                if (dir == -1 && p.TradeType != TradeType.Sell) continue;",
      "                if (best == null || p.EntryTime >= best.EntryTime) best = p;",
      "            }",
      "            return best;",
      "        }",
      "",
      "        private void CloseDir(int dir)",
      "        {",
      "            foreach (var p in Positions)",
      "            {",
      "                if (p.SymbolName != SymbolName || p.Label != InpLabel) continue;",
      "                if (dir == 1 && p.TradeType != TradeType.Buy) continue;",
      "                if (dir == -1 && p.TradeType != TradeType.Sell) continue;",
      "                ClosePosition(p);",
      "            }",
      "        }",
      "",
      "        private int LossRun()",
      "        {",
      "            int run = 0;",
      "            for (int k = History.Count - 1; k >= 0; k--)",
      "            {",
      "                var h = History[k];",
      "                if (h.SymbolName != SymbolName || h.Label != InpLabel) continue;",
      "                if (h.NetProfit < 0) run++; else break;",
      "            }",
      "            return run;",
      "        }",
      "",
      "        private double DayProfit()",
      "        {",
      "            double sum = 0;",
      "            foreach (var h in History)",
      "                if (h.SymbolName == SymbolName && h.Label == InpLabel && h.ClosingTime.Date == Server.Time.Date)",
      "                    sum += h.NetProfit;",
      "            foreach (var p in Positions)",
      "                if (p.SymbolName == SymbolName && p.Label == InpLabel)",
      "                    sum += p.NetProfit;",
      "            return sum;",
      "        }",
      "",
      "        private double NormalizeLots(double lots)",
      "        {",
      "            if (lots > InpMaxLots) lots = InpMaxLots;",
      "            double units = Symbol.QuantityToVolumeInUnits(lots);",
      "            units = Symbol.NormalizeVolumeInUnits(units, RoundingMode.Down);",
      "            if (units < Symbol.VolumeInUnitsMin) units = Symbol.VolumeInUnitsMin;",
      "            if (units > Symbol.VolumeInUnitsMax) units = Symbol.VolumeInUnitsMax;",
      "            return units;",
      "        }",
      "",
      "        private double CalcVolume(double slDist)",
      "        {",
      "            double lots = InpLots;",
      "            double bal = Account.Balance;",
      "            double slPips = Symbol.PipSize > 0 ? slDist / Symbol.PipSize : 0;",
      "            double perPip = Symbol.PipValue;",
      "            if (InpLotMode == 1 && slPips > 0 && perPip > 0)",
      "                return ClampUnits((bal * InpRiskPct / 100.0) / (slPips * perPip));",
      "            if (InpLotMode == 2 && slPips > 0 && perPip > 0)",
      "                return ClampUnits(InpRiskMoney / (slPips * perPip));",
      "            if (InpLotMode == 3) lots = bal / 1000.0 * InpLotsPer1k;",
      (R.martOn ? "            int run = LossRun();\n            if (run > 0) lots *= System.Math.Pow(InpMartMult, System.Math.Min(run, InpMartMax));" : null),
      "            return NormalizeLots(lots);",
      "        }",
      "",
      "        private double ClampUnits(double units)",
      "        {",
      (R.martOn ? "            int run = LossRun();\n            if (run > 0) units *= System.Math.Pow(InpMartMult, System.Math.Min(run, InpMartMax));" : null),
      "            units = Symbol.NormalizeVolumeInUnits(units, RoundingMode.Down);",
      "            double maxUnits = Symbol.QuantityToVolumeInUnits(InpMaxLots);",
      "            if (units > maxUnits) units = maxUnits;",
      "            if (units < Symbol.VolumeInUnitsMin) units = Symbol.VolumeInUnitsMin;",
      "            if (units > Symbol.VolumeInUnitsMax) units = Symbol.VolumeInUnitsMax;",
      "            return units;",
      "        }",
      "",
      "        /* ---------------- filters ---------------- */",
      "        private bool SpreadOk()",
      "        {",
      "            if (InpMaxSpread <= 0) return true;",
      "            return (Symbol.Spread / Symbol.PipSize) <= InpMaxSpread;",
      "        }",
      "",
      "        private bool DayOk()",
      "        {",
      "            var t = Server.Time;",
      "            if (t.Day != _today) { _today = t.Day; _tradesToday = 0; }",
      "            switch (t.DayOfWeek)",
      "            {",
      "                case System.DayOfWeek.Monday:    if (!InpTradeMon) return false; break;",
      "                case System.DayOfWeek.Tuesday:   if (!InpTradeTue) return false; break;",
      "                case System.DayOfWeek.Wednesday: if (!InpTradeWed) return false; break;",
      "                case System.DayOfWeek.Thursday:  if (!InpTradeThu) return false; break;",
      "                case System.DayOfWeek.Friday:    if (!InpTradeFri) return false; break;",
      "                case System.DayOfWeek.Saturday:  if (!InpTradeSat) return false; break;",
      "                default:                         if (!InpTradeSun) return false; break;",
      "            }",
      "            if (InpHoursOn)",
      "            {",
      "                bool inWindow = InpHourFrom <= InpHourTo",
      "                    ? (t.Hour >= InpHourFrom && t.Hour < InpHourTo)",
      "                    : (t.Hour >= InpHourFrom || t.Hour < InpHourTo);",
      "                if (!inWindow) return false;",
      "            }",
      newsGuard,
      "            return true;",
      "        }",
      "",
      "        private bool VolatilityOk()",
      "        {",
      (volExpr ? "            double a = " + volExpr + " / Symbol.PipSize;" : "            return true;"),
      (volExpr ? "            if (InpMinATR > 0 && a < InpMinATR) return false;" : null),
      (volExpr ? "            if (InpMaxATR > 0 && a > InpMaxATR) return false;" : null),
      (volExpr ? "            return true;" : null),
      "        }",
      "",
      "        private bool GuardsOk()",
      "        {",
      "            double eq = Account.Equity;",
      "            if (eq > _peakEquity) _peakEquity = eq;",
      "            if (InpEquityStop > 0 && _peakEquity > 0 && (_peakEquity - eq) / _peakEquity * 100.0 >= InpEquityStop) return false;",
      "            if (InpMaxLossRun > 0 && LossRun() >= InpMaxLossRun) return false;",
      "            double dp = DayProfit();",
      "            if (InpDailyLoss > 0 && dp <= -InpDailyLoss) return false;",
      "            if (InpDailyProfit > 0 && dp >= InpDailyProfit) return false;",
      "            if (InpMaxPerDay > 0 && _tradesToday >= InpMaxPerDay) return false;",
      "            if (InpMinBars > 0 && _lastEntry != System.DateTime.MinValue)",
      "            {",
      "                double secs = (Bars.OpenTimes.Last(0) - _lastEntry).TotalSeconds;",
      "                if (secs < InpMinBars * BarSeconds()) return false;",
      "            }",
      "            return true;",
      "        }",
      "",
      "        private double BarSeconds()",
      "        {",
      "            if (Bars.Count < 3) return 60;",
      "            return System.Math.Max(1, (Bars.OpenTimes.Last(0) - Bars.OpenTimes.Last(1)).TotalSeconds);",
      "        }",
      "",
      "        /* ---------------- execution ---------------- */",
      "        private double SlDistance(bool isLong) { return " + slExpr + "; }",
      "",
      "        private double TpDistance(bool isLong, double slDist) { return " + tpExpr + "; }",
      "",
      "        private void OpenTrade(bool isLong, double unitsOverride)",
      "        {",
      "            double slDist = SlDistance(isLong);",
      "            double tpDist = TpDistance(isLong, slDist);",
      "            double units  = unitsOverride > 0 ? ClampUnits(unitsOverride) : CalcVolume(slDist);",
      "            double? slPips = slDist > 0 ? (double?)(slDist / Symbol.PipSize) : null;",
      "            double? tpPips = tpDist > 0 ? (double?)(tpDist / Symbol.PipSize) : null;",
      "            var r = ExecuteMarketOrder(isLong ? TradeType.Buy : TradeType.Sell, SymbolName, units, InpLabel, slPips, tpPips);",
      "            if (r.IsSuccessful)",
      "            {",
      "                _lastEntry = Bars.OpenTimes.Last(0);",
      "                _tradesToday++;",
      "                Notify((isLong ? \"BUY \" : \"SELL \") + units + \" @ \" + Price(isLong));",
      "            }",
      "            else Print(\"Order failed: \" + r.Error);",
      "        }",
      "",
      "        private void ManagePositions()",
      "        {",
      "            foreach (var p in Positions)",
      "            {",
      "                if (p.SymbolName != SymbolName || p.Label != InpLabel) continue;",
      "                bool isLong = p.TradeType == TradeType.Buy;",
      "                double px = isLong ? Symbol.Bid : Symbol.Ask;",
      "                double gain = (isLong ? px - p.EntryPrice : p.EntryPrice - px) / Symbol.PipSize;",
      "",
      (BE.on ? J([
        "                if (InpBETrigger > 0 && gain >= InpBETrigger)",
        "                {",
        "                    double be = isLong ? p.EntryPrice + InpBEOffset * Symbol.PipSize : p.EntryPrice - InpBEOffset * Symbol.PipSize;",
        "                    if (!p.StopLoss.HasValue || (isLong && p.StopLoss.Value < be) || (!isLong && p.StopLoss.Value > be))",
        "                        ModifyPosition(p, be, p.TakeProfit);",
        "                }",
        ""
      ]) : null),
      (TR.mode && TR.mode !== "off" ? J([
        "                if (gain >= InpTrailStart)",
        "                {",
        "                    double dist = " + trailExpr + ";",
        "                    double want = isLong ? px - dist : px + dist;",
        "                    double step = InpTrailStep * Symbol.PipSize;",
        "                    if (!p.StopLoss.HasValue ||",
        "                        (isLong && want - p.StopLoss.Value >= step) ||",
        "                        (!isLong && p.StopLoss.Value - want >= step))",
        "                        ModifyPosition(p, want, p.TakeProfit);",
        "                }",
        ""
      ]) : null),
      (PC.on ? J([
        "                if (InpPartialAt > 0 && gain >= InpPartialAt && !_partial.Contains(p.Id))",
        "                {",
        "                    double part = Symbol.NormalizeVolumeInUnits(p.VolumeInUnits * InpPartialPct / 100.0, RoundingMode.Down);",
        "                    if (part >= Symbol.VolumeInUnitsMin && part < p.VolumeInUnits)",
        "                    {",
        "                        _partial.Add(p.Id);",
        "                        ClosePosition(p, part);",
        "                        continue;",
        "                    }",
        "                }",
        ""
      ]) : null),
      (TE.onBars ? J([
        "                if ((Server.Time - p.EntryTime).TotalSeconds >= " + n(TE.bars || 20) + " * BarSeconds()) { ClosePosition(p); continue; }",
        ""
      ]) : null),
      (TE.fridayClose ? J([
        "                if (Server.Time.DayOfWeek == System.DayOfWeek.Friday && Server.Time.Hour >= " + n(TE.fridayHour || 20) + ") { ClosePosition(p); continue; }",
        ""
      ]) : null),
      "                if (isLong && LongExitSignal()) { ClosePosition(p); continue; }",
      "                if (!isLong && ShortExitSignal()) { ClosePosition(p); continue; }",
      "            }",
      "        }",
      "",
      "        /* ---------------- lifecycle ---------------- */",
      "        protected override void OnStart()",
      "        {",
      "            _peakEquity = Account.Equity;",
      "            Print(\"" + esc(st.name || "GetEA robot") + " ready on \" + SymbolName + \" \" + TimeFrame);",
      "        }",
      "",
      "        protected override void OnTick()",
      "        {",
      "            ManagePositions();",
      "            if (!InpOnBarClose) Evaluate();",
      "        }",
      "",
      "        protected override void OnBar()",
      "        {",
      "            IsNewBar();",
      "            if (InpOnBarClose) Evaluate();",
      "        }",
      "",
      "        private void Evaluate()",
      "        {",
      "            if (Bars.Count < 300) return;",
      "            if (!SpreadOk() || !DayOk() || !VolatilityOk() || !GuardsOk()) return;",
      "",
      "            bool wantLong  = " + (S.direction === "short" ? "false" : "LongSignal()") + ";",
      "            bool wantShort = " + (S.direction === "long" ? "false" : "ShortSignal()") + ";",
      "            int nLong = OpenCount(1), nShort = OpenCount(-1);",
      "",
      "            if (wantLong && !LongExitSignal() && nLong + nShort < InpMaxPos)",
      "            {",
      (R.hedge === false ? "                if (nShort > 0) CloseDir(-1);" : null),
      "                OpenTrade(true, 0);",
      "            }",
      "            else if (wantShort && !ShortExitSignal() && nLong + nShort < InpMaxPos)",
      "            {",
      (R.hedge === false ? "                if (nLong > 0) CloseDir(1);" : null),
      "                OpenTrade(false, 0);",
      "            }",
      (R.gridOn ? J([
        "",
        "            if (InpGridMax > 0)",
        "            {",
        "                if (nLong > 0 && nLong < InpGridMax)",
        "                {",
        "                    var last = Newest(1);",
        "                    if (last != null && Symbol.Ask <= last.EntryPrice - InpGridStep * Symbol.PipSize)",
        "                        OpenTrade(true, last.VolumeInUnits * InpGridMult);",
        "                }",
        "                if (nShort > 0 && nShort < InpGridMax)",
        "                {",
        "                    var last = Newest(-1);",
        "                    if (last != null && Symbol.Bid >= last.EntryPrice + InpGridStep * Symbol.PipSize)",
        "                        OpenTrade(false, last.VolumeInUnits * InpGridMult);",
        "                }",
        "            }"
      ]) : null),
      "        }",
      "",
      "        protected override void OnStop()",
      "        {",
      "            Print(\"" + esc(st.name || "GetEA robot") + " stopped.\");",
      "        }",
      "    }",
      "}"
    ]);

    return { code: body, file: cls + ".cs", warnings: plan.warn, plan: plan };
  }

  window.EA.CG.buildCT = buildCT;
  window.EA.CG.build = function (st, platform) {
    var p = platform || st.platform || "mt5";
    if (p === "ct") return buildCT(st);
    return CG.buildMT(st, p === "mt5");
  };
})();
