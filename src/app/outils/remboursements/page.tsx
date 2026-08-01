import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { estMembreCA } from '@/lib/membres';
import {
  getParticipationsExterieures,
  getConcoursExterieurs,
  getBaremesIndemnites,
  getLicenciesPourSelecteur,
} from '@/lib/concours';
import { RemboursementsClient } from '@/components/RemboursementsClient';

export const metadata: Metadata = { title: 'Remboursements concours extérieurs' };

/** Phase 1 (fondations) du module remboursement concours extérieurs —
 *  demande via /pb, cahier des charges fourni par Jérôme (01/08/2026).
 *  Saisie + validation CA uniquement pour l'instant ; dashboards par rôle
 *  (joueur, comité, admin) et notifications : phases ultérieures. */
export default async function RemboursementsPage() {
  const ca = await estMembreCA();

  if (!ca) {
    return (
      <main className="mx-auto max-w-5xl px-5 py-16 text-center">
        <p className="font-score text-[13px] tracking-[0.2em] text-terracotta">ACCÈS RESTREINT</p>
        <h1 className="font-display mt-1 text-3xl italic">Accès restreint</h1>
        <Link
          href="/connexion"
          className="mt-5 inline-block rounded-lg bg-terracotta px-4 py-2.5 text-[14px] text-white transition-opacity hover:opacity-90"
        >
          Se connecter
        </Link>
      </main>
    );
  }

  const supabase = await createClient();
  const [participations, concours, baremes, licencies] = await Promise.all([
    getParticipationsExterieures(supabase),
    getConcoursExterieurs(supabase),
    getBaremesIndemnites(supabase),
    getLicenciesPourSelecteur(supabase),
  ]);

  return (
    <main className="mx-auto max-w-4xl px-5 py-12">
      <header className="entree mb-8">
        <p className="font-score text-[13px] tracking-[0.2em] text-terracotta">OUTILS</p>
        <h1 className="font-display mt-1 text-4xl italic">Remboursements concours extérieurs</h1>
        <p className="mt-3 text-[13.5px] text-encre-douce">
          Suivi des indemnités de participation aux concours hors club — barèmes, concours, participations et
          validation des paiements. Version fondations : les tableaux de bord par rôle (joueur, comité sportif,
          admin) et les notifications viendront dans une phase ultérieure.
        </p>
      </header>

      <RemboursementsClient
        participationsInitiales={participations}
        concoursInitial={concours}
        baremesInitiaux={baremes}
        licencies={licencies}
      />
    </main>
  );
}
