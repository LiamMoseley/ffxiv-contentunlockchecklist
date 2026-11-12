import { describe, expect, it } from "vitest";
import { scrollJumps } from "./index";

const page = { viewportHeight: 700, pageHeight: 5000 };

describe("which jump buttons the page offers", () => {
  it("offers only Down at the top", () => {
    expect(scrollJumps({ ...page, scrollTop: 0 })).toEqual({ up: false, down: true });
  });

  it("offers both in the middle", () => {
    expect(scrollJumps({ ...page, scrollTop: 2000 })).toEqual({ up: true, down: true });
  });

  it("offers only Up at the bottom", () => {
    expect(scrollJumps({ ...page, scrollTop: 4300 })).toEqual({ up: true, down: false });
  });

  it("counts a few pixels from either end as being there", () => {
    expect(scrollJumps({ ...page, scrollTop: 30 }).up).toBe(false);
    expect(scrollJumps({ ...page, scrollTop: 4270 }).down).toBe(false);
  });

  it("offers neither when the page fits the screen", () => {
    expect(scrollJumps({ scrollTop: 0, viewportHeight: 700, pageHeight: 700 })).toEqual({ up: false, down: false });
  });

  it("offers neither on a page only a little taller than the screen", () => {
    expect(scrollJumps({ scrollTop: 0, viewportHeight: 700, pageHeight: 760 })).toEqual({ up: false, down: false });
  });
});
