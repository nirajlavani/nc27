export const CONSTRUCTIONS = [
  "french-door",
  "envelope",
  "booklet",
  "belly-band",
] as const;

export const ROLES = ["letter", "qr", "theme", "note"] as const;

export const MAX_CARDS = 4;

// The drop areas in the upload dialog. Card slots map onto roles in a fixed order.
export const UPLOAD_SLOTS = [
  "cover",
  "cover-back",
  "inner-flap",
  "card-1",
  "card-2",
  "card-3",
  "card-4",
  "band",
  "seal",
] as const;
export type UploadSlot = (typeof UPLOAD_SLOTS)[number];
export const CARD_SLOTS = ["card-1", "card-2", "card-3", "card-4"] as const;
export type CardSlot = (typeof CARD_SLOTS)[number];
export const SLOT_ROLE: Record<CardSlot, Role> = {
  "card-1": "letter",
  "card-2": "theme",
  "card-3": "qr",
  "card-4": "note",
};
export const DEFAULT_GROUP = "Default";

export type Construction = (typeof CONSTRUCTIONS)[number];
export type Role = (typeof ROLES)[number];

// Real-world sizes, in the invitation's one `unit`. Only the ratios between pieces
// matter on stage: they set how big each card is next to the others and the envelope.
export const UNITS = ["in", "cm", "mm"] as const;
export type Unit = (typeof UNITS)[number];
export type Size = { w: number; h: number };

export const SHAPES = ["rect", "rounded", "circle", "arch"] as const;
export type Shape = (typeof SHAPES)[number];

// The drop areas that take a size, and which of those take a shape.
export const SIZED_SLOTS = ["cover", "card-1", "card-2", "card-3", "card-4", "band", "seal"] as const;
export type SizedSlot = (typeof SIZED_SLOTS)[number];

export type Card = {
  role: Role;
  text?: string;
  url?: string;
  image?: string;
  size?: Size;
  shape?: Shape;
};

// Optional art for the pieces around the cards. Each image is a basename in the
// invitation's own folder, the same rule as a card image.
export type Art = { image?: string; text?: string; size?: Size };

export function readSize(value: unknown): Size | undefined {
  if (!value || typeof value !== "object") return undefined;
  const { w, h } = value as Record<string, unknown>;
  const ok = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n) && n > 0 && n <= 2000;
  return ok(w) && ok(h) ? { w, h } : undefined;
}

export function isHttpUrl(value: string | undefined) {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export type CardView =
  | { type: "image"; image: string; alt: string }
  | { type: "text"; text: string }
  | { type: "qr"; url: string }
  | { type: "stand-in"; label: string };

export function presentCard(card: Card): CardView {
  if (card.image) {
    return { type: "image", image: card.image, alt: altText(card) };
  }
  if (card.role === "qr" && isHttpUrl(card.url)) {
    return { type: "qr", url: card.url as string };
  }
  if (card.role === "letter" && card.text) {
    return { type: "text", text: card.text };
  }
  return { type: "stand-in", label: standInLabel(card) };
}

function altText(card: Card) {
  if (card.role === "letter" && card.text) return card.text;
  return standInLabel({ ...card, url: card.role === "qr" ? undefined : card.url });
}

export function standInLabel(card: Card) {
  if (card.role === "qr" && !card.url) return "No URL";
  if (card.role === "letter") return "Letter";
  if (card.role === "qr") return "QR";
  if (card.role === "note") return "Note";
  return "Theme";
}

const ROLE_LABEL: Record<Role, string> = { letter: "Letter", qr: "QR", theme: "Theme", note: "Note" };
const ENVELOPE_LABEL: Record<Role, string> = {
  letter: "Invitation",
  qr: "Details",
  theme: "Itinerary",
  note: "Note",
};

// The name a reviewer sees for one inner card, in the panel and in the reader.
export function cardLabel(construction: Construction, card: Card) {
  if (construction === "envelope") {
    return card.role === "theme" && card.text ? card.text : ENVELOPE_LABEL[card.role];
  }
  return ROLE_LABEL[card.role];
}

// The outer piece that holds the cards: the envelope, the cover, the doors, or the band.
export const WRAPPER_LABEL: Record<Construction, string> = {
  envelope: "Envelope",
  booklet: "Cover",
  "french-door": "Doors",
  "belly-band": "Belly band",
};
