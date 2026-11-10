import { describe, expect, it } from "vitest";
import { editedPage, insertRowAtTopOf, openLog, realPage, rowOf } from "./test/harness";

describe("the open view and what it lists", () => {
  const sastashaRow = rowOf(realPage.html, ">Sastasha</a></td>");
  type OpenLog = ReturnType<typeof openLog>["log"];

  /** A log with a level, so Available now lists something, and a NEW entry from an applied update. */
  async function openWithNewAndLevel() {
    const opened = openLog();
    const { log, wiki } = opened;
    log.editCharacter(log.currentCharacter().id, { name: "Adventurer", level: 30 });
    wiki.serve({
      ...editedPage((html) =>
        insertRowAtTopOf(html, "Level 1 - 50", sastashaRow.replace(">Sastasha</a>", ">Dungeon Alpha</a>")),
      ),
      revisionId: realPage.revisionId + 1,
    });
    const check = await log.checkForUpdate();
    if (check.status !== "changes") throw new Error(`expected changes, got ${check.status}`);
    log.applyUpdate(check.preview);
    return opened;
  }

  const listedIds = (log: OpenLog) => log.listing().sections.flatMap((s) => s.entries.map((e) => e.id));
  const openers: [string, (log: OpenLog) => void][] = [
    ["sections", (log) => log.showAllEntries()],
    ["new", (log) => log.showNewEntries()],
    ["available", (log) => log.showAvailableNow()],
  ];

  it("starts on the sections view", () => {
    const { log } = openLog();
    expect(log.view()).toBe("sections");
    expect(log.listing().view).toBe("sections");
  });

  it("has one view open at a time: opening one closes the others", async () => {
    const { log } = await openWithNewAndLevel();

    for (const [first, openFirst] of openers) {
      for (const [second, openSecond] of openers) {
        openFirst(log);
        expect(log.view()).toBe(first);
        openSecond(log);
        expect(log.view()).toBe(second);
        expect(log.listing().view).toBe(second);
      }
    }
  });

  it("returns from the NEW view to the sections when an expansion or tab is chosen, and leaves Available now open", async () => {
    const { log } = await openWithNewAndLevel();
    log.showAvailableNow();
    log.setSelection({ expansion: "hw" });
    expect(log.view()).toBe("available");

    log.showNewEntries();
    log.setSelection({ tab: "levelCap" });
    expect(log.view()).toBe("sections");
  });

  it("keeps Available now open when the NEW entries are marked seen", async () => {
    const { log } = await openWithNewAndLevel();
    log.showAvailableNow();
    log.markNewSeen();
    expect(log.view()).toBe("available");
  });

  it("lists the sections the selected expansion and tab show, each with its entries that pass the filters", () => {
    const { log } = openLog();

    log.setSelection({ expansion: "arr", tab: "levelling" });
    expect(log.listing().sections.map((s) => s.id)).toEqual(["arr-levelling"]);

    log.setSelection({ tab: "levelCap" });
    expect(log.listing().sections.map((s) => s.id)).toEqual(["arr-levelCap"]);

    log.setSelection({ tab: "all" });
    expect(log.listing().sections.map((s) => s.id)).toEqual(["arr-levelling", "arr-levelCap"]);

    log.setSelection({ expansion: "all" });
    expect(log.listing().sections.map((s) => s.id)).toEqual(log.sections().map((s) => s.id));

    log.setFilters({ search: "sastasha hard" });
    const listed = log.listing().sections;
    expect(listed).toHaveLength(log.sections().length);
    expect(listed.flatMap((s) => s.entries.map((e) => e.unlock))).toEqual(["Sastasha (Hard)"]);
  });

  it("lists NEW entries and Available now by their own rules, with Available now's level and filtered-out count", async () => {
    const { log } = await openWithNewAndLevel();

    log.showNewEntries();
    expect(log.listing()).toMatchObject({ view: "new", level: null, filteredOut: 0 });
    expect(log.listing().sections.flatMap((s) => s.entries.map((e) => e.unlock))).toEqual(["Dungeon Alpha"]);

    log.showAvailableNow();
    log.setFilters({ search: "sastasha" });
    const available = log.listing();
    expect(available.level).toBe(30);
    expect(available.filteredOut).toBeGreaterThan(0);
    expect(available.sections.flatMap((s) => s.entries.map((e) => e.unlock))).toContain("Sastasha");
  });

  describe("Complete Shown and Clear Shown", () => {
    for (const [name, open] of openers) {
      it(`count and act on exactly what the ${name} view lists`, async () => {
        const { log } = await openWithNewAndLevel();
        open(log);
        const listed = listedIds(log);
        expect(listed.length).toBeGreaterThan(0);

        // Mark one listed entry Not interested and another outside the view Completed, to tell them apart.
        log.setEntryStatus(listed[0], "notInterested");
        const outside = log
          .sections()
          .flatMap((s) => s.entries)
          .find((e) => !listed.includes(e.id))!;
        log.setEntryStatus(outside.id, "completed");
        const listedAfter = listedIds(log);

        const unmarked = listedAfter.filter((id) => log.entryStatus(id) === "unmarked").length;
        expect(log.completeShownCount()).toBe(unmarked);
        expect(log.clearShownCount()).toBe(listedAfter.filter((id) => log.entryStatus(id) !== "unmarked").length);

        expect(log.completeShown().changed).toBe(unmarked);
        expect(log.entryStatus(outside.id)).toBe("completed");
        expect(log.entryStatus(listed[0])).toBe("notInterested");
        expect(listedAfter.filter((id) => log.entryStatus(id) === "unmarked")).toEqual([]);

        const toClear = log.clearShownCount();
        expect(log.clearShown().changed).toBe(toClear);
        // Whatever the view lists now (Available now drops Completed entries from it) is Unmarked.
        expect(listedIds(log).every((id) => log.entryStatus(id) === "unmarked")).toBe(true);
        expect(log.entryStatus(outside.id)).toBe("completed");
      });
    }

    it("count nothing in Available now while the character has no level", () => {
      const { log } = openLog();
      log.showAvailableNow();
      expect(log.listing()).toEqual({ view: "available", level: null, sections: [], filteredOut: 0 });
      expect(log.completeShownCount()).toBe(0);
      expect(log.clearShownCount()).toBe(0);
    });
  });
});
