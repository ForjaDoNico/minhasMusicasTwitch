import { notFound } from "next/navigation";
import { DEV_LOGIN_ENABLED } from "@/lib/env";
import { Suspense } from "react";
import { DevLoginForm } from "./form";

/** Local-only email/password login for the seeded demo users (used by Playwright). */
export default function DevLoginPage() {
  if (!DEV_LOGIN_ENABLED) notFound();
  return (
    <main className="mx-auto max-w-sm px-4 py-16">
      <h1 className="mb-4 text-xl font-bold">Dev login</h1>
      <p className="mb-4 text-sm text-muted">streamer@demo.local · mod@demo.local · viewer@demo.local — senha/password: demo1234</p>
      <Suspense>
        <DevLoginForm />
      </Suspense>
    </main>
  );
}
