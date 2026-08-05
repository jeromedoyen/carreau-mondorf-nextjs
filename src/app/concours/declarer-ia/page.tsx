import type { Metadata } from 'next';
import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { estUtilisateurAutorise } from '@/lib/manifestations';

export const metadata: Metadata = { title: 'Déclarer à l’aide de l’IA' };

/** Page d'attente pour le mode de déclaration assisté par IA (pense-bête
 *  #125, 05/08/2026, demande Jérôme) — bouton déjà en place sur /concours
 *  (SaisieConcoursEtSuivi.tsx) à côté de "Déclarer au vocal".
 *
 *  L'assistant conversationnel décrit par Jérôme (accueil vocal, ville du
 *  concours vérifiée par recherche pour la bonne orthographe, type de
 *  partie, partenaires vérifiés contre la liste des licenciés) est une
 *  fonctionnalité conséquente — conversation audio temps réel, pas juste
 *  un enregistrement transcrit après coup comme /concours/declarer-vocal.
 *  Nécessite un choix de fournisseur voix temps réel (coût, latence,
 *  compatibilité avec le stack existant) avant d'être construite :
 *  volontairement non implémenté ici, à discuter avec Jérôme avant de
 *  se lancer plutôt que de deviner l'architecture. */
export default async function DeclarerIaPage() {
  const autorise = await estUtilisateurAutorise();
  if (!autorise) {
    return (
      <main className="mx-auto max-w-3xl px-5 py-16 text-center">
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

  return (
    <main className="mx-auto max-w-3xl px-5 py-16 text-center">
      <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-marine/10 text-marine">
        <Sparkles className="h-8 w-8" strokeWidth={1.5} />
      </span>
      <p className="font-score mt-5 text-[13px] tracking-[0.2em] text-marine">BIENTÔT DISPONIBLE</p>
      <h1 className="font-display mt-1 text-3xl italic">Déclaration assistée par IA</h1>
      <p className="mx-auto mt-4 max-w-md text-[13.5px] text-encre-douce">
        Un assistant vocal qui te pose les questions à voix haute (ville du concours, type de partie,
        partenaires) et remplit ta déclaration pour toi. En cours de conception.
      </p>
      <Link
        href="/concours/declarer-vocal"
        className="mt-6 inline-block rounded-lg bg-terracotta px-4 py-2.5 text-[14px] text-white transition-opacity hover:opacity-90"
      >
        Utiliser la déclaration au vocal en attendant
      </Link>
    </main>
  );
}
