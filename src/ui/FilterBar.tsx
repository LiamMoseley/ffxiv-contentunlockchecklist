import type { RefObject } from "react";
import type { Filters, Log, OptionalChallengeFilter } from "../log";

const OPTIONAL_LABEL: Record<OptionalChallengeFilter, string> = {
  all: "All content",
  none: "No optional challenges",
  only: "Optional challenges only",
};

/** Whether the device has no hover or a coarse pointer, so the "(press /)" hint would be wrong. */
const touchDevice = (): boolean => window.matchMedia("(hover: none), (pointer: coarse)").matches;

/**
 * Search box, type and optional challenge drop-downs, the Filters checkboxes and Clear filters. Every choice is a
 * Log command. The bar stays mounted and slides shut; closed, its controls are inert so Tab can't reach them.
 */
export function FilterBar({
  log,
  searchRef,
  onChange,
  open,
  alwaysHidingMarked = false,
}: {
  log: Log;
  searchRef: RefObject<HTMLInputElement>;
  onChange: () => void;
  open: boolean;
  /** Available now lists only Unmarked entries: both hide checkboxes show as ticked and can't be changed. */
  alwaysHidingMarked?: boolean;
}) {
  const filters = log.filters();
  const set = (next: Partial<Filters>) => {
    log.setFilters(next);
    onChange();
  };
  const clearSearch = () => {
    set({ search: "" });
    searchRef.current?.focus();
  };
  return (
    <div className={`filter-bar-wrap${open ? "" : " closed"}`} {...(open ? {} : { inert: "" })}>
      <div className="filter-bar-clip">
        <div className="filter-bar" id="filter-bar" role="search">
          <label className="filter-field filter-search">
            <span>Search</span>
            <span className="search-box">
              <input
                ref={searchRef}
                type="search"
                placeholder={touchDevice() ? "Search" : "Search (press /)"}
                value={filters.search}
                onChange={(event) => set({ search: event.target.value })}
                onKeyDown={(event) => {
                  if (event.key === "Escape" && filters.search !== "") {
                    event.preventDefault();
                    set({ search: "" });
                  }
                }}
              />
              {filters.search !== "" && (
                <button type="button" className="search-clear" aria-label="Clear search" onClick={clearSearch}>
                  <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
                    <path d="M1 1l8 8M9 1l-8 8" stroke="#d8d8d8" strokeWidth="1.6" fill="none" />
                  </svg>
                </button>
              )}
            </span>
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
                checked={alwaysHidingMarked || filters.hideCompleted}
                disabled={alwaysHidingMarked}
                onChange={(event) => set({ hideCompleted: event.target.checked })}
              />
              Hide completed entries.
            </label>
            <label>
              <input
                type="checkbox"
                checked={alwaysHidingMarked || filters.hideNotInterested}
                disabled={alwaysHidingMarked}
                onChange={(event) => set({ hideNotInterested: event.target.checked })}
              />
              Hide entries marked not interested.
            </label>
          </fieldset>
          <button
            type="button"
            className="filters-clear"
            disabled={!log.canClearFilters()}
            onClick={() => {
              log.clearFilters();
              onChange();
              // The button disables itself now: keep keyboard focus in the bar.
              searchRef.current?.focus();
            }}
          >
            Clear filters
          </button>
        </div>
      </div>
    </div>
  );
}
