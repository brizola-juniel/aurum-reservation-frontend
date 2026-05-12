import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ResourceManager } from './ResourceManager';

const locations = [{ id: 'loc-1', name: 'Matriz', address: 'Rua 1', created_at: '2026-05-12T00:00:00.000Z' }];
const rooms = [{ id: 'room-1', location_id: 'loc-1', name: 'Sala Norte', capacity: 10, created_at: '2026-05-12T00:00:00.000Z' }];

describe('ResourceManager', () => {
  it('updates locations and rooms through the edit controls', async () => {
    const onUpdateLocation = vi.fn(async () => undefined);
    const onUpdateRoom = vi.fn(async () => undefined);

    render(
      <ResourceManager
        locations={locations}
        rooms={rooms}
        onCreateLocation={vi.fn(async () => undefined)}
        onUpdateLocation={onUpdateLocation}
        onRequestDeleteLocation={vi.fn()}
        onCreateRoom={vi.fn(async () => undefined)}
        onUpdateRoom={onUpdateRoom}
        onRequestDeleteRoom={vi.fn()}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: 'Editar Matriz' }));
    const locationEditor = screen.getByRole('button', { name: 'Salvar Matriz' }).closest('form');
    expect(locationEditor).not.toBeNull();
    await userEvent.clear(within(locationEditor as HTMLElement).getByLabelText('Nome'));
    await userEvent.type(within(locationEditor as HTMLElement).getByLabelText('Nome'), 'Matriz Centro');
    await userEvent.clear(within(locationEditor as HTMLElement).getByLabelText('Endereço'));
    await userEvent.type(within(locationEditor as HTMLElement).getByLabelText('Endereço'), 'Av. Brasil');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar Matriz' }));

    expect(onUpdateLocation).toHaveBeenCalledWith('loc-1', { name: 'Matriz Centro', address: 'Av. Brasil' });

    await userEvent.click(screen.getByRole('button', { name: 'Editar Sala Norte' }));
    const roomEditor = screen.getByRole('button', { name: 'Salvar Sala Norte' }).closest('form');
    expect(roomEditor).not.toBeNull();
    await userEvent.clear(within(roomEditor as HTMLElement).getByLabelText('Nome'));
    await userEvent.type(within(roomEditor as HTMLElement).getByLabelText('Nome'), 'Sala Sul');
    await userEvent.clear(within(roomEditor as HTMLElement).getByLabelText('Capacidade'));
    await userEvent.type(within(roomEditor as HTMLElement).getByLabelText('Capacidade'), '18');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar Sala Norte' }));

    expect(onUpdateRoom).toHaveBeenCalledWith('room-1', {
      location_id: 'loc-1',
      name: 'Sala Sul',
      capacity: 18
    });
  });

  it('moves focus into and back from inline editors', async () => {
    render(
      <ResourceManager
        locations={locations}
        rooms={rooms}
        onCreateLocation={vi.fn(async () => undefined)}
        onUpdateLocation={vi.fn(async () => undefined)}
        onRequestDeleteLocation={vi.fn()}
        onCreateRoom={vi.fn(async () => undefined)}
        onUpdateRoom={vi.fn(async () => undefined)}
        onRequestDeleteRoom={vi.fn()}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: 'Editar Matriz' }));
    const locationEditor = screen.getByRole('button', { name: 'Salvar Matriz' }).closest('form');
    expect(locationEditor).not.toBeNull();
    expect(within(locationEditor as HTMLElement).getByLabelText('Nome')).toHaveFocus();

    await userEvent.click(screen.getByRole('button', { name: 'Cancelar edição de Matriz' }));
    expect(screen.getByRole('button', { name: 'Editar Matriz' })).toHaveFocus();

    await userEvent.click(screen.getByRole('button', { name: 'Editar Sala Norte' }));
    const roomEditor = screen.getByRole('button', { name: 'Salvar Sala Norte' }).closest('form');
    expect(roomEditor).not.toBeNull();
    expect(within(roomEditor as HTMLElement).getByLabelText('Nome')).toHaveFocus();
  });
});
