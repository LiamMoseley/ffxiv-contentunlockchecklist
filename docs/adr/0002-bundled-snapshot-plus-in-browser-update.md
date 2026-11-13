# Bundled content snapshot plus in-browser update

Superseded in part by ADR-0005: a device applies the content release with the higher release number, not the copy with the higher wiki revision.

The app is a static site. A build script fetches and parses the wiki's Content Unlock page and bundles the result, so the app works offline from its first load. The same parser also runs in the browser for the player's Update action and the automatic update check, which is possible because the wiki's MediaWiki API allows cross-origin requests (`origin=*`). Refreshing the bundled snapshot for a new patch is one script run.

## Consequences

- A device keeps whichever copy of the content has the higher wiki revision. A redeployed bundle that is newer than the device's copy is offered as a reviewable update, like one fetched from the wiki, never applied silently.
- Level bands the app does not recognise (a new expansion) appear under a placeholder expansion named by its levels until the app is redeployed with the real name.
- The automatic check compares wiki revision IDs at most every 6 hours, and only raises a notice when the parsed entries differ.
- A service worker keeps the app working offline. `scripts/serviceWorkerPlugin.ts` writes `dist/sw.js` from `scripts/sw.template.js` at build time, listing every built file and versioning the cache by their hash. Icons that only appear after an in-browser update come from the wiki without a referrer (it rejects requests that carry one) and are kept in a cache that outlives deploys.

## Considered Options

- **Fetch the wiki on every load:** no offline first load, and every visit depends on the wiki being up.
- **Bundled snapshot only:** players would wait for a redeploy after each patch, and US-20/US-21 would be impossible.
