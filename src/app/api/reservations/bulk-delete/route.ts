import { type NextRequest } from 'next/server';

import { proxyReservationRequest } from '../../_lib/bff';

export async function POST(request: NextRequest) {
  return proxyReservationRequest(request, '/api/reservations/bulk-delete');
}
