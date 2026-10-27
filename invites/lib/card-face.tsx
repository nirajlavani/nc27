import { presentCard, type Card } from "./cards";

export function CardFace({
  card,
  imageUrl,
  qrDataUrl,
}: {
  card: Card;
  imageUrl?: string;
  qrDataUrl?: string;
}) {
  const view = presentCard(card);

  if (view.type === "image" && imageUrl) {
    return <img src={imageUrl} alt={view.alt} />;
  }

  if (view.type === "text") {
    return <p>{view.text}</p>;
  }

  if (view.type === "qr" && qrDataUrl) {
    return <img src={qrDataUrl} alt="QR" />;
  }

  const label = view.type === "stand-in" ? view.label : "QR";
  return <p>{label}</p>;
}
