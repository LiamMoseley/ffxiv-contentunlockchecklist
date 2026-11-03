// PROTOTYPE Variant B, "Ledger": built for fast ticking on a phone.
// Expansions as a top strip with ring progress, sections as a segmented control, two-line rows (no table)
// with an explicit three-state status control, and a sticky action bar holding filters and bulk buttons.
import { useState } from 'react';
import { barColor, expansionOf, levelLabel, type Log, type Progress, type Status, type TabPick } from '../model';
import { Pictogram } from '../shared';

function Ring({ p, size = 34 }: { p: Progress; size?: number }) {
  const r = size / 2 - 3;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} className="vb-ring" role="img" aria-label={`${p.done} of ${p.total}`}>
      <circle cx={size / 2} cy={size / 2} r={r} stroke="#2a3240" strokeWidth="4" fill="none" />
      <circle cx={size / 2} cy={size / 2} r={r} stroke={barColor(p.pct)} strokeWidth="4" fill="none" strokeLinecap="round"
        strokeDasharray={`${c * p.pct} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
    </svg>
  );
}

function Line({ p }: { p: Progress }) {
  return (
    <div className="vb-line" role="progressbar" aria-valuemin={0} aria-valuemax={p.total} aria-valuenow={p.done}>
      <div style={{ width: `${p.pct * 100}%`, background: `linear-gradient(90deg, ${barColor(0)}, ${barColor(p.pct)})` }} />
    </div>
  );
}

const statusOpts: { s: Status; icon: string; label: string }[] = [
  { s: 'unmarked', icon: '○', label: 'Unmarked' },
  { s: 'completed', icon: '✓', label: 'Completed' },
  { s: 'notInterested', icon: '⊘', label: 'Not interested' },
];

export function VariantB({ log, confirm }: { log: Log; confirm: (t: string, b: string, ok: () => void) => void }) {
  const [open, setOpen] = useState<string | null>(null);
  const pct = Math.round(log.overall.pct * 100);

  return (
    <div className="vb">
      <header className="vb-top">
        <div className="vb-brand">
          <span>Content Unlock Log</span>
          <button className="vb-char" onClick={() => log.setCharacterId(log.characterId === 'c1' ? 'c2' : 'c1')} title="Switch character">
            {log.character.name} <em>({log.character.world})</em> ▾
          </button>
        </div>
        <div className="vb-big">
          <b>{pct}%</b>
          <small>
            {log.overall.done} of {log.overall.total}
          </small>
        </div>
      </header>

      <nav className="vb-strip" aria-label="Expansions">
        {log.expansions.map((x) => {
          const p = log.progressOfExpansion(x.id);
          return (
            <button key={x.id} className={log.expansion === x.id ? 'on' : ''} onClick={() => log.setExpansion(x.id)} aria-pressed={log.expansion === x.id}>
              <Ring p={p} />
              <span>
                <b className="long">{x.name}</b>
                <b className="short">{x.short}</b>
                <small>{p.done === p.total ? 'Complete ✓' : `Lv ${x.levels}`}</small>
              </span>
            </button>
          );
        })}
        <button className={`all ${log.expansion === 'all' ? 'on' : ''}`} onClick={() => log.setExpansion('all')} aria-pressed={log.expansion === 'all'}>
          <Ring p={log.overall} />
          <span>
            <b>All</b>
            <small>Everything</small>
          </span>
        </button>
      </nav>

      {log.expansion !== 'all' && (
        <div className="vb-seg" role="tablist">
          {(['levelling', 'cap', 'all'] as TabPick[]).map((k) => {
            const s = log.sections.find((x) => x.expansionId === log.expansion && x.kind === k);
            const p = log.progressOfTab(k);
            return (
              <button key={k} role="tab" aria-selected={log.tab === k} className={log.tab === k ? 'on' : ''} onClick={() => log.setTab(k)}>
                {s ? s.title : 'All'} <small>{p.done}/{p.total}</small>
              </button>
            );
          })}
        </div>
      )}

      <main className="vb-list">
        {log.visibleSections.map((s) => {
          const p = log.progressOfSection(s);
          const shown = log.shownIn(s);
          return (
            <section key={s.id}>
              <h2 className="vb-sec">
                <span>
                  {expansionOf(s).short} · {s.title}
                </span>
                <small>
                  {p.done}/{p.total}
                </small>
                <Line p={p} />
              </h2>
              {shown.length === 0 && <p className="vb-empty">Everything here is hidden by your filters.</p>}
              <ul>
                {shown.map((e) => {
                  const st = log.status(e.id);
                  return (
                    <li key={e.id} className={`vb-row ${st} ${open === e.id ? 'open' : ''}`}>
                      <div className="vb-status" role="radiogroup" aria-label={`Status of ${e.unlock}`}>
                        {statusOpts.map((o) => (
                          <button key={o.s} role="radio" aria-checked={st === o.s} title={o.label} className={`${o.s} ${st === o.s ? 'on' : ''}`} onClick={() => log.setStatus(e.id, o.s)}>
                            {o.icon}
                          </button>
                        ))}
                      </div>
                      <button className="vb-main" onClick={() => setOpen(open === e.id ? null : e.id)} aria-expanded={open === e.id}>
                        <span className="l1">
                          <span className="lv">{levelLabel(e, s)}</span>
                          <span className="name">{e.unlock}</span>
                          {e.isNew && <em className="vb-new">NEW</em>}
                          {e.optionalChallenge && <em className="vb-oc" title="Optional challenge">★</em>}
                        </span>
                        <span className="l2">
                          <Pictogram name={e.type} size={12} /> {e.type} · {e.quest}
                        </span>
                      </button>
                      {open === e.id && (
                        <div className="vb-more">
                          <div><span>Location</span>{e.location}</div>
                          {e.notes && <div><span>Notes</span>{e.notes}</div>}
                          <a href="#">Open on wiki ↗</a>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
        <p className="vb-credit">Patch 7.4 · data from the community wiki · unofficial fan tool</p>
      </main>

      <footer className="vb-bar">
        <div className="vb-chips">
          <button className={log.hideCompleted ? 'on' : ''} aria-pressed={log.hideCompleted} onClick={() => log.setHideCompleted(!log.hideCompleted)}>
            Hide ✓
          </button>
          <button className={log.hideNotInterested ? 'on' : ''} aria-pressed={log.hideNotInterested} onClick={() => log.setHideNotInterested(!log.hideNotInterested)}>
            Hide ⊘
          </button>
        </div>
        <div className="vb-bulk">
          <button disabled={!log.toComplete.length} onClick={() => confirm('Complete Shown', `Mark ${log.toComplete.length} shown entries as completed?`, log.completeShown)}>
            ✓ All shown
          </button>
          <button disabled={!log.toClear.length} onClick={() => confirm('Clear Shown', `Clear the status of ${log.toClear.length} shown entries?`, log.clearShown)}>
            Clear
          </button>
        </div>
      </footer>
    </div>
  );
}
