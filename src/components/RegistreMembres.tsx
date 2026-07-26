'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MessageSquareText, Pencil, Trash2 } from 'lucide-react';
import { supprimerMembre } from '@/lib/actions/membres';
import type { PersonneAvecAdhesion } from '@/lib/types';

function formatDate(iso: string | null) {
  if (!iso) return '—';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/** Valeurs distinctes triées, pour peupler un <select> de filtre à partir
 *  des données réellement présentes plutôt qu'une liste figée — évite un
 *  filtre vide ou incomplet si de nouvelles catégories/classes apparaissent. */
function valeursDistinctes(personnes: PersonneAvecAdhesion[], extraire: (p: PersonneAvecAdhesion) => string | null) {
  return Array.from(new Set(personnes.map(extraire).filter((v): v is string => !!v))).sort((a, b) =>
    a.localeCompare(b, 'fr')
  );
}

const PAIEMENT_OPTIONS = [
  { value: '', label: 'Tous les paiements' },
  { value: 'cotisation-non', label: 'Cotisation impayée' },
  { value: 'cotisation-oui', label: 'Cotisation payée' },
  { value: 'licence-non', label: 'Licence impayée' },
  { value: 'licence-oui', label: 'Licence payée' },
] as const;

const CLASSE_SELECT = 'rounded-lg border border-ligne bg-sable px-2.5 py-1.5 text-[12.5px] text-encre outline-none focus:border-terracotta';

/** Passé en Client Component (édition/suppression, Phase E ; filtres/stats,
 *  26/07/2026 — port du tableau de bord Index.html v1, sur des données déjà
 *  chargées côté serveur donc filtrage purement local, pas de round-trip).
 *  La RLS ("lecture CA uniquement") continue de protéger les données, ce
 *  composant ne fait qu'afficher ce que le serveur lui a déjà transmis. */
export function RegistreMembres({ personnes }: { personnes: PersonneAvecAdhesion[] }) {
  const router = useRouter();

  const [recherche, setRecherche] = useState('');
  const [type, setType] = useState('');
  const [categorie, setCategorie] = useState('');
  const [classe, setClasse] = useState('');
  const [nationalite, setNationalite] = useState('');
  const [droitImage, setDroitImage] = useState('');
  const [paiement, setPaiement] = useState('');

  const types = useMemo(() => valeursDistinctes(personnes, (p) => p.adhesion?.type ?? null), [personnes]);
  const categories = useMemo(() => valeursDistinctes(personnes, (p) => p.adhesion?.categorie ?? null), [personnes]);
  const classes = useMemo(() => valeursDistinctes(personnes, (p) => p.adhesion?.classe ?? null), [personnes]);
  const nationalites = useMemo(() => valeursDistinctes(personnes, (p) => p.nationalite), [personnes]);

  const stats = useMemo(() => {
    const licencies = personnes.filter((p) => p.adhesion?.type === 'Licencié');
    const nonLicencies = personnes.filter((p) => p.adhesion && p.adhesion.type !== 'Licencié');
    const droitImgAccorde = personnes.filter((p) => p.droitImage).length;
    const cotisationsPayees = personnes.filter((p) => p.adhesion?.cotisationPayee).length;
    const licencesPayees = licencies.filter((p) => p.adhesion?.licencePayee).length;
    return {
      total: personnes.length,
      licencies: licencies.length,
      nonLicencies: nonLicencies.length,
      cotisationsPayees,
      cotisationsImpayees: personnes.filter((p) => p.adhesion).length - cotisationsPayees,
      licencesPayees,
      licencesImpayees: licencies.length - licencesPayees,
      droitImgAccorde,
    };
  }, [personnes]);

  const filtrees = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    return personnes.filter((p) => {
      if (q) {
        const cible = `${p.nom} ${p.prenom} ${p.email ?? ''} ${p.codePostalVille ?? ''}`.toLowerCase();
        if (!cible.includes(q)) return false;
      }
      if (type && p.adhesion?.type !== type) return false;
      if (categorie && p.adhesion?.categorie !== categorie) return false;
      if (classe && p.adhesion?.classe !== classe) return false;
      if (nationalite && p.nationalite !== nationalite) return false;
      if (droitImage === 'oui' && !p.droitImage) return false;
      if (droitImage === 'non' && p.droitImage) return false;
      if (paiement === 'cotisation-oui' && !p.adhesion?.cotisationPayee) return false;
      if (paiement === 'cotisation-non' && p.adhesion?.cotisationPayee) return false;
      if (paiement === 'licence-oui' && !p.adhesion?.licencePayee) return false;
      if (paiement === 'licence-non' && p.adhesion?.licencePayee) return false;
      return true;
    });
  }, [personnes, recherche, type, categorie, classe, nationalite, droitImage, paiement]);

  function reinitialiser() {
    setRecherche('');
    setType('');
    setCategorie('');
    setClasse('');
    setNationalite('');
    setDroitImage('');
    setPaiement('');
  }

  const filtresActifs = !!(recherche || type || categorie || classe || nationalite || droitImage || paiement);

  async function supprimer(id: number, nomComplet: string) {
    if (!window.confirm(`Retirer ${nomComplet} du registre ?`)) return;
    await supprimerMembre(id);
    router.refresh();
  }

  if (!personnes.length) {
    return (
      <div className="rounded-2xl border border-ligne bg-sable-carte p-6 text-[13.5px] text-encre-douce">
        Aucun membre trouvé pour cette année (ou aucune donnée encore importée).
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Licenciés', valeur: stats.licencies },
          { label: 'Membres non-licenciés', valeur: stats.nonLicencies },
          {
            label: 'Cotisations',
            valeur: `${stats.cotisationsPayees} payées`,
            sous: stats.cotisationsImpayees > 0 ? `${stats.cotisationsImpayees} en attente` : 'tout est à jour',
          },
          {
            label: 'Licences',
            valeur: `${stats.licencesPayees} payées`,
            sous: stats.licencesImpayees > 0 ? `${stats.licencesImpayees} en attente` : 'tout est à jour',
          },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-ligne bg-sable-carte p-4">
            <p className="text-[11px] uppercase tracking-wide text-encre-douce/60">{s.label}</p>
            <p className="font-score mt-1 text-2xl text-encre">{s.valeur}</p>
            {'sous' in s && s.sous && <p className="mt-0.5 text-[11.5px] text-encre-douce">{s.sous}</p>}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-ligne bg-sable-carte p-3">
        <input
          type="text"
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          placeholder="Rechercher un nom, prénom, email, ville…"
          className="min-w-[220px] flex-1 rounded-lg border border-ligne bg-sable px-3 py-1.5 text-[13px] text-encre outline-none focus:border-terracotta"
        />
        <select value={type} onChange={(e) => setType(e.target.value)} className={CLASSE_SELECT}>
          <option value="">Tous les types</option>
          {types.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
        <select value={categorie} onChange={(e) => setCategorie(e.target.value)} className={CLASSE_SELECT}>
          <option value="">Toutes catégories</option>
          {categories.map((v) => (
            <option key={v} value={v}>
              Catégorie {v}
            </option>
          ))}
        </select>
        <select value={classe} onChange={(e) => setClasse(e.target.value)} className={CLASSE_SELECT}>
          <option value="">Toutes classes</option>
          {classes.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
        <select value={nationalite} onChange={(e) => setNationalite(e.target.value)} className={CLASSE_SELECT}>
          <option value="">Toutes nationalités</option>
          {nationalites.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
        <select value={droitImage} onChange={(e) => setDroitImage(e.target.value)} className={CLASSE_SELECT}>
          <option value="">Droit à l&apos;image</option>
          <option value="oui">Accordé</option>
          <option value="non">Non accordé</option>
        </select>
        <select value={paiement} onChange={(e) => setPaiement(e.target.value)} className={CLASSE_SELECT}>
          {PAIEMENT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {filtresActifs && (
          <button
            type="button"
            onClick={reinitialiser}
            className="rounded-full border border-ligne px-3 py-1.5 text-[12.5px] text-encre-douce transition-colors hover:border-terracotta hover:text-terracotta"
          >
            Réinitialiser
          </button>
        )}
        <span className="ml-auto text-[12px] text-encre-douce">
          {filtrees.length} / {personnes.length}
        </span>
      </div>

      {filtrees.length === 0 ? (
        <div className="rounded-2xl border border-ligne bg-sable-carte p-6 text-[13.5px] text-encre-douce">
          Aucun membre ne correspond à ces filtres.
        </div>
      ) : (
      <div className="overflow-x-auto rounded-2xl border border-ligne bg-sable-carte shadow-[0_1px_3px_rgba(36,27,18,.04)]">
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr className="border-b border-ligne text-left text-[11px] uppercase tracking-wide text-encre-douce/60">
            <th className="px-4 py-3 font-medium">Nom</th>
            <th className="px-4 py-3 font-medium">Type</th>
            <th className="px-4 py-3 font-medium">Catégorie</th>
            <th className="px-4 py-3 font-medium">Naissance</th>
            <th className="px-4 py-3 font-medium">Contact</th>
            <th className="px-4 py-3 font-medium">Cotisation</th>
            <th className="px-4 py-3 font-medium">Licence</th>
            <th className="px-4 py-3 font-medium" />
          </tr>
        </thead>
        <tbody>
          {filtrees.map((p) => (
            <tr key={p.id} className="border-b border-ligne last:border-b-0 hover:bg-sable/60">
              <td className="px-4 py-2.5 font-medium text-encre">
                <span className="inline-flex items-center gap-1.5">
                  {p.nom} {p.prenom}
                  {p.notes && (
                    <span title={p.notes} aria-label={`Note : ${p.notes}`}>
                      <MessageSquareText size={13} className="shrink-0 text-encre-douce/60" />
                    </span>
                  )}
                </span>
              </td>
              <td className="px-4 py-2.5 text-encre-douce">{p.adhesion?.type ?? '—'}</td>
              <td className="px-4 py-2.5 text-encre-douce">{p.adhesion?.categorie ?? '—'}</td>
              <td className="px-4 py-2.5 text-encre-douce">{formatDate(p.dateNaissance)}</td>
              <td className="px-4 py-2.5 text-encre-douce">
                <div className="flex flex-col">
                  {p.email && <span>{p.email}</span>}
                  {p.telephone && <span>{p.telephone}</span>}
                </div>
              </td>
              <td className="px-4 py-2.5">
                <span
                  className={
                    p.adhesion?.cotisationPayee
                      ? 'rounded-full bg-pin/10 px-2 py-0.5 text-[11.5px] text-pin'
                      : 'rounded-full bg-danger/10 px-2 py-0.5 text-[11.5px] text-danger'
                  }
                >
                  {p.adhesion?.cotisationPayee ? 'Payée' : 'Non payée'}
                </span>
              </td>
              <td className="px-4 py-2.5">
                {p.adhesion?.licence ? (
                  <span className="rounded-full bg-pin/10 px-2 py-0.5 text-[11.5px] text-pin">
                    {p.adhesion.licencePayee ? 'Payée' : 'Non payée'}
                  </span>
                ) : (
                  <span className="text-encre-douce/50">—</span>
                )}
              </td>
              <td className="px-4 py-2.5">
                <div className="flex items-center gap-2.5">
                  <Link
                    href={`/membres/${p.id}`}
                    aria-label={`Modifier ${p.nom} ${p.prenom}`}
                    className="text-encre-douce/60 hover:text-terracotta"
                  >
                    <Pencil size={14} />
                  </Link>
                  <button
                    type="button"
                    onClick={() => supprimer(p.id, `${p.prenom} ${p.nom}`)}
                    aria-label={`Retirer ${p.nom} ${p.prenom}`}
                    className="text-encre-douce/60 hover:text-danger"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      )}
    </div>
  );
}
