"use client";
import { Crown } from "lucide-react";
import { useChannelLive } from "@/components/channel-live";
import { useLocale, useT } from "@/lib/i18n/client";
import { Card } from "@/components/ui";
import { formatMoney } from "@/lib/format";

export function PremiumHeader() {
  const { settings } = useChannelLive();
  const t = useT();
  const locale = useLocale();
  return (
    <Card className="mb-6 flex items-center gap-4 border-warning/40 p-4">
      <Crown className="size-8 shrink-0 text-warning" />
      <p className="text-sm">{t("premium.description", { amount: formatMoney(settings.premiumMinTip, settings.currency, locale) })}</p>
    </Card>
  );
}
