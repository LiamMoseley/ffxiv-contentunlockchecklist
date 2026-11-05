import { describe, expect, it } from "vitest";
import { entryIcon, iconFile, iconsUsed, parseContentUnlockPage, type Segment, type WikiPage } from "./index";
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
  const entries = () => openLog().log.sections().flatMap((s) => s.entries);
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
  const SASTASHA = '>Sastasha</a></td>';
  const idOf = (page: WikiPage, unlock: string) => {
    const ids = openLog({ page }).log.sections().flatMap((s) => s.entries).filter((e) => e.unlock === unlock).map((e) => e.id);
    return ids;
  };
  const originalSastashaId = () => idOf(realPage, "Sastasha")[0];

  it("are derived from the normalised unlock name plus quest names, or the unlock name alone when there is no quest", () => {
    expect(idOf(realPage, "Sastasha")).toEqual(["sastasha/its-probably-pirates"]);
    expect(idOf(realPage, "Party Finder")).toEqual(["party-finder"]);
  });

  it("are unique across the real page", () => {
    const ids = openLog().log.sections().flatMap((s) => s.entries.map((e) => e.id));
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
    const page = editedPage((html) => editRow(html, SASTASHA, (row) => row.replace(">Sastasha</a>", ">Sastasha (Normal)</a>")));
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
      openLog({ page }).log.sections().flatMap((s) => s.entries).find((e) => e.id === id)?.level;

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
  const entries = () => openLog().log.sections().flatMap((s) => s.entries);
  const entryNamed = (unlock: string) => entries().filter((e) => e.unlock === unlock)[0];
  const WIKI = "https://ffxiv.consolegameswiki.com/wiki/";
  const linked = (lines: Segment[][]) =>
    lines.flat().flatMap((s) => ("text" in s && s.href ? [[s.text, s.href]] : []));
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
      [
        { text: "Unlocks in the " },
        { text: "Main Scenario Quest", href: `${WIKI}Main_Scenario_Quest` },
        { text: "." },
      ],
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
    expect(guildhests.rich.quest.map((line) => line.map((s) => ("text" in s ? s.text : "")).join("").trim())).toEqual(
      guildhests.quest.split("\n"),
    );
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
  const idsOf = (n: number) => section().entries.slice(0, n).map((e) => e.id);

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
