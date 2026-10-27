"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Card, Construction } from "@/lib/cards";
import type { Layout } from "@/lib/scale";
import { CardReader } from "./card-reader";
import { SidePanel, groupItems, type PanelItem } from "./side-panel";
import { UploadDialog, type DialogTarget } from "./upload-dialog";
import { SuiteStage, type Pose } from "./suite-stage";
import "./studio.css";

export type { PanelItem };

export type StageCard = Card & { imageUrl?: string; qrDataUrl?: string };

export type StageSuite = {
  id: string;
  title: string;
  construction: Construction;
  cards: StageCard[];
  coverUrl?: string;
  coverBackUrl?: string;
  innerFlapUrl?: string;
  sealUrl?: string;
  band?: { text?: string; imageUrl?: string };
  // Stage boxes worked out from the real sizes, on one scale for the whole invitation.
  layout: Layout;
};

const HINT: Record<Construction, Record<Pose, string>> = {
  envelope: {
    closed: "Click the envelope to break the seal",
    open: "Click again to take the cards out",
    splayed: "Click any card to read it · drag to turn",
  },
  booklet: {
    closed: "Click the booklet to open the cover",
    open: "Click again to lay out the cards",
    splayed: "Click any card to read it · drag to turn",
  },
  "french-door": {
    closed: "Click to open the doors",
    open: "Click again to lay out the cards",
    splayed: "Click any card to read it · drag to turn",
  },
  "belly-band": {
    closed: "Click to slide off the band",
    open: "Click again to lay out the cards",
    splayed: "Click any card to read it · drag to turn",
  },
};

export function Studio({
  items,
  suite,
  skipped,
  empty,
}: {
  items: PanelItem[];
  suite: StageSuite | null;
  skipped: number;
  empty: boolean;
}) {
  const [expanded, setExpanded] = useState(true);
  const [motion, setMotion] = useState<{ pose: Pose; from: Pose }>({ pose: "closed", from: "closed" });
  const [yaw, setYaw] = useState(0);
  const [reduced, setReduced] = useState(false);
  const [reading, setReading] = useState<number | null>(null);
  const stageRef = useRef<HTMLElement>(null);
  const pose = motion.pose;

  const goTo = useCallback((next: Pose) => {
    setMotion((current) => (current.pose === next ? current : { pose: next, from: current.pose }));
  }, []);

  // Choosing another suite, or coming back to one, starts it at rest.
  const [shownId, setShownId] = useState(suite?.id);
  if (shownId !== suite?.id) {
    setShownId(suite?.id);
    setMotion({ pose: "closed", from: "closed" });
    setYaw(0);
    setReading(null);
  }

  // A panel click on one piece of an invitation: the outer piece shows the suite closed,
  // a card takes the cards out and opens that card in the reader.
  const router = useRouter();
  const [request, setRequest] = useState<{ id: string; card: number | null } | null>(null);

  function onPart(id: string, card: number | null) {
    setRequest({ id, card });
    if (id !== suite?.id) router.push(`/?id=${encodeURIComponent(id)}`, { scroll: false });
  }

  useEffect(() => {
    if (!request || request.id !== suite?.id) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const later = (ms: number, run: () => void) => timers.push(setTimeout(run, ms));
    const current = stageRef.current?.querySelector<HTMLElement>("[data-suite]")?.dataset.pose;
    if (request.card === -1) {
      // The belly band: the cards out of the shell, still bound.
      later(0, () => {
        setReading(null);
        goTo("open");
        setRequest(null);
      });
    } else if (request.card === null) {
      later(0, () => {
        setReading(null);
        goTo("closed");
        setYaw(0);
        setRequest(null);
      });
    } else {
      const card = request.card;
      const wait = reduced || current === "splayed" ? 0 : current === "open" ? 1100 : 1700;
      later(current === "splayed" ? 0 : 60, () => goTo("splayed"));
      later(wait, () => {
        setReading(card);
        setRequest(null);
      });
    }
    return () => timers.forEach(clearTimeout);
  }, [request, suite?.id, reduced, goTo]);

  const [dialog, setDialog] = useState<DialogTarget | null>(null);

  function onSaved(id: string) {
    setDialog(null);
    router.push(`/?id=${encodeURIComponent(id)}`, { scroll: false });
    router.refresh();
  }

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  const cardNode = useCallback(
    (index: number) => stageRef.current?.querySelector<HTMLElement>(`[data-card][data-index="${index}"]`) ?? null,
    [],
  );

  return (
    <div className="studio" data-panel={expanded ? "expanded" : "collapsed"}>
      <SidePanel
        items={items}
        selectedId={suite?.id}
        activeCard={reading}
        skipped={skipped}
        onPart={onPart}
        onAdd={(group) => setDialog({ mode: "create", group })}
        onEdit={(item) => setDialog({ mode: "edit", item })}
        expanded={expanded}
        onToggle={() => setExpanded((value) => !value)}
      />
      {dialog ? (
        <UploadDialog
          key={dialog.mode === "edit" ? dialog.item.id : "create"}
          target={dialog}
          groups={groupItems(items).map(([group]) => group)}
          onClose={() => setDialog(null)}
          onSaved={onSaved}
        />
      ) : null}
      <main className="stage" ref={stageRef}>
        {empty || !suite ? (
          <p className="stage-empty">No complete iteration is available.</p>
        ) : (
          <>
            <header className="stage-head" key={`head-${suite.id}`}>
              <p className="stage-kicker">{suite.construction.replace("-", " ")}</p>
              <h2 className="stage-title">{suite.title}</h2>
            </header>
            <SuiteStage
              key={`stage-${suite.id}`}
              suite={suite}
              pose={pose}
              from={motion.from}
              yaw={yaw}
              reduced={reduced}
              readingIndex={reading}
              onStep={() => goTo(pose === "closed" ? "open" : "splayed")}
              onRead={setReading}
              onYaw={(delta) => setYaw((current) => current + delta)}
            />
            <p className="hint" aria-live="polite" key={`hint-${suite.id}-${pose}`}>
              {HINT[suite.construction][pose]}
            </p>
            <div className="controls">
              <button type="button" onClick={() => goTo("open")} aria-pressed={pose === "open"}>
                Open
              </button>
              <button type="button" onClick={() => goTo("splayed")} aria-pressed={pose === "splayed"}>
                Splay
              </button>
              <button type="button" onClick={() => setYaw((current) => current + 45)}>
                Rotate
              </button>
              <button
                type="button"
                onClick={() => {
                  setReading(null);
                  goTo("closed");
                  setYaw(0);
                }}
              >
                Reset
              </button>
            </div>
            {reading !== null ? (
              <CardReader
                suite={suite}
                index={reading}
                reduced={reduced}
                source={cardNode}
                onIndex={setReading}
                onClose={() => setReading(null)}
              />
            ) : null}
          </>
        )}
      </main>
    </div>
  );
}
