import { describe, expect, it } from "vitest";
import type { WikiPage } from "./index";
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

  it("tell apart duplicate rows by expansion, then by order of appearance, the first keeping the plain ID", () => {
    const page = editedPage((html) => {
      const row = rowOf(html, SASTASHA);
      const withRepeats = editRow(html, SASTASHA, (r) => `${r}\n${row}\n${row}`);
      return insertRowAtTopOf(withRepeats, "Level 51 - 60", row);
    });
    expect(idOf(page, "Sastasha")).toEqual([
      "sastasha/its-probably-pirates",
      "sastasha/its-probably-pirates@arr#2",
      "sastasha/its-probably-pirates@arr#3",
      "sastasha/its-probably-pirates@hw",
    ]);
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
