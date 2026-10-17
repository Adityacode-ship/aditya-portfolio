(function () {
  const config = window.__SUPABASE_CONFIG__ || {};
  const hasConfig = Boolean(
    typeof config.url === "string" && /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(config.url) &&
    typeof config.publishableKey === "string" && config.publishableKey.trim() &&
    !config.publishableKey.includes("YOUR_SUPABASE")
  );

  let client = null;
  if (hasConfig && window.supabase && typeof window.supabase.createClient === "function") {
    client = window.supabase.createClient(config.url, config.publishableKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
  }

  window.portfolioSupabase = { configured: Boolean(client), client };
})();
