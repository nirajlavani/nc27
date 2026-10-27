import type { Construction, Role, Size } from "./cards";

// Turns real-world sizes into stage pixels. Everything in one invitation shares one
// scale, so a 2 × 2 in card sits beside a 7 × 5 in card at its true proportion.
//
// The scale comes from the cover when it has a size (cards are measured against the
// envelope or booklet). Without one, the largest sized card is fitted to the stage and
// the rest follow it. Without any sizes, the stage keeps its drawn defaults.

export type Box = { left: number; top: number; w: number; h: number };

export type Layout = {
  suite: { w: number; h: number };
  // Null when nothing has a size: the stylesheet's default boxes apply.
  cards: Box[] | null;
  band: Box | null;
  seal: number | null;
};

const ENVELOPE = { w: 360, h: 250 };
const FLAT = { w: 280, h: 380 };
// How tall a sized envelope or cover may get before it is scaled down to fit the stage.
const MAX_H = { envelope: 300, flat: 420 };

// The drawn sizes when a card has no size, at the default envelope.
const ENVELOPE_DEFAULT: Record<Role, Box> = {
  letter: { left: 22, top: 18, w: 316, h: 212 },
  theme: { left: 102, top: 14, w: 156, h: 218 },
  qr: { left: 96, top: 16, w: 168, h: 216 },
  note: { left: 96, top: 16, w: 168, h: 216 },
};

export function layoutSuite({
  construction,
  cover,
  cards,
  band,
  seal,
}: {
  construction: Construction;
  cover?: Size;
  cards: { role: Role; size?: Size }[];
  band?: Size;
  seal?: Size;
}): Layout {
  const envelope = construction === "envelope";
  const base = envelope ? ENVELOPE : FLAT;
  const sized = cards.filter((card) => card.size);
  if (!cover && sized.length === 0) return { suite: base, cards: null, band: null, seal: null };

  // Room for cards inside the outer piece.
  const inset = envelope ? { w: 24, h: 16 } : { w: 0, h: 0 };

  let ppu: number;
  let suite = base;
  if (cover) {
    ppu = Math.min(base.w / cover.w, (envelope ? MAX_H.envelope : MAX_H.flat) / cover.h);
    suite = { w: Math.round(cover.w * ppu), h: Math.round(cover.h * ppu) };
  } else {
    ppu = Math.min(
      ...sized.map((card) => Math.min((base.w - inset.w) / card.size!.w, (base.h - inset.h) / card.size!.h)),
    );
  }
  const room = { w: suite.w - inset.w, h: suite.h - inset.h };
  const grow = Math.min(suite.w / base.w, suite.h / base.h);

  const boxes = cards.map(({ role, size }) => {
    let w: number;
    let h: number;
    if (size) {
      w = size.w * ppu;
      h = size.h * ppu;
    } else {
      const fallback = envelope ? ENVELOPE_DEFAULT[role] : { w: FLAT.w, h: FLAT.h };
      w = fallback.w * grow;
      h = fallback.h * grow;
    }
    // A card larger than its envelope is shrunk to fit; it could not go inside otherwise.
    const fit = Math.min(1, room.w / w, room.h / h);
    w = Math.round(w * fit);
    h = Math.round(h * fit);
    const left = Math.round((suite.w - w) / 2);
    // Envelope cards sit low in the pocket; flat suites stack them centred.
    const top = envelope ? Math.max(8, suite.h - h - 20) : Math.round((suite.h - h) / 2);
    return { left, top, w, h };
  });

  // The band's strip is its short side; it wraps the whole stack.
  let bandBox: Box | null = null;
  const strip = band ? Math.min(band.w, band.h) * ppu : null;
  if (envelope) {
    const top = Math.min(...boxes.map((box) => box.top)) - 6;
    const bottom = Math.max(...boxes.map((box) => box.top + box.h)) + 6;
    const w = Math.round(clamp(strip ?? 60, 14, 140));
    bandBox = { left: Math.round(suite.w / 2 - w / 2), top, w, h: bottom - top };
  } else {
    const h = Math.round(clamp(strip ?? suite.h * 0.2, 14, suite.h * 0.6));
    bandBox = { left: -10, top: Math.round(suite.h / 2 - h / 2), w: suite.w + 20, h };
  }

  const sealPx = seal ? Math.round(clamp(Math.min(seal.w, seal.h) * ppu, 20, 100)) : null;
  return { suite, cards: boxes, band: bandBox, seal: sealPx };
}

function clamp(value: number, low: number, high: number) {
  return Math.min(high, Math.max(low, value));
}
