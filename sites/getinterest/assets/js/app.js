/* =====================================================================
   GetInterest — calculator engine + UI
   Pure maths lives in GI.calc so it stays testable; GI.mount() builds the
   interactive shell into [data-calc-app] on any page.
   ===================================================================== */
(function () {
  "use strict";
  var $ = GA.$, $$ = GA.$$;
  var DATA = window.GI_DATA;

  /* =========================== 1. Maths =========================== */
  var calc = {
    /** Level monthly instalment for an amortising loan. */
    emi: function (principal, annualPct, months) {
      if (months <= 0) return 0;
      var r = annualPct / 1200;
      if (r === 0) return principal / months;
      var f = Math.pow(1 + r, months);
      return (principal * r * f) / (f - 1);
    },

    /**
     * Month-by-month amortisation.
     * extraMonthly  — additional principal paid every month
     * lumpSum/lumpAtMonth — a one-off prepayment
     * Returns { months, totalInterest, totalPaid, rows[], years[] }
     */
    schedule: function (principal, annualPct, months, extraMonthly, lumpSum, lumpAtMonth) {
      var r = annualPct / 1200;
      var emi = calc.emi(principal, annualPct, months);
      var bal = principal, totalInterest = 0, rows = [], m = 0;
      var maxMonths = months + 12; // safety rail; extra payments only shorten
      extraMonthly = extraMonthly || 0; lumpSum = lumpSum || 0; lumpAtMonth = lumpAtMonth || 0;

      while (bal > 0.005 && m < maxMonths) {
        m++;
        var interest = bal * r;
        var principalPart = emi - interest + extraMonthly;
        if (lumpSum > 0 && m === lumpAtMonth) principalPart += lumpSum;
        if (principalPart > bal) principalPart = bal;
        if (principalPart <= 0) break; // negative amortisation guard
        bal -= principalPart;
        totalInterest += interest;
        rows.push({ m: m, interest: interest, principal: principalPart, balance: bal });
      }

      var years = [], y = null;
      rows.forEach(function (row, i) {
        var yi = Math.floor(i / 12);
        if (!years[yi]) years[yi] = { year: yi + 1, interest: 0, principal: 0, balance: 0 };
        y = years[yi];
        y.interest += row.interest; y.principal += row.principal; y.balance = row.balance;
      });

      return {
        emi: emi, months: rows.length, totalInterest: totalInterest,
        totalPaid: principal + totalInterest, principal: principal,
        rows: rows, years: years
      };
    },

    /** Lump-sum deposit compounded m times a year. */
    deposit: function (principal, annualPct, years, m) {
      m = m || 4;
      var maturity = principal * Math.pow(1 + annualPct / (100 * m), m * years);
      return { invested: principal, maturity: maturity, interest: maturity - principal };
    },

    /** Recurring deposit: a fixed sum every month, each instalment compounded for its remaining life. */
    recurring: function (monthly, annualPct, years, m) {
      m = m || 4;
      var n = Math.round(years * 12);
      var monthlyFactor = Math.pow(1 + annualPct / (100 * m), m / 12);
      var maturity = 0, series = [];
      for (var k = 1; k <= n; k++) {
        maturity += monthly * Math.pow(monthlyFactor, n - k + 1);
        if (k % 12 === 0 || k === n) series.push({ month: k, value: maturity, invested: monthly * k });
      }
      return { invested: monthly * n, maturity: maturity, interest: maturity - monthly * n, series: series };
    },

    /** SIP with an optional annual step-up (%). Contributions at month end. */
    sip: function (monthly, annualPct, years, stepUpPct) {
      var i = annualPct / 1200, n = Math.round(years * 12);
      var bal = 0, invested = 0, amount = monthly, series = [];
      for (var k = 1; k <= n; k++) {
        if (k > 1 && (k - 1) % 12 === 0 && stepUpPct) amount = amount * (1 + stepUpPct / 100);
        bal = bal * (1 + i) + amount;
        invested += amount;
        if (k % 12 === 0 || k === n) series.push({ month: k, value: bal, invested: invested });
      }
      return { invested: invested, maturity: bal, interest: bal - invested, finalMonthly: amount, series: series };
    },

    simple: function (principal, annualPct, years) {
      var interest = (principal * annualPct * years) / 100;
      return { invested: principal, interest: interest, maturity: principal + interest };
    }
  };

  /* ======================= 2. Chart helpers ======================= */
  var SVGNS = "http://www.w3.org/2000/svg";
  function el(tag, attrs, parent) {
    var n = document.createElementNS(SVGNS, tag);
    for (var k in attrs) if (attrs[k] != null) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }

  /** Animated two-segment donut. */
  function donut(host, a, b, labelA, labelB) {
    var R = 62, C = 2 * Math.PI * R, size = 160;
    var total = a + b || 1;
    var svg = $("svg", host);
    if (!svg) {
      host.innerHTML = "";
      svg = el("svg", { viewBox: "0 0 " + size + " " + size, class: "donut", role: "img" }, host);
      el("circle", { cx: 80, cy: 80, r: R, fill: "none", stroke: "var(--surface-3)", "stroke-width": 15 }, svg);
      var arcB = el("circle", { cx: 80, cy: 80, r: R, fill: "none", stroke: "var(--accent-2)", "stroke-width": 15,
        "stroke-linecap": "round", transform: "rotate(-90 80 80)", "stroke-dasharray": C }, svg);
      var arcA = el("circle", { cx: 80, cy: 80, r: R, fill: "none", stroke: "var(--accent)", "stroke-width": 15,
        "stroke-linecap": "round", transform: "rotate(-90 80 80)", "stroke-dasharray": C }, svg);
      arcA.style.transition = arcB.style.transition = "stroke-dashoffset .8s cubic-bezier(.22,1,.36,1)";
      host._a = arcA; host._b = arcB;
      var t = el("text", { x: 80, y: 76, "text-anchor": "middle", class: "donut__pct" }, svg);
      var t2 = el("text", { x: 80, y: 95, "text-anchor": "middle", class: "donut__cap" }, svg);
      host._t = t; host._t2 = t2;
    }
    var pa = a / total;
    host._a.setAttribute("stroke-dashoffset", C * (1 - pa));
    host._b.setAttribute("stroke-dashoffset", 0);
    host._t.textContent = Math.round((b / total) * 100) + "%";
    host._t2.textContent = labelB;
    svg.setAttribute("aria-label", labelA + " " + Math.round(pa * 100) + "%, " + labelB + " " + Math.round((1 - pa) * 100) + "%");
  }

  /** Stacked yearly bars with a hover read-out. */
  function bars(host, series, fmt, keys, colors, xLabel) {
    var W = 720, H = 200, pad = { t: 14, r: 4, b: 24, l: 4 };
    host.innerHTML = "";
    if (!series.length) return;
    var svg = el("svg", { viewBox: "0 0 " + W + " " + H, class: "bars", preserveAspectRatio: "none" }, host);
    var max = 0;
    series.forEach(function (d) {
      var s = keys.reduce(function (acc, k) { return acc + (d[k] || 0); }, 0);
      if (s > max) max = s;
    });
    max = max || 1;
    var innerW = W - pad.l - pad.r, innerH = H - pad.t - pad.b;
    var step = innerW / series.length, bw = Math.max(3, Math.min(38, step * 0.62));

    var tip = document.createElement("div");
    tip.className = "chart-tip"; tip.hidden = true;
    host.appendChild(tip);

    series.forEach(function (d, i) {
      var x = pad.l + step * i + (step - bw) / 2, yAcc = H - pad.b;
      var g = el("g", { class: "bar-g" }, svg);
      keys.forEach(function (k, ki) {
        var h = ((d[k] || 0) / max) * innerH;
        yAcc -= h;
        var rect = el("rect", {
          x: x.toFixed(2), y: yAcc.toFixed(2), width: bw.toFixed(2), height: Math.max(0, h).toFixed(2),
          rx: ki === keys.length - 1 ? 3 : 0, fill: colors[ki]
        }, g);
        if (!GA.reduced) {
          rect.style.transformOrigin = "center " + (H - pad.b) + "px";
          rect.style.animation = "barGrow .6s cubic-bezier(.22,1,.36,1) both";
          rect.style.animationDelay = (i * 0.018) + "s";
        }
      });
      el("rect", { x: (pad.l + step * i).toFixed(2), y: pad.t, width: step.toFixed(2), height: innerH,
        fill: "transparent", class: "bar-hit" }, g);
      g.addEventListener("pointerenter", function () {
        tip.hidden = false;
        tip.innerHTML = "<b>" + xLabel + " " + (d.year || d.month) + "</b>" +
          keys.map(function (k, ki) {
            return '<span><i style="background:' + colors[ki] + '"></i>' + fmt.names[ki] + " <b>" + fmt.f(d[k] || 0) + "</b></span>";
          }).join("");
        var pct = (pad.l + step * i + step / 2) / W;
        tip.style.left = (pct * 100) + "%";
      });
      g.addEventListener("pointerleave", function () { tip.hidden = true; });
    });

    // baseline
    el("line", { x1: 0, y1: H - pad.b + 1, x2: W, y2: H - pad.b + 1, stroke: "var(--line)", "stroke-width": 1 }, svg);
    var axis = document.createElement("div");
    axis.className = "bars__axis";
    var lastLabel = series[series.length - 1].year || Math.round(series[series.length - 1].month / 12);
    axis.innerHTML = "<span>" + xLabel + " 1</span><span>" + xLabel + " " + lastLabel + "</span>";
    host.appendChild(axis);
  }

  /* ========================= 3. The app ========================= */
  var CALCS = {
    emi:    { title: "Loan EMI",         short: "EMI" },
    fd:     { title: "Fixed deposit",    short: "FD" },
    rd:     { title: "Recurring deposit", short: "RD" },
    sip:    { title: "SIP",              short: "SIP" },
    simple: { title: "Simple vs compound", short: "Simple" }
  };

  function mount(host) {
    if (!host) return;
    var only = (host.dataset.calcs || "emi,fd,rd,sip,simple").split(",");
    var params = GA.readParams();

    var state = {
      calc:   params.calc && CALCS[params.calc] ? params.calc : (host.dataset.defaultCalc || only[0]),
      region: params.region && DATA.regions[params.region] ? params.region : (localStorage.getItem("gi-region") || "IN"),
      product: params.product || "home",
      amount: +params.amount || null,
      rate:   +params.rate || null,
      years:  +params.years || null,
      extra:  +params.extra || 0,
      lump:   +params.lump || 0,
      lumpAt: +params.lumpAt || 12,
      stepUp: +params.stepUp || 0,
      freq:   +params.freq || null,
      bank:   params.bank || ""
    };
    if (!DATA.regions[state.region]) state.region = "IN";

    host.innerHTML = shell(only, state);
    var R = function () { return DATA.regions[state.region]; };

    /* --- region picker --- */
    var regionSel = $("[data-region]", host);
    regionSel.value = state.region;
    regionSel.addEventListener("change", function () {
      state.region = regionSel.value;
      try { localStorage.setItem("gi-region", state.region); } catch (e) {}
      state.amount = state.rate = state.years = null;
      state.bank = "";
      buildInputs(); run();
    });

    /* --- calculator tabs --- */
    var seg = GA.initSeg($("[data-calc-tabs]", host), function (v) {
      state.calc = v; state.amount = state.rate = state.years = null;
      buildInputs(); run();
    });

    var inputsHost = $("[data-inputs]", host);
    var outHost = $("[data-output]", host);

    function defaultsFor() {
      var r = R();
      if (state.calc === "emi") {
        var d = (r.defaults && r.defaults[state.product]) || [1000000, 9, 10];
        return { amount: d[0], rate: d[1], years: d[2] };
      }
      if (state.calc === "fd")  return { amount: (r.defaults.home[0] / 10) | 0, rate: r.banks[0].rates.deposit1y || 5, years: 5 };
      if (state.calc === "rd")  return { amount: Math.max(100, (r.defaults.home[0] / 500) | 0), rate: r.banks[0].rates.deposit1y || 5, years: 5 };
      if (state.calc === "sip") return { amount: Math.max(100, (r.defaults.home[0] / 500) | 0), rate: 12, years: 15 };
      return { amount: (r.defaults.home[0] / 10) | 0, rate: 8, years: 10 };
    }

    function ranges() {
      var r = R(), big = r.defaults.home[0];
      if (state.calc === "emi") return { amount: [big / 50, big * 4, big / 200], rate: [1, 24, 0.05], years: [1, 30, 1] };
      if (state.calc === "fd" || state.calc === "simple") return { amount: [big / 200, big, big / 500], rate: [0.5, 15, 0.05], years: [1, 20, 1] };
      return { amount: [big / 2000, big / 20, big / 2000], rate: [1, 30, 0.5], years: [1, 30, 1] };
    }

    function buildInputs() {
      var r = R(), d = defaultsFor(), rg = ranges();
      if (state.amount == null) state.amount = d.amount;
      if (state.rate == null) state.rate = d.rate;
      if (state.years == null) state.years = d.years;
      if (state.freq == null) state.freq = r.fdCompounding || 4;

      var isLoan = state.calc === "emi";
      var amountLabel = isLoan ? "Loan amount"
        : state.calc === "rd" ? "Monthly deposit"
        : state.calc === "sip" ? "Monthly investment" : "Amount invested";
      var rateLabel = isLoan
        ? (r.rateWord === "profit" ? "Annual profit rate" : "Annual interest rate")
        : state.calc === "sip" ? "Expected annual return" : "Annual " + r.rateWord + " rate";

      var html = "";

      if (isLoan) {
        html += '<div class="field"><div class="field__label"><span>Loan type</span></div>' +
          '<div class="seg seg--sm" data-product-tabs role="tablist"><span class="seg__ind"></span>' +
          ["home", "car", "personal"].map(function (p) {
            return '<button class="seg__btn" type="button" role="tab" data-value="' + p + '" aria-selected="' +
              (state.product === p) + '">' + r.labels[p] + "</button>";
          }).join("") + "</div></div>";
      }

      html += sliderField("amount", amountLabel, state.amount, rg.amount, "money");
      html += sliderField("rate", rateLabel, state.rate, rg.rate, "pct");
      html += sliderField("years", state.calc === "emi" ? "Tenure" : "Time period", state.years, rg.years, "years");

      if (state.calc === "fd" || state.calc === "rd" || state.calc === "simple") {
        html += '<div class="field"><div class="field__label"><span>Compounding</span></div>' +
          '<select class="select" data-freq>' +
          [[1, "Annually"], [2, "Half-yearly"], [4, "Quarterly"], [12, "Monthly"]].map(function (o) {
            return '<option value="' + o[0] + '"' + (state.freq === o[0] ? " selected" : "") + ">" + o[1] + "</option>";
          }).join("") + "</select></div>";
      }

      if (state.calc === "sip") {
        html += sliderField("stepUp", "Annual step-up", state.stepUp, [0, 25, 1], "pct", "Raise your SIP by this much every year");
      }

      if (isLoan) {
        html += '<details class="adv"><summary>Prepayment planner <span class="tag">optional</span></summary><div class="adv__body">' +
          sliderField("extra", "Extra every month", state.extra, [0, Math.round(rg.amount[1] / 120), Math.round(rg.amount[1] / 12000) || 1], "money") +
          sliderField("lump", "One-time prepayment", state.lump, [0, Math.round(rg.amount[1] / 4), Math.round(rg.amount[1] / 400) || 1], "money") +
          sliderField("lumpAt", "Paid in month", state.lumpAt, [1, Math.max(2, state.years * 12), 1], "months") +
          "</div></details>";

        html += '<div class="field" style="margin-top:18px"><div class="field__label"><span>Prefill a bank\'s rate</span>' +
          '<span class="field__hint">' + r.banks.length + " lenders</span></div>" +
          '<select class="select" data-bank><option value="">Choose a bank…</option>' +
          r.banks.filter(function (b) { return b.rates[state.product] != null; }).map(function (b) {
            return '<option value="' + b.short + '"' + (state.bank === b.short ? " selected" : "") + ">" +
              b.name + " — " + b.rates[state.product].toFixed(2) + "%</option>";
          }).join("") + "</select></div>";
      }

      inputsHost.innerHTML = html;
      GA.initRanges(inputsHost);

      if (isLoan) {
        GA.initSeg($("[data-product-tabs]", inputsHost), function (v) {
          state.product = v; state.amount = state.rate = state.years = null; state.bank = "";
          buildInputs(); run();
        });
        var bankSel = $("[data-bank]", inputsHost);
        if (bankSel) bankSel.addEventListener("change", function () {
          state.bank = bankSel.value;
          var b = r.banks.filter(function (x) { return x.short === state.bank; })[0];
          if (b && b.rates[state.product] != null) {
            state.rate = b.rates[state.product];
            syncField("rate", state.rate);
            run();
          }
        });
      }
      var freqSel = $("[data-freq]", inputsHost);
      if (freqSel) freqSel.addEventListener("change", function () { state.freq = +freqSel.value; run(); });

      $$("[data-bind]", inputsHost).forEach(function (node) {
        var key = node.dataset.bind;
        node.addEventListener("input", function () {
          var v = parseFloat(node.value);
          if (!isFinite(v)) return;
          state[key] = v;
          syncField(key, v, node);
          if (key === "years") {
            var la = $('[data-bind="lumpAt"][type="range"]', inputsHost);
            if (la) { la.max = String(Math.max(2, v * 12)); GA.paintRange(la); }
          }
          run();
        });
        node.addEventListener("change", function () {
          var v = parseFloat(node.value);
          var rng = node.type === "range" ? null : node;
          if (rng && (!isFinite(v) || v < 0)) { node.value = state[key]; }
        });
      });
    }

    function syncField(key, v, except) {
      $$('[data-bind="' + key + '"]', inputsHost).forEach(function (n) {
        if (n === except) return;
        n.value = key === "rate" || key === "stepUp" ? v : Math.round(v);
        if (n.type === "range") GA.paintRange(n);
      });
      var out = $('[data-echo="' + key + '"]', inputsHost);
      if (out) out.textContent = echo(key, v);
    }

    function echo(key, v) {
      if (key === "rate" || key === "stepUp") return v.toFixed(2) + "%";
      if (key === "years") return v + (v === 1 ? " year" : " years");
      if (key === "lumpAt") return "month " + v;
      return GA.compact(v, R().currency);
    }

    function sliderField(key, label, value, rng, kind, hint) {
      var cur = GA.CUR[R().currency] || {};
      var step = rng[2];
      var input = kind === "money"
        ? '<div class="input-money"><span class="cur">' + (cur.sym || "") + '</span>' +
          '<input class="input" type="number" inputmode="decimal" data-bind="' + key + '" value="' + value + '" min="' + rng[0] + '" step="' + step + '"></div>'
        : '<input class="input" type="number" inputmode="decimal" data-bind="' + key + '" value="' + value + '" min="' + rng[0] + '" max="' + rng[1] + '" step="' + step + '">';
      return '<div class="field">' +
        '<div class="field__label"><span>' + label + '</span><span class="field__hint" data-echo="' + key + '">' + echo(key, value) + "</span></div>" +
        input +
        '<input class="range" type="range" data-bind="' + key + '" value="' + value + '" min="' + rng[0] + '" max="' + rng[1] + '" step="' + step + '" aria-label="' + label + '">' +
        (hint ? '<p class="field__note">' + hint + "</p>" : "") +
        "</div>";
    }

    /* ------------------------ render results ------------------------ */
    function run() {
      var r = R(), cur = r.currency;
      var M = function (n) { return GA.money(n, cur); };
      var out = "";

      if (state.calc === "emi") {
        var base = calc.schedule(state.amount, state.rate, Math.round(state.years * 12), 0, 0, 0);
        var plan = calc.schedule(state.amount, state.rate, Math.round(state.years * 12), state.extra, state.lump, state.lumpAt);
        var saved = base.totalInterest - plan.totalInterest;
        var monthsCut = base.months - plan.months;
        var payoff = new Date(); payoff.setMonth(payoff.getMonth() + plan.months);

        out += hero(r.rateWord === "profit" ? "Monthly instalment" : "Monthly EMI", plan.emi, cur, "emiHero");
        out += statRow([
          ["Principal", M(plan.principal)],
          [r.rateWord === "profit" ? "Total profit" : "Total interest", M(plan.totalInterest)],
          ["Total payable", M(plan.totalPaid)],
          ["Debt-free by", payoff.toLocaleDateString(undefined, { month: "short", year: "numeric" })]
        ]);
        out += '<div class="split">' +
          '<div class="split__chart"><div data-donut></div>' +
            legend([["var(--accent)", "Principal", M(plan.principal)], ["var(--accent-2)", r.rateWord === "profit" ? "Profit" : "Interest", M(plan.totalInterest)]]) +
          "</div>" +
          '<div class="split__bars"><h4>Where each year\'s money goes</h4><div data-bars></div></div>' +
          "</div>";

        if (saved > 1 || monthsCut > 0) {
          out += '<div class="savebox" data-reveal><b>Prepaying works.</b> You save <b class="hi">' + M(saved) +
            "</b> in " + (r.rateWord === "profit" ? "profit" : "interest") +
            (monthsCut > 0 ? " and clear the loan <b class=\"hi\">" + monthsCut + " month" + (monthsCut === 1 ? "" : "s") + "</b> early" : "") +
            ".</div>";
        }

        // GA:AD:OFF out += '<div class="ad" data-slot="results-native"></div>';
        out += bankCompare(r, state.product, state.amount, Math.round(state.years * 12), cur);
        out += scheduleTable(plan, cur, r);

      } else if (state.calc === "fd" || state.calc === "simple") {
        var comp = calc.deposit(state.amount, state.rate, state.years, state.freq);
        var simp = calc.simple(state.amount, state.rate, state.years);
        var show = state.calc === "fd" ? comp : comp;
        out += hero("Maturity value", show.maturity, cur, "fdHero");
        out += statRow([
          ["Invested", M(show.invested)],
          [cap(r.rateWord) + " earned", M(show.interest)],
          ["Effective growth", ((show.maturity / show.invested - 1) * 100).toFixed(1) + "%"],
          ["Matures", new Date(Date.now() + state.years * 31557600000).toLocaleDateString(undefined, { month: "short", year: "numeric" })]
        ]);
        var yrs = [];
        for (var y = 1; y <= Math.min(30, Math.round(state.years)); y++) {
          var v = calc.deposit(state.amount, state.rate, y, state.freq);
          yrs.push({ year: y, principal: state.amount, interest: v.interest });
        }
        out += '<div class="split">' +
          '<div class="split__chart"><div data-donut></div>' +
            legend([["var(--accent)", "Invested", M(show.invested)], ["var(--accent-2)", cap(r.rateWord), M(show.interest)]]) +
          "</div>" +
          '<div class="split__bars"><h4>Balance year by year</h4><div data-bars></div></div>' +
          "</div>";
        out += '<div class="savebox"><b>Compounding premium.</b> At simple ' + r.rateWord + " you would finish with <b>" + M(simp.maturity) +
          "</b>. Compounding " + freqWord(state.freq) + " adds <b class=\"hi\">" + M(comp.maturity - simp.maturity) + "</b>.</div>";
        // GA:AD:OFF out += '<div class="ad" data-slot="results-native"></div>';
        out += depositCompare(r, state.years >= 5 ? "deposit5y" : "deposit1y", state.amount, state.years, state.freq, cur);
        window._giYears = yrs;

      } else if (state.calc === "rd" || state.calc === "sip") {
        var res = state.calc === "rd"
          ? calc.recurring(state.amount, state.rate, state.years, state.freq)
          : calc.sip(state.amount, state.rate, state.years, state.stepUp);
        out += hero(state.calc === "rd" ? "Maturity value" : "Projected corpus", res.maturity, cur, "rdHero");
        out += statRow([
          ["Total invested", M(res.invested)],
          [state.calc === "rd" ? cap(r.rateWord) + " earned" : "Estimated gains", M(res.interest)],
          ["Multiple", (res.maturity / res.invested).toFixed(2) + "×"],
          state.calc === "sip" && state.stepUp
            ? ["Final monthly", M(res.finalMonthly)]
            : ["Instalments", Math.round(state.years * 12)]
        ]);
        out += '<div class="split">' +
          '<div class="split__chart"><div data-donut></div>' +
            legend([["var(--accent)", "Invested", M(res.invested)], ["var(--accent-2)", state.calc === "rd" ? cap(r.rateWord) : "Gains", M(res.interest)]]) +
          "</div>" +
          '<div class="split__bars"><h4>How the pot builds</h4><div data-bars></div></div>' +
          "</div>";
        if (state.calc === "sip") {
          out += '<div class="savebox"><b>This is a projection, not a promise.</b> Market returns are not fixed — a ' +
            state.rate.toFixed(1) + "% average is an assumption you are choosing, and real returns will vary year to year.</div>";
        }
        // GA:AD:OFF out += '<div class="ad" data-slot="results-native"></div>';
        window._giSeries = res.series.map(function (s) {
          return { year: Math.round(s.month / 12), principal: s.invested, interest: s.value - s.invested };
        });
      }

      outHost.innerHTML = out;

      /* charts */
      var dn = $("[data-donut]", outHost);
      var bs = $("[data-bars]", outHost);
      var fmtNames = ["Principal", "Interest"];
      if (state.calc === "emi") {
        var p2 = calc.schedule(state.amount, state.rate, Math.round(state.years * 12), state.extra, state.lump, state.lumpAt);
        if (dn) donut(dn, p2.principal, p2.totalInterest, "Principal", r.rateWord === "profit" ? "Profit" : "Interest");
        if (bs) bars(bs, p2.years, { f: function (n) { return GA.money(n, cur); }, names: ["Principal", cap(r.rateWord)] },
          ["principal", "interest"], ["var(--accent)", "var(--accent-2)"], "Year");
      } else if (state.calc === "fd" || state.calc === "simple") {
        var c2 = calc.deposit(state.amount, state.rate, state.years, state.freq);
        if (dn) donut(dn, c2.invested, c2.interest, "Invested", cap(r.rateWord));
        if (bs) bars(bs, window._giYears || [], { f: function (n) { return GA.money(n, cur); }, names: ["Invested", cap(r.rateWord)] },
          ["principal", "interest"], ["var(--accent)", "var(--accent-2)"], "Year");
      } else {
        var res2 = state.calc === "rd"
          ? calc.recurring(state.amount, state.rate, state.years, state.freq)
          : calc.sip(state.amount, state.rate, state.years, state.stepUp);
        if (dn) donut(dn, res2.invested, res2.interest, "Invested", state.calc === "rd" ? cap(r.rateWord) : "Gains");
        if (bs) bars(bs, window._giSeries || [], { f: function (n) { return GA.money(n, cur); }, names: ["Invested", state.calc === "rd" ? cap(r.rateWord) : "Gains"] },
          ["principal", "interest"], ["var(--accent)", "var(--accent-2)"], "Year");
      }

      wireOutput();
      if (window.GAds) GAds.refresh(outHost);
      $$("[data-reveal]", outHost).forEach(function (e2) { e2.classList.add("in"); });

      GA.writeParams({
        calc: state.calc, region: state.region,
        product: state.calc === "emi" ? state.product : "",
        amount: Math.round(state.amount), rate: state.rate, years: state.years,
        extra: state.extra || "", lump: state.lump || "", lumpAt: state.lump ? state.lumpAt : "",
        stepUp: state.stepUp || ""
      });
    }

    function wireOutput() {
      var t = $("[data-toggle-table]", outHost);
      if (t) t.addEventListener("click", function () {
        var box = $("[data-table]", outHost);
        var open = box.hasAttribute("hidden");
        if (open) box.removeAttribute("hidden"); else box.setAttribute("hidden", "");
        t.textContent = open ? "Hide the full schedule" : "Show the full repayment schedule";
        t.setAttribute("aria-expanded", String(open));
      });
      var share = $("[data-share]", outHost);
      if (share) share.addEventListener("click", function () { GA.copy(location.href, "Link copied — it reopens with these exact numbers"); });
      $$("th.sortable", outHost).forEach(function (th) {
        th.addEventListener("click", function () { sortTable(th); });
      });
    }

    /* ---------- result sub-blocks ---------- */
    function hero(label, value, cur, id) {
      return '<div class="hero-out"><span class="hero-out__lbl">' + label + "</span>" +
        '<strong class="hero-out__val" data-hero>' + GA.money(value, cur) + "</strong>" +
        '<button class="btn btn--ghost btn--sm" type="button" data-share>' +
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/></svg>' +
        "Copy link</button></div>";
    }
    function statRow(items) {
      return '<div class="stats">' + items.map(function (it) {
        return '<div class="stat"><span>' + it[0] + "</span><b>" + it[1] + "</b></div>";
      }).join("") + "</div>";
    }
    function legend(items) {
      return '<ul class="legend">' + items.map(function (i) {
        return '<li><i style="background:' + i[0] + '"></i><span>' + i[1] + "</span><b>" + i[2] + "</b></li>";
      }).join("") + "</ul>";
    }
    function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
    function freqWord(f) { return { 1: "annually", 2: "half-yearly", 4: "quarterly", 12: "monthly" }[f] || "quarterly"; }

    function bankCompare(r, product, amount, months, cur) {
      var list = r.banks.filter(function (b) { return b.rates[product] != null; })
        .map(function (b) {
          var e = calc.emi(amount, b.rates[product], months);
          return { b: b, rate: b.rates[product], emi: e, total: e * months, interest: e * months - amount };
        })
        .sort(function (a, b) { return a.emi - b.emi; });
      if (!list.length) return "";
      var best = list[0];
      return '<section class="cmp"><div class="cmp__head"><h3>Your ' + r.labels[product].toLowerCase() +
        " at every lender in " + r.name + "</h3>" +
        "<p>" + GA.money(amount, cur) + " over " + Math.round(months / 12) + " years. Cheapest first — the spread between top and bottom is <b>" +
        GA.money(list[list.length - 1].total - best.total, cur) + "</b> over the full term.</p></div>" +
        '<div class="table-scroll"><table class="tbl" data-sortable><thead><tr>' +
        "<th>Lender</th><th class=\"sortable\" data-key=\"rate\">Rate</th><th class=\"sortable\" data-key=\"emi\">Monthly</th>" +
        "<th class=\"sortable\" data-key=\"interest\">Total " + r.rateWord + "</th><th class=\"sortable\" data-key=\"total\">Total paid</th></tr></thead><tbody>" +
        list.map(function (x, i) {
          return '<tr data-rate="' + x.rate + '" data-emi="' + x.emi + '" data-interest="' + x.interest + '" data-total="' + x.total + '">' +
            "<td><span class=\"bank\"><b>" + x.b.name + "</b>" + typeTag(x.b.type) + (i === 0 ? '<span class="tag tag--live">Cheapest</span>' : "") + "</span></td>" +
            '<td class="num">' + x.rate.toFixed(2) + "%</td>" +
            '<td class="num">' + GA.money(x.emi, cur) + "</td>" +
            '<td class="num">' + GA.money(x.interest, cur) + "</td>" +
            '<td class="num">' + GA.money(x.total, cur) + "</td></tr>";
        }).join("") + "</tbody></table></div>" +
        '<p class="disclaim">Indicative starting rates as of ' + DATA.updated +
        ". Your actual offer depends on credit history, income and loan-to-value. Confirm with the lender before you sign.</p></section>";
    }

    function depositCompare(r, key, amount, years, freq, cur) {
      var list = r.banks.filter(function (b) { return b.rates[key] != null; })
        .map(function (b) {
          var v = calc.deposit(amount, b.rates[key], years, freq);
          return { b: b, rate: b.rates[key], maturity: v.maturity, interest: v.interest };
        })
        .sort(function (a, b) { return b.maturity - a.maturity; });
      if (!list.length) return "";
      return '<section class="cmp"><div class="cmp__head"><h3>' + r.labels[key] + " rates across " + r.name + "</h3>" +
        "<p>" + GA.money(amount, cur) + " for " + years + " years, compounded " + freqWord(freq) +
        ". Best return first.</p></div>" +
        '<div class="table-scroll"><table class="tbl" data-sortable><thead><tr><th>Bank</th>' +
        '<th class="sortable" data-key="rate">Rate</th><th class="sortable" data-key="interest">' + cap(r.rateWord) + "</th>" +
        '<th class="sortable" data-key="maturity">Maturity</th></tr></thead><tbody>' +
        list.map(function (x, i) {
          return '<tr data-rate="' + x.rate + '" data-interest="' + x.interest + '" data-maturity="' + x.maturity + '">' +
            "<td><span class=\"bank\"><b>" + x.b.name + "</b>" + typeTag(x.b.type) + (i === 0 ? '<span class="tag tag--live">Best</span>' : "") + "</span></td>" +
            '<td class="num">' + x.rate.toFixed(2) + "%</td>" +
            '<td class="num">' + GA.money(x.interest, cur) + "</td>" +
            '<td class="num">' + GA.money(x.maturity, cur) + "</td></tr>";
        }).join("") + "</tbody></table></div>" +
        '<p class="disclaim">Indicative rates as of ' + DATA.updated + ". Deposit insurance limits and early-withdrawal penalties vary by country and bank.</p></section>";
    }

    function typeTag(t) {
      if (t === "islamic") return '<span class="tag tag--beta" title="Sharia-compliant: a profit rate, not interest">Islamic</span>';
      if (t === "public") return '<span class="tag">Public</span>';
      if (t === "nbfc") return '<span class="tag">NBFC</span>';
      if (t === "online") return '<span class="tag">Online</span>';
      return "";
    }

    function scheduleTable(plan, cur, r) {
      return '<section class="sched"><button class="btn btn--ghost btn--sm" type="button" data-toggle-table aria-expanded="false">' +
        "Show the full repayment schedule</button>" +
        '<div class="table-scroll" data-table hidden><table class="tbl"><thead><tr><th>Year</th><th>Principal</th><th>' +
        cap(r.rateWord) + "</th><th>Paid</th><th>Balance</th></tr></thead><tbody>" +
        plan.years.map(function (y) {
          return "<tr><td>Year " + y.year + '</td><td class="num">' + GA.money(y.principal, cur) +
            '</td><td class="num">' + GA.money(y.interest, cur) +
            '</td><td class="num">' + GA.money(y.principal + y.interest, cur) +
            '</td><td class="num">' + GA.money(y.balance, cur) + "</td></tr>";
        }).join("") + "</tbody></table></div></section>";
    }

    function sortTable(th) {
      var table = th.closest("table"), key = th.dataset.key;
      var dir = th.dataset.dir === "asc" ? "desc" : "asc";
      $$("th.sortable", table).forEach(function (o) { o.removeAttribute("data-dir"); });
      th.dataset.dir = dir;
      var body = $("tbody", table);
      var rows = $$("tr", body).sort(function (a, b) {
        var d = parseFloat(a.dataset[key]) - parseFloat(b.dataset[key]);
        return dir === "asc" ? d : -d;
      });
      rows.forEach(function (rr) { body.appendChild(rr); });
    }

    buildInputs();
    if (seg) seg.select(state.calc, true);
    run();
  }

  /* ------------------------- shell markup ------------------------- */
  function shell(only, state) {
    var regions = Object.keys(DATA.regions);
    var groups = {};
    regions.forEach(function (k) {
      var g = DATA.regions[k].group;
      (groups[g] = groups[g] || []).push(k);
    });
    var opts = Object.keys(groups).map(function (g) {
      return '<optgroup label="' + g + '">' + groups[g].map(function (k) {
        var r = DATA.regions[k];
        return '<option value="' + k + '">' + r.flag + "  " + r.name + " (" + r.currency + ")</option>";
      }).join("") + "</optgroup>";
    }).join("");

    var tabs = only.length > 1
      ? '<div class="seg" data-calc-tabs role="tablist" aria-label="Calculator"><span class="seg__ind"></span>' +
        only.map(function (k) {
          return '<button class="seg__btn" type="button" role="tab" data-value="' + k + '" aria-selected="' +
            (k === state.calc) + '">' + CALCS[k].title + "</button>";
        }).join("") + "</div>"
      : "";

    return '<div class="calc">' +
      '<div class="calc__bar">' + tabs +
        '<label class="calc__region"><span class="sr-only">Country</span>' +
        '<select class="select" data-region>' + opts + "</select></label>" +
      "</div>" +
      '<div class="calc__grid">' +
        '<form class="panel panel--pad calc__inputs" data-inputs onsubmit="return false"></form>' +
        '<div class="calc__output" data-output></div>' +
      "</div></div>";
  }

  window.GI = { calc: calc, mount: mount, data: DATA };
  document.addEventListener("DOMContentLoaded", function () {
    $$("[data-calc-app]").forEach(mount);
  });
})();
