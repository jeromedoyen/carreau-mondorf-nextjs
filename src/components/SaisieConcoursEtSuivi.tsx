'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { Mic } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { creerParticipationManuelle } from '@/lib/actions/remboursements';
import { sansAccentsMinuscules } from '@/lib/normalisationTexte';

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
  Concours_National: 'Championnat national',
  Concours: 'Concours',
};
const LIBELLE_STATUT: Record<string, string> = {
  a_clarifier: 'Précisions demandées',
  en_attente: 'En attente',
  valide: 'Validé',
  paye: 'Payé',
};

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
      {/* Entrée principale de la page : sur le terrain, c'est le geste
          attendu. Le formulaire détaillé reste dessous pour les cas que le
          vocal ne couvre pas (retour Jérôme, 03/08/2026 : "j'aimerais
          plutôt voir un gros bouton d'enregistrement"). */}
      <Link
        href="/concours/declarer-vocal"
        className="flex flex-col items-center gap-3 rounded-2xl bg-terracotta px-6 py-8 text-center text-white transition-opacity hover:opacity-90"
      >
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/15">
          <Mic className="h-8 w-8" strokeWidth={1.5} />
        </span>
        <span className="font-display text-2xl italic">Déclarer au vocal</span>
        <span className="max-w-xs text-[13px] text-white/80">
          Enregistre-toi au bord du terrain et prends une photo de l&apos;équipe — l&apos;app remplit le reste.
        </span>
      </Link>

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
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] ${
                        p.statut === 'a_clarifier'
                          ? 'bg-terracotta/10 text-terracotta'
                          : 'bg-sable text-encre-douce'
                      }`}
                      title={
                        p.statut === 'a_clarifier'
                          ? "Déclaration vocale incomplète — réponds à l'e-mail reçu pour la compléter."
                          : undefined
                      }
                    >
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

type TypePartie = 'tete_a_tete' | 'doublette' | 'triplette';

const PARTENAIRES_REQUIS: Record<TypePartie, number> = {
  tete_a_tete: 0,
  doublette: 1,
  triplette: 2,
};

const LIBELLE_TYPE_PARTIE: Record<TypePartie, string> = {
  tete_a_tete: 'Tête-à-tête',
  doublette: 'Doublette',
  triplette: 'Triplette',
};

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
  const [typePartie, setTypePartie] = useState<TypePartie>('doublette');
  // Un slot par partenaire requis selon le type de partie (0/1/2) —
  // remplace la grille de cases à cocher (retour Jérôme, 02/08/2026 :
  // "si j'ai 70 personnes je préfère chercher le nom") par une recherche
  // par nom, un partenaire à la fois.
  const [partenaires, setPartenaires] = useState<(number | null)[]>([null]);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [succes, setSucces] = useState(false);

  function changerTypePartie(t: TypePartie) {
    setTypePartie(t);
    setPartenaires(Array.from({ length: PARTENAIRES_REQUIS[t] }, () => null));
  }

  async function soumettre(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErreur(null);
    setSucces(false);
    const partenaireIds = partenaires.filter((id): id is number => id != null);
    if (partenaireIds.length !== PARTENAIRES_REQUIS[typePartie]) {
      setErreur(
        `Choisis ${PARTENAIRES_REQUIS[typePartie]} partenaire(s) pour une ${LIBELLE_TYPE_PARTIE[typePartie].toLowerCase()}.`
      );
      return;
    }
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
      partenaireIds,
      notes: String(formData.get('notes') || ''),
    });
    setEnCours(false);
    if (!resultat.ok) {
      setErreur(resultat.error);
      return;
    }
    setSucces(true);
    setPartenaires(Array.from({ length: PARTENAIRES_REQUIS[typePartie] }, () => null));
    (e.target as HTMLFormElement).reset();
    await onEnregistre();
  }

  const autresLicencies = licencies.filter((l) => l.id !== monId);

  return (
    <div className="rounded-2xl border border-ligne bg-sable-carte p-6">
      <h2 className="font-display mb-4 text-xl italic">Déclarer une participation à un concours (chef d&apos;équipe)</h2>
      <form onSubmit={soumettre} className="flex flex-col gap-3">
        <div className="grid grid-cols-3 gap-3">
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
          <div>
            <label className="mb-1 block text-[11.5px] text-encre-douce">Pays</label>
            <input
              name="pays"
              defaultValue="LU"
              className="w-full rounded-lg border border-ligne bg-sable px-3 py-2 text-[14px] outline-none focus:border-terracotta"
            />
          </div>
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
            className="w-full max-w-[160px] rounded-lg border border-ligne bg-sable px-3 py-2 text-[14px] outline-none focus:border-terracotta"
          />
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
          <label className="mb-1.5 block text-[11.5px] text-encre-douce">Type de partie</label>
          <div className="flex gap-1.5">
            {(Object.keys(LIBELLE_TYPE_PARTIE) as TypePartie[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => changerTypePartie(t)}
                className={`rounded-full px-3 py-1.5 text-[12.5px] transition-colors ${
                  typePartie === t ? 'bg-terracotta text-white' : 'bg-sable text-encre-douce hover:text-encre'
                }`}
              >
                {LIBELLE_TYPE_PARTIE[t]}
              </button>
            ))}
          </div>
        </div>

        {PARTENAIRES_REQUIS[typePartie] > 0 && (
          <div>
            <label className="mb-1.5 block text-[11.5px] text-encre-douce">
              Partenaire{PARTENAIRES_REQUIS[typePartie] > 1 ? 's' : ''} (le remboursement te sera versé à toi, à
              charge de redistribuer)
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              {partenaires.map((idSelectionne, i) => (
                <SelecteurPartenaire
                  key={i}
                  licencies={autresLicencies}
                  exclureIds={partenaires.filter((id, j) => j !== i && id != null) as number[]}
                  valeur={idSelectionne}
                  onChange={(id) =>
                    setPartenaires((prev) => prev.map((p, j) => (j === i ? id : p)))
                  }
                />
              ))}
            </div>
          </div>
        )}

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
          {enCours ? 'Enregistrement…' : 'Déclarer cette participation'}
        </button>
      </form>
    </div>
  );
}

/** Recherche par nom plutôt qu'une case à cocher parmi tous les licenciés
 *  (retour Jérôme, 02/08/2026 : "si j'ai 70 personnes je préfère chercher
 *  le nom") — un slot par partenaire requis selon le type de partie. */
function SelecteurPartenaire({
  licencies,
  exclureIds,
  valeur,
  onChange,
}: {
  licencies: Licencie[];
  exclureIds: number[];
  valeur: number | null;
  onChange: (id: number | null) => void;
}) {
  const [filtre, setFiltre] = useState('');
  const [ouvert, setOuvert] = useState(false);

  const selectionne = licencies.find((l) => l.id === valeur) ?? null;

  const resultats = useMemo(() => {
    if (!filtre.trim()) return [];
    const q = sansAccentsMinuscules(filtre);
    return licencies
      .filter((l) => !exclureIds.includes(l.id))
      .filter((l) => sansAccentsMinuscules(`${l.prenom} ${l.nom}`).includes(q))
      .slice(0, 8);
  }, [licencies, exclureIds, filtre]);

  if (selectionne) {
    return (
      <div className="flex items-center gap-1.5 rounded-lg bg-terracotta/10 px-3 py-2 text-[13px] text-encre">
        <span className="flex-1">
          {selectionne.prenom} {selectionne.nom}
        </span>
        <button
          type="button"
          onClick={() => onChange(null)}
          className="text-encre-douce hover:text-danger"
          aria-label="Changer de partenaire"
        >
          ×
        </button>
      </div>
    );
  }

  return (
    <div className="relative flex-1">
      <input
        type="text"
        value={filtre}
        onChange={(e) => setFiltre(e.target.value)}
        onFocus={() => setOuvert(true)}
        onBlur={() => setTimeout(() => setOuvert(false), 150)}
        placeholder="Chercher un nom…"
        className="w-full rounded-lg border border-ligne bg-sable px-3 py-2 text-[13px] outline-none focus:border-terracotta"
      />
      {ouvert && filtre.trim() && (
        <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-ligne bg-sable-carte shadow-lg">
          {resultats.length ? (
            resultats.map((l) => (
              <button
                key={l.id}
                type="button"
                onMouseDown={() => {
                  onChange(l.id);
                  setFiltre('');
                }}
                className="block w-full px-3 py-2 text-left text-[13px] text-encre hover:bg-terracotta/10"
              >
                {l.prenom} {l.nom}
              </button>
            ))
          ) : (
            <p className="px-3 py-2 text-[12.5px] text-encre-douce">Aucun résultat.</p>
          )}
        </div>
      )}
    </div>
  );
}
