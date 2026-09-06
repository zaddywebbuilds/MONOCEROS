"use client";

import * as React from "react";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/**
 * Accessible dialog built on the native <dialog> element: focus trapping,
 * Escape-to-close and inert background come from the platform rather than a
 * hand-rolled implementation.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  const ref = React.useRef<HTMLDialogElement>(null);

  React.useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  React.useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const handleCancel = (event: Event) => {
      event.preventDefault();
      onClose();
    };
    dialog.addEventListener("cancel", handleCancel);
    return () => dialog.removeEventListener("cancel", handleCancel);
  }, [onClose]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="modal-title"
      className={cn(
        "w-[calc(100vw-2rem)] rounded-2xl border border-ink-600 bg-ink-880 p-0 text-fg shadow-[0_40px_80px_-30px_rgba(0,0,0,0.95)] backdrop:bg-ink-950/80 backdrop:backdrop-blur-sm",
        size === "sm" && "max-w-sm",
        size === "md" && "max-w-lg",
        size === "lg" && "max-w-2xl",
      )}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
    >
      <div className="flex items-start justify-between gap-4 border-b border-ink-700/70 p-5">
        <div>
          <h2 id="modal-title" className="text-base font-semibold tracking-tight">
            {title}
          </h2>
          {description ? (
            <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">{description}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close dialog"
          className="rounded-lg p-1.5 text-fg-subtle transition-colors hover:bg-ink-800 hover:text-fg"
        >
          <X className="size-4" />
        </button>
      </div>
      {children ? <div className="max-h-[65vh] overflow-y-auto p-5">{children}</div> : null}
      {footer ? (
        <div className="flex flex-wrap justify-end gap-3 border-t border-ink-700/70 p-5">
          {footer}
        </div>
      ) : null}
    </dialog>
  );
}

/**
 * Confirmation wrapper for destructive or irreversible admin actions.
 * The confirm button is disabled until the operator ticks the acknowledgement,
 * which is also submitted to the server as `confirmed`.
 */
export function ConfirmDialog({
  open,
  onClose,
  title,
  description,
  confirmLabel = "Confirm",
  tone = "primary",
  children,
  formId,
  pending,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  tone?: "primary" | "danger";
  children?: React.ReactNode;
  formId: string;
  pending?: boolean;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      footer={
        <>
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            form={formId}
            size="sm"
            variant={tone === "danger" ? "danger" : "primary"}
            disabled={pending}
          >
            {pending ? "Working…" : confirmLabel}
          </Button>
        </>
      }
    >
      {children}
    </Modal>
  );
}
