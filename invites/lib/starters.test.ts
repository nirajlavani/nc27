import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { readCatalog } from "./catalog";

const root = path.join(process.cwd(), "iterations");
// The four folders that ship with the studio. Folders added later are not starters.
const STARTERS = ["belly-band", "booklet", "envelope", "french-door"];

describe("starter iterations", () => {
  it("lists one of each construction and the required card cases", () => {
    const catalog = readCatalog(root);
    const starters = catalog.iterations.filter((item) => STARTERS.includes(item.id));
    expect(starters.map((item) => item.construction).sort()).toEqual([
      "belly-band",
      "booklet",
      "envelope",
      "french-door",
    ]);
    const cards = starters.flatMap((item) => item.cards);
    expect(cards.filter((card) => card.role === "letter").every((card) => card.text)).toBe(true);
    expect(cards.some((card) => !card.image)).toBe(true);
    expect(cards.some((card) => card.role === "qr" && card.url?.startsWith("https://"))).toBe(true);
    expect(cards.some((card) => card.role === "qr" && !card.url)).toBe(true);
    const copy = JSON.stringify(starters);
    const years = copy.match(/\b20\d{2}\b/g) ?? [];
    expect(years.every((year) => year === "2026")).toBe(true);
  });

  it("does not list a moodboard file", () => {
    const scratch = path.join(os.tmpdir(), `nc27-mood-${process.pid}.txt`);
    const mood = path.join(process.cwd(), "moodboard", "not-an-invite.txt");
    fs.writeFileSync(mood, "inspiration");
    fs.writeFileSync(scratch, "marker");
    const titles = readCatalog(root).iterations.map((item) => item.title);
    expect(titles).not.toContain("not-an-invite.txt");
    expect(titles).not.toContain("inspiration");
    fs.rmSync(mood);
    fs.rmSync(scratch);
  });
});
