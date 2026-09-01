# GetJSON — Supabase backend

Everything GetJSON needs on the server side: one table, one edge function.
Until this is deployed the site runs in **demo mode** — the editor, validation,
preview, expiry logic and code snippets all work, endpoints are stored in the
visitor's own browser, and a banner says so.

---

## 1. Create the project

1. Create a new project at <https://supabase.com/dashboard>.
2. Note the **Project URL** (`https://<ref>.supabase.co`) and the **anon public key**
   from *Project Settings → API*.

> The anon key is meant to be public — it ships in client code and is useless
> without the RLS policies below. The **service_role** key is not: it bypasses
> RLS entirely. It belongs only in edge function environment variables, which
> Supabase injects automatically. Never put it in `config.js`.

## 2. Apply the schema

Paste `schema.sql` into *SQL Editor → New query* and run it. It creates:

| Object | Purpose |
| --- | --- |
| `public.bins` | The documents, with `expires_at`, a hashed `edit_token`, and a 256 KB size ceiling. |
| `bins_enforce_ttl()` trigger | Clamps every write to 3 days anonymous / 6 days signed-in. **The database is the authority** — a forged API call cannot exceed it. |
| `bump_bin_views()` | Counter bumped by the edge function on each read. |
| `purge_expired_bins()` | Physically deletes expired rows. |
| RLS policies | A signed-in user can select, update and delete only their own unexpired rows. There is deliberately **no insert policy** — every write goes through the edge function. |

Then schedule the purge. Enable `pg_cron` under *Database → Extensions*, and run:

```sql
select cron.schedule('purge-expired-bins', '0 * * * *', $$select public.purge_expired_bins()$$);
```

Expired rows are filtered out of reads immediately regardless, so the cron job
is about storage hygiene, not correctness.

## 3. Deploy the edge function

```bash
supabase link --project-ref <your-ref>
supabase functions deploy json --no-verify-jwt
```

`--no-verify-jwt` is **required**. It is what lets an unauthenticated
`curl https://<ref>.supabase.co/functions/v1/json/<id>` work with no headers at
all — the whole point of the product. Authorisation is handled inside the
function instead:

- reads are public by design;
- writes require either the creator's `X-Edit-Token` or a valid access token
  belonging to the row's owner.

`SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are injected
by the platform — you do not need to set them.

## 4. Enable Google sign-in

*Authentication → Providers → Google*. Create an OAuth client in the Google
Cloud console and set the authorised redirect URI to:

```
https://<ref>.supabase.co/auth/v1/callback
```

Then add the site to *Authentication → URL Configuration*:

- **Site URL**: `https://getjson.getapps.tech`
- **Redirect URLs**: `https://getjson.getapps.tech/dashboard`, plus
  `http://localhost:4323/dashboard` for local work.

Sign-in is optional throughout — it only raises the retention ceiling from 3
days to 6 and gives the user a cross-device list.

## 5. Point the site at it

Edit `sites/getjson/assets/js/config.js`:

```js
window.GJ_CONFIG = {
  supabaseUrl: "https://<ref>.supabase.co",
  supabaseAnonKey: "<anon key>",
  apiBase: "",          // derived from supabaseUrl unless you override it
  anonMaxHours: 72,
  userMaxHours: 144,
  maxBytes: 262144
};
```

Deploy, reload, and the demo banner disappears.

---

## Verifying it works

```bash
BASE=https://<ref>.supabase.co/functions/v1/json

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
