/* =====================================================================
   GetPDF — decryption worker
   Runs qpdf (compiled to WebAssembly) off the main thread. Nothing here
   touches the network: the PDF bytes arrive from the page, are written to
   an in-memory filesystem, and the result is posted straight back.

   Message in :  { id, bytes: Uint8Array, password: string }
   Message out:  { id, status, bytes?, reason?, log? }
     status: "unlocked" | "not-encrypted" | "needs-password"
           | "bad-password" | "damaged"
   ===================================================================== */
/* global importScripts, Module */
"use strict";

importScripts("/assets/vendor/qpdf.js");

var WASM = "/assets/vendor/qpdf.wasm";

/* One qpdf run. Emscripten's callMain exits the runtime, so each
   invocation gets a fresh module instance. */
function qpdf(args, input) {
  return new Promise(function (resolve) {
    var log = [];
    var realErr = console.error, realWarn = console.warn;
    Module({ noInitialRun: true, locateFile: function () { return WASM; } })
      .then(function (mod) {
        try { mod.FS.writeFile("/in.pdf", input); } catch (e) {
          return resolve({ code: -1, log: ["cannot stage input: " + e.message] });
        }
        console.error = function () { log.push([].join.call(arguments, " ")); };
        console.warn  = function () { log.push([].join.call(arguments, " ")); };
        var code;
        try { code = mod.callMain(args); }
        catch (e) { code = typeof e === "number" ? e : -1; log.push(String((e && e.message) || e)); }
        console.error = realErr; console.warn = realWarn;

        var out = null;
        try { out = mod.FS.readFile("/out.pdf"); } catch (e) {}
        resolve({ code: code, out: out, log: log });
      })
      .catch(function (e) {
        console.error = realErr; console.warn = realWarn;
        resolve({ code: -1, log: ["qpdf failed to start: " + (e && e.message)] });
      });
  });
}

/* %PDF- may sit after a few junk bytes in the wild, so scan the first KB. */
function looksLikePdf(bytes) {
  var n = Math.min(bytes.length, 1024);
  for (var i = 0; i < n - 4; i++) {
    if (bytes[i] === 0x25 && bytes[i + 1] === 0x50 && bytes[i + 2] === 0x44 &&
        bytes[i + 3] === 0x46 && bytes[i + 4] === 0x2D) return true;
  }
  return false;
}

function hasEncryptDict(bytes) {
  var needle = [0x2F, 0x45, 0x6E, 0x63, 0x72, 0x79, 0x70, 0x74]; // "/Encrypt"
  outer: for (var i = 0; i < bytes.length - 8; i++) {
    for (var j = 0; j < 8; j++) if (bytes[i + j] !== needle[j]) continue outer;
    return true;
  }
  return false;
}

self.onmessage = function (e) {
  var msg = e.data || {};
  var id = msg.id;
  var bytes = msg.bytes instanceof Uint8Array ? msg.bytes : new Uint8Array(msg.bytes);
  var password = msg.password || "";

  function reply(o) {
    o.id = id;
    self.postMessage(o, o.bytes ? [o.bytes.buffer] : []);
  }

  if (!looksLikePdf(bytes)) {
    return reply({ status: "damaged",
      reason: "That file does not start with a PDF header — it may be renamed, corrupted, or not a PDF at all." });
  }

  /* Caller already supplied a password: go straight at it. */
  if (password) {
    return qpdf(["--password=" + password, "--decrypt", "/in.pdf", "/out.pdf"], bytes).then(function (r) {
      if (r.code === 0 && r.out && r.out.length) return reply({ status: "unlocked", bytes: r.out, log: r.log });
      reply({ status: "bad-password", reason: "qpdf rejected that password.", log: r.log });
    });
  }

  /* No password yet — work out whether one is actually needed.
     `--is-encrypted` exits 0 only when the file is encrypted AND opens
     without a user password: the owner-password / restrictions case. */
  qpdf(["--is-encrypted", "/in.pdf"], bytes).then(function (probe) {
    if (probe.code === 0) {
      return qpdf(["--decrypt", "/in.pdf", "/out.pdf"], bytes).then(function (owner) {
        if (owner.code === 0 && owner.out && owner.out.length) {
          return reply({ status: "unlocked", bytes: owner.out, restrictionsOnly: true, log: owner.log });
        }
        return fallback();
      });
    }
    return fallback();
  });

  /* Exit 2 from the probe is ambiguous: it means either "not encrypted" or
     "needs a user password". Opening with no password tells them apart. */
  function fallback() {
    return qpdf(["--decrypt", "/in.pdf", "/out.pdf"], bytes).then(function (open) {
      if (open.code === 0 && open.out && open.out.length) {
        return reply({ status: "not-encrypted", bytes: open.out, log: open.log });
      }
      if (hasEncryptDict(bytes)) return reply({ status: "needs-password", log: open.log });
      reply({ status: "damaged",
        reason: "qpdf could not read this file's structure. It may be corrupted or truncated.", log: open.log });
    });
  }
};
