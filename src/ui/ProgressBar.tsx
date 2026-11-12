import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { ProgressCount } from "../log";

/** True while the player's own status change is playing, so a bar it fills may flash. */
export const ChangedByHandContext = createContext(false);

/**
 * Crafting-window style bar: a recessed track with a glossy green fill, which switches to
 * the blue Quality fill once every entry counted is Completed.
 */
export function ProgressBar({ progress, label, thin }: { progress: ProgressCount; label: string; thin?: boolean }) {
  const { completed, total } = progress;
  const fraction = total === 0 ? 0 : completed / total;
  const full = total > 0 && completed === total;
  // A bar flashes once when the player's own change fills it; loading, switching and bulk actions leave it still.
  const byHand = useContext(ChangedByHandContext);
  const wasFull = useRef(full);
  const [flashing, setFlashing] = useState(false);
  useEffect(() => {
    if (full && !wasFull.current && byHand) setFlashing(true);
    wasFull.current = full;
  }, [full, byHand]);
  return (
    <span
      className={`bar${thin ? " thin" : ""}${full ? " full" : ""}${full && flashing ? " flash" : ""}`}
      onAnimationEnd={() => setFlashing(false)}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={completed}
      aria-valuetext={`${completed} of ${total} completed`}
    >
      <span style={{ width: `${fraction * 100}%` }} />
    </span>
  );
}

/** "completed/total", as shown beside every bar and in every tab. A tab's count is bracketed, to set it apart from its text. */
export function Count({ progress, bracketed }: { progress: ProgressCount; bracketed?: boolean }) {
  const text = `${progress.completed}/${progress.total}`;
  return <span className="count">{bracketed ? `(${text})` : text}</span>;
}
