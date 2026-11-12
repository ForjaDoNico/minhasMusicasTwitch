import { describe, expect, it } from "vitest";
import { findCommand, parseChatCommand, splitNote } from "@/lib/commands";

const cmds = [
  { command: "sr", aliases: ["songRequest", "request"], enabled: true },
  { command: "song", aliases: ["currentSong", "current"], enabled: true },
  { command: "fav", aliases: [], enabled: false },
];

describe("parseChatCommand", () => {
  it("parses trigger and args", () => {
    expect(parseChatCommand("!SR  Wonderwall - Oasis ")).toEqual({ trigger: "sr", args: "Wonderwall - Oasis" });
    expect(parseChatCommand("!song")).toEqual({ trigger: "song", args: "" });
  });
  it("ignores normal chat and malformed commands", () => {
    expect(parseChatCommand("hello !sr x")).toBeNull();
    expect(parseChatCommand("!")).toBeNull();
    expect(parseChatCommand("! sr")).toBeNull();
  });
});

describe("findCommand", () => {
  it("matches names and aliases case-insensitively", () => {
    expect(findCommand(cmds, "sr")?.command).toBe("sr");
    expect(findCommand(cmds, "songrequest")?.command).toBe("sr");
    expect(findCommand(cmds, "CURRENT")?.command).toBe("song");
  });
  it("skips disabled commands", () => {
    expect(findCommand(cmds, "fav")).toBeUndefined();
  });
});

describe("splitNote", () => {
  it("splits on pipe", () => {
    expect(splitNote("creep | for my sister")).toEqual({ query: "creep", note: "for my sister" });
    expect(splitNote("creep")).toEqual({ query: "creep", note: null });
  });
});
