import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { CLUB } from '@/lib/club';

// Couleurs de la charte v2 (react-pdf n'a pas accès aux variables Tailwind) —
// mêmes valeurs littérales que PlanningPdf.tsx, source dans globals.css.
const MARINE = '#1c3a56';
const ENCRE = '#241b12';
const ENCRE_DOUCE = '#5a4c3c';
const LIGNE = '#e3d5b8';
const SABLE_CARTE = '#fbf6ea';
const TERRACOTTA = '#c1522b';
const PIN = '#24463a';

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 9.5, fontFamily: 'Helvetica', color: ENCRE },
  club: { fontSize: 13, fontWeight: 700, color: MARINE },
  titre: { fontSize: 18, fontWeight: 700, color: TERRACOTTA, marginTop: 4 },
  sousTitre: { fontSize: 9, color: ENCRE_DOUCE, marginTop: 3 },
  section: { marginTop: 16 },
  libelle: { fontSize: 8, fontWeight: 700, color: ENCRE_DOUCE, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 },
  valeur: { fontSize: 10.5, color: ENCRE, lineHeight: 1.4 },
  ligneDeux: { flexDirection: 'row', gap: 24, marginTop: 14 },
  colonne: { flex: 1 },
  bloc: { marginTop: 14, borderTopWidth: 0.75, borderTopColor: LIGNE, paddingTop: 12 },
  restitution: {
    marginTop: 22,
    backgroundColor: SABLE_CARTE,
    borderWidth: 0.75,
    borderColor: PIN,
    borderRadius: 4,
    padding: 12,
  },
  restitutionTitre: { fontSize: 9, fontWeight: 700, color: PIN, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 5 },
  restitutionTexte: { fontSize: 8.5, color: ENCRE_DOUCE, lineHeight: 1.5 },
  signatureZone: { marginTop: 40, borderTopWidth: 0.75, borderTopColor: LIGNE, paddingTop: 10 },
  signatureLibelle: { fontSize: 8, color: ENCRE_DOUCE, textTransform: 'uppercase', letterSpacing: 0.5 },
  pied: { position: 'absolute', bottom: 24, left: 40, right: 40, fontSize: 7, color: ENCRE_DOUCE, borderTopWidth: 0.5, borderTopColor: LIGNE, paddingTop: 6 },
});

export type DonneesProtocole = {
  dateDemande: string;
  nomPrestation: string;
  datePrestation: string;
  responsables: string;
  deroulement: string;
  animations: string;
  personnesAidantes: string;
};

/** PDF "Fiche Protocole Manifestation" (04/08/2026) — équivalent numérique
 *  de la fiche papier du même nom, généré à la validation du formulaire
 *  membre (FormulaireProtocoleManifestation.tsx) puis transmis à Documenso
 *  pour signature. Une seule page, zone de signature en bas — même
 *  convention de positionnement que le reste des documents signables
 *  (documenso.ts: calculerPositionsSignature, signature en bas de la
 *  dernière page). */
export function ProtocoleManifestationPdf({ donnees }: { donnees: DonneesProtocole }) {
  const formaterDate = (iso: string) =>
    iso ? new Date(iso + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.club}>{CLUB.nomComplet}</Text>
        <Text style={styles.titre}>Protocole manifestation</Text>
        <Text style={styles.sousTitre}>Demande d&apos;organisation — {formaterDate(donnees.dateDemande)}</Text>

        <View style={styles.section}>
          <Text style={styles.libelle}>Nom de la prestation</Text>
          <Text style={styles.valeur}>{donnees.nomPrestation}</Text>
        </View>

        <View style={styles.ligneDeux}>
          <View style={styles.colonne}>
            <Text style={styles.libelle}>Date de la prestation</Text>
            <Text style={styles.valeur}>{formaterDate(donnees.datePrestation)}</Text>
          </View>
          <View style={styles.colonne}>
            <Text style={styles.libelle}>Responsables / organisateurs</Text>
            <Text style={styles.valeur}>{donnees.responsables}</Text>
          </View>
        </View>

        <View style={styles.bloc}>
          <Text style={styles.libelle}>Déroulement</Text>
          <Text style={styles.valeur}>{donnees.deroulement}</Text>
        </View>

        <View style={styles.bloc}>
          <Text style={styles.libelle}>Animations, services, prestations prévues</Text>
          <Text style={styles.valeur}>{donnees.animations || '—'}</Text>
        </View>

        <View style={styles.bloc}>
          <Text style={styles.libelle}>Personnes aidantes</Text>
          <Text style={styles.valeur}>{donnees.personnesAidantes || '—'}</Text>
        </View>

        <View style={styles.restitution}>
          <Text style={styles.restitutionTitre}>Restitution du club</Text>
          <Text style={styles.restitutionTexte}>
            Le club doit être restitué dans l&apos;état de propreté et de rangement dans lequel il a été mis à votre
            disposition. En cas d&apos;utilisation du bar, compléter la fiche des consommations. Personnes
            extérieures : règlement sur place. Membres : facturation ultérieure.
          </Text>
        </View>

        <View style={styles.signatureZone}>
          <Text style={styles.signatureLibelle}>Signature du responsable</Text>
        </View>

        <Text style={styles.pied}>
          Document généré depuis l&apos;application — {CLUB.nomComplet} · {CLUB.rcs}
        </Text>
      </Page>
    </Document>
  );
}
