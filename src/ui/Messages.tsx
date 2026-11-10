import { useEffect, useRef } from "react";
import { DialogBackdrop } from "./Dialog";

const TOAST_MS = 6000;

/** A brief message at the bottom of the window. */
export function Toast({
  message,
  onDismiss,
}: {
  /** Replaced by each new message; its `id` restarts the dismiss timer. */
  message: { id: number; text: string };
  onDismiss: () => void;
}) {
  const dismiss = useRef(onDismiss);
  dismiss.current = onDismiss;
  useEffect(() => {
    const timer = setTimeout(() => dismiss.current(), TOAST_MS);
    return () => clearTimeout(timer);
  }, [message.id]);

  return (
    <div className="toast" role="status">
      <span>{message.text}</span>
    </div>
  );
}

/** Asks the player to confirm a bulk change, stating what it will do. */
export function ConfirmDialog({
  title,
  text,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  title: string;
  text: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  useEffect(() => cancelRef.current?.focus(), []);
  return (
    <DialogBackdrop onClose={onCancel}>
      <div
        className="dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        aria-describedby="dialog-text"
      >
        <h2 id="dialog-title">{title}</h2>
        <p id="dialog-text">{text}</p>
        <div className="dialog-buttons">
          <button type="button" ref={cancelRef} onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="primary" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </DialogBackdrop>
  );
}
