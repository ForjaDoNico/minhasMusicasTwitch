import { describe, expect, it } from "vitest";
import { renderTemplate, validateTemplate } from "@/lib/template";

describe("renderTemplate", () => {
  it("substitutes variables", () => {
    expect(renderTemplate("{{song}} added to queue at position: {{position}}", { song: "Creep", position: 3 }))
      .toBe("Creep added to queue at position: 3");
  });
  it("supports if/else and unless", () => {
    const t = "{{#if song}}Last: {{song}}{{else}}Nothing{{/if}}";
    expect(renderTemplate(t, { song: "X" })).toBe("Last: X");
    expect(renderTemplate(t, {})).toBe("Nothing");
    expect(renderTemplate("{{#unless n}}zero{{/unless}}", { n: 0 })).toBe("zero");
  });
  it("supports select with empty branch", () => {
    const t = "{{#select now_playing 1}}Now: {{song}} by {{requester}}{{#empty}}Nothing playing{{/select}}";
    expect(renderTemplate(t, { now_playing: [{ song: "A", requester: "bob" }] })).toBe("Now: A by bob");
    expect(renderTemplate(t, { now_playing: [] })).toBe("Nothing playing");
  });
  it("select iterates N items with index and outer scope", () => {
    const t = "{{#select queue 2}}{{@number}}. {{song}} ({{user}}){{/select}}";
    expect(renderTemplate(t, { user: "me", queue: [{ song: "A" }, { song: "B" }, { song: "C" }] }))
      .toBe("1. A (me), 2. B (me)");
  });
  it("nested if inside select uses item scope", () => {
    const t = "{{#select now_playing 1}}{{song}}{{#if note}} — {{note}}{{/if}}{{/select}}";
    expect(renderTemplate(t, { now_playing: [{ song: "A", note: "for mom" }] })).toBe("A — for mom");
    expect(renderTemplate(t, { now_playing: [{ song: "A" }] })).toBe("A");
  });
  it("dot paths and missing values", () => {
    expect(renderTemplate("{{a.b}}-{{missing}}", { a: { b: 1 } })).toBe("1-");
  });
  it("validates", () => {
    expect(validateTemplate("{{#if x}}open")).toMatch(/Unclosed/);
    expect(validateTemplate("{{/select}}")).toMatch(/Unexpected/);
    expect(validateTemplate("{{#empty}}")).toMatch(/outside/);
    expect(validateTemplate("ok {{x}}")).toBeNull();
  });
});
