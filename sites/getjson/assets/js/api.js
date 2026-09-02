/* =====================================================================
   GetJSON — backend layer
   One surface (GJ.api) over two implementations: the real Supabase edge
   function, and a browser-local demo used when the project is not yet
   configured. Everything above this file is identical either way.
   ===================================================================== */
(function () {
  "use strict";
  var CFG = window.GJ_CONFIG || {};
  var LIVE = !!(CFG.supabaseUrl && CFG.supabaseAnonKey);
  var BASE = CFG.apiBase || (CFG.supabaseUrl ? CFG.supabaseUrl.replace(/\/+$/, "") + "/functions/v1/json" : "");

  var LOCAL_KEY = "gj-bins";      // endpoints created on this device
  var DEMO_KEY = "gj-demo-store"; // demo-mode payloads

  /* Keys can be configured while the edge function is not deployed yet, and a
     healthy backend can go down. `degraded` is set by the health probe below;
     everything routes through useDemo() so one flag covers every call path. */
  var degraded = false;
  var probePromise = null;

  function useDemo() { return !LIVE || degraded; }

  /* GET on the function root returns its service descriptor when deployed.
     Anything else (404 NOT_FOUND, network error) means "not available yet". */
  function probe() {
    if (!LIVE) return Promise.resolve("unconfigured");
    if (probePromise) return probePromise;
    probePromise = fetch(BASE, { method: "GET" })
      .then(function (r) {
        degraded = !r.ok;
        return r.ok ? "live" : "undeployed";
      })
      .catch(function () { degraded = true; return "unreachable"; });
    return probePromise;
  }

  /* ---------------- device-local record of what you created ---------- */
  function readLocal() {
    try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]"); } catch (e) { return []; }
  }
  function writeLocal(list) {
    try { localStorage.setItem(LOCAL_KEY, JSON.stringify(list.slice(0, 100))); } catch (e) {}
  }
  function remember(rec) {
    var list = readLocal().filter(function (b) { return b.id !== rec.id; });
    list.unshift(rec);
    writeLocal(list);
  }
  function forget(id) { writeLocal(readLocal().filter(function (b) { return b.id !== id; })); }
  function localBins() {
    var now = Date.now();
    return readLocal().filter(function (b) { return new Date(b.expiresAt).getTime() > now; });
  }

  /* ------------------------------ demo ------------------------------ */
  var demo = {
    read: function () { try { return JSON.parse(localStorage.getItem(DEMO_KEY) || "{}"); } catch (e) { return {}; } },
    write: function (o) { try { localStorage.setItem(DEMO_KEY, JSON.stringify(o)); } catch (e) {} },
    id: function () {
      var A = "abcdefghijkmnpqrstuvwxyz23456789", s = "";
      var b = new Uint8Array(10); crypto.getRandomValues(b);
      for (var i = 0; i < b.length; i++) s += A[b[i] % A.length];
      return s;
    },
    create: function (data, ttlHours, name) {
      var store = demo.read();
      var id = demo.id();
      var expiresAt = new Date(Date.now() + ttlHours * 3600000).toISOString();
      store[id] = { data: data, name: name || null, expiresAt: expiresAt, createdAt: new Date().toISOString() };
      demo.write(store);
      return { id: id, url: location.origin + "/demo/" + id, editToken: "demo-" + id,
               expiresAt: expiresAt, ttlHours: ttlHours, demo: true };
    },
    get: function (id) {
      var rec = demo.read()[id];
      if (!rec || new Date(rec.expiresAt) < new Date()) throw new Error("not_found");
      return rec.data;
    },
    remove: function (id) { var s = demo.read(); delete s[id]; demo.write(s); }
  };

  /* ------------------------------ auth ------------------------------ */
  var client = null, clientPromise = null;
  function supa() {
    if (!LIVE) return Promise.resolve(null);
    if (client) return Promise.resolve(client);
    if (!clientPromise) {
      clientPromise = import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm")
        .then(function (m) {
          client = m.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey, {
            auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
          });
          return client;
        })
        .catch(function (e) {
          if (window.console) console.warn("[GetJSON] Supabase client unavailable:", e);
          return null;
        });
    }
    return clientPromise;
  }

  /* ------------------- Google Identity Services ---------------------
     Sign-in runs in-page against OUR Google client, so the consent screen
     shows our app name and origin — the user never sees a supabase.co URL,
     and there is no redirect.

     Google hands back a SIGNED ID token, which is passed to Supabase's
     signInWithIdToken. Supabase verifies that signature against Google's
     public keys before minting a session. That step is not ceremony: the
     anon key is public, so without a verified token the browser could claim
     to be any user it liked and `owner_id` on a bin would be forgeable.
     "Direct" here means no redirect through Supabase — not trusting whatever
     the client asserts.

     Needs, on the Google side, this origin in "Authorised JavaScript origins";
     on the Supabase side, the client id under Google > Authorised Client IDs.
     The client SECRET is not part of this flow.
  ------------------------------------------------------------------- */
  var GIS_SRC = "https://accounts.google.com/gsi/client";
  var gisPromise = null;
  var rawNonce = null;
  var gisReady = null;   // promise, once initialize() has been kicked off

  function loadGis() {
    if (gisPromise) return gisPromise;
    gisPromise = new Promise(function (resolve, reject) {
      if (window.google && window.google.accounts && window.google.accounts.id) return resolve(window.google);
      var el = document.createElement("script");
      el.src = GIS_SRC; el.async = true; el.defer = true;
      el.onload = function () {
        if (window.google && window.google.accounts && window.google.accounts.id) resolve(window.google);
        else reject(new Error("Google Identity Services loaded but is unavailable"));
      };
      el.onerror = function () { reject(new Error("Google Identity Services could not be loaded")); };
      document.head.appendChild(el);
    });
    return gisPromise;
  }

  /* Supabase compares sha256(rawNonce) with the nonce baked into the token,
     so Google gets the hash and Supabase gets the original. */
  async function makeNonce() {
    var bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    var raw = Array.prototype.map.call(bytes, function (b) { return b.toString(16).padStart(2, "0"); }).join("");
    var digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
    var hashed = Array.prototype.map.call(new Uint8Array(digest), function (b) {
      return b.toString(16).padStart(2, "0");
    }).join("");
    return { raw: raw, hashed: hashed };
  }

  var authListeners = [];
  function emit(user) { authListeners.forEach(function (fn) { try { fn(user); } catch (e) {} }); }

  async function onCredential(response) {
    var c = await supa();
    if (!c) return;
    try {
      var res = await c.auth.signInWithIdToken({
        provider: "google",
        token: response.credential,
        nonce: rawNonce
      });
      if (res.error) throw res.error;
      GA.toast("Signed in");
      emit(res.data && res.data.user);
    } catch (e) {
      var msg = (e && e.message) || "Sign-in failed";
      if (/provider|not enabled|unsupported/i.test(msg)) {
        msg = "Google sign-in is not enabled on the Supabase project yet.";
      }
      GA.toast(msg, "err", 6000);
      if (window.console) console.warn("[GetJSON] signInWithIdToken failed:", e);
    }
  }

  /* Cached as a promise, not a boolean: two slots mounting at once would
     otherwise both get past a `gisReady` flag and call initialize() twice,
     which GIS warns about and which would leave a stale nonce behind. */
  function initGis() {
    if (gisReady) return gisReady;
    if (!CFG.googleClientId) return Promise.resolve(false);
    gisReady = Promise.all([loadGis(), makeNonce()]).then(function (r) {
      var g = r[0], n = r[1];
      rawNonce = n.raw;
      g.accounts.id.initialize({
        client_id: CFG.googleClientId,
        callback: onCredential,
        nonce: n.hashed,
        auto_select: false,
        cancel_on_tap_outside: true,
        use_fedcm_for_prompt: true
      });
      return true;
    });
    return gisReady;
  }

  var auth = {
    /* Sign-in needs a reachable backend (there is nothing useful to do signed
       in without one) and a configured Google client. */
    available: function () { return LIVE && !degraded && !!CFG.googleClientId; },

    user: async function () {
      var c = await supa();
      if (!c) return null;
      var r = await c.auth.getUser();
      return (r && r.data && r.data.user) || null;
    },
    token: async function () {
      var c = await supa();
      if (!c) return null;
      var r = await c.auth.getSession();
      return (r && r.data && r.data.session && r.data.session.access_token) || null;
    },

    /** Render Google's own button into `el`. Re-renders when the theme flips. */
    mountGoogleButton: async function (el) {
      if (!auth.available()) return false;
      try {
        var g = await loadGis();
        await initGis();
        var draw = function () {
          el.innerHTML = "";
          g.accounts.id.renderButton(el, {
            theme: document.documentElement.getAttribute("data-theme") === "light" ? "outline" : "filled_black",
            size: "medium", shape: "pill", text: "signin_with", logo_alignment: "left"
          });
        };
        draw();
        if (!el._gjThemeObserver) {
          el._gjThemeObserver = new MutationObserver(draw);
          el._gjThemeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
        }
        return true;
      } catch (e) {
        if (window.console) console.warn("[GetJSON]", e.message);
        return false;
      }
    },

    signOut: async function () {
      var c = await supa();
      if (c) await c.auth.signOut();
      try {
        if (window.google && window.google.accounts && window.google.accounts.id) {
          window.google.accounts.id.disableAutoSelect();
        }
      } catch (e) {}
      emit(null);
    },

    onChange: async function (fn) {
      authListeners.push(fn);
      var c = await supa();
      if (!c) { fn(null); return; }
      var r = await c.auth.getUser();
      fn((r && r.data && r.data.user) || null);
      c.auth.onAuthStateChange(function (_e, session) { fn((session && session.user) || null); });
    }
  };

  /* ------------------------------- api ------------------------------ */
  async function authHeaders() {
    var t = await auth.token();
    return t ? { Authorization: "Bearer " + t } : {};
  }

  var api = {
    configured: LIVE,
    base: BASE,
    probe: probe,
    isDemo: useDemo,
    maxBytes: CFG.maxBytes || 262144,

    urlFor: function (id) { return useDemo() ? location.origin + "/demo/" + id : BASE + "/" + id; },

    maxHours: function (signedIn) {
      return signedIn ? (CFG.userMaxHours || 144) : (CFG.anonMaxHours || 72);
    },

    create: async function (data, ttlHours, name) {
      await probe();
      if (useDemo()) {
        var d = demo.create(data, ttlHours, name);
        remember({ id: d.id, name: name || null, url: d.url, editToken: d.editToken,
                   expiresAt: d.expiresAt, createdAt: new Date().toISOString(), demo: true });
        return d;
      }
      var res = await fetch(BASE, {
        method: "POST",
        headers: Object.assign({ "Content-Type": "application/json" }, await authHeaders()),
        body: JSON.stringify({ data: data, ttlHours: ttlHours, name: name || null })
      });
      var body = await res.json().catch(function () { return {}; });
      if (!res.ok) throw new Error(body.error || "Could not create the endpoint (HTTP " + res.status + ").");
      remember({ id: body.id, name: name || null, url: body.url, editToken: body.editToken,
                 expiresAt: body.expiresAt, createdAt: body.createdAt, owned: body.owned });
      return body;
    },

    get: async function (id) {
      if (useDemo()) return demo.get(id);
      var res = await fetch(BASE + "/" + id, { headers: { Accept: "application/json" } });
      if (!res.ok) {
        var b = await res.json().catch(function () { return {}; });
        throw new Error(b.error || "HTTP " + res.status);
      }
      return res.json();
    },

    update: async function (id, data, editToken, ttlHours) {
      if (useDemo()) {
        var s = demo.read();
        if (!s[id]) throw new Error("not_found");
        s[id].data = data; demo.write(s);
        return { id: id, updated: true };
      }
      var res = await fetch(BASE + "/" + id, {
        method: "PUT",
        headers: Object.assign({ "Content-Type": "application/json", "X-Edit-Token": editToken || "" }, await authHeaders()),
        body: JSON.stringify({ data: data, ttlHours: ttlHours })
      });
      var body = await res.json().catch(function () { return {}; });
      if (!res.ok) throw new Error(body.error || "Update failed.");
      return body;
    },

    remove: async function (id, editToken) {
      if (useDemo()) { demo.remove(id); forget(id); return { deleted: true }; }
      var res = await fetch(BASE + "/" + id, {
        method: "DELETE",
        headers: Object.assign({ "X-Edit-Token": editToken || "" }, await authHeaders())
      });
      var body = await res.json().catch(function () { return {}; });
      if (!res.ok) throw new Error(body.error || "Delete failed.");
      forget(id);
      return body;
    },

    /** Endpoints created on this device, whether or not you were signed in. */
    localBins: localBins,
    forget: forget,

    /** Endpoints owned by the signed-in account, read through RLS. */
    myBins: async function () {
      var c = await supa();
      if (!c) return null;
      var r = await c.from("bins")
        .select("id, name, created_at, updated_at, expires_at, views, size_bytes")
        .order("created_at", { ascending: false });
      if (r.error) throw new Error(r.error.message);
      return r.data || [];
    }
  };

  window.GJ = { api: api, auth: auth, config: CFG };
})();
