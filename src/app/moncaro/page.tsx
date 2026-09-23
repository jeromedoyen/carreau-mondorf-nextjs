import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { estUtilisateurAutorise } from '@/lib/manifestations';
import { getSaisonActive, getSaisons } from '@/lib/saisons';
import { getMonNomBenevole, getMonTableauDeBordBenevole } from '@/lib/benevolat';
import { getMonAdhesion } from '@/lib/moncaro';
import { getParametresClub } from '@/lib/paiements';
import { getMesStatistiquesD2, getStatistiquesPromotion } from '@/lib/stats';
import { getNombreJourneesPromotion } from '@/lib/data';
import { construireBilanSportifD2, getRencontresJoueesSaison } from '@/lib/tableauDeBord';
import { HeroAnimationMoncaro } from '@/components/HeroAnimationMoncaro';
import { SaisonSwitcher } from '@/components/SaisonSwitcher';
import { TableauDeBordMoncaro } from '@/components/TableauDeBordMoncaro';

export const metadata: Metadata = { title: 'Moncaro' };

export default async function MoncaroPage({
  searchParams,
}: {
  searchParams: Promise<{ saison?: string }>;
}) {
  const autorise = await estUtilisateurAutorise();

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
  const [{ saison: saisonDemandee }, saisons, saisonActive] = await Promise.all([
    searchParams,
    getSaisons(),
    getSaisonActive(),
  ]);
  // Une saison inconnue dans l'URL ne doit pas produire une page vide et
  // muette : on retombe sur la saison active.
  const saison = saisons.some((s) => s.libelle === saisonDemandee)
    ? (saisonDemandee as string)
    : saisonActive;
  const bornesSaison = saisons.find((s) => s.libelle === saison);

  // Un seul aller-retour groupé. Chaque appel garde son `.catch()` : une RPC
  // absente (migration pas encore appliquée en production) doit dégrader une
  // carte, jamais faire tomber la page entière.
  const [
    monNom,
    adhesion,
    parametres,
    benevolat,
    { data: ca },
    { data: licencie },
    { data: participationsConcours },
  ] = await Promise.all([
    getMonNomBenevole(),
    getMonAdhesion(supabase, saison),
    getParametresClub().catch(() => null),
    (bornesSaison
      ? getMonTableauDeBordBenevole({ debut: bornesSaison.dateDebut, fin: bornesSaison.dateFin })
      : getMonTableauDeBordBenevole()
    ).catch(() => null),
    supabase.rpc('est_membre_ca'),
    supabase.rpc('est_licencie', { p_saison: saison }),
    supabase.rpc('mes_participations_concours', { p_saison: saison }),
  ]);

  const statsVisibles = !!ca || !!licencie;
  const [mesStatsD2, statsPromotion, rencontresEquipe, journeesPromotionSaison] = statsVisibles
    ? await Promise.all([
        getMesStatistiquesD2(supabase, saison).catch(() => null),
        getStatistiquesPromotion(supabase, saison).catch(() => null),
        getRencontresJoueesSaison(supabase, saison),
        getNombreJourneesPromotion(saison).catch(() => null),
      ])
    : [null, null, null, null];

  const bilan = mesStatsD2 ? construireBilanSportifD2(mesStatsD2, rencontresEquipe) : null;

  return (
    <main className="mx-auto max-w-5xl px-5 py-10">
      <HeroAnimationMoncaro />

      {saisons.length > 1 && (
        <div className="mt-6 flex justify-end">
          <SaisonSwitcher saisons={saisons.map((s) => s.libelle)} actuelle={saison} />
        </div>
      )}

      <div className="mt-4">
        <TableauDeBordMoncaro
          saison={saison}
          adhesion={adhesion}
          parametres={parametres}
          benevolat={benevolat}
          statsVisibles={statsVisibles}
          concoursVisible={statsVisibles}
          monNom={monNom}
          bilan={bilan}
          statsPromotion={statsPromotion}
          journeesPromotionSaison={journeesPromotionSaison}
          participationsConcours={participationsConcours ?? []}
        />
      </div>
    </main>
  );
}
