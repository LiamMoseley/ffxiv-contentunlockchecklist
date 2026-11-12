import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserStorage } from "./adapters/browserStorage";
import { registerServiceWorker } from "./adapters/offline";
import { systemClock } from "./adapters/systemClock";
import { fetchContentUnlockPage, fetchContentUnlockRevisionId } from "./adapters/wikiSource";
import bundledContent from "./content/bundled-content.json";
import { createLog, type Content } from "./log";
import { App } from "./ui/App";
import { BundledIconContext } from "./ui/EntryList";
import { PrototypeSwitcher } from "./ui/prototype/PrototypeSwitcher";
import "./ui/app.css";

registerServiceWorker();
const storage = createBrowserStorage();
const log = createLog({
  content: bundledContent as Content,
  storage,
  clock: systemClock,
  wiki: { fetchPage: () => fetchContentUnlockPage(), fetchRevisionId: () => fetchContentUnlockRevisionId() },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BundledIconContext.Provider value={log.isBundledIcon}>
      <App log={log} preferences={storage} />
    </BundledIconContext.Provider>
    {import.meta.env.DEV && <PrototypeSwitcher />}
  </StrictMode>,
);
