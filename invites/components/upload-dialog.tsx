"use client";

import { useEffect, useRef, useState } from "react";
import {
  CARD_SLOTS,
  CONSTRUCTIONS,
  DEFAULT_GROUP,
  SHAPES,
  SIZED_SLOTS,
  SLOT_ROLE,
  UNITS,
  cardLabel,
  type CardSlot,
  type Construction,
  type Shape,
  type SizedSlot,
  type Unit,
  type UploadSlot,
} from "@/lib/cards";
import type { PanelItem } from "./side-panel";

export type DialogTarget = { mode: "create"; group?: string } | { mode: "edit"; item: PanelItem };

const NEW_GROUP = "__new__";
const ACCEPT = "image/png,image/jpeg,image/webp,image/gif";

const CONSTRUCTION_NAME: Record<Construction, string> = {
  envelope: "Envelope",
  booklet: "Booklet",
  "french-door": "French door",
  "belly-band": "Belly band",
};

const CARD_SLOT_LIST: readonly CardSlot[] = CARD_SLOTS;

const UNIT_NAME: Record<Unit, string> = { in: "inches", cm: "centimetres", mm: "millimetres" };
const SHAPE_NAME: Record<Shape, string> = {
  rect: "Rectangle",
  rounded: "Rounded corners",
  circle: "Circle",
  arch: "Arch top",
};

const BACK_HINT: Record<Construction, string> = {
  envelope: "The envelope's back, seen when turned",
  booklet: "The back cover",
  "french-door": "The back panel",
  "belly-band": "The band's back",
};

const INNER_HINT: Record<Construction, string> = {
  envelope: "Inside of the flap; also lines the envelope",
  booklet: "Inside of the front cover",
  "french-door": "Inside of both doors",
  "belly-band": "Not used",
};

const COVER_HINT: Record<Construction, string> = {
  envelope: "Envelope front, behind the flap and pocket",
  booklet: "The booklet's front cover",
  "french-door": "Both doors, split down the middle",
  "belly-band": "Not used; drop the band art below",
};

export function UploadDialog({
  target,
  groups,
  onClose,
  onSaved,
}: {
  target: DialogTarget;
  groups: string[];
  onClose: () => void;
  onSaved: (id: string) => void;
}) {
  const editing = target.mode === "edit" ? target.item : null;
  const custom = groups.filter((group) => group !== DEFAULT_GROUP);
  const startGroup = editing?.group ?? (target.mode === "create" ? target.group : undefined);
  const [title, setTitle] = useState(editing?.title ?? "");
  const [group, setGroup] = useState(startGroup ?? custom[0] ?? NEW_GROUP);
  const [newGroup, setNewGroup] = useState("");
  const [construction, setConstruction] = useState<Construction>(editing?.construction ?? "envelope");
  const [band, setBand] = useState(editing?.banded ?? true);
  const [wording, setWording] = useState(editing?.wording ?? "");
  const [unit, setUnit] = useState<Unit>(editing?.unit ?? "in");
  // Sizes are kept as typed text so a half-typed "2." is not lost.
  const [sizes, setSizes] = useState<Partial<Record<SizedSlot, { w: string; h: string }>>>(() => {
    const start: Partial<Record<SizedSlot, { w: string; h: string }>> = {};
    for (const slot of SIZED_SLOTS) {
      const size = editing?.sizes[slot];
      if (size) start[slot] = { w: String(size.w), h: String(size.h) };
    }
    return start;
  });
  const [shapes, setShapes] = useState<Partial<Record<CardSlot, Shape>>>(editing?.shapes ?? {});
  const [files, setFiles] = useState<Partial<Record<UploadSlot, File>>>({});
  const [removed, setRemoved] = useState<Set<UploadSlot>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const firstField = useRef<HTMLInputElement>(null);

  useEffect(() => {
    firstField.current?.focus();
  }, []);

  function close() {
    setLeaving(true);
    window.setTimeout(onClose, 180);
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function put(slot: UploadSlot, file: File | null) {
    setFiles((current) => {
      const next = { ...current };
      if (file) next[slot] = file;
      else delete next[slot];
      return next;
    });
    setRemoved((current) => {
      const next = new Set(current);
      if (file) next.delete(slot);
      else if (editing?.art[slot]) next.add(slot);
      return next;
    });
    if (slot === "band" && file) setBand(true);
  }

  const cardCount = CARD_SLOT_LIST.filter(
    (slot) => files[slot] || (editing?.art[slot] && !removed.has(slot)),
  ).length;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const chosenGroup = group === NEW_GROUP ? newGroup.trim() : group;
    if (!title.trim()) return setError("Give the invitation a title.");
    if (!chosenGroup) return setError("Name the new group.");
    if (cardCount === 0) return setError("Drop at least one card design.");
    const body = new FormData();
    body.set("title", title.trim());
    body.set("group", chosenGroup);
    body.set("construction", construction);
    if (band) body.set("bound", "on");
    if (wording.trim()) body.set("wording", wording.trim());
    for (const [slot, file] of Object.entries(files)) if (file) body.set(slot, file);
    body.set("unit", unit);
    for (const slot of SIZED_SLOTS) {
      body.set(`w-${slot}`, sizes[slot]?.w.trim() ?? "");
      body.set(`h-${slot}`, sizes[slot]?.h.trim() ?? "");
    }
    for (const slot of CARD_SLOT_LIST) body.set(`shape-${slot}`, shapes[slot] ?? "rect");
    for (const slot of removed) body.append("remove", slot);
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(editing ? `/api/invitations/${encodeURIComponent(editing.id)}` : "/api/invitations", {
        method: editing ? "PUT" : "POST",
        body,
      });
      const result = (await response.json()) as { id?: string; error?: string };
      if (!response.ok || !result.id) throw new Error(result.error ?? "The upload did not save.");
      onSaved(result.id);
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "The upload did not save.");
      setSaving(false);
    }
  }

  const sizeProps = (slot: SizedSlot) => ({
    unit,
    value: sizes[slot] ?? { w: "", h: "" },
    onChange: (value: { w: string; h: string }) => setSizes((current) => ({ ...current, [slot]: value })),
  });

  const slotProps = (slot: UploadSlot) => ({
    slot,
    file: files[slot],
    existing: removed.has(slot) ? undefined : editing?.art[slot],
    onFile: (file: File | null) => put(slot, file),
  });

  return (
    <div className="upload" data-leaving={leaving ? "true" : undefined} role="dialog" aria-modal="true" aria-labelledby="upload-title">
      <div className="upload-backdrop" onClick={close} />
      <form className="upload-sheet" onSubmit={submit}>
        <header className="upload-head">
          <div>
            <p className="upload-kicker">{editing ? "Edit designs" : "New invitation"}</p>
            <h2 id="upload-title">{editing ? editing.title : "Add your designs"}</h2>
          </div>
          <button type="button" className="upload-x" aria-label="Close" onClick={close}>
            ×
          </button>
        </header>

        <div className="upload-fields">
          <label>
            <span>Title</span>
            <input
              ref={firstField}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Garden suite"
              required
            />
          </label>
          <label>
            <span>Group</span>
            <select value={group} onChange={(event) => setGroup(event.target.value)}>
              {custom.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
              <option value={NEW_GROUP}>New group…</option>
            </select>
          </label>
          {group === NEW_GROUP ? (
            <label>
              <span>New group name</span>
              <input value={newGroup} onChange={(event) => setNewGroup(event.target.value)} placeholder="Spring ideas" />
            </label>
          ) : null}
          <label>
            <span>Construction</span>
            <select value={construction} onChange={(event) => setConstruction(event.target.value as Construction)}>
              {CONSTRUCTIONS.map((name) => (
                <option key={name} value={name}>
                  {CONSTRUCTION_NAME[name]}
                </option>
              ))}
            </select>
          </label>
          <label className="upload-wide">
            <span>Invitation wording (alt text for card 1)</span>
            <input value={wording} onChange={(event) => setWording(event.target.value)} placeholder="You are invited to…" />
          </label>
        </div>

        <div className="drops-head">
          <p>
            <strong>Designs and sizes.</strong> Sizes are optional. Give the real printed size so each piece
            shows at true scale next to the others; the cover&rsquo;s size sets the scale when given.
          </p>
          <label className="unit">
            <span>Unit</span>
            <select value={unit} onChange={(event) => setUnit(event.target.value as Unit)}>
              {UNITS.map((name) => (
                <option key={name} value={name}>
                  {UNIT_NAME[name]}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="drops">
          <div className="drop-cell" data-wide="true">
            <DropZone {...slotProps("cover")} label="Cover" hint={COVER_HINT[construction]} />
            <SizeFields slot="cover" label="Cover" {...sizeProps("cover")} />
          </div>
          <div className="drop-cell">
            <DropZone {...slotProps("cover-back")} label="Cover back" hint={BACK_HINT[construction]} />
          </div>
          <div className="drop-cell">
            <DropZone {...slotProps("inner-flap")} label="Inner flap" hint={INNER_HINT[construction]} />
          </div>
          {CARD_SLOT_LIST.map((slot, index) => (
            <div className="drop-cell" key={slot}>
              <DropZone
                {...slotProps(slot)}
                label={`Card ${index + 1}`}
                hint={cardLabel(construction, { role: SLOT_ROLE[slot] })}
              />
              <SizeFields slot={slot} label={`Card ${index + 1}`} {...sizeProps(slot)}>
                <select
                  aria-label={`Card ${index + 1} shape`}
                  value={shapes[slot] ?? "rect"}
                  onChange={(event) =>
                    setShapes((current) => ({ ...current, [slot]: event.target.value as Shape }))
                  }
                >
                  {SHAPES.map((shape) => (
                    <option key={shape} value={shape}>
                      {SHAPE_NAME[shape]}
                    </option>
                  ))}
                </select>
              </SizeFields>
            </div>
          ))}
          <div className="drop-cell">
            <DropZone {...slotProps("band")} label="Belly band" hint="Wraps the cards" />
            <SizeFields slot="band" label="Belly band" {...sizeProps("band")} />
          </div>
          <div className="drop-cell">
            <DropZone
              {...slotProps("seal")}
              label="Wax seal"
              hint={construction === "envelope" ? "Round, on the flap" : "Envelope only"}
            />
            <SizeFields slot="seal" label="Wax seal" {...sizeProps("seal")} round />
          </div>
        </div>

        {construction !== "belly-band" ? (
          <label className="upload-check">
            <input type="checkbox" checked={band} onChange={(event) => setBand(event.target.checked)} />
            <span>Bind the cards with a belly band</span>
          </label>
        ) : null}

        {error ? (
          <p className="upload-error" role="alert">
            {error}
          </p>
        ) : null}

        <footer className="upload-foot">
          <span className="upload-note">
            PNG, JPEG, WebP or GIF, up to 20 MB each. Saved to <code>iterations/</code>.
          </span>
          <button type="button" className="upload-cancel" onClick={close}>
            Cancel
          </button>
          <button type="submit" className="upload-save" disabled={saving}>
            {saving ? "Saving…" : editing ? "Save changes" : "Create invitation"}
          </button>
        </footer>
      </form>
    </div>
  );
}

function DropZone({
  slot,
  label,
  hint,
  file,
  existing,
  onFile,
}: {
  slot: UploadSlot;
  label: string;
  hint: string;
  file?: File;
  existing?: string;
  onFile: (file: File | null) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    // The object URL exists only after the file does, so it is set from here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const shown = file ? preview : existing && existing !== "card" ? existing : null;
  const filled = Boolean(file || existing);

  function take(list: FileList | null) {
    const picked = list?.[0];
    if (picked && picked.type.startsWith("image/")) onFile(picked);
  }

  return (
    <div
      className="drop"
      data-slot={slot}
      data-over={over ? "true" : undefined}
      data-filled={filled ? "true" : undefined}
      role="button"
      tabIndex={0}
      aria-label={`${label}: ${filled ? "replace" : "add"} image`}
      onClick={() => input.current?.click()}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          input.current?.click();
        }
      }}
      onDragOver={(event) => {
        event.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setOver(false);
        take(event.dataTransfer.files);
      }}
    >
      <input
        ref={input}
        type="file"
        accept={ACCEPT}
        hidden
        data-slot-input={slot}
        onChange={(event) => {
          take(event.target.files);
          event.target.value = "";
        }}
      />
      {shown ? <img className="drop-preview" src={shown} alt="" /> : null}
      <span className="drop-text">
        <span className="drop-label">{label}</span>
        <span className="drop-hint">{filled && !shown ? "Default design" : hint}</span>
        {!filled ? <span className="drop-cta">Drop an image or click</span> : null}
      </span>
      {filled ? (
        <button
          type="button"
          className="drop-remove"
          aria-label={`Remove ${label}`}
          onClick={(event) => {
            event.stopPropagation();
            onFile(null);
          }}
        >
          ×
        </button>
      ) : null}
    </div>
  );
}

// Width × height for one piece. A round seal or a square card can be given by one number.
function SizeFields({
  slot,
  label,
  unit,
  value,
  round,
  onChange,
  children,
}: {
  slot: SizedSlot;
  label: string;
  unit: Unit;
  value: { w: string; h: string };
  round?: boolean;
  onChange: (value: { w: string; h: string }) => void;
  children?: React.ReactNode;
}) {
  const field = (key: "w" | "h", name: string) => (
    <input
      type="number"
      inputMode="decimal"
      min="0"
      step="any"
      aria-label={`${label} ${name} in ${unit}`}
      data-size={`${key}-${slot}`}
      placeholder={key === "w" ? (round ? "Ø" : "W") : "H"}
      value={value[key]}
      onChange={(event) =>
        onChange(round ? { w: event.target.value, h: event.target.value } : { ...value, [key]: event.target.value })
      }
    />
  );
  return (
    <div className="drop-size">
      {field("w", round ? "diameter" : "width")}
      {round ? null : (
        <>
          <span aria-hidden>×</span>
          {field("h", "height")}
        </>
      )}
      <span className="drop-unit">{unit}</span>
      {children}
    </div>
  );
}
