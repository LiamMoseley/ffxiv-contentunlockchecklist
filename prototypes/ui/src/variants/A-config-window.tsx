// PROTOTYPE Variant A, "Config window": the PRD's section 7 taken literally.
// Bronze-framed charcoal window, red tile column, slanted tabs, table rows that become labelled cards on mobile,
// yellow checkbox for Completed plus a separate ⊘ control for Not interested.
import { barColor, expansionOf, levelLabel, type Log, type Progress, type TabPick } from '../model';
import { Pictogram } from '../shared';

function Bar({ p, small }: { p: Progress; small?: boolean }) {
  return (
    <div className={`va-bar ${small ? 'small' : ''}`} role="progressbar" aria-valuemin={0} aria-valuemax={p.total} aria-valuenow={p.done}>
      <div style={{ width: `${p.pct * 100}%`, background: barColor(p.pct) }} />
    </div>
  );
}

export function VariantA({ log, confirm }: { log: Log; confirm: (t: string, b: string, ok: () => void) => void }) {
  const tabs: { k: TabPick; label: string }[] =
    log.expansion === 'all'
      ? []
      : [
          ...log.sections
            .filter((s) => s.expansionId === log.expansion)
            .map((s) => ({ k: s.kind as TabPick, label: s.title })),
          { k: 'all', label: 'All' },
        ];

  return (
    <div className="va">
      <div className="va-window">
        <header className="va-head">
          <h1>Content Unlock Log</h1>
          <select value={log.characterId} onChange={(e) => log.setCharacterId(e.target.value)} aria-label="Character">
            {log.characters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.world})
              </option>
            ))}
          </select>
          <div className="va-overall">
            <span>Overall</span>
            <Bar p={log.overall} />
            <b>
              {log.overall.done}/{log.overall.total}
            </b>
          </div>
        </header>

        <div className="va-body">
          <nav className="va-tiles" aria-label="Expansions">
            {log.expansions.map((x) => {
              const p = log.progressOfExpansion(x.id);
              return (
                <button key={x.id} className={`va-tile ${log.expansion === x.id ? 'on' : ''}`} onClick={() => log.setExpansion(x.id)} aria-pressed={log.expansion === x.id}>
                  <span className="va-tile-icon">
                    <Pictogram name={x.id} size={26} />
                    {p.done === p.total && <i className="va-done-mark">✓</i>}
                  </span>
                  <span className="va-tile-text">
                    <span className="long">{x.name}</span>
                    <span className="short">{x.short}</span>
                    <small>Lv {x.levels}</small>
                    <Bar p={p} small />
                  </span>
                </button>
              );
            })}
            <button className={`va-tile all ${log.expansion === 'all' ? 'on' : ''}`} onClick={() => log.setExpansion('all')} aria-pressed={log.expansion === 'all'}>
              <span className="va-tile-icon">
                <Pictogram name="all" size={24} />
              </span>
              <span className="va-tile-text">
                <span className="long">All</span>
                <span className="short">All</span>
                <small>Every section</small>
                <Bar p={log.overall} small />
              </span>
            </button>
          </nav>

          <main className="va-main">
            {tabs.length > 0 && (
              <div className="va-tabs" role="tablist">
                {tabs.map((t) => {
                  const p = log.progressOfTab(t.k);
                  return (
                    <button key={t.k} role="tab" aria-selected={log.tab === t.k} className={log.tab === t.k ? 'on' : ''} onClick={() => log.setTab(t.k)}>
                      <span>{t.label}</span> <small>{p.done}/{p.total}</small>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="va-filters">
              <label className="va-check">
                <input type="checkbox" checked={log.hideCompleted} onChange={(e) => log.setHideCompleted(e.target.checked)} />
                <span /> Hide completed
              </label>
              <label className="va-check">
                <input type="checkbox" checked={log.hideNotInterested} onChange={(e) => log.setHideNotInterested(e.target.checked)} />
                <span /> Hide not interested
              </label>
            </div>

            <div className="va-scroll">
              {log.visibleSections.map((s) => {
                const p = log.progressOfSection(s);
                const shown = log.shownIn(s);
                return (
                  <section key={s.id} className="va-section">
                    <div className="va-section-head">
                      <h2>
                        {expansionOf(s).name} <span>· {s.title}</span>
                      </h2>
                      <Bar p={p} />
                      <b>
                        {p.done}/{p.total}
                      </b>
                    </div>
                    {shown.length === 0 ? (
                      <p className="va-empty">All {log.entriesIn(s).length} entries in this section are hidden by your filters.</p>
                    ) : (
                      <div className="va-table" role="table">
                        <div className="va-row va-th" role="row">
                          <span />
                          <span>{s.kind === 'cap' ? 'iLvl' : 'Lv'}</span>
                          <span>Unlock</span>
                          <span>Type</span>
                          <span>Quest</span>
                          <span>Location</span>
                          <span>Notes</span>
                          <span />
                        </div>
                        {shown.map((e) => {
                          const st = log.status(e.id);
                          return (
                            <div
                              key={e.id}
                              role="row"
                              tabIndex={0}
                              className={`va-row ${st}`}
                              onClick={() => log.toggleCompleted(e.id)}
                              onKeyDown={(k) => {
                                if (k.key === ' ' || k.key === 'Enter') { k.preventDefault(); log.toggleCompleted(e.id); }
                                if (k.key.toLowerCase() === 'x') log.toggleNotInterested(e.id);
                              }}
                            >
                              <span className="va-cb" aria-label={st === 'completed' ? 'Completed' : 'Not completed'}>
                                <i className={st === 'completed' ? 'on' : ''} />
                              </span>
                              <span data-l={s.kind === 'cap' ? 'iLvl' : 'Lv'} className="lv">{levelLabel(e, s)}</span>
                              <span data-l="Unlock" className="unlock">
                                <a href="#" onClick={(ev) => ev.stopPropagation()}>{e.unlock}</a>
                                {e.isNew && <em className="va-new">NEW</em>}
                              </span>
                              <span data-l="Type" className="type">
                                <span><Pictogram name={e.type} size={14} /> {e.type}</span>
                              </span>
                              <span data-l="Quest">{e.quest}</span>
                              <span data-l="Location">{e.location}</span>
                              <span data-l="Notes" className="notes">{e.notes ?? ''}</span>
                              <button
                                className={`va-ni ${st === 'notInterested' ? 'on' : ''}`}
                                title="Not interested (X)"
                                aria-pressed={st === 'notInterested'}
                                onClick={(ev) => { ev.stopPropagation(); log.toggleNotInterested(e.id); }}
                              >
                                ⊘<span className="lbl"> Not interested</span>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </section>
                );
              })}
            </div>
          </main>
        </div>

        <footer className="va-foot">
          <small>data from the community wiki · unofficial fan tool</small>
          <div>
            <button disabled={!log.toComplete.length} onClick={() => confirm('Complete Shown', `Mark ${log.toComplete.length} shown entries as completed?`, log.completeShown)}>
              Complete Shown
            </button>
            <button disabled={!log.toClear.length} onClick={() => confirm('Clear Shown', `Clear the status of ${log.toClear.length} shown entries?`, log.clearShown)}>
              Clear Shown
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
