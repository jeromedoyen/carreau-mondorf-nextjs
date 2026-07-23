'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Tabs } from './Tabs';
import { CalendrierPromotion } from './CalendrierPromotion';
import { StatistiquesPromotion } from './StatistiquesPromotion';
import { createClient } from '@/lib/supabase/client';
import { getEquipesPromotion, type EquipePromotion } from '@/lib/data';
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
      const [equipesData, statsData] = await Promise.all([
        getEquipesPromotion(supabase, saison),
        getStatistiquesPromotion(supabase, saison),
      ]);
      if (annule) return;
      setEquipes(equipesData);
      setStats(statsData);
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

  return (
    <Tabs labels={['Calendrier', 'Statistiques']}>
      <CalendrierPromotion key="calendrier" equipes={equipes} />
      <StatistiquesPromotion key="stats" stats={stats!} />
    </Tabs>
  );
}
