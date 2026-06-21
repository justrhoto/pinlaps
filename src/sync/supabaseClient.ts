import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** Sync is only available when both env vars are provided (see .env.example). */
export const isSyncConfigured = Boolean(url && anonKey);

/**
 * Shared Supabase client, or null when sync isn't configured. Persisting the
 * session in localStorage keeps the user signed in across reloads, which is
 * what makes "my devices stay synced" work without re-auth every visit.
 */
export const supabase: SupabaseClient | null = isSyncConfigured
  ? createClient(url, anonKey, {
      auth: { persistSession: true, autoRefreshToken: true },
    })
  : null;
