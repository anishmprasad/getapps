/* =====================================================================
   GetPDF — drop, unlock, download. All of it in the browser.
   ===================================================================== */
(function () {
  "use strict";
  var $ = GA.$, $$ = GA.$$;

  var MAX_BYTES = 100 * 1024 * 1024;   // qpdf runs in wasm memory; be honest about the ceiling
  var seq = 0;
  var files = [];
  var worker = null;
  var pending = {};
  var sharedPassword = "";

  function getWorker() {
    if (worker) return worker;
    worker = new Worker("/assets/js/qpdf-worker.js");
    worker.onmessage = function (e) {
      var msg = e.data || {};
      var fn = pending[msg.id];
      if (fn) { delete pending[msg.id]; fn(msg); }
    };
    worker.onerror = function (err) {
      Object.keys(pending).forEach(function (k) {
        pending[k]({ status: "damaged", reason: "The PDF engine could not start: " + (err.message || "unknown error") });
        delete pending[k];
      });
    };
    return worker;
  }

  function process(bytes, password) {
    return new Promise(function (resolve) {
      var id = "j" + (++seq);
      pending[id] = resolve;
      getWorker().postMessage({ id: id, bytes: bytes, password: password || "" }, [bytes.buffer]);
    });
  }

  /* ------------------------------ model ------------------------------ */
  function addFiles(list) {
    var added = 0;
    Array.prototype.forEach.call(list, function (f) {
      if (!/\.pdf$/i.test(f.name) && f.type !== "application/pdf") {
        GA.toast('"' + f.name + '" is not a PDF — skipped', "warn");
        return;
      }
      if (f.size > MAX_BYTES) {
        GA.toast('"' + f.name + '" is over ' + GA.bytes(MAX_BYTES) + " — too large for the in-browser engine", "err");
        return;
      }
      if (files.some(function (x) { return x.name === f.name && x.size === f.size; })) return;
      files.push({
        uid: "f" + (++seq), file: f, name: f.name, size: f.size,
        state: "queued", password: "", result: null, reason: "", restrictionsOnly: false
      });
      added++;
    });
    if (added) { render(); files.filter(function (f) { return f.state === "queued"; }).forEach(analyse); }
  }

  function analyse(item) {
    item.state = "working"; item.step = "Reading the file"; render();
    item.file.arrayBuffer().then(function (buf) {
      item.step = "Checking encryption";
      render();
      var pw = item.password || sharedPassword;
      return process(new Uint8Array(buf), pw).then(function (res) { apply(item, res, !!pw); });
    }).catch(function (e) {
      item.state = "error"; item.reason = "Could not read the file: " + e.message; render();
    });
  }

  function apply(item, res, hadPassword) {
    if (res.status === "unlocked") {
      item.state = "done";
      item.restrictionsOnly = !!res.restrictionsOnly;
      item.result = new Blob([res.bytes], { type: "application/pdf" });
      item.outSize = res.bytes.length;
      GA.toast(item.name + " unlocked");
    } else if (res.status === "not-encrypted") {
      item.state = "clean";
      item.result = new Blob([res.bytes], { type: "application/pdf" });
      item.outSize = res.bytes.length;
    } else if (res.status === "needs-password") {
      item.state = "locked";
      item.reason = hadPassword ? "" : "";
    } else if (res.status === "bad-password") {
      item.state = "locked";
      item.reason = "That password was rejected. Check for stray spaces, capitals or a different keyboard layout.";
      if (sharedPassword && !item.password) sharedPassword = "";
    } else {
      item.state = "error";
      item.reason = res.reason || "qpdf could not process this file.";
    }
    item.step = "";
    render();
    updateBulk();
  }

  function unlockWith(item, pw) {
    if (!pw) { GA.toast("Enter the password first", "warn"); return; }
    item.password = pw;
    item.reason = "";
    analyse(item);
  }

  function download(item) {
    if (!item.result) return;
    var url = URL.createObjectURL(item.result);
    var a = document.createElement("a");
    a.href = url;
    a.download = item.name.replace(/\.pdf$/i, "") + "-unlocked.pdf";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }

  function remove(uid) {
    files = files.filter(function (f) { return f.uid !== uid; });
    render(); updateBulk();
  }

  /* ------------------------------ view ------------------------------ */
  var listHost, bulkHost, dropzone, statHost;

  var ICON = {
    lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="10" width="16" height="11" rx="2.5"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>',
    open: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="10" width="16" height="11" rx="2.5"/><path d="M8 10V7a4 4 0 0 1 7.4-2"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12.5l5.2 5.2L20 7"/></svg>',
    warn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M12 8v5"/><circle cx="12" cy="16.6" r="1.1" fill="currentColor" stroke="none"/><path d="M10.3 3.9 2.7 17.2A2 2 0 0 0 4.4 20.2h15.2a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/></svg>',
    down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v13"/><path d="M7 11l5 5 5-5"/><path d="M4 20h16"/></svg>'
  };

  function card(item) {
    var badge, body = "", cls = "fcard fcard--" + item.state;

    if (item.state === "working") {
      badge = '<span class="fcard__spin" aria-hidden="true"></span>';
      body = '<p class="fcard__note">' + (item.step || "Working") + "…</p>";
    } else if (item.state === "locked") {
      badge = '<span class="fcard__icon fcard__icon--warn">' + ICON.lock + "</span>";
      body =
        '<form class="pwform" data-uid="' + item.uid + '">' +
          '<div class="pwform__row">' +
            '<div class="pwfield">' +
              '<input class="input" type="password" name="pw" placeholder="Document open password" autocomplete="off" spellcheck="false" aria-label="Password for ' + esc(item.name) + '">' +
              '<button class="pwfield__eye" type="button" data-eye aria-label="Show password">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M2 12s3.8-6.5 10-6.5S22 12 22 12s-3.8 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="2.8"/></svg>' +
              "</button>" +
            "</div>" +
            '<button class="btn btn--accent" type="submit">Unlock</button>' +
          "</div>" +
          '<label class="switch pwform__all"><input type="checkbox" name="all"><span class="switch__track"></span>' +
            "<span>Try this password on every locked file</span></label>" +
        "</form>" +
        (item.reason ? '<p class="fcard__note fcard__note--bad">' + esc(item.reason) + "</p>" : "");
    } else if (item.state === "done") {
      badge = '<span class="fcard__icon fcard__icon--ok">' + ICON.check + "</span>";
      body = '<p class="fcard__note">' +
        (item.restrictionsOnly
          ? "This file had no open password, only owner restrictions on printing or copying. Those are gone."
          : "Password removed. The unlocked copy is ready — " + GA.bytes(item.outSize) + ".") + "</p>";
    } else if (item.state === "clean") {
      badge = '<span class="fcard__icon fcard__icon--ok">' + ICON.open + "</span>";
      body = '<p class="fcard__note">This PDF was not protected in the first place. Nothing to remove — the copy below is a clean rewrite if you want it.</p>';
    } else if (item.state === "error") {
      badge = '<span class="fcard__icon fcard__icon--bad">' + ICON.warn + "</span>";
      body = '<p class="fcard__note fcard__note--bad">' + esc(item.reason) + "</p>";
    } else {
      badge = '<span class="fcard__spin" aria-hidden="true"></span>';
    }

    var actions = "";
    if (item.state === "done" || item.state === "clean") {
      actions = '<button class="btn btn--accent btn--sm" type="button" data-dl="' + item.uid + '">' + ICON.down + "Download</button>";
    }

    return '<li class="' + cls + '" data-uid="' + item.uid + '">' +
      '<div class="fcard__head">' + badge +
        '<div class="fcard__meta"><b title="' + esc(item.name) + '">' + esc(item.name) + "</b>" +
          "<span>" + GA.bytes(item.size) + "</span></div>" +
        '<div class="fcard__actions">' + actions +
          '<button class="icon-btn" type="button" data-rm="' + item.uid + '" aria-label="Remove ' + esc(item.name) + '">' +
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>' +
          "</button>" +
        "</div>" +
      "</div>" + (body ? '<div class="fcard__body">' + body + "</div>" : "") +
    "</li>";
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function render() {
    if (!listHost) return;
    listHost.innerHTML = files.map(card).join("");
    listHost.hidden = !files.length;

    $$("[data-rm]", listHost).forEach(function (b) {
      b.addEventListener("click", function () { remove(b.dataset.rm); });
    });
    $$("[data-dl]", listHost).forEach(function (b) {
      b.addEventListener("click", function () {
        download(files.filter(function (f) { return f.uid === b.dataset.dl; })[0]);
      });
    });
    $$(".pwform", listHost).forEach(function (form) {
      var item = files.filter(function (f) { return f.uid === form.dataset.uid; })[0];
      var input = $("input[name=pw]", form);
      $("[data-eye]", form).addEventListener("click", function () {
        var show = input.type === "password";
        input.type = show ? "text" : "password";
        this.setAttribute("aria-label", show ? "Hide password" : "Show password");
        this.classList.toggle("on", show);
      });
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var pw = input.value;
        if ($("input[name=all]", form).checked) sharedPassword = pw;
        unlockWith(item, pw);
      });
    });

    var first = $(".fcard--locked input[name=pw]", listHost);
    if (first && !first.dataset.focused) { first.dataset.focused = "1"; first.focus(); }
    updateStats();
  }

  function updateStats() {
    if (!statHost) return;
    var done = files.filter(function (f) { return f.state === "done"; }).length;
    var locked = files.filter(function (f) { return f.state === "locked"; }).length;
    statHost.hidden = !files.length;
    statHost.innerHTML =
      '<span class="chip"><b>' + files.length + "</b> in queue</span>" +
      '<span class="chip"><b>' + done + "</b> unlocked</span>" +
      (locked ? '<span class="chip"><b>' + locked + "</b> awaiting password</span>" : "") +
      '<span class="chip"><b>0 bytes</b> uploaded</span>';
  }

  function updateBulk() {
    if (!bulkHost) return;
    var ready = files.filter(function (f) { return f.result; });
    bulkHost.hidden = ready.length < 2;
    var btn = $("[data-dl-all]", bulkHost);
    if (btn) btn.textContent = "Download all " + ready.length + " files";
  }

  /* ------------------------------ mount ------------------------------ */
  document.addEventListener("DOMContentLoaded", function () {
    var app = $("[data-pdf-app]");
    if (!app) return;

    app.innerHTML =
      '<div class="drop" data-drop tabindex="0" role="button" aria-label="Choose PDF files to unlock">' +
        '<input type="file" accept="application/pdf,.pdf" multiple hidden data-file>' +
        '<div class="drop__art" aria-hidden="true">' +
          '<span class="drop__sheet drop__sheet--3"></span>' +
          '<span class="drop__sheet drop__sheet--2"></span>' +
          '<span class="drop__sheet drop__sheet--1">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' +
              '<rect x="5" y="10.5" width="14" height="9.5" rx="2.4"/><path d="M8.6 10.5V7.6a3.4 3.4 0 0 1 6.8 0v2.9"/></svg>' +
          "</span>" +
        "</div>" +
        '<h3>Drop a locked PDF here</h3>' +
        '<p>or <b>browse your files</b> — several at once is fine. Nothing is uploaded: the file is opened by WebAssembly running inside this tab.</p>' +
        '<span class="drop__hint">PDF · up to ' + GA.bytes(MAX_BYTES) + " each</span>" +
      "</div>" +
      '<div class="qstats" data-stats hidden></div>' +
      '<ul class="flist" data-list hidden></ul>' +
      '<div class="bulk" data-bulk hidden>' +
        '<button class="btn" type="button" data-dl-all>Download all</button>' +
        '<button class="btn btn--ghost" type="button" data-clear>Clear the queue</button>' +
      "</div>";

    dropzone = $("[data-drop]", app);
    listHost = $("[data-list]", app);
    bulkHost = $("[data-bulk]", app);
    statHost = $("[data-stats]", app);
    var fileInput = $("[data-file]", app);

    dropzone.addEventListener("click", function () { fileInput.click(); });
    dropzone.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileInput.click(); }
    });
    fileInput.addEventListener("change", function () { addFiles(fileInput.files); fileInput.value = ""; });

    var depth = 0;
    ["dragenter", "dragover"].forEach(function (ev) {
      window.addEventListener(ev, function (e) {
        e.preventDefault();
        if (ev === "dragenter") depth++;
        dropzone.classList.add("over");
      });
    });
    ["dragleave", "drop"].forEach(function (ev) {
      window.addEventListener(ev, function (e) {
        e.preventDefault();
        if (ev === "dragleave") { depth--; if (depth > 0) return; }
        depth = 0;
        dropzone.classList.remove("over");
        if (ev === "drop" && e.dataTransfer) addFiles(e.dataTransfer.files);
      });
    });

    $("[data-dl-all]", app).addEventListener("click", function () {
      var ready = files.filter(function (f) { return f.result; });
      ready.forEach(function (f, i) { setTimeout(function () { download(f); }, i * 350); });
      GA.toast("Downloading " + ready.length + " files");
    });
    $("[data-clear]", app).addEventListener("click", function () {
      files = []; sharedPassword = ""; render(); updateBulk();
      GA.toast("Queue cleared");
    });

    /* Warm the wasm up in the background so the first unlock feels instant. */
    if ("requestIdleCallback" in window) requestIdleCallback(function () { getWorker(); });
    else setTimeout(getWorker, 1200);
  });
})();
