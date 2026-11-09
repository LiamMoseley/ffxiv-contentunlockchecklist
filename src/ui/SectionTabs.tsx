import type { ProgressCount } from "../log";
import { Count } from "./ProgressBar";

/** A tab shows a completed count, or a plain number of entries (`total`) where progress means nothing. */
export type TabChoice<K extends string = string> = {
  key: K;
  label: string;
  progress?: ProgressCount;
  total?: number;
};

/** Separate slanted tabs, each with its completed count; the active one has a yellow corner mark. */
export function SectionTabs<K extends string>({
  tabs,
  active,
  onChoose,
  label,
}: {
  tabs: TabChoice<K>[];
  active: K;
  onChoose: (key: K) => void;
  label: string;
}) {
  return (
    <div className="tabs" role="tablist" aria-label={label}>
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          role="tab"
          aria-selected={tab.key === active}
          className={tab.key === active ? "active" : undefined}
          onClick={() => onChoose(tab.key)}
        >
          <span>
            {tab.label} {tab.progress ? <Count progress={tab.progress} /> : <span className="count">{tab.total}</span>}
          </span>
        </button>
      ))}
    </div>
  );
}
