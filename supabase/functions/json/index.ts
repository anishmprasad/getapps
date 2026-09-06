// =====================================================================
// GetJSON — public API edge function
//
//   POST   /functions/v1/json          create a bin
//   GET    /functions/v1/json/:id      fetch the stored JSON, raw
//   PUT    /functions/v1/json/:id      replace the stored JSON
//   DELETE /functions/v1/json/:id      delete it
//
// Deploys WITHOUT JWT verification so that a plain `curl` or `fetch` with
// no headers can read a bin. That setting lives in supabase/config.toml
// ([functions.json] verify_jwt = false), so it survives every deploy:
//
//   supabase functions deploy json
//
// Authorisation is handled here instead:
//   * reads are public by design
//   * writes need either the creator's edit token (X-Edit-Token) or a
//     valid Supabase access token belonging to the bin's owner
// =====================================================================
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const MAX_BYTES = 256 * 1024;       // 256 KB per document
const ANON_MAX_HOURS = 72;          // 3 days
const USER_MAX_HOURS = 144;         // 6 days
const ID_ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789"; // no l/o/0/1

// The public origin to hand back in a created bin's `url`. Deliberately NOT
// derived from the request: behind Supabase's proxy the inbound URL is plain
// http, so `new URL(req.url).origin` would publish an http:// endpoint to
// every creator — in the UI, in the copy button, and in the curl snippet.
const PUBLIC_ORIGIN = SUPABASE_URL.replace(/\/+$/, "");

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-edit-token, content-type, apikey",
  "Access-Control-Max-Age": "86400",
};

function json(body: unknown, status = 200, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json; charset=utf-8", ...extra },
  });
}

function fail(message: string, status = 400, code?: string) {
  return json({ error: message, code: code ?? null }, status);
}

function newId(len = 10) {
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  let out = "";
  for (const b of bytes) out += ID_ALPHABET[b % ID_ALPHABET.length];
  return out;
}

function newSecret() {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function sha256(text: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Resolve the caller's user id from a Supabase access token, if present. */
async function callerId(req: Request): Promise<string | null> {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  // The anon key is also sent as a bearer token by supabase-js; it is not a user.
  if (!token || token === ANON_KEY) return null;
  const scoped = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await scoped.auth.getUser();
  if (error || !data?.user) return null;
  return data.user.id;
}

function clampHours(requested: unknown, signedIn: boolean) {
  const max = signedIn ? USER_MAX_HOURS : ANON_MAX_HOURS;
  const n = Number(requested);
  if (!Number.isFinite(n) || n <= 0) return Math.min(24, max);
  return Math.min(Math.ceil(n), max);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const url = new URL(req.url);
  // Path is /functions/v1/json[/:id] — take whatever follows "json".
  const parts = url.pathname.split("/").filter(Boolean);
  const at = parts.lastIndexOf("json");
  const id = at >= 0 ? (parts[at + 1] ?? "") : "";

  try {
    /* ------------------------------------------------------- READ ---- */
    if (req.method === "GET") {
      if (!id) {
        return json({
          service: "GetJSON",
          docs: "https://getjson.getapps.tech/docs",
          endpoints: {
            create: "POST /functions/v1/json",
            read: "GET /functions/v1/json/:id",
            update: "PUT /functions/v1/json/:id",
            remove: "DELETE /functions/v1/json/:id",
          },
        });
      }
      const { data, error } = await admin
        .from("bins")
        .select("data, expires_at, name, created_at")
        .eq("id", id)
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();

      if (error) return fail("Lookup failed.", 500, "lookup_failed");
      if (!data) {
        return fail("No such endpoint. It may have expired — GetJSON documents are deliberately short-lived.", 404, "not_found");
      }

      // Best-effort view counter — never let it delay or fail the response.
      admin.rpc("bump_bin_views", { bin_id: id }).then(() => {}, () => {});

      const expires = new Date(data.expires_at);
      const maxAge = Math.max(0, Math.floor((expires.getTime() - Date.now()) / 1000));
      return new Response(JSON.stringify(data.data), {
        status: 200,
        headers: {
          ...CORS,
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": `public, max-age=${Math.min(maxAge, 30)}`,
          "X-Expires-At": data.expires_at,
        },
      });
    }

    /* ----------------------------------------------------- CREATE ---- */
    if (req.method === "POST") {
      const raw = await req.text();
      if (raw.length > MAX_BYTES) {
        return fail(`Document is larger than ${MAX_BYTES / 1024} KB.`, 413, "too_large");
      }
      let body: { data?: unknown; ttlHours?: unknown; name?: unknown };
      try { body = JSON.parse(raw || "{}"); }
      catch { return fail("Request body is not valid JSON.", 400, "bad_request"); }
      if (body.data === undefined) return fail('Missing "data".', 400, "missing_data");

      const payload = JSON.stringify(body.data);
      if (payload.length > MAX_BYTES) {
        return fail(`Document is larger than ${MAX_BYTES / 1024} KB.`, 413, "too_large");
      }

      const owner = await callerId(req);
      const hours = clampHours(body.ttlHours, !!owner);
      const secret = newSecret();

      let inserted = null, lastError = null;
      for (let attempt = 0; attempt < 5 && !inserted; attempt++) {
        const candidate = newId();
        const { data, error } = await admin.from("bins").insert({
          id: candidate,
          data: body.data,
          name: typeof body.name === "string" ? body.name.slice(0, 80) : null,
          owner_id: owner,
          edit_token: await sha256(secret),
          expires_at: new Date(Date.now() + hours * 3600_000).toISOString(),
        }).select("id, expires_at, created_at").single();
        if (!error) { inserted = data; break; }
        lastError = error;
        if (error.code !== "23505") break;   // only retry on an id collision
      }
      if (!inserted) return fail(lastError?.message ?? "Could not store the document.", 500, "insert_failed");

      return json({
        id: inserted.id,
        url: `${PUBLIC_ORIGIN}/functions/v1/json/${inserted.id}`,
        editToken: secret,
        expiresAt: inserted.expires_at,
        createdAt: inserted.created_at,
        ttlHours: hours,
        owned: !!owner,
      }, 201);
    }

    /* ------------------------------------------- UPDATE / DELETE ---- */
    if (req.method === "PUT" || req.method === "DELETE") {
      if (!id) return fail("An endpoint id is required.", 400, "missing_id");

      const { data: bin, error } = await admin
        .from("bins").select("id, owner_id, edit_token").eq("id", id).maybeSingle();
      if (error) return fail("Lookup failed.", 500, "lookup_failed");
      if (!bin) return fail("No such endpoint.", 404, "not_found");

      const supplied = req.headers.get("x-edit-token") ?? "";
      const owner = await callerId(req);
      const byToken = supplied ? (await sha256(supplied)) === bin.edit_token : false;
      const byOwner = !!owner && owner === bin.owner_id;
      if (!byToken && !byOwner) {
        return fail("You need the edit token this endpoint was created with, or to be signed in as its owner.", 403, "forbidden");
      }

      if (req.method === "DELETE") {
        const { error: delErr } = await admin.from("bins").delete().eq("id", id);
        if (delErr) return fail("Delete failed.", 500, "delete_failed");
        return json({ id, deleted: true });
      }

      const raw = await req.text();
      if (raw.length > MAX_BYTES) return fail(`Document is larger than ${MAX_BYTES / 1024} KB.`, 413, "too_large");
      let body: { data?: unknown; ttlHours?: unknown; name?: unknown };
      try { body = JSON.parse(raw || "{}"); }
      catch { return fail("Request body is not valid JSON.", 400, "bad_request"); }
      if (body.data === undefined) return fail('Missing "data".', 400, "missing_data");

      const patch: Record<string, unknown> = { data: body.data };
      if (typeof body.name === "string") patch.name = body.name.slice(0, 80);
      if (body.ttlHours !== undefined) {
        patch.expires_at = new Date(Date.now() + clampHours(body.ttlHours, !!bin.owner_id) * 3600_000).toISOString();
      }

      const { data: updated, error: upErr } = await admin
        .from("bins").update(patch).eq("id", id).select("id, expires_at, updated_at").single();
      if (upErr) return fail("Update failed.", 500, "update_failed");
      return json({ id: updated.id, expiresAt: updated.expires_at, updatedAt: updated.updated_at, updated: true });
    }

    return fail("Method not allowed.", 405, "method_not_allowed");
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Unexpected error.", 500, "unexpected");
  }
});
