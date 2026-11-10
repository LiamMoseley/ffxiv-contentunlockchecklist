import { describe, expect, it } from "vitest";
import type { WikiPage } from "./index";
import { createMemoryStorage } from "../adapters/memoryStorage";
import { editRow, editedPage, insertRowAtTopOf, openLog, realPage, rowOf } from "./test/harness";

describe("suggested matches for renamed entries", () => {
  const SASTASHA_ID = "sastasha/its-probably-pirates@arr";
  type OpenLog = ReturnType<typeof openLog>["log"];

  const page = (edit: (row: string) => string, revision = 1): WikiPage => ({
    ...editedPage((html) => editRow(html, ">Sastasha</a></td>", edit)),
    revisionId: realPage.revisionId + revision,
  });
  /** Sastasha's unlock renamed to something very like it; its quest is unchanged. */
  const renamedUnlock = page((row) => row.replace(">Sastasha</a>", ">Sastashas</a>"));
  /** Sastasha's quest renamed to something very like it; its unlock is unchanged. */
  const renamedQuest = page((row) => row.replaceAll("It's Probably Pirates", "It's Probably Pirate"));
  /** Sastasha's unlock and quest both replaced by names that are nothing like them. */
  const replaced = page((row) =>
    row.replace(">Sastasha</a>", ">Zzzz</a>").replaceAll("It's Probably Pirates", "Qqqqqqqq Wwwwwwww"),
  );

  const check = async (log: OpenLog) => {
    const result = await log.checkForUpdate();
    if (result.status !== "changes") throw new Error(`expected changes, got ${result.status}`);
    return result.preview;
  };
  const pairs = (preview: Awaited<ReturnType<typeof check>>) =>
    preview.suggestions.map((s) => [s.from.unlock, s.to.unlock]);

  it("offers to move progress to an entry whose unlock was renamed", async () => {
    const { log, wiki } = openLog();
    log.setEntryStatus(SASTASHA_ID, "completed");
    wiki.serve(renamedUnlock);

    expect(pairs(await check(log))).toEqual([["Sastasha", "Sastashas"]]);
  });

  it("offers to move progress to an entry whose quest was renamed", async () => {
    const { log, wiki } = openLog();
    log.setEntryStatus(SASTASHA_ID, "completed");
    wiki.serve(renamedQuest);

    const preview = await check(log);

    expect(pairs(preview)).toEqual([["Sastasha", "Sastasha"]]);
    expect(preview.suggestions[0].to.quest).toBe("It's Probably Pirate");
  });

  it("offers nothing for an orphan that had no progress, or whose replacement is nothing like it", async () => {
    const { log, wiki } = openLog();
    wiki.serve(renamedUnlock);
    expect((await check(log)).suggestions).toEqual([]);

    log.setEntryStatus(SASTASHA_ID, "completed");
    wiki.serve(replaced);
    expect((await check(log)).suggestions).toEqual([]);
  });

  it("offers a match for an orphan whose only progress is on another character", async () => {
    const { log, wiki } = openLog();
    log.setEntryStatus(SASTASHA_ID, "notInterested");
    log.addCharacter({ name: "Bryn" });
    log.switchCharacter(log.characters().find((c) => c.name === "Bryn")!.id);
    wiki.serve(renamedUnlock);

    expect(pairs(await check(log))).toEqual([["Sastasha", "Sastashas"]]);
  });

  it("ignores progress that belongs only to a deleted character", async () => {
    const { log, wiki } = openLog();
    const kept = log.currentCharacter().id;
    const doomed = log.addCharacter({ name: "Bryn" });
    if (!doomed.ok) throw new Error("expected character");
    log.switchCharacter(doomed.character.id);
    log.setEntryStatus(SASTASHA_ID, "completed");
    log.switchCharacter(kept);
    log.deleteCharacter(doomed.character.id);
    wiki.serve(renamedUnlock);

    expect((await check(log)).suggestions).toEqual([]);
  });

  it("does not offer a replacement from another expansion", async () => {
    const { log, wiki } = openLog();
    log.setEntryStatus(SASTASHA_ID, "completed");
    const sastashaRow = rowOf(realPage.html, ">Sastasha</a></td>");
    wiki.serve({
      ...editedPage((html) =>
        insertRowAtTopOf(
          html.replace(sastashaRow, ""),
          "Level 51 - 60",
          sastashaRow.replace(">Sastasha</a>", ">Sastashas</a>"),
        ),
      ),
      revisionId: realPage.revisionId + 1,
    });

    const preview = await check(log);

    expect(preview.removed.map((e) => e.unlock)).toContain("Sastasha");
    expect(preview.added.map((e) => e.unlock)).toContain("Sastashas");
    expect(preview.suggestions).toEqual([]);
  });

  it("gives each orphan only its best match", async () => {
    const { log, wiki } = openLog();
    log.setEntryStatus(SASTASHA_ID, "completed");
    const duplicated = (row: string) => row + row.replace(">Sastasha</a>", ">Sastashaxx</a>");
    wiki.serve(page((row) => duplicated(row.replace(">Sastasha</a>", ">Sastashas</a>"))));

    expect(pairs(await check(log))).toEqual([["Sastasha", "Sastashas"]]);
  });

  it("moves the status for every character when a match is accepted", async () => {
    const { log, wiki } = openLog();
    const first = log.currentCharacter().id;
    log.setEntryStatus(SASTASHA_ID, "completed");
    const second = log.addCharacter({ name: "Bryn" });
    if (!second.ok) throw new Error("expected character");
    log.switchCharacter(second.character.id);
    log.setEntryStatus(SASTASHA_ID, "notInterested");
    wiki.serve(renamedUnlock);
    const preview = await check(log);

    log.applyUpdate(preview, preview.suggestions);

    const renamedId = preview.suggestions[0].to.id;
    expect(log.entryStatus(renamedId)).toBe("notInterested");
    log.switchCharacter(first);
    expect(log.entryStatus(renamedId)).toBe("completed");
    expect(log.entryStatus(SASTASHA_ID)).toBe("unmarked");
  });

  it("does not remember an accepted pair as declined", async () => {
    const { log, wiki, storage } = openLog();
    log.setEntryStatus(SASTASHA_ID, "completed");
    wiki.serve(renamedUnlock);
    const preview = await check(log);

    log.applyUpdate(preview, preview.suggestions);

    expect(storage.read("contentUnlockLog.declinedMatches")).toBeNull();
  });

  it("leaves the orphan orphaned when a match is not accepted", async () => {
    const { log, wiki, storage } = openLog();
    log.setEntryStatus(SASTASHA_ID, "completed");
    wiki.serve(renamedUnlock);
    const preview = await check(log);

    log.applyUpdate(preview);

    expect(log.entryStatus(preview.suggestions[0].to.id)).toBe("unmarked");
    expect(JSON.parse(storage.read("contentUnlockLog.progress")!).statuses).toMatchObject({
      [log.currentCharacter().id]: { [SASTASHA_ID]: { status: "completed" } },
    });
  });

  it("remembers nothing about a pair until the update is applied", async () => {
    const storage = createMemoryStorage();
    const { log, wiki } = openLog({ storage });
    log.setEntryStatus(SASTASHA_ID, "completed");
    wiki.serve(renamedUnlock);

    await check(log);

    expect(storage.read("contentUnlockLog.declinedMatches")).toBeNull();
    expect(pairs(await check(log))).toEqual([["Sastasha", "Sastashas"]]);
  });

  it("never suggests a pair again once the update is applied without accepting it, and keeps the orphan orphaned", async () => {
    const storage = createMemoryStorage();
    const { log, wiki } = openLog({ storage });
    log.setEntryStatus(SASTASHA_ID, "completed");
    wiki.serve(renamedUnlock);
    const preview = await check(log);

    log.applyUpdate(preview, []);

    expect(storage.read("contentUnlockLog.declinedMatches")).toBe(
      '["sastasha/its-probably-pirates@arr\\nsastashas/its-probably-pirates@arr"]',
    );
    expect(log.entryStatus(SASTASHA_ID)).toBe("completed");
    expect(log.entryStatus(preview.suggestions[0].to.id)).toBe("unmarked");

    // The wiki goes back to the old name and then renames again: the same pair is not offered.
    wiki.serve({ ...realPage, revisionId: realPage.revisionId + 2 });
    log.applyUpdate(await check(log));
    wiki.serve({ ...renamedUnlock, revisionId: realPage.revisionId + 3 });
    expect((await check(log)).suggestions).toEqual([]);
    const reopened = openLog({ storage, wiki });
    expect((await check(reopened.log)).suggestions).toEqual([]);
  });
});
