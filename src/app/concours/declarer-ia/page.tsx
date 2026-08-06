import type { Metadata } from 'next';
import Link from 'next/link';
import { estUtilisateurAutorise } from '@/lib/manifestations';
import { ConcoursIaChat } from '@/components/ConcoursIaChat';

export const metadata: Metadata = { title: 'Déclarer à l’aide de l’IA' };

/** Le traitement enchaîne Gemini (streaming) et éventuellement une
 *  synthèse/reconnaissance vocale côté navigateur — même contrainte de
 *  durée que /concours/declarer-vocal pour le premier appel de la
 *  journée. */
export const maxDuration = 60;

/** Déclaration de concours assistée par IA (pense-bête #125, 05/08/2026)
 *  — implémentation directe dans l'app (abandon de la piste Voiceflow,
 *  jugée trop complexe à configurer côté Jérôme), même technique que
 *  l'assistant Caro. Voir ConcoursIaChat.tsx et /api/concours-ia/route.ts. */
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

  return <ConcoursIaChat />;
}
