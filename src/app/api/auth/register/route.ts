import { type NextRequest } from 'next/server';

import { authenticate } from '../../_lib/bff';

export async function POST(request: NextRequest) {
  return authenticate(request, '/api/auth/register');
}
