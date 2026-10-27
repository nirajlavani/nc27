import { CardFace } from "@/lib/card-face";
import type { Construction } from "@/lib/cards";
import type { StageCard } from "./studio";

const ROLE_LABEL = { letter: "Letter", qr: "QR", theme: "Theme", note: "Note" } as const;

export { cardLabel } from "@/lib/cards";

export function Face({ construction, card }: { construction: Construction; card: StageCard }) {
  return construction === "envelope" ? <EnvelopeFace card={card} /> : <PaperFace card={card} />;
}

function PaperFace({ card }: { card: StageCard }) {
  return (
    <div className="paper" data-role={card.role}>
      <span className="paper-role">{ROLE_LABEL[card.role]}</span>
      <div className="paper-body">
        <CardFace card={card} imageUrl={card.imageUrl} qrDataUrl={card.qrDataUrl} />
      </div>
      <span className="paper-mark">NC27</span>
    </div>
  );
}

function EnvelopeFace({ card }: { card: StageCard }) {
  if (card.imageUrl) {
    return (
      <div className="photo-face">
        <CardFace card={card} imageUrl={card.imageUrl} qrDataUrl={card.qrDataUrl} />
      </div>
    );
  }
  if (card.role === "letter") {
    return (
      <div className="invite-sheet">
        <p className="eyebrow">North American Convention</p>
        <p className="script">Twenty-seven</p>
        <span className="rule" aria-hidden />
        <p className="invite-copy">{card.text}</p>
        <p className="invite-year">2026</p>
      </div>
    );
  }
  if (card.role === "theme") {
    return (
      <div className="itinerary">
        <p className="script">{card.text || "Itinerary"}</p>
        <p className="itinerary-head">Sessions</p>
        <span className="pill">to follow</span>
        <p className="itinerary-head">Evening gathering</p>
        <span className="pill">to follow</span>
        <p className="itinerary-head">Tables</p>
      </div>
    );
  }
  if (card.role === "note") {
    return (
      <div className="details-card note-card">
        <p className="script">Note</p>
        <p className="note-copy">{card.text || "To follow"}</p>
        <span className="rule" aria-hidden />
      </div>
    );
  }
  return (
    <div className="details-card">
      <p className="script">Details</p>
      {card.qrDataUrl ? <img src={card.qrDataUrl} alt="QR" /> : <p className="no-url">No URL</p>}
      <span className="seal seal-small">NC</span>
    </div>
  );
}
