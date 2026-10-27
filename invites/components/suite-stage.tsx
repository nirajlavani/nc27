"use client";

import { useEffect, useRef, useState } from "react";
import type { Role } from "@/lib/cards";
import type { Box } from "@/lib/scale";
import { Face } from "./suite-faces";
import type { StageSuite } from "./studio";

export type Pose = "closed" | "open" | "splayed";

const RANK: Record<Pose, number> = { closed: 0, open: 1, splayed: 2 };

// Each step plays in order: the shell opens, the cards rise, the band slides off, then
// the cards fan. Closing plays the same steps backwards. Values are delays in milliseconds.
function choreography(from: Pose, to: Pose, banded: boolean) {
  const t = { shell: 0, lift: 0, band: 0, fan: 0 };
  if (RANK[to] > RANK[from]) {
    let at = 0;
    if (from === "closed") at = 560;
    t.lift = at;
    if (to === "splayed") {
      at += 520;
      if (banded) {
        t.band = at;
        at += 460;
      }
      t.fan = at;
    }
  } else if (RANK[to] < RANK[from]) {
    let at = 0;
    if (from === "splayed") {
      at = 620;
      if (banded) {
        t.band = at;
        at += 520;
      }
    }
    t.lift = at;
    if (to === "closed") t.shell = at + 480;
  }
  return t;
}

export function SuiteStage({
  suite,
  pose,
  from,
  yaw,
  reduced,
  readingIndex,
  onStep,
  onRead,
  onYaw,
}: {
  suite: StageSuite;
  pose: Pose;
  from: Pose;
  yaw: number;
  reduced: boolean;
  readingIndex: number | null;
  onStep: () => void;
  onRead: (index: number) => void;
  onYaw: (delta: number, settle?: boolean) => void;
}) {
  const drag = useRef<{
    x: number;
    y: number;
    lastX: number;
    lastT: number;
    velocity: number;
    moved: boolean;
    id: number;
    card: number | null;
  } | null>(null);
  const suiteRef = useRef<HTMLDivElement>(null);
  const envelope = suite.construction === "envelope";
  const bandShell = suite.construction === "belly-band";
  // A band that binds the cards inside another construction, as in the Atelier suite.
  const banded = Boolean(suite.band) && !bandShell;
  const timing = choreography(from, pose, banded);
  const count = suite.cards.length;
  const roles = suite.cards.map((card) => card.role);
  const layout = suite.layout;
  const boxes = layout.cards;
  const widths = roles.map((role, i) => boxes?.[i].w ?? (envelope ? ENVELOPE_WIDTH[role] : 280));
  const row = envelope ? envelopeRow(roles, widths, banded ? (layout.band?.w ?? BAND_WIDTH) : null) : null;
  // Lift the cards just clear of the envelope, however tall they are.
  const tallest = boxes ? Math.max(...boxes.map((box) => box.top + box.h)) : 232;
  const lift = { open: Math.round(Math.min(54, tallest * 0.24)), splayed: tallest - 4 };
  const closing = RANK[pose] < RANK[from];
  const boxRef = useRef<HTMLDivElement>(null);
  const size = envelope ? SCENE_ENVELOPE : SCENE_FLAT;
  const fit = useFit(boxRef, size);

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    const cardNode = (event.target as HTMLElement).closest<HTMLElement>("[data-card]");
    drag.current = {
      x: event.clientX,
      y: event.clientY,
      lastX: event.clientX,
      lastT: event.timeStamp,
      velocity: 0,
      moved: false,
      id: event.pointerId,
      card: cardNode ? Number(cardNode.dataset.index) : null,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const start = drag.current;
    if (!start || start.id !== event.pointerId) return;
    const distance = Math.hypot(event.clientX - start.x, event.clientY - start.y);
    if (!start.moved && distance >= 8) {
      start.moved = true;
      suiteRef.current?.setAttribute("data-dragging", "true");
    }
    if (start.moved) {
      const delta = event.clientX - start.lastX;
      const dt = Math.max(event.timeStamp - start.lastT, 1);
      start.velocity = start.velocity * 0.6 + (delta / dt) * 0.4;
      start.lastX = event.clientX;
      start.lastT = event.timeStamp;
      onYaw(delta * 0.6);
    }
  }

  function onPointerUp(event: React.PointerEvent<HTMLDivElement>) {
    const start = drag.current;
    drag.current = null;
    if (!start || start.id !== event.pointerId) return;
    if (start.moved) {
      suiteRef.current?.removeAttribute("data-dragging");
      // Let the turn glide to rest instead of stopping dead under the pointer.
      const glide = reduced ? 0 : Math.max(-60, Math.min(60, start.velocity * 140));
      if (glide) onYaw(glide, true);
      return;
    }
    if (pose === "splayed" && start.card !== null) onRead(start.card);
    else onStep();
  }

  function onPointerCancel() {
    drag.current = null;
    suiteRef.current?.removeAttribute("data-dragging");
  }

  return (
    <div
      ref={boxRef}
      className="scene-box"
      style={{ width: size.w * fit, height: size.h * fit }}
    >
      <div
        className={envelope ? "scene scene-envelope" : "scene"}
        data-pose={pose}
        style={{ scale: String(fit) }}
      >
        <div
          ref={suiteRef}
          className="suite"
          data-suite
          data-pose={pose}
          data-construction={suite.construction}
          data-reduced={reduced ? "true" : "false"}
          style={
            {
              transform: `rotateY(${yaw}deg)`,
              width: layout.suite.w,
              height: layout.suite.h,
              "--env-w": `${layout.suite.w}px`,
              "--env-h": `${layout.suite.h}px`,
              "--seal-d": layout.seal ? `${layout.seal}px` : undefined,
              "--back-image": suite.coverBackUrl ? `url(${JSON.stringify(suite.coverBackUrl)})` : undefined,
              "--inner-image": suite.innerFlapUrl ? `url(${JSON.stringify(suite.innerFlapUrl)})` : undefined,
              "--shell-delay": `${timing.shell}ms`,
              "--lift-delay": `${timing.lift}ms`,
              "--band-delay": `${timing.band}ms`,
              "--fan-delay": `${timing.fan}ms`,
              "--cover-image": suite.coverUrl ? `url(${JSON.stringify(suite.coverUrl)})` : undefined,
              "--seal-image": suite.sealUrl ? `url(${JSON.stringify(suite.sealUrl)})` : undefined,
            } as React.CSSProperties
          }
          data-cover={suite.coverUrl ? "true" : undefined}
          data-back={suite.coverBackUrl ? "true" : undefined}
          data-inner={suite.innerFlapUrl ? "true" : undefined}
          data-seal={suite.sealUrl ? "true" : undefined}
          data-banded={banded ? "true" : undefined}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
        >
          <div className="floor-shadow" />
          {envelope ? <EnvelopeBack /> : <div className="paper-shadow" />}
          {suite.cards.map((card, index) => {
            // Cards leave front-first and go back in back-first. A banded stack moves as one.
            const order = banded ? 0 : closing ? count - 1 - index : index;
            return (
              <div
                key={card.role}
                className="card-slot"
                style={
                  {
                    "--stagger": `${order * 110}ms`,
                    translate: liftFor(pose, envelope, lift),
                  } as React.CSSProperties
                }
              >
                <article
                  className={`card card-${card.role}`}
                  data-card
                  data-index={index}
                  data-reading={readingIndex === index ? "true" : undefined}
                  data-shape={card.shape}
                  tabIndex={pose === "splayed" ? 0 : undefined}
                  onKeyDown={(event) => {
                    if (pose === "splayed" && (event.key === "Enter" || event.key === " ")) {
                      event.preventDefault();
                      onRead(index);
                    }
                  }}
                  style={{
                    ...(boxes ? { left: boxes[index].left, top: boxes[index].top, width: boxes[index].w, height: boxes[index].h } : null),
                    transform: cardTransform(pose, index, count, card.role, row, widths),
                  }}
                >
                  {EDGE_LAYERS.map((z) => (
                    <span
                      key={z}
                      className="card-layer"
                      style={{ transform: `translateZ(${z}px)` }}
                    />
                  ))}
                  <div className="card-face">
                    <Face construction={suite.construction} card={card} />
                  </div>
                </article>
              </div>
            );
          })}
          {banded || bandShell ? (
            <div className="card-slot band-slot" style={{ translate: liftFor(pose, envelope, lift) }}>
              <Binder
                suite={suite}
                count={count}
                vertical={envelope}
                box={layout.band}
                as={bandShell ? "shell" : "band"}
                transform={bandTransform(pose, envelope, bandShell, row)}
              />
            </div>
          ) : null}
          {envelope ? <EnvelopeFront /> : bandShell ? null : <Shells suite={suite} />}
        </div>
      </div>
    </div>
  );
}

// Paper thickness, a little exaggerated so a card edge-on still reads as card stock.
// Thin layers 1px apart blend into a solid edge for any outline, the arch included.
const THICKNESS = 6;
const EDGE_LAYERS = Array.from({ length: THICKNESS }, (_, i) => i - THICKNESS / 2);

// The flap is card stock too: its two faces sit 6px apart with an edge between them.
const FLAP_LAYERS = [-2, -1, 0, 1, 2];
// The wax seal stands proud of the flap.
const SEAL_LAYERS = [4, 5, 6];

const SCENE_ENVELOPE = { w: 980, h: 600 };
const SCENE_FLAT = { w: 980, h: 520 };

// The rig is laid out at one fixed size and scaled to whatever room the stage has,
// so the splayed cards never run off a short window.
function useFit(ref: React.RefObject<HTMLDivElement | null>, size: { w: number; h: number }) {
  const [fit, setFit] = useState(1);
  useEffect(() => {
    const stage = ref.current?.parentElement;
    if (!stage) return;
    const measure = () => {
      const width = stage.clientWidth - 32;
      const height = window.innerHeight - 220;
      setFit(Math.max(0.35, Math.min(1, width / size.w, height / size.h)));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [ref, size.w, size.h]);
  return fit;
}

function EnvelopeBack() {
  return (
    <div className="envelope envelope-back">
      <div className="env-panel env-inside" />
      <div className="env-panel env-outside">
        <span>NC27</span>
      </div>
    </div>
  );
}

function EnvelopeFront() {
  return (
    <div className="envelope envelope-front">
      <div className="env-edge env-edge-left" />
      <div className="env-edge env-edge-right" />
      <div className="env-edge env-edge-bottom" />
      <div className="env-edge env-edge-top" />
      <div className="pocket" />
      <div className="flap">
        <div className="flap-face flap-out" />
        {FLAP_LAYERS.map((z) => (
          <div key={z} className="flap-face flap-layer" style={{ transform: `translateZ(${z}px)` }} />
        ))}
        <div className="flap-face flap-in" />
        {SEAL_LAYERS.map((z) => (
          <span key={z} className="seal-layer" style={{ transform: `translateZ(${z}px)` }} />
        ))}
        <span className="seal flap-seal">
          <span>NC</span>
        </span>
      </div>
    </div>
  );
}

function Shells({ suite }: { suite: StageSuite }) {
  const label = (
    <>
      <span className="shell-title">{suite.title}</span>
      <span className="shell-kind">{suite.construction}</span>
    </>
  );
  return (
    <>
      <div className="shell shell-a">
        <div className="shell-face shell-out">{label}</div>
        <div className="shell-face shell-in" />
      </div>
      {suite.construction === "french-door" ? (
        <div className="shell shell-b">
          <div className="shell-face shell-out">{label}</div>
          <div className="shell-face shell-in" />
        </div>
      ) : null}
    </>
  );
}

// A belly band is a loop of paper around the stack: a front strip, a back strip, and the
// two folds that join them, so it keeps its depth when the suite is turned.
function Binder({
  suite,
  count,
  vertical,
  box,
  as,
  transform,
}: {
  suite: StageSuite;
  count: number;
  vertical: boolean;
  box: Box | null;
  as: "band" | "shell";
  transform: string;
}) {
  const front = stackTop(count) + 1;
  const back = 0.5;
  const label = suite.band?.text ?? suite.title;
  return (
    <div
      className="binder"
      data-as={as}
      data-vertical={vertical ? "true" : undefined}
      data-art={suite.band?.imageUrl ? "true" : undefined}
      style={
        {
          ...(box ? { left: box.left, top: box.top, width: box.w, height: box.h, right: "auto" } : null),
          transform,
          "--band-front": `${front}px`,
          "--band-back": `${back}px`,
          "--band-depth": `${front - back}px`,
          "--band-image": suite.band?.imageUrl ? `url(${JSON.stringify(suite.band.imageUrl)})` : undefined,
        } as React.CSSProperties
      }
    >
      <div className="binder-face binder-front">
        <span className="binder-label">{label}</span>
        {as === "shell" ? <span className="binder-kind">{suite.construction}</span> : null}
      </div>
      <div className="binder-face binder-back" />
      <div className="binder-face binder-fold binder-fold-a" />
      <div className="binder-face binder-fold binder-fold-b" />
    </div>
  );
}

// The z of the top card's printed face when the cards are stacked.
function stackTop(count: number) {
  return 4 + (count - 1) * (THICKNESS + 1) + THICKNESS / 2;
}

function liftFor(pose: Pose, envelope: boolean, lift: { open: number; splayed: number }) {
  if (!envelope || pose === "closed") return "0px 0px";
  return pose === "open" ? `0px -${lift.open}px` : `0px -${lift.splayed}px`;
}

// The envelope's cards lie out in one row once splayed, read left to right like the
// moodboard. Every card starts centred on the envelope, so each one moves by its
// slot's centre minus the envelope's centre.
const ENVELOPE_CENTRE = 180;
const ROW_ORDER: Role[] = ["theme", "letter", "qr", "note"];
// Drawn widths when a card has no size.
const ENVELOPE_WIDTH: Record<Role, number> = { theme: 156, letter: 316, qr: 168, note: 168 };
const ROW_STYLE: Record<Role, { y: number; z: number; turn: number; scale?: number }> = {
  letter: { y: 40, z: 96, turn: 0, scale: 1.06 },
  theme: { y: 66, z: 64, turn: -5 },
  qr: { y: 72, z: 72, turn: 4 },
  note: { y: 62, z: 68, turn: -3 },
};
const BAND_WIDTH = 60;

type Row = { cards: Partial<Record<Role, number>>; band?: number };

function envelopeRow(roles: Role[], cardWidths: number[], bandWidth: number | null): Row {
  const present = ROW_ORDER.filter((role) => roles.includes(role));
  const widthOf = (role: Role) => cardWidths[roles.indexOf(role)] * (ROW_STYLE[role].scale ?? 1);
  const widths = [...(bandWidth ? [bandWidth] : []), ...present.map(widthOf)];
  const gap = present.length >= 4 ? 16 : 24;
  const total = widths.reduce((sum, width) => sum + width, 0) + gap * (widths.length - 1);
  let left = ENVELOPE_CENTRE - total / 2;
  const centres = widths.map((width) => {
    const centre = left + width / 2;
    left += width + gap;
    return centre - ENVELOPE_CENTRE;
  });
  const row: Row = { cards: {} };
  if (bandWidth) row.band = centres.shift();
  present.forEach((role, i) => (row.cards[role] = centres[i]));
  return row;
}

function cardTransform(
  pose: Pose,
  index: number,
  count: number,
  role: Role,
  row: Row | null,
  widths: number[],
) {
  // The first card sits on top of the stack.
  const rest = `translate3d(0px, 0px, ${4 + (count - 1 - index) * (THICKNESS + 1)}px)`;
  if (pose !== "splayed") return rest;
  if (row) {
    const style = ROW_STYLE[role];
    const x = row.cards[role] ?? 0;
    return `translate3d(${x}px, ${style.y}px, ${style.z}px) rotateZ(${style.turn}deg)${
      style.scale ? ` scale(${style.scale})` : ""
    }`;
  }
  const offset = index - (count - 1) / 2;
  // Fan by the widest card so sized cards never overlap, within the stage's width.
  const step = Math.min(Math.max(...widths) + 24, 900 / Math.max(count - 1, 1), count >= 4 ? 222 : 252);
  const x = offset * step;
  const y = Math.abs(offset) * 18;
  const z = 70 - Math.abs(offset) * 10 + (count - index) * 2;
  return `translate3d(${x}px, ${y}px, ${z}px) rotateZ(${offset * 4}deg)`;
}

function bandTransform(pose: Pose, envelope: boolean, shell: boolean, row: Row | null) {
  const rest = "translate3d(0px, 0px, 0px) rotateZ(0deg)";
  // As the outer piece of a belly-band suite, the band leaves on the first click.
  if (shell) return pose === "closed" ? rest : "translate3d(250px, 150px, 30px) rotateZ(-14deg)";
  if (pose !== "splayed") return rest;
  // Inside an envelope it slides sideways off the stack into its place in the row.
  if (envelope) return `translate3d(${row?.band ?? -300}px, 56px, 40px) rotateZ(-3deg)`;
  return "translate3d(0px, 250px, 40px) rotateZ(-4deg)";
}
