import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { presentCard, type Card } from "./catalog";
import { CardFace } from "./card-face";
import { qrDataUrl } from "./qr";

afterEach(() => cleanup());

function face(card: Card, extra?: { imageUrl?: string; qrDataUrl?: string }) {
  return render(<CardFace card={card} imageUrl={extra?.imageUrl} qrDataUrl={extra?.qrDataUrl} />);
}

describe("card faces", () => {
  it("shows letter text when there is no image", () => {
    face({ role: "letter", text: "Welcome" });
    expect(screen.getByText("Welcome")).toBeTruthy();
  });

  it("uses letter text as the image alternative", () => {
    face(
      { role: "letter", text: "Welcome", image: "card.png" },
      { imageUrl: "/media/doors/card.png" },
    );
    const image = screen.getByRole("img");
    expect(image.getAttribute("src")).toBe("/media/doors/card.png");
    expect(image.getAttribute("alt")).toBe("Welcome");
  });

  it("shows a generated code and no link for an https URL", async () => {
    const dataUrl = await qrDataUrl("https://example.com/nc27");
    face({ role: "qr", url: "https://example.com/nc27" }, { qrDataUrl: dataUrl });
    const image = screen.getByRole("img");
    expect(image.getAttribute("src")).toBe(dataUrl);
    expect(document.querySelector("a")).toBeNull();
    expect(presentCard({ role: "qr", url: "https://example.com/nc27" })).toEqual({
      type: "qr",
      url: "https://example.com/nc27",
    });
  });

  it("refuses a javascript URL", () => {
    face({ role: "qr", url: "javascript:alert(1)" });
    expect(screen.getByText("QR")).toBeTruthy();
    expect(presentCard({ role: "qr", url: "javascript:alert(1)" }).type).not.toBe("qr");
  });

  it("labels a qr card with no URL", () => {
    face({ role: "qr" });
    expect(screen.getByText("No URL")).toBeTruthy();
  });

  it("labels a theme card with no image", () => {
    face({ role: "theme" });
    expect(screen.getByText("Theme")).toBeTruthy();
  });
});
