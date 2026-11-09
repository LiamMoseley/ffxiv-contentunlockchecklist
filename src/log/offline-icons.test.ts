import { describe, expect, it } from "vitest";
import { createMemoryStorage } from "../adapters/memoryStorage";
import { editRow, editedPage, fakeWiki, openLog, realPage } from "./test/harness";

describe("icons that only appear after an in-browser update", () => {
  const withNewIcon = {
    ...editedPage((html) =>
      editRow(html, ">Sastasha</a></td>", (row) => row.replaceAll("Dungeons_icon1", "Brand_new_icon1")),
    ),
    revisionId: realPage.revisionId + 1,
  };
  const newIcon = "thumb/f/fc/Brand_new_icon1.png/48px-Brand_new_icon1.png";

  /** Opens a log on the real page, then updates it from a wiki whose only change is one entry's icon. */
  async function updated() {
    const wiki = fakeWiki();
    const opened = openLog({ wiki, storage: createMemoryStorage() });
    wiki.serve(withNewIcon);
    // No entry's text changed, so the update is adopted without a preview.
    expect((await opened.log.checkForUpdate()).status).toBe("upToDate");
    return opened.log;
  }

  it("has every icon bundled while the content is the bundled copy", () => {
    const { log } = openLog();

    expect(log.unbundledIcons()).toEqual([]);
  });

  it("lists the icons the updated content uses that were not bundled", async () => {
    const log = await updated();

    expect(log.unbundledIcons()).toEqual([newIcon]);
    expect(log.isBundledIcon(newIcon)).toBe(false);
  });

  it("still treats the icons the bundled copy used as bundled after an update", async () => {
    const log = await updated();

    expect(log.isBundledIcon("thumb/3/33/Housing_icon.png/48px-Housing_icon.png")).toBe(true);
  });
});
