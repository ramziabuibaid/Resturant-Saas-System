import { createClient } from "@supabase/supabase-js";

/**
 * Creates a Supabase client for Edge middleware (no cookies).
 * Used only for reading restaurant by subdomain; RLS should allow public read.
 */
export function createEdgeSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
