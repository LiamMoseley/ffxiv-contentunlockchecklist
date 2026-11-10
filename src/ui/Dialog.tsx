import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

const FOCUSABLE = 'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Keyboard behaviour of a modal dialog: Tab and Shift+Tab stay inside it, and closing it puts focus back on
 * whatever had it when it opened. Pass the returned handler as the `onKeyDown` of the dialog's backdrop.
 */
function useModal() {
  // Read while rendering: an `autoFocus` inside the dialog has already moved focus by the time effects run.
  const [opener] = useState(() => document.activeElement);
  const open = useRef(false);
  useEffect(() => {
    open.current = true;
    return () => {
      open.current = false;
      // Deferred, so React's dev-mode mount-unmount-mount of effects does not take focus out of the dialog.
      setTimeout(() => {
        if (!open.current && opener instanceof HTMLElement) opener.focus();
      });
    };
  }, [opener]);

  return (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== "Tab") return;
    const items = [...event.currentTarget.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
      (el) => !el.hasAttribute("disabled") && el.getClientRects().length > 0,
    );
    const first = items[0];
    const last = items[items.length - 1];
    if (!first || !last) return;
    const active = document.activeElement;
    if (!(active instanceof Node) || !event.currentTarget.contains(active)) {
      event.preventDefault();
      first.focus();
    } else if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  };
}

/**
 * The shell every dialog shares: the dimmed backdrop, the focus trap, and Escape. The dialog itself (its own
 * `role`, labels and buttons) is the child. `onClose` is what Escape does; `closeOnBackdropClick` also makes a
 * click outside the dialog do it.
 */
export function DialogBackdrop({
  onClose,
  closeOnBackdropClick = false,
  children,
}: {
  onClose: () => void;
  closeOnBackdropClick?: boolean;
  children: ReactNode;
}) {
  const trapTab = useModal();
  return (
    <div
      className="dialog-backdrop"
      onClick={(event) => {
        if (closeOnBackdropClick && event.target === event.currentTarget) onClose();
      }}
      onKeyDown={(event) => {
        trapTab(event);
        if (event.key === "Escape") onClose();
      }}
    >
      {children}
    </div>
  );
}
