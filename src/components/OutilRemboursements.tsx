'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { pdf } from '@react-pdf/renderer';
import { Sparkles, Check, Euro, Trash2, FileDown } from 'lucide-react';
import type { ParticipationConcours } from '@/lib/remboursements';
import { RemboursementsPdf } from './RemboursementsPdf';
import {
  genererListeChampionnatD2,
  validerParticipation,
  corrigerMontantParticipation,
  marquerParticipationPayee,
  supprimerParticipation,
  enregistrerMontantRemboursementConcours,
} from '@/lib/actions/remboursements';

function formatDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

const LIBELLE_TYPE: Record<string, string> = {
  Championnat_D2: 'National D2',
  Promotion: 'Promotion',
  Concours_National: 'Championnat national',
  Concours: 'Concours',
};

export function OutilRemboursements({
  saison,
  participationsInitiales,
  montantFixeInitial,
}: {
  saison: string;
  participationsInitiales: ParticipationConcours[];
  montantFixeInitial: number;
}) {
  const router = useRouter();
  const [genereEnCours, setGenereEnCours] = useState(false);
  const [messageGeneration, setMessageGeneration] = useState<string | null>(null);
  const [montantFixe, setMontantFixe] = useState(montantFixeInitial);
  const [montantEnCours, setMontantEnCours] = useState(false);
  const [pdfEnCours, setPdfEnCours] = useState(false);

  const championnat = participationsInitiales.filter(
    (p) => p.type === 'Championnat_D2' || p.type === 'Promotion' || p.type === 'Concours_National'
  );
  const concours = participationsInitiales.filter((p) => p.type === 'Concours');

  async function telechargerPdf() {
    setPdfEnCours(true);
    try {
      const blob = await pdf(
        <RemboursementsPdf saison={saison} championnat={championnat} concours={concours} />
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Remboursements-concours-${saison}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setPdfEnCours(false);
    }
  }

  async function genererD2() {
    setGenereEnCours(true);
    setMessageGeneration(null);
    const resultat = await genererListeChampionnatD2(saison);
    setGenereEnCours(false);
    if (!resultat.ok) {
      setMessageGeneration(resultat.error);
      return;
    }
    setMessageGeneration(resultat.genere ? `${resultat.genere} ligne(s) ajoutée(s).` : 'Aucune nouvelle ligne (déjà à jour).');
    router.refresh();
  }

  async function majMontantFixe(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMontantEnCours(true);
    await enregistrerMontantRemboursementConcours(montantFixe);
    setMontantEnCours(false);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="rounded-2xl border border-ligne bg-sable-carte p-5">
        <form onSubmit={majMontantFixe} className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-[11.5px] text-encre-douce">
              Montant fixe championnat (par joueur, par rencontre extérieure)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.5"
                min="0"
                value={montantFixe}
                onChange={(e) => setMontantFixe(Number(e.target.value))}
                className="w-28 rounded-lg border border-ligne bg-sable px-3 py-2 text-[14px] outline-none focus:border-terracotta"
              />
              <span className="text-[13px] text-encre-douce">€</span>
            </div>
          </div>
          <button
            type="submit"
            disabled={montantEnCours}
            className="rounded-lg border border-ligne bg-sable px-3.5 py-2 text-[13px] font-medium text-encre-douce transition-colors hover:border-terracotta hover:text-terracotta disabled:opacity-50"
          >
            {montantEnCours ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </form>
      </div>

      <button
        type="button"
        onClick={telechargerPdf}
        disabled={pdfEnCours}
        className="inline-flex w-fit items-center gap-2 rounded-full border border-ligne bg-sable-carte px-4 py-2 text-[13px] font-medium text-encre-douce transition-colors hover:border-terracotta hover:text-terracotta disabled:opacity-50"
      >
        <FileDown size={15} />
        {pdfEnCours ? 'Génération…' : 'Télécharger les listes en PDF'}
      </button>

      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-xl italic">Liste 1 — Championnat (automatique)</h2>
          <button
            type="button"
            onClick={genererD2}
            disabled={genereEnCours}
            className="inline-flex items-center gap-2 rounded-full bg-terracotta px-4 py-2 text-[13px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <Sparkles size={14} />
            {genereEnCours ? 'Génération…' : 'Générer depuis les rencontres D2 extérieures'}
          </button>
        </div>
        {messageGeneration && <p className="mb-3 text-[12.5px] text-encre-douce">{messageGeneration}</p>}
        <ListeParticipations participations={championnat} vide="Aucune participation générée pour l'instant." />
      </section>

      <section>
        <h2 className="font-display mb-4 text-xl italic">Liste 2 — Autres concours (saisie manuelle)</h2>
        <ListeParticipations participations={concours} vide="Aucun concours saisi pour l'instant." />
      </section>
    </div>
  );
}

function ListeParticipations({ participations, vide }: { participations: ParticipationConcours[]; vide: string }) {
  if (!participations.length) {
    return <p className="text-[13.5px] text-encre-douce">{vide}</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {participations.map((p) => (
        <LigneParticipation key={p.id} participation={p} />
      ))}
    </div>
  );
}

function LigneParticipation({ participation: p }: { participation: ParticipationConcours }) {
  const router = useRouter();
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [montantCorrige, setMontantCorrige] = useState(p.montantFinal ?? 0);

  // Ligne "partenaire" d'un concours manuel : ne reçoit rien directement
  // (montantFinal null par construction, cf. trigger 0049) — pas d'action
  // de paiement, juste une trace informative.
  const estPartenaire = p.type === 'Concours' && p.chefEquipeId !== null && p.chefEquipeId !== p.personneId;

  async function agir(action: () => Promise<{ ok: boolean; error?: string }>) {
    setEnCours(true);
    setErreur(null);
    const resultat = await action();
    setEnCours(false);
    if (!resultat.ok) {
      setErreur(resultat.error ?? 'Erreur.');
      return;
    }
    router.refresh();
  }

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ligne p-3.5 text-[13px] ${
        p.horsPays ? 'bg-sable/60 opacity-70' : 'bg-sable-carte'
      }`}
    >
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <span className="font-medium text-encre">{p.personneNom}</span>
          <span className="rounded-full bg-sable px-2 py-0.5 text-[10.5px] text-encre-douce">{LIBELLE_TYPE[p.type]}</span>
          {estPartenaire && (
            <span className="rounded-full bg-marine/10 px-2 py-0.5 text-[10.5px] text-marine">
              partenaire de {p.chefEquipeNom}
            </span>
          )}
          {p.horsPays && (
            <span className="rounded-full bg-danger/10 px-2 py-0.5 text-[10.5px] text-danger">
              hors pays — règle non définie
            </span>
          )}
        </div>
        <span className="text-[12px] text-encre-douce">
          {formatDate(p.date)}
          {p.club ? ` · ${p.club}` : ''}
          {p.pays !== 'LU' ? ` (${p.pays})` : ''}
          {p.horsCalendrier ? ' · hors calendrier' : ''}
        </span>
        {erreur && <span className="text-[12px] text-danger">{erreur}</span>}
      </div>

      {estPartenaire ? (
        <span className="text-[12.5px] text-encre-douce">à répartir par le chef d&apos;équipe</span>
      ) : p.horsPays && p.montantFinal == null ? (
        <div className="flex items-center gap-2">
          <input
            type="number"
            step="0.5"
            min="0"
            value={montantCorrige}
            onChange={(e) => setMontantCorrige(Number(e.target.value))}
            className="w-24 rounded-lg border border-ligne bg-sable px-2 py-1.5 text-[13px] outline-none focus:border-terracotta"
          />
          <button
            type="button"
            disabled={enCours}
            onClick={() => agir(() => corrigerMontantParticipation(p.id, montantCorrige))}
            className="rounded-lg border border-ligne bg-sable px-3 py-1.5 text-[12.5px] font-medium text-encre-douce hover:border-terracotta hover:text-terracotta"
          >
            Définir
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <span className="font-score text-[15px] text-terracotta">
            {p.montantFinal != null ? `${p.montantFinal.toFixed(2)} €` : '—'}
          </span>
          {p.statut === 'paye' ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-pin/10 px-2.5 py-1 text-[11.5px] text-pin">
              <Check size={12} /> Payé le {p.payeLe ? formatDate(p.payeLe.slice(0, 10)) : ''}
            </span>
          ) : (
            <>
              {p.statut === 'en_attente' && (
                <button
                  type="button"
                  disabled={enCours}
                  onClick={() => agir(() => validerParticipation(p.id))}
                  className="rounded-lg border border-ligne bg-sable px-3 py-1.5 text-[12.5px] font-medium text-encre-douce hover:border-terracotta hover:text-terracotta"
                >
                  Valider
                </button>
              )}
              {p.statut === 'valide' && (
                <button
                  type="button"
                  disabled={enCours}
                  onClick={() => agir(() => marquerParticipationPayee(p.id))}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-terracotta px-3 py-1.5 text-[12.5px] font-medium text-white hover:opacity-90"
                >
                  <Euro size={12} />
                  Marquer payé
                </button>
              )}
            </>
          )}
          <button
            type="button"
            disabled={enCours || p.statut === 'paye'}
            onClick={() => agir(() => supprimerParticipation(p.id))}
            aria-label="Supprimer"
            className="text-encre-douce opacity-50 hover:text-danger hover:opacity-100 disabled:opacity-20"
          >
            <Trash2 size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
