// PROTOTYPE Variant C, "Quest board": browsing-first and roomy.
// Expansions as wide banners with big progress, sections as large toggle tabs, entries as a card grid.
// The whole card toggles Completed (shown as a stamp); Not interested collapses the card to a thin strip.
import { barColor, expansionOf, levelLabel, type Log, type Progress, type TabPick } from '../model';
import { Pictogram } from '../shared';

function Bar({ p }: { p: Progress }) {
  return (
    <div className="vc-bar" role="progressbar" aria-valuemin={0} aria-valuemax={p.total} aria-valuenow={p.done}>
      <div style={{ width: `${p.pct * 100}%`, background: `linear-gradient(90deg, ${barColor(0)}, ${barColor(p.pct)})` }} />
    </div>
  );
}

export function VariantC({ log, confirm }: { log: Log; confirm: (t: string, b: string, ok: () => void) => void }) {
  return (
    <div className="vc">
      <header className="vc-head">
        <div>
          <h1>Content Unlock Log</h1>
          <p>Patch 7.4 · unofficial fan tool · data from the community wiki</p>
        </div>
        <div className="vc-chars" role="radiogroup" aria-label="Character">
          {log.characters.map((c) => {
            const p = log.progressOfCharacter(c.id);
            return (
              <button key={c.id} role="radio" aria-checked={c.id === log.characterId} className={c.id === log.characterId ? 'on' : ''} onClick={() => log.setCharacterId(c.id)}>
                <b>{c.name}</b> <span>({c.world})</span>
                <small>
                  Lv {c.level} · {Math.round(p.pct * 100)}%
                </small>
              </button>
            );
          })}
        </div>
      </header>

      <nav className="vc-banners" aria-label="Expansions">
        {log.expansions.map((x) => {
          const p = log.progressOfExpansion(x.id);
          return (
            <button key={x.id} className={`vc-banner ${log.expansion === x.id ? 'on' : ''}`} onClick={() => log.setExpansion(x.id)} aria-pressed={log.expansion === x.id}>
              <span className="mark">
                <Pictogram name={x.id} size={84} />
              </span>
              <span className="name long">{x.name}</span>
              <span className="name short">{x.short}</span>
              <span className="range">Level {x.levels}</span>
              <Bar p={p} />
              <span className="count">
                {p.done}/{p.total}
                {p.done === p.total && <b> · Complete</b>}
              </span>
            </button>
          );
        })}
        <button className={`vc-banner all ${log.expansion === 'all' ? 'on' : ''}`} onClick={() => log.setExpansion('all')} aria-pressed={log.expansion === 'all'}>
          <span className="mark">
            <Pictogram name="all" size={70} />
          </span>
          <span className="name">All</span>
          <span className="range">Every section</span>
          <Bar p={log.overall} />
          <span className="count">
            {log.overall.done}/{log.overall.total}
          </span>
        </button>
      </nav>

      <div className="vc-controls">
        {log.expansion !== 'all' && (
          <div className="vc-tabs" role="tablist">
            {(['levelling', 'cap', 'all'] as TabPick[]).map((k) => {
              const s = log.sections.find((x) => x.expansionId === log.expansion && x.kind === k);
              const p = log.progressOfTab(k);
              return (
                <button key={k} role="tab" aria-selected={log.tab === k} className={log.tab === k ? 'on' : ''} onClick={() => log.setTab(k)}>
                  <span>{s ? s.title : 'Both sections'}</span>
                  <small>
                    {p.done}/{p.total}
                  </small>
                </button>
              );
            })}
          </div>
        )}
        <div className="vc-toggles">
          <label>
            <input type="checkbox" checked={log.hideCompleted} onChange={(e) => log.setHideCompleted(e.target.checked)} /> Hide completed
          </label>
          <label>
            <input type="checkbox" checked={log.hideNotInterested} onChange={(e) => log.setHideNotInterested(e.target.checked)} /> Hide not interested
          </label>
        </div>
      </div>

      <main>
        {log.visibleSections.map((s) => {
          const p = log.progressOfSection(s);
          const shown = log.shownIn(s);
          return (
            <section key={s.id} className="vc-section">
              <div className="vc-sec-head">
                <h2>
                  {expansionOf(s).name}
                  <span>{s.title}</span>
                </h2>
                <div className="vc-sec-p">
                  <Bar p={p} />
                  <b>
                    {p.done}/{p.total}
                  </b>
                </div>
              </div>
              {shown.length === 0 && <p className="vc-empty">Nothing to show: every entry here is hidden by your filters.</p>}
              <div className="vc-grid">
                {shown.map((e) => {
                  const st = log.status(e.id);
                  if (st === 'notInterested')
                    return (
                      <div key={e.id} className="vc-strip">
                        <span>⊘ {e.unlock}</span>
                        <button onClick={() => log.toggleNotInterested(e.id)}>Restore</button>
                      </div>
                    );
                  return (
                    <article
                      key={e.id}
                      className={`vc-card ${st}`}
                      tabIndex={0}
                      role="checkbox"
                      aria-checked={st === 'completed'}
                      onClick={() => log.toggleCompleted(e.id)}
                      onKeyDown={(k) => {
                        if (k.key === ' ' || k.key === 'Enter') { k.preventDefault(); log.toggleCompleted(e.id); }
                        if (k.key.toLowerCase() === 'x') log.toggleNotInterested(e.id);
                      }}
                    >
                      <div className="vc-card-top">
                        <span className="type">
                          <Pictogram name={e.type} size={14} /> {e.type}
                        </span>
                        <span className="lv">{s.kind === 'cap' ? (e.level !== '-' ? `iLvl ${e.level}` : 'Level cap') : `Lv ${levelLabel(e, s)}`}</span>
                      </div>
                      <h3>
                        {e.unlock}
                        {e.isNew && <em className="vc-new">NEW</em>}
                      </h3>
                      <dl>
                        <dt>Quest</dt>
                        <dd>{e.quest}</dd>
                        <dt>Where</dt>
                        <dd>{e.location}</dd>
                      </dl>
                      {e.notes && <p className={`notes ${e.optionalChallenge ? 'oc' : ''}`}>{e.notes}</p>}
                      <div className="vc-card-foot">
                        <span className="vc-tick">{st === 'completed' ? '✓ Completed' : 'Tap to complete'}</span>
                        <a href="#" onClick={(ev) => ev.stopPropagation()}>Wiki ↗</a>
                        <button onClick={(ev) => { ev.stopPropagation(); log.toggleNotInterested(e.id); }}>Not interested</button>
                      </div>
                      {st === 'completed' && <span className="vc-stamp">Completed</span>}
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })}
      </main>

      <footer className="vc-foot">
        <button disabled={!log.toComplete.length} onClick={() => confirm('Complete Shown', `Mark ${log.toComplete.length} shown entries as completed?`, log.completeShown)}>
          Complete Shown ({log.toComplete.length})
        </button>
        <button disabled={!log.toClear.length} onClick={() => confirm('Clear Shown', `Clear the status of ${log.toClear.length} shown entries?`, log.clearShown)}>
          Clear Shown ({log.toClear.length})
        </button>
      </footer>
    </div>
  );
}
