'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { createClient } from '@/lib/supabase/client';
import { creerParticipationManuelle } from '@/lib/actions/remboursements';

type Etat = 'verification' | 'refuse' | 'chargement' | 'pret';
type Licencie = { id: number; nom: string; prenom: string };
type MaParticipation = {
  id: number;
  type: string;
  personne_nom: string;
  chef_equipe_id: number | null;
  chef_equipe_nom: string | null;
  date: string;
  club: string | null;
  hors_pays: boolean;
  montant_final: number | null;
  statut: string;
};

const LIBELLE_TYPE: Record<string, string> = {
  Championnat_D2: 'National D2',
  Promotion: 'Promotion',
  Concours: 'Concours',
};
const LIBELLE_STATUT: Record<string, string> = { en_attente: 'En attente', valide: 'Validé', paye: 'Payé' };

function formatDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** Se charge côté client (même principe que StatistiquesD2.tsx/
 *  PropositionEquipeIA.tsx) : la vérification "licencié" et la lecture de
 *  `personnes` (via RPC security definer) dépendent de la session,
 *  incompatibles avec un Server Component qui devrait rester léger. */
export function SaisieConcoursEtSuivi({ saison }: { saison: string }) {
  const [etat, setEtat] = useState<Etat>('verification');
  const [licencies, setLicencies] = useState<Licencie[]>([]);
  const [monId, setMonId] = useState<number | null>(null);
  const [participations, setParticipations] = useState<MaParticipation[]>([]);

  async function recharger() {
    const supabase = createClient();
    const [{ data: licenciesData }, { data: participationsData }] = await Promise.all([
      supabase.rpc('licencies_saison', { p_saison: saison }),
      supabase.rpc('mes_participations_concours', { p_saison: saison }),
    ]);
    setLicencies((licenciesData ?? []) as Licencie[]);
    setParticipations((participationsData ?? []) as MaParticipation[]);
  }

  useEffect(() => {
    let annule = false;
    const supabase = createClient();
    supabase.rpc('est_licencie', { p_saison: saison }).then(async ({ data: licencie }) => {
      if (annule) return;
      if (!licencie) {
        setEtat('refuse');
        return;
      }
      setEtat('chargement');
      const { data: id } = await supabase.rpc('mon_id_personne');
      if (annule) return;
      setMonId(id);
      await recharger();
      if (annule) return;
      setEtat('pret');
    });
    return () => {
      annule = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saison]);

  if (etat === 'verification' || etat === 'chargement') {
    return (
      <div className="rounded-2xl border border-ligne bg-sable-carte p-6 text-[13.5px] text-encre-douce">
        Chargement…
      </div>
    );
  }

  if (etat === 'refuse') {
    return (
      <div className="rounded-2xl border border-ligne bg-sable-carte p-6 text-center text-[13.5px] text-encre-douce">
        La déclaration de concours est réservée aux licenciés.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <FormulaireDeclaration saison={saison} monId={monId} licencies={licencies} onEnregistre={recharger} />

      <section>
        <h2 className="font-display mb-4 text-xl italic">Mes participations</h2>
        {!participations.length ? (
          <p className="text-[13.5px] text-encre-douce">Aucune participation enregistrée pour l&apos;instant.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {participations.map((p) => {
              const estChef = p.chef_equipe_id !== null && monId === p.chef_equipe_id;
              const estPartenaire = p.chef_equipe_id !== null && p.chef_equipe_id !== monId;
              return (
                <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ligne bg-sable-carte p-3.5 text-[13px]">
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-sable px-2 py-0.5 text-[10.5px] text-encre-douce">{LIBELLE_TYPE[p.type]}</span>
                      {estChef && <span className="rounded-full bg-terracotta/10 px-2 py-0.5 text-[10.5px] text-terracotta">chef d&apos;équipe</span>}
                      {estPartenaire && <span className="text-[12px] text-encre-douce">via {p.chef_equipe_nom}</span>}
                    </div>
                    <span className="text-[12px] text-encre-douce">
                      {formatDate(p.date)}
                      {p.club ? ` · ${p.club}` : ''}
                      {p.hors_pays ? ' · hors pays (règle non définie)' : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {estPartenaire ? (
                      <span className="text-[12.5px] text-encre-douce">à répartir par {p.chef_equipe_nom}</span>
                    ) : (
                      <span className="font-score text-[15px] text-terracotta">
                        {p.montant_final != null ? `${p.montant_final.toFixed(2)} €` : '—'}
                      </span>
                    )}
                    <span className="rounded-full bg-sable px-2 py-0.5 text-[11px] text-encre-douce">
                      {LIBELLE_STATUT[p.statut] ?? p.statut}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function FormulaireDeclaration({
  saison,
  monId,
  licencies,
  onEnregistre,
}: {
  saison: string;
  monId: number | null;
  licencies: Licencie[];
  onEnregistre: () => Promise<void>;
}) {
  const [partenaires, setPartenaires] = useState<Set<number>>(new Set());
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [succes, setSucces] = useState(false);

  function basculerPartenaire(id: number) {
    setPartenaires((prev) => {
      const suivant = new Set(prev);
      if (suivant.has(id)) suivant.delete(id);
      else suivant.add(id);
      return suivant;
    });
  }

  async function soumettre(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErreur(null);
    setSucces(false);
    setEnCours(true);
    const formData = new FormData(e.currentTarget);
    const resultat = await creerParticipationManuelle({
      saison,
      date: String(formData.get('date') || ''),
      club: String(formData.get('club') || ''),
      pays: String(formData.get('pays') || 'LU'),
      horsCalendrier: formData.get('horsCalendrier') === 'on',
      horsPays: formData.get('horsPays') === 'on',
      inscriptionMontant: Number(formData.get('inscriptionMontant') || 0),
      repasInclus: formData.get('repasInclus') === 'on',
      partenaireIds: [...partenaires],
      notes: String(formData.get('notes') || ''),
    });
    setEnCours(false);
    if (!resultat.ok) {
      setErreur(resultat.error);
      return;
    }
    setSucces(true);
    setPartenaires(new Set());
    (e.target as HTMLFormElement).reset();
    await onEnregistre();
  }

  const autresLicencies = licencies.filter((l) => l.id !== monId);

  return (
    <div className="rounded-2xl border border-ligne bg-sable-carte p-6">
      <h2 className="font-display mb-4 text-xl italic">Déclarer un concours (chef d&apos;équipe)</h2>
      <form onSubmit={soumettre} className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-[11.5px] text-encre-douce">Date</label>
            <input
              type="date"
              name="date"
              required
              className="w-full rounded-lg border border-ligne bg-sable px-3 py-2 text-[14px] outline-none focus:border-terracotta"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11.5px] text-encre-douce">Club / lieu</label>
            <input
              name="club"
              required
              placeholder="Ex. Kayl"
              className="w-full rounded-lg border border-ligne bg-sable px-3 py-2 text-[14px] outline-none focus:border-terracotta"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-[11.5px] text-encre-douce">Pays</label>
            <input
              name="pays"
              defaultValue="LU"
              className="w-full rounded-lg border border-ligne bg-sable px-3 py-2 text-[14px] outline-none focus:border-terracotta"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11.5px] text-encre-douce">Montant d&apos;inscription payé (€)</label>
            <input
              type="number"
              name="inscriptionMontant"
              step="0.5"
              min="0"
              required
              placeholder="50"
              className="w-full rounded-lg border border-ligne bg-sable px-3 py-2 text-[14px] outline-none focus:border-terracotta"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-4 text-[13px] text-encre">
          <label className="flex items-center gap-1.5">
            <input type="checkbox" name="repasInclus" className="accent-terracotta" />
            Repas inclus dans l&apos;inscription (remboursé à 50%)
          </label>
          <label className="flex items-center gap-1.5">
            <input type="checkbox" name="horsCalendrier" className="accent-terracotta" />
            Hors calendrier fédéral
          </label>
          <label className="flex items-center gap-1.5 opacity-70">
            <input type="checkbox" name="horsPays" className="accent-terracotta" />
            Hors pays (règle non encore définie — montant à valider manuellement par la trésorerie)
          </label>
        </div>

        <div>
          <label className="mb-1.5 block text-[11.5px] text-encre-douce">
            Partenaires (le remboursement te sera versé à toi, à charge de redistribuer)
          </label>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            {autresLicencies.map((l) => {
              const coche = partenaires.has(l.id);
              return (
                <label
                  key={l.id}
                  className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12.5px] ${coche ? 'bg-terracotta/10 text-encre' : 'text-encre-douce'}`}
                >
                  <input type="checkbox" checked={coche} onChange={() => basculerPartenaire(l.id)} className="accent-terracotta" />
                  {l.prenom} {l.nom}
                </label>
              );
            })}
          </div>
        </div>

        <textarea
          name="notes"
          placeholder="Notes (optionnel)"
          rows={2}
          className="rounded-lg border border-ligne bg-sable px-3 py-2 text-[13.5px] outline-none focus:border-terracotta"
        />

        {erreur && <p className="text-[12.5px] text-danger">{erreur}</p>}
        {succes && <p className="text-[12.5px] text-pin">Concours enregistré.</p>}

        <button
          type="submit"
          disabled={enCours}
          className="self-start rounded-lg bg-terracotta px-4 py-2 text-[13.5px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {enCours ? 'Enregistrement…' : 'Déclarer ce concours'}
        </button>
      </form>
    </div>
  );
}
