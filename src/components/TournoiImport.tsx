'use client';

import { useRef, useState } from 'react';
import { FileSpreadsheet, ImageUp, Sparkles, Upload, X } from 'lucide-react';
import { analyserFichierParticipants, rapprocherParticipants, type LigneImport } from '@/lib/actions/tournoiImport';
import { analyserTableau, lireCsv, type EntreeImport } from '@/lib/tournoi/import';

const CHAMP =
  'rounded-lg border border-ligne bg-sable px-2 py-1.5 text-[13px] outline-none focus:border-terracotta';
const BTN =
  'inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-medium transition-opacity hover:opacity-90 disabled:opacity-40';

type Props = {
  /** Le tournoi attend-il des numéros d'équipe ? (format équipes fixes) */
  avecEquipes: boolean;
  /** Remplace la liste en cours d'édition par ce qui sort de la correction. */
  onValider: (lignes: { personneId: number | null; nom: string; equipeDepart: number | null }[]) => void;
};

function lireFichierBase64(f: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const s = String(r.result);
      resolve(s.slice(s.indexOf(',') + 1));
    };
    r.onerror = () => reject(new Error('Lecture du fichier impossible.'));
    r.readAsDataURL(f);
  });
}

export function TournoiImport({ avecEquipes, onValider }: Props) {
  const [ouvert, setOuvert] = useState(false);
  const [enCours, setEnCours] = useState<null | 'fichier' | 'ia'>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [source, setSource] = useState<'fichier' | 'ia' | null>(null);
  const [lignes, setLignes] = useState<LigneImport[] | null>(null);
  const refTableur = useRef<HTMLInputElement>(null);
  const refImage = useRef<HTMLInputElement>(null);

  async function rapprocher(entrees: EntreeImport[], venuDe: 'fichier' | 'ia') {
    const r = await rapprocherParticipants(entrees);
    if (!r.ok) {
      setErreur(r.error);
      return;
    }
    setSource(venuDe);
    setLignes(r.donnees);
  }

  /** Excel et CSV sont lus dans le navigateur : le fichier ne quitte pas le poste. */
  async function importerTableur(f: File) {
    setErreur(null);
    setEnCours('fichier');
    try {
      let grille: unknown[][];
      if (/\.csv$/i.test(f.name)) {
        grille = lireCsv(await f.text());
      } else {
        const XLSX = await import('xlsx');
        const classeur = XLSX.read(await f.arrayBuffer(), { type: 'array' });
        const feuille = classeur.Sheets[classeur.SheetNames[0]];
        grille = XLSX.utils.sheet_to_json<unknown[]>(feuille, { header: 1, blankrows: false });
      }
      const lecture = analyserTableau(grille);
      if (lecture.entrees.length === 0) {
        setErreur("Aucun nom trouvé dans ce fichier. Attendu : une ligne par équipe, ou une colonne de noms.");
        return;
      }
      await rapprocher(lecture.entrees, 'fichier');
    } catch (e) {
      setErreur(e instanceof Error ? e.message : 'Fichier illisible.');
    } finally {
      setEnCours(null);
    }
  }

  async function importerImage(f: File) {
    setErreur(null);
    setEnCours('ia');
    try {
      const base64 = await lireFichierBase64(f);
      const r = await analyserFichierParticipants(base64, f.type);
      if (!r.ok) {
        setErreur(r.error);
        return;
      }
      await rapprocher(r.donnees.entrees, 'ia');
    } catch (e) {
      setErreur(e instanceof Error ? e.message : 'Lecture impossible.');
    } finally {
      setEnCours(null);
    }
  }

  function majLigne(i: number, patch: Partial<LigneImport>) {
    setLignes((l) => (l ? l.map((x, j) => (j === i ? { ...x, ...patch } : x)) : l));
  }

  const aCorriger = lignes?.filter((l) => l.statut !== 'trouve').length ?? 0;

  if (!ouvert) {
    return (
      <button
        type="button"
        onClick={() => setOuvert(true)}
        className={`${BTN} border border-ligne bg-sable`}
      >
        <Upload size={14} /> Importer une liste
      </button>
    );
  }

  return (
    <section className="entree rounded-2xl border border-ligne bg-sable-carte p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-[16px]">Importer une liste de participants</h2>
        <button
          type="button"
          onClick={() => {
            setOuvert(false);
            setLignes(null);
            setErreur(null);
          }}
          aria-label="Fermer"
          className="text-encre-douce hover:text-encre"
        >
          <X size={16} />
        </button>
      </div>

      {!lignes && (
        <>
          <p className="mb-4 text-[12.5px] text-encre-douce">
            Deux façons de faire. Dans les deux cas, la liste passe par un écran de correction :
            rien n&apos;est enregistré avant que vous ayez relu.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-ligne bg-sable p-4">
              <p className="font-display flex items-center gap-2 text-[14px]">
                <FileSpreadsheet size={15} /> Fichier Excel ou CSV
              </p>
              <p className="mt-1 mb-3 text-[11.5px] leading-snug text-encre-douce">
                Une ligne par équipe (numéro puis joueurs), ou une colonne de noms. Le fichier est
                lu dans votre navigateur, il ne part nulle part.
              </p>
              <input
                ref={refTableur}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = '';
                  if (f) void importerTableur(f);
                }}
              />
              <button
                type="button"
                disabled={enCours !== null}
                onClick={() => refTableur.current?.click()}
                className={`${BTN} border border-ligne bg-sable-carte`}
              >
                {enCours === 'fichier' ? 'Lecture…' : 'Choisir un fichier'}
              </button>
            </div>

            <div className="rounded-xl border border-ligne bg-sable p-4">
              <p className="font-display flex items-center gap-2 text-[14px]">
                <ImageUp size={15} /> Photo ou PDF
              </p>
              <p className="mt-1 mb-3 text-[11.5px] leading-snug text-encre-douce">
                La liste est lue par l&apos;IA. Fiable sur un document imprimé,{' '}
                <b className="text-encre">approximative sur du manuscrit</b> — relisez tout.
              </p>
              <input
                ref={refImage}
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = '';
                  if (f) void importerImage(f);
                }}
              />
              <button
                type="button"
                disabled={enCours !== null}
                onClick={() => refImage.current?.click()}
                className={`${BTN} bg-terracotta text-white`}
              >
                <Sparkles size={14} />
                {enCours === 'ia' ? 'Lecture en cours…' : 'Choisir une photo'}
              </button>
            </div>
          </div>
        </>
      )}

      {erreur && <p className="mt-3 text-[12.5px] text-danger">{erreur}</p>}

      {lignes && (
        <>
          <p className="mb-3 text-[12.5px] text-encre-douce">
            <b className="text-encre">{lignes.length} noms lus</b>
            {source === 'ia' && ' par l’IA'} ·{' '}
            {aCorriger === 0
              ? 'tous rapprochés du registre'
              : `${aCorriger} à vérifier (surlignés)`}
            . Corrigez, puis validez : la liste du tournoi sera remplacée.
          </p>

          <div className="max-h-[420px] overflow-y-auto rounded-xl border border-ligne">
            <table className="w-full text-[13px]">
              <thead className="sticky top-0 bg-sable">
                <tr className="text-[10.5px] text-encre-douce">
                  <th className="px-3 py-2 text-left font-medium">Nom lu</th>
                  <th className="px-3 py-2 text-left font-medium">Licencié</th>
                  {avecEquipes && <th className="w-16 px-2 py-2 text-center font-medium">Éq.</th>}
                  <th className="w-10 px-2 py-2" />
                </tr>
              </thead>
              <tbody>
                {lignes.map((l, i) => (
                  <tr
                    key={i}
                    className={`border-t border-ligne ${l.statut !== 'trouve' ? 'bg-laiton/8' : ''}`}
                  >
                    <td className="px-3 py-2">{l.nomLu}</td>
                    <td className="px-3 py-2">
                      <select
                        value={l.personneId ?? ''}
                        onChange={(e) => {
                          const v = e.target.value;
                          majLigne(i, {
                            personneId: v === '' ? null : Number(v),
                            statut: v === '' ? 'inconnu' : 'trouve',
                          });
                        }}
                        className={`${CHAMP} w-full`}
                      >
                        <option value="">Hors registre (adhérent, entreprise…)</option>
                        {l.nomRegistre && l.personneId != null && (
                          <option value={l.personneId}>{l.nomRegistre}</option>
                        )}
                        {l.candidats.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.nom}
                          </option>
                        ))}
                      </select>
                    </td>
                    {avecEquipes && (
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          min={1}
                          value={l.equipeDepart ?? ''}
                          onChange={(e) =>
                            majLigne(i, {
                              equipeDepart: e.target.value ? Number(e.target.value) : null,
                            })
                          }
                          className={`${CHAMP} w-full text-center`}
                        />
                      </td>
                    )}
                    <td className="px-2 py-2 text-center">
                      <button
                        type="button"
                        aria-label={`Retirer ${l.nomLu}`}
                        onClick={() => setLignes((p) => (p ? p.filter((_, j) => j !== i) : p))}
                        className="text-encre-douce hover:text-danger"
                      >
                        <X size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={lignes.length === 0}
              onClick={() => {
                onValider(
                  lignes.map((l) => ({
                    personneId: l.personneId,
                    // Le nom du registre fait foi quand il y en a un : c'est lui
                    // qu'on retrouvera dans les statistiques et sur les feuilles.
                    nom: l.personneId != null && l.nomRegistre ? l.nomRegistre : l.nomLu,
                    equipeDepart: avecEquipes ? l.equipeDepart : null,
                  })),
                );
                setOuvert(false);
                setLignes(null);
              }}
              className={`${BTN} bg-terracotta text-white`}
            >
              Reprendre ces {lignes.length} participants
            </button>
            <button
              type="button"
              onClick={() => {
                setLignes(null);
                setErreur(null);
              }}
              className={`${BTN} border border-ligne bg-sable`}
            >
              Recommencer
            </button>
          </div>
        </>
      )}
    </section>
  );
}
