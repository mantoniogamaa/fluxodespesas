function getConfig() {
  return globalThis.FLUXO_CONFIG || {};
}

export function isSupabaseEnabled() {
  const cfg = getConfig();
  return Boolean(cfg.useSupabase && cfg.supabaseUrl && cfg.supabaseAnonKey && globalThis.supabase?.createClient);
}

let client = null;

export function getSupabaseClient() {
  if (!isSupabaseEnabled()) return null;
  if (client) return client;
  const cfg = getConfig();
  client = globalThis.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    global: {
      headers: {
        'X-Client-Info': `${cfg.appName || 'Fluxo'}/flat-v11`,
      },
    },
  });
  return client;
}

export function getWorkspaceId(fallback = 'principal') {
  return (getConfig().workspaceId || fallback || 'principal').trim();
}

export default {
  isSupabaseEnabled,
  getSupabaseClient,
  getWorkspaceId,
};
