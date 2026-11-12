"use client";
import { Crown } from "lucide-react";
import { useT } from "@/lib/i18n/client";
import { Card } from "@/components/ui";

export function PremiumHeader() {
  const t = useT();
  return (
    <Card className="mb-6 flex items-center gap-4 border-warning/40 p-4">
      <Crown className="size-8 shrink-0 text-warning" />
      <p className="text-sm">{t("premium.description")}</p>
    </Card>
  );
}
