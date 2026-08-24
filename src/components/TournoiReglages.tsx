'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Settings, Trash2, X } from 'lucide-react';
import { modifierTournoi, supprimerTournoi } from '@/lib/actions/tournoi';
import type { FormatTournoi } from '@/lib/tournoi/moteur';
import type { Tournoi } from '@/lib/tournoi/donnees';
import { TournoiParametresChamps } from './TournoiParametresChamps';

const BTN =
  'inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-medium transition-opacity hover:opacity-90 disabled:opacity-40';

/**
 * Panneau de modification des paramètres, ouvert depuis l'en-tête du
 * tournoi. `nbPartiesComposees` vient du nombre réel de lignes dans
 * `partiesDetail` — c'est ce qui verrouille format et taille d'équipe, et ce
 * qui plafonne le nombre de parties qu'on peut redescendre.
 */
export function TournoiReglages({
  tournoi,
  nbPartiesComposees,
}: {
  tournoi: Tournoi;
  nbPartiesComposees: number;
}) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const [suppression, setSuppression] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [format, setFormat] = useState<FormatTournoi>(tournoi.format);
  const verrouille = nbPartiesComposees > 0;

  async function soumettre(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErreur(null);
    setEnCours(true);
    const fd = new FormData(e.currentTarget);
    const resultat = await modifierTournoi(tournoi.id, {
      nom: String(fd.get('nom') || ''),
      dateTournoi: String(fd.get('date') || ''),
      format,
      tailleEquipe: Number(fd.get('tailleEquipe')),
      nbParties: Number(fd.get('nbParties')),
      nbTerrains: Number(fd.get('nbTerrains')),
      pointsVictoire: Number(fd.get('pointsVictoire')),
      notes: tournoi.notes ?? undefined,
    });
    setEnCours(false);
    if (!resultat.ok) {
      setErreur(resultat.error);
      return;
    }
    setOuvert(false);
    router.refresh();
  }

  async function supprimer() {
    const nbTotal =
      nbPartiesComposees > 0
        ? ` et ses ${nbPartiesComposees} partie(s) composée(s)`
        : '';
    if (!window.confirm(`Supprimer définitivement « ${tournoi.nom} »${nbTotal} ? L'action reste tracée dans le journal.`)) {
      return;
    }
    setSuppression(true);
    setErreur(null);
    const resultat = await supprimerTournoi(tournoi.id);
    setSuppression(false);
    if (!resultat.ok) {
      setErreur(resultat.error);
      return;
    }
    router.push('/outils/tournoi');
  }

  if (!ouvert) {
    return (
      <button
        type="button"
        onClick={() => setOuvert(true)}
        aria-label="Modifier les paramètres du tournoi"
        title="Modifier les paramètres"
        className="inline-flex items-center gap-1.5 self-start rounded-full border border-ligne bg-sable px-3 py-1.5 text-[12px] text-encre-douce transition-colors hover:border-terracotta hover:text-encre"
      >
        <Settings size={13} /> Paramètres
      </button>
    );
  }

  return (
    <form
      onSubmit={soumettre}
      className="entree mb-2 flex w-full flex-col gap-4 rounded-2xl border border-ligne bg-sable-carte p-5"
    >
      <div className="flex items-center justify-between">
        <h2 className="font-display text-[16px]">Paramètres du tournoi</h2>
        <button
          type="button"
          onClick={() => setOuvert(false)}
          aria-label="Fermer"
          className="text-encre-douce hover:text-encre"
        >
          <X size={16} />
        </button>
      </div>

      {verrouille && (
        <p className="rounded-xl border border-laiton/35 bg-laiton/10 px-3.5 py-2.5 text-[12px] text-[#7a5c1f]">
          {nbPartiesComposees} partie{nbPartiesComposees > 1 ? 's' : ''} déjà composée
          {nbPartiesComposees > 1 ? 's' : ''} : le format et la taille d&apos;équipe ne peuvent
          plus changer, et le nombre de parties ne peut pas descendre en dessous.
        </p>
      )}

      <TournoiParametresChamps
        defaut={{
          nom: tournoi.nom,
          date: tournoi.dateTournoi,
          tailleEquipe: tournoi.tailleEquipe,
          nbParties: tournoi.nbParties,
          nbTerrains: tournoi.nbTerrains,
          pointsVictoire: tournoi.pointsVictoire,
        }}
        format={format}
        onFormat={setFormat}
        verrouille={verrouille}
      />

      {erreur && <p className="text-[12.5px] text-danger">{erreur}</p>}

      <div className="flex flex-wrap items-center gap-2 border-t border-ligne pt-4">
        <button
          type="submit"
          disabled={enCours || suppression}
          className={`${BTN} bg-terracotta text-white`}
        >
          {enCours ? 'Enregistrement…' : 'Enregistrer'}
        </button>
        <button
          type="button"
          disabled={enCours}
          onClick={() => void supprimer()}
          className={`${BTN} ml-auto border border-danger/30 bg-danger/8 text-danger`}
        >
          <Trash2 size={14} /> {suppression ? 'Suppression…' : 'Supprimer le tournoi'}
        </button>
      </div>
    </form>
  );
}
