'use client';

import { AlertTriangle, X } from 'lucide-react';

import { Button, IconButton } from './ui';

type ConfirmDialogProps = {
  title: string;
  message: string;
  confirmLabel: string;
  pending?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  pending = false,
  onCancel,
  onConfirm
}: ConfirmDialogProps) {
  return (
    <div className="fixed inset-0 z-20 grid place-items-center bg-aurum-text/40 p-5" role="presentation">
      <section
        className="relative grid w-full max-w-[440px] gap-3.5 rounded-lg bg-white p-[26px] shadow-aurum-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
      >
        <IconButton className="absolute right-3.5 top-3.5" variant="soft" onClick={onCancel} aria-label="Fechar">
          <X size={18} aria-hidden="true" />
        </IconButton>
        <div className="grid h-11 w-11 place-items-center rounded-lg bg-aurum-danger-soft text-aurum-danger">
          <AlertTriangle size={22} aria-hidden="true" />
        </div>
        <h2 className="m-0 text-[1.08rem] font-bold tracking-normal text-aurum-text" id="confirm-title">
          {title}
        </h2>
        <p className="m-0 leading-[1.45] text-aurum-muted">{message}</p>
        <div className="pointer-events-none mt-2 flex items-center justify-end gap-2.5 max-[520px]:grid max-[520px]:grid-cols-1">
          <Button variant="secondary" mobileFullWidth onClick={onCancel}>
            Cancelar
          </Button>
          <Button variant="danger" mobileFullWidth onClick={onConfirm} disabled={pending}>
            {pending ? 'Excluindo...' : confirmLabel}
          </Button>
        </div>
      </section>
    </div>
  );
}
