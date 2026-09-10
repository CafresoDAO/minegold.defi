import { type RefObject, useEffect, useRef } from "react";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

type Options = {
  /** Whether the dialog is currently shown. No listeners are attached while false. */
  open: boolean;
  /** Called when the user presses Escape. */
  onClose: () => void;
  /** The element with role="dialog". Give it tabIndex={-1} so it can take
   *  focus itself when it holds no focusable controls. */
  containerRef: RefObject<HTMLElement | null>;
};

const getFocusable = (root: HTMLElement | null): HTMLElement[] =>
  root
    ? Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
    : [];

/**
 * Minimal modal keyboard behaviour, shared by every dialog:
 *  - Escape calls onClose (document-level listener, so it works wherever focus is)
 *  - initial focus moves into the dialog on open (first control, else the container)
 *  - Tab / Shift+Tab cycle within the dialog's focusable controls
 *  - focus returns to the previously focused element when the dialog closes
 */
export function useDialogA11y({ open, onClose, containerRef }: Options): void {
  // Read the latest onClose from the listener without re-subscribing on every render.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const container = containerRef.current;
    const previouslyFocused =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    const initial = getFocusable(container)[0] ?? container;
    initial?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab" || !container) return;
      const items = getFocusable(container);
      if (items.length === 0) {
        e.preventDefault();
        container.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      const inside = active instanceof Node && container.contains(active);
      if (e.shiftKey) {
        if (!inside || active === first) {
          e.preventDefault();
          last.focus();
        }
      } else if (!inside || active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      if (previouslyFocused?.isConnected) previouslyFocused.focus();
    };
  }, [open, containerRef]);
}
