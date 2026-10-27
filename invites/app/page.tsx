import { redirect } from "next/navigation";
import { Studio, type PanelItem, type StageSuite } from "@/components/studio";
import { CARD_SLOTS, DEFAULT_GROUP, SLOT_ROLE, cardLabel, presentCard } from "@/lib/cards";
import { iterationsRoot, readCatalog, type Iteration } from "@/lib/catalog";
import { resolveMediaPath } from "@/lib/media";
import { qrDataUrl } from "@/lib/qr";
import { layoutSuite } from "@/lib/scale";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const catalog = readCatalog();
  const { id } = await searchParams;

  if (!id && catalog.iterations[0]) {
    redirect(`/?id=${encodeURIComponent(catalog.iterations[0].id)}`);
  }

  const selected = catalog.iterations.find((item) => item.id === id);
  if (!selected) {
    return <Studio items={[]} suite={null} skipped={catalog.skipped} empty />;
  }

  return (
    <Studio
      items={catalog.iterations.map(panelItem)}
      suite={await prepare(selected)}
      skipped={catalog.skipped}
      empty={false}
    />
  );
}

async function prepare(iteration: Iteration): Promise<StageSuite> {
  const root = iterationsRoot();
  const cards = await Promise.all(
    iteration.cards.map(async (card) => {
      const usable = card.image && resolveMediaPath(root, iteration.id, card.image);
      const view = presentCard(usable ? card : { ...card, image: undefined });
      return {
        ...card,
        image: usable ? card.image : undefined,
        imageUrl: view.type === "image" ? `/media/${iteration.id}/${view.image}` : undefined,
        qrDataUrl: view.type === "qr" ? await qrDataUrl(view.url) : undefined,
      };
    }),
  );
  const art = (image?: string) =>
    image && resolveMediaPath(root, iteration.id, image) ? `/media/${iteration.id}/${image}` : undefined;
  return {
    id: iteration.id,
    title: iteration.title,
    construction: iteration.construction,
    cards,
    coverUrl: art(iteration.cover?.image),
    coverBackUrl: art(iteration.coverBack?.image),
    innerFlapUrl: art(iteration.innerFlap?.image),
    sealUrl: art(iteration.seal?.image),
    layout: layoutSuite({
      construction: iteration.construction,
      cover: iteration.cover?.size,
      cards: iteration.cards,
      band: iteration.band?.size,
      seal: iteration.seal?.size,
    }),
    band: iteration.band ? { text: iteration.band.text, imageUrl: art(iteration.band.image) } : undefined,
  };
}

function panelItem(iteration: Iteration): PanelItem {
  const root = iterationsRoot();
  const url = (image?: string) =>
    image && resolveMediaPath(root, iteration.id, image) ? `/media/${iteration.id}/${image}` : undefined;
  // What the upload dialog shows in each drop area when this invitation is edited.
  const art: PanelItem["art"] = {
    cover: url(iteration.cover?.image),
    "cover-back": url(iteration.coverBack?.image),
    "inner-flap": url(iteration.innerFlap?.image),
    band: url(iteration.band?.image),
    seal: url(iteration.seal?.image),
  };
  // Sizes and shapes the upload dialog fills back in when this invitation is edited.
  const sizes: PanelItem["sizes"] = {
    cover: iteration.cover?.size,
    band: iteration.band?.size,
    seal: iteration.seal?.size,
  };
  const shapes: PanelItem["shapes"] = {};
  for (const slot of CARD_SLOTS) {
    const card = iteration.cards.find((item) => item.role === SLOT_ROLE[slot]);
    if (!card) continue;
    art[slot] = url(card.image) ?? "card";
    sizes[slot] = card.size;
    if (card.shape) shapes[slot] = card.shape;
  }
  return {
    id: iteration.id,
    title: iteration.title,
    group: iteration.group ?? DEFAULT_GROUP,
    construction: iteration.construction,
    coverUrl: art.cover,
    banded: Boolean(iteration.band),
    wording: iteration.cards.find((card) => card.role === "letter")?.text,
    unit: iteration.unit,
    art,
    sizes,
    shapes,
    parts: iteration.cards.map((card) => ({ role: card.role, label: cardLabel(iteration.construction, card) })),
  };
}
