import fs from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("opens the title-sorted suite, then splay, and a third click stays splayed", async ({ page }) => {
  await expect(page.getByRole("link", { name: "Atelier suite" })).toHaveAttribute("aria-current", "page");
  const suite = page.locator("[data-suite]");
  await expect(suite).toHaveAttribute("data-pose", "closed");
  await suite.click();
  await expect(suite).toHaveAttribute("data-pose", "open");
  await suite.click();
  await expect(suite).toHaveAttribute("data-pose", "splayed");
  await suite.click();
  await expect(suite).toHaveAttribute("data-pose", "splayed");
});

test("buttons jump to open or splayed, rotate adds yaw, and reset restores the closed front", async ({
  page,
}) => {
  const suite = page.locator("[data-suite]");
  await page.getByRole("button", { name: "Splay" }).click();
  await expect(suite).toHaveAttribute("data-pose", "splayed");
  await page.getByRole("button", { name: "Open", exact: true }).click();
  await expect(suite).toHaveAttribute("data-pose", "open");
  await page.getByRole("button", { name: "Rotate" }).click();
  await expect(suite).toHaveAttribute("style", /rotateY\(45deg\)/);
  await page.getByRole("button", { name: "Reset" }).click();
  await expect(suite).toHaveAttribute("data-pose", "closed");
  await expect(suite).toHaveAttribute("style", /rotateY\(0deg\)/);
});

test("a drag yaws the suite and leaves the hinge pose closed", async ({ page }) => {
  const suite = page.locator("[data-suite]");
  const box = await suite.boundingBox();
  if (!box) throw new Error("suite has no box");
  await page.mouse.move(box.x + 40, box.y + 40);
  await page.mouse.down();
  await page.mouse.move(box.x + 120, box.y + 40, { steps: 8 });
  await page.mouse.up();
  await expect(suite).toHaveAttribute("data-pose", "closed");
  const style = await suite.getAttribute("style");
  expect(style).not.toContain("rotateY(0deg)");
});

test("choosing another invitation starts it closed", async ({ page }) => {
  await page.getByRole("button", { name: "Splay" }).click();
  await page.getByRole("link", { name: "Booklet" }).click();
  await expect(page.locator("[data-suite]")).toHaveAttribute("data-pose", "closed");
  await expect(page.locator("[data-suite]")).toHaveAttribute("data-construction", "booklet");
});

test("an unknown id says no complete iteration is available", async ({ page }) => {
  await page.goto("/?id=missing");
  await expect(page.getByText("No complete iteration is available.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Belly band" })).toHaveCount(0);
});

test("a moodboard file is not a panel row", async ({ page }) => {
  await expect(page.getByRole("link", { name: "not-an-invite" })).toHaveCount(0);
  await expect(page.getByText("README")).toHaveCount(0);
});

test("splayed cards keep depth and the hinge chain stays flat-free", async ({ page }) => {
  await page.getByRole("button", { name: "Splay" }).click();
  await page.getByRole("button", { name: "Rotate" }).click();
  const depths = await page.locator("[data-card]").evaluateAll((nodes) =>
    nodes.map((node) => getComputedStyle(node).transform),
  );
  expect(new Set(depths).size).toBeGreaterThan(1);
  const flat = await page.locator("[data-suite]").evaluate((node) => {
    const style = getComputedStyle(node);
    return { opacity: style.opacity, filter: style.filter, overflow: style.overflow };
  });
  expect(flat.opacity).toBe("1");
  expect(flat.filter).toBe("none");
  expect(["visible", "clip"]).toContain(flat.overflow);
});

test("reduced motion opens without a transition", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.getByRole("button", { name: "Open", exact: true }).click();
  const duration = await page.locator("[data-suite]").evaluate((node) => getComputedStyle(node).transitionDuration);
  expect(duration === "0s" || duration === "0ms").toBe(true);
  await expect(page.locator("[data-suite]")).toHaveAttribute("data-pose", "open");
});

test("a new directory appears on reload and a skipped directory is counted", async ({ page }) => {
  const created = path.join(process.cwd(), "iterations", "extra-review");
  const skipped = path.join(process.cwd(), "iterations", "not-complete");
  fs.mkdirSync(created, { recursive: true });
  fs.writeFileSync(
    path.join(created, "descriptor.json"),
    JSON.stringify({
      id: "extra-review",
      title: "Extra review",
      construction: "envelope",
      cards: [{ role: "letter", text: "Added later, 2026." }],
    }),
  );
  fs.mkdirSync(skipped, { recursive: true });
  fs.writeFileSync(path.join(skipped, "descriptor.json"), "{");
  try {
    await page.reload();
    await expect(page.getByRole("link", { name: "Extra review" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Belly band" })).toBeVisible();
    await expect(page.getByText("1 skipped")).toBeVisible();
  } finally {
    fs.rmSync(created, { recursive: true, force: true });
    fs.rmSync(skipped, { recursive: true, force: true });
  }
});

test("a splayed card opens in the reader, steps to the next card, and closes back", async ({ page }) => {
  const suite = page.locator("[data-suite]");
  await page.getByRole("button", { name: "Splay" }).click();
  await expect(suite).toHaveAttribute("data-pose", "splayed");
  await page.waitForTimeout(2200);
  await page.locator('[data-card][data-index="0"]').click();
  const reader = page.getByRole("dialog");
  await expect(reader).toBeVisible();
  await expect(reader.getByText("1 of 3")).toBeVisible();
  await expect(page.locator('[data-card][data-index="0"]')).toHaveAttribute("data-reading", "true");
  await page.keyboard.press("ArrowRight");
  await expect(reader.getByText("2 of 3")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(reader).toHaveCount(0);
  await expect(suite).toHaveAttribute("data-pose", "splayed");
});

test("a card that is still in the envelope does not open the reader", async ({ page }) => {
  await page.locator("[data-suite]").click();
  await expect(page.locator("[data-suite]")).toHaveAttribute("data-pose", "open");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("each panel row names the invitation and what is inside it", async ({ page }) => {
  const row = page.getByRole("link", { name: /Atelier suite/ });
  await expect(row).toContainText("Envelope suite · 3 cards");
  await page.getByRole("button", { name: "Hide invitations" }).click();
  await expect(page.getByRole("button", { name: "Show invitations" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Atelier suite/ })).toBeHidden();
});

test("an invitation lists its outer piece and each card, and a card opens in the reader", async ({ page }) => {
  await page.goto("/?id=booklet");
  await page.getByRole("button", { name: "Show the pieces of Atelier suite" }).click();
  const group = page.locator(".invite-group", { hasText: "Atelier suite" });
  await expect(group.locator(".part")).toHaveText([/Envelope/, /Belly band/, /Invitation/, /Itinerary/, /Details/]);
  await group.getByRole("button", { name: /Itinerary/ }).click();
  await expect(page).toHaveURL(/id=envelope/);
  await expect(page.locator("[data-suite]")).toHaveAttribute("data-pose", "splayed");
  await expect(page.getByRole("dialog").getByText("2 of 3")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await group.getByRole("button", { name: /Envelope/ }).click();
  await expect(page.locator("[data-suite]")).toHaveAttribute("data-pose", "closed");
});

// A 2×2 PNG, small enough to inline and real enough for the browser to draw.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFklEQVR4nGNk+M/wn4GBgYGRgYGBAQAZ/gL/0V9EdQAAAABJRU5ErkJggg==",
  "base64",
);

test("the upload dialog makes a new group and invitation from dropped designs", async ({ page }) => {
  const dir = path.join(process.cwd(), "iterations", "e2e-upload-suite");
  fs.rmSync(dir, { recursive: true, force: true });
  try {
    await page.getByRole("button", { name: "New group" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Title").fill("E2E upload suite");
    await dialog.getByLabel("New group name").fill("E2E uploads");
    for (const slot of ["cover", "cover-back", "inner-flap", "card-1", "card-2", "card-4", "band", "seal"]) {
      await dialog
        .locator(`[data-slot-input="${slot}"]`)
        .setInputFiles({ name: `${slot}.png`, mimeType: "image/png", buffer: PNG });
    }
    await expect(dialog.locator(".drop[data-filled]")).toHaveCount(8);
    // Real sizes: a 9 × 6 in envelope, a 6 × 4 in invitation, and a 2 in round card.
    await dialog.getByLabel("Cover width in in").fill("9");
    await dialog.getByLabel("Cover height in in").fill("6");
    await dialog.getByLabel("Card 1 width in in").fill("6");
    await dialog.getByLabel("Card 1 height in in").fill("4");
    await dialog.getByLabel("Card 2 width in in").fill("2");
    await dialog.getByLabel("Card 2 height in in").fill("2");
    await dialog.getByLabel("Card 2 shape").selectOption("circle");
    await dialog.getByRole("button", { name: "Create invitation" }).click();

    await expect(page).toHaveURL(/id=e2e-upload-suite/);
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "E2E uploads 1", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Add an invitation to E2E uploads" })).toBeVisible();
    const suite = page.locator("[data-suite]");
    await expect(suite).toHaveAttribute("data-cover", "true");
    await expect(suite).toHaveAttribute("data-banded", "true");
    await expect(page.locator(".invite-group", { hasText: "E2E upload suite" }).locator(".part")).toHaveText([
      /Envelope/,
      /Belly band/,
      /Invitation/,
      /Itinerary/,
      /Note/,
      /Edit designs/,
    ]);
    const descriptor = JSON.parse(fs.readFileSync(path.join(dir, "descriptor.json"), "utf8"));
    expect(descriptor.group).toBe("E2E uploads");
    expect(descriptor.cards.map((card: { image: string }) => card.image)).toEqual([
      "card-1.png",
      "card-2.png",
      "card-4.png",
    ]);
    expect(descriptor.unit).toBe("in");
    expect(descriptor.coverBack).toEqual({ image: "cover-back.png" });
    expect(descriptor.innerFlap).toEqual({ image: "inner-flap.png" });
    expect(descriptor.cards[1]).toMatchObject({ size: { w: 2, h: 2 }, shape: "circle" });
    // On stage the round card is a third the width of the invitation, as on paper.
    const widths = await page
      .locator("[data-card]")
      .evaluateAll((nodes) => nodes.map((node) => (node as HTMLElement).offsetWidth));
    expect(widths[1] / widths[0]).toBeCloseTo(2 / 6, 1);
    await expect(page.locator('[data-card][data-index="1"]')).toHaveAttribute("data-shape", "circle");

    // Edit: drop a card 3 design into the existing invitation.
    await page.getByRole("button", { name: "Edit designs…" }).click();
    await page
      .getByRole("dialog")
      .locator('[data-slot-input="card-3"]')
      .setInputFiles({ name: "card-3.png", mimeType: "image/png", buffer: PNG });
    await page.getByRole("dialog").getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.locator(".invite-group", { hasText: "E2E upload suite" }).locator(".part")).toHaveCount(7);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
