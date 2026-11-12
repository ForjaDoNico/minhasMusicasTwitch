import { supabaseAdmin } from "@/lib/supabase/admin";
import { serverEnv } from "@/lib/env";

/** Daily Vercel Cron: touches the database so a free Supabase project isn't paused for inactivity. */
export async function GET(req: Request) {
  const secret = serverEnv().cronSecret;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) return new Response("unauthorized", { status: 401 });
  const { count, error } = await supabaseAdmin().from("channels").select("id", { count: "exact", head: true });
  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
  return Response.json({ ok: true, channels: count, at: new Date().toISOString() });
}
