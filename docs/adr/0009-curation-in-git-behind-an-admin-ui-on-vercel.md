# Curation stays in git, behind an admin UI on Vercel

The app, its content releases and an admin web UI for the Curator are all served from one Vercel project, and the GitHub Pages deploy is retired. The repo becomes private.

The admin UI is a front end over the curation pull request, not a store of its own. The decisions file, the expansions file, the committed release and its icons stay in the repo. The UI shows the report, commits the Curator's decisions to the curation branch, and merges, and merging still publishes. Git history stays the record of every release's decisions, and reverting a merge stays the way to roll back.

## Consequences

- The hosting bar becomes: free (Vercel Hobby), no always-on server (serverless functions only), and nothing to maintain beyond dependency updates.
- The Curator now has to sign in, and the backend holds secrets, including the credentials it uses to commit and merge.
- On a free GitHub account, rulesets don't apply to a private repo, so a ruleset on `main` no longer stops a merge while the curation check fails. Gating has to happen elsewhere, either in the admin UI or with a paid GitHub plan.
- The app fetches its releases from the same origin it is served from, as it did on Pages.

## Considered Options

- **A backend store (a database or Blob) as the store of record:** the UI would be free of git, but the decisions file, the PR report, the required check and "merging publishes" would all be rebuilt, and history and rollback with them.
- **Keep the app on Pages, with only the admin UI and backend on Vercel:** this keeps the existing deploy, but releases become a cross-origin fetch, and the repo has to stay public for free Pages.
- **No admin UI, with curation done through PR review alone:** this is what was decided first. It is still the fallback, since the UI only drives the same PR.
