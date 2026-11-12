import { expect, test, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });

// Requires: `supabase start` (seeded demo channel) + NEXT_PUBLIC_ENABLE_DEV_LOGIN=true
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});
const CHANNEL_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";

async function resetQueue() {
  await admin.from("queue_items").delete().eq("channel_id", CHANNEL_ID);
  await admin.from("rate_limits").delete().like("key", "site-request:%");
  await admin.from("channels").update({ queue_open: true }).eq("id", CHANNEL_ID);
}

async function loginAsStreamer(page: Page, next: string) {
  await page.goto(`/dev/login?next=${encodeURIComponent(next)}`);
  await page.getByTestId("dev-login-submit").click();
  await page.waitForURL(`**${next}`);
}

async function requestFromSongs(page: Page, title: string) {
  await page.goto("/t/demo/songs");
  await page.getByTestId("songs-search").fill(title);
  const row = page.getByTestId("song-row").filter({ hasText: title }).first();
  await row.getByTestId("request-song").click();
  await page.getByTestId("request-form").locator("textarea").fill("e2e note");
  await page.getByTestId("request-submit").click();
  await expect(page.getByText(/posição|position/i)).toBeVisible();
}

test.beforeEach(resetQueue);

test("request → play → next, with realtime updates for viewers", async ({ browser }) => {
  const viewerCtx = await browser.newContext();
  const streamerCtx = await browser.newContext();
  const viewer = await viewerCtx.newPage();
  const streamer = await streamerCtx.newPage();

  // 1. anonymous viewer requests two songs from the site
  await requestFromSongs(viewer, "Wonderwall");
  await requestFromSongs(viewer, "Creep");

  // viewer keeps the queue page open (realtime subscriber)
  await viewer.goto("/t/demo/queue");
  await expect(viewer.getByTestId("realtime-status").first()).toHaveAttribute("data-status", "live");
  await expect(viewer.getByTestId("queue-item")).toHaveCount(2);
  await expect(viewer.getByTestId("now-playing-empty")).toBeVisible();

  // 2. streamer plays the first request
  await loginAsStreamer(streamer, "/t/demo/queue");
  await expect(streamer.getByTestId("queue-item")).toHaveCount(2);
  await streamer.getByTestId("play-first").click();
  await expect(streamer.getByTestId("now-playing-title")).toHaveText("Wonderwall");

  // viewer sees it without reloading
  await expect(viewer.getByTestId("now-playing-title")).toHaveText("Wonderwall");
  await expect(viewer.getByTestId("queue-item")).toHaveCount(1);

  // 3. mark as played / next → history + advance
  await streamer.getByTestId("mark-played-next").click();
  await expect(streamer.getByTestId("now-playing-title")).toHaveText("Creep");
  await expect(viewer.getByTestId("now-playing-title")).toHaveText("Creep");
  await expect(viewer.getByTestId("queue-item")).toHaveCount(0);

  await streamer.goto("/t/demo/history");
  await expect(streamer.getByTestId("history-table").locator("tbody tr").first()).toContainText("Wonderwall");

  // times played was incremented
  const { data: song } = await admin.from("songs").select("times_played, last_played_at").eq("channel_id", CHANNEL_ID).eq("title", "Wonderwall").single();
  expect(song!.last_played_at).not.toBeNull();

  await viewerCtx.close();
  await streamerCtx.close();
});

test("closed queue blocks site requests", async ({ page }) => {
  await admin.from("channels").update({ queue_open: false }).eq("id", CHANNEL_ID);
  await page.goto("/t/demo/songs");
  await expect(page.getByTestId("song-row").first()).toBeVisible();
  await expect(page.getByTestId("request-song")).toHaveCount(0);
  await expect(page.getByTestId("queue-status-badge").first()).toHaveText(/Fechada|Closed/);
});

test("songs ordering is reflected in the URL", async ({ page }) => {
  await page.goto("/t/demo/songs?order_by=lastPlayed&order_dir=asc");
  await expect(page.getByTestId("songs-count")).toHaveText(/50/);
  await page.getByRole("button", { name: /Vezes tocadas|Times played/ }).click();
  await expect(page).toHaveURL(/order_by=timesPlayed&order_dir=asc/);
});
