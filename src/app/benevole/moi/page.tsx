import type { Metadata } from 'next';
import Link from 'next/link';
import { HeartHandshake } from 'lucide-react';
import { getMonTableauDeBordBenevole } from '@/lib/benevolat';
import { estUtilisateurAutorise } from '@/lib/manifestations';
import { TableauDeBordBenevole } from '@/components/TableauDeBordBenevole';

export const metadata: Metadata = { title: 'Mes participations' };

export default async function MesParticipationsPage() {
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

  const tableau = await getMonTableauDeBordBenevole();

  if (!tableau) {
    return (
      <main className="mx-auto max-w-3xl px-5 py-16 text-center">
        <HeartHandshake size={28} className="mx-auto text-pin" />
        <p className="mt-4 text-[14px] text-encre-douce">
          Impossible de retrouver ton nom dans le registre — contacte le comité si tu penses que c&apos;est une
          erreur.
        </p>
        <Link href="/benevole" className="mt-5 inline-block text-[13px] text-terracotta hover:underline">
          ← Retour à Bénévole
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-5 py-12">
      <Link href="/benevole" className="text-[13px] text-encre-douce hover:text-terracotta">
        ← Bénévole
      </Link>

      <header className="entree mt-4 mb-9">
        <p className="font-score text-[13px] tracking-[0.2em] text-terracotta">TABLEAU DE BORD</p>
        <h1 className="font-display mt-1 text-4xl italic">Mes participations</h1>
        <p className="mt-3 text-[13.5px] text-encre-douce">{tableau.nom}</p>
      </header>

      <TableauDeBordBenevole tableau={tableau} />
    </main>
  );
}
