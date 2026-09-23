import type { Metadata } from 'next';
import { PromotionContent } from '@/components/PromotionContent';
import { SaisonSwitcher } from '@/components/SaisonSwitcher';
import { getSaisons, getSaisonActive } from '@/lib/saisons';

export const metadata: Metadata = { title: 'Promotion' };

/* La saison était figée à '2025' (« seule saison disponible pour l'instant,
 * championnat clos »). Ce n'est plus vrai depuis la migration 0065 : la
 * saison 2026 existe. Laisser la constante aurait rendu ces données
 * invisibles ici — la page aurait continué d'afficher 2025 sans que rien
 * ne le signale.
 *
 * Même mécanique que /national-d2 : `?saison=` dans l'URL, la saison active
 * par défaut. Le choix se fait sur `saisons` (table publique) et non sur les
 * saisons présentes dans `promotion_equipes` : cette table est réservée aux
 * licenciés, une lecture serveur anonyme n'y verrait aucune ligne et la
 * liste reviendrait vide. Une saison sans données affiche simplement son
 * état vide, ce qui est la bonne réponse.
 *
 * `PromotionContent` continue de tout lire côté client avec la session du
 * licencié : rien de protégé ne passe par le serveur ici. */
export default async function PromotionPage({
  searchParams,
}: {
  searchParams: Promise<{ saison?: string }>;
}) {
  const [{ saison: saisonDemandee }, saisons, saisonActive] = await Promise.all([
    searchParams,
    getSaisons(),
    getSaisonActive(),
  ]);
  const saison = saisonDemandee ?? saisonActive;

  return (
    <main className="mx-auto max-w-5xl px-5 py-12">
      <header className="entree mb-9 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-score text-[13px] tracking-[0.2em] text-terracotta">SAISON {saison}</p>
          <h1 className="font-display mt-1 text-4xl italic">Promotion</h1>
        </div>
        <SaisonSwitcher saisons={saisons.map((s) => s.libelle)} actuelle={saison} />
      </header>
      <PromotionContent saison={saison} />
    </main>
  );
}
