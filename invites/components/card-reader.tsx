"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { Face, cardLabel } from "./suite-faces";
import type { StageSuite } from "./studio";

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

// A 2D lightbox for one inner card. It grows out of the card's spot in the
// splayed suite and shrinks back into it, so the move reads as one piece of paper.
export function CardReader({
  suite,
  index,
  reduced,
  source,
  onIndex,
  onClose,
}: {
  suite: StageSuite;
  index: number;
  reduced: boolean;
  source: (index: number) => HTMLElement | null;
  onIndex: (index: number) => void;
  onClose: () => void;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const closing = useRef(false);
  const first = useRef(true);
  const scaleRef = useRef(1);
  const card = suite.cards[index];
  const count = suite.cards.length;

  useLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const node = source(index);
    const w = node?.offsetWidth ?? 300;
    const h = node?.offsetHeight ?? 400;
    const scale = Math.min((window.innerWidth * 0.74) / w, ((window.innerHeight - 90) * 0.82) / h, 2.4);
    scaleRef.current = scale;
    frame.style.width = `${w}px`;
    frame.style.height = `${h}px`;
    frame.style.transform = `scale(${scale})`;
    frame.style.visibility = "visible";
    if (reduced) {
      first.current = false;
      return;
    }
    if (first.current) {
      first.current = false;
      frame.animate([{ transform: fromRect(node, frame, scale) }, { transform: `scale(${scale})` }], {
        duration: 560,
        easing: EASE,
      });
      backdropRef.current?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 360, easing: "ease-out" });
    } else {
      frame.animate(
        [
          { transform: `translateX(24px) scale(${scale * 0.97})`, opacity: 0.3 },
          { transform: `scale(${scale})`, opacity: 1 },
        ],
        { duration: 340, easing: EASE },
      );
    }
  }, [index, reduced, source]);

  useEffect(() => {
    closeRef.current?.focus({ preventScroll: true });
  }, []);

  function close() {
    const frame = frameRef.current;
    if (closing.current) return;
    closing.current = true;
    if (reduced || !frame) {
      onClose();
      return;
    }
    const scale = scaleRef.current;
    const to = fromRect(source(index), frame, scale);
    barRef.current?.animate([{ opacity: 1 }, { opacity: 0, transform: "translateY(8px)" }], {
      duration: 240,
      easing: "ease-in",
      fill: "forwards",
    });
    backdropRef.current?.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: 420,
      easing: "ease-in",
      fill: "forwards",
    });
    frame
      .animate([{ transform: `scale(${scale})` }, { transform: to }], {
        duration: 460,
        easing: EASE,
        fill: "forwards",
      })
      .finished.then(onClose, onClose);
  }

  function step(delta: number) {
    if (count < 2 || closing.current) return;
    onIndex((index + delta + count) % count);
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") close();
      else if (event.key === "ArrowRight") step(1);
      else if (event.key === "ArrowLeft") step(-1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!card) return null;

  return (
    <div className="reader" role="dialog" aria-modal="true" aria-label={`${cardLabel(suite.construction, card)} card`}>
      <div ref={backdropRef} className="reader-backdrop" onClick={close} />
      <div className="reader-stage" onClick={close}>
        <div
          ref={frameRef}
          className="reader-frame"
          data-construction={suite.construction}
          style={{ visibility: "hidden" }}
          onClick={(event) => event.stopPropagation()}
        >
          <div className={`card card-${card.role} reader-card`} data-shape={card.shape}>
            <Face construction={suite.construction} card={card} />
          </div>
        </div>
      </div>
      <div ref={barRef} className="reader-bar">
        <button type="button" onClick={() => step(-1)} disabled={count < 2} aria-label="Previous card">
          ←
        </button>
        <span className="reader-caption">
          {cardLabel(suite.construction, card)}
          <span>
            {index + 1} of {count}
          </span>
        </span>
        <button type="button" onClick={() => step(1)} disabled={count < 2} aria-label="Next card">
          →
        </button>
        <button ref={closeRef} type="button" className="reader-close" onClick={close}>
          Close
        </button>
      </div>
    </div>
  );
}

// The transform that puts the centred frame over the card's spot on the stage.
function fromRect(node: HTMLElement | null, frame: HTMLElement, scale: number) {
  if (!node) return `scale(${scale * 0.6})`;
  const target = node.getBoundingClientRect();
  const parent = frame.offsetParent?.getBoundingClientRect();
  const cx = (parent?.left ?? 0) + frame.offsetLeft + frame.offsetWidth / 2;
  const cy = (parent?.top ?? 0) + frame.offsetTop + frame.offsetHeight / 2;
  const dx = target.left + target.width / 2 - cx;
  const dy = target.top + target.height / 2 - cy;
  const s = Math.max(target.width / frame.offsetWidth, 0.05);
  return `translate(${dx}px, ${dy}px) scale(${s})`;
}
