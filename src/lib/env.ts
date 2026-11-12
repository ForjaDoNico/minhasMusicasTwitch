// Centralized environment access. Public vars must be referenced literally so Next can inline them.
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
export const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
export const DEV_LOGIN_ENABLED = process.env.NEXT_PUBLIC_ENABLE_DEV_LOGIN === "true";

export function serverEnv() {
  return {
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
    twitchClientId: process.env.TWITCH_CLIENT_ID ?? "",
    twitchClientSecret: process.env.TWITCH_CLIENT_SECRET ?? "",
    eventsubSecret: process.env.TWITCH_EVENTSUB_SECRET ?? "",
    botUserId: process.env.TWITCH_BOT_USER_ID ?? "",
    botLogin: (process.env.TWITCH_BOT_LOGIN ?? "").toLowerCase(),
    botDryRun: process.env.BOT_DRY_RUN === "true",
    cronSecret: process.env.CRON_SECRET ?? "",
  };
}
