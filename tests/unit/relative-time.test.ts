import { describe, expect, it } from "vitest";
import { formatAgo, formatElapsed } from "@/lib/relative-time";

const now = new Date("2026-06-01T12:00:00Z");
const ago = (sec: number) => new Date(now.getTime() - sec * 1000);

describe("formatElapsed", () => {
  it("handles never", () => {
    expect(formatElapsed(null, "pt-BR", now)).toBe("Nunca");
    expect(formatElapsed(undefined, "en", now)).toBe("Never");
  });
  it("uses one decimal and localized units", () => {
    expect(formatElapsed(ago(3.8 * 7 * 86400), "pt-BR", now)).toBe("3,8 semanas");
    expect(formatElapsed(ago(3.8 * 7 * 86400), "en", now)).toBe("3.8 weeks");
    expect(formatElapsed(ago(2.1 * 30.44 * 86400), "pt-BR", now)).toBe("2,1 meses");
    expect(formatElapsed(ago(2.1 * 30.44 * 86400), "en", now)).toBe("2.1 months");
  });
  it("singular and small units", () => {
    expect(formatElapsed(ago(86400), "en", now)).toBe("1 day");
    expect(formatElapsed(ago(3 * 3600), "pt-BR", now)).toBe("3 horas");
    expect(formatElapsed(ago(10), "en", now)).toBe("just now");
    expect(formatElapsed(ago(400 * 86400), "pt-BR", now)).toBe("1,1 anos");
  });
  it("formatAgo wraps it", () => {
    expect(formatAgo(ago(2 * 86400), "pt-BR", now)).toBe("há 2 dias");
    expect(formatAgo(ago(2 * 86400), "en", now)).toBe("2 days ago");
  });
});
