import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserStorage } from "./adapters/browserStorage";
import { systemClock } from "./adapters/systemClock";
import { fetchContentUnlockPage } from "./adapters/wikiSource";
import bundledContent from "./content/bundled-content.json";
import { createLog, type Content } from "./log";
import { App } from "./ui/App";
import "./ui/app.css";

const storage = createBrowserStorage();
const log = createLog({
  content: bundledContent as Content,
  storage,
  clock: systemClock,
  wiki: { fetchPage: () => fetchContentUnlockPage() },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App log={log} preferences={storage} />
  </StrictMode>,
);
