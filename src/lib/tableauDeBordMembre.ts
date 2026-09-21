import { createClient } from './supabase/server';
import { getPersonne } from './membres';
import { getSaisons } from './saisons';
import { getTableauDeBordBenevolePourNom } from './benevolat';
import { getStatistiquesD2PourJoueur, getStatistiquesPromotion } from './stats';
import { construireBilanSportifD2, getRencontresJoueesSaison } from './tableauDeBord';
import { cleNomJoueur } from './normalisationTexte';
import type { BilanSportifD2 } from './tableauDeBord';
import type { TableauDeBordBenevole } from './benevolat';
import type { MonAdhesion } from './moncaro';
import type { StatJoueurPromotion } from './types';

/* Le même tableau de bord que /moncaro, mais pour un membre consulté par
 * le comité depuis sa fiche.
 *
 * ⚠️ **Cette fonction ne contrôle rien elle-même.** Elle lit les données du
 * `personneId` qu'on lui passe, avec la session de l'appelant : c'est la RLS
 * qui décide réellement, et l'écran appelant qui doit poser la garde
 * `estMembreCA()`. Ce partage de responsabilité est explicite parce qu'il
 * est facile à oublier.
 *
 * Ce qu'un membre du comité peut lire d'un autre licencié, et ce qu'il ne
 * peut pas :
 *
 *   personnes, adhesions, parties_d2   -> CA
 *   affectations, promotion_equipes    -> tout utilisateur autorisé
 *   participations_concours            -> **trésorerie uniquement**
 *
 * La dernière ligne est une frontière voulue (migration 0047) : les
 * montants de remboursement ne regardent pas tout le comité. La section
 * « Concours » est donc absente de cette vue pour un membre du CA qui n'est
 * pas à la trésorerie — pas vide, absente, ce qui est différent et se dit à
 * l'écran. */
export type TableauDeBordMembre = {
  personneId: number;
  nomComplet: string;
  adhesion: MonAdhesion | null;
  bilan: BilanSportifD2 | null;
  benevolat: TableauDeBordBenevole | null;
  entreePromotion: StatJoueurPromotion | null;
  /** Vrai si l'appelant a le droit de voir les remboursements de cette
   *  personne. Faux pour un membre du comité hors trésorerie. */
  concoursVisible: boolean;
  participationsConcours: ParticipationConcoursMembre[];
};

export type ParticipationConcoursMembre = {
  id: number;
  type: string;
  statut: string;
  montant_final: number | null;
  date: string | null;
  club: string | null;
};

export async function getTableauDeBordMembre(
  personneId: number,
  saison: string
): Promise<TableauDeBordMembre | null> {
  const supabase = await createClient();

  const personne = await getPersonne(personneId, saison);
  if (!personne) return null;

  const nomComplet = `${personne.prenom} ${personne.nom}`.trim();
  const saisons = await getSaisons();
  const bornes = saisons.find((s) => s.libelle === saison);

  const [statsD2, rencontresEquipe, statsPromotion, benevolat, { data: tresorerie }, { data: concours }] =
    await Promise.all([
    getStatistiquesD2PourJoueur(supabase, saison, nomComplet).catch(() => null),
    getRencontresJoueesSaison(supabase, saison),
    getStatistiquesPromotion(supabase, saison).catch(() => null),
    (bornes
      ? getTableauDeBordBenevolePourNom(nomComplet, { debut: bornes.dateDebut, fin: bornes.dateFin })
      : getTableauDeBordBenevolePourNom(nomComplet)
    ).catch(() => null),
    supabase.rpc('est_membre_tresorerie'),
    // Lecture volontairement non conditionnée : c'est la RLS qui tranche.
    // Un membre du CA hors trésorerie reçoit simplement une liste vide,
    // et `concoursVisible` fait alors disparaître la carte plutôt que de
    // l'afficher vide — « pas le droit d'en voir » et « rien à voir » ne
    // doivent pas se ressembler à l'écran.
    supabase
      .from('participations_concours')
      .select('id, type, statut, montant_final, date, club')
      .eq('personne_id', personneId)
      .eq('saison', saison)
      .eq('supprime', false)
      .order('date', { ascending: false }),
  ]);

  const entreePromotion =
    statsPromotion?.joueurs.find((j) => cleNomJoueur(j.nom) === cleNomJoueur(nomComplet)) ?? null;

  return {
    personneId,
    nomComplet,
    // `getPersonne` renvoie l'adhésion complète du registre ; on la
    // ramène à la forme attendue par l'en-tête, la même que celle de
    // `mon_adhesion()` côté licencié.
    adhesion: personne.adhesion
      ? {
          type: personne.adhesion.type,
          categorie: personne.adhesion.categorie,
          numeroLicence: personne.adhesion.licence,
          cotisationPayee: personne.adhesion.cotisationPayee,
          cotisationMontant: null,
          cotisationDate: null,
          licencePayee: personne.adhesion.licencePayee,
          licenceMontant: null,
          licenceDate: null,
        }
      : null,
    bilan: statsD2 ? construireBilanSportifD2(statsD2, rencontresEquipe) : null,
    benevolat,
    entreePromotion,
    concoursVisible: !!tresorerie,
    participationsConcours: (concours ?? []) as ParticipationConcoursMembre[],
  };
}
