import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = await supabaseServer();
  await supabase.auth.signOut();
  const back = req.headers.get("referer");
  return NextResponse.redirect(back && new URL(back).origin === new URL(req.url).origin ? back : new URL("/", req.url), { status: 303 });
}
