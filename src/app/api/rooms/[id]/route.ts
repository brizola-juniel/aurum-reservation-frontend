import { type NextRequest } from 'next/server';

import { proxyReservationRequest } from '../../_lib/bff';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PUT(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  return proxyReservationRequest(request, `/api/rooms/${encodeURIComponent(id)}`);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  return proxyReservationRequest(request, `/api/rooms/${encodeURIComponent(id)}`);
}
