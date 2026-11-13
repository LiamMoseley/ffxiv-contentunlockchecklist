# UI prototype verdict: what should the Content Unlock Log look like?

**Question.** What should the main window look like: expansion tiles, section tabs, entry rows (cards on
mobile), entry status controls, progress bars and footer buttons?

**Answer.** Variant **E, "Game window"**, which is Variant A (PRD section 7 taken literally) refined over several rounds
against the owner's screenshots of the game's Character Configuration, System Configuration, Actions & Traits
and crafting windows.

**Primary source.** The runnable prototype is archived at the `archive/prototype-ui` tag (archived prototypes are tags; a current one would be a `prototype/<name>` branch), code in `prototypes/ui/` (not on main). Check out that tag (`git switch --detach archive/prototype-ui`) and run it from the repo root with
`npm --prefix prototypes/ui start`, then open `http://localhost:5199/?variant=E`. Variants A–D are kept for comparison.
This is throwaway code. Rebuild the winner properly; don't promote this code.

## Variants and why E won

| Key | Name | Outcome |
|---|---|---|
| A | Config window: section 7 of the PRD taken literally | Chosen as the closest starting point, then refined into E |
| B | Ledger: phone-first strip, three-state segmented control per row | Not chosen |
| C | Quest board: banners, card grid, "Completed" stamp | Not chosen |
| D | Split pane: navigation tree, detail pane / bottom sheet | Not chosen |
| **E** | **Game window: A matched to in-game reference screenshots** | **Winner** |

The owner wanted the game's own windows matched as closely as possible, without copying the game's artwork.

## Decisions settled

### Window and palette
- **Window:** charcoal grey gradient (`#3d3d3d` → `#333` → `#2b2b2b`) on a black page.
- **Frame:** thick, about 4px, in **bronze**: a vertical metal gradient `#ecd9a6 → #c09a5c → #7c5d33 → #a07c47 → #e0c68e`, with a black line inside and outside. The same bronze frames the character menu, dialogs and messages.
- **Text:** `#eee` for body text, `#a3a3a3` for secondary text, `#7d7d7d` for faint text.
- **Accents:** checkbox yellow `#f6b93b`, gold `#f0c35a`, cream `#efe2bf`.
- **Title bar:** a condensed title ("Content Unlock Log") on the left and the character on the right ("LEVEL 80 · Name (World)", which opens the character switcher). Every item in it is centred on one line.
- **No overall progress in the title bar:** it duplicated the All tile, so it lives only there. *This differs from the PRD (see below).*

### Expansion side-pane (tile shape)
- **Recessed column** on the left.
- **Tiles:** each expansion is a **50px rounded red tile** (`#c9442b` → `#8e1f15`) with a cream edge and a gold pictogram. Beside it go the expansion's **name**, **level range** and a **thin progress bar with a count**.
- **All tile:** set apart at the top, with a blue-and-grey tile.
- **Selected tile:** a pale glow.
- **NEW marker:** a small one on the tile of any expansion with unacknowledged new entries.
- **Completion:** no tick on the tile; the blue full bar marks it (see Progress bars). The tile's sub-line still says "Complete".
- **Collapse/expand button** at the foot of the side-pane: collapsed, it shows only the tiles, short labels (All, SB, ShB) and bars, with tooltips. The button is hidden on phones, where the side-pane is always a compact row of tiles.

### Section tabs
- **Shape:** **separate** slanted grey tab buttons side by side with gaps, as in Character Configuration, not one long bar. Each has a black outline and a pale bevel.
- **Active tab:** lighter, with a **yellow triangle in its bottom-left corner**. The triangle is drawn as part of the tab's skewed shape, so it always sits in the corner.
- **Label:** each tab shows a count in brackets, e.g. "Level 61–70 (5/5)", then "Level 70 …", then "All …". (Brackets were added later, in #95, so the count reads apart from the level text.)
- **Available now:** its heading is one non-clickable tab in the selected look (yellow corner), with no glow. It reads "Level 1 to 85" and the number of rows listed (not Completed/total, since Completed rows leave the view), or "Available now" with no level set.

### Section headings
- **Panel:** rounded, as in the "ACTIONS" header, holding the expansion name and section, a bar and a count.

### Progress bars
- **Shape:** as in the crafting window, with a dark recessed track and a glossy fill.
- **While incomplete:** the fill runs from blue towards yellow-green as it fills.
- **At 100%:** the fill switches to the blue "Quality" gradient (`#2448b8 → #2f7fd8 → #3fc0dc → #57dcc8`).

### Entry rows and cards (row/card layout)
- **Desktop (wider than 1000px):** a table with the wiki's columns: status box, Level (plus iLevel where the wiki has one), Unlock, Type, Quest, Location, Information.
  - All row text is 13px (#119) and every cell is vertically centred. Column headings are 12px.
- **1000px and below:** each row becomes a stacked row (a spine with the status box and Level, a headline, Type chips, then Quest, Location and Information; see US-4), and the side-pane stays.
- **760px and below:** a phone layout:
  - the side-pane becomes a row of three tiles
  - the tabs size themselves to their labels
  - the footer sticks to the bottom
  - it works at 360px with no sideways scroll
- **DISPLAY MODE toggle** (list/grid) in the hint bar: the grid shows entries as cards, as in Actions & Traits, with the wiki icon, name, "Lv. 61 · Dungeon" and the status box.
- **Wiki icons in cells**, as the wiki places them:
  - job and other unlock icons beside the unlock name
  - type icons (dungeon, trial, raid, deep dungeon, allied society)
  - quest icons (main scenario, feature)
  - the small icons inside the Information text

  Where the wiki has no icon (Game Mechanic, Field Operations), the cell has none either.
- **Wiki links, coloured blue**, on exactly what the wiki links:
  - the unlock name and the quest
  - the type; for "Job Unlock", only "Job"
  - the zone part of the location, not the coordinates
  - the linked phrases inside the Information text

  The colour is `#8ab4f8`: the wiki's `#0645ad` lightened along the same hue so it can be read on charcoal (about 6:1 contrast instead of 2:1). Completed rows use a dimmer `#7894c4`. Clicking a link never changes the entry's status.

### Entry status
- **One three-state tick-box per entry** replaces a checkbox plus a separate "not interested" button:
  - empty = **Unmarked**
  - yellow = **Completed**
  - grey with a diagonal stroke = **Not interested**
- **Changing it:** clicking the box or anywhere on the row cycles Unmarked → Completed → Not interested → Unmarked. Space does the same, and X jumps straight to Not interested.
- **Legend:** the hint bar shows the three box states.
- **Completed rows:** dimmed text, with links in a dimmer blue.
- **Not-interested rows:** faded to about 40% opacity, with greyscale icons.
- **Counts:** they ignore Not-interested entries, as before.

### Buttons and footer
- **Style:** **embossed** grey pills with a **black edge**, a light top bevel and a dark line under it (no bottom bevel, #91). No coloured border.
- **Footer:** Clear Shown on the left and Complete Shown on the right (in the positions of "Default" and "Close"), with a gold chevron between them.
- **Hint bar** above the footer: a "?" icon, the status legend and DISPLAY MODE. At phone width (760px) the legend is hidden and the bar is a slim pinned strip with the "?", Undo and DISPLAY MODE; the legal footer scrolls with the page (#99).

### Filters
- **Style:** settings-style checkbox lines under a "Filters" heading: "Hide completed entries." and "Hide entries marked not interested."

### NEW entries
- **NEW badge:** a gold badge that sits right after the entry name.
- **Notice:** shown **only while there are unacknowledged NEW entries**, above Filters. It names up to three entries, separated by " · " because some names contain commas, then "and N more".
- **Show:** switches to a **filter of every NEW entry across all expansions**. Empty sections are hidden, the tab reads "New entries N", and no tile is highlighted. **Show all entries**, a tile or a tab returns to the normal view.
- **Mark as seen:** clears every badge and marker in one step, with a short confirming message. The seen state belongs to the log (the device), not to a character.

### Typography
- **Window title:** Barlow Condensed 400.
- **Character name and section titles:** Noto Serif Display, extra-condensed width, small capitals, to echo the game's Trajan-style headers.
- **Expansion names in the side-pane:** Saira Extra Condensed 300.
- **Body:** Noto Sans, with Segoe UI and system fonts as fallbacks.
- **Small headings** (the help dialog's headings, the Characters menu's "Character" and "Backup", and the Display Mode label): Barlow Condensed 700, 15px, uppercase, gold. The Display Mode label keeps its gold-to-orange gradient fill and glow (#119).
- **Sizes and roles** come from tokens at the top of `app.css`; `CODING_STANDARDS.md` lists them.

All four are free Google Fonts (SIL Open Font License); the game's own fonts are not used.

## PRD changes this implies

These were decided by the owner during the prototype and should be folded into `docs/prd.md`:

1. **US-5 and US-6:** a single three-state box replaces "toggle completed" plus a separate "not interested" control. Clicking the row cycles through all three states. The keyboard shortcut for Not interested remains.
2. **US-1:** the "complete" marker on an expansion tile is the blue full progress bar, not an icon. Tiles carry labels (name, level range, progress) and the side-pane can be collapsed.
3. **Section 7:** overall progress moves from the title bar to the All tile. Buttons are embossed with a black edge. The frame is thick bronze, and links are blue as on the wiki.
4. **US-20:** NEW tags can be acknowledged ("Mark as seen") before the next update, through a notice that appears only while NEW entries exist. "Show" filters to every NEW entry.
5. **Section 5.1:** **do not show the wiki's "current to patch" label**. The owner reports it is out of date on the wiki (the content is actually current to 7.5x), so showing it would mislead. Whether to show a patch at all, and where it would come from, is an open question.

## Findings worth keeping

- **The wiki blocks hotlinked images.** Image requests that carry another site's `Referer` get **HTTP 403**; without one they get 200. The prototype uses `referrerpolicy="no-referrer"`. The real app should **bundle the icons with its content snapshot** (fits ADR 0002) rather than hotlinking.
- **The wiki's link blue is unreadable on the charcoal window**, which is why the links use a lighter shade of the same hue (above).
- **The wiki's markup records which phrases are linked**, which the parser can use to rebuild the links in Information text.

## Not real data

- The 22 sample entries are real rows copied from the wiki on 2026-11-03.
- Their **NEW flags** (Viper and five others) **were added by hand** to show the styling. The wiki reported no such changes.
- Statuses and characters are made up, and nothing is saved.

## Open questions

- Should the tile's "· Complete" sub-text stay now that the blue bar marks completion?
- Should a patch label be shown at all (see PRD change 5)?
- Should the expansion names in the side-pane also use the serif, to match the character name and section titles?
