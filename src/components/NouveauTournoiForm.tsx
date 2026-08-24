'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X } from 'lucide-react';
import { creerTournoi } from '@/lib/actions/tournoi';
import type { FormatTournoi } from '@/lib/tournoi/moteur';
import { TournoiParametresChamps } from './TournoiParametresChamps';

export function NouveauTournoiForm() {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [format, setFormat] = useState<FormatTournoi>('equipes_fixes');

  async function soumettre(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErreur(null);
    setEnCours(true);
    const fd = new FormData(e.currentTarget);
    const resultat = await creerTournoi({
      nom: String(fd.get('nom') || ''),
      dateTournoi: String(fd.get('date') || ''),
      format,
      tailleEquipe: Number(fd.get('tailleEquipe')),
      nbParties: Number(fd.get('nbParties')),
      nbTerrains: Number(fd.get('nbTerrains')),
      pointsVictoire: Number(fd.get('pointsVictoire')),
    });
    setEnCours(false);
    if (!resultat.ok) {
      setErreur(resultat.error);
      return;
    }
    setOuvert(false);
    if (resultat.id) router.push(`/outils/tournoi/${resultat.id}`);
    else router.refresh();
  }

  if (!ouvert) {
    return (
      <button
        type="button"
        onClick={() => setOuvert(true)}
        className="inline-flex items-center gap-2 rounded-full bg-terracotta px-4 py-2 text-[13px] font-medium text-white transition-opacity hover:opacity-90"
      >
        <Plus size={15} />
        Nouveau tournoi
      </button>
    );
  }

  return (
    <form
      onSubmit={soumettre}
      className="entree flex flex-col gap-4 rounded-2xl border border-ligne bg-sable-carte p-5"
    >
      <div className="flex items-center justify-between">
        <h3 className="font-display text-[16px]">Nouveau tournoi</h3>
        <button
          type="button"
          onClick={() => setOuvert(false)}
          aria-label="Fermer"
          className="text-encre-douce hover:text-encre"
        >
          <X size={16} />
        </button>
      </div>

      <TournoiParametresChamps format={format} onFormat={setFormat} verrouille={false} />

      {erreur && <p className="text-[12.5px] text-danger">{erreur}</p>}

      <button
        type="submit"
        disabled={enCours}
        className="self-start rounded-lg bg-terracotta px-4 py-2 text-[13.5px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {enCours ? 'Création…' : 'Créer le tournoi'}
      </button>
    </form>
  );
}
