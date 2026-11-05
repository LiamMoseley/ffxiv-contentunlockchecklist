import type { Log, ProgressCount } from "../log";
import { Pictogram } from "./Pictogram";
import { Count, ProgressBar } from "./ProgressBar";

/** Which expansion tile is chosen: one expansion, or the All tile. */
export type ExpansionChoice = string | "all";

/**
 * The column of expansion tiles, with the All tile set apart at the top. Each tile shows its name,
 * level range and progress. Collapsed, only tiles, short names and bars remain, with tooltips.
 */
export function ExpansionRail({
  log,
  chosen,
  onChoose,
  collapsed,
  onToggleCollapsed,
}: {
  log: Log;
  chosen: ExpansionChoice;
  onChoose: (choice: ExpansionChoice) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}) {
  const overall = log.overallProgress();
  return (
    <nav className="rail" aria-label="Expansions">
      <Tile
        className="all"
        pictogram="all"
        name="All"
        shortName="All"
        detail="Every expansion"
        progress={overall}
        chosen={chosen === "all"}
        onClick={() => onChoose("all")}
      />
      <div className="rail-gap" role="separator" />
      {log.expansions().map((expansion) => (
        <Tile
          key={expansion.id}
          pictogram={expansion.id}
          name={expansion.name}
          shortName={expansion.shortName}
          detail={`Level ${expansion.minLevel}–${expansion.levelCap}`}
          progress={log.expansionProgress(expansion.id)}
          chosen={chosen === expansion.id}
          onClick={() => onChoose(expansion.id)}
        />
      ))}
      <button
        type="button"
        className="rail-collapse"
        onClick={onToggleCollapsed}
        aria-expanded={!collapsed}
        aria-label={collapsed ? "Expand expansion list" : "Collapse expansion list"}
        title={collapsed ? "Expand" : "Collapse"}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
          <path d={collapsed ? "M2 1l5 5-5 5V1zm4 0l5 5-5 5V1z" : "M10 1L5 6l5 5V1zM6 1L1 6l5 5V1z"} />
        </svg>
      </button>
    </nav>
  );
}

function Tile({
  className = "",
  pictogram,
  name,
  shortName,
  detail,
  progress,
  chosen,
  onClick,
}: {
  className?: string;
  pictogram: string;
  name: string;
  shortName: string;
  detail: string;
  progress: ProgressCount;
  chosen: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`rail-item ${className}${chosen ? " chosen" : ""}`}
      aria-pressed={chosen}
      onClick={onClick}
      title={`${name} · ${detail} · ${progress.completed}/${progress.total}`}
    >
      <span className="tile">
        <Pictogram name={pictogram} />
      </span>
      <span className="rail-text">
        <span className="rail-name">
          <span className="long">{name}</span>
          <span className="short" aria-hidden="true">
            {shortName}
          </span>
        </span>
        <span className="rail-detail">{detail}</span>
        <span className="rail-progress">
          <ProgressBar progress={progress} label={`${name} progress`} thin />
          <Count progress={progress} />
        </span>
      </span>
    </button>
  );
}
