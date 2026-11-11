import { useLayoutEffect, useRef, useState } from "react";
import type { Log, ProgressCount } from "../log";
import { Pictogram } from "./Pictogram";
import { Count, ProgressBar } from "./ProgressBar";

/** Which expansion tile is chosen: one expansion, or the All tile. */
export type ExpansionChoice = string | "all";

/** The marker's box in the rail, and whether a tile is chosen (it fades out when none is). */
type Box = { x: number; y: number; w: number; h: number; on: boolean };
const sameBox = (a: Box, b: Box) => a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h && a.on === b.on;

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
  noneChosen = false,
  availableOpen = false,
  onChooseAvailable,
}: {
  /** Available now is showing: its tile is highlighted. */
  availableOpen?: boolean;
  onChooseAvailable: () => void;
  /** Another view (the NEW entries) is showing: no tile is highlighted, but each still works. */
  noneChosen?: boolean;
  log: Log;
  chosen: ExpansionChoice;
  onChoose: (choice: ExpansionChoice) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}) {
  const overall = log.overallProgress();
  const railRef = useRef<HTMLElement>(null);
  const [marker, setMarker] = useState<Box | null>(null);
  const placed = useRef<Box | null>(null);

  // The active marker is one element that slides between tiles, so it is placed from the chosen
  // tile's box. It follows the rail's and the tiles' sizes (collapsing, a narrow window, web fonts).
  // No dependency list on purpose: every render may choose another tile, and `place` ignores no-ops.
  useLayoutEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    const place = () => {
      const tile = rail.querySelector<HTMLElement>(".rail-item.chosen");
      const last = placed.current;
      // With no tile chosen, the marker stays where it was and fades out.
      const next: Box | null = tile
        ? { x: tile.offsetLeft, y: tile.offsetTop, w: tile.offsetWidth, h: tile.offsetHeight, on: true }
        : last && { ...last, on: false };
      if (next && (!last || !sameBox(last, next))) {
        placed.current = next;
        setMarker(next);
      }
    };
    place();
    const observer = new ResizeObserver(place);
    observer.observe(rail);
    rail.querySelectorAll(".rail-item").forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  });

  return (
    <nav className="rail" aria-label="Expansions" ref={railRef}>
      {marker && (
        <span
          className={`rail-marker${marker.on ? " on" : ""}`}
          aria-hidden="true"
          style={{ transform: `translate(${marker.x}px, ${marker.y}px)`, width: marker.w, height: marker.h }}
        />
      )}
      <Tile
        className="available"
        pictogram="available"
        name="Available now"
        shortName="Now"
        detail="What you can do at your current level"
        chosen={availableOpen}
        onClick={onChooseAvailable}
      />
      <div className="rail-gap" role="separator" />
      <Tile
        className="all"
        pictogram="all"
        name="All"
        shortName="All"
        detail="Every expansion"
        progress={overall}
        chosen={!noneChosen && chosen === "all"}
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
          chosen={!noneChosen && chosen === expansion.id}
          hasNew={log.expansionHasNew(expansion.id)}
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
  hasNew = false,
  onClick,
}: {
  /** The expansion has NEW entries not yet seen. */
  hasNew?: boolean;
  className?: string;
  pictogram: string;
  name: string;
  shortName: string;
  detail: string;
  progress?: ProgressCount;
  chosen: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`rail-item ${className}${chosen ? " chosen" : ""}`}
      aria-pressed={chosen}
      onClick={onClick}
      title={
        progress
          ? `${name} · ${detail} · ${progress.completed}/${progress.total}${hasNew ? " · NEW entries" : ""}`
          : `${name} · ${detail}`
      }
    >
      <span className="tile">
        <Pictogram name={pictogram} />
        {hasNew && <span className="tile-new">NEW</span>}
      </span>
      <span className="rail-text">
        <span className="rail-name">
          <span className="long">{name}</span>
          <span className="short" aria-hidden="true">
            {shortName}
          </span>
        </span>
        <span className="rail-detail">{detail}</span>
        {progress && (
          <span className="rail-progress">
            <ProgressBar progress={progress} label={`${name} progress`} thin />
            <Count progress={progress} />
          </span>
        )}
      </span>
    </button>
  );
}
