import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";

/** Fixed-window rate limit stored in Postgres (no Redis). Returns true when allowed. */
export async function rateLimit(key: string, max: number, windowSec: number): Promise<boolean> {
  const { data, error } = await supabaseAdmin().rpc("check_rate_limit", { p_key: key, p_max: max, p_window_sec: windowSec });
  if (error) {
    console.error("rate limit error", error);
    return true; // fail open: don't block requests because of the limiter itself
  }
  return data === true;
}
