import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserStorage } from "./adapters/browserStorage";
import { systemClock } from "./adapters/systemClock";
import bundledContent from "./content/bundled-content.json";
import { createLog, type Content } from "./log";
import { App } from "./ui/App";
import "./ui/app.css";

const log = createLog({
  content: bundledContent as Content,
  storage: createBrowserStorage(),
  clock: systemClock,
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App log={log} />
  </StrictMode>,
);
