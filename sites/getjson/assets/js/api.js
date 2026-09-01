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

  var auth = {
    available: function () { return LIVE; },
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
    signInWithGoogle: async function (redirectTo) {
      var c = await supa();
      if (!c) { GA.toast("Sign-in is not configured on this deployment yet", "warn"); return; }
      var res = await c.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: redirectTo || (location.origin + "/dashboard") }
      });
      if (res.error) GA.toast(res.error.message, "err");
    },
    signOut: async function () {
      var c = await supa();
      if (c) await c.auth.signOut();
    },
    onChange: async function (fn) {
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
    live: LIVE,
    base: BASE,
    maxBytes: CFG.maxBytes || 262144,

    urlFor: function (id) { return LIVE ? BASE + "/" + id : location.origin + "/demo/" + id; },

    maxHours: function (signedIn) {
      return signedIn ? (CFG.userMaxHours || 144) : (CFG.anonMaxHours || 72);
    },

    create: async function (data, ttlHours, name) {
      if (!LIVE) {
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
      if (!LIVE) return demo.get(id);
      var res = await fetch(BASE + "/" + id, { headers: { Accept: "application/json" } });
      if (!res.ok) {
        var b = await res.json().catch(function () { return {}; });
        throw new Error(b.error || "HTTP " + res.status);
      }
      return res.json();
    },

    update: async function (id, data, editToken, ttlHours) {
      if (!LIVE) {
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
      if (!LIVE) { demo.remove(id); forget(id); return { deleted: true }; }
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
