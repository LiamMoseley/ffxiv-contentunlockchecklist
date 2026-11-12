import { useEffect, useRef } from "react";
import { helpContent, type HelpContent } from "../log";
import { DialogBackdrop } from "./Dialog";
import { StatusBox, STATUS_LABEL } from "./EntryList";

function HelpTopics({ topics }: { topics: HelpContent["topics"] }) {
  return topics.map((topic) => (
    <section key={topic.title}>
      <h3>{topic.title}</h3>
      <p>{topic.text}</p>
    </section>
  ));
}

/** How to use the app: the controls, the three status boxes and Undo. The words come from the Log core. */
export function HelpDialog({ onClose }: { onClose: () => void }) {
  const help = helpContent();
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => closeRef.current?.focus(), []);
  return (
    <DialogBackdrop onClose={onClose} closeOnBackdropClick>
      <div className="dialog help-dialog" role="dialog" aria-modal="true" aria-labelledby="help-title">
        <h2 id="help-title">How to use this app</h2>
        {/* Columns on a wide screen: how to give input, what the boxes, Undo and filters do, and how characters, levels and tiles work. */}
        <div className="help-body">
          <div className="help-column" aria-label="Controls" role="group">
            {help.controls.map((group) => (
              <section key={group.title}>
                <h3>{group.title}</h3>
                <dl>
                  {group.items.map((item) => (
                    <div key={item.keys}>
                      <dt>{item.keys}</dt>
                      <dd>{item.does}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            ))}
          </div>
          <div className="help-column" aria-label="Status boxes, Undo and filters" role="group">
            <section>
              <h3>Status boxes</h3>
              <dl>
                {help.statusBoxes.map((box) => (
                  <div key={box.status}>
                    <dt>
                      <StatusBox status={box.status} /> {STATUS_LABEL[box.status]}
                    </dt>
                    <dd>{box.meaning}</dd>
                  </div>
                ))}
              </dl>
            </section>
            <section>
              <h3>Undo</h3>
              <p>{help.undo}</p>
            </section>
            <HelpTopics topics={help.topics.filter((topic) => topic.group === "view")} />
          </div>
          <div className="help-column" aria-label="Characters, levels and expansion tiles" role="group">
            <HelpTopics topics={help.topics.filter((topic) => topic.group === "setup")} />
          </div>
        </div>
        <div className="dialog-buttons">
          <button type="button" ref={closeRef} onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </DialogBackdrop>
  );
}
