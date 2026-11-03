// PROTOTYPE Variant E, "Game window": Variant A refined against the user's reference screenshots of the
// game's Character/System Configuration, Actions & Traits and crafting windows. Shapes and colours are
// matched by eye; every icon and frame is drawn here in CSS/SVG, nothing is copied from the game.
import { useState } from 'react';
import { expansionOf, levelLabel, type Log, type Progress, type TabPick } from '../model';
import { Pictogram } from '../shared';

/** Crafting-window style bar: recessed track, glossy fill. Blue "Quality" fill becomes green "Progress" at 100%. */
function Bar({ p, thin }: { p: Progress; thin?: boolean }) {
  return (
    <div className={`ve-bar ${thin ? 'thin' : ''} ${p.total && p.done === p.total ? 'full' : ''}`} role="progressbar" aria-valuemin={0} aria-valuemax={p.total} aria-valuenow={p.done}>
      <div style={{ width: `${p.pct * 100}%`, ['--h' as string]: 200 - 120 * p.pct }} />
    </div>
  );
}

export function VariantE({ log, confirm }: { log: Log; confirm: (t: string, b: string, ok: () => void) => void }) {
  const [mode, setMode] = useState<'list' | 'grid'>('list');
  const [charOpen, setCharOpen] = useState(false);

  const tabs: { k: TabPick; label: string }[] =
    log.expansion === 'all'
      ? []
      : [
          ...log.sections.filter((s) => s.expansionId === log.expansion).map((s) => ({ k: s.kind as TabPick, label: s.title })),
          { k: 'all', label: 'All' },
        ];

  const onRowKey = (k: React.KeyboardEvent, id: string) => {
    if (k.key === ' ' || k.key === 'Enter') { k.preventDefault(); log.toggleCompleted(id); }
    if (k.key.toLowerCase() === 'x') log.toggleNotInterested(id);
  };

  return (
    <div className="ve">
      <div className="ve-window">
        <header className="ve-title">
          <h1>Content Unlock Log</h1>
          <div className="ve-overall" title="Overall progress">
            <Bar p={log.overall} thin />
            <span className="ve-num">{log.overall.done}/{log.overall.total}</span>
          </div>
          <div className="ve-charwrap">
            <button className="ve-char" onClick={() => setCharOpen(!charOpen)} aria-expanded={charOpen}>
              <span className="lvl">Level {log.character.level}</span>
              <span className="name">{log.character.name}</span>
              <span className="world">({log.character.world})</span>
              <span className="caret">▾</span>
            </button>
            {charOpen && (
              <div className="ve-menu" role="menu">
                {log.characters.map((c) => {
                  const p = log.progressOfCharacter(c.id);
                  return (
                    <button key={c.id} role="menuitemradio" aria-checked={c.id === log.characterId} className={c.id === log.characterId ? 'on' : ''} onClick={() => { log.setCharacterId(c.id); setCharOpen(false); }}>
                      <span>{c.name} ({c.world})</span>
                      <small>Lv {c.level} · {p.done}/{p.total}</small>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </header>

        <div className="ve-body">
          <nav className="ve-rail" aria-label="Expansions">
            <button className={`ve-tile all ${log.expansion === 'all' ? 'on' : ''}`} onClick={() => log.setExpansion('all')} aria-pressed={log.expansion === 'all'} title={`All · ${log.overall.done}/${log.overall.total}`}>
              <Pictogram name="all" size={22} />
              <span className="ve-tile-label">All</span>
            </button>
            <div className="ve-rail-gap" />
            {log.expansions.map((x) => {
              const p = log.progressOfExpansion(x.id);
              return (
                <button key={x.id} className={`ve-tile ${log.expansion === x.id ? 'on' : ''}`} onClick={() => log.setExpansion(x.id)} aria-pressed={log.expansion === x.id} title={`${x.name} · Lv ${x.levels} · ${p.done}/${p.total}`}>
                  <Pictogram name={x.id} size={22} />
                  {p.done === p.total && <i className="ve-done">✓</i>}
                  <span className="ve-tile-label">{x.short}</span>
                  <span className="ve-tile-bar"><Bar p={p} thin /></span>
                </button>
              );
            })}
          </nav>

          <main className="ve-main">
            {tabs.length > 0 ? (
              <div className="ve-tabs" role="tablist">
                {tabs.map((t) => {
                  const p = log.progressOfTab(t.k);
                  return (
                    <button key={t.k} role="tab" aria-selected={log.tab === t.k} className={log.tab === t.k ? 'on' : ''} onClick={() => log.setTab(t.k)}>
                      <span>{t.label} <small>{p.done}/{p.total}</small></span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="ve-tabs single"><button className="on"><span>Every section <small>{log.overall.done}/{log.overall.total}</small></span></button></div>
            )}

            <div className="ve-scroll">
              <div className="ve-group-title">Filters</div>
              <div className="ve-options">
                <label className="ve-check">
                  <input type="checkbox" checked={log.hideCompleted} onChange={(e) => log.setHideCompleted(e.target.checked)} />
                  <span className="box" /> Hide completed entries.
                </label>
                <label className="ve-check">
                  <input type="checkbox" checked={log.hideNotInterested} onChange={(e) => log.setHideNotInterested(e.target.checked)} />
                  <span className="box" /> Hide entries marked not interested.
                </label>
              </div>

              {log.visibleSections.map((s) => {
                const p = log.progressOfSection(s);
                const shown = log.shownIn(s);
                const lvHead = s.kind === 'cap' ? 'iLvl' : 'Lv.';
                return (
                  <section key={s.id} className="ve-section">
                    <div className="ve-panel-head">
                      <h2>
                        {expansionOf(s).name} <span>{s.title}</span>
                      </h2>
                      <Bar p={p} />
                      <span className="ve-num">{p.done}/{p.total}</span>
                    </div>

                    {shown.length === 0 && <p className="ve-empty">All {log.entriesIn(s).length} entries in this section are hidden by the filters above.</p>}

                    {shown.length > 0 && mode === 'list' && (
                      <div className="ve-table" role="table">
                        <div className="ve-row ve-th" role="row">
                          <span />
                          <span>{lvHead}</span>
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
                            <div key={e.id} role="row" tabIndex={0} className={`ve-row ${st}`} onClick={() => log.toggleCompleted(e.id)} onKeyDown={(k) => onRowKey(k, e.id)}>
                              <span className="cb"><span className={`box ${st === 'completed' ? 'on' : ''}`} /></span>
                              <span data-l={lvHead} className="lv">{levelLabel(e, s)}</span>
                              <span data-l="Unlock" className="unlock">
                                <a href="#" onClick={(ev) => ev.stopPropagation()}>{e.unlock}</a>
                                {e.isNew && <em className="ve-new">NEW</em>}
                              </span>
                              <span data-l="Type" className="type"><span><i className={`ve-icon t-${e.type.replace(' ', '')}`}><Pictogram name={e.type} size={11} /></i>{e.type}</span></span>
                              <span data-l="Quest">{e.quest}</span>
                              <span data-l="Location">{e.location}</span>
                              <span data-l="Notes" className="notes">{e.notes ?? ''}</span>
                              <button className={`ve-ni ${st === 'notInterested' ? 'on' : ''}`} title="Not interested (X)" aria-pressed={st === 'notInterested'} onClick={(ev) => { ev.stopPropagation(); log.toggleNotInterested(e.id); }}>
                                <span className="dot" /><span className="lbl">Not interested</span>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {shown.length > 0 && mode === 'grid' && (
                      <div className="ve-grid">
                        {shown.map((e) => {
                          const st = log.status(e.id);
                          return (
                            <div key={e.id} tabIndex={0} role="checkbox" aria-checked={st === 'completed'} className={`ve-card ${st}`} onClick={() => log.toggleCompleted(e.id)} onKeyDown={(k) => onRowKey(k, e.id)} title={`${e.quest} · ${e.location}${e.notes ? ' · ' + e.notes : ''}`}>
                              <i className={`ve-icon big t-${e.type.replace(' ', '')}`}><Pictogram name={e.type} size={22} /></i>
                              <span className="txt">
                                <b>{e.unlock}{e.isNew && <em className="ve-new">NEW</em>}</b>
                                <small>{lvHead} {levelLabel(e, s)} · {e.type}</small>
                              </span>
                              <span className="cardcb"><span className={`box ${st === 'completed' ? 'on' : ''}`} /></span>
                              <button className={`ve-ni ${st === 'notInterested' ? 'on' : ''}`} title="Not interested (X)" aria-pressed={st === 'notInterested'} onClick={(ev) => { ev.stopPropagation(); log.toggleNotInterested(e.id); }}>
                                <span className="dot" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </section>
                );
              })}
              <p className="ve-credit">Patch 7.4 · Data from the community wiki · Unofficial fan tool</p>
            </div>
          </main>
        </div>

        <div className="ve-hintbar">
          <span className="ve-help">?</span>
          <span className="hint">Click an entry to mark it completed. Press X for not interested.</span>
          <span className="ve-display">
            <span className="ve-display-label">Display Mode</span>
            <button className={mode === 'list' ? 'on' : ''} aria-pressed={mode === 'list'} onClick={() => setMode('list')} title="List">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden="true"><path d="M1 2h2v2H1zM5 2h8v2H5zM1 6h2v2H1zM5 6h8v2H5zM1 10h2v2H1zM5 10h8v2H5z" /></svg>
            </button>
            <button className={mode === 'grid' ? 'on' : ''} aria-pressed={mode === 'grid'} onClick={() => setMode('grid')} title="Cards">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden="true"><path d="M1 1h5v5H1zM8 1h5v5H8zM1 8h5v5H1zM8 8h5v5H8z" /></svg>
            </button>
          </span>
        </div>

        <footer className="ve-foot">
          <button disabled={!log.toClear.length} onClick={() => confirm('Clear Shown', `Clear the status of ${log.toClear.length} shown entries?`, log.clearShown)}>
            Clear Shown
          </button>
          <span className="ve-chev" aria-hidden="true">︾</span>
          <button disabled={!log.toComplete.length} onClick={() => confirm('Complete Shown', `Mark ${log.toComplete.length} shown entries as completed?`, log.completeShown)}>
            Complete Shown
          </button>
        </footer>
      </div>
    </div>
  );
}
