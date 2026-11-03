// PROTOTYPE Variant D, "Split pane": a three-column desktop app.
// A navigation tree (All → expansion → section, each with a bar) replaces tiles and tabs,
// a compact list where one status button cycles Unmarked → Completed → Not interested,
// and a detail pane for the selected entry, which becomes a bottom sheet on mobile.
import { useState } from 'react';
import { barColor, expansionOf, levelLabel, type Log, type Progress, type Status } from '../model';
import { Pictogram } from '../shared';

function Bar({ p }: { p: Progress }) {
  return (
    <div className="vd-bar" role="progressbar" aria-valuemin={0} aria-valuemax={p.total} aria-valuenow={p.done}>
      <div style={{ width: `${p.pct * 100}%`, background: barColor(p.pct) }} />
    </div>
  );
}

const next: Record<Status, Status> = { unmarked: 'completed', completed: 'notInterested', notInterested: 'unmarked' };
const glyph: Record<Status, string> = { unmarked: '', completed: '✓', notInterested: '⊘' };
const words: Record<Status, string> = { unmarked: 'Unmarked', completed: 'Completed', notInterested: 'Not interested' };

export function VariantD({ log, confirm }: { log: Log; confirm: (t: string, b: string, ok: () => void) => void }) {
  const [selected, setSelected] = useState<string | null>('e8');
  const [drawer, setDrawer] = useState(false);
  const [sheet, setSheet] = useState(false);
  const sel = log.entries.find((e) => e.id === selected);
  const selSection = sel && log.sections.find((s) => s.id === sel.sectionId)!;

  const where =
    log.expansion === 'all'
      ? 'All sections'
      : `${log.expansions.find((x) => x.id === log.expansion)!.name} · ${
          log.tab === 'all' ? 'All' : log.sections.find((s) => s.expansionId === log.expansion && s.kind === log.tab)!.title
        }`;

  const tree = (
    <nav className="vd-tree" aria-label="Log">
      <button className={`vd-node top ${log.expansion === 'all' ? 'on' : ''}`} onClick={() => { log.setExpansion('all'); setDrawer(false); }}>
        <Pictogram name="all" size={14} />
        <span>All sections</span>
        <small>{log.overall.done}/{log.overall.total}</small>
        <Bar p={log.overall} />
      </button>
      {log.expansions.map((x) => {
        const p = log.progressOfExpansion(x.id);
        return (
          <div key={x.id} className="vd-group">
            <button className={`vd-node exp ${log.expansion === x.id && log.tab === 'all' ? 'on' : ''}`} onClick={() => { log.setExpansion(x.id); log.setTab('all'); setDrawer(false); }}>
              <Pictogram name={x.id} size={14} />
              <span>{x.name} {p.done === p.total && <b className="vd-done">✓</b>}</span>
              <small>{p.done}/{p.total}</small>
              <Bar p={p} />
            </button>
            {log.sections
              .filter((s) => s.expansionId === x.id)
              .map((s) => {
                const sp = log.progressOfSection(s);
                return (
                  <button key={s.id} className={`vd-node sec ${log.expansion === x.id && log.tab === s.kind ? 'on' : ''}`} onClick={() => { log.setExpansion(x.id); log.setTab(s.kind); setDrawer(false); }}>
                    <span>{s.title}</span>
                    <small>{sp.done}/{sp.total}</small>
                    <Bar p={sp} />
                  </button>
                );
              })}
          </div>
        );
      })}
      <div className="vd-tree-foot">Patch 7.4 · community wiki · unofficial</div>
    </nav>
  );

  const detail = sel && selSection && (
    <div className="vd-detail-inner">
      <div className="vd-crumb">
        {expansionOf(selSection).name} · {selSection.title}
      </div>
      <h2>
        {sel.unlock} {sel.isNew && <em className="vd-new">NEW</em>}
      </h2>
      <div className={`vd-state ${log.status(sel.id)}`}>{words[log.status(sel.id)]}</div>
      <dl>
        <dt>{selSection.kind === 'cap' ? 'Item level' : 'Level'}</dt>
        <dd>{levelLabel(sel, selSection)}</dd>
        <dt>Type</dt>
        <dd><Pictogram name={sel.type} size={13} /> {sel.type}</dd>
        <dt>Quest</dt>
        <dd>{sel.quest}</dd>
        <dt>Location</dt>
        <dd>{sel.location}</dd>
        {sel.notes && (
          <>
            <dt>Notes</dt>
            <dd>{sel.notes}</dd>
          </>
        )}
      </dl>
      <div className="vd-actions">
        <button className={`big ${log.status(sel.id) === 'completed' ? 'on' : ''}`} onClick={() => log.toggleCompleted(sel.id)}>
          {log.status(sel.id) === 'completed' ? '✓ Completed' : 'Mark completed'}
        </button>
        <button className={`ni ${log.status(sel.id) === 'notInterested' ? 'on' : ''}`} onClick={() => log.toggleNotInterested(sel.id)}>
          ⊘ Not interested
        </button>
      </div>
      <a className="vd-wiki" href="#">Read on the wiki ↗</a>
    </div>
  );

  return (
    <div className="vd">
      <header className="vd-title">
        <h1>Content Unlock Log</h1>
        <select value={log.characterId} onChange={(e) => log.setCharacterId(e.target.value)} aria-label="Character">
          {log.characters.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.world}) · Lv {c.level}
            </option>
          ))}
        </select>
        <div className="vd-overall">
          <Bar p={log.overall} />
          <b>{Math.round(log.overall.pct * 100)}%</b>
        </div>
      </header>

      <div className="vd-cols">
        <aside className={`vd-left ${drawer ? 'open' : ''}`}>{tree}</aside>
        {drawer && <div className="vd-scrim" onClick={() => setDrawer(false)} />}

        <main className="vd-mid">
          <div className="vd-toolbar">
            <button className="vd-where" onClick={() => setDrawer(true)}>
              ☰ <span>{where}</span>
            </button>
            <div className="vd-tools">
              <button aria-pressed={log.hideCompleted} className={log.hideCompleted ? 'on' : ''} onClick={() => log.setHideCompleted(!log.hideCompleted)} title="Hide completed">
                ✓ hide
              </button>
              <button aria-pressed={log.hideNotInterested} className={log.hideNotInterested ? 'on' : ''} onClick={() => log.setHideNotInterested(!log.hideNotInterested)} title="Hide not interested">
                ⊘ hide
              </button>
            </div>
          </div>

          {log.visibleSections.map((s) => {
            const p = log.progressOfSection(s);
            const shown = log.shownIn(s);
            return (
              <section key={s.id}>
                <div className="vd-sec">
                  <span>{expansionOf(s).short} · {s.title}</span>
                  <Bar p={p} />
                  <small>{p.done}/{p.total}</small>
                </div>
                {shown.length === 0 && <p className="vd-empty">All entries hidden by filters.</p>}
                {shown.map((e) => {
                  const st = log.status(e.id);
                  return (
                    <div key={e.id} className={`vd-row ${st} ${selected === e.id ? 'sel' : ''}`}>
                      <button className={`vd-cycle ${st}`} onClick={() => log.setStatus(e.id, next[st])} title={`${words[st]}: click for ${words[next[st]]}`} aria-label={`${e.unlock}: ${words[st]}`}>
                        {glyph[st]}
                      </button>
                      <button className="vd-pick" onClick={() => { setSelected(e.id); setSheet(true); }}>
                        <span className="lv">{levelLabel(e, s)}</span>
                        <Pictogram name={e.type} size={13} />
                        <span className="name">{e.unlock}</span>
                        {e.isNew && <em className="vd-new">NEW</em>}
                        <span className="q">{e.quest}</span>
                      </button>
                    </div>
                  );
                })}
              </section>
            );
          })}

          <div className="vd-bulk">
            <button disabled={!log.toComplete.length} onClick={() => confirm('Complete Shown', `Mark ${log.toComplete.length} shown entries as completed?`, log.completeShown)}>
              Complete Shown
            </button>
            <button disabled={!log.toClear.length} onClick={() => confirm('Clear Shown', `Clear the status of ${log.toClear.length} shown entries?`, log.clearShown)}>
              Clear Shown
            </button>
          </div>
        </main>

        <aside className={`vd-right ${sheet ? 'open' : ''}`}>
          <button className="vd-sheet-close" onClick={() => setSheet(false)} aria-label="Close details">✕</button>
          {detail ?? <p className="vd-empty">Select an entry to see its details.</p>}
        </aside>
      </div>
    </div>
  );
}
