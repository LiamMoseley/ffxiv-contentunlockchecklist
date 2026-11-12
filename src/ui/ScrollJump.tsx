import { useEffect, useRef, useState } from "react";
import { scrollJumps } from "../log";

type Jump = "up" | "down";

function readJumps() {
  const page = document.documentElement;
  return scrollJumps({ scrollTop: window.scrollY, viewportHeight: window.innerHeight, pageHeight: page.scrollHeight });
}

/**
 * Phone layout only (the CSS hides it elsewhere): buttons that jump to the top of the page, where the
 * expansion tiles are, or the bottom, where Clear Shown, Complete Shown and Update are. Each shows only
 * when it would go somewhere.
 */
export function ScrollJump() {
  const [shown, setShown] = useState({ up: false, down: false });
  const buttons = useRef<Record<Jump, HTMLButtonElement | null>>({ up: null, down: null });
  const focusNext = useRef<Jump | null>(null);

  useEffect(() => {
    // Scroll events arrive at most once a frame, and setting the same value again renders nothing.
    const update = () => {
      const next = readJumps();
      setShown((old) => (old.up === next.up && old.down === next.down ? old : next));
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    // The page grows and shrinks as the list changes (a new expansion, a filter), without any scrolling.
    const observer = new ResizeObserver(update);
    observer.observe(document.documentElement);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      observer.disconnect();
    };
  }, []);

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
    window.scrollTo({ top: to === "up" ? 0 : document.documentElement.scrollHeight, behavior: "instant" });
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
