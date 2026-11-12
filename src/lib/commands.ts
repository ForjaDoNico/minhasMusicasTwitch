import type { Database } from "@/lib/database.types";

export type BotCommand = Database["public"]["Tables"]["bot_commands"]["Row"];
export type BotAction = Database["public"]["Enums"]["bot_action"];

export interface ParsedCommand {
  trigger: string; // lower-cased, without "!"
  args: string;
}

/** "!SR  wonderwall - oasis" → { trigger: "sr", args: "wonderwall - oasis" } */
export function parseChatCommand(text: string, prefix = "!"): ParsedCommand | null {
  const trimmed = text.trim();
  if (!trimmed.startsWith(prefix)) return null;
  const m = trimmed.slice(prefix.length).match(/^([A-Za-z0-9_]+)(?:\s+([\s\S]*))?$/);
  if (!m) return null;
  return { trigger: m[1].toLowerCase(), args: (m[2] ?? "").trim() };
}

/** Find an enabled command by name or alias (case-insensitive). */
export function findCommand<T extends Pick<BotCommand, "command" | "aliases" | "enabled">>(
  commands: T[],
  trigger: string,
): T | undefined {
  const t = trigger.toLowerCase();
  return commands.find(
    (c) => c.enabled && (c.command.toLowerCase() === t || c.aliases.some((a) => a.toLowerCase() === t)),
  );
}

/** Split "song name | note" (note after a pipe) used by !sr. */
export function splitNote(args: string): { query: string; note: string | null } {
  const i = args.indexOf("|");
  if (i === -1) return { query: args.trim(), note: null };
  return { query: args.slice(0, i).trim(), note: args.slice(i + 1).trim() || null };
}

export const ACTIONS: BotAction[] = [
  "REQUEST", "REMOVE_LAST", "REPLACE_LAST", "CURRENT_SONG", "NEXT_SONG", "LAST_SONG", "PLAYED_TODAY",
  "HAS_SONG", "LAST_PLAYED", "SONG_DETAILS", "FAVORITE", "UNFAVORITE", "SONGLIST_LINK", "QUEUE_LINK",
  "COMMANDS_LINK", "CUSTOM",
];

/** Variables available in templates, per action (shown in the editor). */
export const TEMPLATE_VARIABLES: Record<BotAction, string[]> = {
  REQUEST: ["song", "title", "artist", "position", "user"],
  REMOVE_LAST: ["song", "position", "user"],
  REPLACE_LAST: ["song", "previous_song", "position", "user"],
  CURRENT_SONG: ["now_playing[song, requester, note]", "user"],
  NEXT_SONG: ["queue[song, requester, position]", "user"],
  LAST_SONG: ["song", "requester", "user"],
  PLAYED_TODAY: ["count", "user"],
  HAS_SONG: ["song", "query", "user"],
  LAST_PLAYED: ["song", "time_ago", "query", "user"],
  SONG_DETAILS: ["now_playing[song, requester, note]", "user"],
  FAVORITE: ["song", "user"],
  UNFAVORITE: ["song", "user"],
  SONGLIST_LINK: ["songlist_link", "user"],
  QUEUE_LINK: ["queue_link", "user"],
  COMMANDS_LINK: ["commands_link", "user"],
  CUSTOM: ["user", "channel", "queue_link", "songlist_link", "commands_link", "now_playing", "queue"],
};
