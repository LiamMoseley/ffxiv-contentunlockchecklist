import { useEffect, useRef, useState, type RefObject } from "react";
import { scrollJumps } from "../log";

type Jump = "up" | "down";

function readJumpsOf(el: HTMLElement | null) {
  if (!el) return { up: false, down: false };
  return scrollJumps({ scrollTop: el.scrollTop, viewportHeight: el.clientHeight, pageHeight: el.scrollHeight });
}

/**
 * Phone layout only (the CSS hides it elsewhere): buttons that jump to the top of the window's scrolling
 * content, where the expansion tiles are, or the bottom, where Clear Shown, Complete Shown and the legal text
 * are. Each shows only when it would go somewhere. On desktop the scroller has no box of its own, so it
 * reads as a page that fits and offers neither.
 */
export function ScrollJump({ scroller }: { scroller: RefObject<HTMLElement | null> }) {
  const readJumps = () => readJumpsOf(scroller.current);
  const [shown, setShown] = useState({ up: false, down: false });
  const buttons = useRef<Record<Jump, HTMLButtonElement | null>>({ up: null, down: null });
  const focusNext = useRef<Jump | null>(null);

  useEffect(() => {
    // Scroll events arrive at most once a frame, and setting the same value again renders nothing.
    const el = scroller.current;
    const update = () => {
      const next = readJumpsOf(el);
      setShown((old) => (old.up === next.up && old.down === next.down ? old : next));
    };
    update();
    el?.addEventListener("scroll", update, { passive: true });
    // The content grows and shrinks as the list changes (a new expansion, a filter), without any scrolling,
    // and the scroller itself resizes with the screen.
    const observer = new ResizeObserver(update);
    if (el) {
      observer.observe(el);
      for (const child of el.children) observer.observe(child);
    }
    return () => {
      el?.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, [scroller]);

  // The pressed button disappears at its end of the page, so focus moves to the other one rather than the page.
  useEffect(() => {
    const target = focusNext.current;
    if (target && shown[target]) {
      buttons.current[target]?.focus();
      focusNext.current = null;
    }
  }, [shown]);

  function jump(to: Jump) {
    const other: Jump = to === "up" ? "down" : "up";
    // Instant: the page can be tens of thousands of pixels long, and a smooth scroll that far takes seconds.
    const el = scroller.current;
    el?.scrollTo({ top: to === "up" ? 0 : el.scrollHeight, behavior: "instant" });
    // Only a button that is about to disappear hands focus on. Otherwise a pending hand-over would wait for some
    // later change and take focus from wherever the player had moved on to.
    const next = readJumps();
    if (next[to]) return;
    if (buttons.current[other]) buttons.current[other]?.focus();
    else focusNext.current = other;
  }

  if (!shown.up && !shown.down) return null;
  return (
    <div className="scroll-jump" role="group" aria-label="Jump in the list">
      {shown.up && (
        <button
          type="button"
          ref={(el) => {
            buttons.current.up = el;
          }}
          aria-label="Jump to top"
          title="Jump to top"
          onClick={() => jump("up")}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M3 2.5h10M3.5 11L8 6.5l4.5 4.5" />
          </svg>
        </button>
      )}
      {shown.down && (
        <button
          type="button"
          ref={(el) => {
            buttons.current.down = el;
          }}
          aria-label="Jump to bottom"
          title="Jump to bottom"
          onClick={() => jump("down")}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M3 13.5h10M3.5 5L8 9.5 12.5 5" />
          </svg>
        </button>
      )}
    </div>
  );
}
