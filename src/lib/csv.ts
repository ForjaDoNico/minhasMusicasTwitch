/** RFC4180-ish CSV parser (quotes, escaped quotes, CRLF, ; or , delimiter auto-detect). */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, "");
  const firstLine = src.split(/\r?\n/, 1)[0] ?? "";
  const delim = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === delim) {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((f) => f.trim() !== ""));
}

export interface ImportedSong {
  title: string;
  artist: string;
  tags: string[];
  is_new: boolean;
  is_premium: boolean;
}

const HEADER_ALIASES: Record<string, keyof ImportedSong> = {
  title: "title", titulo: "title", "título": "title", song: "title", musica: "title", "música": "title", name: "title",
  artist: "artist", artista: "artist", banda: "artist",
  tags: "tags", tag: "tags", atributos: "tags", attributes: "tags",
  new: "is_new", nova: "is_new", is_new: "is_new",
  premium: "is_premium", is_premium: "is_premium",
};

const truthyCell = (v: string) => /^(1|true|yes|sim|x|s|y)$/i.test(v.trim());

/** Map CSV rows to songs. With a header row, columns are matched by name; otherwise title,artist,tags. */
export function csvToSongs(text: string): { songs: ImportedSong[]; skipped: number } {
  const rows = parseCsv(text);
  if (rows.length === 0) return { songs: [], skipped: 0 };
  const header = rows[0].map((h) => HEADER_ALIASES[h.trim().toLowerCase()]);
  const hasHeader = header.includes("title");
  const columns: (keyof ImportedSong | undefined)[] = hasHeader ? header : ["title", "artist", "tags", "is_new", "is_premium"];
  let skipped = 0;
  const songs: ImportedSong[] = [];
  for (const r of hasHeader ? rows.slice(1) : rows) {
    const s: ImportedSong = { title: "", artist: "", tags: [], is_new: false, is_premium: false };
    columns.forEach((col, i) => {
      const v = (r[i] ?? "").trim();
      if (!col) return;
      if (col === "tags") s.tags = v.split(/[|,;/]/).map((t) => t.trim()).filter(Boolean);
      else if (col === "is_new" || col === "is_premium") s[col] = truthyCell(v);
      else s[col] = v;
    });
    if (!s.title || s.title.length > 200 || s.artist.length > 200) skipped++;
    else songs.push(s);
  }
  return { songs, skipped };
}
