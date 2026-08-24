'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Check, FileDown, Pencil, Plus, Search, Shuffle, Trash2, X } from 'lucide-react';
import { pdf, type DocumentProps } from '@react-pdf/renderer';
import {
  annulerDernierePartie,
  cloturerTournoi,
  composerEquipesDepart,
  composerProchainePartie,
  enregistrerEquipesDepart,
  enregistrerScore,
  remplacerParticipants,
  rouvrirTournoi,
} from '@/lib/actions/tournoi';
import { scoreValide } from '@/lib/tournoi/moteur';
import type { Participant, PartieDetail, Tournoi } from '@/lib/tournoi/donnees';
import type { StatsClassees } from '@/lib/tournoi/moteur';
import {
  DocumentClassement,
  DocumentListe,
  DocumentPartie,
  DocumentToutesParties,
  type DonneesPdf,
} from './TournoiPdf';
import { TournoiImport } from './TournoiImport';
import { TournoiReglages } from './TournoiReglages';

type Props = {
  tournoi: Tournoi;
  participants: Participant[];
  equipesPermanentes: { id: number; numero: number; membres: number[] }[];
  partiesDetail: PartieDetail[];
  equipesParId: Record<number, { numero: number; membres: number[] }>;
  classement: StatsClassees[];
  libelles: Record<number, string>;
  candidats: { id: number; nom: string }[];
};

type Ligne = { personneId: number | null; nom: string; equipeDepart: number | null };

const CHAMP =
  'rounded-lg border border-ligne bg-sable px-3 py-2 text-[14px] outline-none focus:border-terracotta';

/** Nom de fichier lisible et triable : « tournoi-2026-08-24-classement.pdf ». */
function nomFichier(nom: string, date: string, suffixe: string) {
  const base = nom
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
    .slice(0, 40);
  return `${base || 'tournoi'}-${date}-${suffixe}.pdf`;
}

/** Le PDF est produit dans le navigateur, comme les fiches membres. */
async function telechargerPdf(document_: React.ReactElement<DocumentProps>, fichier: string) {
  const blob = await pdf(document_).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fichier;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
const BTN =
  'inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-medium transition-opacity hover:opacity-90 disabled:opacity-40';

export function TournoiEcran(p: Props) {
  const router = useRouter();
  const [enCours, demarrer] = useTransition();
  const [erreur, setErreur] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [onglet, setOnglet] = useState<string>(
    p.partiesDetail.length > 0 ? `p${p.partiesDetail.length}` : 'participants',
  );

  const nomParticipant = useMemo(
    () => new Map(p.participants.map((x) => [x.id, x.nom])),
    [p.participants],
  );

  const membresDe = (equipeId: number) =>
    (p.equipesParId[equipeId]?.membres ?? [])
      .map((id) => nomParticipant.get(id) ?? '?')
      .join(' · ');
  const numeroDe = (equipeId: number) => p.equipesParId[equipeId]?.numero ?? equipeId;

  function lancer(
    action: () => Promise<{ ok: boolean; error?: string }>,
    message?: string,
    onSucces?: () => void,
  ) {
    setErreur(null);
    setInfo(null);
    demarrer(async () => {
      const r = await action();
      if (!r.ok) setErreur(r.error ?? 'Action impossible.');
      else {
        if (message) setInfo(message);
        onSucces?.();
      }
      router.refresh();
    });
  }

  const donneesPdf: DonneesPdf = {
    tournoi: p.tournoi,
    participants: p.participants,
    equipesPermanentes: p.equipesPermanentes,
    partiesDetail: p.partiesDetail,
    equipesParId: p.equipesParId,
    classement: p.classement,
    libelles: p.libelles,
  };

  const partieComplete = (d: PartieDetail) =>
    d.rencontres.length > 0 &&
    d.rencontres.every((r) => scoreValide({ scoreA: r.scoreA, scoreB: r.scoreB }, p.tournoi.pointsVictoire));

  const toutesJouees =
    p.partiesDetail.length === p.tournoi.nbParties && p.partiesDetail.every(partieComplete);

  return (
    <main className="mx-auto max-w-4xl px-5 py-10">
      <Link
        href="/outils/tournoi"
        className="inline-flex items-center gap-1.5 text-[12.5px] text-encre-douce hover:text-encre"
      >
        <ArrowLeft size={14} /> Tous les tournois
      </Link>

      <header className="entree mt-3 mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-score text-[13px] tracking-[0.2em] text-terracotta">
            {p.tournoi.format === 'melee' ? 'À LA MÊLÉE' : 'ÉQUIPES FIXES'}
            {' · '}
            {['', 'TÊTE-À-TÊTE', 'DOUBLETTES', 'TRIPLETTES'][p.tournoi.tailleEquipe]}
          </p>
          <h1 className="font-display mt-1 text-4xl italic">{p.tournoi.nom}</h1>
          <p className="mt-1.5 text-[13px] text-encre-douce">
            {p.tournoi.nbParties} parties en {p.tournoi.pointsVictoire} points ·{' '}
            {p.tournoi.nbTerrains} terrains · {p.participants.length} participants
          </p>
        </div>
        <TournoiReglages tournoi={p.tournoi} nbPartiesComposees={p.partiesDetail.length} />
      </header>

      {/* ---------------------------------------------------------- onglets */}
      <nav className="mb-6 flex gap-1 overflow-x-auto border-b border-ligne">
        <Tab actif={onglet === 'participants'} onClick={() => setOnglet('participants')}>
          Participants
        </Tab>
        {Array.from({ length: p.tournoi.nbParties }, (_, i) => i + 1).map((n) => {
          const d = p.partiesDetail.find((x) => x.numero === n);
          return (
            <Tab key={n} actif={onglet === `p${n}`} onClick={() => setOnglet(`p${n}`)}>
              Partie {n}
              <span
                className={`ml-1.5 inline-block size-1.5 rounded-full ${
                  !d ? 'bg-ligne' : partieComplete(d) ? 'bg-pin' : 'bg-laiton'
                }`}
              />
            </Tab>
          );
        })}
        <Tab actif={onglet === 'classement'} onClick={() => setOnglet('classement')}>
          Classement
        </Tab>
      </nav>

      {erreur && (
        <p className="mb-4 rounded-xl border border-danger/30 bg-danger/8 px-4 py-2.5 text-[12.5px] text-danger">
          {erreur}
        </p>
      )}
      {info && (
        <p className="mb-4 rounded-xl border border-pin/25 bg-pin/8 px-4 py-2.5 text-[12.5px] text-pin">
          {info}
        </p>
      )}

      {onglet === 'participants' && (
        <VueParticipants
          {...p}
          enCours={enCours}
          lancer={lancer}
          membresDe={membresDe}
          donneesPdf={donneesPdf}
        />
      )}

      {onglet.startsWith('p') && onglet !== 'participants' && (
        <VuePartie
          numero={Number(onglet.slice(1))}
          tournoi={p.tournoi}
          partiesDetail={p.partiesDetail}
          membresDe={membresDe}
          numeroDe={numeroDe}
          partieComplete={partieComplete}
          enCours={enCours}
          lancer={lancer}
          donneesPdf={donneesPdf}
        />
      )}

      {onglet === 'classement' && (
        <VueClassement
          tournoi={p.tournoi}
          classement={p.classement}
          libelles={p.libelles}
          toutesJouees={toutesJouees}
          enCours={enCours}
          lancer={lancer}
          donneesPdf={donneesPdf}
        />
      )}
    </main>
  );
}

/** Bouton d'export : garde l'état « génération… », le PDF prend un instant. */
function BoutonPdf({
  libelle,
  fichier,
  document: doc,
  principal,
}: {
  libelle: string;
  fichier: string;
  document: React.ReactElement<DocumentProps>;
  principal?: boolean;
}) {
  const [enCours, setEnCours] = useState(false);
  return (
    <button
      type="button"
      disabled={enCours}
      onClick={async () => {
        setEnCours(true);
        try {
          await telechargerPdf(doc, fichier);
        } finally {
          setEnCours(false);
        }
      }}
      className={`${BTN} ${principal ? 'bg-terracotta text-white' : 'border border-ligne bg-sable'}`}
    >
      <FileDown size={14} /> {enCours ? 'Génération…' : libelle}
    </button>
  );
}

// ------------------------------------------------------------------ onglet

function Tab({
  actif,
  onClick,
  children,
}: {
  actif: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`-mb-px whitespace-nowrap border-b-2 px-3.5 pb-2.5 pt-1 text-[13.5px] transition-colors ${
        actif
          ? 'border-terracotta text-encre'
          : 'border-transparent text-encre-douce hover:text-encre'
      }`}
    >
      {children}
    </button>
  );
}

// ------------------------------------------------------------ participants

function VueParticipants({
  tournoi,
  participants,
  equipesPermanentes,
  candidats,
  enCours,
  lancer,
  membresDe,
  donneesPdf,
}: Props & {
  enCours: boolean;
  lancer: (a: () => Promise<{ ok: boolean; error?: string }>, m?: string, onSucces?: () => void) => void;
  membresDe: (id: number) => string;
  donneesPdf: DonneesPdf;
}) {
  const verrou = tournoi.statut !== 'preparation';
  const [lignes, setLignes] = useState<Ligne[]>(
    participants.map((x) => ({ personneId: x.personneId, nom: x.nom, equipeDepart: x.equipeDepart })),
  );
  const [recherche, setRecherche] = useState('');
  const [nomManuel, setNomManuel] = useState('');

  const dejaPris = new Set(lignes.map((l) => l.personneId).filter((x): x is number => x != null));
  const filtres = candidats
    .filter((c) => !dejaPris.has(c.id))
    .filter((c) => c.nom.toLowerCase().includes(recherche.trim().toLowerCase()))
    .slice(0, 40);

  const modifie =
    JSON.stringify(lignes) !==
    JSON.stringify(
      participants.map((x) => ({ personneId: x.personneId, nom: x.nom, equipeDepart: x.equipeDepart })),
    );

  if (verrou) {
    return (
      <section className="flex flex-col gap-5">
        <Carte titre={`${participants.length} participants`}>
          <p className="mb-3 text-[12.5px] text-encre-douce">
            Le tournoi a commencé : la liste est figée. Annulez toutes les parties pour la rouvrir.
          </p>
          <ul className="grid gap-1.5 sm:grid-cols-2">
            {participants.map((x) => (
              <li key={x.id} className="text-[13.5px]">
                {x.nom}
                {x.personneId == null && (
                  <span className="ml-1.5 text-[11px] text-encre-douce">hors registre</span>
                )}
              </li>
            ))}
          </ul>
        </Carte>
        <div className="row-pdf flex flex-wrap gap-2">
          <BoutonPdf
            libelle={tournoi.format === 'melee' ? 'Imprimer la liste des joueurs' : 'Imprimer la liste des équipes'}
            fichier={nomFichier(tournoi.nom, tournoi.dateTournoi, tournoi.format === 'melee' ? 'joueurs' : 'equipes')}
            document={DocumentListe(donneesPdf)}
          />
        </div>
        {equipesPermanentes.length > 0 && (
          <Carte titre="Équipes">
            <ul className="flex flex-col gap-1.5">
              {equipesPermanentes.map((e) => (
                <li key={e.id} className="text-[13.5px]">
                  <span className="font-score mr-2 text-[15px] text-terracotta">{e.numero}</span>
                  {membresDe(e.id)}
                </li>
              ))}
            </ul>
          </Carte>
        )}
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-5">
      <Carte titre="Choisir dans le registre du club">
        <div className="relative mb-3">
          <Search
            size={14}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-encre-douce"
          />
          <input
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Rechercher un membre…"
            className={`${CHAMP} w-full pl-8`}
          />
        </div>
        {filtres.length === 0 ? (
          <p className="text-[12.5px] text-encre-douce">Aucun membre à ajouter.</p>
        ) : (
          <ul className="flex max-h-56 flex-wrap gap-1.5 overflow-y-auto">
            {filtres.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() =>
                    setLignes((l) => [...l, { personneId: c.id, nom: c.nom, equipeDepart: null }])
                  }
                  className="inline-flex items-center gap-1.5 rounded-full border border-ligne bg-sable px-3 py-1.5 text-[12.5px] transition-colors hover:border-terracotta"
                >
                  <Plus size={12} /> {c.nom}
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 flex gap-2 border-t border-ligne pt-4">
          <input
            value={nomManuel}
            onChange={(e) => setNomManuel(e.target.value)}
            placeholder="Ajouter une personne hors registre (adhérent, entreprise…)"
            className={`${CHAMP} flex-1`}
          />
          <button
            type="button"
            disabled={!nomManuel.trim()}
            onClick={() => {
              setLignes((l) => [...l, { personneId: null, nom: nomManuel.trim(), equipeDepart: null }]);
              setNomManuel('');
            }}
            className={`${BTN} border border-ligne bg-sable`}
          >
            <Plus size={14} /> Ajouter
          </button>
        </div>
      </Carte>

      <TournoiImport
        avecEquipes={tournoi.format === 'equipes_fixes'}
        onValider={(recues) => setLignes(recues)}
      />

      <Carte titre={`Liste du tournoi — ${lignes.length} participants`}>
        {lignes.length === 0 ? (
          <p className="text-[12.5px] text-encre-douce">Personne pour l&apos;instant.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-ligne">
            {lignes.map((l, i) => (
              <li key={`${l.personneId ?? 'x'}-${i}`} className="flex items-center gap-3 py-2">
                <span className="flex-1 text-[13.5px]">
                  {l.nom}
                  {l.personneId == null && (
                    <span className="ml-1.5 text-[11px] text-encre-douce">hors registre</span>
                  )}
                </span>
                {tournoi.format === 'equipes_fixes' && (
                  <input
                    type="number"
                    min={1}
                    value={l.equipeDepart ?? ''}
                    placeholder="éq."
                    onChange={(e) =>
                      setLignes((prev) =>
                        prev.map((x, j) =>
                          j === i
                            ? { ...x, equipeDepart: e.target.value ? Number(e.target.value) : null }
                            : x,
                        ),
                      )
                    }
                    className={`${CHAMP} w-16 text-center`}
                  />
                )}
                <button
                  type="button"
                  aria-label={`Retirer ${l.nom}`}
                  onClick={() => setLignes((prev) => prev.filter((_, j) => j !== i))}
                  className="text-encre-douce hover:text-danger"
                >
                  <Trash2 size={15} />
                </button>
              </li>
            ))}
          </ul>
        )}

        {tournoi.format === 'equipes_fixes' && (
          <p className="mt-3 text-[11.5px] text-encre-douce">
            Le numéro d&apos;équipe est facultatif : laissé vide partout, l&apos;effectif sera
            découpé automatiquement en {['', 'tête-à-tête', 'doublettes', 'triplettes'][tournoi.tailleEquipe]}.
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={enCours || !modifie || lignes.length === 0}
            onClick={() => lancer(() => remplacerParticipants(tournoi.id, lignes), 'Liste enregistrée.')}
            className={`${BTN} bg-terracotta text-white`}
          >
            <Check size={14} /> {enCours ? 'Enregistrement…' : 'Enregistrer la liste'}
          </button>
          {modifie && (
            <button
              type="button"
              onClick={() =>
                setLignes(
                  participants.map((x) => ({
                    personneId: x.personneId,
                    nom: x.nom,
                    equipeDepart: x.equipeDepart,
                  })),
                )
              }
              className={`${BTN} border border-ligne bg-sable`}
            >
              <X size={14} /> Annuler les changements
            </button>
          )}
        </div>
      </Carte>

      {tournoi.format === 'equipes_fixes' && participants.length >= 2 && !modifie && (
        <EquipesDepart
          tournoi={tournoi}
          participants={participants}
          equipesPermanentes={equipesPermanentes}
          membresDe={membresDe}
          enCours={enCours}
          lancer={lancer}
        />
      )}

      {participants.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <BoutonPdf
            libelle={tournoi.format === 'melee' ? 'Imprimer la liste des joueurs' : 'Imprimer la liste des équipes'}
            fichier={nomFichier(tournoi.nom, tournoi.dateTournoi, tournoi.format === 'melee' ? 'joueurs' : 'equipes')}
            document={DocumentListe(donneesPdf)}
          />
        </div>
      )}
    </section>
  );
}

/**
 * Carte « Équipes de départ ». En lecture, elle affiche la composition
 * actuelle avec deux leviers distincts :
 *   - Recomposer : relance l'algorithme automatique depuis zéro (efface toute
 *     retouche manuelle) ;
 *   - Modifier à la main : ouvre un mode édition où chaque joueur reçoit un
 *     champ « équipe » pré-rempli avec son affectation actuelle, sur le même
 *     motif que le numéro d'équipe saisi à l'import — rien de nouveau à
 *     apprendre pour l'organisateur qui a déjà utilisé l'un ou l'autre.
 */
function EquipesDepart({
  tournoi,
  participants,
  equipesPermanentes,
  membresDe,
  enCours,
  lancer,
}: {
  tournoi: Tournoi;
  participants: Participant[];
  equipesPermanentes: { id: number; numero: number; membres: number[] }[];
  membresDe: (id: number) => string;
  enCours: boolean;
  lancer: (a: () => Promise<{ ok: boolean; error?: string }>, m?: string, onSucces?: () => void) => void;
}) {
  type Affectation = { participantId: number; nom: string; numero: number };
  const [edition, setEdition] = useState<Affectation[] | null>(null);

  function demarrerEdition() {
    const numeroDeParticipant = new Map<number, number>();
    equipesPermanentes.forEach((e) => e.membres.forEach((pid) => numeroDeParticipant.set(pid, e.numero)));
    const nomDe = new Map(participants.map((p) => [p.id, p.nom]));
    const lignes = [...numeroDeParticipant.entries()]
      .map(([participantId, numero]) => ({ participantId, nom: nomDe.get(participantId) ?? '?', numero }))
      .sort((a, b) => a.numero - b.numero || a.nom.localeCompare(b.nom, 'fr'));
    setEdition(lignes);
  }

  if (equipesPermanentes.length === 0) {
    return (
      <Carte titre="Équipes de départ">
        <p className="mb-3 text-[12.5px] text-encre-douce">
          Les équipes ne sont pas encore composées. Elles resteront les mêmes toute la journée.
        </p>
        <button
          type="button"
          disabled={enCours}
          onClick={() => lancer(() => composerEquipesDepart(tournoi.id), 'Équipes composées.')}
          className={`${BTN} bg-terracotta text-white`}
        >
          <Shuffle size={14} /> Composer les équipes
        </button>
      </Carte>
    );
  }

  if (!edition) {
    return (
      <Carte titre="Équipes de départ">
        <ul className="mb-3 flex flex-col gap-1.5">
          {equipesPermanentes.map((e) => (
            <li key={e.id} className="text-[13.5px]">
              <span className="font-score mr-2 text-[15px] text-terracotta">{e.numero}</span>
              {membresDe(e.id)}
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={enCours}
            onClick={demarrerEdition}
            className={`${BTN} bg-terracotta text-white`}
          >
            <Pencil size={14} /> Modifier à la main
          </button>
          <button
            type="button"
            disabled={enCours}
            onClick={() => lancer(() => composerEquipesDepart(tournoi.id), 'Équipes composées.')}
            className={`${BTN} border border-ligne bg-sable`}
          >
            <Shuffle size={14} /> Recomposer automatiquement
          </button>
        </div>
      </Carte>
    );
  }

  const numeros = [...new Set(edition.map((l) => l.numero))].sort((a, b) => a - b);

  return (
    <Carte titre="Modifier les équipes de départ">
      <p className="mb-3 text-[12.5px] text-encre-douce">
        Changez le numéro d&apos;équipe d&apos;un joueur pour le déplacer. Une équipe vidée de tous
        ses joueurs disparaît simplement ; les numéros restants sont renumérotés à
        l&apos;enregistrement.
      </p>
      <ul className="flex flex-col divide-y divide-ligne">
        {edition.map((l, i) => (
          <li key={l.participantId} className="flex items-center gap-3 py-2">
            <span className="flex-1 text-[13.5px]">{l.nom}</span>
            <input
              type="number"
              min={1}
              value={l.numero}
              onChange={(e) => {
                const v = e.target.value ? Number(e.target.value) : l.numero;
                setEdition((prev) => prev!.map((x, j) => (j === i ? { ...x, numero: v } : x)));
              }}
              className={`${CHAMP} w-16 text-center`}
            />
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[11.5px] text-encre-douce">
        {numeros.length} équipe{numeros.length > 1 ? 's' : ''} après enregistrement.
        {numeros.length < 2 && ' Il en faut au moins deux.'}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={enCours || numeros.length < 2}
          onClick={() =>
            lancer(
              () =>
                enregistrerEquipesDepart(
                  tournoi.id,
                  edition.map((l) => ({ participantId: l.participantId, numero: l.numero })),
                ),
              'Équipes enregistrées.',
              () => setEdition(null),
            )
          }
          className={`${BTN} bg-terracotta text-white`}
        >
          <Check size={14} /> {enCours ? 'Enregistrement…' : 'Enregistrer les équipes'}
        </button>
        <button
          type="button"
          onClick={() => setEdition(null)}
          className={`${BTN} border border-ligne bg-sable`}
        >
          <X size={14} /> Annuler
        </button>
      </div>
    </Carte>
  );
}

// ------------------------------------------------------------------ partie

function VuePartie({
  numero,
  tournoi,
  partiesDetail,
  membresDe,
  numeroDe,
  partieComplete,
  enCours,
  lancer,
  donneesPdf,
}: {
  numero: number;
  tournoi: Tournoi;
  partiesDetail: PartieDetail[];
  membresDe: (id: number) => string;
  numeroDe: (id: number) => number;
  partieComplete: (d: PartieDetail) => boolean;
  enCours: boolean;
  lancer: (a: () => Promise<{ ok: boolean; error?: string }>, m?: string, onSucces?: () => void) => void;
  donneesPdf: DonneesPdf;
}) {
  const detail = partiesDetail.find((d) => d.numero === numero);
  const precedente = partiesDetail.find((d) => d.numero === numero - 1);
  const estDerniere = partiesDetail.length === numero;

  if (!detail) {
    const bloquee = numero > 1 && (!precedente || !partieComplete(precedente));
    return (
      <Carte titre={`Partie ${numero}`}>
        <p className="mb-4 text-[13px] text-encre-douce">
          {bloquee
            ? `Il reste des résultats à saisir en partie ${numero - 1} : les appariements de celle-ci en dépendent.`
            : numero === 1
              ? 'Aucun appariement. Le tirage compose les rencontres au hasard.'
              : 'Les équipes vont être appariées selon leur nombre de victoires, sans revanche, en évitant de rejouer un terrain déjà occupé.'}
        </p>
        <button
          type="button"
          disabled={enCours || bloquee || partiesDetail.length !== numero - 1}
          onClick={() =>
            lancer(async () => {
              const r = await composerProchainePartie(tournoi.id);
              return r.ok ? { ok: true } : { ok: false, error: r.error };
            }, `Partie ${numero} composée.`)
          }
          className={`${BTN} bg-terracotta text-white`}
        >
          <Shuffle size={14} />
          {numero === 1 ? 'Tirer au sort la partie 1' : `Composer la partie ${numero}`}
        </button>
      </Carte>
    );
  }

  return (
    <section className="flex flex-col gap-3">
      {detail.revancheForcee && (
        <p className="rounded-xl border border-laiton/40 bg-laiton/10 px-4 py-2.5 text-[12.5px] text-[#7a5c1f]">
          À ce stade il n&apos;était plus possible d&apos;éviter toutes les revanches : des équipes
          se rencontrent une deuxième fois.
        </p>
      )}
      {detail.equipeExempteId != null && (
        <p className="rounded-xl border border-ligne bg-sable-carte px-4 py-2.5 text-[12.5px] text-encre-douce">
          <b className="text-encre">Équipe {numeroDe(detail.equipeExempteId)} exempte</b> (
          {membresDe(detail.equipeExempteId)}) — créditée d&apos;une victoire, goal-average neutre.
        </p>
      )}

      {detail.rencontres.map((r) => (
        <LigneRencontre
          key={r.id}
          rencontre={r}
          but={tournoi.pointsVictoire}
          membresDe={membresDe}
          numeroDe={numeroDe}
          lancer={lancer}
        />
      ))}

      <div className="mt-1 flex flex-wrap gap-2">
        <BoutonPdf
          libelle="Imprimer les rencontres"
          fichier={nomFichier(tournoi.nom, tournoi.dateTournoi, `partie-${numero}`)}
          document={DocumentPartie(donneesPdf, numero)}
          principal
        />
        {partiesDetail.length > 1 && (
          <BoutonPdf
            libelle="Toutes les parties"
            fichier={nomFichier(tournoi.nom, tournoi.dateTournoi, 'parties')}
            document={DocumentToutesParties(donneesPdf)}
          />
        )}
        {estDerniere && (
          <button
            type="button"
            disabled={enCours}
            onClick={() => {
              if (!confirm(`Supprimer la partie ${numero} et tous ses scores ?`)) return;
              lancer(() => annulerDernierePartie(tournoi.id), `Partie ${numero} annulée.`);
            }}
            className={`${BTN} border border-danger/30 bg-danger/8 text-danger`}
          >
            <Trash2 size={14} /> Annuler cette partie
          </button>
        )}
      </div>
    </section>
  );
}

function LigneRencontre({
  rencontre,
  but,
  membresDe,
  numeroDe,
  lancer,
}: {
  rencontre: PartieDetail['rencontres'][number];
  but: number;
  membresDe: (id: number) => string;
  numeroDe: (id: number) => number;
  lancer: (a: () => Promise<{ ok: boolean; error?: string }>, m?: string, onSucces?: () => void) => void;
}) {
  const [a, setA] = useState<string>(rencontre.scoreA?.toString() ?? '');
  const [b, setB] = useState<string>(rencontre.scoreB?.toString() ?? '');

  const nA = a === '' ? null : Number(a);
  const nB = b === '' ? null : Number(b);
  const vide = nA == null && nB == null;
  const valide = scoreValide({ scoreA: nA, scoreB: nB }, but);
  const mauvais = !vide && !valide;

  function envoyer() {
    if (mauvais) return;
    if (nA === rencontre.scoreA && nB === rencontre.scoreB) return;
    lancer(() => enregistrerScore(rencontre.id, nA, nB));
  }

  const cote = (nom: string, membres: string, score: string, set: (v: string) => void, gagne: boolean) => (
    <div className={`flex items-center gap-3 px-4 py-2.5 ${gagne ? 'bg-pin/6' : ''}`}>
      <div className="min-w-0 flex-1">
        <p className="text-[13.5px] font-medium">{nom}</p>
        <p className="truncate text-[11.5px] text-encre-douce">{membres}</p>
      </div>
      <input
        type="number"
        min={0}
        inputMode="numeric"
        value={score}
        onChange={(e) => set(e.target.value)}
        onBlur={envoyer}
        className={`font-score w-14 rounded-lg border bg-sable py-1 text-center text-[19px] outline-none focus:border-terracotta ${
          mauvais ? 'border-danger' : 'border-ligne'
        }`}
      />
      <span className="font-score w-4 text-[15px] text-pin">{gagne ? 'V' : ''}</span>
    </div>
  );

  return (
    <article
      className={`overflow-hidden rounded-2xl border bg-sable-carte ${
        valide ? 'border-pin/30' : 'border-ligne'
      }`}
    >
      <div className="flex items-center gap-3 border-b border-ligne bg-sable px-4 py-1.5">
        <span className="font-score rounded-full bg-marine px-2.5 py-0.5 text-[12px] tracking-wide text-white">
          Terrain {rencontre.terrain}
        </span>
        {mauvais && (
          <span className="ml-auto text-[11.5px] text-danger">
            Score invalide — un vainqueur, à {but} au moins
          </span>
        )}
      </div>
      {cote(
        `Équipe ${numeroDe(rencontre.equipeAId)}`,
        membresDe(rencontre.equipeAId),
        a,
        setA,
        valide && nA! > nB!,
      )}
      <div className="border-t border-dashed border-ligne" />
      {cote(
        `Équipe ${numeroDe(rencontre.equipeBId)}`,
        membresDe(rencontre.equipeBId),
        b,
        setB,
        valide && nB! > nA!,
      )}
    </article>
  );
}

// -------------------------------------------------------------- classement

function VueClassement({
  tournoi,
  classement,
  libelles,
  toutesJouees,
  enCours,
  lancer,
  donneesPdf,
}: {
  tournoi: Tournoi;
  classement: StatsClassees[];
  libelles: Record<number, string>;
  toutesJouees: boolean;
  enCours: boolean;
  lancer: (a: () => Promise<{ ok: boolean; error?: string }>, m?: string, onSucces?: () => void) => void;
  donneesPdf: DonneesPdf;
}) {
  return (
    <section className="flex flex-col gap-5">
      <Carte titre={tournoi.statut === 'termine' ? 'Classement final' : 'Classement provisoire'}>
        <p className="mb-4 text-[12px] text-encre-douce">
          Départage : nombre de victoires, puis goal-average (points marqués − encaissés), puis
          points marqués. {tournoi.format === 'melee' && 'Classement individuel : chaque joueur hérite du résultat de son équipe du tour.'}
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[430px] text-[13.5px]">
            <thead>
              <tr className="border-b border-encre/20 text-[10.5px] text-encre-douce">
                <th className="w-10 pb-2 text-center font-medium">Rg</th>
                <th className="pb-2 text-left font-medium">
                  {tournoi.format === 'melee' ? 'Joueur' : 'Équipe'}
                </th>
                <th className="w-9 pb-2 text-center font-medium">J</th>
                <th className="w-9 pb-2 text-center font-medium">V</th>
                <th className="w-9 pb-2 text-center font-medium">D</th>
                <th className="w-12 pb-2 text-center font-medium">Pts +</th>
                <th className="w-12 pb-2 text-center font-medium">Pts −</th>
                <th className="w-14 pb-2 text-center font-medium">Goal-av.</th>
              </tr>
            </thead>
            <tbody>
              {classement.map((s) => (
                <tr key={s.id} className="border-b border-ligne last:border-0">
                  <td className="font-score py-2.5 text-center text-[17px] text-encre-douce">
                    {s.rang}
                    {s.exaequo && <span className="ml-0.5 text-[10px] text-laiton">=</span>}
                  </td>
                  <td className="py-2.5">{libelles[s.id] ?? s.id}</td>
                  <td className="py-2.5 text-center">{s.joues}</td>
                  <td className="font-score py-2.5 text-center text-[17px] text-pin">{s.victoires}</td>
                  <td className="py-2.5 text-center">{s.defaites}</td>
                  <td className="py-2.5 text-center">{s.pointsPour}</td>
                  <td className="py-2.5 text-center">{s.pointsContre}</td>
                  <td
                    className={`font-score py-2.5 text-center text-[15px] ${
                      s.diff > 0 ? 'text-pin' : s.diff < 0 ? 'text-danger' : ''
                    }`}
                  >
                    {s.diff > 0 ? '+' : ''}
                    {s.diff}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {classement.some((s) => s.exaequo) && (
          <p className="mt-3 text-[11.5px] text-encre-douce">
            Les lignes marquées « = » sont strictement ex æquo — mêmes victoires, même goal-average,
            mêmes points marqués. À départager sur place.
          </p>
        )}
      </Carte>

      <div className="flex flex-wrap gap-2">
        <BoutonPdf
          libelle="Imprimer le classement"
          fichier={nomFichier(tournoi.nom, tournoi.dateTournoi, 'classement')}
          document={DocumentClassement(donneesPdf)}
          principal
        />
        {tournoi.statut !== 'termine' ? (
          <button
            type="button"
            disabled={enCours || !toutesJouees}
            onClick={() => lancer(() => cloturerTournoi(tournoi.id), 'Tournoi clôturé.')}
            className={`${BTN} bg-pin text-white`}
          >
            <Check size={14} /> Clôturer le tournoi
          </button>
        ) : (
          <button
            type="button"
            disabled={enCours}
            onClick={() => lancer(() => rouvrirTournoi(tournoi.id), 'Tournoi rouvert.')}
            className={`${BTN} border border-ligne bg-sable`}
          >
            Rouvrir le tournoi
          </button>
        )}
        {!toutesJouees && tournoi.statut !== 'termine' && (
          <p className="self-center text-[11.5px] text-encre-douce">
            La clôture attend que toutes les parties soient jouées et saisies.
          </p>
        )}
      </div>
    </section>
  );
}

// ------------------------------------------------------------------- carte

function Carte({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <section className="entree rounded-2xl border border-ligne bg-sable-carte p-5">
      <h2 className="font-display mb-3 text-[16px]">{titre}</h2>
      {children}
    </section>
  );
}
