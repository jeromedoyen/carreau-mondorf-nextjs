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
  ligneEntete: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: LIGNE,
    backgroundColor: SABLE_CARTE,
    marginTop: 10,
  },
  ligne: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: LIGNE },
  cellEntete: { padding: 4, fontSize: 7.5, fontWeight: 700, color: ENCRE_DOUCE },
  cell: { padding: 4, fontSize: 8 },
  colNom: { width: '26%' },
  colType: { width: '16%' },
  colDate: { width: '16%' },
  colClub: { width: '20%' },
  colMontant: { width: '11%', textAlign: 'right' },
  colStatut: { width: '11%' },
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

function Tableau({ participations }: { participations: ParticipationConcours[] }) {
  const total = participations.reduce((s, p) => s + (p.montantFinal ?? 0), 0);
  return (
    <View>
      <View style={styles.ligneEntete}>
        <Text style={[styles.cellEntete, styles.colNom]}>Joueur</Text>
        <Text style={[styles.cellEntete, styles.colType]}>Type</Text>
        <Text style={[styles.cellEntete, styles.colDate]}>Date</Text>
        <Text style={[styles.cellEntete, styles.colClub]}>Club</Text>
        <Text style={[styles.cellEntete, styles.colMontant]}>Montant</Text>
        <Text style={[styles.cellEntete, styles.colStatut]}>Statut</Text>
      </View>
      {participations.map((p) => (
        <View key={p.id} style={styles.ligne}>
          <Text style={[styles.cell, styles.colNom]}>{p.personneNom}</Text>
          <Text style={[styles.cell, styles.colType]}>{LIBELLE_TYPE[p.type]}</Text>
          <Text style={[styles.cell, styles.colDate]}>{formatDate(p.date)}</Text>
          <Text style={[styles.cell, styles.colClub]}>{p.club ?? '—'}</Text>
          <Text style={[styles.cell, styles.colMontant]}>{p.montantFinal != null ? `${p.montantFinal.toFixed(2)} €` : '—'}</Text>
          <Text style={[styles.cell, styles.colStatut]}>{LIBELLE_STATUT[p.statut] ?? p.statut}</Text>
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
