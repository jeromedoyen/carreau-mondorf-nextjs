'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, ChevronUp, Plus } from 'lucide-react';
import {
  creerConcoursExterieur,
  enregistrerBaremeIndemnite,
  enregistrerParticipation,
  validerParticipation,
  marquerParticipationPayee,
} from '@/lib/actions/concours';
import type { BaremeIndemnite, ConcoursExterieur, ParticipationExterieure, FormatConcours, TypeConcours } from '@/lib/concours';

const TYPES_CONCOURS: TypeConcours[] = [
  'CHAMPIONNAT_D2',
  'CHAMPIONNAT_PROMOTION',
  'CHAMPIONNAT_NATIONAL',
  'TOURNOI_CALENDRIER',
  'TOURNOI_HORS_CALENDRIER',
];
const FORMATS: FormatConcours[] = ['TETE_A_TETE', 'DOUBLETTE', 'TRIPLETTE'];
const LABEL_STATUT_REMB: Record<string, string> = {
  non_calcule: 'Non calculé',
  a_valider: 'À valider',
  valide_tresorier: 'Validé — à payer',
  paye: 'Payé',
};
const COULEUR_STATUT_REMB: Record<string, string> = {
  non_calcule: 'bg-encre-douce/15 text-encre-douce',
  a_valider: 'bg-marine/15 text-marine',
  valide_tresorier: 'bg-terracotta/15 text-terracotta',
  paye: 'bg-succes/15 text-succes',
};

function SectionRepliable({ titre, children }: { titre: string; children: React.ReactNode }) {
  const [ouvert, setOuvert] = useState(false);
  return (
    <div className="rounded-2xl border border-ligne bg-sable-carte p-5">
      <button
        type="button"
        onClick={() => setOuvert(!ouvert)}
        className="flex w-full items-center justify-between text-left"
      >
        <h3 className="font-display text-[15px]">{titre}</h3>
        {ouvert ? <ChevronUp size={16} className="text-encre-douce/60" /> : <ChevronDown size={16} className="text-encre-douce/60" />}
      </button>
      {ouvert && <div className="mt-4 flex flex-col gap-3">{children}</div>}
    </div>
  );
}

/** Champs secondaires (retour Jérôme 01/08/2026 : "trop compliqué, trop de
 *  paramètres") — restent DANS le formulaire (donc soumis avec leurs
 *  valeurs par défaut via `hidden`, pas retirés du DOM) mais masqués tant
 *  qu'on ne clique pas sur "Options avancées". */
function OptionsAvancees({ children }: { children: React.ReactNode }) {
  const [ouvert, setOuvert] = useState(false);
  return (
    <div className="col-span-full">
      <button
        type="button"
        onClick={() => setOuvert(!ouvert)}
        className="text-[12px] text-encre-douce underline hover:text-terracotta"
      >
        {ouvert ? 'Masquer les options avancées' : 'Options avancées'}
      </button>
      <div className={`mt-2.5 grid grid-cols-2 gap-2.5 sm:grid-cols-3 ${ouvert ? '' : 'hidden'}`}>{children}</div>
    </div>
  );
}

const CHAMP = 'rounded-lg border border-ligne bg-sable px-3 py-2 text-[13.5px] outline-none focus:border-terracotta';

export function RemboursementsClient({
  participationsInitiales,
  concoursInitial,
  baremesInitiaux,
  licencies,
}: {
  participationsInitiales: ParticipationExterieure[];
  concoursInitial: ConcoursExterieur[];
  baremesInitiaux: BaremeIndemnite[];
  licencies: { id: number; nom: string }[];
}) {
  const router = useRouter();
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  async function soumettre(action: () => Promise<{ ok: boolean; error?: string }>) {
    setErreur(null);
    setEnCours(true);
    const resultat = await action();
    setEnCours(false);
    if (!resultat.ok) {
      setErreur(resultat.error ?? 'Erreur inconnue.');
      return;
    }
    router.refresh();
  }

  async function onCreerBareme(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await soumettre(() =>
      enregistrerBaremeIndemnite({
        typeConcours: String(fd.get('typeConcours')) as TypeConcours,
        format: String(fd.get('format')) as FormatConcours,
        pays: String(fd.get('pays') || 'LU'),
        montantBase: Number(fd.get('montantBase')),
        ratioRepas: fd.get('ratioRepas') ? Number(fd.get('ratioRepas')) : undefined,
        anneeSportive: String(fd.get('anneeSportive')),
      })
    );
    e.currentTarget.reset();
  }

  async function onCreerConcours(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await soumettre(() =>
      creerConcoursExterieur({
        date: String(fd.get('date')),
        lieu: String(fd.get('lieu')),
        typeConcours: String(fd.get('typeConcours')) as TypeConcours,
        format: String(fd.get('format')) as FormatConcours,
        pays: String(fd.get('pays') || 'LU'),
        estCalendrier: fd.get('estCalendrier') === 'on',
      })
    );
    e.currentTarget.reset();
  }

  async function onEnregistrerParticipation(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const montantManuel = fd.get('montantManuel');
    await soumettre(() =>
      enregistrerParticipation({
        concoursId: Number(fd.get('concoursId')),
        joueurId: Number(fd.get('joueurId')),
        statutParticipation: String(fd.get('statutParticipation')) as 'prevu' | 'confirme' | 'annule' | 'joue',
        montantManuel: montantManuel ? Number(montantManuel) : undefined,
      })
    );
    e.currentTarget.reset();
  }

  return (
    <div className="flex flex-col gap-4">
      {erreur && <p className="text-[12.5px] text-danger">{erreur}</p>}

      <SectionRepliable titre="Barèmes d'indemnités">
        <form onSubmit={onCreerBareme} className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          <select name="typeConcours" required className={CHAMP}>
            {TYPES_CONCOURS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <select name="format" required className={CHAMP}>
            {FORMATS.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
          <input name="montantBase" type="number" step="0.01" min={0} required placeholder="Montant de base (€)" className={CHAMP} />
          <input name="anneeSportive" required defaultValue={String(new Date().getFullYear())} className={CHAMP} />
          <OptionsAvancees>
            <input name="pays" defaultValue="LU" placeholder="Pays (LU)" className={CHAMP} />
            <input name="ratioRepas" type="number" step="0.01" min={0} max={1} placeholder="Ratio repas (0-1, optionnel)" className={CHAMP} />
          </OptionsAvancees>
          <button type="submit" disabled={enCours} className="col-span-full self-start rounded-lg bg-terracotta px-4 py-2 text-[13px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50">
            <Plus size={14} className="mr-1 inline" />
            Ajouter le barème
          </button>
        </form>
        <div className="mt-2 flex flex-col gap-1">
          {baremesInitiaux.map((b) => (
            <div key={b.id} className="flex items-center justify-between text-[12.5px]">
              <span className="text-encre-douce">{b.typeConcours} · {b.format} · {b.pays} · {b.anneeSportive}</span>
              <span className="text-encre">{b.montantBase.toFixed(2)} €{b.ratioRepas ? ` (× ${b.ratioRepas})` : ''}</span>
            </div>
          ))}
        </div>
      </SectionRepliable>

      <SectionRepliable titre="Nouveau concours">
        <form onSubmit={onCreerConcours} className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          <input name="date" type="date" required className={CHAMP} />
          <input name="lieu" required placeholder="Lieu" className={CHAMP} />
          <select name="typeConcours" required className={CHAMP}>
            {TYPES_CONCOURS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <select name="format" required className={CHAMP}>
            {FORMATS.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
          <OptionsAvancees>
            <input name="pays" defaultValue="LU" placeholder="Pays (LU)" className={CHAMP} />
            <label className="flex items-center gap-2 text-[12.5px] text-encre-douce">
              <input name="estCalendrier" type="checkbox" defaultChecked />
              Au calendrier fédéral
            </label>
          </OptionsAvancees>
          <button type="submit" disabled={enCours} className="col-span-full self-start rounded-lg bg-terracotta px-4 py-2 text-[13px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50">
            <Plus size={14} className="mr-1 inline" />
            Créer le concours
          </button>
        </form>
      </SectionRepliable>

      <SectionRepliable titre="Nouvelle participation">
        <form onSubmit={onEnregistrerParticipation} className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          <select name="concoursId" required className={CHAMP}>
            <option value="" disabled selected>Concours…</option>
            {concoursInitial.map((c) => (
              <option key={c.id} value={c.id}>{c.date} · {c.lieu} · {c.typeConcours}</option>
            ))}
          </select>
          <select name="joueurId" required className={CHAMP}>
            <option value="" disabled selected>Joueur…</option>
            {licencies.map((l) => (
              <option key={l.id} value={l.id}>{l.nom}</option>
            ))}
          </select>
          <OptionsAvancees>
            <select name="statutParticipation" required defaultValue="joue" className={CHAMP}>
              <option value="prevu">Prévu</option>
              <option value="confirme">Confirmé</option>
              <option value="joue">Joué</option>
              <option value="annule">Annulé</option>
            </select>
            <input name="montantManuel" type="number" step="0.01" min={0} placeholder="Montant manuel (optionnel)" className={CHAMP} />
          </OptionsAvancees>
          <button type="submit" disabled={enCours} className="col-span-full self-start rounded-lg bg-terracotta px-4 py-2 text-[13px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50">
            <Plus size={14} className="mr-1 inline" />
            Enregistrer la participation
          </button>
        </form>
      </SectionRepliable>

      <div className="rounded-2xl border border-ligne bg-sable-carte p-5">
        <h3 className="font-display mb-4 text-[15px]">Participations</h3>
        {participationsInitiales.length === 0 ? (
          <p className="text-[13px] text-encre-douce">Aucune participation enregistrée.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {participationsInitiales.map((p) => (
              <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-ligne py-2.5 text-[13px] first:border-t-0">
                <div>
                  <span className="font-medium text-encre">{p.joueurNom}</span>
                  <span className="ml-2 text-[12px] text-encre-douce">
                    {p.concours.date} · {p.concours.lieu} · {p.concours.typeConcours} · {p.concours.format}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {p.montantFinal != null && <span className="font-score text-terracotta">{p.montantFinal.toFixed(2)} €</span>}
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${COULEUR_STATUT_REMB[p.statutRemboursement]}`}>
                    {LABEL_STATUT_REMB[p.statutRemboursement]}
                  </span>
                  {p.statutRemboursement === 'a_valider' && (
                    <button
                      type="button"
                      onClick={() => soumettre(() => validerParticipation(p.id))}
                      disabled={enCours}
                      className="rounded-lg border border-ligne px-2.5 py-1 text-[12px] font-medium text-encre transition-colors hover:border-terracotta hover:text-terracotta disabled:opacity-50"
                    >
                      Valider
                    </button>
                  )}
                  {p.statutRemboursement === 'valide_tresorier' && (
                    <button
                      type="button"
                      onClick={() => soumettre(() => marquerParticipationPayee(p.id, 'Virement'))}
                      disabled={enCours}
                      className="rounded-lg bg-succes px-2.5 py-1 text-[12px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                    >
                      Marquer payé
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
