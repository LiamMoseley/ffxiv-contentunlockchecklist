// PROTOTYPE: four UI variations of the Content Unlock Log main window, switchable via ?variant=A|B|C|D.
import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { useLog } from './model';
import { PrototypeSwitcher, Toast, useConfirm } from './shared';
import { VariantA } from './variants/A-config-window';
import { VariantB } from './variants/B-ledger';
import { VariantC } from './variants/C-quest-board';
import { VariantD } from './variants/D-split-pane';
import './shared.css';
import './variants/A.css';
import './variants/B.css';
import './variants/C.css';
import './variants/D.css';

const variants = [
  { key: 'A', name: 'Config window', C: VariantA },
  { key: 'B', name: 'Ledger', C: VariantB },
  { key: 'C', name: 'Quest board', C: VariantC },
  { key: 'D', name: 'Split pane', C: VariantD },
];

function App() {
  const [key, setKey] = useState(() => new URLSearchParams(location.search).get('variant')?.toUpperCase() ?? 'A');
  const log = useLog();
  const confirm = useConfirm();
  const v = variants.find((x) => x.key === key) ?? variants[0];

  const change = (k: string) => {
    const url = new URL(location.href);
    url.searchParams.set('variant', k);
    history.replaceState(null, '', url);
    setKey(k);
  };

  return (
    <div className={`proto-root variant-${v.key}`}>
      <div className="proto-flag">PROTOTYPE · sample data · nothing is saved</div>
      <v.C log={log} confirm={confirm.ask} />
      {confirm.dialog}
      <Toast msg={log.toast} />
      <PrototypeSwitcher variants={variants} current={v.key} onChange={change} />
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
