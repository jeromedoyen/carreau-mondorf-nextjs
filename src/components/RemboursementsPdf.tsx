import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { CLUB } from '@/lib/club';
import type { ParticipationConcours } from '@/lib/remboursements';

const MARINE = '#1c3a56';
const ENCRE = '#241b12';
const ENCRE_DOUCE = '#5a4c3c';
const LIGNE = '#e3d5b8';
const SABLE_CARTE = '#fbf6ea';
const TERRACOTTA = '#c1522b';
const PIN = '#24463a';

const styles = StyleSheet.create({
  page: { padding: 28, fontSize: 8.5, fontFamily: 'Helvetica', color: ENCRE },
  entete: { marginBottom: 10 },
  club: { fontSize: 12, fontWeight: 700, color: MARINE },
  titre: { fontSize: 11, fontWeight: 700, color: TERRACOTTA, marginTop: 2 },
  sousTitre: { fontSize: 9, color: ENCRE_DOUCE, marginTop: 2 },
  ligneMaitre: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: LIGNE,
    backgroundColor: SABLE_CARTE,
    marginTop: 6,
  },
  cellMaitreNom: { padding: 4, fontSize: 8.5, fontWeight: 700, color: PIN, width: '65%' },
  cellMaitreTotal: { padding: 4, fontSize: 8.5, fontWeight: 700, color: PIN, width: '35%', textAlign: 'right' },
  ligne: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: LIGNE, paddingLeft: 12 },
  cell: { padding: 4, fontSize: 8 },
  colType: { width: '20%' },
  colDate: { width: '18%' },
  colClub: { width: '24%' },
  colMontant: { width: '13%', textAlign: 'right' },
  colStatut: { width: '13%' },
  total: { marginTop: 8, fontSize: 9, fontWeight: 700, color: PIN, textAlign: 'right' },
});

const LIBELLE_TYPE: Record<string, string> = {
  Championnat_D2: 'National D2',
  Promotion: 'Promotion',
  Concours_National: 'Championnat national',
  Concours: 'Concours',
};
const LIBELLE_STATUT: Record<string, string> = { en_attente: 'En attente', valide: 'Validé', paye: 'Payé' };

function formatDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function regrouperParJoueur(participations: ParticipationConcours[]) {
  const parJoueur = new Map<number, { personneNom: string; lignes: ParticipationConcours[]; total: number }>();
  for (const p of participations) {
    const g = parJoueur.get(p.personneId) ?? { personneNom: p.personneNom, lignes: [], total: 0 };
    g.lignes.push(p);
    g.total += p.montantFinal ?? 0;
    parJoueur.set(p.personneId, g);
  }
  for (const g of parJoueur.values()) g.lignes.sort((a, b) => a.date.localeCompare(b.date));
  return [...parJoueur.values()].sort((a, b) => a.personneNom.localeCompare(b.personneNom));
}

function Tableau({ participations }: { participations: ParticipationConcours[] }) {
  const groupes = regrouperParJoueur(participations);
  const total = participations.reduce((s, p) => s + (p.montantFinal ?? 0), 0);
  return (
    <View>
      {groupes.map((g) => (
        <View key={g.personneNom} wrap={false}>
          <View style={styles.ligneMaitre}>
            <Text style={styles.cellMaitreNom}>{g.personneNom}</Text>
            <Text style={styles.cellMaitreTotal}>{g.total.toFixed(2)} €</Text>
          </View>
          {g.lignes.map((p) => (
            <View key={p.id} style={styles.ligne}>
              <Text style={[styles.cell, styles.colType]}>{LIBELLE_TYPE[p.type]}</Text>
              <Text style={[styles.cell, styles.colDate]}>{formatDate(p.date)}</Text>
              <Text style={[styles.cell, styles.colClub]}>{p.club ?? '—'}</Text>
              <Text style={[styles.cell, styles.colMontant]}>{p.montantFinal != null ? `${p.montantFinal.toFixed(2)} €` : '—'}</Text>
              <Text style={[styles.cell, styles.colStatut]}>{LIBELLE_STATUT[p.statut] ?? p.statut}</Text>
            </View>
          ))}
        </View>
      ))}
      <Text style={styles.total}>Total : {total.toFixed(2)} €</Text>
    </View>
  );
}

/** Export PDF des listes de remboursement (demande via /pb, note #111,
 *  02/08/2026 — "que le trésorier puisse l'imprimer") : simple photographie
 *  de l'état au moment du téléchargement, un statut par ligne (Payé/Validé/
 *  En attente) — le trésorier peut donc traiter la liste en plusieurs fois
 *  et re-télécharger un PDF à jour à tout moment, la validation elle-même
 *  reste dans l'app (pas dans le PDF). */
export function RemboursementsPdf({
  saison,
  championnat,
  concours,
}: {
  saison: string;
  championnat: ParticipationConcours[];
  concours: ParticipationConcours[];
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.entete}>
          <Text style={styles.club}>{CLUB.nomComplet}</Text>
          <Text style={styles.titre}>Remboursements concours — saison {saison}</Text>
          <Text style={styles.sousTitre}>Généré le {new Date().toLocaleDateString('fr-FR')}</Text>
        </View>

        <Text style={{ fontSize: 10, fontWeight: 700, color: MARINE, marginTop: 6 }}>Liste 1 — Championnat</Text>
        {championnat.length ? <Tableau participations={championnat} /> : <Text style={{ fontSize: 8, color: ENCRE_DOUCE, marginTop: 4 }}>Aucune ligne.</Text>}

        <Text style={{ fontSize: 10, fontWeight: 700, color: MARINE, marginTop: 16 }}>Liste 2 — Autres concours</Text>
        {concours.length ? <Tableau participations={concours} /> : <Text style={{ fontSize: 8, color: ENCRE_DOUCE, marginTop: 4 }}>Aucune ligne.</Text>}
      </Page>
    </Document>
  );
}
