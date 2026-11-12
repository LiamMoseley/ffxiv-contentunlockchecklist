/* PROTOTYPE (throwaway): see PrototypeSwitcher.tsx. Three structurally different stacked-row layouts. */
import bundledContent from "../../content/bundled-content.json";
import type { Content, Entry, EntryStatus, RichText } from "../../log";
import { entryIcon, entryName } from "../../log";
import { FallbackGlyph, NewBadge, RichCell, StatusButton, WikiIcon, flashProps, type EntryActions } from "../EntryList";
import { usePrototypeCases, type Variant } from "./PrototypeSwitcher";

type EntryProps = (entryId: string) => Record<string, unknown>;

type Props = {
  variant: Exclude<Variant, "current">;
  entries: Entry[];
  statusOf: (entryId: string) => EntryStatus;
  isNew: (entryId: string) => boolean;
  actions: EntryActions;
  entryProps: EntryProps;
};

/** The entries that stress a layout: each case takes the first entry in view that matches it. */
const CASES: [string, (e: Entry) => boolean][] = [
  [
    "Typical levelling entry",
    (e) => !!e.level && !!e.quest && !!e.location && e.information.length > 0 && e.information.length < 80,
  ],
  ["Nothing but a name (no Quest, Location, Information)", (e) => !e.quest && !e.location && !e.information],
  ["Long Information", (e) => e.information.length > 180],
  ["Multi-line Quest", (e) => e.quest.split("\n").length > 2],
  ["Long Location", (e) => e.location.length > 60],
  ["Level and Item level both", (e) => !!e.level && !!e.itemLevel],
  ["Optional challenge with Item level", (e) => e.optionalChallenge && !!e.itemLevel],
  ["Level-cap, Item level only", (e) => !e.level && !!e.itemLevel && !e.optionalChallenge],
  ["Multi-line Type", (e) => e.type.includes("\n")],
  ["No Quest, has Location", (e) => !!e.level && !e.quest && !!e.location],
];

/** Chosen once from the whole bundled log, so each case shows once; a section lists the ones it holds. */
let chosen: { label: string; entry: Entry }[] | undefined;
function pickCases(entries: Entry[]): { label: string; entry: Entry }[] {
  if (!chosen) {
    const all = (bundledContent as Content).sections.flatMap((s) => s.entries);
    const used = new Set<string>();
    chosen = [];
    for (const [label, test] of CASES) {
      const entry = all.find((e) => !used.has(e.id) && test(e));
      if (!entry) continue;
      used.add(entry.id);
      chosen.push({ label, entry });
    }
  }
  const here = new Set(entries.map((e) => e.id));
  return chosen.filter((c) => here.has(c.entry.id));
}

const stripIcons = (text: RichText): RichText => text.map((line) => line.filter((s) => !("icon" in s)));
const firstLine = (text: RichText): RichText => text.slice(0, 1);

const levelChips = (entry: Entry) =>
  [
    entry.level && { key: "lv", text: `Lv. ${entry.level}` },
    entry.itemLevel && { key: "ilv", text: `iLv. ${entry.itemLevel}` },
  ].filter((chip) => !!chip);

function Chip({ children, kind = "" }: { children: React.ReactNode; kind?: string }) {
  return <span className={`pr-chip ${kind}`}>{children}</span>;
}

function Field({ label, text, className = "" }: { label: string; text: RichText; className?: string }) {
  if (text.length === 0) return null;
  return (
    <div className={`pr-field pr-fade ${className}`}>
      <span className="pr-label">{label}</span>
      <RichCell text={text} />
    </div>
  );
}

function IconPlate({ entry, size }: { entry: Entry; size: number }) {
  const icon = entryIcon(entry);
  return <span className="pr-plate">{icon ? <WikiIcon icon={icon.icon} size={size} /> : <FallbackGlyph />}</span>;
}

type RowProps = {
  entry: Entry;
  status: EntryStatus;
  isNew: boolean;
  actions: EntryActions;
  entryProps: EntryProps;
  letter: "a" | "b" | "c" | "d";
};

/** Wraps one entry in the shell every variant shares: the status classes, the sheen and the real tap handlers. */
function Shell({ entry, status, actions, entryProps, letter, children }: RowProps & { children: React.ReactNode }) {
  const flash = flashProps(actions, entry, status);
  return (
    <div className={`pr pr-${letter} ${status} ${flash.className}`} title={entryName(entry)} {...entryProps(entry.id)}>
      {children}
    </div>
  );
}

const status = (entry: Entry, s: EntryStatus, actions: EntryActions) => (
  <span className="pr-status">
    <StatusButton entry={entry} status={s} flash={flashProps(actions, entry, s).flashing} />
  </span>
);

/** A: headline (status, icon, name), a chip line, then Quest, then the quieter Location and Information. */
function RowA(props: RowProps) {
  const { entry, status: s, isNew, actions } = props;
  return (
    <Shell {...props}>
      <div className="pr-a-head">
        {status(entry, s, actions)}
        <span className="pr-fade pr-a-icon">
          <IconPlate entry={entry} size={28} />
        </span>
        <b className="pr-name pr-fade">
          <RichCell text={stripIcons(entry.rich.unlock)} />
          {isNew && <NewBadge />}
        </b>
      </div>
      <div className="pr-chips pr-fade">
        {levelChips(entry).map((c) => (
          <Chip key={c.key} kind="level">
            {c.text}
          </Chip>
        ))}
        <Chip kind="type">
          <RichCell text={firstLine(entry.rich.type)} />
        </Chip>
        {entry.optionalChallenge && <Chip kind="optional">Optional challenge</Chip>}
      </div>
      <Field label="Quest" text={entry.rich.quest} className="pr-quest" />
      {(entry.rich.location.length > 0 || entry.rich.information.length > 0) && (
        <div className="pr-a-more">
          <Field label="Location" text={entry.rich.location} className="pr-quiet" />
          <Field label="Information" text={entry.rich.information} className="pr-quiet" />
        </div>
      )}
    </Shell>
  );
}

/** B: a left spine (status over a big level number), the name with the icon plate, Type as a subtitle. */
function RowB(props: RowProps) {
  const { entry, status: s, isNew, actions } = props;
  const lv = entry.level || entry.itemLevel;
  return (
    <Shell {...props}>
      <div className="pr-b-spine">
        {status(entry, s, actions)}
        {lv && (
          <span className="pr-b-level pr-fade">
            <small>{entry.level ? "Lv." : "iLv."}</small>
            {lv}
          </span>
        )}
      </div>
      <div className="pr-b-main">
        <div className="pr-b-title">
          <b className="pr-name pr-fade">
            <RichCell text={stripIcons(entry.rich.unlock)} />
            {isNew && <NewBadge />}
          </b>
          <span className="pr-fade">
            <IconPlate entry={entry} size={28} />
          </span>
        </div>
        <div className="pr-b-sub pr-fade">
          <RichCell text={firstLine(entry.rich.type)} />
          {entry.optionalChallenge && <Chip kind="optional">Optional challenge</Chip>}
        </div>
        <div className="pr-b-grid">
          <Field label="Quest" text={entry.rich.quest} className="pr-quest" />
          <Field label="Location" text={entry.rich.location} />
          <Field label="Information" text={entry.rich.information} className="pr-quiet pr-b-wide" />
        </div>
      </div>
    </Shell>
  );
}

/** C: two dense lines, then one run-on notes paragraph with inline labels; no icon plate, no chips. */
function RowC(props: RowProps) {
  const { entry, status: s, isNew, actions } = props;
  const icon = entryIcon(entry);
  return (
    <Shell {...props}>
      <div className="pr-c-line1">
        {status(entry, s, actions)}
        <b className="pr-name pr-fade">
          <RichCell text={stripIcons(entry.rich.unlock)} />
          {isNew && <NewBadge />}
        </b>
        <span className="pr-c-lv pr-fade">
          {levelChips(entry)
            .map((c) => c.text)
            .join(" · ")}
        </span>
      </div>
      <div className="pr-c-line2 pr-fade">
        {icon ? <WikiIcon icon={icon.icon} size={20} /> : null}
        <RichCell text={firstLine(entry.rich.type)} />
        {entry.optionalChallenge && <Chip kind="optional">Optional</Chip>}
        {entry.rich.quest.length > 0 && (
          <span className="pr-c-quest">
            <span className="pr-run">Quest</span>
            <RichCell text={entry.rich.quest} />
          </span>
        )}
      </div>
      {(entry.rich.location.length > 0 || entry.rich.information.length > 0) && (
        <div className="pr-c-notes pr-fade">
          {entry.rich.location.length > 0 && (
            <span>
              <span className="pr-run">Where</span>
              <RichCell text={entry.rich.location} />
            </span>
          )}
          {entry.rich.information.length > 0 && (
            <span>
              <span className="pr-run">Note</span>
              <RichCell text={entry.rich.information} />
            </span>
          )}
        </div>
      )}
    </Shell>
  );
}

/**
 * D: B's spine (status box over the level or Item level) with A's headline row (icon and name level with the
 * box), A's chips for Type and Optional challenge, and A's divider between Quest and Location/Information.
 */
function RowD(props: RowProps) {
  const { entry, status: s, isNew, actions } = props;
  const lv = entry.level || entry.itemLevel;
  const hasMore = entry.rich.location.length > 0 || entry.rich.information.length > 0;
  return (
    <Shell {...props}>
      <div className="pr-d-spine">
        <div className="pr-d-tick">{status(entry, s, actions)}</div>
        {lv && (
          <span className={`pr-b-level pr-fade${entry.level ? "" : " pr-d-ilv-main"}`}>
            <small>{entry.level ? "Lv." : "iLv."}</small>
            {lv}
          </span>
        )}
        {entry.level && entry.itemLevel && (
          <span className="pr-d-ilv pr-fade">
            <small>iLv.</small>
            {entry.itemLevel}
          </span>
        )}
      </div>
      <div className="pr-d-main">
        <div className="pr-d-head">
          <span className="pr-fade">
            <IconPlate entry={entry} size={28} />
          </span>
          <b className="pr-name pr-fade">
            <RichCell text={stripIcons(entry.rich.unlock)} />
            {isNew && <NewBadge />}
          </b>
        </div>
        <div className="pr-chips pr-fade">
          <Chip kind="type">
            <RichCell text={stripIcons(firstLine(entry.rich.type))} />
          </Chip>
          {entry.optionalChallenge && <Chip kind="optional">Optional challenge</Chip>}
        </div>
        <Field label="Quest" text={entry.rich.quest} className="pr-quest" />
        {hasMore && (
          <div className="pr-a-more">
            <Field label="Location" text={entry.rich.location} className="pr-quiet" />
            <Field label="Information" text={entry.rich.information} className="pr-quiet" />
          </div>
        )}
      </div>
    </Shell>
  );
}

const ROWS = { A: RowA, B: RowB, C: RowC, D: RowD } as const;

export function StackedRowPrototype({ variant, entries, statusOf, isNew, actions, entryProps }: Props) {
  const casesOnly = usePrototypeCases();
  const Row = ROWS[variant];
  const items = casesOnly ? pickCases(entries) : entries.map((entry) => ({ label: "", entry }));
  const letter = variant.toLowerCase() as "a" | "b" | "c" | "d";
  return (
    <div className="pr-list" data-variant={variant}>
      {items.map(({ label, entry }) => (
        <div className="pr-item" key={entry.id}>
          {label && <div className="pr-caption">{label}</div>}
          <Row
            entry={entry}
            status={statusOf(entry.id)}
            isNew={isNew(entry.id)}
            actions={actions}
            entryProps={entryProps}
            letter={letter}
          />
        </div>
      ))}
    </div>
  );
}
