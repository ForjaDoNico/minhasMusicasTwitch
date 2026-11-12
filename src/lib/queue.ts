// Pure queue helpers shared by UI (optimistic updates) and tests. The source of truth for
// ordering is the SQL RPCs; these functions mirror their rules.

export interface Positioned {
  id: string;
  position: number;
  is_priority?: boolean;
  created_at?: string;
}

export function sortQueue<T extends Positioned>(items: T[]): T[] {
  return [...items].sort(
    (a, b) => a.position - b.position || (a.created_at ?? "").localeCompare(b.created_at ?? ""),
  );
}

export function arrayMove<T>(list: T[], from: number, to: number): T[] {
  const copy = [...list];
  const [moved] = copy.splice(from, 1);
  copy.splice(to, 0, moved);
  return copy;
}

/** Re-number 1..n after a local reorder. */
export function renumber<T extends Positioned>(items: T[]): T[] {
  return items.map((it, i) => ({ ...it, position: i + 1 }));
}

/** Position a new request takes: priority (tipped) requests go after existing priority ones. */
export function insertionPosition(queue: Positioned[], priority: boolean): number {
  if (!priority) return queue.length + 1;
  return queue.filter((q) => q.is_priority).length + 1;
}

export function moveToTop<T extends Positioned>(items: T[], id: string): T[] {
  const sorted = sortQueue(items);
  const idx = sorted.findIndex((i) => i.id === id);
  if (idx <= 0) return renumber(sorted);
  return renumber(arrayMove(sorted, idx, 0));
}

export const REQUEST_ERRORS = [
  "queue_closed", "song_not_found", "site_requests_disabled", "login_required", "subscribers_only",
  "vips_only", "premium_only", "already_in_queue", "song_on_cooldown", "user_limit", "nothing_to_replace",
  "channel_not_found", "rate_limited",
] as const;
export type RequestError = (typeof REQUEST_ERRORS)[number];
