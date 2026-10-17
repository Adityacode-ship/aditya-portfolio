// Copy this file to supabase-config.js and replace both values.
// The publishable/anon key is safe to expose in a static frontend only when
// the database and Storage RLS policies in supabase-setup.sql are enabled.
window.__SUPABASE_CONFIG__ = {
  url: "https://YOUR_PROJECT_REF.supabase.co",
  publishableKey: "YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY"
};
