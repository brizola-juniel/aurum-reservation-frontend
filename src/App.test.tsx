import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { App } from './App';

function renderApp() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  );
}

describe('App authentication flow', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.endsWith('/api/auth/session')) {
          return Response.json({ message: 'Sessão expirada.' }, { status: 401 });
        }
        if (url.endsWith('/api/auth/login')) {
          return Response.json({
            expiresAt: new Date(Date.now() + 60_000).toISOString(),
            csrfToken: 'csrf-token',
            user: { id: 'user-1', email: 'dev@aurum.test' }
          });
        }
        if (url.endsWith('/api/reservations')) {
          return Response.json([]);
        }
        if (url.endsWith('/api/locations')) {
          return Response.json([]);
        }
        if (url.endsWith('/api/rooms')) {
          return Response.json([]);
        }
        return Response.json({}, { status: 404 });
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('keeps JWT out of browser storage and renders reservations screen after login', async () => {
    renderApp();

    await userEvent.type(await screen.findByLabelText('E-mail'), 'dev@aurum.test');
    await userEvent.type(screen.getByLabelText('Senha'), 'StrongPass123!');
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByRole('heading', { name: 'Reservas de salas' })).toBeInTheDocument();
    expect(window.localStorage.getItem('aurum-reservation-session')).toBeNull();
  });

  it('shows a user-facing message when session verification fails unexpectedly', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.mocked(fetch).mockImplementationOnce(async () => Response.json({ message: 'upstream down' }, { status: 503 }));

    renderApp();

    expect(await screen.findByText('Não foi possível verificar sua sessão. Tente entrar novamente.')).toBeInTheDocument();
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
