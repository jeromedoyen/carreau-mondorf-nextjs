import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { estUtilisateurAutorise } from '@/lib/manifestations';
import { getSaisonActive } from '@/lib/saisons';
import { getMonNomBenevole, getMonTableauDeBordBenevole } from '@/lib/benevolat';
import { getMonAdhesion } from '@/lib/moncaro';
import { getParametresClub } from '@/lib/paiements';
import { getMesStatistiquesD2, getStatistiquesPromotion } from '@/lib/stats';
import { HeroAnimationMoncaro } from '@/components/HeroAnimationMoncaro';
import { TableauDeBordMoncaro } from '@/components/TableauDeBordMoncaro';

export const metadata: Metadata = { title: 'Moncaro' };

export default async function MoncaroPage() {
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
  const saison = await getSaisonActive();

  const [monNom, adhesion, parametres, benevolat, { data: ca }, { data: licencie }, { data: participationsConcours }] =
    await Promise.all([
      getMonNomBenevole(),
      getMonAdhesion(supabase, saison),
      getParametresClub().catch(() => null),
      getMonTableauDeBordBenevole().catch(() => null),
      supabase.rpc('est_membre_ca'),
      supabase.rpc('est_licencie', { p_saison: saison }),
      supabase.rpc('mes_participations_concours', { p_saison: saison }),
    ]);

  const statsVisibles = !!ca || !!licencie;
  // Une RPC manquante ici (migration pas encore appliquée) ne doit jamais
  // faire planter toute la page — dégrade juste la carte Compétition.
  const [mesStatsD2, statsPromotion] = statsVisibles
    ? await Promise.all([
        getMesStatistiquesD2(supabase, saison).catch(() => null),
        getStatistiquesPromotion(supabase, saison).catch(() => null),
      ])
    : [null, null];

  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <HeroAnimationMoncaro />

      <header className="entree mt-6 mb-9">
        <p className="font-score text-[13px] tracking-[0.2em] text-terracotta">MONCARO</p>
        <h1 className="font-display mt-1 text-4xl italic">{monNom ? `Bonjour, ${monNom.split(' ')[0]}` : 'Bienvenue'}</h1>
        <p className="mt-2 text-[13.5px] text-encre-douce">Ta situation au club, en un coup d&apos;œil.</p>
      </header>

      <TableauDeBordMoncaro
        saison={saison}
        adhesion={adhesion}
        parametres={parametres}
        benevolat={benevolat}
        statsVisibles={statsVisibles}
        concoursVisible={statsVisibles}
        monNom={monNom}
        mesStatsD2={mesStatsD2}
        statsPromotion={statsPromotion}
        participationsConcours={participationsConcours ?? []}
      />
    </main>
  );
}
