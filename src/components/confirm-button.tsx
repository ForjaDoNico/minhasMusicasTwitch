"use client";
import { useState } from "react";
import { Dialog } from "@/components/dialog";
import { Button } from "@/components/ui";
import { useT } from "@/lib/i18n/client";

export function ConfirmButton({
  message,
  onConfirm,
  children,
  variant = "danger",
  size = "sm",
  title,
  ...rest
}: {
  message: string;
  onConfirm: () => void | Promise<unknown>;
  children: React.ReactNode;
  variant?: "danger" | "secondary" | "ghost";
  size?: "sm" | "md";
  title?: string;
} & { "data-testid"?: string; "aria-label"?: string }) {
  const [open, setOpen] = useState(false);
  const t = useT();
  return (
    <>
      <Button variant={variant} size={size} onClick={() => setOpen(true)} title={title} {...rest}>
        {children}
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title={t("common.confirm")}>
        <p className="mb-5 text-sm">{message}</p>
        <div className="flex justify-end gap-2">
          <Button onClick={() => setOpen(false)}>{t("common.cancel")}</Button>
          <Button variant="danger" data-testid="confirm-yes" onClick={async () => { setOpen(false); await onConfirm(); }}>
            {t("common.yes")}
          </Button>
        </div>
      </Dialog>
    </>
  );
}
