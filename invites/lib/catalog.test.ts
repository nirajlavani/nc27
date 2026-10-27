import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { readCatalog } from "./catalog";
import { createMediaGet, resolveMediaPath } from "./media";

const temps: string[] = [];

function tempRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "nc27-catalog-"));
  temps.push(root);
  return root;
}

function writeIteration(
  root: string,
  id: string,
  body: unknown,
  files?: Record<string, string>,
) {
  const dir = path.join(root, id);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "descriptor.json"), JSON.stringify(body));
  for (const [name, contents] of Object.entries(files ?? {})) {
    fs.writeFileSync(path.join(dir, name), contents);
  }
}

afterEach(() => {
  for (const root of temps.splice(0)) fs.rmSync(root, { recursive: true, force: true });
});

describe("readCatalog", () => {
  it("lists a french-door letter", () => {
    const root = tempRoot();
    writeIteration(root, "doors", {
      id: "doors",
      title: "Doors",
      construction: "french-door",
      cards: [{ role: "letter", text: "Welcome" }],
    });
    const catalog = readCatalog(root);
    expect(catalog.iterations).toEqual([
      {
        id: "doors",
        title: "Doors",
        construction: "french-door",
        cards: [{ role: "letter", text: "Welcome" }],
      },
    ]);
    expect(catalog.skipped).toBe(0);
  });

  it("lists three unique roles", () => {
    const root = tempRoot();
    writeIteration(root, "full", {
      id: "full",
      title: "Full",
      construction: "envelope",
      cards: [{ role: "letter", text: "Hi" }, { role: "qr" }, { role: "theme" }],
    });
    expect(readCatalog(root).iterations[0].cards.map((card) => card.role)).toEqual([
      "letter",
      "qr",
      "theme",
    ]);
  });

  it("lists four cards with a note, and reads the group, cover, band, and seal", () => {
    const root = tempRoot();
    writeIteration(root, "bound", {
      id: "bound",
      title: "Bound",
      group: "Spring",
      construction: "envelope",
      cover: { image: "cover.png" },
      band: { image: "../band.png", text: "NC27" },
      seal: { image: "seal.webp" },
      cards: [{ role: "letter", text: "Hi" }, { role: "theme" }, { role: "qr" }, { role: "note" }],
    });
    writeIteration(root, "plain-band", {
      id: "plain-band",
      title: "Plain band",
      construction: "booklet",
      band: true,
      cards: [{ role: "letter", text: "Hi" }],
    });
    const [bound, plain] = readCatalog(root).iterations;
    expect(bound.cards).toHaveLength(4);
    expect(bound.group).toBe("Spring");
    expect(bound.cover).toEqual({ image: "cover.png" });
    expect(bound.band).toEqual({ text: "NC27" });
    expect(bound.seal).toEqual({ image: "seal.webp" });
    expect(plain.band).toEqual({});
    expect(plain.group).toBeUndefined();
  });

  it("keeps the first iteration when a second is added", () => {
    const root = tempRoot();
    writeIteration(root, "a", {
      id: "a",
      title: "Alpha",
      construction: "booklet",
      cards: [{ role: "letter", text: "A" }],
    });
    const before = readCatalog(root).iterations[0];
    writeIteration(root, "b", {
      id: "b",
      title: "Beta",
      construction: "belly-band",
      cards: [{ role: "theme" }],
    });
    const after = readCatalog(root);
    expect(after.iterations.map((item) => item.id)).toEqual(["a", "b"]);
    expect(after.iterations[0]).toEqual(before);
  });

  it("sorts by title, then id", () => {
    const root = tempRoot();
    writeIteration(root, "b", {
      id: "b",
      title: "Same",
      construction: "envelope",
      cards: [{ role: "letter", text: "B" }],
    });
    writeIteration(root, "a", {
      id: "a",
      title: "Same",
      construction: "envelope",
      cards: [{ role: "letter", text: "A" }],
    });
    writeIteration(root, "c", {
      id: "c",
      title: "Earlier",
      construction: "envelope",
      cards: [{ role: "letter", text: "C" }],
    });
    expect(readCatalog(root).iterations.map((item) => item.id)).toEqual(["c", "a", "b"]);
  });

  it("skips zero cards, five cards, a repeated role, an unknown construction, a mismatched id, a missing descriptor, and broken JSON", () => {
    const root = tempRoot();
    writeIteration(root, "empty-cards", {
      id: "empty-cards",
      title: "Empty",
      construction: "envelope",
      cards: [],
    });
    writeIteration(root, "too-many", {
      id: "too-many",
      title: "Many",
      construction: "envelope",
      cards: [
        { role: "letter", text: "1" },
        { role: "qr" },
        { role: "theme" },
        { role: "note" },
        { role: "letter", text: "2" },
      ],
    });
    writeIteration(root, "dup", {
      id: "dup",
      title: "Dup",
      construction: "envelope",
      cards: [
        { role: "letter", text: "1" },
        { role: "letter", text: "2" },
      ],
    });
    writeIteration(root, "scroll", {
      id: "scroll",
      title: "Scroll",
      construction: "scroll",
      cards: [{ role: "letter", text: "Hi" }],
    });
    writeIteration(root, "wrong-id", {
      id: "other",
      title: "Wrong",
      construction: "envelope",
      cards: [{ role: "letter", text: "Hi" }],
    });
    fs.mkdirSync(path.join(root, "no-file"));
    const broken = path.join(root, "broken");
    fs.mkdirSync(broken);
    fs.writeFileSync(path.join(broken, "descriptor.json"), "{");
    fs.writeFileSync(path.join(root, "loose.txt"), "ignore");

    const catalog = readCatalog(root);
    expect(catalog.iterations).toEqual([]);
    expect(catalog.skipped).toBe(7);
  });

  it("returns an empty list when the iterations directory is missing", () => {
    expect(readCatalog(path.join(tempRoot(), "missing"))).toEqual({
      iterations: [],
      skipped: 0,
    });
  });

  it("drops unsafe image paths and keeps a basename", () => {
    const root = tempRoot();
    writeIteration(root, "pics", {
      id: "pics",
      title: "Pics",
      construction: "envelope",
      cards: [
        { role: "letter", text: "Hi", image: "../secret.png" },
        { role: "theme", image: "assets/mark.png" },
        { role: "qr", image: "card.png" },
      ],
    });
    const cards = readCatalog(root).iterations[0].cards;
    expect(cards[0].image).toBeUndefined();
    expect(cards[1].image).toBeUndefined();
    expect(cards[2].image).toBe("card.png");
  });

  it("skips a truncated descriptor and leaves a complete sibling unchanged", () => {
    const root = tempRoot();
    writeIteration(root, "good", {
      id: "good",
      title: "Good",
      construction: "booklet",
      cards: [{ role: "letter", text: "Stay" }],
    });
    const broken = path.join(root, "partial");
    fs.mkdirSync(broken);
    fs.writeFileSync(path.join(broken, "descriptor.json"), '{"id":');
    const catalog = readCatalog(root);
    expect(catalog.skipped).toBe(1);
    expect(catalog.iterations).toEqual([
      {
        id: "good",
        title: "Good",
        construction: "booklet",
        cards: [{ role: "letter", text: "Stay" }],
      },
    ]);
  });
});

describe("media route", () => {
  it("returns a named image and refuses paths outside the iteration", async () => {
    const root = tempRoot();
    const dir = path.join(root, "french-door");
    fs.mkdirSync(dir);
    fs.writeFileSync(path.join(dir, "card.png"), "png-bytes");
    fs.writeFileSync(path.join(dir, "descriptor.json"), "{}");

    const get = createMediaGet(root);
    const ok = await get(new Request("http://localhost/media/french-door/card.png"), {
      params: Promise.resolve({ id: "french-door", file: "card.png" }),
    });
    expect(ok.status).toBe(200);
    expect(await ok.text()).toBe("png-bytes");

    const escaped = await get(new Request("http://localhost/media/french-door/escape"), {
      params: Promise.resolve({ id: "french-door", file: "../descriptor.json" }),
    });
    expect(escaped.status).toBe(404);

    const moodboard = await get(new Request("http://localhost/media/mood"), {
      params: Promise.resolve({ id: "../moodboard", file: "card.png" }),
    });
    expect(moodboard.status).toBe(404);
    expect(resolveMediaPath(root, "french-door", "../descriptor.json")).toBeNull();
  });
});
