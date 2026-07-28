import type { ReactNode } from "react";

export function Modal({ open, onClose, title, children, footer }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 animate-fade-in" onClick={onClose}>
      <div className="glass-card w-full max-w-lg bg-navy-900 p-6 animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-100">{title}</h3>
          <button aria-label="Close" onClick={onClose} className="text-slate-400 hover:text-slate-100 text-xl leading-none">&times;</button>
        </div>
        <div>{children}</div>
        {footer && <div className="mt-6 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open, title, message, confirmLabel = "Confirm", danger, onConfirm, onCancel,
}: { open: boolean; title: string; message: string; confirmLabel?: string; danger?: boolean; onConfirm: () => void; onCancel: () => void }) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      footer={
        <>
          <button className="btn-secondary" onClick={onCancel}>Cancel</button>
          <button className={danger ? "btn-danger" : "btn-primary"} onClick={onConfirm}>{confirmLabel}</button>
        </>
      }
    >
      <p className="text-sm text-slate-300">{message}</p>
    </Modal>
  );
}
