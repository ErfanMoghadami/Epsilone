import { createClient } from "@supabase/supabase-js";

/** Service-role client. Server-only. Never import in client components. */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Supabase admin env vars are not configured.");
  }

  return createClient(url, key, { auth: { persistSession: false } });
}