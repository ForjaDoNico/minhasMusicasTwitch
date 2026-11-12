// Fuzzy matching for "!sr" and the site search: accent/case-insensitive, title + artist.

export function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function bigrams(s: string): Map<string, number> {
  const m = new Map<string, number>();
  const t = s.replace(/ /g, "");
  for (let i = 0; i < t.length - 1; i++) {
    const g = t.slice(i, i + 2);
    m.set(g, (m.get(g) ?? 0) + 1);
  }
  return m;
}

/** Sørensen–Dice coefficient on character bigrams (0..1). */
export function dice(a: string, b: string): number {
  if (a === b) return 1;
  if (a.replace(/ /g, "").length < 2 || b.replace(/ /g, "").length < 2) return 0;
  const A = bigrams(a);
  const B = bigrams(b);
  let inter = 0;
  let total = 0;
  for (const [g, n] of A) {
    inter += Math.min(n, B.get(g) ?? 0);
    total += n;
  }
  for (const n of B.values()) total += n;
  return (2 * inter) / total;
}

export interface Searchable {
  id: string;
  title: string;
  artist: string;
}

export interface Scored<T> {
  item: T;
  score: number;
}

function scoreOne(query: string, qTokens: string[], title: string, artist: string): number {
  const full = `${title} ${artist}`.trim();
  if (query === title || query === full || query === `${artist} ${title}`.trim()) return 1;
  // every query token present as a prefix of some word → strong signal
  const words = full.split(" ");
  const tokenHits = qTokens.filter((t) => words.some((w) => w.startsWith(t))).length / qTokens.length;
  const titleSim = dice(query, title);
  const fullSim = Math.max(dice(query, full), dice(query, `${artist} ${title}`));
  const contains = title.includes(query) ? 0.9 : full.includes(query) ? 0.85 : 0;
  return Math.max(contains, 0.55 * tokenHits + 0.45 * Math.max(titleSim, fullSim), titleSim, fullSim * 0.95);
}

/** Rank songs by similarity to a free-text query ("wonderwal oasis", "aguas de marco"). */
export function rankSongs<T extends Searchable>(query: string, songs: T[], limit = 10): Scored<T>[] {
  // accept "title - artist" / "artist - title" formats
  const q = normalize(query.replace(/\s[-–—|]\s/g, " "));
  if (!q) return [];
  const qTokens = q.split(" ");
  return songs
    .map((item) => ({ item, score: scoreOne(q, qTokens, normalize(item.title), normalize(item.artist)) }))
    .filter((s) => s.score >= 0.35)
    .sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title))
    .slice(0, limit);
}

export type MatchResult<T> =
  | { kind: "match"; song: T }
  | { kind: "ambiguous"; options: T[] }
  | { kind: "none" };

/** Decide whether a query identifies one song, several candidates, or nothing. */
export function matchSong<T extends Searchable>(query: string, songs: T[]): MatchResult<T> {
  const ranked = rankSongs(query, songs, 5);
  if (ranked.length === 0 || ranked[0].score < 0.5) return { kind: "none" };
  const [best, second] = ranked;
  const clearWinner = best.score >= 0.98 || !second || best.score - second.score >= 0.12;
  if (clearWinner && best.score >= 0.6) return { kind: "match", song: best.item };
  return { kind: "ambiguous", options: ranked.filter((r) => r.score >= 0.5).slice(0, 3).map((r) => r.item) };
}
