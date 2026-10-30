import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer';
import { CLUB } from '@/lib/club';
import { scoreValide, type StatsClassees } from '@/lib/tournoi/moteur';
import type { Participant, PartieDetail, Tournoi } from '@/lib/tournoi/donnees';
import type { VuePoules } from '@/lib/tournoi/poulesDonnees';

// Charte v2 en littéral : react-pdf n'a pas accès aux variables CSS
// (même liste que FichesMembresPdf.tsx / PlanningPdf.tsx).
const MARINE = '#1c3a56';
const ENCRE = '#241b12';
const ENCRE_DOUCE = '#5a4c3c';
const LIGNE = '#e3d5b8';
const TERRACOTTA = '#c1522b';
const PIN = '#24463a';
const SABLE_CARTE = '#fbf6ea';

const styles = StyleSheet.create({
  page: { padding: 34, fontSize: 10, fontFamily: 'Helvetica', color: ENCRE },
  entete: { flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1.5, borderBottomColor: ENCRE, paddingBottom: 8 },
  logo: { width: 52, height: 27 },
  club: { fontSize: 8.5, color: ENCRE_DOUCE, textTransform: 'uppercase' },
  titre: { fontSize: 16, fontWeight: 700, color: ENCRE, marginTop: 2 },
  sous: { fontSize: 8.5, color: ENCRE_DOUCE, marginTop: 3 },

  // liste des équipes / participants : trois colonnes
  grille: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 12 },
  bloc: { width: '33.33%', paddingRight: 8, marginBottom: 8 },
  blocCadre: { borderWidth: 1, borderColor: '#9a9a95', borderRadius: 5, padding: 6, backgroundColor: SABLE_CARTE },
  blocTitre: { fontSize: 9.5, fontWeight: 700, color: TERRACOTTA, borderBottomWidth: 0.7, borderBottomColor: LIGNE, paddingBottom: 2, marginBottom: 3 },
  blocLigne: { fontSize: 9, marginBottom: 1.5 },
  vide: { fontSize: 9, color: '#9a9a95', marginBottom: 1.5 },

  // tableaux
  thead: { flexDirection: 'row', borderBottomWidth: 1.2, borderBottomColor: ENCRE, paddingBottom: 4, marginTop: 14 },
  th: { fontSize: 7.5, fontWeight: 700, color: ENCRE_DOUCE, textTransform: 'uppercase' },
  tr: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 0.6, borderBottomColor: LIGNE, paddingVertical: 7 },
  equipeNom: { fontSize: 10, fontWeight: 700 },
  equipeMembres: { fontSize: 8, color: ENCRE_DOUCE, marginTop: 1 },

  terrain: { fontSize: 9, fontWeight: 700, color: '#fff', backgroundColor: MARINE, borderRadius: 8, paddingVertical: 2, textAlign: 'center' },
  scoreZone: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  caseScore: { width: 26, height: 20, borderWidth: 1, borderColor: '#55544f', borderRadius: 3, textAlign: 'center', paddingTop: 4, fontSize: 11, fontWeight: 700 },
  tiret: { fontSize: 10, color: ENCRE_DOUCE },

  note: { fontSize: 8.5, color: ENCRE_DOUCE, marginTop: 10 },
  etiquette: { fontSize: 7.5, fontWeight: 700, color: TERRACOTTA, marginTop: 5, textTransform: 'uppercase' },
  sectionTitre: { fontSize: 11.5, fontWeight: 700, color: ENCRE, marginTop: 14, marginBottom: 2 },
  sectionSous: { fontSize: 8, fontWeight: 700, color: ENCRE_DOUCE, textTransform: 'uppercase', marginTop: 8, marginBottom: 2 },
  pied: { position: 'absolute', bottom: 22, left: 34, right: 34, fontSize: 7.5, color: ENCRE_DOUCE, borderTopWidth: 0.6, borderTopColor: LIGNE, paddingTop: 5, textAlign: 'center' },
});

export type DonneesPdf = {
  tournoi: Tournoi;
  participants: Participant[];
  equipesPermanentes: { id: number; numero: number; membres: number[] }[];
  partiesDetail: PartieDetail[];
  equipesParId: Record<number, { numero: number; membres: number[] }>;
  classement: StatsClassees[];
  libelles: Record<number, string>;
  /** Poules, tableaux et libellés des rencontres ; absent hors format « poules ». */
  vuePoules?: VuePoules | null;
};

const LIBELLE_TAILLE: Record<number, string> = { 1: 'Tête-à-tête', 2: 'Doublettes', 3: 'Triplettes' };

function formaterDate(iso: string) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function Entete({ titre, sous }: { titre: string; sous: string }) {
  return (
    <View style={styles.entete}>
      {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf n'a pas d'attribut alt */}
      <Image src="/logo.png" style={styles.logo} />
      {/* flex:1 pour que le sous-titre passe a la ligne au lieu de deborder */}
      <View style={{ flex: 1 }}>
        <Text style={styles.club}>{CLUB.nomComplet}</Text>
        <Text style={styles.titre}>{titre}</Text>
        <Text style={styles.sous}>{sous}</Text>
      </View>
    </View>
  );
}

function Pied({ tournoi }: { tournoi: Tournoi }) {
  return (
    <Text
      style={styles.pied}
      render={({ pageNumber, totalPages }) =>
        `${tournoi.nom} · ${formaterDate(tournoi.dateTournoi)} · page ${pageNumber}/${totalPages}`
      }
      fixed
    />
  );
}

function sousTitre(t: Tournoi) {
  const format =
    t.format === 'melee'
      ? 'à la mêlée'
      : t.format === 'poules'
        ? `poules ${t.poules?.mode === 'repechage' ? 'à repêchage' : 'toutes rondes'}`
        : 'équipes fixes';
  const parties = t.format === 'poules' ? '' : ` · ${t.nbParties} parties`;
  return `${formaterDate(t.dateTournoi)} · ${format} · ${LIBELLE_TAILLE[t.tailleEquipe]}${parties} · en ${t.pointsVictoire} points`;
}

/* ------------------------------------------------------ liste des équipes */

/**
 * En équipes fixes on imprime les équipes ; en mêlée elles changent à chaque
 * partie, donc la feuille utile est la liste des joueurs (celle qu'on coche
 * à l'accueil).
 */
export function DocumentListe(d: DonneesPdf) {
  const { tournoi, participants, equipesPermanentes, equipesParId } = d;
  const nomDe = new Map(participants.map((p) => [p.id, p.nom]));
  const parEquipes = tournoi.format !== 'melee' && equipesPermanentes.length > 0;

  const joueurs = [...participants].sort((a, b) =>
    a.nom.localeCompare(b.nom, 'fr', { sensitivity: 'base' }),
  );

  return (
    <Document title={`${tournoi.nom} — ${parEquipes ? 'équipes' : 'participants'}`}>
      <Page size="A4" style={styles.page}>
        <Entete
          titre={parEquipes ? 'Les équipes' : 'Les participants'}
          sous={`${sousTitre(tournoi)} · ${participants.length} participants`}
        />
        <View style={styles.grille}>
          {parEquipes
            ? equipesPermanentes.map((e) => (
                <View key={e.id} style={styles.bloc} wrap={false}>
                  <View style={styles.blocCadre}>
                    <Text style={styles.blocTitre}>Équipe {e.numero}</Text>
                    {Array.from({ length: tournoi.tailleEquipe }).map((_, i) => {
                      const membre = (equipesParId[e.id]?.membres ?? [])[i];
                      return membre ? (
                        <Text key={i} style={styles.blocLigne}>
                          {nomDe.get(membre) ?? '—'}
                        </Text>
                      ) : (
                        <Text key={i} style={styles.vide}>
                          —
                        </Text>
                      );
                    })}
                  </View>
                </View>
              ))
            : joueurs.map((p) => (
                <View key={p.id} style={styles.bloc} wrap={false}>
                  <View style={styles.blocCadre}>
                    <Text style={styles.blocLigne}>{p.nom}</Text>
                  </View>
                </View>
              ))}
        </View>
        <Pied tournoi={tournoi} />
      </Page>
    </Document>
  );
}

/* ---------------------------------------------------------- une partie */

function PagePartie({ d, partie }: { d: DonneesPdf; partie: PartieDetail }) {
  const { tournoi, participants, equipesParId } = d;
  const nomDe = new Map(participants.map((p) => [p.id, p.nom]));
  const membresDe = (id: number) =>
    (equipesParId[id]?.membres ?? []).map((m) => nomDe.get(m) ?? '?').join(' · ');
  const numeroDe = (id: number) => equipesParId[id]?.numero ?? id;

  const complete = partie.rencontres.every((r) =>
    scoreValide({ scoreA: r.scoreA, scoreB: r.scoreB }, tournoi.pointsVictoire),
  );

  return (
    <Page size="A4" style={styles.page}>
      <Entete
        titre={partie.libelle ? `Partie ${partie.numero} — ${partie.libelle}` : `Partie ${partie.numero}`}
        sous={`${sousTitre(tournoi)} · ${complete ? 'résultats saisis' : 'feuille de match à remplir'}`}
      />

      <View style={styles.thead}>
        <Text style={[styles.th, { width: 52, textAlign: 'center' }]}>Terrain</Text>
        <Text style={[styles.th, { flex: 1 }]}>Équipe</Text>
        <Text style={[styles.th, { width: 90, textAlign: 'center' }]}>Score</Text>
        <Text style={[styles.th, { flex: 1 }]}>Équipe</Text>
      </View>

      {partie.rencontres.map((r) => {
        const ok = scoreValide({ scoreA: r.scoreA, scoreB: r.scoreB }, tournoi.pointsVictoire);
        return (
          <View key={r.id} wrap={false}>
            {d.vuePoules?.etiquettes[r.id] && <Text style={styles.etiquette}>{d.vuePoules.etiquettes[r.id]}</Text>}
            <View style={styles.tr}>
            <View style={{ width: 52 }}>
              <Text style={styles.terrain}>{r.terrain}</Text>
            </View>
            <View style={{ flex: 1, paddingHorizontal: 6 }}>
              <Text style={styles.equipeNom}>Équipe {numeroDe(r.equipeAId)}</Text>
              <Text style={styles.equipeMembres}>{membresDe(r.equipeAId)}</Text>
            </View>
            <View style={[styles.scoreZone, { width: 90 }]}>
              <Text style={styles.caseScore}>{ok ? String(r.scoreA) : ' '}</Text>
              <Text style={styles.tiret}>–</Text>
              <Text style={styles.caseScore}>{ok ? String(r.scoreB) : ' '}</Text>
            </View>
            <View style={{ flex: 1, paddingHorizontal: 6 }}>
              <Text style={styles.equipeNom}>Équipe {numeroDe(r.equipeBId)}</Text>
              <Text style={styles.equipeMembres}>{membresDe(r.equipeBId)}</Text>
            </View>
            </View>
          </View>
        );
      })}

      {partie.equipeExempteId != null && (
        <Text style={styles.note}>
          Équipe {numeroDe(partie.equipeExempteId)} exempte ({membresDe(partie.equipeExempteId)}) —
          créditée d&apos;une victoire, goal-average neutre.
        </Text>
      )}
      {partie.revancheForcee && (
        <Text style={styles.note}>
          Certaines équipes se rencontrent une deuxième fois : il n&apos;était plus possible
          d&apos;éviter toutes les revanches.
        </Text>
      )}

      <Pied tournoi={tournoi} />
    </Page>
  );
}

export function DocumentPartie(d: DonneesPdf, numero: number) {
  const partie = d.partiesDetail.find((p) => p.numero === numero);
  return (
    <Document title={`${d.tournoi.nom} — partie ${numero}`}>
      {partie ? <PagePartie d={d} partie={partie} /> : <Page size="A4" style={styles.page} />}
    </Document>
  );
}

/** Toutes les parties composées, une par page. */
export function DocumentToutesParties(d: DonneesPdf) {
  return (
    <Document title={`${d.tournoi.nom} — toutes les parties`}>
      {d.partiesDetail.map((p) => (
        <PagePartie key={p.id} d={d} partie={p} />
      ))}
    </Document>
  );
}

/* ------------------------------------------------------------ classement */

export function DocumentClassement(d: DonneesPdf) {
  const { tournoi, classement, libelles } = d;
  const jouees = d.partiesDetail.filter((p) =>
    p.rencontres.every((r) => scoreValide({ scoreA: r.scoreA, scoreB: r.scoreB }, tournoi.pointsVictoire)),
  ).length;

  const colNum = { width: 34, textAlign: 'center' as const };

  return (
    <Document title={`${tournoi.nom} — classement`}>
      <Page size="A4" style={styles.page}>
        <Entete
          titre={tournoi.statut === 'termine' ? 'Classement final' : 'Classement provisoire'}
          sous={`${sousTitre(tournoi)} · ${jouees} partie(s) jouée(s) · départage : victoires, goal-average, points marqués`}
        />

        <View style={styles.thead}>
          <Text style={[styles.th, colNum]}>Rg</Text>
          <Text style={[styles.th, { flex: 1, paddingLeft: 6 }]}>
            {tournoi.format === 'melee' ? 'Joueur' : 'Équipe'}
          </Text>
          <Text style={[styles.th, colNum]}>J</Text>
          <Text style={[styles.th, colNum]}>V</Text>
          <Text style={[styles.th, colNum]}>D</Text>
          <Text style={[styles.th, { width: 44, textAlign: 'center' }]}>Pts +</Text>
          <Text style={[styles.th, { width: 44, textAlign: 'center' }]}>Pts −</Text>
          <Text style={[styles.th, { width: 52, textAlign: 'center' }]}>Goal-av.</Text>
        </View>

        {classement.map((s) => (
          <View key={s.id} style={styles.tr} wrap={false}>
            <Text style={[{ fontSize: 11, fontWeight: 700, color: ENCRE_DOUCE }, colNum]}>
              {s.rang}
              {s.exaequo ? ' =' : ''}
            </Text>
            <Text style={{ flex: 1, paddingLeft: 6, fontSize: 10 }}>{libelles[s.id] ?? s.id}</Text>
            <Text style={colNum}>{s.joues}</Text>
            <Text style={[{ fontWeight: 700, color: PIN }, colNum]}>{s.victoires}</Text>
            <Text style={colNum}>{s.defaites}</Text>
            <Text style={{ width: 44, textAlign: 'center' }}>{s.pointsPour}</Text>
            <Text style={{ width: 44, textAlign: 'center' }}>{s.pointsContre}</Text>
            <Text style={{ width: 52, textAlign: 'center', fontWeight: 700 }}>
              {s.diff > 0 ? '+' : ''}
              {s.diff}
            </Text>
          </View>
        ))}

        {classement.some((s) => s.exaequo) && (
          <Text style={styles.note}>
            Les lignes marquées « = » sont strictement ex æquo — mêmes victoires, même goal-average,
            mêmes points marqués. À départager sur place.
          </Text>
        )}

        <Pied tournoi={tournoi} />
      </Page>
    </Document>
  );
}

/* --------------------------------------------------------------- les poules */

function aides(d: DonneesPdf) {
  const nomDe = new Map(d.participants.map((p) => [p.id, p.nom]));
  const numeroDe = (id: number) => d.equipesParId[id]?.numero ?? id;
  const membresDe = (id: number) => (d.equipesParId[id]?.membres ?? []).map((m) => nomDe.get(m) ?? '?').join(' · ');
  return { numeroDe, membresDe, nomEquipe: (id: number | null) => (id == null ? '—' : `Équipe ${numeroDe(id)}`) };
}

/** Composition des poules : la feuille qu'on affiche au lancement du concours. */
export function DocumentPoules(d: DonneesPdf) {
  const { tournoi, vuePoules } = d;
  const { numeroDe, membresDe } = aides(d);
  const poules = vuePoules?.poules ?? [];
  return (
    <Document title={`${tournoi.nom} — les poules`}>
      <Page size="A4" style={styles.page}>
        <Entete titre="Les poules" sous={`${sousTitre(tournoi)} · ${poules.length} poules`} />
        <View style={styles.grille}>
          {poules.map((p) => (
            <View key={p.id} style={[styles.bloc, { width: '50%' }]} wrap={false}>
              <View style={styles.blocCadre}>
                <Text style={styles.blocTitre}>Poule {p.nom}</Text>
                {[...p.classement].sort((a, b) => a.ordreTirage - b.ordreTirage).map((l) => (
                  <View key={l.id} style={{ marginBottom: 3 }}>
                    <Text style={styles.blocLigne}>
                      <Text style={{ fontWeight: 700 }}>Équipe {numeroDe(l.id)}</Text> — {membresDe(l.id)}
                    </Text>
                    {vuePoules?.clubs[l.id] ? <Text style={styles.equipeMembres}>{vuePoules.clubs[l.id]}</Text> : null}
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>
        {vuePoules && (
          <Text style={styles.note}>
            {vuePoules.mode === 'repechage'
              ? 'Poules à repêchage : 1-2 et 3-4, puis gagnants entre eux et perdants entre eux, puis barrage ; 2 qualifiés par poule.'
              : `Poules toutes rondes : chaque équipe rencontre toutes les autres de sa poule ; ${vuePoules.qualifies} qualifié${vuePoules.qualifies > 1 ? 's' : ''} par poule.`}
            {vuePoules.consolante ? ' Les équipes éliminées en poule jouent la consolante.' : ''}
          </Text>
        )}
        <Pied tournoi={tournoi} />
      </Page>
    </Document>
  );
}

/** Résultats du concours : classement de chaque poule, rencontres et classement des tableaux. */
export function DocumentResultatsPoules(d: DonneesPdf) {
  const { tournoi, vuePoules, partiesDetail } = d;
  const { membresDe, nomEquipe } = aides(d);
  const colNum = { width: 30, textAlign: 'center' as const };
  const rencontres = partiesDetail.flatMap((p) => p.rencontres);
  const TITRES = { principal: 'Tableau principal', consolante: 'Consolante' } as const;

  return (
    <Document title={`${tournoi.nom} — résultats`}>
      <Page size="A4" style={styles.page}>
        <Entete
          titre={tournoi.statut === 'termine' ? 'Résultats' : 'Résultats provisoires'}
          sous={`${sousTitre(tournoi)} · départage en poule : victoires, confrontation directe, goal-average, points marqués`}
        />

        {(vuePoules?.poules ?? []).map((p) => (
          <View key={p.id} wrap={false}>
            <Text style={styles.sectionTitre}>Poule {p.nom}</Text>
            <View style={[styles.thead, { marginTop: 3 }]}>
              <Text style={[styles.th, colNum]}>Rg</Text>
              <Text style={[styles.th, { flex: 1, paddingLeft: 6 }]}>Équipe</Text>
              <Text style={[styles.th, colNum]}>J</Text>
              <Text style={[styles.th, colNum]}>V</Text>
              <Text style={[styles.th, { width: 40, textAlign: 'center' }]}>Pts +</Text>
              <Text style={[styles.th, { width: 40, textAlign: 'center' }]}>Pts -</Text>
              <Text style={[styles.th, { width: 46, textAlign: 'center' }]}>Goal-av.</Text>
              <Text style={[styles.th, { width: 56, textAlign: 'center' }]} />
            </View>
            {p.classement.map((l) => (
              <View key={l.id} style={[styles.tr, { paddingVertical: 4 }]}>
                <Text style={[{ fontSize: 10.5, fontWeight: 700, color: ENCRE_DOUCE }, colNum]}>
                  {l.rang}
                  {l.exaequo ? ' =' : ''}
                </Text>
                <View style={{ flex: 1, paddingLeft: 6 }}>
                  <Text style={styles.equipeNom}>{nomEquipe(l.id)}</Text>
                  <Text style={styles.equipeMembres}>{membresDe(l.id)}</Text>
                </View>
                <Text style={colNum}>{l.joues}</Text>
                <Text style={[{ fontWeight: 700, color: PIN }, colNum]}>{l.victoires}</Text>
                <Text style={{ width: 40, textAlign: 'center' }}>{l.pointsPour}</Text>
                <Text style={{ width: 40, textAlign: 'center' }}>{l.pointsContre}</Text>
                <Text style={{ width: 46, textAlign: 'center', fontWeight: 700 }}>
                  {l.diff > 0 ? '+' : ''}
                  {l.diff}
                </Text>
                <Text style={{ width: 56, textAlign: 'center', fontSize: 8, fontWeight: 700, color: PIN }}>
                  {p.complet && l.rang <= p.qualifiesK ? 'QUALIFIÉE' : ''}
                </Text>
              </View>
            ))}
          </View>
        ))}

        {(vuePoules?.tableaux ?? []).map((t) => {
          const siennes = rencontres.filter((r) => vuePoules?.etiquettes[r.id]?.startsWith(`${TITRES[t.tableau]} ·`));
          const tours = [...new Set(siennes.map((r) => vuePoules!.etiquettes[r.id]))];
          const rangs = [...new Set(t.classement.map((c) => c.rang).filter((r): r is number => r != null))].sort((a, b) => a - b);
          return (
            <View key={t.tableau}>
              <Text style={[styles.sectionTitre, { marginTop: 18 }]}>{TITRES[t.tableau]}</Text>
              {tours.map((tour) => (
                <View key={tour} wrap={false}>
                  <Text style={styles.sectionSous}>{tour.split('· ')[1]}</Text>
                  {siennes
                    .filter((r) => vuePoules!.etiquettes[r.id] === tour)
                    .map((r) => {
                      const joue = r.scoreA != null && r.scoreB != null;
                      const gagneA = joue && r.scoreA! > r.scoreB!;
                      return (
                        <View key={r.id} style={[styles.tr, { paddingVertical: 4 }]}>
                          <Text style={{ flex: 1, textAlign: 'right', fontWeight: gagneA ? 700 : 400 }}>{nomEquipe(r.equipeAId)}</Text>
                          <Text style={{ width: 70, textAlign: 'center', fontWeight: 700 }}>{joue ? `${r.scoreA} – ${r.scoreB}` : '– – –'}</Text>
                          <Text style={{ flex: 1, fontWeight: joue && !gagneA ? 700 : 400 }}>{nomEquipe(r.equipeBId)}</Text>
                        </View>
                      );
                    })}
                </View>
              ))}
              {t.termine && (
                <View wrap={false}>
                  <Text style={styles.sectionSous}>Classement du tableau</Text>
                  {rangs.map((rg) => (
                    <Text key={rg} style={styles.blocLigne}>
                      <Text style={{ fontWeight: 700, color: TERRACOTTA }}>{rg === 1 ? 'Vainqueur' : rg === 2 ? 'Finaliste' : `${rg}e`}</Text>
                      {'  '}
                      {t.classement
                        .filter((c) => c.rang === rg)
                        .map((c) => nomEquipe(c.id))
                        .join(' · ')}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          );
        })}

        <Pied tournoi={tournoi} />
      </Page>
    </Document>
  );
}
