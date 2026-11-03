import { useReducer } from "react";
import type { EntryStatus, Log } from "../log";

const STATUS_LABEL: Record<EntryStatus, string> = {
  unmarked: "Unmarked",
  completed: "Completed",
  notInterested: "Not interested",
};

const STATUS_MARK: Record<EntryStatus, string> = {
  unmarked: "☐",
  completed: "☑",
  notInterested: "⊘",
};

export function App({ log }: { log: Log }) {
  // The Log core holds all state; re-render after each command.
  const [, refresh] = useReducer((n: number) => n + 1, 0);
  const expansions = new Map(log.expansions().map((e) => [e.id, e]));

  return (
    <main>
      <h1>Content Unlock Log</h1>
      {log.sections().map((section) => {
        const { completed, total } = log.sectionProgress(section.id);
        return (
          <section key={section.id}>
            <h2>
              {expansions.get(section.expansionId)?.name} · {section.heading} ({completed}/{total})
            </h2>
            <table>
              <thead>
                <tr>
                  <th>Status</th>
                  <th>{section.kind === "levelCap" ? "Item level" : "Level"}</th>
                  <th>Unlock</th>
                  <th>Type</th>
                  <th>Quest</th>
                  <th>Location</th>
                  <th>Information</th>
                </tr>
              </thead>
              <tbody>
                {section.entries.map((entry) => {
                  const status = log.entryStatus(entry.id);
                  return (
                    <tr key={entry.id}>
                      <td>
                        <button
                          type="button"
                          aria-label={`${entry.unlock}: ${STATUS_LABEL[status]}`}
                          title={STATUS_LABEL[status]}
                          onClick={() => {
                            log.cycleEntryStatus(entry.id);
                            refresh();
                          }}
                        >
                          {STATUS_MARK[status]}
                        </button>
                      </td>
                      <td>{section.kind === "levelCap" ? entry.itemLevel : entry.level}</td>
                      <td>{entry.unlock}</td>
                      <td>{entry.type}</td>
                      <td style={{ whiteSpace: "pre-line" }}>{entry.quest}</td>
                      <td>{entry.location}</td>
                      <td>{entry.information}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        );
      })}
      <footer>
        Content from the{" "}
        <a href="https://ffxiv.consolegameswiki.com/wiki/Content_Unlock">Content Unlock page</a> of the
        community FFXIV wiki. An unofficial personal tool.
      </footer>
    </main>
  );
}
