import { useEffect, useRef, useState, type KeyboardEvent } from "react";

const FOCUSABLE = 'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Keyboard behaviour of a modal dialog: Tab and Shift+Tab stay inside it, and closing it puts focus back on
 * whatever had it when it opened. Pass the returned handler as the `onKeyDown` of the dialog's backdrop.
 */
export function useModal() {
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
