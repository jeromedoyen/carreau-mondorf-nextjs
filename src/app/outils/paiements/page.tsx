import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { estMembreCA } from '@/lib/membres';
import { getParametresClub, getAppelsPaiement } from '@/lib/paiements';
import { getSaisonActive } from '@/lib/saisons';
import { NouvelAppelPaiementForm } from '@/components/NouvelAppelPaiementForm';
import { ListeAppelsPaiement } from '@/components/ListeAppelsPaiement';

export const metadata: Metadata = { title: 'Appel à cotisation' };

export default async function PaiementsPage() {
  const autorise = await estMembreCA();

  if (!autorise) {
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
  const [parametres, appels, saisonActive, { data: personnesData }] = await Promise.all([
    getParametresClub(),
    getAppelsPaiement(),
    getSaisonActive(),
    supabase.from('personnes').select('id, nom, prenom').eq('supprime', false).order('nom', { ascending: true }),
  ]);
  const personnes = (personnesData ?? []).map((p) => ({ id: p.id, nom: `${p.prenom} ${p.nom}` }));
  // Rien d'autre ne se passe ici une fois l'email envoyé — retour Jérôme
  // (27/07/2026), le suivi (marquer payé, historique) vit désormais sur
  // /outils/paiements-en-attente.
  const nouveauxAppels = appels.filter((a) => a.statut === 'en_attente' && !a.emailEnvoyeLe);

  return (
    <main className="mx-auto max-w-3xl px-5 py-12">
      <header className="entree mb-9">
        <p className="font-score text-[13px] tracking-[0.2em] text-terracotta">OUTILS</p>
        <h1 className="font-display mt-1 text-4xl italic">Appel à cotisation</h1>
        <p className="mt-3 text-[13.5px] text-encre-douce">
          Demande de paiement (carte de membre, licence, ou paiement ponctuel) à une ou plusieurs personnes —
          chacune génère un QR code SEPA et peut être envoyée par email.
        </p>
        {!parametres?.iban && (
          <p className="mt-2 text-[12.5px] text-danger">
            Aucune coordonnée bancaire enregistrée —{' '}
            <Link href="/outils/parametres" className="underline">
              configure-les d&apos;abord
            </Link>
            .
          </p>
        )}
      </header>

      <div className="mb-8">
        <NouvelAppelPaiementForm personnes={personnes} parametres={parametres} />
      </div>

      <ListeAppelsPaiement appels={nouveauxAppels} parametres={parametres} saisonActive={saisonActive} />
    </main>
  );
}
