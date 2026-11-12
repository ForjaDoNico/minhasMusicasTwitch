import { describe, expect, it } from "vitest";
import { matchSong, normalize, rankSongs } from "@/lib/fuzzy";

const songs = [
  { id: "1", title: "Águas de Março", artist: "Elis Regina & Tom Jobim" },
  { id: "2", title: "Wonderwall", artist: "Oasis" },
  { id: "3", title: "Don't Look Back in Anger", artist: "Oasis" },
  { id: "4", title: "Yesterday", artist: "The Beatles" },
  { id: "5", title: "Let It Be", artist: "The Beatles" },
  { id: "6", title: "Here Comes the Sun", artist: "The Beatles" },
  { id: "7", title: "Tempo Perdido", artist: "Legião Urbana" },
  { id: "8", title: "Pais e Filhos", artist: "Legião Urbana" },
];

describe("normalize", () => {
  it("strips accents, case and punctuation", () => {
    expect(normalize("Águas de MARÇO!")).toBe("aguas de marco");
    expect(normalize("Simon & Garfunkel")).toBe("simon and garfunkel");
  });
});

describe("matchSong", () => {
  it("matches ignoring accents and case", () => {
    expect(matchSong("aguas de marco", songs)).toEqual({ kind: "match", song: songs[0] });
  });
  it("tolerates typos", () => {
    const r = matchSong("wonderwal", songs);
    expect(r.kind).toBe("match");
    if (r.kind === "match") expect(r.song.id).toBe("2");
  });
  it("accepts 'title - artist'", () => {
    const r = matchSong("tempo perdido - legiao urbana", songs);
    expect(r.kind === "match" && r.song.id).toBe("7");
  });
  it("returns up to 3 options when ambiguous", () => {
    const r = matchSong("beatles", songs);
    expect(r.kind).toBe("ambiguous");
    if (r.kind === "ambiguous") {
      expect(r.options.length).toBeLessThanOrEqual(3);
      expect(r.options.every((s) => s.artist === "The Beatles")).toBe(true);
    }
  });
  it("returns none for unknown songs", () => {
    expect(matchSong("bohemian rhapsody", songs).kind).toBe("none");
  });
  it("ranks exact title first", () => {
    expect(rankSongs("yesterday", songs)[0].item.id).toBe("4");
  });
});
