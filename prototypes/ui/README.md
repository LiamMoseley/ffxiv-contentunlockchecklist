# PROTOTYPE: Content Unlock Log UI variations

Throwaway code. It answers one question: **what should the Content Unlock Log's main window look like?**
It is not app code. It lives on the `prototype/ui` branch and should never be merged to `main`.

Five variations of the main window, switchable via `?variant=A|B|C|D|E`, the floating bottom bar, or the ← → keys:

| Key | Name | In one line |
|---|---|---|
| A | Config window | PRD section 7 taken literally: bronze-framed charcoal window, red tile column, slanted tabs, table rows → labelled cards on mobile, yellow checkbox + ⊘ button |
| B | Ledger | Phone-first: expansion strip with ring progress, segmented section control, two-line rows with a three-state status control, sticky action bar |
| C | Quest board | Browsing-first: big expansion banners, card grid, tap a card to stamp it Completed, Not interested collapses it to a strip |
| D | Split pane | Desktop app: navigation tree (replaces tiles and tabs), compact list with a one-tap status cycle, detail pane that becomes a bottom sheet on mobile |
| E | Game window | A refined against the user's reference screenshots of the game's configuration, Actions & Traits and crafting windows: bevelled grey window, recessed icon rail, chained slanted tabs, settings-style checkboxes, crafting-style bars, DISPLAY MODE list/card toggle |

22 sample entries copied from the wiki's Stormblood and Shadowbringers tables (copied 2026-11-03). State is in memory only.
Variant E shows the wiki's own type, quest and job icons, hotlinked with `referrerpolicy="no-referrer"` because the
wiki refuses image requests that carry another site's referrer. The real app should bundle them with its content snapshot.
Everything else (window chrome, expansion tiles, pictograms in A–D) is drawn in CSS/SVG, not taken from the game.

## Run

From the repo root:

```bash
npm --prefix prototypes/ui start
```

This installs dependencies and opens http://localhost:5199.

The verdict is in `docs/prototypes/ui-verdict.md`.
