import * as Dialog from "@radix-ui/react-dialog";

export function ConfirmDialog({ open, onOpenChange, title, description, confirmLabel = "Confirm", onConfirm, danger = false }) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50 data-[state=open]:animate-in data-[state=open]:fade-in" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[90vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white p-6 shadow-xl dark:bg-slate-900">
          <Dialog.Title className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</Dialog.Title>
          {description && <Dialog.Description className="mt-2 text-sm text-slate-600 dark:text-slate-400">{description}</Dialog.Description>}
          <div className="mt-6 flex justify-end gap-2">
            <Dialog.Close asChild>
              <button className="btn-secondary">Cancel</button>
            </Dialog.Close>
            <button
              className={danger ? "btn-danger" : "btn-primary"}
              onClick={() => {
                onConfirm?.();
                onOpenChange?.(false);
              }}
            >
              {confirmLabel}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
