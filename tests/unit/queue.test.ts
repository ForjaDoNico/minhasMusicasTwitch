import { describe, expect, it } from "vitest";
import { arrayMove, insertionPosition, moveToTop, renumber, sortQueue } from "@/lib/queue";

const q = [
  { id: "a", position: 2, created_at: "2026-01-01T00:00:02Z" },
  { id: "b", position: 1, created_at: "2026-01-01T00:00:01Z", is_priority: true },
  { id: "c", position: 3, created_at: "2026-01-01T00:00:03Z" },
];

describe("queue helpers", () => {
  it("sorts by position then creation", () => {
    expect(sortQueue(q).map((i) => i.id)).toEqual(["b", "a", "c"]);
  });
  it("moves items (drag and drop)", () => {
    expect(arrayMove(["a", "b", "c", "d"], 3, 1)).toEqual(["a", "d", "b", "c"]);
    expect(arrayMove(["a", "b", "c"], 0, 2)).toEqual(["b", "c", "a"]);
  });
  it("renumbers 1..n", () => {
    expect(renumber(sortQueue(q)).map((i) => i.position)).toEqual([1, 2, 3]);
  });
  it("move to top", () => {
    expect(moveToTop(q, "c").map((i) => [i.id, i.position])).toEqual([["c", 1], ["b", 2], ["a", 3]]);
  });
  it("priority insertion goes after other priority items", () => {
    expect(insertionPosition(q, false)).toBe(4);
    expect(insertionPosition(q, true)).toBe(2);
    expect(insertionPosition([], true)).toBe(1);
  });
});
