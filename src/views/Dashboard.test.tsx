import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Dashboard } from './Dashboard';

const reservations = [
  {
    id: 'res-1',
    location_id: 'loc-1',
    room_id: 'room-1',
    start_at: '2026-05-12T12:00:00.000Z',
    end_at: '2026-05-12T13:00:00.000Z',
    responsible: 'Ana Silva',
    coffee: false,
    attendees: null,
    description: null,
    created_by_user_id: 'user-1',
    created_by_email: 'qa@aurum.test',
    created_at: '2026-05-12T00:00:00.000Z',
    updated_at: '2026-05-12T00:00:00.000Z',
    location_name: 'Matriz',
    room_name: 'Sala Norte'
  },
  {
    id: 'res-2',
    location_id: 'loc-1',
    room_id: 'room-1',
    start_at: '2026-05-12T14:00:00.000Z',
    end_at: '2026-05-12T15:00:00.000Z',
    responsible: 'Bia Souza',
    coffee: false,
    attendees: null,
    description: null,
    created_by_user_id: 'user-1',
    created_by_email: 'qa@aurum.test',
    created_at: '2026-05-12T00:00:00.000Z',
    updated_at: '2026-05-12T00:00:00.000Z',
    location_name: 'Matriz',
    room_name: 'Sala Norte'
  }
];

function renderDashboard() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <Dashboard
        session={{
          csrfToken: 'csrf-token',
          expiresAt: null,
          user: { id: 'user-1', email: 'qa@aurum.test' }
        }}
        onLogout={vi.fn()}
      />
    </QueryClientProvider>
  );
}

describe('Dashboard reservation bulk delete', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = new URL(String(input), 'http://localhost');
        if (url.pathname === '/api/reservations' && (!init || init.method === 'GET')) {
          return Response.json(reservations);
        }
        if (url.pathname === '/api/locations') {
          return Response.json([{ id: 'loc-1', name: 'Matriz', address: null, created_at: '2026-05-12T00:00:00.000Z' }]);
        }
        if (url.pathname === '/api/rooms') {
          return Response.json([{ id: 'room-1', location_id: 'loc-1', name: 'Sala Norte', capacity: 10, created_at: '2026-05-12T00:00:00.000Z' }]);
        }
        if (url.pathname === '/api/reservations/bulk-delete') {
          return Response.json({ deleted: 2 });
        }
        return Response.json({ message: 'Não encontrado.' }, { status: 404 });
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('requires explicit confirmation before deleting selected reservations hidden by the filter', async () => {
    renderDashboard();

    await screen.findByText('Ana Silva');
    await userEvent.click(screen.getByLabelText('Selecionar reserva de Ana Silva'));
    await userEvent.click(screen.getByLabelText('Selecionar reserva de Bia Souza'));
    await userEvent.type(screen.getByLabelText('Buscar reservas'), 'Ana');
    await userEvent.click(screen.getByRole('button', { name: 'Excluir 2' }));

    const confirmButton = screen.getByRole('button', { name: 'Excluir', exact: true });
    expect(confirmButton).toBeDisabled();

    await userEvent.click(screen.getByLabelText('Também excluir 1 reservas ocultas pelo filtro atual.'));

    expect(confirmButton).toBeEnabled();
    await userEvent.click(confirmButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/reservations/bulk-delete',
        expect.objectContaining({
          body: JSON.stringify({ ids: ['res-1', 'res-2'] })
        })
      );
    });
  });
});
