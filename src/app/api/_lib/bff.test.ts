import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cookies } from 'next/headers';

import type { AuthResponse } from '../../../api/types';

vi.mock('next/headers', () => ({
  cookies: vi.fn()
}));

const authPayload: AuthResponse = {
  accessToken: 'access-secret',
  refreshToken: 'refresh-secret',
  expiresAt: '2031-05-12T12:00:00.000Z',
  user: {
    id: 'user-1',
    email: 'qa@aurum.test'
  }
};

function mockCookieStore(values: Record<string, string | undefined>) {
  vi.mocked(cookies).mockResolvedValue({
    get: (name: string) => {
      const value = values[name];
      return value === undefined ? undefined : { name, value };
    }
  } as Awaited<ReturnType<typeof cookies>>);
}

async function loadBff() {
  vi.resetModules();
  vi.stubEnv('AUTH_API_INTERNAL_URL', 'http://auth.internal');
  vi.stubEnv('RESERVATION_API_INTERNAL_URL', 'http://reservation.internal');
  vi.stubEnv('BFF_COOKIE_SECURE', 'false');
  return import('./bff');
}

describe('BFF contract', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    mockCookieStore({});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('stores auth tokens in HttpOnly cookies and does not expose them in login JSON', async () => {
    const { authenticate } = await loadBff();
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(Response.json(authPayload, { status: 200 }));

    const request = new NextRequest('http://frontend.local/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'qa@aurum.test', password: 'StrongPass123!' })
    });

    const response = await authenticate(request, '/api/auth/login');
    const json = await response.json();

    expect(fetchMock).toHaveBeenCalledWith(
      'http://auth.internal/api/auth/login',
      expect.objectContaining({
        cache: 'no-store',
        method: 'POST',
        body: JSON.stringify({ email: 'qa@aurum.test', password: 'StrongPass123!' })
      })
    );
    expect(json).toEqual({
      expiresAt: authPayload.expiresAt,
      csrfToken: expect.any(String),
      user: authPayload.user
    });
    expect(json).not.toHaveProperty('accessToken');
    expect(json).not.toHaveProperty('refreshToken');

    expect(response.cookies.get('aurum_access')).toMatchObject({
      value: 'access-secret',
      httpOnly: true,
      sameSite: 'lax'
    });
    expect(response.cookies.get('aurum_refresh')).toMatchObject({
      value: 'refresh-secret',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7
    });
    expect(response.cookies.get('aurum_csrf')).toMatchObject({
      value: json.csrfToken,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7
    });
    expect(response.cookies.get('aurum_csrf')?.httpOnly).not.toBe(true);
  });

  it('rejects mutating reservation requests without CSRF before proxying upstream', async () => {
    const { proxyReservationRequest } = await loadBff();
    const fetchMock = vi.mocked(fetch);
    mockCookieStore({ aurum_access: 'access-secret' });

    const request = new NextRequest('http://frontend.local/api/reservations', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ room_id: 'room-1' })
    });

    const response = await proxyReservationRequest(request, '/api/reservations');

    await expect(response.json()).resolves.toEqual({ message: 'CSRF token inválido.' });
    expect(response.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('proxies reservation mutations server-side with the access cookie as bearer token', async () => {
    const { proxyReservationRequest } = await loadBff();
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(Response.json({ id: 'res-1' }, { status: 201 }));
    mockCookieStore({ aurum_access: 'access-cookie' });

    const body = { room_id: 'room-1', responsible: 'Maria Silva' };
    const request = new NextRequest('http://frontend.local/api/reservations?room_id=room-1', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: 'aurum_access=access-cookie; aurum_csrf=csrf-cookie',
        'x-csrf-token': 'csrf-cookie'
      },
      body: JSON.stringify(body)
    });

    const response = await proxyReservationRequest(request, '/api/reservations');
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ id: 'res-1' });
    expect(fetchMock).toHaveBeenCalledWith(
      'http://reservation.internal/api/reservations?room_id=room-1',
      expect.objectContaining({
        cache: 'no-store',
        method: 'POST',
        body: JSON.stringify(body)
      })
    );
    expect(init.headers).toMatchObject({
      Accept: 'application/json',
      Authorization: 'Bearer access-cookie',
      'Content-Type': 'application/json'
    });
  });

  it('refreshes sessions server-side without returning rotated tokens in session JSON', async () => {
    const { session } = await loadBff();
    const fetchMock = vi.mocked(fetch);
    const refreshedPayload: AuthResponse = {
      ...authPayload,
      accessToken: 'rotated-access',
      refreshToken: 'rotated-refresh'
    };
    fetchMock
      .mockResolvedValueOnce(Response.json(refreshedPayload, { status: 200 }))
      .mockResolvedValueOnce(Response.json(authPayload.user, { status: 200 }));
    mockCookieStore({
      aurum_refresh: 'refresh-secret',
      aurum_csrf: 'csrf-cookie'
    });

    const response = await session();
    const json = await response.json();

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'http://auth.internal/api/auth/refresh',
      expect.objectContaining({
        cache: 'no-store',
        method: 'POST',
        body: JSON.stringify({ refreshToken: 'refresh-secret' })
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'http://auth.internal/api/auth/me',
      expect.objectContaining({
        cache: 'no-store',
        method: 'GET',
        headers: expect.objectContaining({
          Authorization: 'Bearer rotated-access'
        })
      })
    );
    expect(json).toEqual({
      csrfToken: 'csrf-cookie',
      expiresAt: refreshedPayload.expiresAt,
      user: authPayload.user
    });
    expect(json).not.toHaveProperty('accessToken');
    expect(json).not.toHaveProperty('refreshToken');
    expect(response.cookies.get('aurum_access')).toMatchObject({
      value: 'rotated-access',
      httpOnly: true
    });
    expect(response.cookies.get('aurum_refresh')).toMatchObject({
      value: 'rotated-refresh',
      httpOnly: true
    });
  });
});
