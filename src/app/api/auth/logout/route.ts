import { type NextRequest } from 'next/server';

import { logout } from '../../_lib/bff';

export async function POST(request: NextRequest) {
  return logout(request);
}
