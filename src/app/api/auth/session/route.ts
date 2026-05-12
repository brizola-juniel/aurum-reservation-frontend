import { session } from '../../_lib/bff';

export async function GET() {
  return session();
}
