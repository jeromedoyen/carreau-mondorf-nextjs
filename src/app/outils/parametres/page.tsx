import type { Metadata } from 'next';
import Link from 'next/link';
import { estMembreCA } from '@/lib/membres';
import { getParametresClub } from '@/lib/paiements';
import { ParametresClubForm } from '@/components/ParametresClubForm';

export const metadata: Metadata = { title: 'Paramètres cotisation & licence' };

/** Outil dédié (29/07/2026, demande Jérôme) — les montants de cotisation
 *  et de licence n'avaient fonctionnellement pas leur place au milieu de
 *  "Appel à cotisation" (qui sert à créer/envoyer des appels de paiement,
 *  un geste différent). Même composant ParametresClubForm, juste sorti de
 *  /outils/paiements vers sa propre page — seule référence utilisée
 *  partout dans l'application (emails, appels à cotisation, renouvellement,
 *  page publique du club). */
export default async function ParametresPage() {
  const ca = await estMembreCA();

  if (!ca) {
    return (
      <main className="mx-auto max-w-5xl px-5 py-16 text-center">
        <p className="font-score text-[13px] tracking-[0.2em] text-terracotta">ACCÈS RESTREINT</p>
        <h1 className="font-display mt-1 text-3xl italic">Réservé au comité</h1>
        <Link
          href="/connexion"
          className="mt-5 inline-block rounded-lg bg-terracotta px-4 py-2.5 text-[14px] text-white transition-opacity hover:opacity-90"
        >
          Se connecter
        </Link>
      </main>
    );
  }

  const parametres = await getParametresClub();

  return (
    <main className="mx-auto max-w-2xl px-5 py-12">
      <header className="entree mb-8">
        <p className="font-score text-[13px] tracking-[0.2em] text-terracotta">OUTILS</p>
        <h1 className="font-display mt-1 text-4xl italic">Paramètres cotisation & licence</h1>
        <p className="mt-3 text-[13.5px] text-encre-douce">
          Référence unique des montants et des coordonnées bancaires du club — utilisée automatiquement dans les
          appels à cotisation, les emails, le renouvellement et la page publique du club.
        </p>
      </header>

      <ParametresClubForm parametres={parametres} />
    </main>
  );
}
