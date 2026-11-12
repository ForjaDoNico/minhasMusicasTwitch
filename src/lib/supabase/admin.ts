import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { SUPABASE_URL, serverEnv } from "@/lib/env";

let admin: ReturnType<typeof createClient<Database>> | undefined;

/** Service-role client: bypasses RLS. Only for trusted server code (API routes, bot). */
export function supabaseAdmin() {
  admin ??= createClient<Database>(SUPABASE_URL, serverEnv().serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return admin;
}
