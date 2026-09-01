/* =====================================================================
   GetInterest — /banks : filterable rate table across every market
   ===================================================================== */
(function () {
  "use strict";
  var $ = GA.$, $$ = GA.$$;
  var DATA = window.GI_DATA;

  document.addEventListener("DOMContentLoaded", function () {
    var host = $("[data-banks-app]");
    if (!host) return;

    var params = GA.readParams();
    var state = {
      region: DATA.regions[params.region] ? params.region : "ALL",
      product: params.product || "home",
      q: params.q || "",
      islamicOnly: params.islamic === "1",
      sortKey: "rate",
      sortDir: "asc"
    };

    var regionKeys = Object.keys(DATA.regions);
    var groups = {};
    regionKeys.forEach(function (k) { (groups[DATA.regions[k].group] = groups[DATA.regions[k].group] || []).push(k); });

    host.innerHTML =
      '<div class="bankbar panel panel--pad">' +
        '<div class="bankbar__row">' +
          '<label class="bankbar__f"><span>Country</span><select class="select" data-f-region>' +
            '<option value="ALL">All markets</option>' +
            '<option value="GCC">All GCC states</option>' +
            Object.keys(groups).map(function (g) {
              return '<optgroup label="' + g + '">' + groups[g].map(function (k) {
                var r = DATA.regions[k];
                return '<option value="' + k + '">' + r.flag + "  " + r.name + "</option>";
              }).join("") + "</optgroup>";
            }).join("") +
          "</select></label>" +
          '<label class="bankbar__f"><span>Product</span><select class="select" data-f-product>' +
            [["home", "Home loan / mortgage"], ["car", "Car / auto"], ["personal", "Personal"],
             ["deposit1y", "Deposit — 1 year"], ["deposit5y", "Deposit — long term"]].map(function (o) {
              return '<option value="' + o[0] + '">' + o[1] + "</option>";
            }).join("") +
          "</select></label>" +
          '<label class="bankbar__f bankbar__f--grow"><span>Search</span>' +
            '<input class="input" type="search" data-f-q placeholder="Bank name…" autocomplete="off"></label>' +
        "</div>" +
        '<div class="bankbar__row bankbar__row--sub">' +
          '<label class="switch"><input type="checkbox" data-f-islamic><span class="switch__track"></span>' +
            "<span>Sharia-compliant lenders only</span></label>" +
          '<span class="bankbar__count" data-count></span>' +
        "</div>" +
      "</div>" +
      '<div class="table-scroll" data-table-host style="margin-top:18px"></div>' +
      '<p class="disclaim">Indicative published rates compiled ' + DATA.updated +
        ". Rates move, and the rate you are offered depends on your credit profile, income, tenure and — in several markets — whether you bank with the lender already. " +
        "Islamic banks are marked: what is shown for them is an annual profit rate under a murabaha or ijara structure, not interest. Always confirm directly with the bank.</p>";

    var fRegion = $("[data-f-region]", host), fProduct = $("[data-f-product]", host),
        fQ = $("[data-f-q]", host), fIslamic = $("[data-f-islamic]", host),
        tableHost = $("[data-table-host]", host), count = $("[data-count]", host);

    fRegion.value = state.region; fProduct.value = state.product;
    fQ.value = state.q; fIslamic.checked = state.islamicOnly;

    fRegion.addEventListener("change", function () { state.region = fRegion.value; render(); });
    fProduct.addEventListener("change", function () { state.product = fProduct.value; render(); });
    fIslamic.addEventListener("change", function () { state.islamicOnly = fIslamic.checked; render(); });
    fQ.addEventListener("input", GA.debounce(function () { state.q = fQ.value.trim(); render(); }, 180));

    function rows() {
      var keys = state.region === "ALL" ? regionKeys
        : state.region === "GCC" ? regionKeys.filter(function (k) { return DATA.regions[k].group === "GCC"; })
        : [state.region];
      var out = [];
      keys.forEach(function (k) {
        var r = DATA.regions[k];
        r.banks.forEach(function (b) {
          var rate = b.rates[state.product];
          if (rate == null) return;
          if (state.islamicOnly && b.type !== "islamic") return;
          if (state.q && (b.name + " " + b.short).toLowerCase().indexOf(state.q.toLowerCase()) < 0) return;
          out.push({ bank: b, region: r, regionKey: k, rate: rate });
        });
      });
      var isDeposit = state.product.indexOf("deposit") === 0;
      out.sort(function (a, b) {
        if (state.sortKey === "name") {
          var d = a.bank.name.localeCompare(b.bank.name);
          return state.sortDir === "asc" ? d : -d;
        }
        var d2 = a.rate - b.rate;
        // Best-first: lowest rate for borrowing, highest for saving
        return state.sortDir === "asc" ? (isDeposit ? -d2 : d2) : (isDeposit ? d2 : -d2);
      });
      return out;
    }

    function render() {
      var list = rows();
      var isDeposit = state.product.indexOf("deposit") === 0;
      count.textContent = list.length + (list.length === 1 ? " lender" : " lenders") +
        (isDeposit ? " · best return first" : " · cheapest first");

      if (!list.length) {
        tableHost.innerHTML = '<div class="empty">No lender matches those filters. Try clearing the search or widening the country.</div>';
      } else {
        var best = list[0].rate, worst = list[list.length - 1].rate;
        tableHost.innerHTML = '<table class="tbl"><thead><tr>' +
          '<th class="sortable" data-key="name">Bank</th><th>Country</th><th>Type</th>' +
          '<th class="sortable" data-key="rate" data-dir="' + state.sortDir + '">' +
            (isDeposit ? "Rate p.a." : "From (p.a.)") + "</th>" +
          "<th>vs best</th></tr></thead><tbody>" +
          list.map(function (x, i) {
            var delta = isDeposit ? best - x.rate : x.rate - best;
            var word = x.bank.type === "islamic" || x.region.rateWord === "profit" ? "profit" : "interest";
            return "<tr>" +
              '<td><span class="bank"><b>' + x.bank.name + "</b>" +
                (i === 0 ? '<span class="tag tag--live">' + (isDeposit ? "Best" : "Cheapest") + "</span>" : "") +
              "</span></td>" +
              "<td>" + x.region.flag + " " + x.region.name + "</td>" +
              "<td>" + typeTag(x.bank.type) + "</td>" +
              '<td class="num"><b>' + x.rate.toFixed(2) + "%</b> <span class=\"unit\">" + word + "</span></td>" +
              '<td class="num">' + (delta < 0.005 ? "—" : "+" + delta.toFixed(2) + " pts") + "</td>" +
            "</tr>";
          }).join("") + "</tbody></table>";

        $$("th.sortable", tableHost).forEach(function (th) {
          th.addEventListener("click", function () {
            if (state.sortKey === th.dataset.key) state.sortDir = state.sortDir === "asc" ? "desc" : "asc";
            else { state.sortKey = th.dataset.key; state.sortDir = "asc"; }
            render();
          });
        });
      }

      GA.writeParams({
        region: state.region === "ALL" ? "" : state.region,
        product: state.product === "home" ? "" : state.product,
        q: state.q, islamic: state.islamicOnly ? "1" : ""
      });
    }

    function typeTag(t) {
      var map = { islamic: ['<span class="tag tag--beta" title="Sharia-compliant profit rate">Islamic</span>'],
                  public: ['<span class="tag">Public</span>'], nbfc: ['<span class="tag">NBFC</span>'],
                  online: ['<span class="tag">Online</span>'], private: ['<span class="tag">Private</span>'] };
      return (map[t] || map.private)[0];
    }

    render();
  });
})();
