import { useEffect, useRef, useState } from "react";
import type { ProgressCount } from "../log";

/**
 * Crafting-window style bar: a recessed track with a glossy green fill, which switches to
 * the blue Quality fill once every entry counted is Completed.
 */
export function ProgressBar({ progress, label, thin }: { progress: ProgressCount; label: string; thin?: boolean }) {
  const { completed, total } = progress;
  const fraction = total === 0 ? 0 : completed / total;
  const full = total > 0 && completed === total;
  // A bar that is already full when it appears stays still; one that fills while shown flashes once.
  const wasFull = useRef(full);
  const [flashing, setFlashing] = useState(false);
  useEffect(() => {
    if (full && !wasFull.current) setFlashing(true);
    wasFull.current = full;
  }, [full]);
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

/** "completed/total", as shown beside every bar and in every tab. */
export function Count({ progress }: { progress: ProgressCount }) {
  return (
    <span className="count">
      {progress.completed}/{progress.total}
    </span>
  );
}
