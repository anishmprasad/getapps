/* ============================================================
   GetEA — file assembly.
   buildMT(strategy, five)  →  a complete .mq5 (five) or .mq4
   buildCT(strategy)        →  a complete cAlgo .cs cBot
   Both share the planner in codegen.js, so the signal logic in
   all three files is the same logic, expressed three ways.
   ============================================================ */
(function () {
  "use strict";
  var EA = window.EA, CG = EA.CG;

  function n(v) { return String(Math.round(Number(v) || 0)); }
  function d(v) { v = Number(v) || 0; return Number.isInteger(v) ? v.toFixed(1) : String(v); }
  function esc(s) { return String(s == null ? "" : s).replace(/[\\"]/g, "\\$&").replace(/[\r\n]+/g, " "); }
  function ident(s) {
    var x = String(s || "GetEA_Robot").replace(/[^A-Za-z0-9_]+/g, "_").replace(/^_+|_+$/g, "");
    if (!x || /^[0-9]/.test(x)) x = "EA_" + x;
    return x;
  }
  function J(a) { return a.filter(function (x) { return x !== null && x !== undefined; }).join("\n"); }

  var TFS = ["PERIOD_CURRENT", "PERIOD_M1", "PERIOD_M5", "PERIOD_M15", "PERIOD_M30",
    "PERIOD_H1", "PERIOD_H4", "PERIOD_D1", "PERIOD_W1", "PERIOD_MN1"];

  /* ============================================================
     MetaTrader 4 / 5
     ============================================================ */
  function buildMT(st, five) {
    var plan = new CG.Plan(five ? "mt5" : "mt4");
    var s = "s";
    var S = st.setup || {}, X = st.exit || {}, R = st.risk || {}, F = st.filters || {}, A = st.alerts || {};

    var longEntry  = CG.rulesExpr(plan, (st.entry || {}).long, s);
    var shortEntry = CG.rulesExpr(plan, (st.entry || {}).short, s);
    var longExit   = CG.rulesExpr(plan, X.long, s);
    var shortExit  = CG.rulesExpr(plan, X.short, s);

    /* stop/target/trailing/filters may pull in an ATR of their own */
    var atrRefs = {};
    function atrExpr(period) {
      var key = "atr" + period;
      if (!atrRefs[key]) {
        atrRefs[key] = CG.operand(plan, { t: "ind", id: "atr", p: { period: Number(period) || 14 }, out: "main" }, "1");
      }
      return atrRefs[key];
    }
    var SL = X.sl || { mode: "pips", pips: 300 }, TP = X.tp || { mode: "pips", pips: 600 };
    var TR = X.trail || { mode: "off" }, BE = X.be || {}, PC = X.partial || {}, TE = X.timeExit || {};

    var slExpr = "0";
    if (SL.mode === "pips")    slExpr = "InpSLPips * eaPip()";
    if (SL.mode === "atr")     slExpr = d(SL.atrMult || 1.5) + " * " + atrExpr(SL.atrPeriod || 14);
    if (SL.mode === "percent") slExpr = "eaPrice(isLong) * " + d((SL.pct || 1) / 100);
    if (SL.mode === "swing") {
      plan.useHelper(["px", "swing"]);
      slExpr = "(isLong ? eaPrice(true) - hSwing(" + n(SL.swingWing || 2) + ", 1, 1) : hSwing(" + n(SL.swingWing || 2) + ", 1, 0) - eaPrice(false))";
    }
    var tpExpr = "0";
    if (TP.mode === "pips")    tpExpr = "InpTPPips * eaPip()";
    if (TP.mode === "atr")     tpExpr = d(TP.atrMult || 3) + " * " + atrExpr(TP.atrPeriod || 14);
    if (TP.mode === "percent") tpExpr = "eaPrice(isLong) * " + d((TP.pct || 2) / 100);
    if (TP.mode === "rr")      tpExpr = "slDist * " + d(TP.rr || 2);

    var trailExpr = "0";
    if (TR.mode === "pips") trailExpr = "InpTrailPips * eaPip()";
    if (TR.mode === "atr")  trailExpr = d(TR.atrMult || 2) + " * " + atrExpr(TR.atrPeriod || 14);

    var volExpr = F.volOn ? atrExpr(F.atrPeriod || 14) : null;

    /* ---- inputs ---- */
    var grp = function (t) { return five ? 'input group "' + t + '"' : "//--- " + t; };
    var inputs = [];
    inputs.push(grp("General"));
    inputs.push("input ENUM_TIMEFRAMES InpTF          = " + (TFS.indexOf(S.tf) >= 0 ? S.tf : "PERIOD_CURRENT") + ";   // Signal timeframe");
    inputs.push("input int             InpSignalBar   = " + n(S.signalBar === 0 ? 0 : 1) + ";                // 0 = live bar, 1 = last closed bar");
    inputs.push("input bool            InpOnBarClose  = " + (S.onBarClose === false ? "false" : "true") + ";             // Only act once per bar");
    inputs.push("input int             InpMagic       = " + n(S.magic || 20250904) + ";        // Magic number");
    inputs.push('input string          InpComment     = "' + esc(S.comment || "GetEA") + '";        // Order comment');
    inputs.push("input int             InpSlippage    = " + n(S.slippage || 5) + ";                // Max deviation (points)");

    inputs.push("");
    inputs.push(grp("Money management"));
    inputs.push("input int             InpLotMode     = " + ({ fixed: 0, percent: 1, money: 2, per1k: 3 }[R.lotMode] || 0) + ";  // 0 fixed 1 % risk 2 fixed money 3 lots per 1000");
    inputs.push("input double          InpLots        = " + d(R.lots || 0.01) + ";              // Fixed lot size");
    inputs.push("input double          InpRiskPct     = " + d(R.riskPct || 1) + ";              // Risk per trade (% of balance)");
    inputs.push("input double          InpRiskMoney   = " + d(R.riskMoney || 50) + ";           // Risk per trade (account currency)");
    inputs.push("input double          InpLotsPer1k   = " + d(R.lotsPer1k || 0.01) + ";         // Lots per 1000 of balance");
    inputs.push("input double          InpMaxLots     = " + d(R.maxLots || 10) + ";             // Hard lot ceiling");

    inputs.push("");
    inputs.push(grp("Stops and targets"));
    inputs.push("input double          InpSLPips      = " + d(SL.pips || 30) + ";               // Stop loss (pips)");
    inputs.push("input double          InpTPPips      = " + d(TP.pips || 60) + ";               // Take profit (pips)");
    inputs.push("input double          InpTrailPips   = " + d(TR.dist || 20) + ";               // Trailing distance (pips)");
    inputs.push("input double          InpTrailStart  = " + d(TR.start || 20) + ";              // Start trailing after (pips)");
    inputs.push("input double          InpTrailStep   = " + d(TR.step || 5) + ";                // Minimum trail step (pips)");
    inputs.push("input double          InpBETrigger   = " + d(BE.trigger || 20) + ";            // Break-even trigger (pips)");
    inputs.push("input double          InpBEOffset    = " + d(BE.offset || 2) + ";              // Break-even offset (pips)");
    inputs.push("input double          InpPartialAt   = " + d(PC.at || 25) + ";                 // Partial close at (pips)");
    inputs.push("input double          InpPartialPct  = " + d(PC.pct || 50) + ";                // Partial close size (%)");

    inputs.push("");
    inputs.push(grp("Risk guards"));
    inputs.push("input int             InpMaxPos      = " + n(R.maxPositions || 1) + ";         // Max open positions");
    inputs.push("input int             InpMaxPerDay   = " + n(R.maxTradesPerDay || 0) + ";      // Max new trades per day (0 = off)");
    inputs.push("input int             InpMinBars     = " + n(R.minBarsBetween || 0) + ";       // Min bars between entries");
    inputs.push("input double          InpDailyLoss   = " + d(R.dailyLoss || 0) + ";            // Daily loss cap (0 = off)");
    inputs.push("input double          InpDailyProfit = " + d(R.dailyProfit || 0) + ";          // Daily profit target (0 = off)");
    inputs.push("input double          InpEquityStop  = " + d(R.equityStopPct || 0) + ";        // Equity stop (% drawdown, 0 = off)");
    inputs.push("input int             InpMaxLossRun  = " + n(R.maxConsecLoss || 0) + ";        // Stop after N losses in a row (0 = off)");
    inputs.push("input int             InpMaxSpread   = " + n(S.maxSpread || 0) + ";            // Max spread in points (0 = off)");

    if (R.martOn) {
      inputs.push("");
      inputs.push(grp("Martingale"));
      inputs.push("input double          InpMartMult    = " + d(R.martMult || 2) + ";              // Multiplier after a loss");
      inputs.push("input int             InpMartMax     = " + n(R.martMax || 3) + ";               // Max multiplications");
    }
    if (R.gridOn) {
      inputs.push("");
      inputs.push(grp("Grid / averaging"));
      inputs.push("input double          InpGridStep    = " + d(R.gridStep || 20) + ";             // Distance between grid entries (pips)");
      inputs.push("input double          InpGridMult    = " + d(R.gridMult || 1) + ";              // Lot multiplier per level");
      inputs.push("input int             InpGridMax     = " + n(R.gridMax || 3) + ";               // Max grid levels");
    }

    inputs.push("");
    inputs.push(grp("Session filter"));
    inputs.push("input bool            InpHoursOn     = " + (F.hoursOn ? "true" : "false") + ";            // Restrict trading hours");
    inputs.push("input int             InpHourFrom    = " + n(F.hourFrom || 0) + ";             // From hour (server time)");
    inputs.push("input int             InpHourTo      = " + n(F.hourTo || 24) + ";              // To hour (server time)");
    var days = F.days || [1, 1, 1, 1, 1, 0, 0];
    ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].forEach(function (dn, k) {
      inputs.push("input bool            InpTrade" + dn + "   = " + (days[k] ? "true" : "false") + ";            // Trade on " + dn);
    });
    if (F.volOn) {
      inputs.push("input double          InpMinATR      = " + d(F.atrMin || 0) + ";              // Minimum ATR (pips, 0 = off)");
      inputs.push("input double          InpMaxATR      = " + d(F.atrMax || 0) + ";              // Maximum ATR (pips, 0 = off)");
    }

    inputs.push("");
    inputs.push(grp("Alerts"));
    inputs.push("input bool            InpAlertPopup  = " + (A.popup ? "true" : "false") + ";            // Terminal alert");
    inputs.push("input bool            InpAlertPush   = " + (A.push ? "true" : "false") + ";            // Push notification");
    inputs.push("input bool            InpAlertMail   = " + (A.email ? "true" : "false") + ";            // Email");

    /* ---- signal functions (built after inputs so the planner has run) ---- */
    var sigLong  = longEntry  || "false";
    var sigShort = shortEntry || "false";
    var exLong   = longExit   || (X.oppositeSignal !== false ? sigShort : "false");
    var exShort  = shortExit  || (X.oppositeSignal !== false ? sigLong  : "false");

    var handles = plan.order.filter(function (r) { return r.create; });
    var helperSrc = CG.helperBlock(plan);

    var head = [
      "//+------------------------------------------------------------------+",
      "//|  " + esc(st.name || "GetEA robot") + (five ? ".mq5" : ".mq4"),
      "//|  Generated by GetEA — https://getea.getapps.tech",
      "//|  " + new Date().toISOString().slice(0, 10) + "   " + (five ? "MetaTrader 5 (MQL5)" : "MetaTrader 4 (MQL4)"),
      "//|",
      "//|  Test on a demo account first. Past behaviour in a backtest is",
      "//|  not a promise about the future.",
      "//+------------------------------------------------------------------+",
      '#property copyright "Generated by GetEA"',
      '#property link      "https://getea.getapps.tech"',
      '#property version   "1.00"',
      five ? "" : "#property strict",
      "",
      five ? "#include <Trade\\Trade.mqh>" : "",
      five ? "CTrade trade;" : "",
      ""
    ];

    var common = [
      "#define TF InpTF",
      "",
      "datetime g_lastBar   = 0;",
      "datetime g_lastEntry = 0;",
      "int      g_lossRun   = 0;",
      "double   g_peakEquity = 0;",
      "int      g_tradesToday = 0;",
      "int      g_today     = -1;",
      five ? "ulong    g_lastDeal = 0;" : "int      g_lastTicket = 0;",
      "ulong    g_partial[];",
      "",
      "//--- pip size, tolerant of 3 and 5 digit quotes",
      "double eaPip()",
      "  {",
      "   int dg = (int)_Digits;",
      "   return((dg == 3 || dg == 5) ? _Point * 10.0 : _Point);",
      "  }",
      "double eaAsk() { return(SymbolInfoDouble(_Symbol, SYMBOL_ASK)); }",
      "double eaBid() { return(SymbolInfoDouble(_Symbol, SYMBOL_BID)); }",
      "double eaPrice(bool isLong) { return(isLong ? eaAsk() : eaBid()); }",
      "int    eaStopLevel() { return((int)SymbolInfoInteger(_Symbol, SYMBOL_TRADE_STOPS_LEVEL)); }",
      "",
      "bool IsNewBar()",
      "  {",
      "   datetime t = iTime(_Symbol, TF, 0);",
      "   if(t == g_lastBar) return(false);",
      "   g_lastBar = t;",
      "   return(true);",
      "  }",
      "",
      "void Notify(string msg)",
      "  {",
      "   string full = _Symbol + \" \" + msg;",
      "   if(InpAlertPopup) Alert(full);",
      "   if(InpAlertPush)  SendNotification(full);",
      "   if(InpAlertMail)  SendMail(\"" + esc(st.name || "GetEA") + "\", full);",
      "   Print(full);",
      "  }",
      "",
      "bool MarkPartial(ulong id)",
      "  {",
      "   for(int k = 0; k < ArraySize(g_partial); k++) if(g_partial[k] == id) return(false);",
      "   int sz = ArraySize(g_partial);",
      "   ArrayResize(g_partial, sz + 1);",
      "   g_partial[sz] = id;",
      "   return(true);",
      "  }"
    ];

    /* ---- position layer ---- */
    var posLayer = five ? [
      "int CountPos(int dir)",
      "  {",
      "   int c = 0;",
      "   for(int k = PositionsTotal() - 1; k >= 0; k--)",
      "     {",
      "      ulong tk = PositionGetTicket(k);",
      "      if(tk == 0 || !PositionSelectByTicket(tk)) continue;",
      "      if(PositionGetString(POSITION_SYMBOL) != _Symbol) continue;",
      "      if((int)PositionGetInteger(POSITION_MAGIC) != InpMagic) continue;",
      "      long ty = PositionGetInteger(POSITION_TYPE);",
      "      if(dir == 1  && ty != POSITION_TYPE_BUY)  continue;",
      "      if(dir == -1 && ty != POSITION_TYPE_SELL) continue;",
      "      c++;",
      "     }",
      "   return(c);",
      "  }",
      "",
      "double LastEntry(int dir)",
      "  {",
      "   double best = 0; datetime newest = 0;",
      "   for(int k = PositionsTotal() - 1; k >= 0; k--)",
      "     {",
      "      ulong tk = PositionGetTicket(k);",
      "      if(tk == 0 || !PositionSelectByTicket(tk)) continue;",
      "      if(PositionGetString(POSITION_SYMBOL) != _Symbol) continue;",
      "      if((int)PositionGetInteger(POSITION_MAGIC) != InpMagic) continue;",
      "      long ty = PositionGetInteger(POSITION_TYPE);",
      "      if(dir == 1  && ty != POSITION_TYPE_BUY)  continue;",
      "      if(dir == -1 && ty != POSITION_TYPE_SELL) continue;",
      "      datetime tm = (datetime)PositionGetInteger(POSITION_TIME);",
      "      if(tm >= newest) { newest = tm; best = PositionGetDouble(POSITION_PRICE_OPEN); }",
      "     }",
      "   return(best);",
      "  }",
      "",
      "double LastLots(int dir)",
      "  {",
      "   double best = 0; datetime newest = 0;",
      "   for(int k = PositionsTotal() - 1; k >= 0; k--)",
      "     {",
      "      ulong tk = PositionGetTicket(k);",
      "      if(tk == 0 || !PositionSelectByTicket(tk)) continue;",
      "      if(PositionGetString(POSITION_SYMBOL) != _Symbol) continue;",
      "      if((int)PositionGetInteger(POSITION_MAGIC) != InpMagic) continue;",
      "      long ty = PositionGetInteger(POSITION_TYPE);",
      "      if(dir == 1  && ty != POSITION_TYPE_BUY)  continue;",
      "      if(dir == -1 && ty != POSITION_TYPE_SELL) continue;",
      "      datetime tm = (datetime)PositionGetInteger(POSITION_TIME);",
      "      if(tm >= newest) { newest = tm; best = PositionGetDouble(POSITION_VOLUME); }",
      "     }",
      "   return(best);",
      "  }",
      "",
      "void CloseDir(int dir)",
      "  {",
      "   for(int k = PositionsTotal() - 1; k >= 0; k--)",
      "     {",
      "      ulong tk = PositionGetTicket(k);",
      "      if(tk == 0 || !PositionSelectByTicket(tk)) continue;",
      "      if(PositionGetString(POSITION_SYMBOL) != _Symbol) continue;",
      "      if((int)PositionGetInteger(POSITION_MAGIC) != InpMagic) continue;",
      "      long ty = PositionGetInteger(POSITION_TYPE);",
      "      if(dir == 1  && ty != POSITION_TYPE_BUY)  continue;",
      "      if(dir == -1 && ty != POSITION_TYPE_SELL) continue;",
      "      trade.PositionClose(tk);",
      "     }",
      "  }",
      "",
      "double DayProfit()",
      "  {",
      "   double sum = 0;",
      "   datetime from = iTime(_Symbol, PERIOD_D1, 0);",
      "   if(!HistorySelect(from, TimeCurrent())) return(0);",
      "   for(int k = HistoryDealsTotal() - 1; k >= 0; k--)",
      "     {",
      "      ulong dl = HistoryDealGetTicket(k);",
      "      if(dl == 0) continue;",
      "      if((int)HistoryDealGetInteger(dl, DEAL_MAGIC) != InpMagic) continue;",
      "      if(HistoryDealGetString(dl, DEAL_SYMBOL) != _Symbol) continue;",
      "      sum += HistoryDealGetDouble(dl, DEAL_PROFIT) + HistoryDealGetDouble(dl, DEAL_SWAP) + HistoryDealGetDouble(dl, DEAL_COMMISSION);",
      "     }",
      "   for(int k = PositionsTotal() - 1; k >= 0; k--)",
      "     {",
      "      ulong tk = PositionGetTicket(k);",
      "      if(tk == 0 || !PositionSelectByTicket(tk)) continue;",
      "      if((int)PositionGetInteger(POSITION_MAGIC) != InpMagic) continue;",
      "      if(PositionGetString(POSITION_SYMBOL) != _Symbol) continue;",
      "      sum += PositionGetDouble(POSITION_PROFIT) + PositionGetDouble(POSITION_SWAP);",
      "     }",
      "   return(sum);",
      "  }",
      "",
      "void UpdateLossRun()",
      "  {",
      "   if(!HistorySelect(TimeCurrent() - 30 * 86400, TimeCurrent())) return;",
      "   for(int k = HistoryDealsTotal() - 1; k >= 0; k--)",
      "     {",
      "      ulong dl = HistoryDealGetTicket(k);",
      "      if(dl == 0 || dl <= g_lastDeal) continue;",
      "      if((int)HistoryDealGetInteger(dl, DEAL_MAGIC) != InpMagic) continue;",
      "      if(HistoryDealGetString(dl, DEAL_SYMBOL) != _Symbol) continue;",
      "      if(HistoryDealGetInteger(dl, DEAL_ENTRY) != DEAL_ENTRY_OUT) continue;",
      "      double pr = HistoryDealGetDouble(dl, DEAL_PROFIT) + HistoryDealGetDouble(dl, DEAL_SWAP) + HistoryDealGetDouble(dl, DEAL_COMMISSION);",
      "      g_lastDeal = dl;",
      "      if(pr < 0) g_lossRun++; else g_lossRun = 0;",
      "      break;",
      "     }",
      "  }"
    ] : [
      "int CountPos(int dir)",
      "  {",
      "   int c = 0;",
      "   for(int k = OrdersTotal() - 1; k >= 0; k--)",
      "     {",
      "      if(!OrderSelect(k, SELECT_BY_POS, MODE_TRADES)) continue;",
      "      if(OrderSymbol() != Symbol() || OrderMagicNumber() != InpMagic) continue;",
      "      if(dir == 1  && OrderType() != OP_BUY)  continue;",
      "      if(dir == -1 && OrderType() != OP_SELL) continue;",
      "      if(OrderType() > OP_SELL) continue;",
      "      c++;",
      "     }",
      "   return(c);",
      "  }",
      "",
      "double LastEntry(int dir)",
      "  {",
      "   double best = 0; datetime newest = 0;",
      "   for(int k = OrdersTotal() - 1; k >= 0; k--)",
      "     {",
      "      if(!OrderSelect(k, SELECT_BY_POS, MODE_TRADES)) continue;",
      "      if(OrderSymbol() != Symbol() || OrderMagicNumber() != InpMagic) continue;",
      "      if(OrderType() > OP_SELL) continue;",
      "      if(dir == 1  && OrderType() != OP_BUY)  continue;",
      "      if(dir == -1 && OrderType() != OP_SELL) continue;",
      "      if(OrderOpenTime() >= newest) { newest = OrderOpenTime(); best = OrderOpenPrice(); }",
      "     }",
      "   return(best);",
      "  }",
      "",
      "double LastLots(int dir)",
      "  {",
      "   double best = 0; datetime newest = 0;",
      "   for(int k = OrdersTotal() - 1; k >= 0; k--)",
      "     {",
      "      if(!OrderSelect(k, SELECT_BY_POS, MODE_TRADES)) continue;",
      "      if(OrderSymbol() != Symbol() || OrderMagicNumber() != InpMagic) continue;",
      "      if(OrderType() > OP_SELL) continue;",
      "      if(dir == 1  && OrderType() != OP_BUY)  continue;",
      "      if(dir == -1 && OrderType() != OP_SELL) continue;",
      "      if(OrderOpenTime() >= newest) { newest = OrderOpenTime(); best = OrderLots(); }",
      "     }",
      "   return(best);",
      "  }",
      "",
      "void CloseDir(int dir)",
      "  {",
      "   for(int k = OrdersTotal() - 1; k >= 0; k--)",
      "     {",
      "      if(!OrderSelect(k, SELECT_BY_POS, MODE_TRADES)) continue;",
      "      if(OrderSymbol() != Symbol() || OrderMagicNumber() != InpMagic) continue;",
      "      if(OrderType() > OP_SELL) continue;",
      "      if(dir == 1  && OrderType() != OP_BUY)  continue;",
      "      if(dir == -1 && OrderType() != OP_SELL) continue;",
      "      double px = (OrderType() == OP_BUY) ? eaBid() : eaAsk();",
      "      if(!OrderClose(OrderTicket(), OrderLots(), NormalizeDouble(px, _Digits), InpSlippage, clrTomato))",
      "         Print(\"Close failed: \", GetLastError());",
      "     }",
      "  }",
      "",
      "double DayProfit()",
      "  {",
      "   double sum = 0;",
      "   datetime from = iTime(_Symbol, PERIOD_D1, 0);",
      "   for(int k = OrdersHistoryTotal() - 1; k >= 0; k--)",
      "     {",
      "      if(!OrderSelect(k, SELECT_BY_POS, MODE_HISTORY)) continue;",
      "      if(OrderSymbol() != Symbol() || OrderMagicNumber() != InpMagic) continue;",
      "      if(OrderCloseTime() < from) continue;",
      "      sum += OrderProfit() + OrderSwap() + OrderCommission();",
      "     }",
      "   for(int k = OrdersTotal() - 1; k >= 0; k--)",
      "     {",
      "      if(!OrderSelect(k, SELECT_BY_POS, MODE_TRADES)) continue;",
      "      if(OrderSymbol() != Symbol() || OrderMagicNumber() != InpMagic) continue;",
      "      sum += OrderProfit() + OrderSwap() + OrderCommission();",
      "     }",
      "   return(sum);",
      "  }",
      "",
      "void UpdateLossRun()",
      "  {",
      "   datetime newest = 0; double pr = 0; int tk = 0;",
      "   for(int k = OrdersHistoryTotal() - 1; k >= 0; k--)",
      "     {",
      "      if(!OrderSelect(k, SELECT_BY_POS, MODE_HISTORY)) continue;",
      "      if(OrderSymbol() != Symbol() || OrderMagicNumber() != InpMagic) continue;",
      "      if(OrderType() > OP_SELL) continue;",
      "      if(OrderCloseTime() > newest) { newest = OrderCloseTime(); pr = OrderProfit() + OrderSwap() + OrderCommission(); tk = OrderTicket(); }",
      "     }",
      "   if(tk != 0 && tk != g_lastTicket)",
      "     {",
      "      g_lastTicket = tk;",
      "      if(pr < 0) g_lossRun++; else g_lossRun = 0;",
      "     }",
      "  }"
    ];

    /* ---- sizing + filters ---- */
    var sizing = [
      "double NormalizeLots(double lots)",
      "  {",
      "   double mn = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MIN);",
      "   double mx = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MAX);",
      "   double st = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_STEP);",
      "   if(st <= 0) st = 0.01;",
      "   lots = MathFloor(lots / st + 0.0000001) * st;",
      "   if(lots < mn) lots = mn;",
      "   if(lots > mx) lots = mx;",
      "   if(lots > InpMaxLots) lots = InpMaxLots;",
      "   return(NormalizeDouble(lots, 2));",
      "  }",
      "",
      "double MoneyPerLotPerPrice()",
      "  {",
      "   double tv = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_VALUE);",
      "   double ts = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_SIZE);",
      "   if(ts <= 0 || tv <= 0) return(0);",
      "   return(tv / ts);",
      "  }",
      "",
      "double CalcLots(double slDist)",
      "  {",
      "   double lots = InpLots;",
      "   double bal  = AccountInfoDouble(ACCOUNT_BALANCE);",
      "   double mppp = MoneyPerLotPerPrice();",
      "   if(InpLotMode == 1 && slDist > 0 && mppp > 0) lots = (bal * InpRiskPct / 100.0) / (slDist * mppp);",
      "   if(InpLotMode == 2 && slDist > 0 && mppp > 0) lots = InpRiskMoney / (slDist * mppp);",
      "   if(InpLotMode == 3) lots = bal / 1000.0 * InpLotsPer1k;",
      (R.martOn ? "   if(g_lossRun > 0) lots *= MathPow(InpMartMult, MathMin(g_lossRun, InpMartMax));" : null),
      "   return(NormalizeLots(lots));",
      "  }",
      "",
      "bool SpreadOk()",
      "  {",
      "   if(InpMaxSpread <= 0) return(true);",
      "   return((int)SymbolInfoInteger(_Symbol, SYMBOL_SPREAD) <= InpMaxSpread);",
      "  }",
      "",
      "bool DayOk()",
      "  {",
      "   MqlDateTime t; TimeToStruct(TimeCurrent(), t);",
      "   if(t.day != g_today) { g_today = t.day; g_tradesToday = 0; }",
      "   if(t.day_of_week == 1 && !InpTradeMon) return(false);",
      "   if(t.day_of_week == 2 && !InpTradeTue) return(false);",
      "   if(t.day_of_week == 3 && !InpTradeWed) return(false);",
      "   if(t.day_of_week == 4 && !InpTradeThu) return(false);",
      "   if(t.day_of_week == 5 && !InpTradeFri) return(false);",
      "   if(t.day_of_week == 6 && !InpTradeSat) return(false);",
      "   if(t.day_of_week == 0 && !InpTradeSun) return(false);",
      "   if(InpHoursOn)",
      "     {",
      "      bool inWindow = (InpHourFrom <= InpHourTo)",
      "                      ? (t.hour >= InpHourFrom && t.hour < InpHourTo)",
      "                      : (t.hour >= InpHourFrom || t.hour < InpHourTo);",
      "      if(!inWindow) return(false);",
      "     }",
      (F.newsOn && (F.newsWindows || []).length ? newsBlockMT(F.newsWindows) : null),
      "   return(true);",
      "  }",
      "",
      "bool VolatilityOk()",
      "  {",
      (volExpr ? "   double a = " + volExpr + " / eaPip();" : "   return(true);"),
      (volExpr ? "   if(InpMinATR > 0 && a < InpMinATR) return(false);" : null),
      (volExpr ? "   if(InpMaxATR > 0 && a > InpMaxATR) return(false);" : null),
      (volExpr ? "   return(true);" : null),
      "  }",
      "",
      "bool GuardsOk()",
      "  {",
      "   double eq = AccountInfoDouble(ACCOUNT_EQUITY);",
      "   if(eq > g_peakEquity) g_peakEquity = eq;",
      "   if(InpEquityStop > 0 && g_peakEquity > 0 && (g_peakEquity - eq) / g_peakEquity * 100.0 >= InpEquityStop) return(false);",
      "   if(InpMaxLossRun > 0 && g_lossRun >= InpMaxLossRun) return(false);",
      "   double dp = DayProfit();",
      "   if(InpDailyLoss > 0 && dp <= -InpDailyLoss) return(false);",
      "   if(InpDailyProfit > 0 && dp >= InpDailyProfit) return(false);",
      "   if(InpMaxPerDay > 0 && g_tradesToday >= InpMaxPerDay) return(false);",
      "   if(InpMinBars > 0 && g_lastEntry > 0 && iTime(_Symbol, TF, 0) < g_lastEntry + InpMinBars * PeriodSeconds(TF)) return(false);",
      "   return(true);",
      "  }"
    ];

    function newsBlockMT(list) {
      var lines = ["   {", "    int mins = t.hour * 60 + t.min;"];
      list.forEach(function (w) {
        var a = hm(w.from), b = hm(w.to);
        lines.push("    if(mins >= " + a + " && mins < " + b + ") return(false);");
      });
      lines.push("   }");
      return lines.join("\n");
    }

    /* ---- signals ---- */
    var signals = [
      "//+------------------------------------------------------------------+",
      "//| Entry and exit rules                                             |",
      "//+------------------------------------------------------------------+",
      "bool LongSignal()",
      "  {",
      "   int s = InpSignalBar;",
      "   return(" + sigLong + ");",
      "  }",
      "",
      "bool ShortSignal()",
      "  {",
      "   int s = InpSignalBar;",
      "   return(" + sigShort + ");",
      "  }",
      "",
      "bool LongExitSignal()",
      "  {",
      "   int s = InpSignalBar;",
      "   return(" + exLong + ");",
      "  }",
      "",
      "bool ShortExitSignal()",
      "  {",
      "   int s = InpSignalBar;",
      "   return(" + exShort + ");",
      "  }"
    ];

    /* ---- open / manage ---- */
    var openFn = [
      "double SlDistance(bool isLong)",
      "  {",
      "   double v = " + slExpr + ";",
      "   double minD = eaStopLevel() * _Point;",
      "   if(v > 0 && v < minD) v = minD;",
      "   return(v);",
      "  }",
      "",
      "double TpDistance(bool isLong, double slDist)",
      "  {",
      "   double v = " + tpExpr + ";",
      "   double minD = eaStopLevel() * _Point;",
      "   if(v > 0 && v < minD) v = minD;",
      "   return(v);",
      "  }",
      "",
      "void OpenTrade(bool isLong, double lotOverride)",
      "  {",
      "   double px    = eaPrice(isLong);",
      "   double slD   = SlDistance(isLong);",
      "   double tpD   = TpDistance(isLong, slD);",
      "   double lots  = (lotOverride > 0) ? NormalizeLots(lotOverride) : CalcLots(slD);",
      "   double sl    = 0, tp = 0;",
      "   if(slD > 0) sl = NormalizeDouble(isLong ? px - slD : px + slD, _Digits);",
      "   if(tpD > 0) tp = NormalizeDouble(isLong ? px + tpD : px - tpD, _Digits);",
      five ? "   bool ok = isLong ? trade.Buy(lots, _Symbol, 0.0, sl, tp, InpComment)"
           : "   int  tk = OrderSend(Symbol(), isLong ? OP_BUY : OP_SELL, lots, NormalizeDouble(px, _Digits), InpSlippage, sl, tp, InpComment, InpMagic, 0, isLong ? clrDodgerBlue : clrTomato);",
      five ? "                    : trade.Sell(lots, _Symbol, 0.0, sl, tp, InpComment);" : "   bool ok = (tk > 0);",
      "   if(ok)",
      "     {",
      "      g_lastEntry = iTime(_Symbol, TF, 0);",
      "      g_tradesToday++;",
      "      Notify((isLong ? \"BUY \" : \"SELL \") + DoubleToString(lots, 2) + \" @ \" + DoubleToString(px, _Digits));",
      "     }",
      five ? "   else Print(\"Order failed: \", trade.ResultRetcode(), \" \", trade.ResultRetcodeDescription());"
           : "   else Print(\"Order failed: \", GetLastError());",
      "  }"
    ];

    var manage = five ? manageMT5(st, TR, BE, PC, TE, trailExpr) : manageMT4(st, TR, BE, PC, TE, trailExpr);

    var dirGate = S.direction === "long" ? "true" : S.direction === "short" ? "false" : null;
    var main = [
      "//+------------------------------------------------------------------+",
      "//| Lifecycle                                                        |",
      "//+------------------------------------------------------------------+",
      "int OnInit()",
      "  {",
      five ? "   trade.SetExpertMagicNumber(InpMagic);" : null,
      five ? "   trade.SetDeviationInPoints(InpSlippage);" : null,
      five ? "   trade.SetTypeFillingBySymbol(_Symbol);" : null,
      handles.map(function (r) {
        return "   h_" + r.name + " = " + r.create + ";\n" +
               "   if(h_" + r.name + " == INVALID_HANDLE) { Print(\"Failed to create " + r.id + " handle\"); return(INIT_FAILED); }";
      }).join("\n") || null,
      "   g_peakEquity = AccountInfoDouble(ACCOUNT_EQUITY);",
      "   ArrayResize(g_partial, 0);",
      "   Print(\"" + esc(st.name || "GetEA robot") + " ready on \", _Symbol);",
      "   return(INIT_SUCCEEDED);",
      "  }",
      "",
      "void OnDeinit(const int reason)",
      "  {",
      handles.map(function (r) { return "   if(h_" + r.name + " != INVALID_HANDLE) IndicatorRelease(h_" + r.name + ");"; }).join("\n") || null,
      "  }",
      "",
      "void OnTick()",
      "  {",
      "   UpdateLossRun();",
      "   ManagePositions();",
      "",
      "   bool fresh = IsNewBar();",
      "   if(InpOnBarClose && !fresh) return;",
      "",
      "   if(!SpreadOk() || !DayOk() || !VolatilityOk() || !GuardsOk()) return;",
      "",
      "   bool wantLong  = " + (S.direction === "short" ? "false" : "LongSignal()") + ";",
      "   bool wantShort = " + (S.direction === "long" ? "false" : "ShortSignal()") + ";",
      "",
      "   int nLong = CountPos(1), nShort = CountPos(-1);",
      "",
      "   if(wantLong && LongExitSignal() == false && nLong + nShort < InpMaxPos)",
      "     {",
      (R.hedge === false ? "      if(nShort > 0) CloseDir(-1);" : null),
      "      OpenTrade(true, 0);",
      "     }",
      "   else if(wantShort && ShortExitSignal() == false && nLong + nShort < InpMaxPos)",
      "     {",
      (R.hedge === false ? "      if(nLong > 0) CloseDir(1);" : null),
      "      OpenTrade(false, 0);",
      "     }",
      (R.gridOn ? gridBlockMT() : null),
      "  }"
    ];

    function gridBlockMT() {
      return J([
        "",
        "   //--- grid / averaging: add to a losing position at fixed distances",
        "   if(InpGridMax > 0)",
        "     {",
        "      if(nLong > 0 && nLong < InpGridMax)",
        "        {",
        "         double refPx = LastEntry(1);",
        "         if(refPx > 0 && eaAsk() <= refPx - InpGridStep * eaPip()) OpenTrade(true, LastLots(1) * InpGridMult);",
        "        }",
        "      if(nShort > 0 && nShort < InpGridMax)",
        "        {",
        "         double refPx = LastEntry(-1);",
        "         if(refPx > 0 && eaBid() >= refPx + InpGridStep * eaPip()) OpenTrade(false, LastLots(-1) * InpGridMult);",
        "        }",
        "     }"
      ]);
    }

    var handleDecl = handles.length
      ? ["//--- indicator handles"].concat(handles.map(function (r) { return "int h_" + r.name + " = INVALID_HANDLE;"; })).join("\n")
      : null;

    var bfFn = five ? [
      "double Bf(int handle, int buffer, int shift)",
      "  {",
      "   double a[];",
      "   if(handle == INVALID_HANDLE) return(0.0);",
      "   if(CopyBuffer(handle, buffer, shift, 1, a) < 1) return(0.0);",
      "   return(a[0]);",
      "  }"
    ].join("\n") : null;

    var code = J([
      J(head),
      J(inputs),
      "",
      J(common),
      handleDecl,
      "",
      bfFn,
      "",
      "//+------------------------------------------------------------------+",
      "//| Indicator helpers                                                |",
      "//+------------------------------------------------------------------+",
      helperSrc,
      "",
      J(posLayer),
      "",
      J(sizing),
      "",
      J(signals),
      "",
      J(openFn),
      "",
      manage,
      "",
      J(main),
      "//+------------------------------------------------------------------+"
    ]);

    return { code: code, file: ident(st.name) + (five ? ".mq5" : ".mq4"), warnings: plan.warn, plan: plan };
  }

  function hm(v) {
    var m = String(v || "0:00").split(":");
    return String((parseInt(m[0], 10) || 0) * 60 + (parseInt(m[1], 10) || 0));
  }

  /* ---- position management: MT5 ---- */
  function manageMT5(st, TR, BE, PC, TE, trailExpr) {
    return J([
      "//+------------------------------------------------------------------+",
      "//| Open position management                                         |",
      "//+------------------------------------------------------------------+",
      "void ManagePositions()",
      "  {",
      "   for(int k = PositionsTotal() - 1; k >= 0; k--)",
      "     {",
      "      ulong tk = PositionGetTicket(k);",
      "      if(tk == 0 || !PositionSelectByTicket(tk)) continue;",
      "      if(PositionGetString(POSITION_SYMBOL) != _Symbol) continue;",
      "      if((int)PositionGetInteger(POSITION_MAGIC) != InpMagic) continue;",
      "",
      "      bool   isLong = (PositionGetInteger(POSITION_TYPE) == POSITION_TYPE_BUY);",
      "      double open   = PositionGetDouble(POSITION_PRICE_OPEN);",
      "      double sl     = PositionGetDouble(POSITION_SL);",
      "      double tp     = PositionGetDouble(POSITION_TP);",
      "      double vol    = PositionGetDouble(POSITION_VOLUME);",
      "      double px     = isLong ? eaBid() : eaAsk();",
      "      double gain   = (isLong ? px - open : open - px) / eaPip();",
      "      datetime opened = (datetime)PositionGetInteger(POSITION_TIME);",
      "",
      (BE.on ? J([
        "      //--- break-even",
        "      if(InpBETrigger > 0 && gain >= InpBETrigger)",
        "        {",
        "         double be = NormalizeDouble(isLong ? open + InpBEOffset * eaPip() : open - InpBEOffset * eaPip(), _Digits);",
        "         if((isLong && (sl < be)) || (!isLong && (sl > be || sl == 0)))",
        "            trade.PositionModify(tk, be, tp);",
        "        }"
      ]) : null),
      (TR.mode && TR.mode !== "off" ? J([
        "      //--- trailing stop",
        "      if(gain >= InpTrailStart)",
        "        {",
        "         double dist = " + trailExpr + ";",
        "         double want = NormalizeDouble(isLong ? px - dist : px + dist, _Digits);",
        "         double step = InpTrailStep * eaPip();",
        "         if((isLong && (sl == 0 || want - sl >= step)) || (!isLong && (sl == 0 || sl - want >= step)))",
        "            trade.PositionModify(tk, want, tp);",
        "        }"
      ]) : null),
      (PC.on ? J([
        "      //--- partial close",
        "      if(InpPartialAt > 0 && gain >= InpPartialAt && MarkPartial(tk))",
        "        {",
        "         double part = NormalizeLots(vol * InpPartialPct / 100.0);",
        "         if(part > 0 && part < vol) trade.PositionClosePartial(tk, part);",
        "        }"
      ]) : null),
      (TE.onBars ? J([
        "      //--- time based exit",
        "      if(TimeCurrent() - opened >= " + n(TE.bars || 20) + " * PeriodSeconds(TF)) { trade.PositionClose(tk); continue; }"
      ]) : null),
      (TE.fridayClose ? J([
        "      //--- flat before the weekend",
        "      MqlDateTime ft; TimeToStruct(TimeCurrent(), ft);",
        "      if(ft.day_of_week == 5 && ft.hour >= " + n(TE.fridayHour || 20) + ") { trade.PositionClose(tk); continue; }"
      ]) : null),
      "      //--- rule based exit",
      "      if(isLong  && LongExitSignal())  { trade.PositionClose(tk); continue; }",
      "      if(!isLong && ShortExitSignal()) { trade.PositionClose(tk); continue; }",
      "     }",
      "  }"
    ]);
  }

  /* ---- position management: MT4 ---- */
  function manageMT4(st, TR, BE, PC, TE, trailExpr) {
    return J([
      "//+------------------------------------------------------------------+",
      "//| Open position management                                         |",
      "//+------------------------------------------------------------------+",
      "void ManagePositions()",
      "  {",
      "   for(int k = OrdersTotal() - 1; k >= 0; k--)",
      "     {",
      "      if(!OrderSelect(k, SELECT_BY_POS, MODE_TRADES)) continue;",
      "      if(OrderSymbol() != Symbol() || OrderMagicNumber() != InpMagic) continue;",
      "      if(OrderType() > OP_SELL) continue;",
      "",
      "      bool   isLong = (OrderType() == OP_BUY);",
      "      double open   = OrderOpenPrice();",
      "      double sl     = OrderStopLoss();",
      "      double tp     = OrderTakeProfit();",
      "      double vol    = OrderLots();",
      "      int    tk     = OrderTicket();",
      "      double px     = isLong ? eaBid() : eaAsk();",
      "      double gain   = (isLong ? px - open : open - px) / eaPip();",
      "",
      (BE.on ? J([
        "      //--- break-even",
        "      if(InpBETrigger > 0 && gain >= InpBETrigger)",
        "        {",
        "         double be = NormalizeDouble(isLong ? open + InpBEOffset * eaPip() : open - InpBEOffset * eaPip(), _Digits);",
        "         if((isLong && sl < be) || (!isLong && (sl > be || sl == 0)))",
        "            if(!OrderModify(tk, open, be, tp, 0, clrGold)) Print(\"BE modify failed: \", GetLastError());",
        "        }"
      ]) : null),
      (TR.mode && TR.mode !== "off" ? J([
        "      //--- trailing stop",
        "      if(gain >= InpTrailStart)",
        "        {",
        "         double dist = " + trailExpr + ";",
        "         double want = NormalizeDouble(isLong ? px - dist : px + dist, _Digits);",
        "         double step = InpTrailStep * eaPip();",
        "         if((isLong && (sl == 0 || want - sl >= step)) || (!isLong && (sl == 0 || sl - want >= step)))",
        "            if(!OrderModify(tk, open, want, tp, 0, clrGold)) Print(\"Trail modify failed: \", GetLastError());",
        "        }"
      ]) : null),
      (PC.on ? J([
        "      //--- partial close",
        "      if(InpPartialAt > 0 && gain >= InpPartialAt && MarkPartial((ulong)tk))",
        "        {",
        "         double part = NormalizeLots(vol * InpPartialPct / 100.0);",
        "         if(part > 0 && part < vol)",
        "            if(!OrderClose(tk, part, NormalizeDouble(px, _Digits), InpSlippage, clrSilver)) Print(\"Partial close failed: \", GetLastError());",
        "         continue;",
        "        }"
      ]) : null),
      (TE.onBars ? J([
        "      //--- time based exit",
        "      if(TimeCurrent() - OrderOpenTime() >= " + n(TE.bars || 20) + " * PeriodSeconds(TF))",
        "        { OrderClose(tk, vol, NormalizeDouble(px, _Digits), InpSlippage, clrSilver); continue; }"
      ]) : null),
      (TE.fridayClose ? J([
        "      //--- flat before the weekend",
        "      MqlDateTime ft; TimeToStruct(TimeCurrent(), ft);",
        "      if(ft.day_of_week == 5 && ft.hour >= " + n(TE.fridayHour || 20) + ")",
        "        { OrderClose(tk, vol, NormalizeDouble(px, _Digits), InpSlippage, clrSilver); continue; }"
      ]) : null),
      "      //--- rule based exit",
      "      if(isLong && LongExitSignal())",
      "        { OrderClose(tk, vol, NormalizeDouble(eaBid(), _Digits), InpSlippage, clrSilver); continue; }",
      "      if(!isLong && ShortExitSignal())",
      "        { OrderClose(tk, vol, NormalizeDouble(eaAsk(), _Digits), InpSlippage, clrSilver); continue; }",
      "     }",
      "  }"
    ]);
  }

  window.EA.CG.buildMT = buildMT;
  window.EA.CG.ident = ident;
  window.EA.CG._helpers = { n: n, d: d, esc: esc, J: J, hm: hm };
})();
