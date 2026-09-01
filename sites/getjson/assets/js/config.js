/* =====================================================================
   GetJSON — deployment configuration
   ---------------------------------------------------------------------
   Fill these in after creating the Supabase project (see supabase/README.md).
   Until supabaseUrl/supabaseAnonKey are set, the site runs in DEMO MODE:
   the editor, validation, preview and snippets all work, endpoints are
   stored in this browser only, and a banner says so plainly.

   The anon key is a PUBLIC key — it is designed to sit in client code and
   is useless without the row-level security policies in supabase/schema.sql.
   Never put the service_role key here.
   ===================================================================== */
window.GJ_CONFIG = {
  supabaseUrl: "",          // e.g. "https://abcdefghijklm.supabase.co"
  supabaseAnonKey: "",      // e.g. "eyJhbGciOi..."

  // Where the public API lives. Leave empty to derive it from supabaseUrl
  // as `${supabaseUrl}/functions/v1/json`. Override if you later put the
  // function behind a custom domain or a proxy.
  apiBase: "",

  // Retention ceilings, mirrored from the database triggers. Changing them
  // here only changes what the UI offers — the database is the authority.
  anonMaxHours: 72,         // 3 days
  userMaxHours: 144,        // 6 days

  maxBytes: 262144          // 256 KB
};
