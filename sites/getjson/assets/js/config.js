/* =====================================================================
   GetJSON — deployment configuration
   ---------------------------------------------------------------------
   Project ccmcwzdvrhhfbdqljtxn. See supabase/README.md for the deploy steps.

   The app probes the API once on load. If the keys are missing OR the edge
   function is not deployed yet, it falls back to DEMO MODE: the editor,
   validation, preview, expiry and snippets all work, endpoints are stored in
   this browser only, and a banner says exactly which of the two it is.

   The anon key is a PUBLIC key — it is designed to sit in client code and
   is useless without the row-level security policies in supabase/schema.sql.
   Never put the service_role key here.
   ===================================================================== */
window.GJ_CONFIG = {
  supabaseUrl: "https://ccmcwzdvrhhfbdqljtxn.supabase.co",
  supabaseAnonKey:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNjbWN3emR2cmhoZmJkcWxqdHhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgzMjc2NTUsImV4cCI6MjEwMzkwMzY1NX0.2fcv3QcAKWzZ_0Ij5bOtqN5nX_Rt2ftQ5mBUcxa7jxo",

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
