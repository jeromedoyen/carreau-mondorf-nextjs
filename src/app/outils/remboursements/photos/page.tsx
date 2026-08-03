import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getPhotosEquipeConcours } from '@/lib/photosConcours';
import { getSaisonActive } from '@/lib/saisons';
import { PelemelePhotosConcours } from '@/components/PelemelePhotosConcours';

export const metadata: Metadata = { title: 'Photos des concours' };

/** Pêle-mêle des selfies d'équipe reçus avec les déclarations vocales
 *  (idée Jérôme, 03/08/2026) — même garde d'accès que le reste du module
 *  remboursements (rôle trésorerie, pas tout le CA). */
export default async function PhotosConcoursPage() {
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
  const photos = await getPhotosEquipeConcours(supabase, saison);

  return (
    <main className="mx-auto max-w-5xl px-5 py-12">
      <header className="entree mb-8">
        <p className="font-score text-[13px] tracking-[0.2em] text-terracotta">TRÉSORERIE</p>
        <h1 className="font-display mt-1 text-4xl italic">Le pêle-mêle des concours</h1>
        <p className="mt-3 max-w-2xl text-[13.5px] text-encre-douce">
          Les selfies d&apos;équipe envoyés avec les déclarations vocales — clique une photo pour l&apos;ouvrir en
          grand.
        </p>
      </header>

      <PelemelePhotosConcours photos={photos} />

      <Link href="/outils/remboursements" className="mt-8 inline-block text-[13px] text-encre-douce underline">
        ← Retour aux remboursements
      </Link>
    </main>
  );
}
