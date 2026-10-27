# Adding an invitation or a card design

This is the how-to for putting a design into the studio. There are two ways, and neither needs a code change:

- **Upload from the page.** Use the side panel's **+ New group** button, or a group's **+** button, and drop your images into the dialog. This is the quickest way.
- **Add files by hand.** Make a folder under `iterations/`, add a `descriptor.json` and your images, and reload the page.

Both end up as the same thing on disk: one folder per invitation.

## How the studio thinks about an invitation

The side panel lists **groups**. Each group holds **invitations**, and each invitation expands to show its pieces:

```text
DEFAULT                       ← group (the four starters)
  Atelier suite               ← one invitation = one folder under iterations/
    ├─ Envelope    outer      ← the outer piece: envelope, cover, doors, or band
    ├─ Belly band  binds      ← optional band around the cards
    ├─ Invitation  card 1     ← up to four inner cards
    ├─ Itinerary   card 2
    └─ Details     card 3
SPRING IDEAS                  ← a group you made
  Garden suite
    ├─ …
    └─ Edit designs…          ← reopens the upload dialog for this invitation
```

Clicking a piece in the panel shows it:

- **Outer piece:** the invitation, closed.
- **Belly band:** the cards out of the envelope, still bound.
- **Card:** the cards spread out, with that card open in the reader.

## Groups

- **Default** holds the four starter invitations: Atelier suite, Belly band, Booklet, and French door. They are edited as files, not from the page.
- Any other group is yours. A group exists as soon as one invitation names it. Make one from **+ New group** in the upload dialog.
- Groups are listed with Default first, then by name. Invitations within a group are listed by title.

## Upload from the page

1. Click **+ New group** at the bottom of the panel, or the **+** next to a group's name.
2. Fill in:
   - **Title.** The folder name is made from it, for example "Garden suite" becomes `iterations/garden-suite/`. A title already in use gets `-2`, `-3`, and so on. An existing folder is never reused.
   - **Group.** Pick a group, or choose **New group…** and type a name. Default is not offered.
   - **Construction.** Envelope, Booklet, French door, or Belly band.
   - **Invitation wording** (optional). The alt text for card 1, and its text when it has no image.
3. Drop images, or click an area to pick a file:

   | Drop area | Becomes | Shows as |
   | --- | --- | --- |
   | Cover | `cover.<ext>` | Envelope front (flap and pocket), booklet cover, or both doors |
   | Cover back | `cover-back.<ext>` | The envelope's back, the booklet's back cover, or the back panel: what shows when the suite is turned around |
   | Inner flap | `inner-flap.<ext>` | Inside of the envelope flap, which also lines the envelope; the inside of a booklet cover or of both doors |
   | Card 1 | `card-1.<ext>`, role `letter` | Invitation / Letter |
   | Card 2 | `card-2.<ext>`, role `theme` | Itinerary / Theme |
   | Card 3 | `card-3.<ext>`, role `qr` | Details / QR |
   | Card 4 | `card-4.<ext>`, role `note` | Note |
   | Belly band | `band.<ext>` | The band around the cards (or the outer band of a Belly band suite) |
   | Wax seal | `seal.<ext>` | The round seal on the envelope flap |

4. Give sizes (optional). Pick a **unit** (inches, centimetres, or millimetres), then type the real printed width × height under the Cover, each card, the Belly band, and the Wax seal (its diameter). Each card also has a **shape**: rectangle, rounded corners, circle, or arch top.
   - Every piece in one invitation is drawn on one scale, so a 2 × 2 in round card shows a third the width of a 6 in invitation card.
   - When the Cover has a size, everything is measured against it. Without one, the largest sized card is fitted to the stage and the others follow.
   - Leave a size empty to use the drawn default for that piece. A card bigger than its envelope is shrunk to fit inside.
5. Leave **Bind the cards with a belly band** ticked to add a band, even without band art. A plain wine band is drawn then.
6. Click **Create invitation**. The page opens on your new invitation.

To change an invitation later, open it in the panel and click **Edit designs…**. Dropping into an area replaces that one file. The **×** on an area removes it. At least one card has to stay.

The upload takes PNG, JPEG, WebP, or GIF, up to 20 MB each. The type is read from the file itself, not its name.

## Add files by hand

1. Make a new folder under `invites/iterations/`, in lowercase words joined by hyphens, for example `iterations/garden-suite/`. Do not rename or reuse an existing folder.
2. Put your images in that folder.
3. Add `descriptor.json`:

   ```json
   {
     "id": "garden-suite",
     "title": "Garden suite",
     "group": "Spring ideas",
     "construction": "envelope",
     "unit": "in",
     "cover": { "image": "cover.png", "size": { "w": 9, "h": 6.25 } },
     "coverBack": { "image": "cover-back.png" },
     "innerFlap": { "image": "inner-flap.png" },
     "band": { "image": "band.png", "text": "NC27", "size": { "w": 1, "h": 6 } },
     "seal": { "image": "seal.png", "size": { "w": 1.25, "h": 1.25 } },
     "cards": [
       { "role": "letter", "text": "You are invited to NC27, 2026.", "image": "invitation.png", "size": { "w": 7, "h": 5 } },
       { "role": "theme", "text": "Itinerary", "image": "itinerary.png", "size": { "w": 2, "h": 2 }, "shape": "circle" },
       { "role": "qr", "url": "https://example.com/nc27" },
       { "role": "note", "text": "Dress code: formal" }
     ]
   }
   ```

4. Reload the page.

### Descriptor fields

| Field | Required | What it does |
| --- | --- | --- |
| `id` | yes | Must match the folder name exactly. |
| `title` | yes | The name in the panel and above the stage. |
| `construction` | yes | `envelope`, `booklet`, `french-door`, or `belly-band`. |
| `cards` | yes | One to four cards. Each `role` can appear once. |
| `group` | no | The panel group. Leave it out for Default. |
| `unit` | no | `in`, `cm`, or `mm`, for every `size` in this invitation. |
| `cover` | no | `{ "image": "cover.png", "size": { "w": 9, "h": 6.25 } }`. Art for the outer piece, and its real size. |
| `coverBack` | no | `{ "image": "cover-back.png" }`. The back of the outer piece. |
| `innerFlap` | no | `{ "image": "inner-flap.png" }`. The inside of the flap or cover. |
| `band` | no | `{ "image": "band.png", "text": "NC27", "size": {…} }`, or `true` for a plain band. Binds the cards. |
| `seal` | no | `{ "image": "seal.png", "size": {…} }`. The envelope's wax seal. |

Each card:

| Field | Required | What it does |
| --- | --- | --- |
| `role` | yes | `letter`, `theme`, `qr`, or `note`. |
| `image` | no | A plain file name in the same folder, with no folders or `..`. Allowed types are `png`, `jpg`, `jpeg`, `webp`, and `gif`. |
| `text` | no | For a `letter`, its words, and the image's alt text. For an envelope `theme`, its name in the panel. For a `note`, its words. |
| `url` | no | For a `qr` card with no image, an `http` or `https` link turned into a QR code. It is never a clickable link. |
| `size` | no | `{ "w": 2, "h": 2 }` in the invitation's `unit`. Sets the card's size relative to the others. |
| `shape` | no | `rect` (default), `rounded`, `circle`, or `arch`. The outline of the face and its paper edge. |

A size that is not two positive numbers is ignored, not a reason to skip the invitation.

What a card shows, in order: your image if the file exists, then a QR code, then its text, then a plain label.

## Constructions

| `construction` | Outer piece | How it opens | Card names |
| --- | --- | --- | --- |
| `envelope` | Envelope with a wax seal | Flap lifts, cards rise, band slides off, cards line up in a row | Invitation, Itinerary, Details, Note |
| `booklet` | Cover | Cover swings open on its spine | Letter, Theme, QR, Note |
| `french-door` | Two doors | Doors swing outward | Letter, Theme, QR, Note |
| `belly-band` | Band around the stack | Band slides off to the side | Letter, Theme, QR, Note |

## Image sizes

If you give real sizes, export each image at the same aspect ratio as its size. The rest of this section is for pieces without a size.

Cards are enlarged up to about 2.4× in the reader, so export at about 5× the size shown. Images are cropped to fill (`cover`), so match the shape.

| Piece | Shape on stage | Export at |
| --- | --- | --- |
| Envelope cover | 360 × 250 (landscape) | 1800 × 1250 px |
| Envelope card 1 (Invitation) | 316 × 212 (landscape, about 3:2) | 1580 × 1060 px |
| Envelope card 2 (Itinerary) | 156 × 218 (portrait, arched top) | 780 × 1090 px |
| Envelope cards 3 and 4 | 168 × 216 (portrait) | 840 × 1080 px |
| Envelope belly band | 60 × 226 (tall strip) | 300 × 1130 px |
| Booklet, French door, Belly band cards and cover | 280 × 380 (portrait) | 1400 × 1900 px |
| Belly band on those | 300 × 76 (wide strip) | 1500 × 380 px |
| Wax seal | 46 × 46 (round) | 300 × 300 px, square |

Tips:

- For the arched Itinerary card and the round seal, use a PNG with transparent corners.
- Keep important text away from the outer 5% of an image, where the edge and shadow sit.
- An image replaces the whole printed face, including the default border and lettering.

## Where other files go

| Folder | Use it for | Shown in the studio? |
| --- | --- | --- |
| `iterations/<id>/` | One invitation: `descriptor.json` and its images | Yes |
| `assets/` | Shared art such as a logo or a texture | No. Copy what an invitation needs into its folder |
| `moodboard/` | Inspiration photos | No |
| `notes/` | Notes like this one | No |

## What needs code

- **More than four cards, or another card kind.** The roles are in `lib/cards.ts` (`ROLES`, `MAX_CARDS`, `SLOT_ROLE`). The envelope's row layout is `envelopeRow` in `components/suite-stage.tsx`, and the card faces are in `components/suite-faces.tsx`.
- **A new construction** (a new way to open). It needs a hinge in `components/suite-stage.tsx` and `components/studio.css`, and its name added to `CONSTRUCTIONS` in `lib/cards.ts`.
- **Separate art for the flap lining and the envelope lining.** Today the Inner flap image does both.

## Check your work

1. Reload the page. Your title should be in its group. If you see **"N skipped"** under the list instead, a descriptor broke a rule above. The usual causes are an `id` that does not match the folder name, a repeated `role`, more than four cards, or a `construction` that is not one of the four.
2. Click each piece in the panel. Each card should open in the reader with your art.
3. If an image shows a plain label instead, check that the file name in the descriptor matches the file exactly, extension included.

`npm test` from `invites/` checks the catalog rules, the uploads, and the four starter invitations. Your own folders do not need tests.
