"use client";

import Link from "next/link";
import { useState } from "react";
import {
  DEFAULT_GROUP,
  WRAPPER_LABEL,
  type CardSlot,
  type Construction,
  type Role,
  type Shape,
  type Size,
  type SizedSlot,
  type Unit,
  type UploadSlot,
} from "@/lib/cards";

export type PanelPart = { role: Role; label: string };

export type PanelItem = {
  id: string;
  title: string;
  group: string;
  construction: Construction;
  coverUrl?: string;
  banded: boolean;
  wording?: string;
  // Current art per upload slot: an image URL, or "card" for a card with no image yet.
  art: Partial<Record<UploadSlot, string>>;
  unit?: Unit;
  sizes: Partial<Record<SizedSlot, Size | undefined>>;
  shapes: Partial<Record<CardSlot, Shape>>;
  parts: PanelPart[];
};

const CONSTRUCTION_LABEL: Record<Construction, string> = {
  envelope: "Envelope suite",
  booklet: "Booklet",
  "french-door": "French-door fold",
  "belly-band": "Belly-band wrap",
};

// Default first, then the reviewers' own groups by name.
export function groupItems(items: PanelItem[]) {
  const groups = new Map<string, PanelItem[]>();
  for (const item of items) groups.set(item.group, [...(groups.get(item.group) ?? []), item]);
  return [...groups.entries()].sort(([a], [b]) =>
    a === DEFAULT_GROUP ? -1 : b === DEFAULT_GROUP ? 1 : a.localeCompare(b),
  );
}

export function SidePanel({
  items,
  selectedId,
  activeCard,
  skipped,
  expanded,
  onToggle,
  onPart,
  onAdd,
  onEdit,
}: {
  items: PanelItem[];
  selectedId?: string;
  activeCard: number | null;
  skipped: number;
  expanded: boolean;
  onToggle: () => void;
  onPart: (id: string, card: number | null) => void;
  onAdd: (group?: string) => void;
  onEdit: (item: PanelItem) => void;
}) {
  // Groups and invitations follow the selection unless the reviewer opened or closed them by hand.
  const [toggled, setToggled] = useState<Record<string, boolean>>({});
  const selectedGroup = items.find((item) => item.id === selectedId)?.group;
  const flip = (key: string, open: boolean) => setToggled((current) => ({ ...current, [key]: !open }));
  let row = 0;

  return (
    <aside className="panel" data-expanded={expanded}>
      <div className="panel-head">
        <button
          type="button"
          className="panel-toggle"
          onClick={onToggle}
          aria-expanded={expanded}
        >
          <span className="panel-toggle-icon" aria-hidden />
          <span className="panel-toggle-label">{expanded ? "Hide invitations" : "Show invitations"}</span>
        </button>
      </div>
      <div className="panel-body" inert={!expanded}>
        <p className="panel-kicker">NC27</p>
        <h1 className="panel-title">Invitations</h1>
        <nav aria-label="Invitations">
          {groupItems(items).map(([group, members]) => {
            const groupKey = `group:${group}`;
            const groupOpen = toggled[groupKey] ?? (group === DEFAULT_GROUP || group === selectedGroup);
            const custom = group !== DEFAULT_GROUP;
            return (
              <section key={group} className="group" data-open={groupOpen}>
                <div className="group-head">
                  <button
                    type="button"
                    className="group-name"
                    aria-expanded={groupOpen}
                    onClick={() => flip(groupKey, groupOpen)}
                  >
                    <span className="chevron" aria-hidden />
                    <span>{group}</span>
                    <span className="group-count">{members.length}</span>
                  </button>
                  {custom ? (
                    <button
                      type="button"
                      className="group-add"
                      aria-label={`Add an invitation to ${group}`}
                      onClick={() => onAdd(group)}
                    >
                      +
                    </button>
                  ) : null}
                </div>
                <div className="fold" inert={!groupOpen}>
                  <div className="fold-inner">
                    {members.map((item) => {
                      const selected = selectedId === item.id;
                      const open = toggled[item.id] ?? selected;
                      return (
                        <div
                          key={item.id}
                          className="invite-group"
                          data-open={open}
                          style={{ "--row": row++ } as React.CSSProperties}
                        >
                          <div className="invite-head">
                            <Link
                              href={`/?id=${encodeURIComponent(item.id)}`}
                              scroll={false}
                              className="invite-row"
                              aria-current={selected ? "page" : undefined}
                            >
                              <span
                                className="thumb"
                                data-construction={item.construction}
                                data-cover={item.coverUrl ? "true" : undefined}
                                style={item.coverUrl ? { backgroundImage: `url(${JSON.stringify(item.coverUrl)})` } : undefined}
                                aria-hidden
                              >
                                <span className="thumb-a" />
                                <span className="thumb-b" />
                                {item.banded ? <span className="thumb-band" /> : null}
                              </span>
                              <span className="invite-row-text">
                                <span className="invite-row-title">{item.title}</span>
                                <span className="invite-row-meta">
                                  {CONSTRUCTION_LABEL[item.construction]} · {item.parts.length}{" "}
                                  {item.parts.length === 1 ? "card" : "cards"}
                                </span>
                              </span>
                            </Link>
                            <button
                              type="button"
                              className="group-toggle"
                              aria-expanded={open}
                              aria-label={`${open ? "Hide" : "Show"} the pieces of ${item.title}`}
                              onClick={() => flip(item.id, open)}
                            >
                              <span aria-hidden />
                            </button>
                          </div>
                          <div className="fold parts" inert={!open}>
                            <ul className="fold-inner parts-inner">
                              <li>
                                <button
                                  type="button"
                                  className="part"
                                  data-active={selected && activeCard === null ? "true" : undefined}
                                  onClick={() => onPart(item.id, null)}
                                >
                                  <span className="part-glyph" data-kind={item.construction} aria-hidden />
                                  <span className="part-label">{WRAPPER_LABEL[item.construction]}</span>
                                  <span className="part-kind">outer</span>
                                </button>
                              </li>
                              {item.banded ? (
                                <li>
                                  <button
                                    type="button"
                                    className="part"
                                    onClick={() => onPart(item.id, item.parts.length > 0 ? -1 : null)}
                                  >
                                    <span className="part-glyph" data-kind="belly-band" aria-hidden />
                                    <span className="part-label">Belly band</span>
                                    <span className="part-kind">binds</span>
                                  </button>
                                </li>
                              ) : null}
                              {item.parts.map((part, cardIndex) => (
                                <li key={part.role}>
                                  <button
                                    type="button"
                                    className="part"
                                    data-active={selected && activeCard === cardIndex ? "true" : undefined}
                                    onClick={() => onPart(item.id, cardIndex)}
                                  >
                                    <span className="part-glyph" data-kind={part.role} aria-hidden />
                                    <span className="part-label">{part.label}</span>
                                    <span className="part-kind">card {cardIndex + 1}</span>
                                  </button>
                                </li>
                              ))}
                              {custom ? (
                                <li>
                                  <button type="button" className="part part-edit" onClick={() => onEdit(item)}>
                                    <span className="part-glyph" data-kind="edit" aria-hidden />
                                    <span className="part-label">Edit designs…</span>
                                  </button>
                                </li>
                              ) : null}
                            </ul>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>
            );
          })}
        </nav>
        <button type="button" className="new-group" onClick={() => onAdd()}>
          <span aria-hidden>+</span> New group
        </button>
        {skipped > 0 ? <p className="panel-skipped">{skipped} skipped</p> : null}
      </div>
    </aside>
  );
}
