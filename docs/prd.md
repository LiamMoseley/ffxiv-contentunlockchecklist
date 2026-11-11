# Content Unlock Log: Product Requirements

A personal checklist for Final Fantasy XIV players to track which content they have unlocked, styled
after the game's own interface.

## 1. Summary

Final Fantasy XIV locks most of its content (dungeons, trials, raids, jobs, game features) behind
quests scattered across five expansions and hundreds of levels. Players lose track of what they have
unlocked, especially when they return after a break or play more than one character.

The community wiki keeps a well-maintained list of every content unlock, grouped by level, but it is
reference material. It can't record what an individual player has done.

The Content Unlock Log turns that list into a personal checklist. Players tick off entries as they
unlock them, see their progress per expansion, find what to do next at their level, and keep separate
progress for each of their characters.

## 2. Problem statement

- The list of unlocks is long (over 400 entries) and grows with every patch.
- Players have no simple way to record which entries they've completed.
- Players with several characters ("alts") need separate progress for each.
- Much of the content is optional (high-end challenge fights, PvP, niche activities), so raw totals
  don't reflect what a player actually cares about.
- The source list changes when the game is patched: new entries are added and existing ones are
  reworded. A player's record must survive those changes.

## 3. Users

| Persona | Description | Main need |
|---|---|---|
| **Completionist** | Wants to unlock everything the game offers. | A full, accurate checklist and a clear sense of how much is left. |
| **Returning player** | Coming back after months away; unsure what they've missed. | To quickly find what's new and what they can do at their level. |
| **Alt player** | Plays a main character plus one or more alts, sometimes with the same name on different Worlds. | Separate, clearly labelled progress for each character. |
| **Casual player** | Plays at their own pace and skips content they don't enjoy. | To hide unwanted content and see progress on just what they want. |
| **Mobile user** | Checks the list on a phone while playing on PC or console. | A layout that works on a small touch screen. |
| **Multi-device player** | Ticks entries on a PC while playing, then checks the list on a phone or laptop elsewhere. | The same progress on every device, without copying backup files around. |

The app is for personal use. It isn't a shared or multi-user service.

## 4. Goals and non-goals

### Goals

1. Show the complete list of content unlocks, organised the way players think about it: by expansion
   and level.
2. Let players mark each entry as completed, or as not interested, with progress shown at every level
   of the list.
3. Keep separate progress for any number of characters.
4. Help players find what to do next: search, filters, and a view of what's available at their level.
5. Stay current with the source list without losing a player's progress.
6. Feel like part of the game, taking inspiration from its interface.
7. Work on desktop and mobile, with no account or sign-up.
8. Optionally keep progress the same across the owner's devices, without user accounts (see
   section 6.8).

### Non-goals

- **Automatic detection of progress.** The game's official website doesn't publish quest or unlock
  completion, so players tick entries themselves.
- **User accounts.** The app has one owner. It doesn't offer sign-up, sign-in, passwords, profiles
  or account management, even when sync is on.
- **Sync by default.** Out of the box, progress stays on the device. Sync is something the owner turns
  on.
- **Sharing or social features.** The app is not built for groups or free companies.
- **Being a guide.** The app links to the wiki for details instead of reproducing walkthroughs.
- **Official status.** It's an unofficial fan tool and must say so.

## 5. Content

### 5.1 Source

- The content comes from the community wiki's **Content Unlock** page, which lists every unlock in
  tables grouped by level band.
- The app must credit the wiki as its source and link to the page.
- The app does **not** show the wiki's "Updated up to Patch …" label. The owner found it out of date
  on the wiki (the content is actually current to 7.5x), so repeating it would mislead. Whether to show
  a patch at all, and where it would come from, is an open question.

### 5.2 Structure

- Content is grouped into **expansions**: A Realm Reborn, Heavensward, Stormblood, Shadowbringers,
  Endwalker and Dawntrail.
- Each expansion has two **sections**:
  - a **levelling** section (for example Level 51–60)
  - a **level-cap** section (for example Level 60), for content unlocked at the maximum level, usually
    with an item level (iLevel) requirement.
- Each **entry** is one row of the wiki's tables, exactly as the wiki lists it. A row that names
  several unlocks or quests is still one entry.
- Each entry may include:
  - required level (in a levelling section) or item level (in a level-cap section, where the wiki's
    Level column holds the item level)
  - the content that is unlocked
  - its type (Dungeon, Trial, Raid, Job Unlock, Game Mechanic and so on)
  - the quest that unlocks it
  - where to start that quest (zone and map coordinates)
  - notes, such as prerequisites, or whether it is optional challenge content.
- The wiki's icons for content types, quests and jobs must be shown alongside the text, and links to
  the wiki must be kept so players can read more.

## 6. User stories and requirements

Each story is followed by its acceptance criteria.

### 6.1 Browsing the content

**US-1. Browse by expansion.**
*As a player, I want to pick an expansion and see its content, so that I can focus on one part of the
game at a time.*
- A column of expansion tiles is always visible (a row on mobile). Each tile shows an icon, with the
  expansion's name, its level range and a small progress bar with a count beside it.
- The selected expansion is clearly highlighted.
- An expansion is shown as complete by its progress bar turning to the full blue "Quality" fill, not by
  a separate icon.
- The column can be collapsed to just the tiles, short names (ARR, HW, SB, ShB, EW, DT) and bars, with
  the full names as tooltips. On phones it is always a compact row, so the collapse control is hidden.
- A tile carries a small NEW marker while its expansion has NEW entries that haven't been marked as
  seen (US-20).

**US-2. Switch between an expansion's sections.**
*As a player, I want to switch between an expansion's levelling and level-cap lists, so that I can see
the content I'm ready for.*
- Tabs show the expansion's sections, each with a completed count (for example "12/86").
- An **All** tab shows both sections of the expansion together, with a combined count.
- If the player chooses the All tab, switching to another expansion keeps them on All.

**US-3. See everything at once.**
*As a completionist, I want to see every section on one page, so that I can scroll through the whole
list.*
- An **All** tile, set apart from the expansion tiles, shows every section with overall progress.
- Choosing an expansion returns to the single-expansion view.

**US-4. Understand each entry.**
*As a player, I want each entry's details laid out clearly, so that I know how to unlock it.*
- Entries show level, item level, unlock, type, quest, location and notes in columns on desktop, and as
  labelled cards on mobile.
- Each section heading names its expansion and section, with a progress bar and count.
- Links open the relevant wiki page without leaving the app.

### 6.2 Tracking progress

**US-5. Mark an entry as completed.**
*As a player, I want to tick off an entry when I've unlocked it, so that I have a record of my
progress.*
- Each entry has a single three-state status box: empty for Unmarked, yellow for Completed, and grey
  with a diagonal stroke for Not interested.
- Clicking or tapping the box, or anywhere on the row, cycles Unmarked → Completed → Not interested →
  Unmarked. Space does the same from the keyboard. Clicking a wiki link in the row never changes the
  status.
- A legend for the three box states is always visible.
- Completed entries are visibly distinct and dimmed, but stay readable.
- All progress counts and bars update immediately.
- Finishing a whole section is acknowledged with a short message.

**US-6. Mark an entry as not interested.**
*As a casual player, I want to set aside content I'll never do, so that my progress reflects only what
I care about.*
- Not interested is the third state of the same status box (US-5), not a separate control. A keyboard
  shortcut (X) sets it directly.
- Not-interested entries are faded, with greyscale icons, and left out of every progress count, so that
  100% means "everything I want".
- An entry can't be both completed and not interested.

**US-7. Mark many entries at once.**
*As a returning player, I want to mark everything shown as complete in one step, so that I can catch up
quickly.*
- **Complete Shown** and **Clear Shown** apply to every entry currently visible, respecting the
  current filters.
- Both ask for confirmation and say how many entries will change.
- Complete Shown leaves not-interested entries alone.
- Each button is disabled when there's nothing for it to do.

**US-8. Undo a mistake.**
*As a player, I want to undo an accidental change, so that a mis-tap doesn't cost me my record.*
- Every change to progress can be undone. Bulk changes, reset, import and deleting a character show a
  brief message with an **Undo** option; a single status change shows no message, and the Undo button
  in the hint bar undoes it.
- Undo restores the exact previous state. A standard keyboard shortcut does the same.
- Undo history belongs to the device and the current visit; it doesn't survive a reload.

**US-9. See progress at a glance.**
*As a completionist, I want to see how far along I am at every level, so that I know what's left.*
- Progress is shown overall, per expansion, per section and per tab, as counts and bars.
- Bars fill from blue towards green as they approach completion (see section 7).

### 6.3 Finding content

**US-10. Search.**
*As a player, I want to search for an entry by name, quest or place, so that I can find it without
scrolling.*
- Search matches any word in any field and looks across every section in view: the selected expansion and
  tab, or every section on the All tile.
- Keyboard shortcuts move focus to the search box: `/` and Ctrl/Cmd+K.

**US-11. Filter by type.**
*As a player, I want to see only one kind of content (for example dungeons), so that I can work through
it.*
- A type filter lists every content type with how many entries it has.

**US-12. Include or exclude optional challenge content.**
*As a casual player, I want to hide the hardest optional fights, and as a raider I want to see only
them.*
- A filter offers three options:
  - all content
  - no optional challenges
  - optional challenges only.
- "Optional challenge" means exactly the entries the wiki tags as "Optional challenge content", such
  as Extreme trials, Savage raids and Ultimates. Entries whose notes merely call them optional (for
  example "Optional Dungeon.") are not optional challenges.

**US-13. Hide what's done or unwanted.**
*As a player, I want to hide completed and not-interested entries, so that the list shows only what's
left.*
- Separate options hide completed entries and hide not-interested entries.
- A section whose entries are all hidden says so, instead of appearing empty.

**US-14. See what I can do now.**
*As a returning player, I want to see what my character can unlock at their current level, so that I
know what to do next.*
- Each character can have a level, meaning their highest job level.
- **Available now** is a tile at the top of the expansion rail, above All. Choosing it opens the view;
  choosing All or an expansion tile leaves it. It lists every Unmarked entry the character can reach, across all expansions:
  levelling entries at or below their level, and level-cap entries once they have reached that
  expansion's level cap.
- Item level isn't tracked for characters. Level-cap entries show their item level so the player can
  judge it themselves.
- If the character has no level set, Available now says so in a sentence with a **Set level** button.
- Completing an entry removes it from this view straight away.
- When nothing is left, the app says so and suggests raising the level.

### 6.4 Characters

**US-15. Track several characters.**
*As an alt player, I want separate progress for each character, so that one character's record doesn't
mix with another's.*
- Players can add, edit, switch between and delete characters.
- The current character is always visible at the top of the window.
- Every view, count, filter and action applies to the current character only.
- The character list shows each character's progress.

**US-16. Identify characters by World.**
*As an alt player with the same name on two Worlds, I want each to be tracked separately, so that I can
tell them apart.*
- A character has a name and, optionally, a World, Data Center and level.
- A name only has to be unique on its World, as in the game. Characters with no World set count as
  sharing one World, so two characters with the same name and no World aren't allowed.
- Renaming a character, or adding its World later, keeps its progress.
- Choosing a known World fills in its Data Center automatically. A World must be chosen from the list (or left blank), so a Data Center can't be entered on its own.
  Adding or editing a character and importing a backup apply the same rule.
- Characters are shown as "Name (World)" wherever they're named.

**US-17. Delete or reset safely.**
*As a player, I want to clear a character's progress or remove a character, without affecting the
others.*
- Reset clears only the current character's progress, and says so.
- Deleting a character asks for confirmation.
- The last remaining character can't be deleted.
- Both actions can be undone.

### 6.5 Keeping progress safe

**US-18. Progress is saved automatically.**
*As a player, I want my progress kept between visits without having to save, so that I can pick up
where I left off.*
- Every change is saved immediately on the device.
- The app also remembers view preferences, such as the selected expansion and tab, filters and the
  current character.

**US-19. Back up and restore.**
*As a player, I want to export my progress and import it elsewhere, so that I can keep a backup or move
to another device.*
- Export produces one backup containing every character.
- Import merges each character into the matching one, matched by name and World, or adds it if missing.
- Import only ever adds progress: it fills in entries that are Unmarked on this device and never
  changes an entry already marked Completed or Not interested here. Import can be undone.
- Backups carry a format version from the first release, so later versions of the app can still read
  them.
- Backups are saved and loaded as files, which works offline.

### 6.6 Keeping content current

**US-20. Update the list from the wiki.**
*As a player, I want to fetch the latest list after a game patch, so that new content appears in my
log.*
- An **Update** action first asks for confirmation before it fetches from the wiki, then checks the wiki
  and reports what changed (new, changed and removed entries) before applying anything.
- If nothing changed, the app says it's up to date.
- New entries are tagged **NEW** until the player marks them as seen, or until the next update.
- While there are NEW entries not yet seen, a notice names up to three of them (then "and N more"),
  with two actions:
  - **Show** filters the log to every NEW entry across all expansions. Choosing **Show all entries**,
    a tile or a tab returns to the normal view.
  - **Mark as seen** clears every NEW tag and marker at once, with a short confirming message.
- Whether NEW entries have been seen belongs to the device's log, not to a character.
- The app ships with a copy of the list, so it works offline from its first visit. A device keeps
  whichever copy is newer: if a new release of the app carries a newer list than the device has, it is
  offered for review like any other update, never applied silently.
- Content in a level band the app doesn't recognise yet (for example a new expansion) still appears,
  under a placeholder expansion named by its levels (for example "Level 101–110"), until the app
  learns its real name.
- While the device is offline, **Update** stays visible but disabled, and shows it's offline with its
  download icon overlaid with a centred red "no" sign (a ring with a diagonal slash), not a text label. Its accessible name and tooltip
  still say it's offline. If an
  update fails anyway, the app says the wiki couldn't be reached and changes nothing.

**US-21. Be told when there's an update.**
*As a returning player, I want to be told when new content is available, so that I don't have to
remember to check.*
- When opened, the app checks the wiki by itself, no more than once every 6 hours.
- Wiki edits that don't change any entry (for example a typo fix elsewhere on the page) don't raise a
  notice.
- If there's new content, it shows a notice with **Review** and **Dismiss**. It never updates without
  the player's say-so.
- Dismissing hides the notice until the wiki changes again.
- If the check fails (for example when offline), nothing is shown.

**US-22. Keep my progress when the wiki changes.**
*As a player, I want my ticks to stay with the right entries after the list is updated, so that an
update never undoes my record.*
- An entry is recognised by what it unlocks, the quest that unlocks it and its expansion. Adding or reordering
  entries, and editing an entry's level, location or notes, never affects progress.
- Rewording a section heading never affects progress. Adding a duplicate of an entry in another
  expansion, or below it in the same one, never affects the existing entry's progress. Moving an
  entry to a different expansion does, and the progress is kept as an orphan. Two identical rows in
  one expansion are told apart by order only.
- When an entry the player had progress on is renamed, the app recognises the likely new version and
  asks before moving the progress (a **suggested match**). Suggestions only pair an entry that
  disappeared in this update with one that is new in this update, in the same expansion, where the
  name or quest is unchanged or very similar. Each disappeared entry gets at most one suggestion.
  Each can be accepted or declined, and a declined pair is never suggested again.
- Progress whose entry disappears is kept, not deleted, in case the entry returns. It isn't counted
  or shown, but it is included in backups, and it reattaches by itself if the entry comes back.

### 6.7 Access

**US-23. Use it on my phone.**
*As a mobile user, I want a layout made for a small touch screen, so that I can check the list while I
play.*
- Every feature works at phone width without sideways scrolling.
- Controls that rely on hover elsewhere are always visible on touch screens.
- Expansion tiles use the community's short names (ARR, HW, SB, ShB, EW, DT) where space is tight.

**US-24. Open it without installing anything.**
*As a player, I want to open the app straight away, so that I don't need an account or setup.*
- The app runs in a web browser with no account, sign-up or installation.
- Sync (section 6.8) is optional and never needs an account.
- Once loaded, the app works offline. Only the features that need the wiki (Update and the automatic
  check) are unavailable, as described in US-20 and US-21.

### 6.8 Syncing between devices

> **Status: deferred.** Sync is not part of the first release and will be designed separately. The
> first release stores progress in a shape that sync can use later without migrating anyone's data
> (see `docs/adr/0001-local-first-sync-ready-progress.md`).

The owner uses the app on more than one device, such as a PC and a phone, and wants the same
progress on each without exporting and importing backups. The app is still personal: sync is for one
person's devices, so there are no user accounts to create or manage.

**US-25. Turn on sync.**
*As a multi-device player, I want to switch on sync once, so that my progress can follow me to my
other devices.*
- Sync is optional and off by default. With it off, the app works exactly as before.
- Turning it on doesn't involve creating an account or signing in.
- Before anything leaves the device, the app explains in plain language what will be synced.
- Everything synced belongs to the owner. There is no notion of other users.
- If the owner loses or replaces every device, they can still get their synced progress back.

**US-26. Add another device.**
*As a multi-device player, I want to add my phone in a few simple steps, so that it picks up my
progress straight away.*
- Adding a device takes only a few steps and needs no account or password.
- Only the owner can add a device. Nobody else can join their own device to the owner's progress.
- Once added, the new device shows the owner's characters and progress without an import step.
- The owner can see which devices are syncing and when each was last up to date, and can remove any
  of them. A removed device keeps its progress but stops receiving changes.

**US-27. See my changes on every device.**
*As a multi-device player, I want a tick on one device to appear on my other devices, so that I never
have to wonder which one is up to date.*
- Changes sync without the owner having to do anything.
- When devices are online, a change on one appears on the others within a few seconds, without
  reloading.
- Synced data covers characters (names, Worlds, Data Centers and levels), completed entries and
  not-interested entries.
- View preferences, such as the selected expansion, tab and filters, stay per device. A phone and a PC
  can be looking at different things.
- The owner can always tell whether a device is up to date, waiting to sync, offline or has a
  problem, and when it last synced.

**US-28. Keep working offline.**
*As a mobile user, I want to tick entries with no signal, so that a poor connection never stops me
using the app.*
- Every feature that works without sync also works offline when sync is on.
- Changes made offline are kept and synced once the connection returns, without the owner doing
  anything.
- The owner can tell when changes are still waiting to sync.

**US-29. Combine changes from different devices.**
*As a multi-device player, I want changes made on two devices to be combined, so that one device
never wipes out the other.*
- Changes to different entries or characters on different devices are all kept.
- If the same entry, or the same character, was changed on two devices, the newest change wins. The
  owner is never asked to resolve a conflict.
- Adding, editing or deleting a character on one device is reflected on the others. A character
  deleted on one device isn't brought back by another device that was offline at the time.
- Undo works as before and syncs like any other change.

**US-30. Bring my existing progress with me.**
*As a player who already uses the app on more than one device, I want adding a device to combine what
each one already has, so that nothing is lost in the switch.*
- When a device that already has progress is added, its progress is combined with the owner's synced
  progress, treating characters with the same name and World as the same character.
- Before combining, the app summarises what will happen, for example "2 characters, 140 completed
  entries".
- Combining can be undone on that device.

**US-31. Stay in step after content updates.**
*As a multi-device player, I want decisions about wiki updates to apply everywhere, so that I'm not
asked the same thing on every device.*
- Progress moved onto reworded entries on one device is moved on all devices.
- A device that hasn't picked up the latest content yet keeps progress on entries it doesn't know
  about, so nothing is lost before it catches up.

**US-32. Stop syncing.**
*As a player, I want to turn sync off whenever I like, so that I'm never locked in.*
- Turning sync off on a device keeps all of its progress on that device.
- The owner can stop syncing everywhere and have anything kept for syncing removed, with
  confirmation. Each device keeps its own progress.
- Export continues to work at any time, sync or no sync, and produces the same backup format.

## 7. Look and feel

The app should feel like an in-game window, taking inspiration from Final Fantasy XIV's
configuration screens without copying any of the game's artwork.

The detailed look was settled by a UI prototype, variant E ("Game window"). Its verdict,
[`docs/prototypes/ui-verdict.md`](prototypes/ui-verdict.md), is the primary source for colours,
sizes, breakpoints and typefaces. The runnable prototype stays on the `prototype/ui` branch. Rebuild it
properly; don't promote the prototype code.

- **Window:** a single dark charcoal window in a thick bronze frame on a black background. The title
  bar has a condensed title at the left and the current character at the right. Overall progress is
  shown on the All tile, not in the title bar.
- **Navigation:** a column of red, rounded icon tiles with gold pictograms, one per expansion, with the
  selected tile glowing. The "All" tile is a different colour to set it apart.
- **Tabs:** separate slanted, parallelogram-shaped grey tabs with gaps between them, with a small
  yellow triangle in the active tab's corner.
- **Status boxes:** small dark squares in three states: empty, bright yellow, and grey with a diagonal
  stroke (US-5).
- **Progress bars:** a dark recessed track with a glossy fill that runs from blue to yellow-green,
  inspired by the crafting window's Progress bar. A full bar switches to the blue Quality fill.
- **Links:** wiki links are blue, as on the wiki, on exactly the words the wiki links. The blue is
  lightened so it stays readable on the charcoal window.
- **Buttons:** embossed grey pill-shaped buttons with a black edge, in a footer bar. The Filters
  toggle uses the same pill and, when open, shows an inset bevel and a gold label. The Update
  button keeps its bordered look. Hover, pressed and focus states are consistent across all of them.
- **Text fields:** Search, the Type and Optional challenges drop-downs and the Characters form fields
  look like the game's text fields: a dark recessed box with a thin light-grey border, small rounded
  corners and a faint inner shadow. Hover brightens the border; focus shows a gold border and soft glow.
  The drop-downs stay native controls with the closed box styled and a custom chevron. The Filters
  checkboxes use the status-box look, without a pop or glow.
- **Dialogs and messages:** pop-ups use the same window style, framed in the thicker bronze gradient
  with a highlight on the grey body, shared by every dialog, menu and message. Each dialog's title sits
  in a title bar like the window's, with a black line beneath it, and its buttons sit in a footer band
  under a matching black line. Dialogs fade and scale in.
  Messages appear briefly near the bottom of the screen.
- **Site icon:** the browser tab shows the Main Scenario Quest icon; the home-screen icon is the same
  icon on a dark tile with a bronze border.
- **Motion:** feedback and orientation only, never needed to read a state, and switched off by the
  reduced-motion setting.
  - Setting an entry's status by hand pops its status box with a glow and sweeps a sheen across the row:
    gold for Completed, grey for Not interested. Returning to Unmarked reverses quietly. Nothing plays
    on load, on switching character, view, section or expansion, or for bulk actions, Undo or updates.
  - Progress bar fills animate, with a brief flash when an expansion reaches 100%.
  - Switching expansion or section fades the list in with a short upward slide, and the rail's active
    marker slides to the chosen expansion.
- **Sync status:** when sync is on, its status is visible at a glance, in the same visual language,
  without getting in the way.
- **Typography:** a condensed face for titles and a clean, readable sans-serif for content. The app
  falls back gracefully when web fonts are unavailable.
- **Readability first:** theming must never get in the way of reading. Text keeps good contrast, and
  completed and not-interested entries stay legible.

## 8. Quality requirements

| Area | Requirement |
|---|---|
| **Privacy** | Without sync, progress never leaves the device unless the player exports it. With sync, it's shared only between the owner's devices, and no one else can see it. Game progress isn't sensitive, so no protection beyond keeping it private to the owner is required. No accounts, tracking or analytics. |
| **Data ownership** | The owner can always get a complete copy of their synced progress, in the same form as an export, and take it elsewhere. |
| **Offline use** | Once loaded, everything except fetching updates works without a connection, with or without sync. |
| **Sync performance** | Changes reach other online devices within a few seconds. Sync never slows down ticking or browsing. |
| **Performance** | The full list of over 400 entries opens and filters instantly. Ticking an entry feels immediate. |
| **Reliability** | No action loses progress without confirmation, and every destructive action can be undone. Updates never reset progress. If sync is unavailable, the app carries on as normal and catches up later. |
| **Cost** | Sync is free, or close to it, for one person's use. |
| **Accessibility** | Fully usable by keyboard with visible focus. Entries, checkboxes and progress bars are announced properly by screen readers. Animations respect a reduced-motion setting. |
| **Responsiveness** | Works from small phones (about 360px wide) to large desktop screens, and on shorter laptop screens without cutting anything off. |
| **Maintainability** | Refreshing the content for a new patch takes one action and needs no manual editing. |
| **Attribution and legal** | Credits the wiki as the data source, carries the game's copyright notice, and describes itself as an unofficial, personal tool. |

## 9. Future considerations

These ideas are out of scope for now but are worth keeping in mind:

- **Character comparison:** a side-by-side view showing which characters have unlocked what.
- **Completion history:** when each entry was completed, and a "recently completed" list.
- **Copy location:** one-tap copying of an entry's zone and coordinates.
- **Smarter "Available now":** account for story progress and per-job levels, not just a single level.

## 10. Assumptions and constraints

- The wiki's Content Unlock page remains publicly available and keeps a broadly similar structure.
- Progress can't be read from the game, so players are trusted to tick entries themselves.
- A single "highest job level" is a good enough guide for most unlocks. Some entries also depend on
  story progress, which the app doesn't track.
- The game's World and Data Center list changes occasionally, so World entry must allow values the app
  doesn't recognise.
- Sync is for one person and their own devices. Sharing progress with other people is out of scope.
- The amount of data is small (a few characters with a few hundred entries each).

## 11. Decisions

| Question | Decision |
|---|---|
| **User accounts** | None. Sync is for one owner's devices, and nothing is built for managing users. |
| **Conflicts** | The newest change wins in every case, including deleting a character. The owner is never asked. |
| **Preferences** | View preferences don't sync. They stay per device. |
| **First release** | Everything except sync (section 6.8), which is deferred. Progress is stored ready for sync. |
| **Hosting** | A static website with no server, written in TypeScript. |
| **Content source** | A copy of the wiki list ships with the app; Update refreshes it from the wiki in the browser. |
| **Entry identity** | An entry is recognised by what it unlocks and its quest, not by its position or wording elsewhere. |
| **Import** | Import only adds progress; it never overwrites a status already on the device. |

How sync is implemented will be decided at design. The reasoning behind the main decisions is
recorded in `docs/adr/`.

## 12. Glossary

The project's vocabulary (entry, section, entry status, character, World, optional challenge and so
on) is defined in `GLOSSARY.md` at the repository root. That file is the source of truth for terms
used in this document.
