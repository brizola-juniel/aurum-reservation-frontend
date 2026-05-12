export type User = {
  id: string;
  email: string;
};

export type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  user: User;
};

export type AuthSession = {
  user: User;
  expiresAt: string | null;
  csrfToken: string;
};

export type Location = {
  id: string;
  name: string;
  address: string | null;
  created_at: string;
};

export type Room = {
  id: string;
  location_id: string;
  name: string;
  capacity: number;
  created_at: string;
};

export type Reservation = {
  id: string;
  location_id: string;
  room_id: string;
  start_at: string;
  end_at: string;
  responsible: string;
  coffee: boolean;
  attendees: number | null;
  description: string | null;
  created_by_user_id: string;
  created_by_email: string;
  created_at: string;
  updated_at: string;
  location_name: string;
  room_name: string;
};

export type ReservationPayload = {
  location_id: string;
  room_id: string;
  start_at: string;
  end_at: string;
  responsible: string;
  coffee: boolean;
  attendees?: number | null;
  description?: string | null;
};

export type LocationPayload = {
  name: string;
  address?: string | null;
};

export type RoomPayload = {
  location_id: string;
  name: string;
  capacity: number;
};
