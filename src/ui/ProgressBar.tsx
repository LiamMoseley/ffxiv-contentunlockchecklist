import type { ProgressCount } from "../log";

/**
 * Crafting-window style bar: a recessed track with a glossy fill that runs from blue towards
 * yellow-green as it fills, and switches to the blue Quality fill once every entry counted is Completed.
 */
export function ProgressBar({ progress, label, thin }: { progress: ProgressCount; label: string; thin?: boolean }) {
  const { completed, total } = progress;
  const fraction = total === 0 ? 0 : completed / total;
  const full = total > 0 && completed === total;
  return (
    <span
      className={`bar${thin ? " thin" : ""}${full ? " full" : ""}`}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={completed}
      aria-valuetext={`${completed} of ${total} completed`}
    >
      <span style={{ width: `${fraction * 100}%`, ["--hue" as string]: 200 - 120 * fraction }} />
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
