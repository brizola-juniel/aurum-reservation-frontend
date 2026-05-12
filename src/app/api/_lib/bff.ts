import { randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

import type { AuthResponse, AuthSession } from '../../../api/types';

const REFRESH_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

const authApiUrl = process.env.AUTH_API_INTERNAL_URL ?? 'http://localhost:5000';
const reservationApiUrl = process.env.RESERVATION_API_INTERNAL_URL ?? 'http://localhost:8000';
const secureCookies = process.env.BFF_COOKIE_SECURE === 'true';
const cookiePrefix = secureCookies ? '__Host-' : '';
const ACCESS_COOKIE = `${cookiePrefix}aurum_access`;
const REFRESH_COOKIE = `${cookiePrefix}aurum_refresh`;
const CSRF_COOKIE = `${cookiePrefix}aurum_csrf`;

type UpstreamRequest = {
  path: string;
  method: string;
  body?: string;
  csrfRequired?: boolean;
};

function cookieOptions(httpOnly: boolean, maxAge?: number) {
  return {
    httpOnly,
    secure: secureCookies,
    sameSite: 'lax' as const,
    path: '/',
    ...(maxAge === undefined ? {} : { maxAge })
  };
}

function createCsrfToken() {
  return randomBytes(32).toString('base64url');
}

function toSession(payload: AuthResponse, csrfToken: string): AuthSession {
  return {
    user: payload.user,
    expiresAt: payload.expiresAt,
    csrfToken
  };
}

function jsonError(message: string, status: number) {
  return NextResponse.json({ message }, { status });
}

export function setSessionCookies(response: NextResponse, payload: AuthResponse, csrfToken = createCsrfToken()) {
  response.cookies.set(ACCESS_COOKIE, payload.accessToken, cookieOptions(true));
  response.cookies.set(REFRESH_COOKIE, payload.refreshToken, cookieOptions(true, REFRESH_MAX_AGE_SECONDS));
  response.cookies.set(CSRF_COOKIE, csrfToken, cookieOptions(false, REFRESH_MAX_AGE_SECONDS));
}

export function clearSessionCookies(response: NextResponse) {
  response.cookies.set(ACCESS_COOKIE, '', cookieOptions(true, 0));
  response.cookies.set(REFRESH_COOKIE, '', cookieOptions(true, 0));
  response.cookies.set(CSRF_COOKIE, '', cookieOptions(false, 0));
}

export function validateCsrf(request: NextRequest): NextResponse | null {
  const csrfCookie = request.cookies.get(CSRF_COOKIE)?.value;
  const csrfHeader = request.headers.get('x-csrf-token');
  if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
    return jsonError('CSRF token inválido.', 403);
  }
  return null;
}

async function readBody(request: NextRequest) {
  if (request.method === 'GET' || request.method === 'HEAD') {
    return undefined;
  }
  const body = await request.text();
  return body.length > 0 ? body : undefined;
}

async function upstreamFetch(baseUrl: string, path: string, init: RequestInit) {
  return fetch(`${baseUrl}${path}`, {
    ...init,
    cache: 'no-store'
  });
}

async function refreshSession() {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get(REFRESH_COOKIE)?.value;
  if (!refreshToken) {
    return null;
  }

  const response = await upstreamFetch(authApiUrl, '/api/auth/refresh', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ refreshToken })
  });

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as AuthResponse;
}

async function proxyResponse(upstream: Response) {
  if (upstream.status === 204) {
    return new NextResponse(null, { status: 204 });
  }

  const contentType = upstream.headers.get('content-type') ?? 'application/json';
  const body = await upstream.text();
  return new NextResponse(body, {
    status: upstream.status,
    headers: {
      'content-type': contentType
    }
  });
}

export async function authenticate(request: NextRequest, upstreamPath: '/api/auth/login' | '/api/auth/register') {
  const body = await readBody(request);
  const init: RequestInit = {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    }
  };
  if (body !== undefined) {
    init.body = body;
  }

  const upstream = await upstreamFetch(authApiUrl, upstreamPath, init);

  if (!upstream.ok) {
    return proxyResponse(upstream);
  }

  const payload = (await upstream.json()) as AuthResponse;
  const csrfToken = createCsrfToken();
  const response = NextResponse.json(toSession(payload, csrfToken), { status: upstream.status });
  setSessionCookies(response, payload, csrfToken);
  return response;
}

export async function logout(request: NextRequest) {
  const csrfError = validateCsrf(request);
  if (csrfError) {
    return csrfError;
  }

  const response = NextResponse.json({ ok: true });
  clearSessionCookies(response);
  return response;
}

export async function session() {
  const cookieStore = await cookies();
  let accessToken = cookieStore.get(ACCESS_COOKIE)?.value ?? null;
  let refreshed: AuthResponse | null = null;

  if (!accessToken) {
    refreshed = await refreshSession();
    accessToken = refreshed?.accessToken ?? null;
  }

  if (!accessToken) {
    return jsonError('Sessão expirada.', 401);
  }

  let upstream = await upstreamFetch(authApiUrl, '/api/auth/me', {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (upstream.status === 401) {
    refreshed = await refreshSession();
    if (!refreshed) {
      const response = jsonError('Sessão expirada.', 401);
      clearSessionCookies(response);
      return response;
    }
    accessToken = refreshed.accessToken;
    upstream = await upstreamFetch(authApiUrl, '/api/auth/me', {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`
      }
    });
  }

  if (!upstream.ok) {
    return proxyResponse(upstream);
  }

  const user = (await upstream.json()) as AuthSession['user'];
  const csrfToken = cookieStore.get(CSRF_COOKIE)?.value ?? createCsrfToken();
  const payload: AuthSession = {
    user,
    expiresAt: refreshed?.expiresAt ?? null,
    csrfToken
  };
  const response = NextResponse.json(payload);
  response.cookies.set(CSRF_COOKIE, csrfToken, cookieOptions(false, REFRESH_MAX_AGE_SECONDS));
  if (refreshed) {
    setSessionCookies(response, refreshed, csrfToken);
  }
  return response;
}

export async function proxyReservation(request: NextRequest, upstream: UpstreamRequest) {
  if (upstream.csrfRequired) {
    const csrfError = validateCsrf(request);
    if (csrfError) {
      return csrfError;
    }
  }

  const cookieStore = await cookies();
  let accessToken = cookieStore.get(ACCESS_COOKIE)?.value;
  let refreshed: AuthResponse | null = null;
  if (!accessToken) {
    refreshed = await refreshSession();
    if (!refreshed) {
      return jsonError('Sessão expirada.', 401);
    }
    accessToken = refreshed.accessToken;
  }

  const upstreamHeaders = {
    Accept: 'application/json',
    ...(upstream.body === undefined ? {} : { 'Content-Type': 'application/json' }),
    Authorization: `Bearer ${accessToken}`
  };
  const init: RequestInit = {
    method: upstream.method,
    headers: upstreamHeaders
  };
  if (upstream.body !== undefined) {
    init.body = upstream.body;
  }

  let response = await upstreamFetch(reservationApiUrl, upstream.path, init);
  if (response.status === 401) {
    refreshed = await refreshSession();
    if (!refreshed) {
      const expired = jsonError('Sessão expirada.', 401);
      clearSessionCookies(expired);
      return expired;
    }
    response = await upstreamFetch(reservationApiUrl, upstream.path, {
      ...init,
      headers: {
        ...upstreamHeaders,
        Authorization: `Bearer ${refreshed.accessToken}`
      }
    });
  }

  const proxied = await proxyResponse(response);
  if (refreshed) {
    const csrfToken = request.cookies.get(CSRF_COOKIE)?.value ?? createCsrfToken();
    setSessionCookies(proxied, refreshed, csrfToken);
  }
  return proxied;
}

export async function proxyReservationRequest(
  request: NextRequest,
  path: string,
  options: { csrfRequired?: boolean } = {}
) {
  const query = request.nextUrl.search;
  const body = await readBody(request);
  return proxyReservation(request, {
    path: `${path}${query}`,
    method: request.method,
    csrfRequired: options.csrfRequired ?? !['GET', 'HEAD', 'OPTIONS'].includes(request.method),
    ...(body === undefined ? {} : { body })
  });
}
