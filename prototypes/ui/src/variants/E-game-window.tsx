// PROTOTYPE Variant E, "Game window": Variant A refined against the user's reference screenshots of the
// game's Character/System Configuration, Actions & Traits and crafting windows. The window chrome is drawn
// in CSS; the icons inside the cells are the wiki's own icons, hotlinked for the prototype.
import { useState } from 'react';
import type { Entry } from '../data';
import { expansionOf, levelLabel, type Log, type Progress, type Status, type TabPick } from '../model';
import { Pictogram } from '../shared';

/** Crafting-window style bar: recessed track, glossy fill running from blue towards yellow-green. */
function Bar({ p, thin }: { p: Progress; thin?: boolean }) {
  return (
    <div className={`ve-bar ${thin ? 'thin' : ''}`} role="progressbar" aria-valuemin={0} aria-valuemax={p.total} aria-valuenow={p.done}>
      <div style={{ width: `${p.pct * 100}%`, ['--h' as string]: 200 - 120 * p.pct }} />
    </div>
  );
}

function WikiIcon({ src, size = 20 }: { src?: string; size?: number }) {
  return src ? <img className="ve-wiki" src={src} width={size} height={size} alt="" loading="lazy" referrerPolicy="no-referrer" /> : null;
}

/** A link to the wiki. Clicking it must not change the row's status. */
function WikiLink({ children }: { children: React.ReactNode }) {
  return <a className="ve-link" href="#" onClick={(ev) => ev.stopPropagation()}>{children}</a>;
}

/** Location: the wiki links the zone, not the coordinates. */
function Location({ text }: { text: string }) {
  const i = text.search(/\s*\(x/i);
  return i < 0 ? <WikiLink>{text}</WikiLink> : <><WikiLink>{text.slice(0, i)}</WikiLink>{text.slice(i)}</>;
}

/** Plain text with the given phrases turned into wiki links, as the wiki does in its Information column. */
function Linked({ text, phrases = [] }: { text: string; phrases?: string[] }) {
  const parts: React.ReactNode[] = [];
  let rest = text;
  for (const ph of phrases) {
    const i = rest.indexOf(ph);
    if (i < 0) continue;
    parts.push(rest.slice(0, i), <WikiLink key={ph}>{ph}</WikiLink>);
    rest = rest.slice(i + ph.length);
  }
  parts.push(rest);
  return <>{parts}</>;
}

const statusWord: Record<Status, string> = { unmarked: 'Unmarked', completed: 'Completed', notInterested: 'Not interested' };

/** Tri-state tick-box: empty → yellow (Completed) → grey with a stroke (Not interested). */
function StatusBox({ st }: { st: Status }) {
  return <span className={`box ${st}`} aria-hidden="true" />;
}

export function VariantE({ log, confirm }: { log: Log; confirm: (t: string, b: string, ok: () => void) => void }) {
  const [mode, setMode] = useState<'list' | 'grid'>('list');
  const [charOpen, setCharOpen] = useState(false);
  const [railCollapsed, setRailCollapsed] = useState(false);

  const tabs: { k: TabPick; label: string }[] =
    log.expansion === 'all'
      ? []
      : [
          ...log.sections.filter((s) => s.expansionId === log.expansion).map((s) => ({ k: s.kind as TabPick, label: s.title })),
          { k: 'all', label: 'All' },
        ];

  const onKey = (k: React.KeyboardEvent, id: string) => {
    if (k.key === ' ' || k.key === 'Enter') { k.preventDefault(); log.cycleStatus(id); }
    if (k.key.toLowerCase() === 'x') log.toggleNotInterested(id);
  };
  const rowProps = (e: Entry) => {
    const st = log.status(e.id);
    return {
      tabIndex: 0,
      role: 'checkbox' as const,
      'aria-checked': st === 'completed' ? (true as const) : st === 'notInterested' ? ('mixed' as const) : (false as const),
      'aria-label': `${e.unlock}: ${statusWord[st]}`,
      onClick: () => log.cycleStatus(e.id),
      onKeyDown: (k: React.KeyboardEvent) => onKey(k, e.id),
    };
  };

  return (
    <div className="ve">
      <div className="ve-window">
        <header className="ve-title">
          <h1>Content Unlock Log</h1>
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

        <div className={`ve-body ${railCollapsed ? 'collapsed' : ''}`}>
          <nav className="ve-rail" aria-label="Expansions">
            <button className={`ve-navitem all ${log.expansion === 'all' ? 'on' : ''}`} onClick={() => log.setExpansion('all')} aria-pressed={log.expansion === 'all'} title={railCollapsed ? `All · ${log.overall.done}/${log.overall.total}` : undefined}>
              <span className="ve-tile"><Pictogram name="all" size={26} /></span>
              <span className="ve-nav-text">
                <span className="nm">All</span>
                <span className="sub">Every expansion</span>
                <span className="prog"><Bar p={log.overall} thin /><span className="ve-num sm">{log.overall.done}/{log.overall.total}</span></span>
              </span>
            </button>
            <div className="ve-rail-gap" />
            {log.expansions.map((x) => {
              const p = log.progressOfExpansion(x.id);
              const done = p.done === p.total;
              return (
                <button key={x.id} className={`ve-navitem ${log.expansion === x.id ? 'on' : ''}`} onClick={() => log.setExpansion(x.id)} aria-pressed={log.expansion === x.id} title={railCollapsed ? `${x.name} · Level ${x.levels} · ${p.done}/${p.total}` : undefined}>
                  <span className="ve-tile">
                    <Pictogram name={x.id} size={26} />
                    {done && <i className="ve-done">✓</i>}
                  </span>
                  <span className="ve-nav-text">
                    <span className="nm"><span className="long">{x.name}</span><span className="short">{x.short}</span></span>
                    <span className="sub">Level {x.levels}{done ? ' · Complete' : ''}</span>
                    <span className="prog"><Bar p={p} thin /><span className="ve-num sm">{p.done}/{p.total}</span></span>
                  </span>
                </button>
              );
            })}
            <button className="ve-collapse" onClick={() => setRailCollapsed(!railCollapsed)} aria-expanded={!railCollapsed} aria-label={railCollapsed ? 'Expand expansion list' : 'Collapse expansion list'} title={railCollapsed ? 'Expand' : 'Collapse'}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
                {railCollapsed ? <path d="M2 1l5 5-5 5V1zm4 0l5 5-5 5V1z" /> : <path d="M10 1L5 6l5 5V1zM6 1L1 6l5 5V1z" />}
              </svg>
            </button>
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
                const lvHead = s.kind === 'cap' ? 'iLevel' : 'Level';
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
                          <span>Information</span>
                        </div>
                        {shown.map((e) => {
                          const st = log.status(e.id);
                          return (
                            <div key={e.id} className={`ve-row ${st}`} {...rowProps(e)}>
                              <span className="cb"><StatusBox st={st} /></span>
                              <span data-l={lvHead} className="lv">
                                <span>
                                  {levelLabel(e)}
                                  {e.itemLevel && <small> · iLevel {e.itemLevel}</small>}
                                </span>
                              </span>
                              <span data-l="Unlock" className="unlock">
                                <WikiIcon src={e.unlockIcon} />
                                <WikiLink>{e.unlock}</WikiLink>
                                {e.isNew && <em className="ve-new">NEW</em>}
                              </span>
                              <span data-l="Type" className="type">
                                <span>
                                  <WikiIcon src={e.typeIcon} />
                                  {e.type === 'Job Unlock' ? <><WikiLink>Job</WikiLink>&nbsp;Unlock</> : <WikiLink>{e.type}</WikiLink>}
                                </span>
                              </span>
                              <span data-l="Quest" className="quest">
                                {e.quest ? <span><WikiIcon src={e.questIcon} /><WikiLink>{e.quest}</WikiLink></span> : <span className="none">—</span>}
                              </span>
                              <span data-l="Location"><span><Location text={e.location} /></span></span>
                              <span data-l="Information" className={`notes ${e.notes ? '' : 'empty'}`}>
                                <span>{e.noteIcons?.map((src, i) => <WikiIcon key={i} src={src} size={16} />)}<Linked text={e.notes ?? ''} phrases={e.noteLinks} /></span>
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {shown.length > 0 && mode === 'grid' && (
                      <div className="ve-grid">
                        {shown.map((e) => {
                          const st = log.status(e.id);
                          const big = e.unlockIcon ?? e.typeIcon;
                          return (
                            <div key={e.id} className={`ve-card ${st}`} title={`${e.quest ?? ''} · ${e.location}${e.notes ? ' · ' + e.notes : ''}`} {...rowProps(e)}>
                              <span className="ve-card-icon">{big ? <WikiIcon src={big} size={36} /> : <Pictogram name={e.type} size={22} />}</span>
                              <span className="txt">
                                <b>{e.unlock}{e.isNew && <em className="ve-new">NEW</em>}</b>
                                <small>{s.kind === 'cap' ? 'iLv.' : 'Lv.'} {levelLabel(e)} · {e.type}</small>
                              </span>
                              <span className="cardcb"><StatusBox st={st} /></span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </section>
                );
              })}
              <p className="ve-credit">Data and icons from the community wiki · Unofficial fan tool</p>
            </div>
          </main>
        </div>

        <div className="ve-hintbar">
          <span className="ve-help">?</span>
          <span className="hint">
            Click an entry to change its status:
            <span className="legend"><StatusBox st="unmarked" /> Unmarked</span>
            <span className="legend"><StatusBox st="completed" /> Completed</span>
            <span className="legend"><StatusBox st="notInterested" /> Not interested</span>
          </span>
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
