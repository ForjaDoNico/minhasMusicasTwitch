import Link from "next/link";
import { getT } from "@/lib/i18n/server";

export default async function NotFound() {
  const { t } = await getT();
  return (
    <main className="mx-auto max-w-md px-4 py-24 text-center">
      <h1 className="mb-2 text-3xl font-bold">404</h1>
      <p className="mb-6 text-muted">{t("notFound.channel")}</p>
      <Link href="/" className="text-accent underline">{t("app.name")}</Link>
    </main>
  );
}
