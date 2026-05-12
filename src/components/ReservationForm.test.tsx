import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ReservationForm } from './ReservationForm';

const locations = [{ id: 'loc-1', name: 'Matriz', address: 'Rua 1', created_at: '2026-05-12T00:00:00.000Z' }];
const rooms = [{ id: 'room-1', location_id: 'loc-1', name: 'Sala Norte', capacity: 3, created_at: '2026-05-12T00:00:00.000Z' }];

describe('ReservationForm', () => {
  it('limits coffee attendees by selected room capacity and clears quantity when coffee is disabled', async () => {
    render(
      <ReservationForm
        locations={locations}
        rooms={rooms}
        onCancel={vi.fn()}
        onSubmit={vi.fn()}
      />
    );

    await userEvent.selectOptions(screen.getByLabelText('Local / filial'), 'loc-1');
    await userEvent.selectOptions(screen.getByLabelText('Sala'), 'room-1');
    await userEvent.click(screen.getByRole('checkbox', { name: 'Café' }));

    const attendees = screen.getByLabelText(/Quantidade de pessoas/);
    await userEvent.clear(attendees);
    await userEvent.type(attendees, '9');

    expect(attendees).toHaveValue(3);

    await userEvent.click(screen.getByRole('checkbox', { name: 'Café' }));

    expect(attendees).toHaveValue(null);
  });

  it('traps focus inside the reservation dialog', async () => {
    const user = userEvent.setup();
    render(
      <ReservationForm
        locations={locations}
        rooms={rooms}
        onCancel={vi.fn()}
        onSubmit={vi.fn()}
      />
    );

    expect(screen.getByLabelText('Local / filial')).toHaveFocus();

    await user.tab({ shift: true });
    expect(screen.getByRole('button', { name: 'Fechar' })).toHaveFocus();

    await user.tab({ shift: true });
    expect(screen.getByRole('button', { name: 'Salvar' })).toHaveFocus();
  });
});
