"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

// A styled confirm step in place of the browser's confirm(): a modal <dialog>, so focus stays
// inside it, Escape closes it and screen readers announce it, with the page's own look. A tap on
// the dimmed backdrop cancels too.
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  danger = false,
  busy = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  /** A destructive action (delete): the confirm button is red. */
  danger?: boolean;
  /** The action is running: both buttons wait. */
  busy?: boolean;
  /** Runs inside the tap, so it may copy to the clipboard (Safari refuses a copy after a wait). */
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    else if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      // Escape fires "cancel": the parent closes it, so its state and the dialog agree.
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onCancel();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onCancel();
      }}
      className="m-auto w-[min(26rem,calc(100vw-2rem))] rounded-xl border border-line bg-panel p-0 text-ink shadow-[0_18px_40px_-18px_rgba(0,0,0,0.45)] backdrop:bg-black/40"
    >
      <div className="flex flex-col gap-3 p-4">
        <h2 id={titleId} className="font-display text-base font-bold text-ink">
          {title}
        </h2>
        <div className="text-sm leading-relaxed text-ink-soft">{children}</div>
        <div className="flex flex-wrap justify-end gap-2 pt-1">
          <button
            type="button"
            // A delete starts on Cancel, so a stray Enter doesn't delete.
            autoFocus={danger}
            onClick={onCancel}
            disabled={busy}
            className="inline-flex min-h-10 items-center rounded border border-line bg-bg px-4 text-sm font-semibold text-ink hover:border-accent disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="button"
            autoFocus={!danger}
            onClick={onConfirm}
            disabled={busy}
            className={
              "inline-flex min-h-10 items-center rounded border px-4 text-sm font-semibold hover:opacity-90 disabled:opacity-60 " +
              (danger ? "border-danger bg-danger text-bg" : "border-accent bg-accent text-bg")
            }
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
