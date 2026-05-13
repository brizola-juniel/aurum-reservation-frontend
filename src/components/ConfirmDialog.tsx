'use client';

import { AlertTriangle, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Button, IconButton } from './ui';
import { useDialogFocusTrap } from './useDialogFocusTrap';

type ConfirmDialogProps = {
  checkboxLabel?: string | undefined;
  checkboxRequired?: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  pending?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmDialog({
  checkboxLabel,
  checkboxRequired = false,
  title,
  message,
  confirmLabel,
  pending = false,
  onCancel,
  onConfirm
}: ConfirmDialogProps) {
  const [checked, setChecked] = useState(false);
  const dialogRef = useRef<HTMLElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  const canConfirm = !pending && (!checkboxRequired || checked);

  useDialogFocusTrap(dialogRef, onCancel);

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusTarget = checkboxRequired ? cancelButtonRef.current : confirmButtonRef.current;
    focusTarget?.focus();

    return () => {
      previousFocus?.focus();
    };
  }, [checkboxRequired]);

  return (
    <div className="fixed inset-0 z-20 grid place-items-center bg-aurum-text/40 p-5" role="presentation">
      <section
        ref={dialogRef}
        className="relative grid w-full max-w-[440px] gap-3.5 rounded-lg bg-white p-[26px] shadow-aurum-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-message"
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
        <p className="m-0 leading-[1.45] text-aurum-muted" id="confirm-message">
          {message}
        </p>
        {checkboxLabel ? (
          <label className="flex items-start gap-2.5 rounded-md border border-aurum-border bg-aurum-soft p-3 text-sm font-bold text-aurum-text">
            <input
              className="mt-0.5 h-[18px] min-h-[18px] w-[18px] accent-aurum-primary"
              type="checkbox"
              checked={checked}
              onChange={(event) => setChecked(event.target.checked)}
            />
            <span>{checkboxLabel}</span>
          </label>
        ) : null}
        <div className="pointer-events-none mt-2 flex items-center justify-end gap-2.5 max-[520px]:grid max-[520px]:grid-cols-1">
          <Button ref={cancelButtonRef} variant="secondary" mobileFullWidth onClick={onCancel}>
            Cancelar
          </Button>
          <Button ref={confirmButtonRef} variant="danger" mobileFullWidth onClick={onConfirm} disabled={!canConfirm}>
            {pending ? 'Excluindo...' : confirmLabel}
          </Button>
        </div>
      </section>
    </div>
  );
}
