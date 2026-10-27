import fs from "node:fs";
import path from "node:path";
import {
  CARD_SLOTS,
  CONSTRUCTIONS,
  DEFAULT_GROUP,
  SHAPES,
  SLOT_ROLE,
  UNITS,
  UPLOAD_SLOTS,
  readSize,
  type Art,
  type Card,
  type CardSlot,
  type Shape,
  type Size,
  type SizedSlot,
  type Unit,
  type UploadSlot,
} from "./cards";
import { readCatalog, type Iteration } from "./catalog";

// Each drop area is saved as `<slot>.<ext>` in the invitation's folder, so replacing a
// slot replaces one file.
const SLOTS = UPLOAD_SLOTS;
type Slot = UploadSlot;

const MAX_BYTES = 20 * 1024 * 1024;

export type SaveResult = { ok: true; id: string } | { ok: false; status: number; error: string };

export async function saveInvitation(root: string, form: FormData, editId?: string): Promise<SaveResult> {
  const title = text(form, "title");
  const group = text(form, "group");
  const construction = text(form, "construction") || "envelope";
  const wording = text(form, "wording");
  const banded = text(form, "bound") === "on";
  const remove = new Set(form.getAll("remove").map(String));

  if (!title) return fail(400, "Give the invitation a title.");
  if (!group) return fail(400, "Choose a group or name a new one.");
  if (group.toLowerCase() === DEFAULT_GROUP.toLowerCase()) {
    return fail(400, `The ${DEFAULT_GROUP} group holds the starter invitations. Choose or name another group.`);
  }
  if (!(CONSTRUCTIONS as readonly string[]).includes(construction)) return fail(400, "Unknown construction.");

  const uploads = new Map<Slot, { bytes: Buffer; ext: string }>();
  for (const slot of SLOTS) {
    const value = form.get(slot);
    if (!value || typeof value === "string" || value.size === 0) continue;
    if (value.size > MAX_BYTES) return fail(400, `${slot} is larger than 20 MB.`);
    const bytes = Buffer.from(await value.arrayBuffer());
    const ext = imageExtension(bytes);
    if (!ext) return fail(400, `${slot} is not a PNG, JPEG, WebP, or GIF image.`);
    uploads.set(slot, { bytes, ext });
  }

  let previous: Iteration | undefined;
  let id: string;
  if (editId) {
    previous = readCatalog(root).iterations.find((item) => item.id === editId);
    if (!previous) return fail(404, "That invitation is not in the catalog.");
    if ((previous.group ?? DEFAULT_GROUP) === DEFAULT_GROUP) {
      return fail(403, `Invitations in ${DEFAULT_GROUP} are edited as files, not from the page.`);
    }
    id = editId;
  } else {
    id = freeId(root, title);
  }

  // Sizes are optional, in one unit for the whole invitation. Empty fields clear a size.
  const unitField = text(form, "unit");
  const unit = (UNITS as readonly string[]).includes(unitField) ? (unitField as Unit) : undefined;
  const sizeOf = (slot: SizedSlot): Size | undefined => {
    const w = Number(text(form, `w-${slot}`));
    const h = Number(text(form, `h-${slot}`));
    if (!text(form, `w-${slot}`) && !text(form, `h-${slot}`)) return undefined;
    // A round seal or a square card can be given by one number.
    return readSize({ w: w || h, h: h || w });
  };
  const shapeOf = (slot: CardSlot): Shape | undefined => {
    const shape = text(form, `shape-${slot}`);
    return (SHAPES as readonly string[]).includes(shape) && shape !== "rect" ? (shape as Shape) : undefined;
  };

  // Work out the cards: keep what was there, replace uploaded slots, drop removed ones.
  const cards: Card[] = [];
  for (const slot of CARD_SLOTS) {
    const role = SLOT_ROLE[slot];
    const before = previous?.cards.find((card) => card.role === role);
    const upload = uploads.get(slot);
    if (remove.has(slot) && !upload) continue;
    if (!upload && !before) continue;
    const card: Card = { ...(before ?? { role }) };
    if (upload) card.image = `${slot}.${upload.ext}`;
    if (role === "letter" && wording) card.text = wording;
    if (role === "letter" && !card.text) card.text = title;
    const size = sizeOf(slot);
    if (size) card.size = size;
    else delete card.size;
    const shape = shapeOf(slot);
    if (shape) card.shape = shape;
    else delete card.shape;
    cards.push(card);
  }
  if (cards.length === 0) return fail(400, "Add at least one card image.");

  const dir = path.join(root, id);
  fs.mkdirSync(dir, { recursive: true });

  const FIELD = {
    cover: "cover",
    "cover-back": "coverBack",
    "inner-flap": "innerFlap",
    band: "band",
    seal: "seal",
  } as const;
  const art = (slot: keyof typeof FIELD): Art | undefined => {
    const upload = uploads.get(slot);
    const before = previous?.[FIELD[slot]];
    const result: Art = {};
    if (upload) result.image = `${slot}.${upload.ext}`;
    else if (!remove.has(slot) && before?.image) result.image = before.image;
    if (slot === "band" && before?.text) result.text = before.text;
    const size = slot === "cover" || slot === "band" || slot === "seal" ? sizeOf(slot) : undefined;
    if (size) result.size = size;
    return Object.keys(result).length > 0 ? result : undefined;
  };

  const descriptor: Record<string, unknown> = { id, title, group, construction };
  const cover = art("cover");
  const coverBack = art("cover-back");
  const innerFlap = art("inner-flap");
  const bandArt = art("band");
  const seal = art("seal");
  const sized = [cover, bandArt, seal].some((item) => item?.size) || cards.some((card) => card.size);
  if (sized) descriptor.unit = unit ?? "in";
  if (cover) descriptor.cover = cover;
  if (coverBack) descriptor.coverBack = coverBack;
  if (innerFlap) descriptor.innerFlap = innerFlap;
  if (banded || bandArt?.image) descriptor.band = bandArt ?? {};
  if (seal) descriptor.seal = seal;
  descriptor.cards = cards;

  // Remove the old file for any slot that was replaced with a different type, or removed.
  const keep = new Set<string>(["descriptor.json"]);
  for (const card of cards) if (card.image) keep.add(card.image);
  for (const item of [cover, coverBack, innerFlap, bandArt, seal]) if (item?.image) keep.add(item.image);
  for (const entry of fs.readdirSync(dir)) {
    const slot = entry.replace(/\.[^.]+$/, "");
    if ((SLOTS as readonly string[]).includes(slot) && !keep.has(entry)) fs.rmSync(path.join(dir, entry));
  }

  for (const [slot, upload] of uploads) {
    fs.writeFileSync(path.join(dir, `${slot}.${upload.ext}`), upload.bytes);
  }
  const target = path.join(dir, "descriptor.json");
  fs.writeFileSync(`${target}.tmp`, `${JSON.stringify(descriptor, null, 2)}\n`);
  fs.renameSync(`${target}.tmp`, target);
  return { ok: true, id };
}

export function slugify(title: string) {
  const slug = title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
    .replace(/-+$/, "");
  return slug || "invitation";
}

// A new invitation always gets a new folder; an existing one is never reused.
function freeId(root: string, title: string) {
  const base = slugify(title);
  let id = base;
  for (let n = 2; fs.existsSync(path.join(root, id)); n += 1) id = `${base}-${n}`;
  return id;
}

// Decide the type from the file's first bytes, not from its name.
export function imageExtension(bytes: Buffer): string | null {
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return "png";
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpg";
  if (bytes.length >= 6 && /^GIF8[79]a$/.test(bytes.subarray(0, 6).toString("latin1"))) return "gif";
  if (
    bytes.length >= 12 &&
    bytes.subarray(0, 4).toString("latin1") === "RIFF" &&
    bytes.subarray(8, 12).toString("latin1") === "WEBP"
  ) {
    return "webp";
  }
  return null;
}

function text(form: FormData, key: string) {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function fail(status: number, error: string): SaveResult {
  return { ok: false, status, error };
}
