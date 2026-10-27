import fs from "node:fs";
import path from "node:path";
import {
  CONSTRUCTIONS,
  MAX_CARDS,
  ROLES,
  SHAPES,
  UNITS,
  readSize,
  type Art,
  type Card,
  type Construction,
  type Role,
  type Shape,
  type Unit,
} from "./cards";

const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "webp", "gif"]);

export type { Art, Card, Construction, Role };

export type Iteration = {
  id: string;
  title: string;
  construction: Construction;
  cards: Card[];
  // Present only when the descriptor sets them.
  group?: string;
  unit?: Unit;
  cover?: Art;
  coverBack?: Art;
  innerFlap?: Art;
  band?: Art;
  seal?: Art;
};

export type Catalog = {
  iterations: Iteration[];
  skipped: number;
};

export function iterationsRoot() {
  return path.join(process.cwd(), "iterations");
}

export function readCatalog(root = iterationsRoot()): Catalog {
  if (!fs.existsSync(/* turbopackIgnore: true */ root)) {
    return { iterations: [], skipped: 0 };
  }

  const entries = fs.readdirSync(/* turbopackIgnore: true */ root, { withFileTypes: true });
  const iterations: Iteration[] = [];
  let skipped = 0;

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const parsed = readIteration(root, entry.name);
    if (parsed) iterations.push(parsed);
    else skipped += 1;
  }

  iterations.sort((a, b) => {
    const byTitle = a.title.localeCompare(b.title);
    if (byTitle !== 0) return byTitle;
    return a.id.localeCompare(b.id);
  });

  return { iterations, skipped };
}

function readIteration(root: string, directory: string): Iteration | null {
  const descriptorPath = path.join(root, directory, "descriptor.json");
  if (!fs.existsSync(descriptorPath)) return null;

  let raw: unknown;
  try {
    raw = JSON.parse(fs.readFileSync(descriptorPath, "utf8"));
  } catch {
    return null;
  }

  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  if (record.id !== directory) return null;
  if (typeof record.title !== "string" || record.title.length === 0) return null;
  if (!isConstruction(record.construction)) return null;
  if (!Array.isArray(record.cards) || record.cards.length < 1 || record.cards.length > MAX_CARDS) {
    return null;
  }

  const cards: Card[] = [];
  const seen = new Set<string>();
  for (const item of record.cards) {
    const card = readCard(item);
    if (!card || seen.has(card.role)) return null;
    seen.add(card.role);
    cards.push(card);
  }

  const iteration: Iteration = {
    id: directory,
    title: record.title,
    construction: record.construction,
    cards,
  };
  if (typeof record.group === "string" && record.group.trim()) iteration.group = record.group.trim();
  if ((UNITS as readonly unknown[]).includes(record.unit)) iteration.unit = record.unit as Unit;
  for (const key of ["cover", "coverBack", "innerFlap", "band", "seal"] as const) {
    const art = readArt(record[key]);
    if (art) iteration[key] = art;
  }
  return iteration;
}

// `band: true` binds the cards with a plain band; an object can name an image and a label.
function readArt(value: unknown): Art | null {
  if (value === true) return {};
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const art: Art = {};
  if (typeof record.image === "string" && isImageBasename(record.image)) art.image = record.image;
  if (typeof record.text === "string") art.text = record.text;
  const size = readSize(record.size);
  if (size) art.size = size;
  return art;
}

function readCard(item: unknown): Card | null {
  if (!item || typeof item !== "object") return null;
  const record = item as Record<string, unknown>;
  if (!isRole(record.role)) return null;
  const card: Card = { role: record.role };
  if (record.text !== undefined) {
    if (typeof record.text !== "string") return null;
    card.text = record.text;
  }
  if (record.url !== undefined) {
    if (typeof record.url !== "string") return null;
    card.url = record.url;
  }
  if (typeof record.image === "string" && isImageBasename(record.image)) {
    card.image = record.image;
  }
  // A size or shape that does not read cleanly is dropped, not a reason to skip the card.
  const size = readSize(record.size);
  if (size) card.size = size;
  if ((SHAPES as readonly unknown[]).includes(record.shape)) card.shape = record.shape as Shape;
  return card;
}

export function isImageBasename(value: string) {
  if (!value || value !== path.basename(value)) return false;
  if (value.includes("..") || value.includes("/") || value.includes("\\")) return false;
  const extension = path.extname(value).slice(1).toLowerCase();
  return IMAGE_EXTENSIONS.has(extension);
}

function isConstruction(value: unknown): value is Construction {
  return typeof value === "string" && (CONSTRUCTIONS as readonly string[]).includes(value);
}

function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

export { presentCard } from "./cards";
