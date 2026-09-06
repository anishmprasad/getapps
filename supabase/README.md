# GetJSON — Supabase backend

> **Status: the backend is live.** Project `ccmcwzdvrhhfbdqljtxn` (org
> `getapps.tech`) has the schema applied, the `json` edge function deployed, and
> the hourly purge scheduled. The site's probe succeeds, so demo mode is off.
>
> **Only step 4 remains — Google sign-in is still disabled** (`"google":false` in
> `/auth/v1/settings`), because it is two dashboard toggles nobody can do from a
> CLI. Until then `auth.available()` is false and the page shows the
> "Sign-in arrives with the backend" chip instead of Google's button. Everything
> else works signed out.

Everything GetJSON needs on the server side: one table, one edge function.
Until this is deployed the site runs in **demo mode** — the editor, validation,
preview, expiry logic and code snippets all work, endpoints are stored in the
visitor's own browser, and a banner says so.

---

## 1. Create the project

Already done — project ref `ccmcwzdvrhhfbdqljtxn`, URL
`https://ccmcwzdvrhhfbdqljtxn.supabase.co`. The anon public key is in
`sites/getjson/assets/js/config.js`.

> The anon key is meant to be public — it ships in client code and is useless
> without the RLS policies below. The **service_role** key is not: it bypasses
> RLS entirely. It belongs only in edge function environment variables, which
> Supabase injects automatically. Never put it in `config.js`.

## 2. Apply the schema — done

Applied with `supabase db query --linked -f supabase/schema.sql` (the Management
API path, so it needs no database password). Pasting `schema.sql` into
*SQL Editor → New query* does the same thing. It creates:

| Object | Purpose |
| --- | --- |
| `public.bins` | The documents, with `expires_at`, a hashed `edit_token`, and a 256 KB size ceiling. |
| `bins_enforce_ttl()` trigger | Clamps every write to 3 days anonymous / 6 days signed-in. **The database is the authority** — a forged API call cannot exceed it. |
| `bump_bin_views()` | Counter bumped by the edge function on each read. |
| `purge_expired_bins()` | Physically deletes expired rows. |
| RLS policies | A signed-in user can select, update and delete only their own unexpired rows. There is deliberately **no insert policy** — every write goes through the edge function. |

The purge is scheduled — `pg_cron` is enabled and job 1 runs
`select public.purge_expired_bins()` at `0 * * * *`. On a fresh project:

```sql
select cron.schedule('purge-expired-bins', '0 * * * *', $$select public.purge_expired_bins()$$);
```

Expired rows are filtered out of reads immediately regardless, so the cron job
is about storage hygiene, not correctness.

`supabase db advisors --linked --type security` reports no issues. Getting there
took two fixes now folded into `schema.sql`: `bins_enforce_ttl` had a mutable
`search_path`, and `purge_expired_bins` — `security definer`, like
`bump_bin_views` — was callable by `anon` through `/rest/v1/rpc/`. Re-run the
advisors after any schema change.

## 3. Deploy the edge function — done

```bash
supabase functions deploy json --project-ref ccmcwzdvrhhfbdqljtxn
```

No `--no-verify-jwt` flag any more: `supabase/config.toml` carries
`[functions.json] verify_jwt = false`, so the setting survives every deploy
instead of depending on whoever runs it remembering a flag.

JWT verification being off is **required**. It is what lets an unauthenticated
`curl https://ccmcwzdvrhhfbdqljtxn.supabase.co/functions/v1/json/<id>` work with no headers at
all — the whole point of the product. Authorisation is handled inside the
function instead:

- reads are public by design;
- writes require either the creator's `X-Edit-Token` or a valid access token
  belonging to the row's owner.

`SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are injected
by the platform — you do not need to set them. `SUPABASE_URL` is also what the
`url` in a create response is built from: deriving it from the request instead
returns `http://`, because the inbound URL behind Supabase's proxy is plain
HTTP, and that URL is what the UI shows and copies.

## 4. Enable Google sign-in

The site does **not** use Supabase's OAuth redirect flow. That flow sends the
user to `accounts.google.com` with Supabase as the client, so Google's consent
screen reads *"to continue to ccmcwzdvrhhfbdqljtxn.supabase.co"* — which looks
wrong on a consumer tool.

Instead, Google Identity Services renders a button **in the page**, on our own
origin and against our own client id. Google returns a signed ID token, which
the app hands to `supabase.auth.signInWithIdToken`. Supabase verifies that
signature against Google's public keys and mints the session.

> That verification is load-bearing. The anon key is public, so if the browser
> simply asserted "I am user X" and wrote rows with that `owner_id`, anyone
> could claim anyone else's endpoints. Supabase checking Google's signature is
> what makes `owner_id` trustworthy, and what lets the RLS policies mean
> something. No redirect through Supabase is involved either way.

### 4a. Google Cloud console

OAuth 2.0 Client (Web application):

```
Client ID: 1016786399114-oifs16q4d7osmoo0qejp9qb917fisv6h.apps.googleusercontent.com
```

**Authorised JavaScript origins** — required for this flow, and the part that
differs from a redirect setup. Add every origin the button renders on:

```
https://getjson.getapps.tech
http://localhost:4323
```

**Authorised redirect URIs** — not used by this flow. Leave empty, or keep
`https://ccmcwzdvrhhfbdqljtxn.supabase.co/auth/v1/callback` if you ever want the
redirect flow as a fallback.

Fill in the OAuth consent screen (app name, support email, `email` + `profile`
scopes). The app name you put there is what users will read on the Google
prompt, so make it "GetJSON" or "GetApps", not the project id.

### 4b. Supabase dashboard

*Authentication → Providers → Google*: toggle on and put the client id into
**Authorised Client IDs** — that is the field `signInWithIdToken` checks.

> **The client secret is not needed for this flow.** It only matters for the
> redirect flow we are not using. If the dashboard insists on the field, paste
> it there and nowhere else — never in `config.js` or this repo.

*Authentication → URL Configuration* no longer matters for sign-in, since there
is no redirect. Setting **Site URL** to `https://getjson.getapps.tech` is still
worth doing for email templates.

### 4c. Check it

```bash
curl -s -H "apikey: <anon key>" \
  https://ccmcwzdvrhhfbdqljtxn.supabase.co/auth/v1/settings | grep -o '"google":[a-z]*'
```

`"google":true` means the provider is on. Reload GetJSON and Google's own button
replaces the "Sign-in arrives with the backend" chip.

Common failures:

| Symptom | Cause |
| --- | --- |
| Button never appears, console says GIS could not load | A tracking blocker is blocking `accounts.google.com`. The UI falls back to a message saying so. |
| `[GSI_LOGGER] The given origin is not allowed` | The origin is missing from **Authorised JavaScript origins** (4a). |
| Toast: "Google sign-in is not enabled on the Supabase project yet" | Provider still off, or the client id is not in **Authorised Client IDs** (4b). |
| `Passed nonce and nonce in id_token should either both exist or not` | Nonce mismatch — the app hashes it correctly, so this points at a stale cached `api.js`. Hard-reload. |

Sign-in stays optional throughout — it only raises retention from 3 days to 6
and gives a cross-device list. Everything else works signed out.

## 5. Point the site at it — done

`sites/getjson/assets/js/config.js` already holds the project URL and anon key.

The app calls `GET {apiBase}` once on load. While that returns 404 the site runs
in demo mode and says why; the moment the function is deployed the probe succeeds
and the banner disappears. No config change is needed after deploying.

**Enable Google sign-in (step 4) as well** — it is still off, with only email
enabled, so the sign-in button stays hidden until then. Everything else works
without it; signing in only raises retention from 3 days to 6.

---

## Verifying it works

```bash
BASE=https://ccmcwzdvrhhfbdqljtxn.supabase.co/functions/v1/json

# create
curl -s -X POST $BASE -H 'Content-Type: application/json' \
  -d '{"data":{"hello":"world"},"ttlHours":1}'

# read — note: no headers at all
curl -s $BASE/<id>

# the TTL ceiling is enforced in the database, not the UI:
# ask for 999 hours anonymously and you get 72 back
curl -s -X POST $BASE -H 'Content-Type: application/json' \
  -d '{"data":{"x":1},"ttlHours":999}' | grep ttlHours
```

## Design notes

**Why an edge function rather than PostgREST for reads?** PostgREST requires an
`apikey` header and returns an array wrapper. GetJSON promises a bare `curl` with
no headers returning exactly the document you saved. Only a function can do that.

**Why RLS as well, then?** The dashboard reads a user's own rows directly through
PostgREST with their JWT. RLS is what makes that safe, and it is a second line of
defence if the function is ever misconfigured.

**Why is the edit token hashed?** So that a database leak does not hand out write
access to every anonymous endpoint. The token is generated in the function, shown
to the creator once, and only its SHA-256 is persisted.

## Cost

Comfortably inside Supabase's free tier for ordinary traffic: the table is small
because everything expires within days, and reads are a single indexed primary-key
lookup. Edge function invocations are the thing to watch if a popular endpoint
gets polled aggressively.
