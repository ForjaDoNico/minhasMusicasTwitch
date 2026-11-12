// Mostrado na hora do clique enquanto o servidor renderiza a página (loading.tsx).
export function PageSkeleton() {
  return (
    <div className="animate-pulse space-y-6" aria-busy="true" aria-live="polite">
      <div className="h-8 w-48 rounded-md bg-surface-2" />
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="h-24 rounded-xl bg-surface-2" />
        <div className="h-24 rounded-xl bg-surface-2" />
        <div className="h-24 rounded-xl bg-surface-2" />
      </div>
      <div className="space-y-2 rounded-xl border border-border p-4">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="h-10 rounded-md bg-surface-2" />
        ))}
      </div>
    </div>
  );
}
