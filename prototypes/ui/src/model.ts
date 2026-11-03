// PROTOTYPE shared state. In memory only: a reload resets everything.
import { useMemo, useState } from 'react';
import { characters, entries, expansions, sections, type Entry, type Section } from './data';

export type Status = 'unmarked' | 'completed' | 'notInterested';
export type ExpansionPick = string | 'all';
export type TabPick = 'levelling' | 'cap' | 'all';

export interface Progress {
  done: number;
  total: number; // excludes not-interested entries
  pct: number;
}

const seed: Record<string, Record<string, Status>> = {
  c1: { e1: 'completed', e2: 'notInterested', e3: 'completed', e4: 'completed', e5: 'completed', e6: 'completed', e7: 'completed', e8: 'completed', e10: 'notInterested', e11: 'notInterested', e12: 'completed', e13: 'completed', e14: 'completed', e15: 'notInterested', e16: 'completed', e18: 'completed', e19: 'completed', e22: 'notInterested' },
  c2: { e1: 'completed', e3: 'completed', e12: 'completed' },
};

export function progressOf(list: Entry[], status: (id: string) => Status): Progress {
  const counted = list.filter((e) => status(e.id) !== 'notInterested');
  const done = counted.filter((e) => status(e.id) === 'completed').length;
  return { done, total: counted.length, pct: counted.length ? done / counted.length : 0 };
}

export function useLog() {
  const [characterId, setCharacterId] = useState('c1');
  const [byChar, setByChar] = useState(seed);
  const [expansion, setExpansion] = useState<ExpansionPick>('sb');
  const [tab, setTab] = useState<TabPick>('levelling');
  const [hideCompleted, setHideCompleted] = useState(false);
  const [hideNotInterested, setHideNotInterested] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  // Entries tagged NEW by the last update, until the player marks them as seen. Belongs to the log, not a character.
  const [newIds, setNewIds] = useState(() => new Set(entries.filter((e) => e.isNew).map((e) => e.id)));
  // "Show" on the new-entries notice: every section, NEW entries only. Picking an expansion or tab leaves this view.
  const [newOnly, setNewOnly] = useState(false);

  const statuses = byChar[characterId] ?? {};
  const status = (id: string): Status => statuses[id] ?? 'unmarked';
  const character = characters.find((c) => c.id === characterId)!;

  function flash(msg: string) {
    setToast(msg);
    window.clearTimeout((flash as any).t);
    (flash as any).t = window.setTimeout(() => setToast(null), 2600);
  }

  function setMany(ids: string[], next: Status) {
    setByChar((prev) => {
      const mine = { ...(prev[characterId] ?? {}) };
      for (const id of ids) {
        if (next === 'unmarked') delete mine[id];
        else mine[id] = next;
      }
      // Section-finished acknowledgement (US-5)
      for (const s of sections) {
        const list = entries.filter((e) => e.sectionId === s.id);
        const before = progressOf(list, (id) => prev[characterId]?.[id] ?? 'unmarked');
        const after = progressOf(list, (id) => mine[id] ?? 'unmarked');
        if (after.total && after.done === after.total && before.done !== before.total) {
          flash(`${expansionOf(s).name} · ${s.title} complete!`);
        }
      }
      return { ...prev, [characterId]: mine };
    });
  }

  // US-5 / US-6: toggle completed; ticking a not-interested entry marks it completed.
  const toggleCompleted = (id: string) => setMany([id], status(id) === 'completed' ? 'unmarked' : 'completed');
  const toggleNotInterested = (id: string) => setMany([id], status(id) === 'notInterested' ? 'unmarked' : 'notInterested');
  const setStatus = (id: string, s: Status) => setMany([id], s);
  // Variant E: one control steps Unmarked → Completed → Not interested → Unmarked
  const cycleStatus = (id: string) =>
    setMany([id], ({ unmarked: 'completed', completed: 'notInterested', notInterested: 'unmarked' } as const)[status(id)]);

  // Sections currently in view for the expansion + tab choice (US-2, US-3)
  const visibleSections: Section[] = sections.filter((s) => {
    if (newOnly) return entries.some((e) => e.sectionId === s.id && newIds.has(e.id));
    if (expansion !== 'all' && s.expansionId !== expansion) return false;
    if (expansion !== 'all' && tab !== 'all' && s.kind !== tab) return false;
    return true;
  });

  const isShown = (e: Entry) => {
    if (newOnly && !newIds.has(e.id)) return false;
    const st = status(e.id);
    if (hideCompleted && st === 'completed') return false;
    if (hideNotInterested && st === 'notInterested') return false;
    return true;
  };

  const shownEntries = useMemo(
    () => visibleSections.flatMap((s) => entries.filter((e) => e.sectionId === s.id && isShown(e))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [visibleSections.map((s) => s.id).join(), hideCompleted, hideNotInterested, statuses, newOnly, newIds],
  );

  const toComplete = shownEntries.filter((e) => status(e.id) === 'unmarked').map((e) => e.id);
  const toClear = shownEntries.filter((e) => status(e.id) !== 'unmarked').map((e) => e.id);

  return {
    character,
    characters,
    characterId,
    setCharacterId,
    expansions,
    sections,
    entries,
    expansion,
    setExpansion: (x: ExpansionPick) => { setNewOnly(false); setExpansion(x); },
    tab,
    setTab: (t: TabPick) => { setNewOnly(false); setTab(t); },
    newOnly,
    showNewOnly: () => setNewOnly(true),
    showAll: () => setNewOnly(false),
    hideCompleted,
    setHideCompleted,
    hideNotInterested,
    setHideNotInterested,
    status,
    toggleCompleted,
    toggleNotInterested,
    setStatus,
    cycleStatus,
    isNew: (id: string) => newIds.has(id),
    newEntries: entries.filter((e) => newIds.has(e.id)),
    acknowledgeNew: () => {
      const n = newIds.size;
      setNewIds(new Set());
      setNewOnly(false);
      flash(`${n} new ${n === 1 ? 'entry' : 'entries'} marked as seen`);
    },
    visibleSections,
    shownIn: (s: Section) => entries.filter((e) => e.sectionId === s.id && isShown(e)),
    entriesIn: (s: Section) => entries.filter((e) => e.sectionId === s.id),
    progressOfSection: (s: Section) => progressOf(entries.filter((e) => e.sectionId === s.id), status),
    progressOfExpansion: (id: string) =>
      progressOf(entries.filter((e) => sections.find((s) => s.id === e.sectionId)!.expansionId === id), status),
    progressOfTab: (kind: TabPick) =>
      progressOf(
        entries.filter((e) => {
          const s = sections.find((x) => x.id === e.sectionId)!;
          return (expansion === 'all' || s.expansionId === expansion) && (kind === 'all' || s.kind === kind);
        }),
        status,
      ),
    overall: progressOf(entries, status),
    progressOfCharacter: (id: string) => progressOf(entries, (eid) => byChar[id]?.[eid] ?? 'unmarked'),
    toComplete,
    toClear,
    completeShown: () => {
      setMany(toComplete, 'completed');
      flash(`Marked ${toComplete.length} entries completed`);
    },
    clearShown: () => {
      setMany(toClear, 'unmarked');
      flash(`Cleared ${toClear.length} entries`);
    },
    toast,
  };
}

export type Log = ReturnType<typeof useLog>;

export function expansionOf(s: Section) {
  return expansions.find((x) => x.id === s.expansionId)!;
}

export function levelLabel(e: Entry, _s?: Section) {
  return e.level === '-' ? '—' : e.level;
}

/** Blue → yellow-green, as the PRD's progress bar asks. */
export function barColor(pct: number) {
  const hue = 205 - 125 * pct; // 205 blue → 80 yellow-green
  return `hsl(${hue} 85% 55%)`;
}
