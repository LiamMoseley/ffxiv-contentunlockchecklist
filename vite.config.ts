import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { serviceWorker } from "./scripts/serviceWorkerPlugin.ts";

export default defineConfig({
  base: "./",
  plugins: [react(), serviceWorker()],
  // Windows file events are sometimes missed, leaving the dev server serving stale CSS.
  server: { watch: { usePolling: true, interval: 300 } },
});
