import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { CLUB } from '@/lib/club';
import { couleurCategorie } from '@/lib/categoriesCreneau';
import { HEURE_DEBUT, HEURE_FIN, HEURES, type JourPlanning } from '@/lib/planningModel';
import type { Manifestation } from '@/lib/manifestations';

// Couleurs de la charte v2 (hors palette Tailwind, react-pdf n'y a pas accès) —
// dupliquées ici en littéral, cf. src/app/globals.css pour les valeurs sources.
const MARINE = '#1c3a56';
const ENCRE = '#241b12';
const ENCRE_DOUCE = '#5a4c3c';
const LIGNE = '#e3d5b8';
const SABLE_CARTE = '#fbf6ea';
const TERRACOTTA = '#c1522b';

const styles = StyleSheet.create({
  page: { padding: 28, fontSize: 8.5, fontFamily: 'Helvetica', color: ENCRE },
  entete: { marginBottom: 10 },
  club: { fontSize: 12, fontWeight: 700, color: MARINE },
  titre: { fontSize: 11, fontWeight: 700, color: TERRACOTTA, marginTop: 2 },
  sousTitre: { fontSize: 9, color: ENCRE, marginTop: 2 },
  adresse: { fontSize: 8, color: ENCRE_DOUCE, marginTop: 2 },
  bandeau: {
    backgroundColor: MARINE,
    color: '#fff',
    fontSize: 8,
    padding: 4,
    marginTop: 8,
    textAlign: 'center',
  },
  legendeTitre: { fontSize: 7, fontWeight: 700, color: ENCRE_DOUCE, marginTop: 10, marginBottom: 3 },
  legendeLigne: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  legendeItem: { flexDirection: 'row', alignItems: 'center', gap: 3, marginRight: 8, marginBottom: 3 },
  legendePuce: { width: 8, height: 8, borderRadius: 2 },
  legendeLabel: { fontSize: 7.5, color: ENCRE },
  jourBandeau: {
    backgroundColor: MARINE,
    color: '#fff',
    fontSize: 8,
    fontWeight: 700,
    padding: 4,
    marginTop: 10,
  },
  ligneEntete: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: LIGNE,
    backgroundColor: SABLE_CARTE,
  },
  ligne: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: LIGNE },
  colTache: { width: 100, padding: 3, fontSize: 7.5, fontWeight: 700 },
  colHoraire: { width: 75, padding: 3, fontSize: 7 },
  colPersonnes: { width: 140, padding: 3, fontSize: 7 },
  colGrille: { flex: 1, flexDirection: 'row', position: 'relative' },
  celluleHeure: { flex: 1, borderLeftWidth: 0.5, borderLeftColor: LIGNE, fontSize: 5.5, color: ENCRE_DOUCE, padding: 2 },
  celluleHeureVide: { flex: 1, borderLeftWidth: 0.5, borderLeftColor: LIGNE },
  barre: { position: 'absolute', top: 3, bottom: 3, borderRadius: 2 },
  pied: { marginTop: 12, fontSize: 6.5, color: ENCRE_DOUCE, borderTopWidth: 0.5, borderTopColor: LIGNE, paddingTop: 6 },
});

/** Document PDF du planning des bénévoles — même modèle de données que
 *  l'affichage écran (planningModel.ts), gabarit inspiré du planning produit
 *  à la main par le club (bandeau marine, légende par catégorie, tableau
 *  Tâche/Horaire/Personnes + grille horaire 7h→22h). Rendu vectoriel
 *  (@react-pdf/renderer), pas une capture d'écran — texte net à
 *  l'impression. */
export function PlanningPdf({
  manifestation,
  jours,
  categoriesPresentes,
}: {
  manifestation: Manifestation;
  jours: JourPlanning[];
  categoriesPresentes: readonly string[];
}) {
  const nbHeures = HEURE_FIN - HEURE_DEBUT;
  const dateDebut = new Date(manifestation.dateDebut + 'T00:00:00').toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
  });
  const dateFin = new Date(manifestation.dateFin + 'T00:00:00').toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.entete}>
          <Text style={styles.club}>{CLUB.nomComplet}</Text>
          <Text style={styles.titre}>{manifestation.nom}</Text>
          <Text style={styles.sousTitre}>
            Planning des bénévoles · {dateDebut === dateFin ? dateDebut : `${dateDebut} – ${dateFin}`}
          </Text>
          <Text style={styles.adresse}>{manifestation.lieu ?? CLUB.boulodrome.adresse}</Text>
        </View>

        <Text style={styles.legendeTitre}>LÉGENDE</Text>
        <View style={styles.legendeLigne}>
          {categoriesPresentes.map((cat) => (
            <View key={cat} style={styles.legendeItem}>
              <View style={[styles.legendePuce, { backgroundColor: couleurCategorie(cat) }]} />
              <Text style={styles.legendeLabel}>{cat}</Text>
            </View>
          ))}
        </View>

        {jours.map((jour) => (
          <View key={jour.date}>
            <Text style={styles.jourBandeau}>{jour.label}</Text>

            <View style={styles.ligneEntete}>
              <Text style={styles.colTache}>Tâche</Text>
              <Text style={styles.colHoraire}>Horaire</Text>
              <Text style={styles.colPersonnes}>Personnes</Text>
              <View style={styles.colGrille}>
                {HEURES.slice(0, -1).map((h) => (
                  <Text key={h} style={styles.celluleHeure}>
                    {h}h
                  </Text>
                ))}
              </View>
            </View>

            {jour.lignes.map((ligne) => (
              <View key={ligne.id} style={styles.ligne}>
                <Text style={styles.colTache}>{ligne.tache}</Text>
                <Text style={styles.colHoraire}>{ligne.horaireLabel}</Text>
                <Text style={styles.colPersonnes}>{ligne.personnes}</Text>
                <View style={styles.colGrille}>
                  {HEURES.slice(0, -1).map((h) => (
                    <View key={h} style={styles.celluleHeureVide} />
                  ))}
                  {ligne.segment && (
                    <View
                      style={[
                        styles.barre,
                        {
                          left: `${(ligne.segment.debut / nbHeures) * 100}%`,
                          width: `${((ligne.segment.fin - ligne.segment.debut) / nbHeures) * 100}%`,
                          backgroundColor: couleurCategorie(ligne.categorie),
                          opacity: ligne.segment.imprecise ? 0.55 : 1,
                        },
                      ]}
                    />
                  )}
                </View>
              </View>
            ))}
          </View>
        ))}

        <Text style={styles.pied}>
          Document généré depuis l&apos;application — {CLUB.nomComplet} · {CLUB.rcs}
        </Text>
      </Page>
    </Document>
  );
}
