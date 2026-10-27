import { describe, expect, it } from "vitest";
import { layoutSuite } from "./scale";

describe("layoutSuite", () => {
  it("keeps the drawn defaults when nothing has a size", () => {
    const layout = layoutSuite({ construction: "envelope", cards: [{ role: "letter" }] });
    expect(layout).toEqual({ suite: { w: 360, h: 250 }, cards: null, band: null, seal: null });
  });

  it("scales cards against a sized envelope, in true proportion to each other", () => {
    const layout = layoutSuite({
      construction: "envelope",
      cover: { w: 9, h: 6.25 },
      cards: [
        { role: "letter", size: { w: 7, h: 5 } },
        { role: "qr", size: { w: 2, h: 2 } },
      ],
      seal: { w: 1, h: 1 },
    });
    expect(layout.suite).toEqual({ w: 360, h: 250 });
    const [letter, round] = layout.cards!;
    expect(letter.w).toBe(280);
    expect(letter.h).toBe(200);
    expect(round.w).toBe(80);
    expect(round.h).toBe(80);
    expect(layout.seal).toBe(40);
  });

  it("fits the largest card when there is no cover size", () => {
    const layout = layoutSuite({
      construction: "booklet",
      cards: [
        { role: "letter", size: { w: 5, h: 7 } },
        { role: "theme", size: { w: 2.5, h: 3.5 } },
      ],
    });
    const [big, small] = layout.cards!;
    expect(big.w).toBe(271);
    expect(big.h).toBe(380);
    expect(small.w / big.w).toBeCloseTo(0.5, 1);
  });

  it("shrinks a card that is bigger than its envelope, and sizes the band strip", () => {
    const layout = layoutSuite({
      construction: "envelope",
      cover: { w: 6, h: 4 },
      cards: [{ role: "letter", size: { w: 8, h: 6 } }],
      band: { w: 1, h: 6 },
    });
    const [letter] = layout.cards!;
    expect(letter.w).toBeLessThanOrEqual(layout.suite.w - 24);
    expect(letter.h).toBeLessThanOrEqual(layout.suite.h - 16);
    expect(layout.band!.w).toBe(60);
  });
});
