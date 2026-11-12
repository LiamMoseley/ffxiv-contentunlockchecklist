/** Closer than this to an end of the page counts as being at it, so a button is not offered for a tiny trip. */
const NEAR_END = 120;

export interface PagePosition {
  scrollTop: number;
  viewportHeight: number;
  pageHeight: number;
}

/**
 * The jump-to-top and jump-to-bottom buttons the phone layout offers: each only when it would go somewhere,
 * so Up is hidden at the top and Down at the bottom.
 */
export function scrollJumps({ scrollTop, viewportHeight, pageHeight }: PagePosition): { up: boolean; down: boolean } {
  const fromBottom = pageHeight - viewportHeight - scrollTop;
  return { up: scrollTop > NEAR_END, down: fromBottom > NEAR_END };
}
