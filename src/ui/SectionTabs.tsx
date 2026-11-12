import type { ProgressCount } from "../log";
import { Count } from "./ProgressBar";

export type TabChoice<K extends string = string> = { key: K; label: string; progress: ProgressCount };

/** Separate slanted tabs, each with its completed count; the active one has a yellow corner mark. */
export function SectionTabs<K extends string>({
  tabs,
  active,
  onChoose,
  label,
}: {
  tabs: TabChoice<K>[];
  /** Null while another view (the NEW entries) is showing in place of the tabs' sections. */
  active: K | null;
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
            {tab.label} <Count progress={tab.progress} bracketed />
          </span>
        </button>
      ))}
    </div>
  );
}
