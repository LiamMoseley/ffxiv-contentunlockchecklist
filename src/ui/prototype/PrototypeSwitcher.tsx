/*
 * PROTOTYPE (throwaway): three stacked-row layouts for the list at 1000px and below, switched by ?variant=.
 * Open the dev server at /?variant=A (add &cases=1 on the All tile to see only the hard cases). Left and right
 * arrow keys cycle. Nothing here ships: the bar and the variants render in the dev server only.
 */
import { useEffect, useSyncExternalStore } from "react";
import "./prototype.css";

export const VARIANTS = ["current", "A", "B", "C", "D"] as const;
export type Variant = (typeof VARIANTS)[number];

export const VARIANT_NAMES: Record<Variant, string> = {
  current: "Current table / stacked row",
  A: "Headline + chips",
  B: "Level spine",
  C: "Compact ledger",
  D: "Spine + chips",
};

const EVENT = "protovariant";

const subscribe = (listener: () => void) => {
  window.addEventListener(EVENT, listener);
  window.addEventListener("popstate", listener);
  return () => {
    window.removeEventListener(EVENT, listener);
    window.removeEventListener("popstate", listener);
  };
};
const snapshot = () => window.location.search;

/** The variant in the URL, or null for the real table (no param, "current", or a production build). */
export function usePrototypeVariant(): Exclude<Variant, "current"> | null {
  const search = useSyncExternalStore(subscribe, snapshot);
  if (!import.meta.env.DEV) return null;
  const value = new URLSearchParams(search).get("variant");
  return value === "A" || value === "B" || value === "C" || value === "D" ? value : null;
}

/** Whether ?cases=1 asks for only the hard-case entries. */
export function usePrototypeCases(): boolean {
  const search = useSyncExternalStore(subscribe, snapshot);
  return new URLSearchParams(search).get("cases") === "1";
}

function setParam(name: string, value: string | null) {
  const url = new URL(window.location.href);
  if (value === null) url.searchParams.delete(name);
  else url.searchParams.set(name, value);
  window.history.replaceState(null, "", url);
  window.dispatchEvent(new Event(EVENT));
}

export function PrototypeSwitcher() {
  const search = useSyncExternalStore(subscribe, snapshot);
  const param = new URLSearchParams(search).get("variant");
  const current = (VARIANTS as readonly string[]).includes(param ?? "") ? (param as Variant) : null;
  const cases = new URLSearchParams(search).get("cases") === "1";

  useEffect(() => {
    if (!current) return;
    const onKey = (event: KeyboardEvent) => {
      const target = event.target;
      if (target instanceof HTMLElement && target.matches("input, textarea, select, [contenteditable]")) return;
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      const step = event.key === "ArrowRight" ? 1 : -1;
      setParam("variant", VARIANTS[(VARIANTS.indexOf(current) + step + VARIANTS.length) % VARIANTS.length]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current]);

  if (!current) return null;
  const step = (by: number) =>
    setParam("variant", VARIANTS[(VARIANTS.indexOf(current) + by + VARIANTS.length) % VARIANTS.length]);
  return (
    <div className="proto-bar" role="group" aria-label="Prototype variants">
      <button type="button" onClick={() => step(-1)} aria-label="Previous variant">
        ←
      </button>
      <span className="proto-bar-label">
        <b>{current === "current" ? "Current" : current}</b> {VARIANT_NAMES[current]}
      </span>
      <button type="button" onClick={() => step(1)} aria-label="Next variant">
        →
      </button>
      <button
        type="button"
        className={`proto-bar-cases${cases ? " on" : ""}`}
        aria-pressed={cases}
        onClick={() => setParam("cases", cases ? null : "1")}
      >
        Hard cases
      </button>
    </div>
  );
}
