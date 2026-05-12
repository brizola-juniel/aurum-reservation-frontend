'use client';

import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { ApiError, authApi } from './api/client';
import type { AuthSession } from './api/types';
import { AuthPage } from './views/AuthPage';
import { Dashboard } from './views/Dashboard';
import type { Session } from './state/session';

export function App() {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);

  useEffect(() => {
    let active = true;
    authApi
      .session()
      .then((currentSession) => {
        if (active) {
          setSession(currentSession);
        }
      })
      .catch((error) => {
        if (!(error instanceof ApiError && error.status === 401)) {
          console.error(error);
        }
      })
      .finally(() => {
        if (active) {
          setSessionChecked(true);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const handleAuthenticated = (response: AuthSession) => {
    setSession(response);
  };

  const handleLogout = async () => {
    if (session?.csrfToken) {
      try {
        await authApi.logout(session.csrfToken);
      } catch {
        // Local session cleanup must still happen if the server session is already gone.
      }
    }
    setSession(null);
    queryClient.clear();
  };

  if (!sessionChecked) {
    return (
      <main className="grid min-h-screen place-items-center bg-aurum-page p-6 text-sm font-semibold text-aurum-muted">
        Carregando sessão...
      </main>
    );
  }

  if (!session) {
    return <AuthPage onAuthenticated={handleAuthenticated} />;
  }

  return <Dashboard session={session} onLogout={handleLogout} />;
}
