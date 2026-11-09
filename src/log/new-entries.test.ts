import { describe, expect, it } from "vitest";
import type { WikiPage } from "./index";
import { createMemoryStorage } from "../adapters/memoryStorage";
import { editedPage, editRow, insertRowAtTopOf, openLog, realPage, rowOf } from "./test/harness";

describe("NEW entries after an update", () => {
  const sastashaRow = rowOf(realPage.html, ">Sastasha</a></td>");
  /** A row like Sastasha's under another name, so it is a different entry. */
  const dungeon = (name: string) => sastashaRow.replace(">Sastasha</a>", `>${name}</a>`);
  /** The real page with a dungeon row added per name at the top of each given section, as wiki revision `revision`. */
  const withDungeons = (names: string[], { heading = "Level 1 - 50", revision = 1 } = {}): WikiPage => ({
    ...editedPage((html) => names.reduce((page, name) => insertRowAtTopOf(page, heading, dungeon(name)), html)),
    revisionId: realPage.revisionId + revision,
  });
  type OpenLog = ReturnType<typeof openLog>["log"];
  const apply = async (log: OpenLog) => {
    const check = await log.checkForUpdate();
    if (check.status !== "changes") throw new Error(`expected changes, got ${check.status}`);
    log.applyUpdate(check.preview);
  };
  const idOf = (log: OpenLog, unlock: string) =>
    log
      .sections()
      .flatMap((s) => s.entries)
      .find((e) => e.unlock === unlock)!.id;
  const newNames = (log: OpenLog) => log.newEntries().flatMap((s) => s.entries.map((e) => e.unlock));
  const openWithNew = async (names: string[]) => {
    const opened = openLog();
    opened.wiki.serve(withDungeons(names));
    await apply(opened.log);
    return opened;
  };

  it("has no NEW entries and no notice before any update", () => {
    const { log } = openLog();

    expect(log.newNotice()).toBeNull();
    expect(log.newEntries()).toEqual([]);
    expect(log.isNew("sastasha/its-probably-pirates")).toBe(false);
  });

  it("tags the entries an applied update added, and no others", async () => {
    const { log } = await openWithNew(["Dungeon Alpha"]);

    expect(log.isNew(idOf(log, "Dungeon Alpha"))).toBe(true);
    expect(log.isNew("sastasha/its-probably-pirates")).toBe(false);
    expect(newNames(log)).toEqual(["Dungeon Alpha"]);
  });

  it("tags nothing until the update is applied", async () => {
    const { log, wiki } = openLog();
    wiki.serve(withDungeons(["Dungeon Alpha"]));

    await log.checkForUpdate();

    expect(log.newNotice()).toBeNull();
  });

  it("names up to three NEW entries in the notice, in the wiki's order, with no 'more' count", async () => {
    const { log } = await openWithNew(["Dungeon C", "Dungeon B", "Dungeon A"]);

    expect(log.newNotice()).toEqual({ names: ["Dungeon A", "Dungeon B", "Dungeon C"], more: 0 });
  });

  it("counts the NEW entries beyond the first three as 'more'", async () => {
    const { log } = await openWithNew(["Dungeon E", "Dungeon D", "Dungeon C", "Dungeon B", "Dungeon A"]);

    expect(log.newNotice()).toEqual({ names: ["Dungeon A", "Dungeon B", "Dungeon C"], more: 2 });
  });

  it("marks only the expansions that have NEW entries", async () => {
    const { log, wiki } = openLog();
    wiki.serve(withDungeons(["Dungeon Alpha"], { heading: "Level 51 - 60" }));
    await apply(log);

    expect(log.expansionHasNew("hw")).toBe(true);
    expect(log.expansionHasNew("arr")).toBe(false);
  });

  it("replaces the NEW entries at the next update", async () => {
    const { log, wiki } = openLog();
    wiki.serve(withDungeons(["Dungeon Alpha"]));
    await apply(log);

    wiki.serve(withDungeons(["Dungeon Alpha", "Dungeon Beta"], { revision: 2 }));
    await apply(log);

    expect(newNames(log)).toEqual(["Dungeon Beta"]);
  });

  it("clears the NEW entries at an update that adds none", async () => {
    const { log, wiki } = openLog();
    wiki.serve(withDungeons(["Dungeon Alpha"]));
    await apply(log);

    // This update only changes the level of an existing entry.
    wiki.serve({
      ...editedPage((html) =>
        editRow(html, ">Copperbell Mines</a></td>", (r) => r.replace("<td>17</td>", "<td>18</td>")),
      ),
      revisionId: realPage.revisionId + 2,
    });
    await apply(log);

    expect(log.newNotice()).toBeNull();
  });

  it("stops tagging a NEW entry that a later update removed", async () => {
    const { log, wiki } = openLog();
    wiki.serve(withDungeons(["Dungeon Alpha", "Dungeon Beta"]));
    await apply(log);
    const beta = idOf(log, "Dungeon Beta");
    wiki.serve(withDungeons(["Dungeon Alpha"], { revision: 2 }));
    log.applyUpdate((await previewOf(log)).preview);

    expect(log.isNew(beta)).toBe(false);
  });

  it("keeps the NEW entries when the app is opened again on the device", async () => {
    const { storage } = await openWithNew(["Dungeon Alpha"]);

    expect(openLog({ storage }).log.newNotice()).toEqual({ names: ["Dungeon Alpha"], more: 0 });
  });

  it("stores the NEW entries as a list of entry IDs under their own key", async () => {
    const { log, storage } = await openWithNew(["Dungeon Beta", "Dungeon Alpha"]);

    expect(JSON.parse(storage.read("contentUnlockLog.newEntries")!)).toEqual([
      idOf(log, "Dungeon Alpha"),
      idOf(log, "Dungeon Beta"),
    ]);
  });

  it("starts with none when the stored NEW entries are unreadable", () => {
    const storage = createMemoryStorage();
    storage.write("contentUnlockLog.newEntries", "{oops");

    expect(openLog({ storage }).log.newNotice()).toBeNull();
  });

  it("shares the NEW entries between characters", async () => {
    const { log } = await openWithNew(["Dungeon Alpha"]);
    const second = log.addCharacter({ name: "Second" });
    if (!second.ok) throw new Error("expected a character");

    log.switchCharacter(second.character.id);

    expect(log.isNew(idOf(log, "Dungeon Alpha"))).toBe(true);
  });

  async function previewOf(log: OpenLog) {
    const check = await log.checkForUpdate();
    if (check.status !== "changes") throw new Error(`expected changes, got ${check.status}`);
    return check;
  }

  describe("Show", () => {
    it("lists every NEW entry across all expansions, hiding empty sections", async () => {
      const { log, wiki } = openLog();
      wiki.serve(
        editedPage((html) =>
          insertRowAtTopOf(
            insertRowAtTopOf(html, "Level 1 - 50", dungeon("Dungeon Alpha")),
            "Level 51 - 60",
            dungeon("Dungeon Omega"),
          ),
        ),
      );
      await apply(log);

      log.showNewEntries();

      expect(log.viewingNew()).toBe(true);
      expect(log.newEntries().map((s) => [s.id, s.entries.map((e) => e.unlock)])).toEqual([
        ["arr-levelling", ["Dungeon Alpha"]],
        ["hw-levelling", ["Dungeon Omega"]],
      ]);
    });

    it("applies the search and filters to the NEW entries like any other view", async () => {
      const { log } = await openWithNew(["Dungeon Alpha"]);

      log.setFilters({ search: "no such thing" });

      expect(log.newEntries()).toEqual([]);
    });

    it("returns to the normal view when an expansion or a tab is chosen", async () => {
      const { log } = await openWithNew(["Dungeon Alpha"]);

      log.showNewEntries();
      log.setSelection({ expansion: "hw" });
      expect(log.viewingNew()).toBe(false);

      log.showNewEntries();
      log.setSelection({ tab: "levelCap" });
      expect(log.viewingNew()).toBe(false);
    });

    it("returns to the normal view with Show all entries, keeping the NEW tags", async () => {
      const { log } = await openWithNew(["Dungeon Alpha"]);
      log.showNewEntries();

      log.showAllEntries();

      expect(log.viewingNew()).toBe(false);
      expect(log.newNotice()).not.toBeNull();
    });

    it("is not remembered: opening the app again shows the normal view", async () => {
      const { log, storage } = await openWithNew(["Dungeon Alpha"]);
      log.showNewEntries();

      expect(openLog({ storage }).log.viewingNew()).toBe(false);
    });

    it("does nothing when there are no NEW entries", () => {
      const { log } = openLog();

      log.showNewEntries();

      expect(log.viewingNew()).toBe(false);
    });

    it("ends when an update is applied", async () => {
      const { log, wiki } = await openWithNew(["Dungeon Alpha"]);
      log.showNewEntries();
      wiki.serve(withDungeons(["Dungeon Alpha", "Dungeon Beta"], { revision: 2 }));

      await apply(log);

      expect(log.viewingNew()).toBe(false);
    });
  });

  describe("Mark as seen", () => {
    it("clears every NEW tag and the notice at once, and says how many it cleared", async () => {
      const { log } = await openWithNew(["Dungeon A", "Dungeon B", "Dungeon C", "Dungeon D"]);
      const id = idOf(log, "Dungeon A");

      expect(log.markNewSeen()).toBe(4);

      expect(log.newNotice()).toBeNull();
      expect(log.newEntries()).toEqual([]);
      expect(log.expansionHasNew("arr")).toBe(false);
      expect(log.isNew(id)).toBe(false);
    });

    it("ends the Show view", async () => {
      const { log } = await openWithNew(["Dungeon A"]);
      log.showNewEntries();

      log.markNewSeen();

      expect(log.viewingNew()).toBe(false);
    });

    it("stays seen when the app is opened again on the device", async () => {
      const { log, storage } = await openWithNew(["Dungeon A"]);

      log.markNewSeen();

      expect(JSON.parse(storage.read("contentUnlockLog.newEntries")!)).toEqual([]);
      expect(openLog({ storage }).log.newNotice()).toBeNull();
    });

    it("reports zero when there are no NEW entries", () => {
      expect(openLog().log.markNewSeen()).toBe(0);
    });

    it("leaves progress alone", async () => {
      const { log, storage } = await openWithNew(["Dungeon A"]);
      const stored = storage.read("contentUnlockLog.progress");

      log.markNewSeen();

      expect(storage.read("contentUnlockLog.progress")).toBe(stored);
    });
  });
});
