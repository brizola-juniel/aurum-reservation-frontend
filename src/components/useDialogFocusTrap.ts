'use client';

import { useEffect } from 'react';
import type { RefObject } from 'react';

const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(',');

export function useDialogFocusTrap<TElement extends HTMLElement>(
  containerRef: RefObject<TElement | null>,
  onEscape: () => void
) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const container = containerRef.current;
      if (!container) {
        return;
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        onEscape();
        return;
      }

      if (event.key !== 'Tab') {
        return;
      }

      const focusable = Array.from(container.querySelectorAll<HTMLElement>(focusableSelector)).filter(
        (element) => !element.hasAttribute('disabled') && element.tabIndex !== -1
      );
      if (focusable.length === 0) {
        event.preventDefault();
        container.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) {
        return;
      }
      const active = document.activeElement;

      if (event.shiftKey && (!active || active === first || !container.contains(active))) {
        event.preventDefault();
        last.focus();
        return;
      }

      if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [containerRef, onEscape]);
}
