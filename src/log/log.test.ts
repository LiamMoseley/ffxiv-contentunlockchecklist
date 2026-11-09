import { describe, expect, it } from "vitest";
import { entryIcon, iconFile, iconsUsed, parseContentUnlockPage, type Segment, type WikiPage } from "./index";
import { createMemoryStorage } from "../adapters/memoryStorage";
import { editRow, editedPage, fixedClock, insertRowAtTopOf, openLog, realPage, rowOf } from "./test/harness";

describe("content from the real Content Unlock page", () => {
  it("groups the page into the six expansions, each with a levelling and a level-cap section", () => {
    const { log } = openLog();

    expect(log.expansions().map((e) => e.name)).toEqual([
      "A Realm Reborn",
      "Heavensward",
      "Stormblood",
      "Shadowbringers",
      "Endwalker",
      "Dawntrail",
    ]);
    expect(log.sections().map((s) => [s.expansionId, s.kind, s.heading])).toEqual([
      ["arr", "levelling", "Level 1 - 50"],
      ["arr", "levelCap", "Level 50"],
      ["hw", "levelling", "Level 51 - 60"],
      ["hw", "levelCap", "Level 60"],
      ["sb", "levelling", "Level 61 - 70"],
      ["sb", "levelCap", "Level 70"],
      ["shb", "levelling", "Level 71 - 80"],
      ["shb", "levelCap", "Level 80"],
      ["ew", "levelling", "Level 81 - 90"],
      ["ew", "levelCap", "Level 90"],
      ["dt", "levelling", "Level 91 - 100"],
      ["dt", "levelCap", "Level 100"],
    ]);
  });
});

describe("entries from the real Content Unlock page", () => {
  const entries = () =>
    openLog()
      .log.sections()
      .flatMap((s) => s.entries);
  const entryNamed = (unlock: string) => {
    const found = entries().filter((e) => e.unlock === unlock);
    expect(found).toHaveLength(1);
    return found[0];
  };

  it("makes one entry per wiki row", () => {
    expect(entries()).toHaveLength(429);
  });

  it("reads a levelling entry's level, unlock, type, quest, location and information as text", () => {
    expect(entryNamed("Sastasha")).toMatchObject({
      level: "15",
      itemLevel: "",
      unlock: "Sastasha",
      type: "Dungeon",
      quest: "It's Probably Pirates",
      location: "Limsa Lominsa Upper Decks (X:7, Y:5)",
      information: "Unlocks in the Main Scenario Quest.",
    });
  });

  it("reads the Level column of a level-cap section as item level", () => {
    expect(entryNamed("The Unending Coil of Bahamut (Ultimate)")).toMatchObject({
      level: "",
      itemLevel: "320",
      type: "Ultimate Raid",
      quest: "",
    });
  });

  it("reads both level and item level where a levelling section has both columns", () => {
    expect(entryNamed("The Sirensong Sea")).toMatchObject({ level: "61", itemLevel: "240" });
  });

  it("reads the wiki's '-' placeholder as no value", () => {
    expect(entryNamed("Samurai").itemLevel).toBe("");
  });

  it("keeps a row that names several quests as one entry, one quest per line", () => {
    expect(entryNamed("Guildhests").quest).toBe(
      "Simply the Hest (Gridania)\nSimply the Hest (Ul'dah)\nSimply the Hest (Limsa Lominsa)",
    );
  });
});

describe("entry IDs", () => {
  const SASTASHA = ">Sastasha</a></td>";
  const idOf = (page: WikiPage, unlock: string) => {
    const ids = openLog({ page })
      .log.sections()
      .flatMap((s) => s.entries)
      .filter((e) => e.unlock === unlock)
      .map((e) => e.id);
    return ids;
  };
  const originalSastashaId = () => idOf(realPage, "Sastasha")[0];

  it("are derived from the normalised unlock name plus quest names, or the unlock name alone when there is no quest", () => {
    expect(idOf(realPage, "Sastasha")).toEqual(["sastasha/its-probably-pirates"]);
    expect(idOf(realPage, "Party Finder")).toEqual(["party-finder"]);
  });

  it("are unique across the real page", () => {
    const ids = openLog()
      .log.sections()
      .flatMap((s) => s.entries.map((e) => e.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("ignore markup, case, extra whitespace and punctuation in the unlock and quest names", () => {
    const page = editedPage((html) =>
      editRow(html, SASTASHA, (row) =>
        row
          .replace(">Sastasha</a>", "><b>SASTASHA</b></a>")
          .replace(">It's Probably Pirates</a>", "><i>Its</i>   probably, pirates!</a>"),
      ),
    );
    expect(idOf(page, "SASTASHA")).toEqual([originalSastashaId()]);
  });

  it("stay the same when an entry's level, location or information is edited", () => {
    const page = editedPage((html) =>
      editRow(html, SASTASHA, (row) =>
        row
          .replace("<td>15</td>", "<td>16</td>")
          .replace("(<b><small>X:</small></b>7", "(<b><small>X:</small></b>8")
          .replace("Unlocks in the", "Now unlocks during the"),
      ),
    );
    expect(idOf(page, "Sastasha")).toEqual([originalSastashaId()]);
  });

  it("stay the same when the section heading is reworded", () => {
    const page = editedPage((html) => html.replace(">Level 1 - 50</h2>", ">Levels 1 to 50</h2>"));
    expect(idOf(page, "Sastasha")).toEqual([originalSastashaId()]);
  });

  it("stay the same when rows are reordered", () => {
    const page = editedPage((html) => {
      const row = rowOf(html, SASTASHA);
      return insertRowAtTopOf(html.replace(row, ""), "Level 1 - 50", row);
    });
    expect(idOf(page, "Sastasha")).toEqual([originalSastashaId()]);
  });

  it("change when the unlock is renamed", () => {
    const page = editedPage((html) =>
      editRow(html, SASTASHA, (row) => row.replace(">Sastasha</a>", ">Sastasha (Normal)</a>")),
    );
    expect(idOf(page, "Sastasha (Normal)")).not.toEqual([originalSastashaId()]);
  });

  it("tell apart duplicate rows by expansion, then by order of appearance", () => {
    const page = editedPage((html) => {
      const row = rowOf(html, SASTASHA);
      const withRepeats = editRow(html, SASTASHA, (r) => `${r}\n${row}\n${row}`);
      return insertRowAtTopOf(withRepeats, "Level 51 - 60", row);
    });
    expect(idOf(page, "Sastasha")).toEqual([
      "sastasha/its-probably-pirates@arr",
      "sastasha/its-probably-pirates@arr#2",
      "sastasha/its-probably-pirates@arr#3",
      "sastasha/its-probably-pirates@hw",
    ]);
  });

  it("never hand an entry's ID to a duplicate added in an earlier expansion", () => {
    const row = rowOf(realPage.html, SASTASHA);
    const movedToHeavensward = row.replace("<td>15</td>", "<td>55</td>");
    const original = editedPage((html) => insertRowAtTopOf(html.replace(row, ""), "Level 51 - 60", movedToHeavensward));
    const withEarlierDuplicate = editedPage(() => insertRowAtTopOf(original.html, "Level 1 - 50", row));
    const levelOf = (page: WikiPage, id: string) =>
      openLog({ page })
        .log.sections()
        .flatMap((s) => s.entries)
        .find((e) => e.id === id)?.level;

    const [idBefore] = idOf(original, "Sastasha");
    expect(levelOf(original, idBefore)).toBe("55");
    expect(levelOf(withEarlierDuplicate, idBefore) ?? "orphaned").not.toBe("15");
  });
});

describe("entry status", () => {
  const SASTASHA = "sastasha/its-probably-pirates";

  it("starts Unmarked for every entry", () => {
    const { log } = openLog();
    const statuses = new Set(log.sections().flatMap((s) => s.entries.map((e) => log.entryStatus(e.id))));
    expect([...statuses]).toEqual(["unmarked"]);
  });

  it("cycles Unmarked → Completed → Not interested → Unmarked", () => {
    const { log } = openLog();
    const seen = [];
    for (let i = 0; i < 3; i++) {
      log.cycleEntryStatus(SASTASHA);
      seen.push(log.entryStatus(SASTASHA));
    }
    expect(seen).toEqual(["completed", "notInterested", "unmarked"]);
  });

  it("changes only the entry it is cycled on", () => {
    const { log } = openLog();
    log.cycleEntryStatus(SASTASHA);
    expect(log.entryStatus("party-finder")).toBe("unmarked");
  });
});

describe("progress", () => {
  const SASTASHA = "sastasha/its-probably-pirates";

  it("keeps entry statuses across a reload", () => {
    const { log, storage } = openLog();
    log.cycleEntryStatus(SASTASHA);
    log.cycleEntryStatus("party-finder");
    log.cycleEntryStatus("party-finder");

    const { log: reloaded } = openLog({ storage });
    expect(reloaded.entryStatus(SASTASHA)).toBe("completed");
    expect(reloaded.entryStatus("party-finder")).toBe("notInterested");
  });

  it("starts with a single default character whose random ID survives a reload", () => {
    const { log, storage } = openLog();
    const { log: otherDevice } = openLog();
    const { log: reloaded } = openLog({ storage });

    expect(log.characters()).toHaveLength(1);
    expect(log.currentCharacter().id).toMatch(/^[0-9a-f-]{36}$/);
    expect(otherDevice.currentCharacter().id).not.toBe(log.currentCharacter().id);
    expect(reloaded.currentCharacter().id).toBe(log.currentCharacter().id);
  });

  it("is stored as current state with a timestamp per (character, entry), in the sync-ready shape", () => {
    const clock = fixedClock("2026-11-03T10:00:00.000Z");
    const { log, storage } = openLog({ clock });
    clock.set("2026-11-03T11:00:00.000Z");
    log.cycleEntryStatus(SASTASHA);
    clock.set("2026-11-03T12:00:00.000Z");
    log.cycleEntryStatus("party-finder");
    log.cycleEntryStatus("party-finder");
    log.cycleEntryStatus("party-finder");

    const id = log.currentCharacter().id;
    expect(JSON.parse(storage.read("contentUnlockLog.progress")!)).toEqual({
      formatVersion: 1,
      characters: {
        [id]: {
          id,
          name: "Adventurer",
          world: "",
          dataCenter: "",
          level: null,
          updatedAt: "2026-11-03T10:00:00.000Z",
          deleted: false,
        },
      },
      statuses: {
        [id]: {
          [SASTASHA]: { status: "completed", updatedAt: "2026-11-03T11:00:00.000Z" },
          "party-finder": { status: "unmarked", updatedAt: "2026-11-03T12:00:00.000Z" },
        },
      },
    });
  });
});

describe("section progress", () => {
  const SASTASHA = "sastasha/its-probably-pirates";

  it("counts Completed entries out of every entry in the section", () => {
    const { log } = openLog();
    expect(log.sectionProgress("arr-levelling")).toEqual({ completed: 0, total: 86 });

    log.cycleEntryStatus(SASTASHA);
    expect(log.sectionProgress("arr-levelling")).toEqual({ completed: 1, total: 86 });
  });

  it("leaves Not interested entries out of the count", () => {
    const { log } = openLog();
    log.cycleEntryStatus(SASTASHA);
    log.cycleEntryStatus(SASTASHA);
    log.cycleEntryStatus("party-finder");

    expect(log.entryStatus(SASTASHA)).toBe("notInterested");
    expect(log.sectionProgress("arr-levelling")).toEqual({ completed: 1, total: 85 });
  });

  it("counts each section separately", () => {
    const { log } = openLog();
    log.cycleEntryStatus(SASTASHA);
    expect(log.sectionProgress("arr-levelCap")).toEqual({ completed: 0, total: 51 });
  });
});

describe("expansion progress", () => {
  const SASTASHA = "sastasha/its-probably-pirates";

  it("counts Completed entries across both of the expansion's sections, leaving Not interested out", () => {
    const { log } = openLog();
    expect(log.expansionProgress("arr")).toEqual({ completed: 0, total: 137 });

    log.cycleEntryStatus(SASTASHA);
    log.cycleEntryStatus("party-finder");
    log.cycleEntryStatus("party-finder");
    expect(log.expansionProgress("arr")).toEqual({ completed: 1, total: 136 });
  });

  it("counts each expansion separately", () => {
    const { log } = openLog();
    log.cycleEntryStatus(SASTASHA);
    expect(log.expansionProgress("hw").completed).toBe(0);
  });
});

describe("overall progress", () => {
  it("counts Completed entries across every section of the log, leaving Not interested out", () => {
    const { log } = openLog();
    expect(log.overallProgress()).toEqual({ completed: 0, total: 429 });

    log.cycleEntryStatus("sastasha/its-probably-pirates");
    log.cycleEntryStatus("party-finder");
    log.cycleEntryStatus("party-finder");
    expect(log.overallProgress()).toEqual({ completed: 1, total: 428 });
  });
});

describe("the bundled content", () => {
  it("is the saved wiki page, parsed (run `npm run snapshot` to refresh both together)", async () => {
    const bundled = (await import("../content/bundled-content.json")).default;
    expect(bundled).toEqual(parseContentUnlockPage(realPage));
  });
});

describe("wiki links and icons in entries", () => {
  const entries = () =>
    openLog()
      .log.sections()
      .flatMap((s) => s.entries);
  const entryNamed = (unlock: string) => entries().filter((e) => e.unlock === unlock)[0];
  const WIKI = "https://ffxiv.consolegameswiki.com/wiki/";
  const linked = (lines: Segment[][]) => lines.flat().flatMap((s) => ("text" in s && s.href ? [[s.text, s.href]] : []));
  const icons = (lines: Segment[][]) => lines.flat().filter((s) => "icon" in s);

  it("links the unlock name and the quest to their wiki pages", () => {
    const sastasha = entryNamed("Sastasha");
    expect(linked(sastasha.rich.unlock)).toEqual([["Sastasha", `${WIKI}Sastasha`]]);
    expect(linked(sastasha.rich.quest)).toEqual([["It's Probably Pirates", `${WIKI}It%27s_Probably_Pirates`]]);
  });

  it("links only the words the wiki links: 'Job' in 'Job Unlock'", () => {
    expect(entryNamed("Samurai").rich.type).toEqual([[{ text: "Job", href: `${WIKI}Job` }, { text: " Unlock" }]]);
  });

  it("links the zone of a location but not its coordinates", () => {
    expect(entryNamed("Sastasha").rich.location).toEqual([
      [{ text: "Limsa Lominsa Upper Decks", href: `${WIKI}Limsa_Lominsa_Upper_Decks` }, { text: " (X:7, Y:5)" }],
    ]);
  });

  it("links phrases inside the Information text, with plain words between them", () => {
    expect(entryNamed("Sastasha").rich.information).toEqual([
      [{ text: "Unlocks in the " }, { text: "Main Scenario Quest", href: `${WIKI}Main_Scenario_Quest` }, { text: "." }],
    ]);
  });

  it("places an icon beside the quest name, as the wiki does", () => {
    const [line] = entryNamed("Sastasha").rich.quest;
    expect(line[0]).toMatchObject({ icon: expect.stringContaining("Main_Scenario_Quest_icon"), size: 24 });
    expect(line.slice(1).every((s) => "text" in s)).toBe(true);
  });

  it("places an icon where the wiki has one inside Information text", () => {
    const [line] = entryNamed("Level 1 Class Quest").rich.information;
    expect(icons([line])).toHaveLength(1);
    expect(line.map((s) => ("text" in s ? s.text : "[icon]")).join("")).toBe("This unlocks [icon] Hunting Log.");
  });

  it("gives an entry no icon where the wiki has none", () => {
    const entry = entryNamed("Level 5 Class Quest");
    expect(icons(Object.values(entry.rich).flat())).toEqual([]);
  });

  it("picks an entry's card icon by its unlock icon, else its type icon, else none", () => {
    expect(entryIcon(entryNamed("Samurai"))?.icon).toContain("Samurai_frame_icon");
    expect(entryIcon(entryNamed("Sastasha"))?.icon).toContain("Dungeons_icon1");
    expect(entryIcon(entryNamed("Level 5 Class Quest"))).toBeUndefined();
  });

  it("keeps the plain text fields free of markup", () => {
    expect(entryNamed("Sastasha").location).toBe("Limsa Lominsa Upper Decks (X:7, Y:5)");
  });

  it("splits rich text into the same lines as the plain text", () => {
    const guildhests = entryNamed("Guildhests");
    expect(
      guildhests.rich.quest.map((line) =>
        line
          .map((s) => ("text" in s ? s.text : ""))
          .join("")
          .trim(),
      ),
    ).toEqual(guildhests.quest.split("\n"));
  });

  it("downloads each distinct icon once, from the wiki's image folder", () => {
    const paths = iconsUsed(parseContentUnlockPage(realPage));
    expect(new Set(paths).size).toBe(paths.length);
    expect(paths.length).toBeGreaterThan(30);
    expect(paths.every((p) => !p.startsWith("/") && !p.includes("://"))).toBe(true);
  });

  it("names a bundled icon file from the wiki path, safe for a URL", () => {
    expect(iconFile("thumb/3/33/Housing_icon.png/48px-Housing_icon.png")).toBe("48px-Housing_icon.png");
    expect(iconFile("thumb/7/7d/Inn_%28map_icon%29.png/48px-Inn_%28map_icon%29.png")).toBe("48px-Inn__map_icon_.png");
  });

  it("gives every icon in the content a bundled file name that is unique", () => {
    const files = iconsUsed(parseContentUnlockPage(realPage)).map(iconFile);
    expect(new Set(files).size).toBe(files.length);
  });
});

describe("setting an entry status directly", () => {
  it("sets Not interested from any status, as the X key does", () => {
    const { log } = openLog();
    const id = "sastasha/its-probably-pirates";
    log.setEntryStatus(id, "notInterested");
    expect(log.entryStatus(id)).toBe("notInterested");
    log.cycleEntryStatus(id);
    log.cycleEntryStatus(id);
    log.setEntryStatus(id, "notInterested");
    expect(log.entryStatus(id)).toBe("notInterested");
  });
});

describe("undo", () => {
  const SASTASHA = "sastasha/its-probably-pirates";

  it("has nothing to undo on a fresh log", () => {
    const { log } = openLog();
    expect(log.canUndo()).toBe(false);
    expect(log.undo()).toBe(false);
  });

  it("puts a single changed entry back to its earlier status", () => {
    const { log } = openLog();
    log.cycleEntryStatus(SASTASHA);
    expect(log.canUndo()).toBe(true);

    expect(log.undo()).toBe(true);
    expect(log.entryStatus(SASTASHA)).toBe("unmarked");
    expect(log.canUndo()).toBe(false);
  });
});

describe("undo as a new change", () => {
  const SASTASHA = "sastasha/its-probably-pirates";

  it("writes the earlier status back with a fresh timestamp, never a rewind", () => {
    const clock = fixedClock("2026-11-03T10:00:00.000Z");
    const { log, storage } = openLog({ clock });
    clock.set("2026-11-03T11:00:00.000Z");
    log.cycleEntryStatus(SASTASHA);
    clock.set("2026-11-03T12:00:00.000Z");
    log.undo();

    const id = log.currentCharacter().id;
    const stored = JSON.parse(storage.read("contentUnlockLog.progress")!);
    expect(stored.statuses[id]).toEqual({
      [SASTASHA]: { status: "unmarked", updatedAt: "2026-11-03T12:00:00.000Z" },
    });
  });

  it("undoes changes newest first, one at a time", () => {
    const { log } = openLog();
    log.cycleEntryStatus(SASTASHA);
    log.cycleEntryStatus(SASTASHA);
    log.cycleEntryStatus("party-finder");

    log.undo();
    expect(log.entryStatus("party-finder")).toBe("unmarked");
    expect(log.entryStatus(SASTASHA)).toBe("notInterested");
    log.undo();
    expect(log.entryStatus(SASTASHA)).toBe("completed");
    log.undo();
    expect(log.entryStatus(SASTASHA)).toBe("unmarked");
    expect(log.canUndo()).toBe(false);
  });

  it("does not count setting an entry to the status it already has as a change", () => {
    const { log } = openLog();
    log.setEntryStatus(SASTASHA, "unmarked");
    expect(log.canUndo()).toBe(false);
  });

  it("starts empty after a reload: history is in memory only", () => {
    const { log, storage, clock } = openLog();
    log.cycleEntryStatus(SASTASHA);
    const { log: reopened } = openLog({ storage, clock });
    expect(reopened.entryStatus(SASTASHA)).toBe("completed");
    expect(reopened.canUndo()).toBe(false);
  });
});

describe("bulk actions on the shown entries", () => {
  const section = () => openLog().log.sections()[0];
  const idsOf = (n: number) =>
    section()
      .entries.slice(0, n)
      .map((e) => e.id);

  it("Complete Shown marks every shown entry Completed, leaving Not interested alone", () => {
    const { log } = openLog();
    const [a, b, c, d] = idsOf(4);
    log.setEntryStatus(b, "completed");
    log.setEntryStatus(c, "notInterested");

    expect(log.completeShownCount([a, b, c, d])).toBe(2);
    expect(log.completeShown([a, b, c, d])).toMatchObject({ changed: 2 });
    expect([a, b, c, d].map(log.entryStatus)).toEqual(["completed", "completed", "notInterested", "completed"]);
  });

  it("Clear Shown sets every shown entry back to Unmarked, Not interested included", () => {
    const { log } = openLog();
    const [a, b, c, d] = idsOf(4);
    log.setEntryStatus(a, "completed");
    log.setEntryStatus(c, "notInterested");

    expect(log.clearShownCount([a, b, c, d])).toBe(2);
    expect(log.clearShown([a, b, c, d])).toMatchObject({ changed: 2 });
    expect([a, b, c, d].map(log.entryStatus)).toEqual(["unmarked", "unmarked", "unmarked", "unmarked"]);
  });

  it("counts nothing to change when everything shown is already there", () => {
    const { log } = openLog();
    const ids = idsOf(3);
    expect(log.clearShownCount(ids)).toBe(0);
    log.completeShown(ids);
    expect(log.completeShownCount(ids)).toBe(0);
    expect(log.completeShown(ids)).toMatchObject({ changed: 0 });
  });

  it("undoes a bulk change as one step", () => {
    const { log } = openLog();
    const ids = idsOf(5);
    log.setEntryStatus(ids[1], "notInterested");
    log.completeShown(ids);

    log.undo();
    expect(ids.map(log.entryStatus)).toEqual(["unmarked", "notInterested", "unmarked", "unmarked", "unmarked"]);
    expect(log.canUndo()).toBe(true);
  });

  it("does not leave an undo step when nothing changed", () => {
    const { log } = openLog();
    log.clearShown(idsOf(3));
    expect(log.canUndo()).toBe(false);
  });
});

describe("finishing a section", () => {
  const first = () => openLog().log.sections()[0];

  it("reports the section when the last wanted entry is Completed", () => {
    const { log } = openLog();
    const section = log.sections()[0];
    const ids = section.entries.map((e) => e.id);
    for (const id of ids.slice(0, -1)) expect(log.setEntryStatus(id, "completed").sectionsFinished).toEqual([]);

    expect(log.setEntryStatus(ids.at(-1)!, "completed").sectionsFinished).toEqual([section.id]);
  });

  it("counts entries set aside as Not interested as not wanted", () => {
    const { log } = openLog();
    const ids = first().entries.map((e) => e.id);
    log.completeShown(ids.slice(0, -1));
    expect(log.setEntryStatus(ids.at(-1)!, "notInterested").sectionsFinished).toEqual([first().id]);
  });

  it("reports a section a bulk change finishes, and none when it was already finished", () => {
    const { log } = openLog();
    const ids = first().entries.map((e) => e.id);
    expect(log.completeShown(ids).sectionsFinished).toEqual([first().id]);
    expect(log.completeShown(ids).sectionsFinished).toEqual([]);
  });

  it("does not report a section with no wanted entries", () => {
    const { log } = openLog();
    const ids = first().entries.map((e) => e.id);
    for (const id of ids) log.setEntryStatus(id, "notInterested");
    expect(log.setEntryStatus(ids[0], "notInterested").sectionsFinished).toEqual([]);
  });
});

describe("adding characters", () => {
  it("adds a character with a name and optionally a World, Data Center and level", () => {
    const { log } = openLog();
    const result = log.addCharacter({ name: "Alia", world: "Zodiark", level: 72 });

    expect(result.ok).toBe(true);
    expect(log.characters().map((c) => [c.name, c.world, c.dataCenter, c.level])).toEqual([
      ["Adventurer", "", "", null],
      ["Alia", "Zodiark", "Light", 72],
    ]);
    const bare = log.addCharacter({ name: "Bren" });
    expect(bare.ok && [bare.character.world, bare.character.dataCenter, bare.character.level]).toEqual(["", "", null]);
  });

  it("requires a name and a level between 1 and 100 when one is given", () => {
    const { log } = openLog();
    expect(log.addCharacter({ name: "   " })).toEqual({ ok: false, error: "nameRequired" });
    expect(log.addCharacter({ name: "Alia", level: 0 })).toEqual({ ok: false, error: "invalidLevel" });
    expect(log.addCharacter({ name: "Alia", level: 101 })).toEqual({ ok: false, error: "invalidLevel" });
    expect(log.addCharacter({ name: "Alia", level: 7.5 })).toEqual({ ok: false, error: "invalidLevel" });
    expect(log.characters()).toHaveLength(1);
  });

  it("allows one name on two Worlds but not twice on the same World, ignoring case and spacing", () => {
    const { log } = openLog();
    expect(log.addCharacter({ name: "Alia", world: "Zodiark" }).ok).toBe(true);
    expect(log.addCharacter({ name: "Alia", world: "Ragnarok" }).ok).toBe(true);
    expect(log.addCharacter({ name: " alia ", world: "zodiark" })).toEqual({ ok: false, error: "nameTaken" });
  });

  it("counts a blank World as one shared World", () => {
    const { log } = openLog();
    expect(log.addCharacter({ name: "Alia" }).ok).toBe(true);
    expect(log.addCharacter({ name: "Alia", world: "" })).toEqual({ ok: false, error: "nameTaken" });
    expect(log.addCharacter({ name: "Alia", world: "Zodiark" }).ok).toBe(true);
  });

  it("takes the Data Center from the World, and only accepts a World from the Lodestone list", () => {
    const { log } = openLog();
    const known = log.addCharacter({ name: "Alia", world: "zodiark" });
    expect(known.ok && [known.character.world, known.character.dataCenter]).toEqual(["Zodiark", "Light"]);
    expect(log.addCharacter({ name: "Bren", world: "Newworld" })).toEqual({ ok: false, error: "unknownWorld" });
    expect(log.characters()).toHaveLength(2);
    expect(log.dataCenterOf("Ragnarok")).toBe("Chaos");
    expect(log.dataCenterOf("Newworld")).toBeNull();
    expect(log.worlds()).toContain("Zodiark");
    expect(log.worlds()).toHaveLength(85);
  });

  it("shows a character as Name (World), or the name alone with no World", () => {
    const { log } = openLog();
    const alia = log.addCharacter({ name: "Alia", world: "Zodiark" });
    expect(alia.ok && log.characterLabel(alia.character)).toBe("Alia (Zodiark)");
    expect(log.characterLabel(log.characters()[0])).toBe("Adventurer");
  });

  it("keeps added characters across a reload", () => {
    const { log, storage } = openLog();
    log.addCharacter({ name: "Alia", world: "Zodiark" });
    const { log: reloaded } = openLog({ storage });
    expect(reloaded.characters().map((c) => c.name)).toEqual(["Adventurer", "Alia"]);
  });
});

describe("switching characters", () => {
  const SASTASHA = "sastasha/its-probably-pirates";
  const added = (log: ReturnType<typeof openLog>["log"], name: string) => {
    const result = log.addCharacter({ name });
    if (!result.ok) throw new Error(result.error);
    return result.character;
  };

  it("keeps separate progress for each character, in every status, count and bulk action", () => {
    const { log } = openLog();
    const first = log.currentCharacter();
    const second = added(log, "Alia");
    log.cycleEntryStatus(SASTASHA);
    log.switchCharacter(second.id);

    expect(log.currentCharacter().id).toBe(second.id);
    expect(log.entryStatus(SASTASHA)).toBe("unmarked");
    expect(log.overallProgress().completed).toBe(0);
    expect(log.completeShownCount([SASTASHA])).toBe(1);
    log.setEntryStatus("party-finder", "notInterested");

    log.switchCharacter(first.id);
    expect(log.entryStatus(SASTASHA)).toBe("completed");
    expect(log.entryStatus("party-finder")).toBe("unmarked");
    expect(log.overallProgress().completed).toBe(1);
  });

  it("starts a new character on the first character until the player switches", () => {
    const { log } = openLog();
    const first = log.currentCharacter();
    added(log, "Alia");
    expect(log.currentCharacter().id).toBe(first.id);
  });

  it("remembers the current character across a reload", () => {
    const { log, storage } = openLog();
    const second = added(log, "Alia");
    log.switchCharacter(second.id);
    expect(openLog({ storage }).log.currentCharacter().id).toBe(second.id);
  });

  it("stores the current character's ID under its own device key", () => {
    const { log, storage } = openLog();
    const second = added(log, "Alia");
    log.switchCharacter(second.id);
    expect(storage.read("contentUnlockLog.currentCharacter")).toBe(second.id);
  });

  it("ignores switching to a character that does not exist", () => {
    const { log } = openLog();
    const first = log.currentCharacter();
    expect(log.switchCharacter("nobody")).toBe(false);
    expect(log.currentCharacter().id).toBe(first.id);
  });

  it("shows each character's own progress in the character list", () => {
    const { log } = openLog();
    const first = log.currentCharacter();
    const second = added(log, "Alia");
    log.cycleEntryStatus(SASTASHA);
    log.cycleEntryStatus("party-finder");
    log.cycleEntryStatus("party-finder");

    const entryCount = log.sections().flatMap((s) => s.entries).length;
    expect(log.characterProgress(first.id)).toEqual({ completed: 1, total: entryCount - 1 });
    expect(log.characterProgress(second.id)).toEqual({ completed: 0, total: entryCount });
  });
});

describe("editing characters", () => {
  const SASTASHA = "sastasha/its-probably-pirates";

  it("changes name, World, Data Center and level, and keeps the character's progress and ID", () => {
    const { log, storage } = openLog();
    const id = log.currentCharacter().id;
    log.cycleEntryStatus(SASTASHA);

    const result = log.editCharacter(id, { name: "Alia", world: "Zodiark", level: 60 });

    expect(
      result.ok && [
        result.character.id,
        result.character.name,
        result.character.world,
        result.character.dataCenter,
        result.character.level,
      ],
    ).toEqual([id, "Alia", "Zodiark", "Light", 60]);
    expect(log.entryStatus(SASTASHA)).toBe("completed");
    const reloaded = openLog({ storage }).log;
    expect(reloaded.entryStatus(SASTASHA)).toBe("completed");
    expect(reloaded.currentCharacter().name).toBe("Alia");
  });

  it("keeps progress when a World is added later", () => {
    const { log } = openLog();
    log.cycleEntryStatus(SASTASHA);
    log.editCharacter(log.currentCharacter().id, { name: "Adventurer", world: "Ragnarok" });
    expect(log.currentCharacter().world).toBe("Ragnarok");
    expect(log.entryStatus(SASTASHA)).toBe("completed");
  });

  it("applies the same name, World and level rules, but lets a character keep its own name", () => {
    const { log } = openLog();
    const first = log.currentCharacter();
    log.addCharacter({ name: "Alia" });

    expect(log.editCharacter(first.id, { name: "alia" })).toEqual({ ok: false, error: "nameTaken" });
    expect(log.editCharacter(first.id, { name: "" })).toEqual({ ok: false, error: "nameRequired" });
    expect(log.editCharacter(first.id, { name: "Adventurer", level: 200 })).toEqual({
      ok: false,
      error: "invalidLevel",
    });
    expect(log.editCharacter(first.id, { name: "Adventurer", level: 80 }).ok).toBe(true);
    expect(log.editCharacter("nobody", { name: "Zed" })).toEqual({ ok: false, error: "notFound" });
  });

  it("stamps the change with the time it was made", () => {
    const clock = fixedClock("2026-11-03T10:00:00.000Z");
    const { log } = openLog({ clock });
    clock.set("2026-11-03T11:00:00.000Z");
    log.editCharacter(log.currentCharacter().id, { name: "Alia" });
    expect(log.currentCharacter().updatedAt).toBe("2026-11-03T11:00:00.000Z");
  });
});

describe("resetting a character", () => {
  const SASTASHA = "sastasha/its-probably-pirates";

  it("clears only the current character's progress, Not interested included", () => {
    const { log } = openLog();
    const first = log.currentCharacter();
    const second = log.addCharacter({ name: "Alia" });
    if (!second.ok) throw new Error();
    log.cycleEntryStatus(SASTASHA);
    log.setEntryStatus("party-finder", "notInterested");
    log.switchCharacter(second.character.id);
    log.cycleEntryStatus(SASTASHA);
    log.switchCharacter(first.id);

    expect(log.resetCharacter().changed).toBe(2);

    expect(log.entryStatus(SASTASHA)).toBe("unmarked");
    expect(log.entryStatus("party-finder")).toBe("unmarked");
    expect(log.characterProgress(first.id).completed).toBe(0);
    expect(log.characterProgress(second.character.id).completed).toBe(1);
  });

  it("can be undone", () => {
    const { log } = openLog();
    log.cycleEntryStatus(SASTASHA);
    log.resetCharacter();
    expect(log.undo()).toBe(true);
    expect(log.entryStatus(SASTASHA)).toBe("completed");
  });

  it("leaves nothing to undo when there was no progress to clear", () => {
    const { log } = openLog();
    expect(log.resetCharacter().changed).toBe(0);
    expect(log.canUndo()).toBe(false);
  });

  it("keeps the character itself", () => {
    const { log } = openLog();
    log.cycleEntryStatus(SASTASHA);
    log.resetCharacter();
    expect(log.characters()).toHaveLength(1);
  });
});

describe("deleting a character", () => {
  const SASTASHA = "sastasha/its-probably-pirates";
  const twoCharacters = () => {
    const opened = openLog();
    const first = opened.log.currentCharacter();
    const second = opened.log.addCharacter({ name: "Alia", world: "Zodiark" });
    if (!second.ok) throw new Error();
    return { ...opened, first, second: second.character };
  };

  it("removes the character from the list and leaves the others untouched", () => {
    const { log, first, second } = twoCharacters();
    log.cycleEntryStatus(SASTASHA);
    expect(log.deleteCharacter(second.id)).toEqual({ ok: true });
    expect(log.characters().map((c) => c.id)).toEqual([first.id]);
    expect(log.entryStatus(SASTASHA)).toBe("completed");
  });

  it("moves to another character when the current one is deleted", () => {
    const { log, first, second } = twoCharacters();
    log.switchCharacter(second.id);
    log.deleteCharacter(second.id);
    expect(log.currentCharacter().id).toBe(first.id);
  });

  it("refuses to delete the last remaining character", () => {
    const { log, first, second } = twoCharacters();
    log.deleteCharacter(second.id);
    expect(log.deleteCharacter(first.id)).toEqual({ ok: false, error: "lastCharacter" });
    expect(log.characters()).toHaveLength(1);
    expect(log.deleteCharacter("nobody")).toEqual({ ok: false, error: "notFound" });
  });

  it("leaves a deleted marker in the stored progress rather than erasing the character (ADR-0001)", () => {
    const { log, storage, second } = twoCharacters();
    log.switchCharacter(second.id);
    log.cycleEntryStatus(SASTASHA);
    log.deleteCharacter(second.id);

    const stored = JSON.parse(storage.read("contentUnlockLog.progress")!);
    expect(stored.characters[second.id]).toMatchObject({
      id: second.id,
      name: "Alia",
      world: "Zodiark",
      deleted: true,
    });
    expect(stored.statuses[second.id][SASTASHA].status).toBe("completed");
    expect(
      openLog({ storage })
        .log.characters()
        .map((c) => c.id),
    ).not.toContain(second.id);
  });

  it("stamps the deletion with the time it was made", () => {
    const clock = fixedClock("2026-11-03T10:00:00.000Z");
    const opened = openLog({ clock });
    const second = opened.log.addCharacter({ name: "Alia" });
    if (!second.ok) throw new Error();
    clock.set("2026-11-03T11:00:00.000Z");
    opened.log.deleteCharacter(second.character.id);
    const stored = JSON.parse(opened.storage.read("contentUnlockLog.progress")!);
    expect(stored.characters[second.character.id].updatedAt).toBe("2026-11-03T11:00:00.000Z");
  });

  it("can be undone, bringing the character back with its progress", () => {
    const { log, second } = twoCharacters();
    log.switchCharacter(second.id);
    log.cycleEntryStatus(SASTASHA);
    log.deleteCharacter(second.id);

    expect(log.undo()).toBe(true);
    expect(log.characters().map((c) => c.id)).toContain(second.id);
    expect(log.currentCharacter().id).toBe(second.id);
    expect(log.entryStatus(SASTASHA)).toBe("completed");
  });

  it("lets a new character take a deleted character's name and World", () => {
    const { log, second } = twoCharacters();
    log.deleteCharacter(second.id);
    expect(log.addCharacter({ name: "Alia", world: "Zodiark" }).ok).toBe(true);
  });

  it("cannot undo a deletion whose name and World another character has since taken", () => {
    const { log, second } = twoCharacters();
    log.deleteCharacter(second.id);
    log.addCharacter({ name: "Alia", world: "Zodiark" });
    expect(log.undo()).toBe(false);
    expect(log.characters().filter((c) => c.name === "Alia")).toHaveLength(1);
  });
});

describe("searching the log", () => {
  const shownNames = (log: ReturnType<typeof openLog>["log"]) =>
    log
      .sections()
      .flatMap((s) => log.shownEntries(s.id))
      .map((e) => e.unlock);

  it("shows every entry when the search is blank", () => {
    const { log } = openLog();
    log.setFilters({ search: "   " });

    expect(shownNames(log)).toHaveLength(429);
  });

  it("matches a word in any field, ignoring case, across every section", () => {
    const { log } = openLog();

    log.setFilters({ search: "SASTASHA" });
    expect(shownNames(log)).toContain("Sastasha");

    log.setFilters({ search: "pirates" }); // quest name
    expect(shownNames(log)).toContain("Sastasha");

    log.setFilters({ search: "limsa" }); // location
    expect(shownNames(log)).toContain("Sastasha");

    log.setFilters({ search: "main scenario" }); // information
    expect(shownNames(log)).toContain("Sastasha");
  });

  it("needs every typed word to match somewhere in the entry", () => {
    const { log } = openLog();

    log.setFilters({ search: "sastasha hard" });
    expect(shownNames(log)).toEqual(["Sastasha (Hard)"]);

    log.setFilters({ search: "sastasha zzzz" });
    expect(shownNames(log)).toEqual([]);
  });
});

describe("filtering the log", () => {
  type TestLog = ReturnType<typeof openLog>["log"];
  const shown = (log: TestLog) => log.sections().flatMap((s) => log.shownEntries(s.id));
  const SASTASHA = "sastasha/its-probably-pirates";

  it("lists every content type with its entry count", () => {
    const { log } = openLog();
    const counts = log.typeCounts();

    expect(counts.slice(0, 3)).toEqual([
      { type: "Trial", count: 104 },
      { type: "Dungeon", count: 103 },
      { type: "Game Mechanic", count: 59 },
    ]);
    expect(counts).toContainEqual({ type: "PvP", count: 4 }); // "PvP" twice, "PvP\nLocation" and "PvP\nRoulette"
    expect(counts.reduce((sum, c) => sum + c.count, 0)).toBe(429);
  });

  it("filters by type", () => {
    const { log } = openLog();
    log.setFilters({ type: "Dungeon" });

    expect(shown(log)).toHaveLength(103);
    expect(shown(log).every((e) => e.type === "Dungeon")).toBe(true);
  });

  it("offers all content, no optional challenges, and optional challenges only", () => {
    const { log } = openLog();

    log.setFilters({ optionalChallenge: "only" });
    expect(shown(log)).toHaveLength(81);

    log.setFilters({ optionalChallenge: "none" });
    expect(shown(log)).toHaveLength(429 - 81);

    log.setFilters({ optionalChallenge: "all" });
    expect(shown(log)).toHaveLength(429);
  });

  it("hides completed entries, and entries marked not interested, on request", () => {
    const { log } = openLog();
    const [a, b] = log.sections()[0].entries;
    log.setEntryStatus(a.id, "completed");
    log.setEntryStatus(b.id, "notInterested");

    log.setFilters({ hideCompleted: true });
    expect(shown(log).map((e) => e.id)).not.toContain(a.id);
    expect(shown(log).map((e) => e.id)).toContain(b.id);

    log.setFilters({ hideCompleted: false, hideNotInterested: true });
    expect(shown(log).map((e) => e.id)).toContain(a.id);
    expect(shown(log).map((e) => e.id)).not.toContain(b.id);
  });

  it("combines the search with the filters", () => {
    const { log } = openLog();
    log.setFilters({ search: "extreme", type: "Trial", optionalChallenge: "only" });

    expect(shown(log).length).toBeGreaterThan(0);
    expect(shown(log).every((e) => e.type === "Trial" && e.optionalChallenge)).toBe(true);
  });

  it("leaves a section with no shown entries empty, so the UI can say so", () => {
    const { log } = openLog();
    const section = log.sections()[0];
    log.setFilters({ search: "zzzz" });

    expect(log.shownEntries(section.id)).toEqual([]);
    expect(section.entries.length).toBeGreaterThan(0);
  });

  it("makes Complete Shown and Clear Shown act on the shown entries only", () => {
    const { log } = openLog();
    const section = log.sections()[0];
    log.setFilters({ search: "sastasha" });
    const ids = log.shownEntries(section.id).map((e) => e.id);

    expect(ids).toContain(SASTASHA);
    expect(log.completeShownCount(ids)).toBe(ids.length);
    log.completeShown(ids);
    expect(log.sectionProgress(section.id).completed).toBe(ids.length);

    log.setFilters({ hideCompleted: true });
    expect(log.shownEntries(section.id)).toEqual([]);

    // Clear Shown on what is now shown touches nothing; the hidden Completed entries stay Completed.
    const shownNow = log
      .sections()
      .flatMap((s) => log.shownEntries(s.id))
      .map((e) => e.id);
    expect(log.clearShownCount(shownNow)).toBe(0);
    log.clearShown(shownNow);
    expect(log.sectionProgress(section.id).completed).toBe(ids.length);
  });

  it("counts the filters that are narrowing the log", () => {
    const { log } = openLog();
    expect(log.activeFilterCount()).toBe(0);

    log.setFilters({ search: "  " });
    expect(log.activeFilterCount()).toBe(0);

    log.setFilters({ search: "coil" });
    expect(log.activeFilterCount()).toBe(1);

    log.setFilters({ type: "Trial", optionalChallenge: "only", hideCompleted: true, hideNotInterested: true });
    expect(log.activeFilterCount()).toBe(5);

    log.setFilters({
      search: "",
      type: null,
      optionalChallenge: "all",
      hideCompleted: false,
      hideNotInterested: false,
    });
    expect(log.activeFilterCount()).toBe(0);
  });

  it("counts both hide filters as active in Available now, which only lists Unmarked entries", () => {
    const { log } = openLog();
    expect(log.activeFilterCount({ availableNow: true })).toBe(2);

    log.setFilters({ search: "coil", hideCompleted: true });
    expect(log.activeFilterCount({ availableNow: true })).toBe(3);
    expect(log.activeFilterCount()).toBe(2);
  });

  it("ignores a type or optional challenge choice that does not exist", () => {
    const { log } = openLog();
    log.setFilters({ type: "Dungeon" });

    log.setFilters({ type: "Nope" });
    log.setFilters({ optionalChallenge: "some" as "all" });

    expect(log.filters()).toMatchObject({ type: "Dungeon", optionalChallenge: "all" });
  });
});

describe("remembering the view on the device", () => {
  it("starts on the first expansion's levelling tab with nothing filtered", () => {
    const { log } = openLog();

    expect(log.selection()).toEqual({ expansion: "arr", tab: "levelling" });
    expect(log.filters()).toEqual({
      search: "",
      type: null,
      optionalChallenge: "all",
      hideCompleted: false,
      hideNotInterested: false,
    });
  });

  it("stores the selection and filters, but not the search, under one key", () => {
    const { log, storage } = openLog();
    log.setSelection({ expansion: "hw", tab: "levelCap" });
    log.setFilters({
      search: "coil",
      type: "Trial",
      optionalChallenge: "only",
      hideCompleted: true,
      hideNotInterested: true,
    });

    expect(JSON.parse(storage.read("contentUnlockLog.view")!)).toEqual({
      expansion: "hw",
      tab: "levelCap",
      type: "Trial",
      optionalChallenge: "only",
      hideCompleted: true,
      hideNotInterested: true,
    });
  });

  it("restores them when the log opens again on the same device", () => {
    const first = openLog();
    first.log.setSelection({ expansion: "all", tab: "all" });
    first.log.setFilters({ search: "coil", type: "Trial", optionalChallenge: "none", hideCompleted: true });

    const { log } = openLog({ storage: first.storage });

    expect(log.selection()).toEqual({ expansion: "all", tab: "all" });
    expect(log.filters()).toEqual({
      search: "",
      type: "Trial",
      optionalChallenge: "none",
      hideCompleted: true,
      hideNotInterested: false,
    });
  });

  it("ignores remembered values that are no longer valid", () => {
    const storage = createMemoryStorage();
    storage.write(
      "contentUnlockLog.view",
      JSON.stringify({ expansion: "gone", tab: "x", type: "Nope", optionalChallenge: "some", hideCompleted: "yes" }),
    );
    const { log } = openLog({ storage });

    expect(log.selection()).toEqual({ expansion: "arr", tab: "levelling" });
    expect(log.filters()).toMatchObject({ type: null, optionalChallenge: "all", hideCompleted: false });
  });

  it("opens normally when the remembered view is not JSON", () => {
    const storage = createMemoryStorage();
    storage.write("contentUnlockLog.view", "{oops");

    expect(openLog({ storage }).log.selection()).toEqual({ expansion: "arr", tab: "levelling" });
  });
});

describe("optional challenge entries", () => {
  const entries = () =>
    openLog()
      .log.sections()
      .flatMap((s) => s.entries);

  it("are the entries the wiki tags 'Optional challenge content', and no others", () => {
    const optional = entries().filter((e) => e.optionalChallenge);

    expect(optional).toHaveLength(81);
    expect(optional.every((e) => /optional challenge content/i.test(e.information))).toBe(true);
  });

  it("do not include entries whose free text merely says optional", () => {
    const untagged = entries().filter(
      (e) => !e.optionalChallenge && /optional/i.test(e.information + e.type + e.unlock + e.quest),
    );

    expect(untagged).toHaveLength(6);
  });
});

describe("available now", () => {
  const SASTASHA = "sastasha/its-probably-pirates";
  type OpenedLog = ReturnType<typeof openLog>["log"];
  const availableIds = (log: OpenedLog) => log.availableNow().sections.flatMap((s) => s.entries.map((e) => e.id));
  const withLevel = (level: number | null) => {
    const { log } = openLog();
    log.editCharacter(log.currentCharacter().id, { name: "Adventurer", level });
    return log;
  };

  it("asks for a level while the character has none", () => {
    expect(withLevel(null).availableNow()).toEqual({ level: null, sections: [], hidden: 0 });
  });

  it("lists levelling entries at or below the character level, across expansions", () => {
    const log = withLevel(60);
    const wanted = log
      .sections()
      .filter((s) => s.kind === "levelling")
      .flatMap((s) => s.entries)
      .filter((e) => parseInt(e.level, 10) <= 60);
    expect(availableIds(log).filter((id) => wanted.some((e) => e.id === id))).toEqual(wanted.map((e) => e.id));
    expect(availableIds(log)).toContain(SASTASHA);
    expect(availableIds(withLevel(14))).not.toContain(SASTASHA);
    expect(availableIds(withLevel(15))).toContain(SASTASHA);
  });

  it("lists a higher expansion's levelling entry once the level reaches it", () => {
    const hw = openLog()
      .log.sections()
      .find((s) => s.id === "hw-levelling")!;
    const entry = hw.entries.find((e) => e.level === "60")!;
    expect(availableIds(withLevel(59))).not.toContain(entry.id);
    expect(availableIds(withLevel(60))).toContain(entry.id);
  });

  it("lists level-cap entries only once the character reaches that expansion's level cap, with their item level", () => {
    const arrCap = openLog()
      .log.sections()
      .find((s) => s.id === "arr-levelCap")!;
    expect(arrCap.entries.length).toBeGreaterThan(0);
    expect(
      withLevel(49)
        .availableNow()
        .sections.some((s) => s.id === "arr-levelCap"),
    ).toBe(false);
    const after = withLevel(50).availableNow();
    const listed = after.sections.find((s) => s.id === "arr-levelCap")!;
    expect(listed.entries.map((e) => e.id)).toEqual(arrCap.entries.map((e) => e.id));
    expect(listed.entries.some((e) => e.itemLevel !== "")).toBe(true);
    expect(after.sections.some((s) => s.id === "hw-levelCap")).toBe(false);
  });

  it("drops an entry as soon as it is marked, and brings it back when unmarked", () => {
    const log = withLevel(15);
    log.setEntryStatus(SASTASHA, "completed");
    expect(availableIds(log)).not.toContain(SASTASHA);
    log.setEntryStatus(SASTASHA, "notInterested");
    expect(availableIds(log)).not.toContain(SASTASHA);
    log.setEntryStatus(SASTASHA, "unmarked");
    expect(availableIds(log)).toContain(SASTASHA);
  });

  it("is empty once every reachable entry is marked, and a higher level brings more", () => {
    const log = withLevel(15);
    log.completeShown(availableIds(log));
    expect(log.availableNow()).toEqual({ level: 15, sections: [], hidden: 0 });
    log.editCharacter(log.currentCharacter().id, { name: "Adventurer", level: 50 });
    expect(availableIds(log).length).toBeGreaterThan(0);
  });

  it("reads a level range such as 56-60 by its lower bound", () => {
    const hw = openLog()
      .log.sections()
      .find((s) => s.id === "hw-levelling")!;
    const ranged = hw.entries.find((e) => e.level === "56-60")!;
    expect(availableIds(withLevel(55))).not.toContain(ranged.id);
    expect(availableIds(withLevel(56))).toContain(ranged.id);
  });

  it("applies the search and filters, counting the entries they hide", () => {
    const log = withLevel(15);
    const all = availableIds(log);

    log.setFilters({ search: "sastasha" });
    const found = availableIds(log);
    expect(found).toContain(SASTASHA);
    expect(found.length).toBeLessThan(all.length);
    expect(log.availableNow().hidden).toBe(all.length - found.length);

    log.setFilters({ search: "zzzz" });
    expect(log.availableNow()).toEqual({ level: 15, sections: [], hidden: all.length });

    log.setFilters({ search: "", type: "Dungeon" });
    const dungeons = log
      .sections()
      .flatMap((s) => s.entries)
      .filter((e) => all.includes(e.id) && e.type.split("\n")[0] === "Dungeon");
    expect(availableIds(log)).toEqual(dungeons.map((e) => e.id));
  });

  it("hides nothing when no filter is set", () => {
    expect(withLevel(15).availableNow().hidden).toBe(0);
  });
});

describe("backup export and import", () => {
  const SASTASHA = "sastasha/its-probably-pirates";
  const ORPHAN = "an-entry-the-wiki-dropped";
  const T1 = "2026-11-03T10:00:00.000Z";
  const T2 = "2026-11-03T11:00:00.000Z";

  /** A device with Aria on Balmung (level 50) holding a few statuses, one of them orphaned. */
  function deviceWithAria() {
    const clock = fixedClock(T1);
    const device = openLog({ clock });
    device.log.editCharacter(device.log.currentCharacter().id, { name: "Aria", world: "Balmung", level: 50 });
    clock.set(T2);
    device.log.setEntryStatus(SASTASHA, "completed");
    device.log.setEntryStatus("party-finder", "notInterested");
    device.log.setEntryStatus(ORPHAN, "completed");
    return device;
  }

  const names = (log: ReturnType<typeof openLog>["log"]) => log.characters().map((c) => c.name);

  it("exports one JSON file with a format version, every character, its statuses and their timestamps", () => {
    const { log } = deviceWithAria();
    log.addCharacter({ name: "Bree", world: "", level: null });

    const backup = log.exportBackup();
    expect(backup.fileName).toBe("content-unlock-log-backup-2026-11-03.json");
    expect(JSON.parse(backup.json)).toEqual({
      formatVersion: 1,
      exportedAt: T2,
      characters: [
        {
          name: "Aria",
          world: "Balmung",
          dataCenter: "Crystal",
          level: 50,
          updatedAt: T1,
          statuses: {
            [SASTASHA]: { status: "completed", updatedAt: T2 },
            "party-finder": { status: "notInterested", updatedAt: T2 },
            [ORPHAN]: { status: "completed", updatedAt: T2 },
          },
        },
        { name: "Bree", world: "", dataCenter: "", level: null, updatedAt: T2, statuses: {} },
      ],
    });
  });

  it("leaves deleted characters out of the export", () => {
    const { log } = deviceWithAria();
    const bree = log.addCharacter({ name: "Bree" });
    if (!bree.ok) throw new Error("add failed");
    log.deleteCharacter(bree.character.id);

    expect(JSON.parse(log.exportBackup().json).characters.map((c: { name: string }) => c.name)).toEqual(["Aria"]);
  });

  it("round-trips: importing into a fresh device adds the character with every status, orphaned ones included", () => {
    const backup = deviceWithAria().log.exportBackup();
    const { log } = openLog();

    expect(log.importBackup(backup.json)).toEqual({
      ok: true,
      charactersAdded: 1,
      charactersMerged: 0,
      entriesAdded: 3,
    });
    const aria = log.characters().find((c) => c.name === "Aria")!;
    expect(aria).toMatchObject({ world: "Balmung", dataCenter: "Crystal", level: 50 });
    expect(aria.id).toMatch(/^[0-9a-f-]{36}$/);
    log.switchCharacter(aria.id);
    expect(log.entryStatus(SASTASHA)).toBe("completed");
    expect(log.entryStatus("party-finder")).toBe("notInterested");
    const exported = JSON.parse(log.exportBackup().json).characters;
    expect(exported.find((c: { name: string }) => c.name === "Aria").statuses).toHaveProperty(ORPHAN);
  });

  it("matches characters by name and World and adds the ones that are missing", () => {
    const backup = deviceWithAria().log.exportBackup();
    const { log } = openLog();
    const local = log.currentCharacter();
    log.editCharacter(local.id, { name: "aria", world: "Balmung" });
    log.addCharacter({ name: "Aria", world: "Ragnarok" });

    expect(log.importBackup(backup.json)).toEqual({
      ok: true,
      charactersAdded: 0,
      charactersMerged: 1,
      entriesAdded: 3,
    });
    expect(log.characters()).toHaveLength(2);
    expect(log.currentCharacter().id).toBe(local.id);
    expect(log.entryStatus(SASTASHA)).toBe("completed");
  });

  it("only fills in entries that are Unmarked here, never changing a Completed or Not interested one", () => {
    const backup = deviceWithAria().log.exportBackup();
    const { log } = openLog();
    log.editCharacter(log.currentCharacter().id, { name: "Aria", world: "Balmung" });
    log.setEntryStatus(SASTASHA, "notInterested");
    log.setEntryStatus("party-finder", "completed");

    expect(log.importBackup(backup.json)).toMatchObject({ ok: true, entriesAdded: 1 });
    expect(log.entryStatus(SASTASHA)).toBe("notInterested");
    expect(log.entryStatus("party-finder")).toBe("completed");
    expect(log.entryStatus(ORPHAN)).toBe("completed");
  });

  it("ignores backup entries that are Unmarked", () => {
    const { log: source } = openLog();
    source.setEntryStatus(SASTASHA, "completed");
    source.setEntryStatus(SASTASHA, "unmarked");
    const { log } = openLog();

    expect(log.importBackup(source.exportBackup().json)).toMatchObject({ ok: true, entriesAdded: 0 });
  });

  it("writes imported statuses as a new change with a fresh timestamp", () => {
    const backup = deviceWithAria().log.exportBackup();
    const { log, storage } = openLog({ clock: fixedClock("2026-11-05T09:00:00.000Z") });
    log.importBackup(backup.json);

    const stored = JSON.parse(storage.read("contentUnlockLog.progress")!);
    const aria = Object.values<{ id: string; name: string }>(stored.characters).find((c) => c.name === "Aria")!;
    expect(stored.statuses[aria.id][SASTASHA]).toEqual({ status: "completed", updatedAt: "2026-11-05T09:00:00.000Z" });
  });

  it("undoes an import: merged entries go back to Unmarked and added characters are removed", () => {
    const { log: source } = openLog();
    source.editCharacter(source.currentCharacter().id, { name: "Aria", world: "Balmung" });
    source.setEntryStatus(SASTASHA, "completed");
    source.addCharacter({ name: "Cleo", world: "" });

    const { log } = openLog();
    log.editCharacter(log.currentCharacter().id, { name: "Aria", world: "Balmung" });
    log.setEntryStatus("party-finder", "completed");
    expect(log.importBackup(source.exportBackup().json)).toMatchObject({ charactersAdded: 1, charactersMerged: 1 });
    expect(names(log)).toContain("Cleo");

    expect(log.undo()).toBe(true);
    expect(names(log)).not.toContain("Cleo");
    expect(log.entryStatus(SASTASHA)).toBe("unmarked");
    expect(log.entryStatus("party-finder")).toBe("completed");
  });

  it("reads a literal version 1 backup, deriving the Data Center and dropping an out-of-range level", () => {
    const { log } = openLog();
    const file = JSON.stringify({
      formatVersion: 1,
      exportedAt: T2,
      characters: [
        {
          name: "Dax",
          world: "Balmung",
          dataCenter: "Wrong",
          level: 999,
          updatedAt: T1,
          statuses: { [SASTASHA]: { status: "completed", updatedAt: T1 } },
        },
      ],
    });

    expect(log.importBackup(file)).toEqual({ ok: true, charactersAdded: 1, charactersMerged: 0, entriesAdded: 1 });
    expect(log.characters().find((c) => c.name === "Dax")).toMatchObject({ dataCenter: "Crystal", level: null });
  });

  it("undoes only the latest import when a repeat import adds nothing", () => {
    const backup = deviceWithAria().log.exportBackup();
    const { log } = openLog();
    log.importBackup(backup.json);

    expect(log.importBackup(backup.json)).toEqual({
      ok: true,
      charactersAdded: 0,
      charactersMerged: 1,
      entriesAdded: 0,
    });
    expect(log.undo()).toBe(true);
    expect(names(log)).not.toContain("Aria");
    expect(log.canUndo()).toBe(false);
  });

  it("rejects a file that is not a backup, or from a newer format, and changes nothing", () => {
    const { log, storage } = openLog();
    const stored = storage.read("contentUnlockLog.progress");

    expect(log.importBackup("not json")).toEqual({ ok: false, error: "notABackup" });
    expect(log.importBackup(JSON.stringify({ formatVersion: 1, characters: "x" }))).toEqual({
      ok: false,
      error: "notABackup",
    });
    expect(log.importBackup(JSON.stringify({ formatVersion: 2, characters: [] }))).toEqual({
      ok: false,
      error: "newerVersion",
    });
    expect(storage.read("contentUnlockLog.progress")).toBe(stored);
    expect(log.canUndo()).toBe(false);
  });
});
