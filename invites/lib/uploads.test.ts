// @vitest-environment node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { readCatalog } from "./catalog";
import { imageExtension, saveInvitation, slugify } from "./uploads";

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const JPG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0]);
const temps: string[] = [];

function tempRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "nc27-upload-"));
  temps.push(root);
  return root;
}

function form(fields: Record<string, string | string[]>, files: Record<string, Buffer> = {}) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    for (const item of Array.isArray(value) ? value : [value]) data.append(key, item);
  }
  for (const [key, bytes] of Object.entries(files)) data.append(key, new File([new Uint8Array(bytes)], `${key}.bin`));
  return data;
}

afterEach(() => {
  for (const root of temps.splice(0)) fs.rmSync(root, { recursive: true, force: true });
});

describe("saveInvitation", () => {
  it("creates a new folder that the catalog lists in its group", async () => {
    const root = tempRoot();
    const result = await saveInvitation(
      root,
      form(
        { title: "Garden Suite", group: "Spring", construction: "envelope", bound: "on" },
        { cover: PNG, "card-1": PNG, "card-4": JPG, seal: PNG },
      ),
    );
    expect(result).toEqual({ ok: true, id: "garden-suite" });
    const [item] = readCatalog(root).iterations;
    expect(item.group).toBe("Spring");
    expect(item.cards.map((card) => [card.role, card.image])).toEqual([
      ["letter", "card-1.png"],
      ["note", "card-4.jpg"],
    ]);
    expect(item.cover).toEqual({ image: "cover.png" });
    expect(item.band).toEqual({});
    expect(item.seal).toEqual({ image: "seal.png" });
    expect(fs.existsSync(path.join(root, "garden-suite", "card-4.jpg"))).toBe(true);
  });

  it("saves sizes, shapes, the cover back, and the inner flap", async () => {
    const root = tempRoot();
    const result = await saveInvitation(
      root,
      form(
        {
          title: "Sized",
          group: "A",
          unit: "in",
          "w-cover": "9",
          "h-cover": "6.25",
          "w-card-1": "7",
          "h-card-1": "5",
          "w-card-2": "2",
          "shape-card-2": "circle",
          "shape-card-1": "rect",
          "w-seal": "1",
        },
        { "card-1": PNG, "card-2": PNG, "cover-back": PNG, "inner-flap": JPG },
      ),
    );
    expect(result.ok).toBe(true);
    const [item] = readCatalog(root).iterations;
    expect(item.unit).toBe("in");
    expect(item.cover).toEqual({ size: { w: 9, h: 6.25 } });
    expect(item.coverBack).toEqual({ image: "cover-back.png" });
    expect(item.innerFlap).toEqual({ image: "inner-flap.jpg" });
    expect(item.seal).toEqual({ size: { w: 1, h: 1 } });
    expect(item.cards[0]).toMatchObject({ size: { w: 7, h: 5 } });
    expect(item.cards[0].shape).toBeUndefined();
    expect(item.cards[1]).toMatchObject({ size: { w: 2, h: 2 }, shape: "circle" });
  });

  it("never reuses an existing folder for a new invitation", async () => {
    const root = tempRoot();
    await saveInvitation(root, form({ title: "Twin", group: "A" }, { "card-1": PNG }));
    const second = await saveInvitation(root, form({ title: "Twin", group: "A" }, { "card-1": PNG }));
    expect(second).toEqual({ ok: true, id: "twin-2" });
  });

  it("replaces one slot and removes another on edit", async () => {
    const root = tempRoot();
    await saveInvitation(root, form({ title: "Edit me", group: "A" }, { "card-1": PNG, "card-2": PNG }));
    const result = await saveInvitation(
      root,
      form({ title: "Edit me", group: "A", remove: ["card-2"] }, { "card-1": JPG }),
      "edit-me",
    );
    expect(result.ok).toBe(true);
    const [item] = readCatalog(root).iterations;
    expect(item.cards.map((card) => card.image)).toEqual(["card-1.jpg"]);
    expect(fs.readdirSync(path.join(root, "edit-me")).sort()).toEqual(["card-1.jpg", "descriptor.json"]);
  });

  it("refuses the Default group, no cards, and files that are not images", async () => {
    const root = tempRoot();
    expect(await saveInvitation(root, form({ title: "X", group: "Default" }, { "card-1": PNG }))).toMatchObject({
      ok: false,
      status: 400,
    });
    expect(await saveInvitation(root, form({ title: "X", group: "A" }, { cover: PNG }))).toMatchObject({
      ok: false,
      error: "Add at least one card image.",
    });
    expect(
      await saveInvitation(root, form({ title: "X", group: "A" }, { "card-1": Buffer.from("<svg/>") })),
    ).toMatchObject({ ok: false, status: 400 });
    expect(fs.readdirSync(root)).toEqual([]);
  });

  it("will not edit a Default invitation", async () => {
    const root = tempRoot();
    const dir = path.join(root, "starter");
    fs.mkdirSync(dir);
    fs.writeFileSync(
      path.join(dir, "descriptor.json"),
      JSON.stringify({ id: "starter", title: "S", construction: "booklet", cards: [{ role: "letter", text: "Hi" }] }),
    );
    const result = await saveInvitation(root, form({ title: "S", group: "A" }, { "card-1": PNG }), "starter");
    expect(result).toMatchObject({ ok: false, status: 403 });
  });
});

describe("helpers", () => {
  it("makes folder names from titles and reads image types from bytes", () => {
    expect(slugify("Atelier Suite — 2026!")).toBe("atelier-suite-2026");
    expect(slugify("../../etc")).toBe("etc");
    expect(slugify("✦")).toBe("invitation");
    expect(imageExtension(PNG)).toBe("png");
    expect(imageExtension(JPG)).toBe("jpg");
    expect(imageExtension(Buffer.from("GIF89a...."))).toBe("gif");
    expect(imageExtension(Buffer.from("RIFF0000WEBPVP8 "))).toBe("webp");
    expect(imageExtension(Buffer.from("hello"))).toBeNull();
  });
});
