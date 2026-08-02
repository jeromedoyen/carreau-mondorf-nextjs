import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getParticipationsConcours } from '@/lib/remboursements';
import { getSaisonActive } from '@/lib/saisons';
import { OutilRemboursements } from '@/components/OutilRemboursements';

export const metadata: Metadata = { title: 'Remboursements concours' };

/** Refonte complète (02/08/2026) sur cahier des charges de Jérôme — voir
 *  Obsidian/Automind Consulting/30_Produits_&_Solutions/
 *  Carreau_Mondorf_Remboursements_Concours_CahierDesCharges.md. Réservé au
 *  rôle "trésorerie" (migration 0046), PAS tout le CA — Jérôme a précisé
 *  explicitement que tous les membres du CA n'ont pas accès aux
 *  informations financières. `/outils/*` est déjà dynamique (session
 *  lue ailleurs dans l'arborescence), donc la vérification peut se faire
 *  directement côté serveur ici, contrairement à /national-d2 qui doit
 *  rester statique. */
export default async function RemboursementsPage() {
  const supabase = await createClient();
  const { data: tresorerie } = await supabase.rpc('est_membre_tresorerie');

  if (!tresorerie) {
    return (
      <main className="mx-auto max-w-5xl px-5 py-16 text-center">
        <p className="font-score text-[13px] tracking-[0.2em] text-terracotta">ACCÈS RESTREINT</p>
        <h1 className="font-display mt-1 text-3xl italic">Accès restreint</h1>
        <p className="mx-auto mt-3 max-w-md text-[13.5px] text-encre-douce">
          Ce module est réservé à la trésorerie du comité.
        </p>
        <Link
          href="/connexion"
          className="mt-5 inline-block rounded-lg bg-terracotta px-4 py-2.5 text-[14px] text-white transition-opacity hover:opacity-90"
        >
          Se connecter
        </Link>
      </main>
    );
  }

  const saison = await getSaisonActive();
  const participations = await getParticipationsConcours(supabase, saison);

  return (
    <main className="mx-auto max-w-5xl px-5 py-12">
      <header className="entree mb-8">
        <p className="font-score text-[13px] tracking-[0.2em] text-terracotta">TRÉSORERIE</p>
        <h1 className="font-display mt-1 text-4xl italic">Remboursements concours</h1>
        <p className="mt-3 max-w-2xl text-[13.5px] text-encre-douce">
          Liste 1 (Championnat, automatique) et liste 2 (autres concours, saisis par les chefs d&apos;équipe) —
          validation et suivi des virements.
        </p>
      </header>

      <OutilRemboursements saison={saison} participationsInitiales={participations} />
    </main>
  );
}
