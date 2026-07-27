import { Document, Page, Text, View, Image, StyleSheet, type ViewProps } from '@react-pdf/renderer';
import { CLUB } from '@/lib/club';
import type { FicheMembre } from '@/lib/fichesMembres';

// Couleurs de la charte v2 (react-pdf n'a pas accès aux variables CSS) —
// même palette littérale que PlanningPdf.tsx.
const MARINE = '#1c3a56';
const ENCRE = '#241b12';
const ENCRE_DOUCE = '#5a4c3c';
const LIGNE = '#e3d5b8';
const TERRACOTTA = '#c1522b';
const SUCCES = '#3b6d3a';
const DANGER = '#a3312a';
const SUCCES_FOND = '#e2ead7';
const DANGER_FOND = '#f3ddd8';

const styles = StyleSheet.create({
  page: { padding: 34, fontSize: 11, fontFamily: 'Helvetica', color: ENCRE },
  entete: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logo: { width: 52, height: 27 },
  club: { fontSize: 13, fontWeight: 700, color: MARINE },
  titre: { fontSize: 15, fontWeight: 700, color: TERRACOTTA, marginTop: 3 },
  sous: { fontSize: 9.5, color: ENCRE_DOUCE, marginTop: 3 },
  bandeau: { backgroundColor: MARINE, color: '#fff', fontSize: 11, fontWeight: 700, padding: 7, marginTop: 12 },
  section: { marginTop: 13 },
  label: {
    fontSize: 8.5,
    fontWeight: 700,
    color: ENCRE_DOUCE,
    textTransform: 'uppercase',
    borderBottomWidth: 1,
    borderBottomColor: LIGNE,
    paddingBottom: 3,
    marginBottom: 6,
  },
  grille: { flexDirection: 'row', flexWrap: 'wrap' },
  champ: { width: '33.33%', marginBottom: 7, paddingRight: 8 },
  champLarge: { width: '100%', marginBottom: 7 },
  champMoitie: { width: '50%', marginBottom: 7, paddingRight: 8 },
  cle: { fontSize: 7.5, color: ENCRE_DOUCE, textTransform: 'uppercase' },
  valeur: { fontSize: 10.5, fontWeight: 700, marginTop: 1 },
  pastille: { fontSize: 8.5, fontWeight: 700, borderRadius: 8, paddingVertical: 2, paddingHorizontal: 7, marginTop: 2, alignSelf: 'flex-start' },
  pied: {
    position: 'absolute',
    bottom: 22,
    left: 34,
    right: 34,
    fontSize: 7.5,
    color: ENCRE_DOUCE,
    borderTopWidth: 1,
    borderTopColor: LIGNE,
    paddingTop: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});

function formaterDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(`${iso}T00:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function Pastille({ payee, date }: { payee: boolean | null; date: string | null }) {
  if (payee) {
    return (
      <Text style={[styles.pastille, { backgroundColor: SUCCES_FOND, color: SUCCES }]}>
        ✓ payée{date ? ` · ${formaterDate(date)}` : ''}
      </Text>
    );
  }
  return <Text style={[styles.pastille, { backgroundColor: DANGER_FOND, color: DANGER }]}>non payée</Text>;
}

function Champ({ cle, valeur, style }: { cle: string; valeur: string; style?: ViewProps['style'] }) {
  return (
    <View style={style ?? styles.champ}>
      <Text style={styles.cle}>{cle}</Text>
      <Text style={styles.valeur}>{valeur || '—'}</Text>
    </View>
  );
}

/** Fiche membre imprimable — une page A4 par personne, même gabarit que
 *  PlanningPdf.tsx (bandeau marine, sable/terracotta, texte Helvetica net
 *  à l'impression), pour un classeur papier (27/07/2026, demande Jérôme :
 *  "les anciens croient au papier"). Un seul Document multi-pages plutôt
 *  qu'un PDF par personne — c'est justement l'objet "classeur" qui est
 *  demandé, pas des fichiers séparés à assembler soi-même. */
export function FichesMembresPdf({ fiches, annee }: { fiches: FicheMembre[]; annee: string }) {
  const genereLe = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <Document>
      {fiches.map((f) => (
        <Page key={f.id} size="A4" style={styles.page}>
          <View style={styles.entete}>
            <Image src="/logo.png" style={styles.logo} />
            <View>
              <Text style={styles.club}>{CLUB.nomComplet}</Text>
              <Text style={styles.titre}>Fiche membre — Saison {annee}</Text>
              <Text style={styles.sous}>Générée le {genereLe} · usage interne CA</Text>
            </View>
          </View>

          <Text style={styles.bandeau}>
            {f.nom} {f.prenom}
          </Text>

          <View style={styles.section}>
            <Text style={styles.label}>Identité</Text>
            <View style={styles.grille}>
              <Champ cle="Date de naissance" valeur={formaterDate(f.dateNaissance)} />
              <Champ cle="Sexe" valeur={f.sexe ?? ''} />
              <Champ cle="Nationalité" valeur={f.nationalite ?? ''} />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Coordonnées</Text>
            <View style={styles.grille}>
              <Champ cle="Adresse" valeur={f.adresse ?? ''} style={styles.champLarge} />
              <Champ cle="Code postal / Ville" valeur={f.codePostalVille ?? ''} style={styles.champMoitie} />
              <Champ cle="Téléphone" valeur={f.telephone ?? ''} style={styles.champMoitie} />
              <Champ cle="Email" valeur={f.email ?? ''} style={styles.champLarge} />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Adhésion {annee}</Text>
            {f.adhesion ? (
              <View style={styles.grille}>
                <Champ cle="Type" valeur={f.adhesion.type} />
                <Champ cle="Catégorie" valeur={f.adhesion.categorie ?? ''} />
                <Champ cle="N° licence" valeur={f.adhesion.licence ?? ''} />
              </View>
            ) : (
              <Text style={{ fontSize: 10, color: ENCRE_DOUCE }}>Aucune adhésion enregistrée pour {annee}.</Text>
            )}
          </View>

          {f.adhesion && (
            <View style={styles.section}>
              <Text style={styles.label}>Paiements</Text>
              <View style={styles.grille}>
                <View style={styles.champMoitie}>
                  <Text style={styles.cle}>Carte de membre</Text>
                  <Pastille payee={f.adhesion.cotisationPayee} date={f.adhesion.cotisationDate} />
                </View>
                <View style={styles.champMoitie}>
                  <Text style={styles.cle}>Licence</Text>
                  <Pastille payee={f.adhesion.licencePayee} date={f.adhesion.licenceDate} />
                </View>
              </View>
            </View>
          )}

          <View style={styles.pied} fixed>
            <Text>
              {CLUB.nomComplet} · {CLUB.rcs}
            </Text>
            <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`} />
          </View>
        </Page>
      ))}
    </Document>
  );
}
