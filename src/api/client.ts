import type {
  AuthSession,
  Location,
  LocationPayload,
  Reservation,
  ReservationPayload,
  Room,
  RoomPayload
} from './types';

type RequestOptions = {
  csrfToken?: string | null;
  body?: unknown;
};

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const commonErrorMessages: Record<number, string> = {
  400: 'Revise os dados informados e tente novamente.',
  401: 'Sessão expirada. Entre novamente para continuar.',
  403: 'Ação não autorizada ou token CSRF inválido.',
  404: 'Registro não encontrado ou já removido.',
  409: 'Já existe uma reserva ou cadastro conflitante para estes dados.',
  422: 'Revise os campos obrigatórios e os formatos informados.',
  500: 'Serviço indisponível no momento. Tente novamente em instantes.',
  502: 'Serviço indisponível no momento. Tente novamente em instantes.',
  503: 'Serviço indisponível no momento. Tente novamente em instantes.',
  504: 'Serviço indisponível no momento. Tente novamente em instantes.'
};

function translateApiMessage(status: number, message: string) {
  const normalized = message.toLowerCase();
  if (normalized.includes('csrf')) {
    return 'Sua sessão precisa ser atualizada. Recarregue a página e tente novamente.';
  }
  if (normalized.includes('expired') || normalized.includes('expirada')) {
    return 'Sessão expirada. Entre novamente para continuar.';
  }
  if (
    status === 409 ||
    normalized.includes('conflict') ||
    normalized.includes('overlap') ||
    normalized.includes('conflito') ||
    normalized.includes('já existe')
  ) {
    return 'Já existe uma reserva ou cadastro conflitante para estes dados.';
  }
  if (normalized.includes('not found') || normalized.includes('não encontrado')) {
    return 'Registro não encontrado ou já removido.';
  }
  if (normalized.includes('validation') || normalized.includes('invalid') || normalized.includes('inválid')) {
    return 'Revise os campos obrigatórios e os formatos informados.';
  }
  return commonErrorMessages[status] ?? message;
}

export function userFacingErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    return translateApiMessage(error.status, error.message);
  }
  if (error instanceof TypeError && error.message.toLowerCase().includes('fetch')) {
    return 'Não foi possível conectar aos serviços. Verifique a conexão e tente novamente.';
  }
  return fallback;
}

async function request<T>(
  baseUrl: string,
  path: string,
  method: string,
  options: RequestOptions = {}
): Promise<T> {
  const init: RequestInit = {
    method,
    headers: {
      Accept: 'application/json',
      ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(options.csrfToken ? { 'X-CSRF-Token': options.csrfToken } : {})
    }
  };

  if (options.body !== undefined) {
    init.body = JSON.stringify(options.body);
  }

  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    credentials: 'same-origin'
  });

  if (!response.ok) {
    let message = response.statusText;
    try {
      const payload = (await response.json()) as { detail?: string; message?: string };
      message = payload.detail ?? payload.message ?? message;
    } catch {
      // Empty error bodies are valid for 401/404 in the APIs.
    }
    throw new ApiError(message, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export const authApi = {
  register: (email: string, password: string) =>
    request<AuthSession>('', '/api/auth/register', 'POST', {
      body: { email, password }
    }),
  login: (email: string, password: string) =>
    request<AuthSession>('', '/api/auth/login', 'POST', {
      body: { email, password }
    }),
  session: () => request<AuthSession>('', '/api/auth/session', 'GET'),
  logout: (csrfToken: string) => request<{ ok: boolean }>('', '/api/auth/logout', 'POST', { csrfToken })
};

export const reservationsApi = {
  listLocations: () => request<Location[]>('', '/api/locations', 'GET'),
  createLocation: (csrfToken: string, payload: LocationPayload) =>
    request<Location>('', '/api/locations', 'POST', { csrfToken, body: payload }),
  updateLocation: (csrfToken: string, id: string, payload: LocationPayload) =>
    request<Location>('', `/api/locations/${id}`, 'PUT', { csrfToken, body: payload }),
  deleteLocation: (csrfToken: string, id: string) =>
    request<void>('', `/api/locations/${id}`, 'DELETE', { csrfToken }),
  listRooms: (locationId?: string) => {
    const query = locationId ? `?location_id=${encodeURIComponent(locationId)}` : '';
    return request<Room[]>('', `/api/rooms${query}`, 'GET');
  },
  createRoom: (csrfToken: string, payload: RoomPayload) =>
    request<Room>('', '/api/rooms', 'POST', { csrfToken, body: payload }),
  updateRoom: (csrfToken: string, id: string, payload: RoomPayload) =>
    request<Room>('', `/api/rooms/${id}`, 'PUT', { csrfToken, body: payload }),
  deleteRoom: (csrfToken: string, id: string) =>
    request<void>('', `/api/rooms/${id}`, 'DELETE', { csrfToken }),
  listReservations: () => request<Reservation[]>('', '/api/reservations', 'GET'),
  createReservation: (csrfToken: string, payload: ReservationPayload) =>
    request<Reservation>('', '/api/reservations', 'POST', {
      csrfToken,
      body: payload
    }),
  updateReservation: (csrfToken: string, id: string, payload: ReservationPayload) =>
    request<Reservation>('', `/api/reservations/${id}`, 'PUT', {
      csrfToken,
      body: payload
    }),
  deleteReservation: (csrfToken: string, id: string) =>
    request<void>('', `/api/reservations/${id}`, 'DELETE', { csrfToken }),
  bulkDeleteReservations: (csrfToken: string, ids: string[]) =>
    request<{ deleted: number }>('', '/api/reservations/bulk-delete', 'POST', {
      csrfToken,
      body: { ids }
    })
};
