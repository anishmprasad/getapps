/* ============================================================
   GetEA — MetaTrader emitter (MQL4 + MQL5).
   Everything here is written so one helper library compiles under
   both languages: it only touches iOpen/iHigh/iLow/iClose/iVolume/
   iTime/iBars, MathXxx and TimeToStruct, which exist in MQL4 build
   600+ and MQL5 alike. Where MetaTrader ships a native indicator we
   use it (a handle + CopyBuffer on MQL5, a direct call on MQL4);
   where it does not, we emit a self-contained helper so the .mq4 /
   .mq5 file never needs a second indicator installed.
   ============================================================ */
(function () {
  "use strict";

  function i(v) { return String(Math.round(Number(v) || 0)); }
  function f(v) { v = Number(v) || 0; return Number.isInteger(v) ? v.toFixed(1) : String(v); }

  var PX = {
    close: "PRICE_CLOSE", open: "PRICE_OPEN", high: "PRICE_HIGH", low: "PRICE_LOW",
    median: "PRICE_MEDIAN", typical: "PRICE_TYPICAL", weighted: "PRICE_WEIGHTED"
  };
  var MM = { sma: "MODE_SMA", ema: "MODE_EMA", smma: "MODE_SMMA", lwma: "MODE_LWMA" };

  /* ---------------- helper library ---------------- */
  var H = {};

  H.px = [
    "int    eaBars()            { return(iBars(_Symbol, TF)); }",
    "double pO(int k)           { return(iOpen(_Symbol, TF, k)); }",
    "double pH(int k)           { return(iHigh(_Symbol, TF, k)); }",
    "double pL(int k)           { return(iLow(_Symbol, TF, k)); }",
    "double pC(int k)           { return(iClose(_Symbol, TF, k)); }",
    "double pV(int k)           { return((double)iVolume(_Symbol, TF, k)); }",
    "double pAp(int ap, int k)",
    "  {",
    "   if(ap == PRICE_OPEN)     return(pO(k));",
    "   if(ap == PRICE_HIGH)     return(pH(k));",
    "   if(ap == PRICE_LOW)      return(pL(k));",
    "   if(ap == PRICE_MEDIAN)   return((pH(k) + pL(k)) / 2.0);",
    "   if(ap == PRICE_TYPICAL)  return((pH(k) + pL(k) + pC(k)) / 3.0);",
    "   if(ap == PRICE_WEIGHTED) return((pH(k) + pL(k) + 2.0 * pC(k)) / 4.0);",
    "   return(pC(k));",
    "  }",
    "int eaWindow(int want, int sh) { int b = eaBars() - sh - 1; if(want > b) want = b; if(want < 2) want = 2; return(want); }"
  ].join("\n");

  H.cand = [
    "double cBody(int k)  { return(MathAbs(pC(k) - pO(k))); }",
    "double cRange(int k) { return(pH(k) - pL(k)); }",
    "double cUsh(int k)   { return(pH(k) - MathMax(pO(k), pC(k))); }",
    "double cLsh(int k)   { return(MathMin(pO(k), pC(k)) - pL(k)); }",
    "bool   cUp(int k)    { return(pC(k) > pO(k)); }",
    "bool   cDn(int k)    { return(pC(k) < pO(k)); }",
    "double cMid(int k)   { return((pO(k) + pC(k)) / 2.0); }",
    "double cAvg(int k, int n)",
    "  {",
    "   double s = 0; for(int j = 0; j < n; j++) s += cRange(k + j);",
    "   return(n > 0 ? s / n : 0);",
    "  }"
  ].join("\n");

  H.wma = [
    "double hWma(int per, int ap, int sh)",
    "  {",
    "   double s = 0, w = 0;",
    "   for(int j = 0; j < per; j++) { double k = per - j; s += pAp(ap, sh + j) * k; w += k; }",
    "   return(w > 0 ? s / w : 0);",
    "  }"
  ].join("\n");

  H.hma = [
    "double hHma(int per, int ap, int sh)",
    "  {",
    "   int half = (int)MathMax(1, MathRound(per / 2.0));",
    "   int root = (int)MathMax(1, MathRound(MathSqrt((double)per)));",
    "   double s = 0, w = 0;",
    "   for(int j = 0; j < root; j++)",
    "     {",
    "      double raw = 2.0 * hWma(half, ap, sh + j) - hWma(per, ap, sh + j);",
    "      double k = root - j; s += raw * k; w += k;",
    "     }",
    "   return(w > 0 ? s / w : 0);",
    "  }"
  ].join("\n");

  H.emaser = [
    "/* EMA chain over a local window: idx 0 = oldest bar of the window. */",
    "int hEmaSeries(double &dst[], int per, int ap, int sh, int depth)",
    "  {",
    "   int n = eaWindow(per * depth + 20, sh);",
    "   ArrayResize(dst, n);",
    "   double k = 2.0 / (per + 1.0);",
    "   dst[0] = pAp(ap, n - 1 + sh);",
    "   for(int j = 1; j < n; j++) dst[j] = pAp(ap, n - 1 + sh - j) * k + dst[j - 1] * (1.0 - k);",
    "   return(n);",
    "  }",
    "void hEmaOn(double &src[], double &dst[], int n, int per)",
    "  {",
    "   ArrayResize(dst, n);",
    "   double k = 2.0 / (per + 1.0);",
    "   dst[0] = src[0];",
    "   for(int j = 1; j < n; j++) dst[j] = src[j] * k + dst[j - 1] * (1.0 - k);",
    "  }"
  ].join("\n");

  H.dema = [
    "double hDema(int per, int ap, int sh)",
    "  {",
    "   double e1[], e2[];",
    "   int n = hEmaSeries(e1, per, ap, sh, 8);",
    "   hEmaOn(e1, e2, n, per);",
    "   return(2.0 * e1[n - 1] - e2[n - 1]);",
    "  }"
  ].join("\n");

  H.tema = [
    "double hTema(int per, int ap, int sh)",
    "  {",
    "   double e1[], e2[], e3[];",
    "   int n = hEmaSeries(e1, per, ap, sh, 10);",
    "   hEmaOn(e1, e2, n, per); hEmaOn(e2, e3, n, per);",
    "   return(3.0 * e1[n - 1] - 3.0 * e2[n - 1] + e3[n - 1]);",
    "  }"
  ].join("\n");

  H.trix = [
    "double hTrix(int per, int ap, int sh)",
    "  {",
    "   double e1[], e2[], e3[];",
    "   int n = hEmaSeries(e1, per, ap, sh, 12);",
    "   hEmaOn(e1, e2, n, per); hEmaOn(e2, e3, n, per);",
    "   if(n < 3 || e3[n - 2] == 0) return(0);",
    "   return((e3[n - 1] - e3[n - 2]) / e3[n - 2] * 10000.0);",
    "  }"
  ].join("\n");

  H.vwma = [
    "double hVwma(int per, int ap, int sh)",
    "  {",
    "   double a = 0, b = 0;",
    "   for(int j = 0; j < per; j++) { double v = pV(sh + j); a += pAp(ap, sh + j) * v; b += v; }",
    "   return(b > 0 ? a / b : pAp(ap, sh));",
    "  }"
  ].join("\n");

  H.kama = [
    "double hKama(int per, int fast, int slow, int ap, int sh)",
    "  {",
    "   int n = eaWindow(per * 6 + 60, sh);",
    "   double fc = 2.0 / (fast + 1.0), sc = 2.0 / (slow + 1.0);",
    "   double val = pAp(ap, n - 1 + sh);",
    "   for(int j = n - 2; j >= 0; j--)",
    "     {",
    "      int k = j + sh;",
    "      if(k + per >= eaBars()) continue;",
    "      double dir = MathAbs(pAp(ap, k) - pAp(ap, k + per)), noise = 0;",
    "      for(int q = 0; q < per; q++) noise += MathAbs(pAp(ap, k + q) - pAp(ap, k + q + 1));",
    "      double er = noise > 0 ? dir / noise : 0;",
    "      double a = MathPow(er * (fc - sc) + sc, 2);",
    "      val = val + a * (pAp(ap, k) - val);",
    "     }",
    "   return(val);",
    "  }"
  ].join("\n");

  H.atrw = [
    "double hTr(int k) { double pc = pC(k + 1); return(MathMax(pH(k) - pL(k), MathMax(MathAbs(pH(k) - pc), MathAbs(pL(k) - pc)))); }",
    "double hAtr(int per, int sh)",
    "  {",
    "   int n = eaWindow(per * 5 + 20, sh);",
    "   double a = 0;",
    "   for(int j = 0; j < per; j++) a += hTr(n - 1 + sh - j);",
    "   a /= per;",
    "   for(int j = n - 1 - per; j >= 0; j--) a = (a * (per - 1) + hTr(j + sh)) / per;",
    "   return(a);",
    "  }"
  ].join("\n");

  H.natr = [
    "double hNatr(int per, int sh) { double c = pC(sh); return(c != 0 ? hAtr(per, sh) / c * 100.0 : 0); }"
  ].join("\n");

  H.supertrend = [
    "/* SuperTrend over a local window. out 0 = line, 1 = direction (+1/-1). */",
    "double hSuperTrend(int per, double mult, int sh, int out)",
    "  {",
    "   int n = eaWindow(per * 20 + 250, sh);",
    "   double up = 0, dn = 0, pup = 0, pdn = 0, line = 0;",
    "   int dir = 1, prevdir = 1;",
    "   for(int j = n - 1; j >= 0; j--)",
    "     {",
    "      int k = j + sh;",
    "      double a = hAtr(per, k), mid = (pH(k) + pL(k)) / 2.0;",
    "      up = mid + mult * a; dn = mid - mult * a;",
    "      if(j < n - 1)",
    "        {",
    "         if(pC(k + 1) > pup) up = MathMax(up, pup);",
    "         if(pC(k + 1) < pdn) dn = MathMin(dn, pdn);",
    "         dir = prevdir;",
    "         if(pC(k) > pup)      dir = 1;",
    "         else if(pC(k) < pdn) dir = -1;",
    "        }",
    "      line = dir > 0 ? dn : up;",
    "      pup = up; pdn = dn; prevdir = dir;",
    "     }",
    "   return(out == 1 ? (double)dir : line);",
    "  }"
  ].join("\n");

  H.keltner = [
    "/* out: 0 upper, 1 middle, 2 lower */",
    "double hKeltner(int per, int atrPer, double mult, int sh, int out)",
    "  {",
    "   double e1[];",
    "   int n = hEmaSeries(e1, per, PRICE_CLOSE, sh, 8);",
    "   double mid = e1[n - 1], a = hAtr(atrPer, sh);",
    "   if(out == 1) return(mid);",
    "   return(out == 0 ? mid + mult * a : mid - mult * a);",
    "  }"
  ].join("\n");

  H.hhll = [
    "double hHighest(int per, int sh) { double m = pH(sh); for(int j = 1; j < per; j++) m = MathMax(m, pH(sh + j)); return(m); }",
    "double hLowest(int per, int sh)  { double m = pL(sh); for(int j = 1; j < per; j++) m = MathMin(m, pL(sh + j)); return(m); }"
  ].join("\n");

  H.aroon = [
    "/* out: 0 up, 1 down, 2 oscillator */",
    "double hAroon(int per, int sh, int out)",
    "  {",
    "   double hi = pH(sh), lo = pL(sh);",
    "   int hidx = 0, lidx = 0;",
    "   for(int j = 1; j <= per; j++)",
    "     {",
    "      if(pH(sh + j) > hi) { hi = pH(sh + j); hidx = j; }",
    "      if(pL(sh + j) < lo) { lo = pL(sh + j); lidx = j; }",
    "     }",
    "   double u = 100.0 * (per - hidx) / per, d = 100.0 * (per - lidx) / per;",
    "   if(out == 0) return(u);",
    "   if(out == 1) return(d);",
    "   return(u - d);",
    "  }"
  ].join("\n");

  H.vortex = [
    "/* out: 0 = VI+, 1 = VI- */",
    "double hVortex(int per, int sh, int out)",
    "  {",
    "   double vp = 0, vm = 0, tr = 0;",
    "   for(int j = 0; j < per; j++)",
    "     {",
    "      int k = sh + j;",
    "      vp += MathAbs(pH(k) - pL(k + 1));",
    "      vm += MathAbs(pL(k) - pH(k + 1));",
    "      tr += hTr(k);",
    "     }",
    "   if(tr == 0) return(0);",
    "   return(out == 0 ? vp / tr : vm / tr);",
    "  }"
  ].join("\n");

  H.linreg = [
    "/* out: 0 = value at the shift bar, 1 = slope per bar */",
    "double hLinReg(int per, int ap, int sh, int out)",
    "  {",
    "   double sx = 0, sy = 0, sxx = 0, sxy = 0;",
    "   for(int j = 0; j < per; j++)",
    "     {",
    "      double x = j, y = pAp(ap, sh + j);",
    "      sx += x; sy += y; sxx += x * x; sxy += x * y;",
    "     }",
    "   double den = per * sxx - sx * sx;",
    "   if(den == 0) return(0);",
    "   double b = (per * sxy - sx * sy) / den;",
    "   double a = (sy - b * sx) / per;",
    "   return(out == 1 ? -b : a);",
    "  }"
  ].join("\n");

  H.rsiw = [
    "double hRsi(int per, int ap, int sh)",
    "  {",
    "   int n = eaWindow(per * 6 + 30, sh);",
    "   double up = 0, dn = 0, ch;",
    "   for(int j = 0; j < per; j++)",
    "     {",
    "      ch = pAp(ap, n - 1 + sh - j) - pAp(ap, n + sh - j);",
    "      if(ch > 0) up += ch; else dn -= ch;",
    "     }",
    "   up /= per; dn /= per;",
    "   for(int j = n - 1 - per; j >= 0; j--)",
    "     {",
    "      ch = pAp(ap, j + sh) - pAp(ap, j + sh + 1);",
    "      up = (up * (per - 1) + (ch > 0 ? ch : 0)) / per;",
    "      dn = (dn * (per - 1) + (ch < 0 ? -ch : 0)) / per;",
    "     }",
    "   if(dn == 0) return(100.0);",
    "   return(100.0 - 100.0 / (1.0 + up / dn));",
    "  }"
  ].join("\n");

  H.stochrsi = [
    "/* out: 0 = %K, 1 = %D */",
    "double hStochRsi(int rsiPer, int stoPer, int kSm, int dSm, int sh, int out)",
    "  {",
    "   int extra = (out == 1 ? dSm : 1) + kSm + 2;",
    "   double raw[]; ArrayResize(raw, stoPer + extra + kSm + dSm);",
    "   int total = stoPer + extra + kSm + dSm;",
    "   double ks[]; ArrayResize(ks, extra + dSm + 2);",
    "   for(int q = 0; q < extra + dSm + 2; q++)",
    "     {",
    "      double acc = 0;",
    "      for(int m = 0; m < kSm; m++)",
    "        {",
    "         double hi = -1e18, lo = 1e18;",
    "         for(int j = 0; j < stoPer; j++)",
    "           {",
    "            double r = hRsi(rsiPer, PRICE_CLOSE, sh + q + m + j);",
    "            hi = MathMax(hi, r); lo = MathMin(lo, r);",
    "           }",
    "         double cur = hRsi(rsiPer, PRICE_CLOSE, sh + q + m);",
    "         acc += (hi - lo) > 0 ? 100.0 * (cur - lo) / (hi - lo) : 0.0;",
    "        }",
    "      ks[q] = acc / kSm;",
    "     }",
    "   if(out == 0) return(ks[0]);",
    "   double s = 0; for(int q = 0; q < dSm; q++) s += ks[q];",
    "   return(s / dSm);",
    "  }"
  ].join("\n");

  H.roc = [
    "double hRoc(int per, int ap, int sh) { double b = pAp(ap, sh + per); return(b != 0 ? (pAp(ap, sh) - b) / b * 100.0 : 0); }"
  ].join("\n");

  H.cmo = [
    "double hCmo(int per, int ap, int sh)",
    "  {",
    "   double up = 0, dn = 0;",
    "   for(int j = 0; j < per; j++)",
    "     {",
    "      double ch = pAp(ap, sh + j) - pAp(ap, sh + j + 1);",
    "      if(ch > 0) up += ch; else dn -= ch;",
    "     }",
    "   return((up + dn) > 0 ? 100.0 * (up - dn) / (up + dn) : 0);",
    "  }"
  ].join("\n");

  H.uo = [
    "double hUo(int p1, int p2, int p3, int sh)",
    "  {",
    "   double a1 = 0, b1 = 0, a2 = 0, b2 = 0, a3 = 0, b3 = 0;",
    "   for(int j = 0; j < p3; j++)",
    "     {",
    "      int k = sh + j;",
    "      double tl = MathMin(pL(k), pC(k + 1)), th = MathMax(pH(k), pC(k + 1));",
    "      double bp = pC(k) - tl, tr = th - tl;",
    "      if(j < p1) { a1 += bp; b1 += tr; }",
    "      if(j < p2) { a2 += bp; b2 += tr; }",
    "      a3 += bp; b3 += tr;",
    "     }",
    "   double v1 = b1 > 0 ? a1 / b1 : 0, v2 = b2 > 0 ? a2 / b2 : 0, v3 = b3 > 0 ? a3 / b3 : 0;",
    "   return(100.0 * (4.0 * v1 + 2.0 * v2 + v3) / 7.0);",
    "  }"
  ].join("\n");

  H.fisher = [
    "/* out: 0 = fisher, 1 = trigger (previous bar) */",
    "double hFisher(int per, int sh, int out)",
    "  {",
    "   if(out == 1) return(hFisher(per, sh + 1, 0));",
    "   int n = eaWindow(per * 8 + 60, sh);",
    "   double v = 0, fish = 0, prev = 0;",
    "   for(int j = n - 1; j >= 0; j--)",
    "     {",
    "      int k = j + sh;",
    "      double hi = -1e18, lo = 1e18;",
    "      for(int q = 0; q < per; q++)",
    "        {",
    "         double m = (pH(k + q) + pL(k + q)) / 2.0;",
    "         hi = MathMax(hi, m); lo = MathMin(lo, m);",
    "        }",
    "      double med = (pH(k) + pL(k)) / 2.0;",
    "      double x = (hi - lo) > 0 ? 2.0 * ((med - lo) / (hi - lo) - 0.5) : 0;",
    "      v = 0.33 * 2.0 * x + 0.67 * v;",
    "      if(v > 0.999) v = 0.999; if(v < -0.999) v = -0.999;",
    "      prev = fish;",
    "      fish = 0.5 * MathLog((1.0 + v) / (1.0 - v)) + 0.5 * prev;",
    "     }",
    "   return(fish);",
    "  }"
  ].join("\n");

  H.bbw = [
    "/* out: 0 = width %, 1 = %B */",
    "double hBbw(int per, double dev, int ap, int sh, int out)",
    "  {",
    "   double m = 0;",
    "   for(int j = 0; j < per; j++) m += pAp(ap, sh + j);",
    "   m /= per;",
    "   double v = 0;",
    "   for(int j = 0; j < per; j++) { double q = pAp(ap, sh + j) - m; v += q * q; }",
    "   double sd = MathSqrt(v / per);",
    "   double up = m + dev * sd, lo = m - dev * sd;",
    "   if(out == 1) return((up - lo) > 0 ? (pAp(ap, sh) - lo) / (up - lo) * 100.0 : 0);",
    "   return(m != 0 ? (up - lo) / m * 100.0 : 0);",
    "  }"
  ].join("\n");

  H.vwap = [
    "/* Session VWAP: resets at the first bar of each server day. */",
    "double hVwap(int sh)",
    "  {",
    "   MqlDateTime a, b;",
    "   double pv = 0, vv = 0;",
    "   TimeToStruct(iTime(_Symbol, TF, sh), a);",
    "   for(int j = sh; j < eaBars() - 1 && j < sh + 3000; j++)",
    "     {",
    "      TimeToStruct(iTime(_Symbol, TF, j), b);",
    "      if(b.day != a.day || b.mon != a.mon || b.year != a.year) break;",
    "      double tp = (pH(j) + pL(j) + pC(j)) / 3.0, v = pV(j);",
    "      pv += tp * v; vv += v;",
    "     }",
    "   return(vv > 0 ? pv / vv : pC(sh));",
    "  }"
  ].join("\n");

  H.bucket = [
    "/* Bars of the previous day (kind 0) or week (kind 1): O H L C into out[]. */",
    "void hPrevBucket(int kind, int sh, double &out[])",
    "  {",
    "   ArrayResize(out, 4);",
    "   out[0] = 0; out[1] = 0; out[2] = 0; out[3] = 0;",
    "   MqlDateTime a, b;",
    "   TimeToStruct(iTime(_Symbol, TF, sh), a);",
    "   int cur = (kind == 1 ? (a.day_of_year - a.day_of_week) : a.day_of_year) + a.year * 1000;",
    "   int j = sh, guard = 0;",
    "   while(j < eaBars() - 1 && guard < 20000)",
    "     {",
    "      TimeToStruct(iTime(_Symbol, TF, j), b);",
    "      int id = (kind == 1 ? (b.day_of_year - b.day_of_week) : b.day_of_year) + b.year * 1000;",
    "      if(id != cur) break;",
    "      j++; guard++;",
    "     }",
    "   if(j >= eaBars() - 1) return;",
    "   TimeToStruct(iTime(_Symbol, TF, j), b);",
    "   int want = (kind == 1 ? (b.day_of_year - b.day_of_week) : b.day_of_year) + b.year * 1000;",
    "   double hi = pH(j), lo = pL(j), cl = pC(j), op = pO(j);",
    "   int k = j;",
    "   while(k < eaBars() - 1 && guard < 40000)",
    "     {",
    "      TimeToStruct(iTime(_Symbol, TF, k), b);",
    "      int id = (kind == 1 ? (b.day_of_year - b.day_of_week) : b.day_of_year) + b.year * 1000;",
    "      if(id != want) break;",
    "      hi = MathMax(hi, pH(k)); lo = MathMin(lo, pL(k)); op = pO(k);",
    "      k++; guard++;",
    "     }",
    "   out[0] = op; out[1] = hi; out[2] = lo; out[3] = cl;",
    "  }",
    "double hPrevOHLC(int kind, int which, int sh) { double b[]; hPrevBucket(kind, sh, b); return(b[which]); }"
  ].join("\n");

  H.pivot = [
    "/* kind: 0 classic 1 fibonacci 2 camarilla 3 woodie. out: 0 PP 1 R1 2 R2 3 R3 4 S1 5 S2 6 S3 */",
    "double hPivot(int kind, int period, int sh, int out)",
    "  {",
    "   double b[]; hPrevBucket(period, sh, b);",
    "   double ph = b[1], pl = b[2], pc = b[3], rng = ph - pl;",
    "   if(rng <= 0) return(0);",
    "   double pp = (kind == 3) ? (ph + pl + 2.0 * pO(sh)) / 4.0 : (ph + pl + pc) / 3.0;",
    "   double r1, r2, r3, s1, s2, s3;",
    "   if(kind == 1)",
    "     { r1 = pp + 0.382 * rng; r2 = pp + 0.618 * rng; r3 = pp + rng;",
    "       s1 = pp - 0.382 * rng; s2 = pp - 0.618 * rng; s3 = pp - rng; }",
    "   else if(kind == 2)",
    "     { r1 = pc + rng * 1.1 / 12.0; r2 = pc + rng * 1.1 / 6.0; r3 = pc + rng * 1.1 / 4.0;",
    "       s1 = pc - rng * 1.1 / 12.0; s2 = pc - rng * 1.1 / 6.0; s3 = pc - rng * 1.1 / 4.0; }",
    "   else",
    "     { r1 = 2.0 * pp - pl; s1 = 2.0 * pp - ph; r2 = pp + rng; s2 = pp - rng;",
    "       r3 = ph + 2.0 * (pp - pl); s3 = pl - 2.0 * (ph - pp); }",
    "   if(out == 0) return(pp);",
    "   if(out == 1) return(r1);",
    "   if(out == 2) return(r2);",
    "   if(out == 3) return(r3);",
    "   if(out == 4) return(s1);",
    "   if(out == 5) return(s2);",
    "   return(s3);",
    "  }"
  ].join("\n");

  H.session = [
    "/* High (out 0) or low (out 1) of today's session between two server hours. */",
    "double hSession(int fromH, int toH, int sh, int out)",
    "  {",
    "   MqlDateTime a, b;",
    "   TimeToStruct(iTime(_Symbol, TF, sh), a);",
    "   double hi = 0, lo = 0; bool got = false;",
    "   for(int j = sh; j < eaBars() - 1 && j < sh + 3000; j++)",
    "     {",
    "      TimeToStruct(iTime(_Symbol, TF, j), b);",
    "      if(b.day != a.day || b.mon != a.mon || b.year != a.year) break;",
    "      bool inS = (fromH <= toH) ? (b.hour >= fromH && b.hour < toH) : (b.hour >= fromH || b.hour < toH);",
    "      if(!inS) continue;",
    "      if(!got) { hi = pH(j); lo = pL(j); got = true; }",
    "      else { hi = MathMax(hi, pH(j)); lo = MathMin(lo, pL(j)); }",
    "     }",
    "   if(!got) return(out == 0 ? pH(sh) : pL(sh));",
    "   return(out == 0 ? hi : lo);",
    "  }"
  ].join("\n");

  H.fib = [
    "/* Fibonacci level of the last swing. dir: 0 auto, 1 up leg, 2 down leg. out: 0 level, 1 swing high, 2 swing low */",
    "double hFib(int per, double lvl, int dir, int sh, int out)",
    "  {",
    "   double hi = pH(sh), lo = pL(sh);",
    "   int hidx = 0, lidx = 0;",
    "   for(int j = 1; j < per; j++)",
    "     {",
    "      if(pH(sh + j) > hi) { hi = pH(sh + j); hidx = j; }",
    "      if(pL(sh + j) < lo) { lo = pL(sh + j); lidx = j; }",
    "     }",
    "   if(out == 1) return(hi);",
    "   if(out == 2) return(lo);",
    "   bool up = (dir == 1) ? true : (dir == 2) ? false : (hidx < lidx);",
    "   return(up ? hi - (hi - lo) * lvl : lo + (hi - lo) * lvl);",
    "  }"
  ].join("\n");

  H.swing = [
    "/* Last confirmed fractal high (out 0) / low (out 1) with `wing` bars each side. */",
    "double hSwing(int wing, int sh, int out)",
    "  {",
    "   int limit = eaBars() - wing - 2;",
    "   for(int c = sh + wing; c < limit && c < sh + 500; c++)",
    "     {",
    "      bool ok = true;",
    "      for(int j = 1; j <= wing && ok; j++)",
    "        {",
    "         if(out == 0 && (pH(c) <= pH(c - j) || pH(c) <= pH(c + j))) ok = false;",
    "         if(out == 1 && (pL(c) >= pL(c - j) || pL(c) >= pL(c + j))) ok = false;",
    "        }",
    "      if(ok) return(out == 0 ? pH(c) : pL(c));",
    "     }",
    "   return(out == 0 ? pH(sh) : pL(sh));",
    "  }"
  ].join("\n");

  H.round = [
    "double hRound(int stepPips, int sh, int out)",
    "  {",
    "   double st = stepPips * eaPip();",
    "   if(st <= 0) return(pC(sh));",
    "   double below = MathFloor(pC(sh) / st) * st;",
    "   return(out == 0 ? below + st : below);",
    "  }"
  ].join("\n");

  H.donch = [
    "/* out: 0 upper, 1 middle, 2 lower */",
    "double hDonchian(int per, int skip, int sh, int out)",
    "  {",
    "   double hi = hHighest(per, sh + skip), lo = hLowest(per, sh + skip);",
    "   if(out == 0) return(hi);",
    "   if(out == 2) return(lo);",
    "   return((hi + lo) / 2.0);",
    "  }"
  ].join("\n");

  /* ---------------- indicator map ---------------- */
  /* native: mt5 = handle expression + buffer index, mt4 = direct value call.
     shared: one helper expression used by both languages.            */
  var IND = {

    ma: { mt5: function (p) { return "iMA(_Symbol, TF, " + i(p.period) + ", 0, " + MM[p.method] + ", " + PX[p.price] + ")"; },
          buf: { main: 0 },
          mt4: function (p, o, s) { return "iMA(_Symbol, TF, " + i(p.period) + ", 0, " + MM[p.method] + ", " + PX[p.price] + ", " + s + ")"; } },

    hma:  { req: ["wma", "hma"], both: function (p, o, s) { return "hHma(" + i(p.period) + ", " + PX[p.price] + ", " + s + ")"; } },
    dema: { req: ["emaser", "dema"], both: function (p, o, s) { return "hDema(" + i(p.period) + ", " + PX[p.price] + ", " + s + ")"; } },
    tema: { req: ["emaser", "tema"], both: function (p, o, s) { return "hTema(" + i(p.period) + ", " + PX[p.price] + ", " + s + ")"; } },
    vwma: { req: ["vwma"], both: function (p, o, s) { return "hVwma(" + i(p.period) + ", " + PX[p.price] + ", " + s + ")"; } },
    kama: { req: ["kama"], both: function (p, o, s) { return "hKama(" + i(p.period) + ", " + i(p.fast) + ", " + i(p.slow) + ", " + PX[p.price] + ", " + s + ")"; } },

    supertrend: { req: ["atrw", "supertrend"], both: function (p, o, s) { return "hSuperTrend(" + i(p.period) + ", " + f(p.mult) + ", " + s + ", " + (o === "dir" ? 1 : 0) + ")"; } },

    sar: { mt5: function (p) { return "iSAR(_Symbol, TF, " + f(p.step) + ", " + f(p.max) + ")"; },
           buf: { main: 0 },
           mt4: function (p, o, s) { return "iSAR(_Symbol, TF, " + f(p.step) + ", " + f(p.max) + ", " + s + ")"; } },

    bbands: { mt5: function (p) { return "iBands(_Symbol, TF, " + i(p.period) + ", 0, " + f(p.dev) + ", " + PX[p.price] + ")"; },
              buf: { main: 0, upper: 1, lower: 2 },
              mt4: function (p, o, s) {
                var m = { main: "MODE_MAIN", upper: "MODE_UPPER", lower: "MODE_LOWER" }[o];
                return "iBands(_Symbol, TF, " + i(p.period) + ", " + f(p.dev) + ", 0, " + PX[p.price] + ", " + m + ", " + s + ")";
              } },

    bbwidth: { req: ["bbw"], both: function (p, o, s) { return "hBbw(" + i(p.period) + ", " + f(p.dev) + ", " + PX[p.price] + ", " + s + ", " + (o === "pctb" ? 1 : 0) + ")"; } },
    keltner: { req: ["emaser", "atrw", "keltner"], both: function (p, o, s) { return "hKeltner(" + i(p.period) + ", " + i(p.atr) + ", " + f(p.mult) + ", " + s + ", " + ({ upper: 0, main: 1, lower: 2 }[o]) + ")"; } },
    donchian: { req: ["hhll", "donch"], both: function (p, o, s) { return "hDonchian(" + i(p.period) + ", " + (p.exclude ? 1 : 0) + ", " + s + ", " + ({ upper: 0, main: 1, lower: 2 }[o]) + ")"; } },

    envelopes: { mt5: function (p) { return "iEnvelopes(_Symbol, TF, " + i(p.period) + ", 0, " + MM[p.method] + ", " + PX[p.price] + ", " + f(p.dev) + ")"; },
                 buf: { upper: 0, lower: 1 },
                 mt4: function (p, o, s) {
                   return "iEnvelopes(_Symbol, TF, " + i(p.period) + ", " + MM[p.method] + ", 0, " + PX[p.price] + ", " + f(p.dev) +
                     ", " + (o === "upper" ? "MODE_UPPER" : "MODE_LOWER") + ", " + s + ")";
                 } },

    ichimoku: { mt5: function (p) { return "iIchimoku(_Symbol, TF, " + i(p.tenkan) + ", " + i(p.kijun) + ", " + i(p.senkou) + ")"; },
                buf: { tenkan: 0, kijun: 1, spana: 2, spanb: 3 },
                mt4: function (p, o, s) {
                  var m = { tenkan: "MODE_TENKANSEN", kijun: "MODE_KIJUNSEN", spana: "MODE_SENKOUSPANA", spanb: "MODE_SENKOUSPANB" }[o];
                  return "iIchimoku(_Symbol, TF, " + i(p.tenkan) + ", " + i(p.kijun) + ", " + i(p.senkou) + ", " + m + ", " + s + ")";
                } },

    alligator: { mt5: function (p) {
                   return "iAlligator(_Symbol, TF, " + i(p.jaw) + ", " + i(p.jawS) + ", " + i(p.teeth) + ", " + i(p.teethS) +
                     ", " + i(p.lips) + ", " + i(p.lipsS) + ", MODE_SMMA, PRICE_MEDIAN)";
                 },
                 buf: { jaw: 0, teeth: 1, lips: 2 },
                 mt4: function (p, o, s) {
                   var m = { jaw: "MODE_GATORJAW", teeth: "MODE_GATORTEETH", lips: "MODE_GATORLIPS" }[o];
                   return "iAlligator(_Symbol, TF, " + i(p.jaw) + ", " + i(p.jawS) + ", " + i(p.teeth) + ", " + i(p.teethS) +
                     ", " + i(p.lips) + ", " + i(p.lipsS) + ", MODE_SMMA, PRICE_MEDIAN, " + m + ", " + s + ")";
                 } },

    adx: { mt5: function (p) { return "iADX(_Symbol, TF, " + i(p.period) + ")"; },
           buf: { main: 0, plus: 1, minus: 2 },
           mt4: function (p, o, s) {
             var m = { main: "MODE_MAIN", plus: "MODE_PLUSDI", minus: "MODE_MINUSDI" }[o];
             return "iADX(_Symbol, TF, " + i(p.period) + ", PRICE_CLOSE, " + m + ", " + s + ")";
           } },

    aroon:  { req: ["aroon"], both: function (p, o, s) { return "hAroon(" + i(p.period) + ", " + s + ", " + ({ up: 0, down: 1, osc: 2 }[o]) + ")"; } },
    vortex: { req: ["atrw", "vortex"], both: function (p, o, s) { return "hVortex(" + i(p.period) + ", " + s + ", " + (o === "minus" ? 1 : 0) + ")"; } },
    linreg: { req: ["linreg"], both: function (p, o, s) { return "hLinReg(" + i(p.period) + ", " + PX[p.price] + ", " + s + ", " + (o === "slope" ? 1 : 0) + ")"; } },

    rsi: { mt5: function (p) { return "iRSI(_Symbol, TF, " + i(p.period) + ", " + PX[p.price] + ")"; },
           buf: { main: 0 },
           mt4: function (p, o, s) { return "iRSI(_Symbol, TF, " + i(p.period) + ", " + PX[p.price] + ", " + s + ")"; } },

    stochrsi: { req: ["rsiw", "stochrsi"], both: function (p, o, s) { return "hStochRsi(" + i(p.rsiP) + ", " + i(p.stoP) + ", " + i(p.k) + ", " + i(p.dP) + ", " + s + ", " + (o === "signal" ? 1 : 0) + ")"; } },

    stoch: { mt5: function (p) { return "iStochastic(_Symbol, TF, " + i(p.k) + ", " + i(p.d) + ", " + i(p.slow) + ", MODE_SMA, STO_LOWHIGH)"; },
             buf: { main: 0, signal: 1 },
             mt4: function (p, o, s) {
               return "iStochastic(_Symbol, TF, " + i(p.k) + ", " + i(p.d) + ", " + i(p.slow) + ", MODE_SMA, 0, " +
                 (o === "signal" ? "MODE_SIGNAL" : "MODE_MAIN") + ", " + s + ")";
             } },

    macd: { mt5: function (p) { return "iMACD(_Symbol, TF, " + i(p.fast) + ", " + i(p.slow) + ", " + i(p.signal) + ", " + PX[p.price] + ")"; },
            buf: { main: 0, signal: 1 },
            derive: { hist: ["main", "signal", "-"] },
            mt4: function (p, o, s) {
              return "iMACD(_Symbol, TF, " + i(p.fast) + ", " + i(p.slow) + ", " + i(p.signal) + ", " + PX[p.price] + ", " +
                (o === "signal" ? "MODE_SIGNAL" : "MODE_MAIN") + ", " + s + ")";
            } },

    osma: { mt5: function (p) { return "iOsMA(_Symbol, TF, " + i(p.fast) + ", " + i(p.slow) + ", " + i(p.signal) + ", " + PX[p.price] + ")"; },
            buf: { main: 0 },
            mt4: function (p, o, s) { return "iOsMA(_Symbol, TF, " + i(p.fast) + ", " + i(p.slow) + ", " + i(p.signal) + ", " + PX[p.price] + ", " + s + ")"; } },

    cci: { mt5: function (p) { return "iCCI(_Symbol, TF, " + i(p.period) + ", " + PX[p.price] + ")"; },
           buf: { main: 0 },
           mt4: function (p, o, s) { return "iCCI(_Symbol, TF, " + i(p.period) + ", " + PX[p.price] + ", " + s + ")"; } },

    wpr: { mt5: function (p) { return "iWPR(_Symbol, TF, " + i(p.period) + ")"; },
           buf: { main: 0 },
           mt4: function (p, o, s) { return "iWPR(_Symbol, TF, " + i(p.period) + ", " + s + ")"; } },

    momentum: { mt5: function (p) { return "iMomentum(_Symbol, TF, " + i(p.period) + ", " + PX[p.price] + ")"; },
                buf: { main: 0 },
                mt4: function (p, o, s) { return "iMomentum(_Symbol, TF, " + i(p.period) + ", " + PX[p.price] + ", " + s + ")"; } },

    roc:  { req: ["roc"],  both: function (p, o, s) { return "hRoc(" + i(p.period) + ", " + PX[p.price] + ", " + s + ")"; } },
    cmo:  { req: ["cmo"],  both: function (p, o, s) { return "hCmo(" + i(p.period) + ", " + PX[p.price] + ", " + s + ")"; } },
    trix: { req: ["emaser", "trix"], both: function (p, o, s) { return "hTrix(" + i(p.period) + ", " + PX[p.price] + ", " + s + ")"; } },
    uo:   { req: ["uo"],   both: function (p, o, s) { return "hUo(" + i(p.p1) + ", " + i(p.p2) + ", " + i(p.p3) + ", " + s + ")"; } },
    fisher: { req: ["fisher"], both: function (p, o, s) { return "hFisher(" + i(p.period) + ", " + s + ", " + (o === "signal" ? 1 : 0) + ")"; } },

    ao: { mt5: function () { return "iAO(_Symbol, TF)"; }, buf: { main: 0 },
          mt4: function (p, o, s) { return "iAO(_Symbol, TF, " + s + ")"; } },
    ac: { mt5: function () { return "iAC(_Symbol, TF)"; }, buf: { main: 0 },
          mt4: function (p, o, s) { return "iAC(_Symbol, TF, " + s + ")"; } },

    demarker: { mt5: function (p) { return "iDeMarker(_Symbol, TF, " + i(p.period) + ")"; }, buf: { main: 0 },
                mt4: function (p, o, s) { return "iDeMarker(_Symbol, TF, " + i(p.period) + ", " + s + ")"; } },

    rvi: { mt5: function (p) { return "iRVI(_Symbol, TF, " + i(p.period) + ")"; }, buf: { main: 0, signal: 1 },
           mt4: function (p, o, s) { return "iRVI(_Symbol, TF, " + i(p.period) + ", " + (o === "signal" ? "MODE_SIGNAL" : "MODE_MAIN") + ", " + s + ")"; } },

    bears: { mt5: function (p) { return "iBearsPower(_Symbol, TF, " + i(p.period) + ")"; }, buf: { main: 0 },
             mt4: function (p, o, s) { return "iBearsPower(_Symbol, TF, " + i(p.period) + ", PRICE_CLOSE, " + s + ")"; } },
    bulls: { mt5: function (p) { return "iBullsPower(_Symbol, TF, " + i(p.period) + ")"; }, buf: { main: 0 },
             mt4: function (p, o, s) { return "iBullsPower(_Symbol, TF, " + i(p.period) + ", PRICE_CLOSE, " + s + ")"; } },

    force: { mt5: function (p) { return "iForce(_Symbol, TF, " + i(p.period) + ", " + MM[p.method] + ", VOLUME_TICK)"; }, buf: { main: 0 },
             mt4: function (p, o, s) { return "iForce(_Symbol, TF, " + i(p.period) + ", " + MM[p.method] + ", PRICE_CLOSE, " + s + ")"; } },

    atr: { mt5: function (p) { return "iATR(_Symbol, TF, " + i(p.period) + ")"; }, buf: { main: 0 },
           mt4: function (p, o, s) { return "iATR(_Symbol, TF, " + i(p.period) + ", " + s + ")"; } },

    natr: { req: ["atrw", "natr"], both: function (p, o, s) { return "hNatr(" + i(p.period) + ", " + s + ")"; } },

    stddev: { mt5: function (p) { return "iStdDev(_Symbol, TF, " + i(p.period) + ", 0, MODE_SMA, " + PX[p.price] + ")"; }, buf: { main: 0 },
              mt4: function (p, o, s) { return "iStdDev(_Symbol, TF, " + i(p.period) + ", 0, MODE_SMA, " + PX[p.price] + ", " + s + ")"; } },

    volume: { mt5: function (p) { return "iMA(_Symbol, TF, " + i(p.period) + ", 0, MODE_SMA, PRICE_CLOSE)"; },
              buf: { avg: 0 },
              raw: { main: function (p, o, s) { return "pV(" + s + ")"; } },
              req: ["px"],
              mt4: function (p, o, s) {
                return o === "avg"
                  ? "iMA(_Symbol, TF, " + i(p.period) + ", 0, MODE_SMA, PRICE_CLOSE, " + s + ")"
                  : "pV(" + s + ")";
              } },

    obv: { mt5: function () { return "iOBV(_Symbol, TF, VOLUME_TICK)"; }, buf: { main: 0 },
           mt4: function (p, o, s) { return "iOBV(_Symbol, TF, PRICE_CLOSE, " + s + ")"; } },

    mfi: { mt5: function (p) { return "iMFI(_Symbol, TF, " + i(p.period) + ", VOLUME_TICK)"; }, buf: { main: 0 },
           mt4: function (p, o, s) { return "iMFI(_Symbol, TF, " + i(p.period) + ", " + s + ")"; } },

    ad: { mt5: function () { return "iAD(_Symbol, TF, VOLUME_TICK)"; }, buf: { main: 0 },
          mt4: function (p, o, s) { return "iAD(_Symbol, TF, " + s + ")"; } },

    vwap:    { req: ["vwap"],    both: function (p, o, s) { return "hVwap(" + s + ")"; } },
    hhll:    { req: ["hhll"],    both: function (p, o, s) {
                 var sk = p.exclude ? " + 1" : "";
                 if (o === "hh") return "hHighest(" + i(p.period) + ", " + s + sk + ")";
                 if (o === "ll") return "hLowest(" + i(p.period) + ", " + s + sk + ")";
                 return "((hHighest(" + i(p.period) + ", " + s + sk + ") + hLowest(" + i(p.period) + ", " + s + sk + ")) / 2.0)";
               } },
    fractals: { req: ["swing"], both: function (p, o, s) { return "hSwing(" + i(p.wing) + ", " + s + ", " + (o === "low" ? 1 : 0) + ")"; } },
    fib:      { req: ["fib"],   both: function (p, o, s) {
                 var dir = p.dir === "up" ? 1 : p.dir === "down" ? 2 : 0;
                 return "hFib(" + i(p.period) + ", " + f(parseFloat(p.level) / 100) + ", " + dir + ", " + s + ", " + ({ main: 0, hi: 1, lo: 2 }[o]) + ")";
               } },
    pivot:    { req: ["bucket", "pivot"], both: function (p, o, s) {
                 var kind = { classic: 0, fib: 1, cam: 2, wood: 3 }[p.kind] || 0;
                 var out = { pp: 0, r1: 1, r2: 2, r3: 3, s1: 4, s2: 5, s3: 6 }[o];
                 return "hPivot(" + kind + ", " + (p.period === "week" ? 1 : 0) + ", " + s + ", " + out + ")";
               } },
    dayohlc:  { req: ["bucket"], both: function (p, o, s) {
                 return "hPrevOHLC(" + (p.period === "week" ? 1 : 0) + ", " + ({ o: 0, h: 1, l: 2, c: 3 }[o]) + ", " + s + ")";
               } },
    session:  { req: ["session"], both: function (p, o, s) { return "hSession(" + i(p.from) + ", " + i(p.to) + ", " + s + ", " + (o === "low" ? 1 : 0) + ")"; } },
    round:    { req: ["round"],   both: function (p, o, s) { return "hRound(" + i(p.stepPips) + ", " + s + ", " + (o === "above" ? 0 : 1) + ")"; } },
    spread:   { both: function () { return "((double)SymbolInfoInteger(_Symbol, SYMBOL_SPREAD))"; } }
  };

  window.EA = window.EA || {};
  window.EA.MT = { PX: PX, MM: MM, H: H, IND: IND, i: i, f: f };
})();
