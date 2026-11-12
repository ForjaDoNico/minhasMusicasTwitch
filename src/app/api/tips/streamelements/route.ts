import { getViewer } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { json } from "@/lib/http";
import { ingestTip } from "@/lib/tips";

interface SETip {
  _id: string;
  createdAt: string;
  donation: { user: { username: string }; amount: number; currency: string; message?: string };
}

/** Pull recent tips from the StreamElements REST API (on demand — no socket/worker needed). */
export async function POST() {
  const viewer = await getViewer();
  if (!viewer) return json({ ok: false }, 401);
  const admin = supabaseAdmin();
  const { data: channel } = await admin.from("channels").select("id").eq("owner_id", viewer.id).maybeSingle();
  if (!channel) return json({ ok: false }, 404);
  const { data: secret } = await admin.from("channel_secrets").select("*").eq("channel_id", channel.id).single();
  if (!secret?.streamelements_channel_id || !secret.streamelements_jwt) return json({ ok: false, error: "not_configured" }, 400);

  const res = await fetch(
    `https://api.streamelements.com/kappa/v2/tips/${encodeURIComponent(secret.streamelements_channel_id)}?limit=25&sort=-createdAt`,
    { headers: { authorization: `Bearer ${secret.streamelements_jwt}`, accept: "application/json" } },
  );
  if (!res.ok) return json({ ok: false, error: `streamelements_${res.status}` }, 502);
  const body = (await res.json()) as { docs?: SETip[] };
  let count = 0;
  for (const tip of body.docs ?? []) {
    const r = await ingestTip(channel.id, {
      name: tip.donation.user.username,
      amount: tip.donation.amount,
      currency: tip.donation.currency,
      message: tip.donation.message,
      externalId: tip._id,
      provider: "streamelements",
    });
    if (r.inserted) count++;
  }
  return json({ ok: true, count });
}
