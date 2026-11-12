import { describe, expect, it } from "vitest";
import { csvToSongs, parseCsv } from "@/lib/csv";
import { crc16, pixPayload } from "@/lib/pix";
import { isFreshTimestamp, signEventSub, verifyEventSubSignature } from "@/lib/twitch/signature";

describe("csv", () => {
  it("parses quotes and escaped quotes", () => {
    expect(parseCsv('a,"b, c","say ""hi"""\r\n1,2,3\n')).toEqual([["a", "b, c", 'say "hi"'], ["1", "2", "3"]]);
  });
  it("detects ; delimiter", () => {
    expect(parseCsv("a;b\n1;2")).toEqual([["a", "b"], ["1", "2"]]);
  });
  it("maps headers (pt/en) to songs", () => {
    const { songs, skipped } = csvToSongs("Título,Artista,Tags,Nova\nTrem-Bala,Ana Vilela,MPB|Acústico,sim\n,Sem titulo,,\n");
    expect(songs).toEqual([{ title: "Trem-Bala", artist: "Ana Vilela", tags: ["MPB", "Acústico"], is_new: true, is_premium: false }]);
    expect(skipped).toBe(1);
  });
  it("works without header", () => {
    expect(csvToSongs("Creep,Radiohead").songs[0]).toMatchObject({ title: "Creep", artist: "Radiohead" });
  });
});

describe("pix", () => {
  it("crc16-ccitt matches the reference value", () => {
    expect(crc16("123456789")).toBe("29B1");
  });
  it("builds a payload ending in a valid CRC", () => {
    const p = pixPayload({ key: "streamer@example.com", name: "João Streamer", city: "São Paulo", amount: 10 });
    expect(p.startsWith("000201")).toBe(true);
    expect(p).toContain("5405" + "10.00");
    expect(p).toContain("5913Joao Streamer");
    expect(p.slice(-4)).toBe(crc16(p.slice(0, -4)));
  });
});

describe("eventsub signature", () => {
  const secret = "s3cret-s3cret";
  const body = JSON.stringify({ hello: "world" });
  it("accepts a valid signature", () => {
    const sig = signEventSub(secret, "id1", "2026-01-01T00:00:00Z", body);
    expect(verifyEventSubSignature(secret, "id1", "2026-01-01T00:00:00Z", body, sig)).toBe(true);
  });
  it("rejects tampered bodies or wrong secret", () => {
    const sig = signEventSub(secret, "id1", "t", body);
    expect(verifyEventSubSignature(secret, "id1", "t", body + " ", sig)).toBe(false);
    expect(verifyEventSubSignature("other", "id1", "t", body, sig)).toBe(false);
    expect(verifyEventSubSignature(secret, "id1", "t", body, "sha256=00")).toBe(false);
  });
  it("checks freshness", () => {
    const now = Date.parse("2026-01-01T00:20:00Z");
    expect(isFreshTimestamp("2026-01-01T00:15:00Z", now)).toBe(true);
    expect(isFreshTimestamp("2026-01-01T00:05:00Z", now)).toBe(false);
  });
});
