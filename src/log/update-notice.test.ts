import { describe, expect, it } from "vitest";
import type { WikiPage } from "./index";
import { createMemoryStorage } from "../adapters/memoryStorage";
import { editedPage, fakeWiki, fixedClock, insertRowAtTopOf, openLog, realPage, rowOf } from "./test/harness";

describe("the automatic update check", () => {
  const sastashaRow = rowOf(realPage.html, ">Sastasha</a></td>");
  /** The real page with one dungeon added, as wiki revision `revision` more than the real page's. */
  const withDungeon = (name: string, revision: number): WikiPage => ({
    ...editedPage((html) =>
      insertRowAtTopOf(html, "Level 1 - 50", sastashaRow.replace(">Sastasha</a>", `>${name}</a>`)),
    ),
    revisionId: realPage.revisionId + revision,
  });
  /** The real page with an edit outside every table, so no entry changes. */
  const withUnrelatedEdit = (revision: number): WikiPage => ({
    ...editedPage((html) => html + "<p>A typo fixed elsewhere</p>"),
    revisionId: realPage.revisionId + revision,
  });
  const noticeNames = (log: ReturnType<typeof openLog>["log"]) =>
    log.updateNotice()?.added.map((e) => e.unlock) ?? null;

  it("shows nothing when the wiki is still on the stored revision", async () => {
    const { log, wiki } = openLog();

    await log.autoCheckForUpdate();

    expect(log.updateNotice()).toBeNull();
    expect(wiki.requests).toEqual({ pages: 0, revisions: 1 });
  });

  it("fetches the page and offers a notice when the revision differs and entries changed", async () => {
    const { log, wiki } = openLog();
    wiki.serve(withDungeon("Sastasha Reborn", 1));

    await log.autoCheckForUpdate();

    expect(noticeNames(log)).toEqual(["Sastasha Reborn"]);
    expect(wiki.requests.pages).toBe(1);
  });

  it("applies nothing until the player reviews and applies the update", async () => {
    const { log, wiki } = openLog();
    wiki.serve(withDungeon("Sastasha Reborn", 1));

    await log.autoCheckForUpdate();

    expect(log.revisionId()).toBe(realPage.revisionId);
    expect(log.sections().flatMap((s) => s.entries)).toHaveLength(429);
    log.applyUpdate(log.updateNotice()!);
    expect(log.revisionId()).toBe(realPage.revisionId + 1);
    expect(log.updateNotice()).toBeNull();
  });

  it("raises no notice for a wiki edit that changes no entry", async () => {
    const { log, wiki } = openLog();
    wiki.serve(withUnrelatedEdit(1));

    await log.autoCheckForUpdate();

    expect(log.updateNotice()).toBeNull();
    expect(wiki.requests.pages).toBe(1);
  });

  it("does not look at the wiki again within 6 hours of a check", async () => {
    const { log, wiki, clock } = openLog();
    await log.autoCheckForUpdate();

    clock.set("2026-11-03T17:59:59.000Z");
    wiki.serve(withDungeon("Sastasha Reborn", 1));
    await log.autoCheckForUpdate();

    expect(wiki.requests).toEqual({ pages: 0, revisions: 1 });
    expect(log.updateNotice()).toBeNull();
  });

  it("checks again once more than 6 hours have passed", async () => {
    const { log, wiki, clock } = openLog();
    await log.autoCheckForUpdate();

    clock.set("2026-11-03T18:00:01.000Z");
    wiki.serve(withDungeon("Sastasha Reborn", 1));
    await log.autoCheckForUpdate();

    expect(noticeNames(log)).toEqual(["Sastasha Reborn"]);
  });

  it("remembers the time of the last check on the device", async () => {
    const { log, storage } = openLog();

    await log.autoCheckForUpdate();

    expect(storage.read("contentUnlockLog.lastUpdateCheck")).toBe("2026-11-03T12:00:00.000Z");
  });

  it("counts the 6 hours from a check made in an earlier visit", async () => {
    const storage = createMemoryStorage();
    await openLog({ storage }).log.autoCheckForUpdate();

    const later = openLog({ storage, clock: fixedClock("2026-11-03T14:00:00.000Z") });
    later.wiki.serve(withDungeon("Sastasha Reborn", 1));
    await later.log.autoCheckForUpdate();

    expect(later.wiki.requests).toEqual({ pages: 0, revisions: 0 });
  });

  it("checks again when the clock has gone back before the last check", async () => {
    const storage = createMemoryStorage();
    await openLog({ storage }).log.autoCheckForUpdate();

    const later = openLog({ storage, clock: fixedClock("2026-11-02T12:00:00.000Z") });
    await later.log.autoCheckForUpdate();

    expect(later.wiki.requests.revisions).toBe(1);
  });

  it("shows the notice again on the next visit, without asking the wiki again, until it is dismissed or applied", async () => {
    const storage = createMemoryStorage();
    const first = openLog({ storage });
    first.wiki.serve(withDungeon("Sastasha Reborn", 1));
    await first.log.autoCheckForUpdate();

    const second = openLog({ storage, clock: fixedClock("2026-11-03T12:30:00.000Z") });
    second.wiki.serve(withDungeon("Sastasha Reborn", 1));
    await second.log.autoCheckForUpdate();

    expect(noticeNames(second.log)).toEqual(["Sastasha Reborn"]);
    expect(second.wiki.requests).toEqual({ pages: 0, revisions: 0 });
  });

  it("keeps the fetched update on the device under its own key", async () => {
    const { log, wiki, storage } = openLog();
    wiki.serve(withDungeon("Sastasha Reborn", 1));

    await log.autoCheckForUpdate();

    const kept = JSON.parse(storage.read("contentUnlockLog.offeredUpdate")!);
    expect(kept.revisionId).toBe(realPage.revisionId + 1);
    expect(kept.sections.flatMap((s: { entries: unknown[] }) => s.entries)).toHaveLength(430);
  });

  it("does not bring back a notice the player applied", async () => {
    const storage = createMemoryStorage();
    const first = openLog({ storage });
    first.wiki.serve(withDungeon("Sastasha Reborn", 1));
    await first.log.autoCheckForUpdate();
    first.log.applyUpdate(first.log.updateNotice()!);

    expect(openLog({ storage }).log.updateNotice()).toBeNull();
  });

  describe("Dismiss", () => {
    it("hides the notice", async () => {
      const { log, wiki } = openLog();
      wiki.serve(withDungeon("Sastasha Reborn", 1));
      await log.autoCheckForUpdate();

      log.dismissUpdateNotice();

      expect(log.updateNotice()).toBeNull();
      expect(log.revisionId()).toBe(realPage.revisionId);
    });

    it("keeps the notice hidden on later checks while the wiki's revision is unchanged", async () => {
      const storage = createMemoryStorage();
      const first = openLog({ storage });
      first.wiki.serve(withDungeon("Sastasha Reborn", 1));
      await first.log.autoCheckForUpdate();
      first.log.dismissUpdateNotice();

      const later = openLog({ storage, clock: fixedClock("2026-11-04T12:00:00.000Z") });
      later.wiki.serve(withDungeon("Sastasha Reborn", 1));
      await later.log.autoCheckForUpdate();

      expect(later.log.updateNotice()).toBeNull();
      expect(later.wiki.requests.pages).toBe(0);
    });

    it("brings the notice back when the wiki's revision changes again", async () => {
      const storage = createMemoryStorage();
      const first = openLog({ storage });
      first.wiki.serve(withDungeon("Sastasha Reborn", 1));
      await first.log.autoCheckForUpdate();
      first.log.dismissUpdateNotice();

      const later = openLog({ storage, clock: fixedClock("2026-11-04T12:00:00.000Z") });
      later.wiki.serve(withDungeon("Sastasha Reborn", 2));
      await later.log.autoCheckForUpdate();

      expect(noticeNames(later.log)).toEqual(["Sastasha Reborn"]);
    });

    it("remembers the dismissed revision on the device", async () => {
      const { log, wiki, storage } = openLog();
      wiki.serve(withDungeon("Sastasha Reborn", 1));
      await log.autoCheckForUpdate();

      log.dismissUpdateNotice();

      expect(storage.read("contentUnlockLog.dismissedRevision")).toBe(String(realPage.revisionId + 1));
    });

    it("does nothing when there is no notice", () => {
      const { log, storage } = openLog();

      log.dismissUpdateNotice();

      expect(storage.read("contentUnlockLog.dismissedRevision")).toBeNull();
    });

    it("leaves the Update action able to fetch the dismissed update", async () => {
      const { log, wiki } = openLog();
      wiki.serve(withDungeon("Sastasha Reborn", 1));
      await log.autoCheckForUpdate();
      log.dismissUpdateNotice();

      const check = await log.checkForUpdate();

      expect(check.status).toBe("changes");
    });
  });

  describe("when the check fails", () => {
    it("shows nothing and applies nothing when the wiki can't be reached", async () => {
      const { log, wiki } = openLog();
      wiki.goOffline();

      await expect(log.autoCheckForUpdate()).resolves.toBeUndefined();

      expect(log.updateNotice()).toBeNull();
      expect(log.revisionId()).toBe(realPage.revisionId);
    });

    it("does not count a failed check, so the next visit tries again", async () => {
      const { log, wiki, storage } = openLog();
      wiki.goOffline();
      await log.autoCheckForUpdate();
      expect(storage.read("contentUnlockLog.lastUpdateCheck")).toBeNull();

      wiki.serve(withDungeon("Sastasha Reborn", 1));
      await log.autoCheckForUpdate();

      expect(noticeNames(log)).toEqual(["Sastasha Reborn"]);
    });

    it("shows nothing when the page fetch fails after the revision lookup worked", async () => {
      const { log, wiki } = openLog();
      wiki.serve(withDungeon("Sastasha Reborn", 1));
      wiki.fetchPage = async () => {
        throw new Error("dropped");
      };

      await log.autoCheckForUpdate();

      expect(log.updateNotice()).toBeNull();
    });
  });
});

describe("a newer bundled copy of the content", () => {
  const sastashaRow = rowOf(realPage.html, ">Sastasha</a></td>");
  const newerBundle: WikiPage = {
    ...editedPage((html) =>
      insertRowAtTopOf(html, "Level 1 - 50", sastashaRow.replace(">Sastasha</a>", ">Bundled</a>")),
    ),
    revisionId: realPage.revisionId + 5,
  };

  /** A device that applied an update to revision `realPage + 2`, then opened with `bundle` as the bundled copy. */
  const deviceAtTwoRevisionsOn = async () => {
    const storage = createMemoryStorage();
    const wiki = fakeWiki({ ...realPage, revisionId: realPage.revisionId + 2 });
    const earlier = openLog({ storage, wiki });
    const check = await earlier.log.checkForUpdate();
    expect(check.status).toBe("upToDate");
    return { storage, wiki };
  };

  it("is offered for review like a fetched update, and not applied", async () => {
    const { storage } = await deviceAtTwoRevisionsOn();

    const { log } = openLog({ page: newerBundle, storage });

    expect(log.updateNotice()?.added.map((e) => e.unlock)).toEqual(["Bundled"]);
    expect(log.updateNotice()?.revisionId).toBe(realPage.revisionId + 5);
    expect(log.revisionId()).toBe(realPage.revisionId + 2);
    expect(log.sections().flatMap((s) => s.entries)).toHaveLength(429);
  });

  it("becomes the device's copy once the player applies it", async () => {
    const { storage } = await deviceAtTwoRevisionsOn();
    const { log } = openLog({ page: newerBundle, storage });

    log.applyUpdate(log.updateNotice()!);

    expect(log.revisionId()).toBe(realPage.revisionId + 5);
    expect(log.updateNotice()).toBeNull();
    expect(openLog({ page: newerBundle, storage }).log.updateNotice()).toBeNull();
  });

  it("is hidden by Dismiss until a newer bundle is deployed", async () => {
    const { storage } = await deviceAtTwoRevisionsOn();
    const { log } = openLog({ page: newerBundle, storage });
    log.dismissUpdateNotice();

    expect(openLog({ page: newerBundle, storage }).log.updateNotice()).toBeNull();
    const evenNewer = { ...newerBundle, revisionId: newerBundle.revisionId + 1 };
    expect(openLog({ page: evenNewer, storage }).log.updateNotice()).not.toBeNull();
  });

  it("is ignored when it is older than the device's copy", async () => {
    const { storage } = await deviceAtTwoRevisionsOn();

    const { log } = openLog({ page: { ...realPage, revisionId: realPage.revisionId + 1 }, storage });

    expect(log.updateNotice()).toBeNull();
    expect(log.revisionId()).toBe(realPage.revisionId + 2);
  });

  it("is ignored when it is the same revision as the device's copy", async () => {
    const { storage } = await deviceAtTwoRevisionsOn();

    const { log } = openLog({ page: { ...realPage, revisionId: realPage.revisionId + 2 }, storage });

    expect(log.updateNotice()).toBeNull();
  });

  it("is the device's copy on a device with no copy of its own", () => {
    const { log } = openLog({ page: newerBundle });

    expect(log.updateNotice()).toBeNull();
    expect(log.revisionId()).toBe(realPage.revisionId + 5);
  });

  it("is adopted without a notice when it changes no entry", async () => {
    const { storage } = await deviceAtTwoRevisionsOn();

    const { log } = openLog({ page: { ...realPage, revisionId: realPage.revisionId + 5 }, storage });

    expect(log.updateNotice()).toBeNull();
    expect(log.revisionId()).toBe(realPage.revisionId + 5);
  });

  it("stays offered while the wiki is on the same revision as the bundle", async () => {
    const { storage } = await deviceAtTwoRevisionsOn();
    const { log, wiki } = openLog({ page: newerBundle, storage });
    wiki.serve(newerBundle);

    await log.autoCheckForUpdate();

    expect(log.updateNotice()?.revisionId).toBe(newerBundle.revisionId);
    expect(wiki.requests.pages).toBe(0);
  });

  it("gives way to a wiki update newer than the bundle", async () => {
    const { storage } = await deviceAtTwoRevisionsOn();
    const { log, wiki } = openLog({ page: newerBundle, storage });
    wiki.serve({ ...newerBundle, revisionId: newerBundle.revisionId + 1 });

    await log.autoCheckForUpdate();

    expect(log.updateNotice()?.revisionId).toBe(newerBundle.revisionId + 1);
  });

  it("is offered no matter how recently the wiki was checked", async () => {
    const { storage } = await deviceAtTwoRevisionsOn();
    await openLog({ storage }).log.autoCheckForUpdate();

    const { log } = openLog({ page: newerBundle, storage });

    expect(log.updateNotice()).not.toBeNull();
  });
});
