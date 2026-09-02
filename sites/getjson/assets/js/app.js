/* =====================================================================
   GetJSON — editor, validation, live tree preview, publish
   ===================================================================== */
(function () {
  "use strict";
  var $ = GA.$, $$ = GA.$$;

  var SAMPLE = {
    product: "GetJSON",
    tagline: "A JSON endpoint in about four seconds",
    features: ["no signup", "no server", "no config"],
    limits: { maxSizeKb: 256, anonymousDays: 3, signedInDays: 6 },
    pricing: { amount: 0, currency: "USD" },
    updatedAt: new Date().toISOString()
  };

  var editor, out, tree, statusEl, ttlSel, nameInput, publishBtn, ttlNote;
  var signedIn = false;
  var currentUser = null;
  var lastResult = null;
  var tickTimer = null;

  /* --------------------------- validation --------------------------- */
  function validate(text) {
    if (!text.trim()) return { ok: false, empty: true, message: "Nothing to publish yet." };
    try {
      return { ok: true, value: JSON.parse(text) };
    } catch (e) {
      var m = /position (\d+)/i.exec(e.message);
      var where = "";
      if (m) {
        var pos = +m[1];
        var upto = text.slice(0, pos);
        var line = upto.split("\n").length;
        var col = pos - upto.lastIndexOf("\n");
        where = " · line " + line + ", column " + col;
      }
      return { ok: false, message: e.message.replace(/^JSON\.parse: /, "").replace(/ in JSON at position \d+.*$/, "") + where };
    }
  }

  function describe(v) {
    if (v === null) return "null";
    if (Array.isArray(v)) return "array of " + v.length;
    return typeof v;
  }

  /* ------------------------- tree preview --------------------------- */
  function node(key, value, depth) {
    var t = value === null ? "null" : Array.isArray(value) ? "array" : typeof value;
    var keyHtml = key === null ? "" : '<span class="jk">' + esc(key) + '</span><span class="jc">:</span> ';

    if (t === "object" || t === "array") {
      var entries = t === "array"
        ? value.map(function (v, i) { return [String(i), v]; })
        : Object.keys(value).map(function (k) { return [k, value[k]]; });
      var open = t === "array" ? "[" : "{", close = t === "array" ? "]" : "}";
      if (!entries.length) return '<div class="jrow">' + keyHtml + '<span class="jb">' + open + close + "</span></div>";
      return '<details class="jnode"' + (depth < 2 ? " open" : "") + ">" +
        "<summary>" + keyHtml + '<span class="jb">' + open + "</span>" +
          '<span class="jcount">' + entries.length + (t === "array" ? " items" : " keys") + "</span>" +
          '<span class="jb">' + close + "</span></summary>" +
        '<div class="jkids">' + entries.map(function (e) { return node(e[0], e[1], depth + 1); }).join("") + "</div>" +
        "</details>";
    }
    var cls = t === "string" ? "js" : t === "number" ? "jn" : t === "boolean" ? "jbo" : "jnu";
    var disp = t === "string" ? '"' + esc(value) + '"' : String(value);
    return '<div class="jrow">' + keyHtml + '<span class="' + cls + '">' + disp + "</span></div>";
  }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  /* ---------------------------- refresh ----------------------------- */
  var refresh = GA.debounce(function () {
    var text = editor.value;
    var res = validate(text);
    var bytes = new Blob([text]).size;
    var overLimit = bytes > GJ.api.maxBytes;

    statusEl.className = "vstat " + (res.ok && !overLimit ? "vstat--ok" : res.empty ? "" : "vstat--bad");
    statusEl.innerHTML = res.ok
      ? (overLimit
          ? '<b>Too large</b> — ' + GA.bytes(bytes) + " exceeds the " + GA.bytes(GJ.api.maxBytes) + " limit"
          : '<b>Valid JSON</b> · ' + describe(res.value) + " · " + GA.bytes(bytes))
      : "<b>" + (res.empty ? "Empty" : "Invalid") + "</b> — " + esc(res.message);

    publishBtn.disabled = !res.ok || overLimit;

    if (res.ok) {
      tree.innerHTML = node(null, res.value, 0);
      tree.classList.remove("is-stale");
    } else {
      tree.classList.add("is-stale");
    }
  }, 180);

  /* ---------------------------- actions ----------------------------- */
  function format(spaces) {
    var res = validate(editor.value);
    if (!res.ok) { GA.toast("Fix the JSON first — " + res.message, "err"); return; }
    editor.value = JSON.stringify(res.value, null, spaces);
    refresh();
    GA.toast(spaces ? "Formatted" : "Minified");
  }

  async function publish() {
    var res = validate(editor.value);
    if (!res.ok) return;
    publishBtn.disabled = true;
    publishBtn.textContent = "Publishing…";
    try {
      var rec = await GJ.api.create(res.value, +ttlSel.value, nameInput.value.trim());
      lastResult = rec;
      showResult(rec, res.value);
      GA.toast("Endpoint is live");
    } catch (e) {
      GA.toast(e.message, "err", 6000);
    } finally {
      publishBtn.disabled = false;
      publishBtn.textContent = "Publish endpoint";
    }
  }

  function snippets(url) {
    return {
      curl: "curl -s " + url,
      fetch: "const res = await fetch(\n  \"" + url + "\"\n);\nconst data = await res.json();\nconsole.log(data);",
      python: "import requests\n\ndata = requests.get(\n    \"" + url + "\"\n).json()\nprint(data)"
    };
  }

  function showResult(rec, value) {
    var url = rec.url || GJ.api.urlFor(rec.id);
    var snips = snippets(url);
    out.hidden = false;
    out.innerHTML =
      '<div class="result">' +
        '<div class="result__top">' +
          '<span class="tag tag--live">Live</span>' +
          '<span class="result__ttl" data-countdown="' + rec.expiresAt + '"></span>' +
        "</div>" +
        '<label class="result__urllbl">Your endpoint</label>' +
        '<div class="urlbox"><code data-url>' + esc(url) + "</code>" +
          '<button class="btn btn--accent btn--sm" type="button" data-copy-url>Copy</button></div>' +
        '<div class="result__acts">' +
          '<button class="btn btn--ghost btn--sm" type="button" data-tryit>Fetch it now</button>' +
          '<a class="btn btn--ghost btn--sm" href="' + esc(url) + '" target="_blank" rel="noopener">Open in a tab</a>' +
          '<button class="btn btn--ghost btn--sm" type="button" data-delete>Delete</button>' +
        "</div>" +
        '<div class="tryout" data-tryout hidden></div>' +
        '<div class="snips">' +
          '<div class="seg" data-snip-tabs role="tablist"><span class="seg__ind"></span>' +
            '<button class="seg__btn" type="button" role="tab" data-value="curl" aria-selected="true">curl</button>' +
            '<button class="seg__btn" type="button" role="tab" data-value="fetch" aria-selected="false">JavaScript</button>' +
            '<button class="seg__btn" type="button" role="tab" data-value="python" aria-selected="false">Python</button>' +
          "</div>" +
          '<pre class="snip"><code data-snip>' + esc(snips.curl) + "</code>" +
            '<button class="snip__copy" type="button" data-copy-snip aria-label="Copy snippet">Copy</button></pre>' +
        "</div>" +
        (rec.editToken ? '<details class="token"><summary>Edit token — save this to change or delete the endpoint later</summary>' +
          '<div class="urlbox"><code>' + esc(rec.editToken) + "</code>" +
          '<button class="btn btn--ghost btn--sm" type="button" data-copy-token>Copy</button></div>' +
          "<p>It is shown once. Send it as an <code>X-Edit-Token</code> header on a PUT or DELETE. " +
          (signedIn ? "You are signed in, so you can also manage this endpoint from your dashboard without the token."
                    : "Sign in before publishing and the endpoint is tied to your account instead — no token to keep.") +
          "</p></details>" : "") +
        (rec.demo ? '<p class="demo-note"><b>Demo mode.</b> This deployment has no Supabase project connected yet, so the endpoint lives in this browser only and the URL above will not resolve for anyone else. Everything else — validation, expiry, snippets — behaves exactly as it will once the backend is configured.</p>' : "") +
      "</div>";

    var snipCode = $("[data-snip]", out);
    GA.initSeg($("[data-snip-tabs]", out), function (v) { snipCode.textContent = snips[v]; });

    $("[data-copy-url]", out).addEventListener("click", function () { GA.copy(url, "Endpoint URL copied"); });
    $("[data-copy-snip]", out).addEventListener("click", function () { GA.copy(snipCode.textContent, "Snippet copied"); });
    var tk = $("[data-copy-token]", out);
    if (tk) tk.addEventListener("click", function () { GA.copy(rec.editToken, "Edit token copied — store it somewhere safe"); });

    $("[data-tryit]", out).addEventListener("click", function () { tryIt(rec, this); });
    $("[data-delete]", out).addEventListener("click", async function () {
      this.disabled = true;
      try {
        await GJ.api.remove(rec.id, rec.editToken);
        out.hidden = true;
        GA.toast("Endpoint deleted");
      } catch (e) { GA.toast(e.message, "err"); this.disabled = false; }
    });

    startCountdowns(out);
    if (window.GAds) GAds.refresh(out);
    out.scrollIntoView({ behavior: GA.reduced ? "auto" : "smooth", block: "nearest" });
  }

  async function tryIt(rec, btn) {
    var box = $("[data-tryout]", out);
    box.hidden = false;
    box.innerHTML = '<div class="tryout__wait"><span class="fcard__spin"></span><span>Requesting…</span></div>';
    btn.disabled = true;
    var t0 = performance.now();
    try {
      var data = await GJ.api.get(rec.id);
      var ms = Math.round(performance.now() - t0);
      box.innerHTML = '<div class="tryout__head"><span class="tag tag--live">200 OK</span>' +
        '<span class="mono">' + ms + " ms · " + GA.bytes(new Blob([JSON.stringify(data)]).size) + "</span></div>" +
        "<pre><code>" + esc(JSON.stringify(data, null, 2)) + "</code></pre>";
    } catch (e) {
      box.innerHTML = '<div class="tryout__head"><span class="tag tag--bad">Failed</span></div>' +
        '<p class="fcard__note fcard__note--bad">' + esc(e.message) + "</p>";
    }
    btn.disabled = false;
  }

  /* --------------------------- countdowns --------------------------- */
  function startCountdowns(root) {
    if (tickTimer) clearInterval(tickTimer);
    function tick() {
      $$("[data-countdown]", root || document).forEach(function (el) {
        var ms = new Date(el.dataset.countdown).getTime() - Date.now();
        if (ms <= 0) { el.textContent = "Expired"; el.classList.add("is-gone"); return; }
        var d = Math.floor(ms / 86400000), h = Math.floor(ms / 3600000) % 24,
            m = Math.floor(ms / 60000) % 60, s = Math.floor(ms / 1000) % 60;
        el.textContent = "Expires in " + (d ? d + "d " : "") + (d || h ? h + "h " : "") + m + "m " + s + "s";
      });
    }
    tick();
    tickTimer = setInterval(tick, 1000);
  }
  window.GJcountdown = startCountdowns;

  /* ----------------------------- mount ------------------------------ */
  function updateTtlOptions() {
    var max = GJ.api.maxHours(signedIn);
    var opts = [[1, "1 hour"], [6, "6 hours"], [24, "24 hours"], [72, "3 days"], [144, "6 days"]];
    ttlSel.innerHTML = opts.map(function (o) {
      var over = o[0] > max;
      return '<option value="' + o[0] + '"' + (over ? " disabled" : "") + (o[0] === 24 ? " selected" : "") + ">" +
        o[1] + (over ? " — sign in to unlock" : "") + "</option>";
    }).join("");
    ttlNote.textContent = signedIn
      ? "Signed in: endpoints can live up to 6 days."
      : "Without an account an endpoint lives at most 3 days. Sign in to get 6 and a list of everything you have created.";
  }

  document.addEventListener("DOMContentLoaded", function () {
    var app = $("[data-json-app]");
    if (!app) return;

    app.innerHTML =
      '<div class="ed">' +
        '<div class="ed__main">' +
          '<div class="ed__bar">' +
            '<span class="ed__title">Your JSON</span>' +
            '<div class="ed__tools">' +
              '<button class="btn btn--ghost btn--sm" type="button" data-fmt>Format</button>' +
              '<button class="btn btn--ghost btn--sm" type="button" data-min>Minify</button>' +
              '<button class="btn btn--ghost btn--sm" type="button" data-sample>Load a sample</button>' +
            "</div>" +
          "</div>" +
          '<textarea class="textarea ed__area" data-editor spellcheck="false" autocomplete="off" ' +
            'aria-label="JSON document" placeholder=\'{ "hello": "world" }\'></textarea>' +
          '<div class="vstat" data-status></div>' +
        "</div>" +
        '<aside class="ed__side">' +
          '<div class="ed__bar"><span class="ed__title">Preview</span></div>' +
          '<div class="jtree" data-tree></div>' +
        "</aside>" +
      "</div>" +

      '<div class="pubbar">' +
        '<label class="field" style="margin:0;flex:1;min-width:190px">' +
          '<div class="field__label"><span>Label (optional)</span></div>' +
          '<input class="input" type="text" data-name maxlength="80" placeholder="staging config" autocomplete="off">' +
        "</label>" +
        '<label class="field" style="margin:0;min-width:190px">' +
          '<div class="field__label"><span>Keep it alive for</span></div>' +
          '<select class="select" data-ttl></select>' +
        "</label>" +
        '<button class="btn btn--accent btn--lg" type="button" data-publish>Publish endpoint</button>' +
      "</div>" +
      '<p class="ttlnote" data-ttlnote></p>' +
      '<div data-out hidden></div>';

    editor = $("[data-editor]", app);
    out = $("[data-out]", app);
    tree = $("[data-tree]", app);
    statusEl = $("[data-status]", app);
    ttlSel = $("[data-ttl]", app);
    ttlNote = $("[data-ttlnote]", app);
    nameInput = $("[data-name]", app);
    publishBtn = $("[data-publish]", app);

    editor.value = JSON.stringify(SAMPLE, null, 2);
    updateTtlOptions();
    refresh();

    editor.addEventListener("input", refresh);
    editor.addEventListener("keydown", function (e) {
      if (e.key === "Tab") {
        e.preventDefault();
        var s = editor.selectionStart, en = editor.selectionEnd;
        editor.value = editor.value.slice(0, s) + "  " + editor.value.slice(en);
        editor.selectionStart = editor.selectionEnd = s + 2;
        refresh();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); publish(); }
    });

    $("[data-fmt]", app).addEventListener("click", function () { format(2); });
    $("[data-min]", app).addEventListener("click", function () { format(0); });
    $("[data-sample]", app).addEventListener("click", function () {
      editor.value = JSON.stringify(SAMPLE, null, 2); refresh(); GA.toast("Sample loaded");
    });
    publishBtn.addEventListener("click", publish);

    /* Auth state drives the TTL ceiling and the sign-in button. */
    GJ.auth.onChange(function (user) {
      currentUser = user;
      signedIn = !!user;
      updateTtlOptions();
      $$("[data-auth-slot]").forEach(function (slot) { renderAuth(slot, user); });
    });

    /* One health check decides whether this is a live backend or demo mode. */
    GJ.api.probe().then(function (status) {
      if (status !== "live") showBanner(app, status);
      $$("[data-auth-slot]").forEach(function (slot) { renderAuth(slot, currentUser); });
    });
  });

  /* ------------------------- backend banner ------------------------- */
  var BANNERS = {
    unconfigured:
      "<b>Demo mode.</b> No Supabase project is connected to this deployment yet, so endpoints are " +
      "stored in this browser only.",
    undeployed:
      "<b>Demo mode.</b> The Supabase project is connected, but the <code>json</code> edge function " +
      "and database schema are not deployed yet, so endpoints are stored in this browser only.",
    unreachable:
      "<b>Demo mode.</b> The backend is not responding right now, so endpoints are being stored in " +
      "this browser only. Published links will not resolve for anyone else until it is back."
  };

  function showBanner(app, status) {
    if ($(".demobanner", app)) return;
    var banner = document.createElement("div");
    banner.className = "demobanner";
    banner.innerHTML = (BANNERS[status] || BANNERS.unconfigured) +
      ' Everything else behaves exactly as it will in production — see <a href="/docs">the API docs</a>.';
    app.insertBefore(banner, app.firstChild);
  }

  /* ------------------------- auth button ---------------------------- */
  function renderAuth(slot, user) {
    if (!GJ.auth.available()) {
      slot.innerHTML = '<span class="chip">Sign-in arrives with the backend</span>';
      return;
    }
    if (user) {
      var label = user.email || "Signed in";
      slot.innerHTML = '<a class="btn btn--ghost btn--sm" href="/dashboard">My endpoints</a>' +
        '<button class="btn btn--ghost btn--sm" type="button" data-signout title="' + esc(label) + '">Sign out</button>';
      $("[data-signout]", slot).addEventListener("click", async function () {
        await GJ.auth.signOut(); GA.toast("Signed out");
      });
    } else {
      /* Google renders its own button: it satisfies Google's branding rules
         and keeps the whole flow in-page, on our origin. */
      slot.innerHTML = '<div class="gbtn" data-gbtn></div>';
      GJ.auth.mountGoogleButton($("[data-gbtn]", slot)).then(function (ok) {
        if (!ok) {
          slot.innerHTML = '<span class="chip">Google sign-in unavailable — a tracking blocker may be ' +
            "blocking accounts.google.com</span>";
        }
      });
    }
  }
  window.GJrenderAuth = renderAuth;
})();
