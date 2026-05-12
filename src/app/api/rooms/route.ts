import { type NextRequest } from 'next/server';

import { proxyReservationRequest } from '../_lib/bff';

export async function GET(request: NextRequest) {
  return proxyReservationRequest(request, '/api/rooms');
}

export async function POST(request: NextRequest) {
  return proxyReservationRequest(request, '/api/rooms');
}
