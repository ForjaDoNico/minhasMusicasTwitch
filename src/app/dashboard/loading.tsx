import { PageSkeleton } from "@/components/page-skeleton";

export default function Loading() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <PageSkeleton />
    </main>
  );
}
