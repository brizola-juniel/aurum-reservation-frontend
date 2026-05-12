import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ConfirmDialog } from './ConfirmDialog';

describe('ConfirmDialog', () => {
  it('traps keyboard focus and closes on Escape', async () => {
    const onCancel = vi.fn();
    const user = userEvent.setup();

    render(
      <>
        <button type="button">Fora do modal</button>
        <ConfirmDialog
          title="Excluir reserva"
          message="Confirme a exclusão."
          confirmLabel="Excluir"
          onCancel={onCancel}
          onConfirm={vi.fn()}
        />
      </>
    );

    expect(screen.getByRole('button', { name: 'Excluir' })).toHaveFocus();

    await user.tab();
    expect(screen.getByRole('button', { name: 'Fechar' })).toHaveFocus();

    await user.tab({ shift: true });
    expect(screen.getByRole('button', { name: 'Excluir' })).toHaveFocus();

    await user.keyboard('{Escape}');
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
