# Issue tracker: GitHub

Issues and specs for this repo live as GitHub issues. Use the `gh` CLI for all operations.

## Conventions

- **Read an issue**: `gh issue view <number> --json number,title,body,labels,comments`. Plain `gh issue view <number>` (with or without `--comments`) prints nothing on this machine, so always pass `--json`.
- **Create an issue**: `gh issue create --title "..." --body "..."`. Use a heredoc for multi-line bodies.
- **List issues**: `gh issue list --state open --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'` with appropriate `--label` and `--state` filters.
- **Make an issue a sub-issue of a parent**: `gh issue create --parent <parent> ...`, or `gh issue edit <parent> --add-sub-issue <child>` afterwards (`gh` 2.94+). Older `gh`: `gh api --method POST repos/<owner>/<repo>/issues/<parent>/sub_issues -F sub_issue_id=<child-db-id>` (database id, as in **Blocking** below). Without sub-issues, put `Part of #<parent>` at the top of the child body.
- **Comment on an issue**: `gh issue comment <number> --body "..."`
- **Apply / remove labels**: `gh issue edit <number> --add-label "..."` / `--remove-label "..."`
- **Close**: `gh issue close <number> --comment "..."`

Infer the repo from `git remote -v`; `gh` does this automatically when run inside a clone.

`gh` reads work from both Bash and PowerShell (checked on gh 2.102). In PowerShell, backticks and `\"` inside a double-quoted `--body` break parsing: pass bodies with `--body-file` (written with the Write tool into the session's scratchpad directory, never the repo, so `git add -A` can't commit it) or a single-quoted string.

## Before implementing

A `ready-for-human` ticket asks for the owner's decision, so read its comments first. If a decision is missing, ask the owner (one question per undecided item) and build only what they answer. A ticket with its decisions recorded is implemented as usual.

**Read every ticket with `comments` in the `--json` list, and read them again before `/code-review` and before opening the PR.** The owner answers a ticket's **Open for the owner** item as a comment, often mid-session (#98: the glyph choice, an image link, arrived after the placeholder was built, verified and sent to review). A fetch of `title,body,labels` alone misses it.

The spec is `docs/prd.md`; issue #1 is closed and keeps the first release's original text as history, so a change to a story or Implementation Decision edits the PRD only. Edit an issue body with `node scripts/issue-body.mjs get <n> <file>`, the Edit tool on the file, then `set <n> <file>`, with the file in the scratchpad directory.

## Acceptance criteria

A ticket's `- [ ]` acceptance criteria are its definition of done, and the ticket body is the record of which ones were met. When implementing a ticket, after `/code-review`'s Spec axis has passed. The axis passes only when every "implemented but wrong" finding is fixed or shown to be false; list any finding left over in the PR body:

- Tick each criterion the branch demonstrably meets (a passing test, code you read, or a check you ran): `node scripts/issue-criteria.mjs tick <n> <criterion numbers, ranges such as 1-4 allowed, comma lists such as 1-4,7 too>|all`, numbering the `- [ ]` lines from 1. It changes the markers only, never a criterion's wording. `untick` puts criteria back, for one you ticked before checking it. Add a criterion the owner asks for with `node scripts/issue-criteria.mjs add <n> "<text>" [--ticked]`, and change one the owner has overruled with `reword <n> <criterion number> "<text>"`; never reword on your own. Add `--dry` to print the new body first.
- A PR body follows the `pr` skill's template, then adds **Needs owner check** and the review findings left over, in that order.
- **An owner follow-up that undoes part of an earlier one rewrites every place that described it.** #96's owner dropped the column headers' drop shadow, and the criterion, the PRD paragraph and a CSS comment all still said "shadow" until review found them. `grep` the old word across `docs/prd.md`, the ticket's criteria (`reword`) and `src/` comments in the same commit as the change.
- **A reversal also rewrites the ticket's Decisions section, and `reword` takes the number as it stands now.** #99's owner moved Update into the bar, then back to the footer: the criteria and PRD were rewritten, but the Decisions still said "the Update link scrolls" until the end. `add` shifts later numbers, and a `reword 12` after two `add`s replaced the wrong criterion: `reword` prints `Replacing criterion <n>: <old text>`, so read that line before moving on. `tick` leaves a **Needs owner check** criterion unticked.
- **An experiment the owner may drop is its own commits, with its criterion and PRD edit in them.** #97's pinned-heading celebration was three commits, and `git revert` of them removed its code and PRD text in one step. `issue-criteria.mjs` has no remove: delete the criterion with `issue-body.mjs get`, an Edit, then `set`.
- **Record an owner follow-up when it arrives.** A change the owner asks for that the ticket does not cover gets its `add --ticked` criterion and its PRD edit (plus `docs/prototypes/ui-verdict.md` when it changes the look) in the same step, before the commit that builds it, not at the end of the session.
- **Keep an open PR's body true.** After an owner follow-up changes behaviour on a branch with an open PR, rewrite the body's Summary and Evidence to match (`gh pr edit <n> --body-file <file>`), and name the new unreviewed commits under the review findings.
- Leave unticked anything only the owner can verify (how the UI looks against the prototype verdict, a live deploy, a repository setting), and list those under **Needs owner check** in the PR body, one `- [ ]` tick box per item so the owner can tick them in GitHub. The owner ticks them after checking. End your closing report to the owner with the same list, one line per criterion, so it reaches them outside the PR too.
- List any criterion the branch does not meet in the PR body, and leave it unticked.

## Before committing or pushing

Review before opening a PR too: if any commit on the branch postdates the last `/code-review` (owner follow-ups, UI tweaks made after the first review), run `/code-review` on those commits first. Only a commit that changes no behaviour (wording, formatting, a CSS tweak) may skip it, and you name it under the PR body's review findings. A commit that adds logic is reviewed again, with one stop: a commit that only fixes the findings of that review is not (the loop would never end) when `npm run check` passes and you checked the fix in the browser. Name it under the PR body's review findings.

Review again before updating a PR that has had follow-up changes from the owner: run `/code-review` on the new commits, since the first review covered only the first diff. Then check the branch's PR state: `gh pr list --head <branch> --state all --json number,state`. If the PR is `MERGED` or `CLOSED`, a push never reaches it: branch from a fresh `origin/main`, carry the new commits over and open a new PR.

## Repository settings

Read a setting's current state before telling the owner to change it: `gh api repos/<owner>/<repo>/pages` (Pages source and URL), `.../branches/main/protection`, `.../environments`. A 404 means the setting is off. Changing settings stays with the owner.

## Pull requests as a triage surface

**PRs as a request surface: no.** _(Set to `yes` if this repo treats external PRs as feature requests; `/triage` reads this flag.)_

When set to `yes`, PRs run through the same labels and states as issues, using the `gh pr` equivalents:

- **Read a PR**: `gh pr view <number> --comments` and `gh pr diff <number>` for the diff.
- **List external PRs for triage**: `gh api --paginate 'repos/{owner}/{repo}/pulls?state=open' --jq '.[] | select(.author_association | IN("OWNER","MEMBER","COLLABORATOR") | not) | {number, title, author: .user.login, author_association, labels: [.labels[].name]}'`.
- **Comment / label / close**: `gh pr comment`, `gh pr edit --add-label`/`--remove-label`, `gh pr close`.

GitHub shares one number space across issues and PRs, so a bare `#42` may be either: resolve with `gh pr view 42` and fall back to `gh issue view 42`.

## When a skill says "publish to the issue tracker"

Create a GitHub issue.

## When a skill says "fetch the relevant ticket"

Read it as in **Read an issue** above.

## Wayfinding operations

Used by `/wayfinder`. The **map** is a single issue with **child** issues as tickets.

- **Map**: a single issue labelled `wayfinder:map`, holding the Notes / Decisions-so-far / Fog body. `gh issue create --label wayfinder:map`.
- **Child ticket**: an issue linked to the map as a GitHub sub-issue (see **Make an issue a sub-issue of a parent**). Where sub-issues aren't enabled, add the child to a task list in the map body and put `Part of #<map>` at the top of the child body. Labels: `wayfinder:<type>` (`research`/`prototype`/`grilling`/`task`). Once claimed, the ticket is assigned to the driving dev.
- **Blocking**: GitHub's **native issue dependencies**, the canonical, UI-visible representation. Add an edge with `gh api --method POST repos/<owner>/<repo>/issues/<child>/dependencies/blocked_by -F issue_id=<blocker-db-id>`, where `<blocker-db-id>` is the blocker's numeric **database id** (`gh api repos/<owner>/<repo>/issues/<n> --jq .id`, _not_ the `#number` or `node_id`). GitHub reports `issue_dependencies_summary.blocked_by` (open blockers only, the live gate). Where dependencies aren't available, fall back to a `Blocked by: #<n>, #<n>` line at the top of the child body. A ticket is unblocked when every blocker is closed.
- **Frontier query**: list the map's open children (`gh issue list --state open`, scoped to the map's sub-issues / task list), drop any with an open blocker (`issue_dependencies_summary.blocked_by > 0`, or an open issue in the `Blocked by` line) or an assignee; first in map order wins.
- **Claim**: `gh issue edit <n> --add-assignee @me`, the session's first write.
- **Resolve**: `gh issue comment <n> --body "<answer>"`, then `gh issue close <n>`, then append a context pointer (gist + link) to the map's Decisions-so-far.
