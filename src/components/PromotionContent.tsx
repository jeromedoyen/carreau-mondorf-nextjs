'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Tabs } from './Tabs';
import { CalendrierPromotion } from './CalendrierPromotion';
import { StatistiquesPromotion } from './StatistiquesPromotion';
import { CouvertureSaisonPromotion } from './CouvertureSaisonPromotion';
import { ClassementPromotion } from './ClassementPromotion';
import { createClient } from '@/lib/supabase/client';
import {
  getClassementPromotion,
  getEquipesPromotion,
  getNombreJourneesPromotion,
  type ClassementPromotion as ClassementPromotionData,
  type EquipePromotion,
} from '@/lib/data';
import { getStatistiquesPromotion } from '@/lib/stats';
import type { StatistiquesPromotion as StatistiquesPromotionData } from '@/lib/types';

type Etat = 'verification' | 'refuse' | 'chargement' | 'pret';

/** Tout le module Promotion (calendrier + statistiques) est réservé aux
 *  licenciés connectés, comme dans l'app d'origine (0007_verrouillage_promotion.sql)
 *  — décision de Jérôme (option "b") après le reverrouillage des stats D2.
 *  Calcul et lecture entièrement côté client, pour la même raison que
 *  StatistiquesD2.tsx : la page /promotion doit rester statique. */
export function PromotionContent({ saison }: { saison: string }) {
  const [etat, setEtat] = useState<Etat>('verification');
  const [equipes, setEquipes] = useState<EquipePromotion[]>([]);
  const [stats, setStats] = useState<StatistiquesPromotionData | null>(null);
  const [monNom, setMonNom] = useState<string | null>(null);
  const [statsVisibles, setStatsVisibles] = useState(false);
  const [journeesSaison, setJourneesSaison] = useState<number | null>(null);
  const [classement, setClassement] = useState<ClassementPromotionData>({
    classements: [],
    resultats: [],
  });

  /** Le calendrier reste ouvert à tout licencié/membre autorisé, mais les
   *  statistiques de championnat sont réservées aux licenciés (ou au CA) —
   *  "la seule différence entre membre et licencié, c'est les stats"
   *  (retour Jérôme, 26/07/2026 — même principe que StatistiquesD2.tsx). */
  useEffect(() => {
    const supabase = createClient();
    let annule = false;
    supabase.rpc('est_utilisateur_autorise').then(async ({ data: autorise }) => {
      if (annule) return;
      if (!autorise) {
        setEtat('refuse');
        return;
      }
      setEtat('chargement');
      const [
        equipesData,
        statsData,
        journeesData,
        classementData,
        { data: nomData },
        { data: estCA },
        { data: licencie },
      ] = await Promise.all([
        getEquipesPromotion(supabase, saison),
        getStatistiquesPromotion(supabase, saison),
        getNombreJourneesPromotion(saison),
        getClassementPromotion(supabase, saison),
        supabase.rpc('mon_nom_benevole'),
        supabase.rpc('est_membre_ca'),
        supabase.rpc('est_licencie', { p_saison: saison }),
      ]);
      if (annule) return;
      setEquipes(equipesData);
      setStats(statsData);
      setJourneesSaison(journeesData);
      setClassement(classementData);
      setMonNom(nomData ?? null);
      setStatsVisibles(!!estCA || !!licencie);
      setEtat('pret');
    });
    return () => {
      annule = true;
    };
  }, [saison]);

  if (etat === 'verification' || etat === 'chargement') {
    return (
      <div className="rounded-2xl border border-ligne bg-sable-carte p-6 text-[13.5px] text-encre-douce">
        Chargement…
      </div>
    );
  }

  if (etat === 'refuse') {
    return (
      <div className="rounded-2xl border border-ligne bg-sable-carte p-6 text-center text-[13.5px] text-encre-douce">
        <p className="mb-3">
          Le module Promotion est réservé aux licenciés du club, connectés
          avec leur adresse autorisée.
        </p>
        <Link
          href="/connexion"
          className="inline-block rounded-lg bg-terracotta px-4 py-2 text-[13px] text-white transition-opacity hover:opacity-90"
        >
          Se connecter
        </Link>
      </div>
    );
  }

  // L'avertissement de couverture coiffe les deux onglets plutôt que d'être
  // répété dans chacun : il vaut pour le calendrier comme pour les
  // statistiques, et il doit être lu avant les chiffres, pas après.
  const couverture = (
    <CouvertureSaisonPromotion
      journeesCouvertes={equipes.map((e) => e.journee)}
      journeesSaison={journeesSaison}
    />
  );

  // Le classement des clubs n'est pas une statistique individuelle : comme
  // le calendrier, il est ouvert à tout utilisateur autorisé. Seul l'onglet
  // « Statistiques » reste réservé aux licenciés de la saison et au CA.
  if (!statsVisibles) {
    return (
      <div className="flex flex-col gap-4">
        {couverture}
        <Tabs labels={['Calendrier', 'Classement']}>
          <CalendrierPromotion key="calendrier" equipes={equipes} />
          <ClassementPromotion key="classement" data={classement} />
        </Tabs>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {couverture}
      <Tabs labels={['Calendrier', 'Classement', 'Statistiques']}>
        <CalendrierPromotion key="calendrier" equipes={equipes} />
        <ClassementPromotion key="classement" data={classement} />
        <StatistiquesPromotion key="stats" stats={stats!} monNom={monNom} saison={saison} />
      </Tabs>
    </div>
  );
}
