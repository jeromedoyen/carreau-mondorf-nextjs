import { redirect } from 'next/navigation';
import { estMembreCA } from '@/lib/membres';
import { urlAutorisationGoogle } from '@/lib/googleDrive';

/** Point de départ de l'autorisation Google Drive (Phase 3, 27/07/2026) —
 *  CA-only, redirige vers l'écran de consentement Google. À visiter une
 *  seule fois (ou à nouveau si le refresh_token expire/est révoqué). */
export async function GET() {
  if (!(await estMembreCA())) {
    return new Response('Réservé au comité.', { status: 403 });
  }
  redirect(urlAutorisationGoogle());
}
