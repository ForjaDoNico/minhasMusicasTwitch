import type { Database } from "@/lib/database.types";

type T = Database["public"]["Tables"];
export type Channel = T["channels"]["Row"];
export type Song = T["songs"]["Row"];
export type QueueItem = T["queue_items"]["Row"];
export type PlayHistory = T["play_history"]["Row"];
export type BotCommandRow = T["bot_commands"]["Row"];
export type LearningRequest = T["learning_requests"]["Row"];
export type Profile = T["profiles"]["Row"];
export type Tip = T["tips"]["Row"];

export type QueueSong = Pick<Song, "id" | "title" | "artist" | "tags" | "is_premium">;
export type QueueEntry = QueueItem & { song: QueueSong | null };

export interface ChannelSettings {
  maxRequestsPerUser: number;
  preventDuplicates: boolean;
  songCooldownHours: number;
  subscribersOnly: boolean;
  vipsOnly: boolean;
  allowSiteRequests: boolean;
  allowAnonymous: boolean;
  tipPriority: boolean;
  minTipForPriority: number;
  premiumMinTip: number;
  currency: string;
  pixKey: string;
  pixName: string;
  pixCity: string;
  botLanguage: "en" | "pt";
}

export const DEFAULT_SETTINGS: ChannelSettings = {
  maxRequestsPerUser: 2,
  preventDuplicates: true,
  songCooldownHours: 0,
  subscribersOnly: false,
  vipsOnly: false,
  allowSiteRequests: true,
  allowAnonymous: true,
  tipPriority: true,
  minTipForPriority: 5,
  premiumMinTip: 10,
  currency: "BRL",
  pixKey: "",
  pixName: "",
  pixCity: "",
  botLanguage: "en",
};

export function channelSettings(c: Pick<Channel, "settings">): ChannelSettings {
  const s = (c.settings && typeof c.settings === "object" && !Array.isArray(c.settings) ? c.settings : {}) as Partial<ChannelSettings>;
  return { ...DEFAULT_SETTINGS, ...s };
}

export interface Viewer {
  id: string;
  login: string;
  displayName: string;
  avatarUrl: string | null;
  twitchId: string | null;
}

export interface ChannelStats {
  session_id: string | null;
  live: boolean;
  played_session: number;
  requests_session: number;
  tips_session_amount: number;
  tips_session_donors: number;
  requests_total: number;
  songs: number;
  saved: number;
  queued: number;
  commands: number;
  premium: number;
  learning: number;
}

export const QUEUE_SELECT = "*, song:songs(id, title, artist, tags, is_premium)" as const;
