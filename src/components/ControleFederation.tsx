'use client';

import { useMemo, useRef, useState } from 'react';
import { Upload, Download } from 'lucide-react';
import { comparerFichierFederation, appliquerCorrectionFederation } from '@/lib/actions/federation';
import type { LigneRapport } from '@/lib/federationCompare';
import type { ControleFederationHistorique } from '@/lib/federation';

const LIBELLE_STATUT: Record<LigneRapport['statut'], string> = {
  OK: 'OK',
  DIVERGENCE: 'Divergence',
  MANQUANT_CLUB: 'Manquant côté club',
  MANQUANT_FEDERATION: 'Manquant côté fédération',
};

const STYLE_BADGE: Record<LigneRapport['statut'], string> = {
  OK: 'bg-succes/10 text-succes',
  DIVERGENCE: 'bg-laiton/15 text-laiton',
  MANQUANT_CLUB: 'bg-danger/10 text-danger',
  MANQUANT_FEDERATION: 'bg-encre-douce/10 text-encre-douce',
};

const STYLE_COMPTEUR: Record<LigneRapport['statut'], string> = {
  OK: 'bg-succes text-white',
  DIVERGENCE: 'bg-laiton text-white',
  MANQUANT_CLUB: 'bg-danger text-white',
  MANQUANT_FEDERATION: 'bg-encre-douce text-white',
};

const FILTRES: Array<'TOUS' | LigneRapport['statut']> = ['TOUS', 'DIVERGENCE', 'MANQUANT_CLUB', 'MANQUANT_FEDERATION', 'OK'];

function csvEscape(v: string | null | undefined): string {
  const s = v ?? '';
  if (/[";\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

/** Port de Federation.html (v1) : dépose le fichier Excel des licenciés
 *  FLBP, compare avec le registre du club, affiche le rapport et permet
 *  d'appliquer une correction champ par champ. Historique conservé côté
 *  serveur (controles_federation). */
export function ControleFederation({
  saisons,
  saisonActive,
  historique,
}: {
  saisons: string[];
  saisonActive: string;
  historique: ControleFederationHistorique[];
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fichier, setFichier] = useState<File | null>(null);
  const [saison, setSaison] = useState(saisonActive);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [rapport, setRapport] = useState<LigneRapport[] | null>(null);
  const [filtreActif, setFiltreActif] = useState<'TOUS' | LigneRapport['statut']>('TOUS');
  const [appliques, setAppliques] = useState<Set<string>>(new Set());

  const compteurs = useMemo(() => {
    const c: Record<LigneRapport['statut'], number> = { OK: 0, DIVERGENCE: 0, MANQUANT_CLUB: 0, MANQUANT_FEDERATION: 0 };
    (rapport ?? []).forEach((l) => c[l.statut]++);
    return c;
  }, [rapport]);

  const lignesFiltrees = useMemo(() => {
    if (!rapport) return [];
    return filtreActif === 'TOUS' ? rapport : rapport.filter((l) => l.statut === filtreActif);
  }, [rapport, filtreActif]);

  async function lancerControle() {
    if (!fichier) return;
    setEnCours(true);
    setErreur(null);
    const formData = new FormData();
    formData.append('fichier', fichier);
    formData.append('saison', saison);
    const res = await comparerFichierFederation(formData);
    setEnCours(false);
    if (!res.ok) {
      setErreur(res.error);
      return;
    }
    setRapport(res.rapport);
    setFiltreActif('TOUS');
    setAppliques(new Set());
  }

  async function appliquer(ligne: LigneRapport, champ: string, valeur: string, cle: string) {
    if (!ligne.club) return;
    await appliquerCorrectionFederation(ligne.club.idPersonne, ligne.club.idAdhesion, champ, valeur);
    setAppliques((prev) => new Set(prev).add(cle));
  }

  function exporterCsv() {
    if (!rapport) return;
    const ecarts = rapport.filter((l) => l.statut !== 'OK');
    if (!ecarts.length) return;

    const headers = [
      'Statut', 'Nom club', 'Prénom club', 'Licence club',
      'Nom fédération', 'Prénom fédération', 'Licence fédération', 'Détail des écarts',
    ];
    const lignes = ecarts.map((l) => {
      let detail: string;
      if (l.ecarts.length) {
        detail = l.ecarts.map((e) => `${e.champ} : club="${e.club ?? '—'}" / fédération="${e.federation ?? '—'}"`).join(' | ');
      } else if (l.statut === 'MANQUANT_FEDERATION') {
        detail = 'Licencié du club absent du fichier fédération';
      } else {
        detail = 'Licencié fédération absent du club';
      }
      return [
        LIBELLE_STATUT[l.statut],
        l.club?.nom ?? '',
        l.club?.prenom ?? '',
        l.club?.licence ?? '',
        l.federation?.['Nom'] ?? '',
        l.federation?.['Prénom'] ?? '',
        l.federation?.['Licence'] ?? '',
        detail,
      ];
    });

    const contenu = '﻿' + [headers, ...lignes].map((r) => r.map(csvEscape).join(';')).join('\r\n');
    const blob = new Blob([contenu], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Carreau-Mondorf-Ecarts-Federation-${saison}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl border border-ligne bg-sable-carte p-5">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-full border border-ligne bg-sable px-4 py-2 text-[13px] font-medium text-encre transition-colors hover:border-terracotta"
          >
            <Upload size={15} />
            {fichier ? fichier.name : 'Choisir le fichier Excel'}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => setFichier(e.target.files?.[0] ?? null)}
          />
          <select
            value={saison}
            onChange={(e) => setSaison(e.target.value)}
            className="rounded-lg border border-ligne bg-sable px-3 py-2 text-[13px] text-encre outline-none focus:border-terracotta"
          >
            {saisons.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={!fichier || enCours}
            onClick={lancerControle}
            className="rounded-full bg-terracotta px-5 py-2 text-[13px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {enCours ? 'Contrôle en cours…' : 'Lancer le contrôle'}
          </button>
        </div>
        <p className="mt-3 text-[12.5px] text-encre-douce">
          Dépose ici le fichier des licenciés reçu par email de la FLBP (format Excel). Le contrôle
          compare licence par licence les données du club et celles de la fédération, sans rien
          modifier automatiquement — chaque écart se valide manuellement.
        </p>
        {erreur && <p className="mt-2 text-[12.5px] text-danger">{erreur}</p>}
      </div>

      {rapport && (
        <div className="rounded-2xl border border-ligne bg-sable-carte p-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(['OK', 'DIVERGENCE', 'MANQUANT_CLUB', 'MANQUANT_FEDERATION'] as const).map((s) => (
              <div key={s} className={`rounded-xl p-3.5 ${STYLE_COMPTEUR[s]}`}>
                <p className="font-score text-2xl leading-none">{compteurs[s]}</p>
                <p className="mt-1 text-[11px] uppercase tracking-wide opacity-90">{LIBELLE_STATUT[s]}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-1.5">
              {FILTRES.map((f) => (
                <button
                  key={f}
                  onClick={() => setFiltreActif(f)}
                  className={`rounded-full px-3 py-1 text-[12px] transition-colors ${
                    filtreActif === f ? 'bg-terracotta text-white' : 'bg-sable text-encre-douce hover:text-encre'
                  }`}
                >
                  {f === 'TOUS' ? 'Tous' : LIBELLE_STATUT[f]}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={exporterCsv}
              className="inline-flex items-center gap-1.5 rounded-full border border-ligne px-3 py-1.5 text-[12px] font-medium text-encre-douce transition-colors hover:border-terracotta hover:text-terracotta"
            >
              <Download size={13} />
              Exporter les écarts (CSV)
            </button>
          </div>

          {lignesFiltrees.length === 0 ? (
            <p className="mt-6 text-center text-[13px] text-encre-douce">Aucune ligne pour ce filtre.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full border-collapse text-[13px]">
                <thead>
                  <tr className="border-b border-ligne text-left text-[11px] uppercase tracking-wide text-encre-douce/60">
                    <th className="px-3 py-2 font-medium">Statut</th>
                    <th className="px-3 py-2 font-medium">Nom</th>
                    <th className="px-3 py-2 font-medium">Prénom</th>
                    <th className="px-3 py-2 font-medium">Licence</th>
                    <th className="px-3 py-2 font-medium">Écarts</th>
                  </tr>
                </thead>
                <tbody>
                  {lignesFiltrees.map((l, i) => {
                    const nom = l.club?.nom ?? l.federation?.['Nom'] ?? '—';
                    const prenom = l.club?.prenom ?? l.federation?.['Prénom'] ?? '—';
                    const licence = l.club?.licence ?? l.federation?.['Licence'] ?? '—';
                    return (
                      <tr key={i} className="border-b border-ligne last:border-b-0">
                        <td className="px-3 py-2.5">
                          <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${STYLE_BADGE[l.statut]}`}>
                            {LIBELLE_STATUT[l.statut]}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-encre">{nom}</td>
                        <td className="px-3 py-2.5 text-encre">{prenom}</td>
                        <td className="px-3 py-2.5 text-encre-douce">{licence}</td>
                        <td className="px-3 py-2.5">
                          {l.ecarts.length === 0 ? (
                            <span className="text-encre-douce/50">—</span>
                          ) : (
                            <div className="flex flex-col gap-1.5">
                              {l.ecarts.map((e) => {
                                const cle = `${i}-${e.champ}`;
                                const applique = appliques.has(cle);
                                return (
                                  <div key={e.champ} className="flex flex-wrap items-center gap-2 text-[12px]">
                                    <span className="text-encre-douce">
                                      <b className="text-encre">{e.champ}</b> — club : « {e.club ?? '—'} » / fédération : « {e.federation ?? '—'} »
                                    </span>
                                    {l.club && (
                                      <button
                                        type="button"
                                        disabled={applique}
                                        onClick={() => appliquer(l, e.champ, e.federation ?? '', cle)}
                                        className="rounded-full border border-ligne px-2.5 py-0.5 text-[11px] font-medium text-encre-douce transition-colors hover:border-terracotta hover:text-terracotta disabled:opacity-50"
                                      >
                                        {applique ? 'Appliqué ✓' : `Appliquer la valeur fédération`}
                                      </button>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <div className="rounded-2xl border border-ligne bg-sable-carte p-5">
        <h3 className="font-display mb-3 text-[15px]">Historique des contrôles</h3>
        {historique.length === 0 ? (
          <p className="text-[13px] text-encre-douce">Aucun contrôle effectué pour l&apos;instant.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-ligne text-left text-[11px] uppercase tracking-wide text-encre-douce/60">
                  <th className="px-3 py-2 font-medium">Date</th>
                  <th className="px-3 py-2 font-medium">Fichier</th>
                  <th className="px-3 py-2 font-medium">OK</th>
                  <th className="px-3 py-2 font-medium">Divergences</th>
                  <th className="px-3 py-2 font-medium">Manq. club</th>
                  <th className="px-3 py-2 font-medium">Manq. fédération</th>
                </tr>
              </thead>
              <tbody>
                {historique.map((h) => (
                  <tr key={h.id} className="border-b border-ligne last:border-b-0">
                    <td className="px-3 py-2 text-encre-douce">
                      {new Date(h.dateImport).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td className="px-3 py-2 text-encre">{h.nomFichier}</td>
                    <td className="px-3 py-2 text-encre-douce">{h.nbOk}</td>
                    <td className="px-3 py-2 text-encre-douce">{h.nbDivergence}</td>
                    <td className="px-3 py-2 text-encre-douce">{h.nbManquantClub}</td>
                    <td className="px-3 py-2 text-encre-douce">{h.nbManquantFederation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
