import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

/** Browser and runtime globals the Log core must reach only through its injected adapters. */
const ADAPTER_GLOBALS = ["window", "document", "localStorage", "sessionStorage", "navigator", "location", "fetch"].map(
  (name) => ({ name, message: "The Log core uses no browser APIs: go through an injected adapter." }),
);

export default tseslint.config(
  { ignores: ["dist", "node_modules"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: { globals: globals.browser },
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["**/log/*"], message: "Import the Log core from its index (`../log`), not its internals." },
          ],
        },
      ],
    },
  },
  {
    // The Log core: no React, no browser APIs, and no dependency on the UI or adapters (PRD, ADR-0002).
    files: ["src/log/**/*.ts"],
    ignores: ["src/log/**/*.test.ts", "src/log/test/**"],
    rules: {
      "no-restricted-globals": ["error", ...ADAPTER_GLOBALS],
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["react", "react-dom", "react/*", "react-dom/*"], message: "The Log core has no React." },
            { group: ["**/ui", "**/ui/*"], message: "The Log core does not depend on the UI." },
            { group: ["**/adapters", "**/adapters/*"], message: "The Log core receives adapters; it never imports them." },
          ],
        },
      ],
    },
  },
  {
    // Tests drive the Log core with the in-memory adapters, but still without React or browser APIs.
    files: ["src/log/**/*.test.ts", "src/log/test/**"],
    rules: {
      "no-restricted-globals": ["error", ...ADAPTER_GLOBALS],
      "no-restricted-imports": [
        "error",
        { patterns: [{ group: ["react", "react-dom", "react/*", "react-dom/*", "**/ui", "**/ui/*"], message: "Tests drive the Log core, not the UI." }] },
      ],
    },
  },
  {
    files: ["scripts/**/*.ts", "*.config.{js,ts}"],
    languageOptions: { globals: globals.node },
  },
);
