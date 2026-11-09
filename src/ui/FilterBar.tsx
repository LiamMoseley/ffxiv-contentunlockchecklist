import type { Ref } from "react";
import type { Filters, Log, OptionalChallengeFilter } from "../log";

const OPTIONAL_LABEL: Record<OptionalChallengeFilter, string> = {
  all: "All content",
  none: "No optional challenges",
  only: "Optional challenges only",
};

/** Search box, type and optional challenge drop-downs, and the Filters checkboxes. Every choice is a Log command. */
export function FilterBar({
  log,
  searchRef,
  onChange,
}: {
  log: Log;
  searchRef: Ref<HTMLInputElement>;
  onChange: () => void;
}) {
  const filters = log.filters();
  const set = (next: Partial<Filters>) => {
    log.setFilters(next);
    onChange();
  };
  return (
    <div className="filter-bar" id="filter-bar" role="search">
      <label className="filter-field filter-search">
        <span>Search</span>
        <input
          ref={searchRef}
          type="search"
          placeholder="Search (press /)"
          value={filters.search}
          onChange={(event) => set({ search: event.target.value })}
        />
      </label>
      <label className="filter-field">
        <span>Type</span>
        <select value={filters.type ?? ""} onChange={(event) => set({ type: event.target.value || null })}>
          <option value="">All types</option>
          {log.typeCounts().map(({ type, count }) => (
            <option key={type} value={type}>
              {type} ({count})
            </option>
          ))}
        </select>
      </label>
      <label className="filter-field">
        <span>Optional challenges</span>
        <select
          value={filters.optionalChallenge}
          onChange={(event) => set({ optionalChallenge: event.target.value as OptionalChallengeFilter })}
        >
          {(Object.keys(OPTIONAL_LABEL) as OptionalChallengeFilter[]).map((key) => (
            <option key={key} value={key}>
              {OPTIONAL_LABEL[key]}
            </option>
          ))}
        </select>
      </label>
      <fieldset className="filter-checks">
        <legend>Filters</legend>
        <label>
          <input
            type="checkbox"
            checked={filters.hideCompleted}
            onChange={(event) => set({ hideCompleted: event.target.checked })}
          />
          Hide completed entries.
        </label>
        <label>
          <input
            type="checkbox"
            checked={filters.hideNotInterested}
            onChange={(event) => set({ hideNotInterested: event.target.checked })}
          />
          Hide entries marked not interested.
        </label>
      </fieldset>
    </div>
  );
}
