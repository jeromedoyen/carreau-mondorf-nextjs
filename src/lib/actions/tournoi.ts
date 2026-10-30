'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getTournoiComplet, parametresDe } from '@/lib/tournoi/donnees';
import {
  composerProchainePartie as composerAvecLeMoteur,
  equipesPermanentesDuFormat,
  partiesMaxSansRevanche,
  repartirEffectif,
  scoreValide,
  type FormatTournoi,
} from '@/lib/tournoi/moteur';
import { composerPartiePoules, type ModePoule } from '@/lib/tournoi/poules';
import {
  enregistrerClubsEquipes as enregistrerClubsEnBase,
  enregistrerPartiePoules,
  lireEtatPoules,
  lireParametresPoules,
  supprimerPoules,
  tirerEtEnregistrerPoules,
} from '@/lib/tournoi/poulesDonnees';

type Resultat = { ok: true; id?: number } | { ok: false; error: string };

async function verifierCA(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data } = await supabase.rpc('est_membre_ca');
  return !!data;
}

/** Toutes les tables du module sont CA-only en RLS ; on refuse aussi côté
 *  action pour renvoyer un message lisible plutôt qu'une erreur Postgres. */
async function contexteCA() {
  const supabase = await createClient();
  if (!(await verifierCA(supabase))) {
    return { supabase, erreur: 'Action réservée aux membres du CA.' as const, email: null };
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) {
    return { supabase, erreur: 'Session invalide, reconnecte-toi.' as const, email: null };
  }
  return { supabase, erreur: null, email: user.email };
}

// ------------------------------------------------------------- le tournoi

export type DonneesTournoi = {
  nom: string;
  dateTournoi: string;
  format: FormatTournoi;
  tailleEquipe: number;
  nbParties: number;
  nbTerrains: number;
  pointsVictoire: number;
  notes?: string;
  /** Réglages du format « poules » (obligatoires pour ce format, ignorés sinon). */
  poules?: { mode: ModePoule; taille: number; qualifies: number; consolante: boolean };
};

/** Colonnes `poules_*` à écrire : vides hors du format « poules ». */
function colonnesPoules(d: DonneesTournoi) {
  if (d.format !== 'poules' || !d.poules) {
    return { poules_mode: null, poules_taille: null, poules_qualifies: null, poules_consolante: null };
  }
  return {
    poules_mode: d.poules.mode,
    // une poule à repêchage ne dépasse pas 4 équipes
    poules_taille: d.poules.mode === 'repechage' ? Math.min(d.poules.taille, 4) : d.poules.taille,
    poules_qualifies: d.poules.mode === 'repechage' ? 2 : d.poules.qualifies,
    poules_consolante: d.poules.consolante,
  };
}

function validerParametres(d: DonneesTournoi): string | null {
  if (!d.nom.trim()) return 'Le nom du tournoi est obligatoire.';
  if (!d.dateTournoi) return 'La date est obligatoire.';
  if (![1, 2, 3].includes(d.tailleEquipe)) return "La taille d'équipe doit être 1, 2 ou 3.";
  // Les poules n'ont pas de nombre de parties à choisir : il découle du nombre d'équipes.
  if (d.format !== 'poules' && (d.nbParties < 1 || d.nbParties > 12)) {
    return 'Le nombre de parties doit être compris entre 1 et 12.';
  }
  if (d.format === 'poules') {
    if (!d.poules) return 'Les réglages des poules sont obligatoires.';
    if (!['repechage', 'toutes_rondes'].includes(d.poules.mode)) return 'Façon de jouer les poules inconnue.';
    if (!Number.isInteger(d.poules.taille) || d.poules.taille < 3 || d.poules.taille > 5) {
      return 'Une poule compte de 3 à 5 équipes.';
    }
    if (!Number.isInteger(d.poules.qualifies) || d.poules.qualifies < 1 || d.poules.qualifies > 3) {
      return 'Le nombre de qualifiés par poule doit être compris entre 1 et 3.';
    }
  }
  if (d.nbTerrains < 1 || d.nbTerrains > 40) return 'Le nombre de terrains doit être compris entre 1 et 40.';
  if (d.pointsVictoire < 7 || d.pointsVictoire > 21) return 'Les points de la partie doivent être compris entre 7 et 21.';
  return null;
}

export async function creerTournoi(d: DonneesTournoi): Promise<Resultat> {
  const { supabase, erreur, email } = await contexteCA();
  if (erreur) return { ok: false, error: erreur };
  const souci = validerParametres(d);
  if (souci) return { ok: false, error: souci };

  const { data, error } = await supabase
    .from('tournois')
    .insert({
      nom: d.nom.trim(),
      date_tournoi: d.dateTournoi,
      format: d.format,
      taille_equipe: d.tailleEquipe,
      nb_parties: d.format === 'poules' ? 1 : d.nbParties,
      nb_terrains: d.nbTerrains,
      points_victoire: d.pointsVictoire,
      notes: d.notes?.trim() || null,
      cree_par_email: email,
      ...colonnesPoules(d),
    })
    .select('id')
    .single();
  if (error) return { ok: false, error: error.message };

  revalidatePath('/outils/tournoi');
  return { ok: true, id: data.id };
}

export async function modifierTournoi(id: number, d: DonneesTournoi): Promise<Resultat> {
  const { supabase, erreur } = await contexteCA();
  if (erreur) return { ok: false, error: erreur };
  const souci = validerParametres(d);
  if (souci) return { ok: false, error: souci };

  // Une fois des parties composées, changer le format ou la taille d'équipe
  // rendrait l'historique incohérent (les équipes déjà tirées ne
  // correspondraient plus aux paramètres).
  const complet = await getTournoiComplet(id);
  if (!complet) return { ok: false, error: 'Tournoi introuvable.' };
  if (complet.parties.length > 0) {
    if (complet.tournoi.format !== d.format) {
      return { ok: false, error: 'Le format ne peut plus changer une fois la première partie composée.' };
    }
    if (complet.tournoi.tailleEquipe !== d.tailleEquipe) {
      return { ok: false, error: "La taille d'équipe ne peut plus changer une fois la première partie composée." };
    }
    if (d.format !== 'poules' && d.nbParties < complet.parties.length) {
      return { ok: false, error: `${complet.parties.length} parties sont déjà composées.` };
    }
    if (d.format === 'poules') {
      const avant = complet.tournoi.poules;
      const apres = colonnesPoules(d);
      if (
        avant &&
        (avant.mode !== apres.poules_mode ||
          avant.taille !== apres.poules_taille ||
          avant.qualifies !== apres.poules_qualifies ||
          avant.consolante !== apres.poules_consolante)
      ) {
        return { ok: false, error: 'Les réglages des poules ne peuvent plus changer une fois la première partie composée.' };
      }
    }
  } else if (d.format === 'poules') {
    // Changer la façon de jouer ou la taille des poules rend le tirage caduc : il sera refait.
    const avant = complet.tournoi.poules;
    const apres = colonnesPoules(d);
    if (
      avant &&
      (avant.mode !== apres.poules_mode || avant.taille !== apres.poules_taille || avant.qualifies !== apres.poules_qualifies)
    ) {
      await supprimerPoules(supabase, id);
    }
  }

  const { error } = await supabase
    .from('tournois')
    .update({
      nom: d.nom.trim(),
      date_tournoi: d.dateTournoi,
      format: d.format,
      taille_equipe: d.tailleEquipe,
      nb_parties: d.format === 'poules' ? 1 : d.nbParties,
      nb_terrains: d.nbTerrains,
      points_victoire: d.pointsVictoire,
      notes: d.notes?.trim() || null,
      modifie_le: new Date().toISOString(),
      ...colonnesPoules(d),
    })
    .eq('id', id);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/outils/tournoi');
  revalidatePath(`/outils/tournoi/${id}`);
  return { ok: true };
}

export async function supprimerTournoi(id: number): Promise<Resultat> {
  const { supabase, erreur } = await contexteCA();
  if (erreur) return { ok: false, error: erreur };
  const { error } = await supabase.from('tournois').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/outils/tournoi');
  return { ok: true };
}

// --------------------------------------------------------- les participants

export type ParticipantEntrant = {
  personneId?: number | null;
  nom: string;
  equipeDepart?: number | null;
};

/**
 * Remplace l'intégralité des participants. C'est volontairement un « remplace
 * tout » et non un ajout incrémental : les trois modes d'import (registre,
 * fichier, photo) produisent chacun une liste complète, et l'écran de
 * correction laisse l'organisateur la retoucher avant de valider. Refusé dès
 * qu'une partie est composée, sinon l'historique perdrait ses références.
 */
export async function remplacerParticipants(
  tournoiId: number,
  entrants: ParticipantEntrant[],
): Promise<Resultat> {
  const { supabase, erreur } = await contexteCA();
  if (erreur) return { ok: false, error: erreur };

  const complet = await getTournoiComplet(tournoiId);
  if (!complet) return { ok: false, error: 'Tournoi introuvable.' };
  if (complet.parties.length > 0) {
    return { ok: false, error: 'Le tournoi a commencé : la liste des participants est figée.' };
  }

  const nettoyes = entrants
    .map((e) => ({ ...e, nom: e.nom.trim() }))
    .filter((e) => e.nom.length > 0);
  if (nettoyes.length === 0) return { ok: false, error: 'Aucun participant à enregistrer.' };

  // Un licencié ne peut figurer qu'une fois (contrainte unique en base) ; on
  // le dit clairement plutôt que de laisser remonter une violation Postgres.
  const vus = new Set<number>();
  for (const e of nettoyes) {
    if (e.personneId == null) continue;
    if (vus.has(e.personneId)) return { ok: false, error: `${e.nom} figure deux fois dans la liste.` };
    vus.add(e.personneId);
  }

  await supabase.from('tournoi_participants').delete().eq('tournoi_id', tournoiId);
  const { error } = await supabase.from('tournoi_participants').insert(
    nettoyes.map((e, i) => ({
      tournoi_id: tournoiId,
      personne_id: e.personneId ?? null,
      nom: e.nom,
      equipe_depart: e.equipeDepart ?? null,
      ordre: i,
    })),
  );
  if (error) return { ok: false, error: error.message };

  // Les équipes permanentes dépendent de la liste : elles seront refaites, et le tirage des poules avec.
  await supprimerPoules(supabase, tournoiId);
  await supabase.from('tournoi_equipes').delete().eq('tournoi_id', tournoiId).is('partie_id', null);

  revalidatePath(`/outils/tournoi/${tournoiId}`);
  return { ok: true };
}

/**
 * Fige les équipes de départ (format équipes fixes uniquement), à partir du
 * `equipe_depart` de chaque participant. Un participant sans numéro est
 * réparti automatiquement dans les équipes incomplètes.
 */
export async function composerEquipesDepart(tournoiId: number): Promise<Resultat> {
  const { supabase, erreur } = await contexteCA();
  if (erreur) return { ok: false, error: erreur };

  const complet = await getTournoiComplet(tournoiId);
  if (!complet) return { ok: false, error: 'Tournoi introuvable.' };
  if (!equipesPermanentesDuFormat(complet.tournoi.format)) {
    return { ok: false, error: 'Les équipes de départ ne concernent pas le format à la mêlée.' };
  }
  if (complet.parties.length > 0) {
    return { ok: false, error: 'Le tournoi a commencé : les équipes sont figées.' };
  }
  if (complet.participants.length < 2) return { ok: false, error: 'Il faut au moins deux participants.' };

  const parNumero = new Map<number, number[]>();
  const sansEquipe: number[] = [];
  for (const p of complet.participants) {
    if (p.equipeDepart == null) sansEquipe.push(p.id);
    else {
      const l = parNumero.get(p.equipeDepart) ?? [];
      l.push(p.id);
      parNumero.set(p.equipeDepart, l);
    }
  }

  // Personne n'a de numéro : on découpe l'effectif comme le ferait
  // l'organisateur (triplettes, complétées par une doublette si besoin).
  if (parNumero.size === 0) {
    const tailles = repartirEffectif(sansEquipe.length, complet.tournoi.tailleEquipe);
    let k = 0;
    tailles.forEach((t, i) => {
      parNumero.set(i + 1, sansEquipe.slice(k, k + t));
      k += t;
    });
    sansEquipe.length = 0;
  } else {
    // Sinon on complète les équipes les plus creuses.
    for (const id of sansEquipe) {
      const cible = [...parNumero.entries()].sort((a, b) => a[1].length - b[1].length)[0];
      cible[1].push(id);
    }
    sansEquipe.length = 0;
  }

  const numeros = [...parNumero.keys()].sort((a, b) => a - b);
  if (numeros.length < 2) return { ok: false, error: 'Il faut au moins deux équipes.' };

  await supprimerPoules(supabase, tournoiId);
  await supabase.from('tournoi_equipes').delete().eq('tournoi_id', tournoiId).is('partie_id', null);

  const { data: creees, error } = await supabase
    .from('tournoi_equipes')
    .insert(numeros.map((n, i) => ({ tournoi_id: tournoiId, partie_id: null, numero: i + 1 })))
    .select('id, numero');
  if (error || !creees) return { ok: false, error: error?.message ?? 'Création des équipes impossible.' };

  const membres: { equipe_id: number; participant_id: number }[] = [];
  creees
    .sort((a, b) => a.numero - b.numero)
    .forEach((eq, i) => {
      for (const pid of parNumero.get(numeros[i]) ?? []) {
        membres.push({ equipe_id: eq.id, participant_id: pid });
      }
    });
  const { error: e2 } = await supabase.from('tournoi_equipe_membres').insert(membres);
  if (e2) return { ok: false, error: e2.message };

  revalidatePath(`/outils/tournoi/${tournoiId}`);
  return { ok: true };
}

/**
 * Enregistre une composition d'équipes de départ décidée à la main —
 * l'organisateur déplace un joueur d'une équipe à l'autre après le tirage
 * automatique de `composerEquipesDepart()`. Contrairement à celui-ci, aucun
 * algorithme ne recalcule rien : la composition fournie fait foi telle
 * quelle, on se contente de la valider et de la persister.
 */
export async function enregistrerEquipesDepart(
  tournoiId: number,
  affectations: { participantId: number; numero: number }[],
): Promise<Resultat> {
  const { supabase, erreur } = await contexteCA();
  if (erreur) return { ok: false, error: erreur };

  const complet = await getTournoiComplet(tournoiId);
  if (!complet) return { ok: false, error: 'Tournoi introuvable.' };
  if (!equipesPermanentesDuFormat(complet.tournoi.format)) {
    return { ok: false, error: 'Les équipes de départ ne concernent pas le format à la mêlée.' };
  }
  if (complet.parties.length > 0) {
    return { ok: false, error: 'Le tournoi a commencé : les équipes sont figées.' };
  }

  const idsParticipants = new Set(complet.participants.map((p) => p.id));
  const vus = new Set<number>();
  for (const a of affectations) {
    if (!idsParticipants.has(a.participantId)) return { ok: false, error: 'Participant inconnu dans cette composition.' };
    if (vus.has(a.participantId)) return { ok: false, error: 'Un participant ne peut appartenir qu\'à une seule équipe.' };
    vus.add(a.participantId);
    if (!Number.isInteger(a.numero) || a.numero < 1) return { ok: false, error: 'Numéro d\'équipe invalide.' };
  }
  if (vus.size !== complet.participants.length) {
    return { ok: false, error: 'Chaque participant doit être affecté à une équipe.' };
  }

  const parNumero = new Map<number, number[]>();
  for (const a of affectations) {
    const l = parNumero.get(a.numero) ?? [];
    l.push(a.participantId);
    parNumero.set(a.numero, l);
  }
  // Une équipe vide ne veut rien dire : si l'organisateur a vidé une équipe en
  // déplaçant tout le monde ailleurs, elle disparaît simplement.
  const numeros = [...parNumero.keys()].sort((a, b) => a - b);
  if (numeros.length < 2) return { ok: false, error: 'Il faut au moins deux équipes.' };

  await supprimerPoules(supabase, tournoiId);
  await supabase.from('tournoi_equipes').delete().eq('tournoi_id', tournoiId).is('partie_id', null);

  const { data: creees, error } = await supabase
    .from('tournoi_equipes')
    .insert(numeros.map((n, i) => ({ tournoi_id: tournoiId, partie_id: null, numero: i + 1 })))
    .select('id, numero');
  if (error || !creees) return { ok: false, error: error?.message ?? 'Création des équipes impossible.' };

  const membresLignes: { equipe_id: number; participant_id: number }[] = [];
  creees
    .sort((a, b) => a.numero - b.numero)
    .forEach((eq, i) => {
      for (const pid of parNumero.get(numeros[i]) ?? []) {
        membresLignes.push({ equipe_id: eq.id, participant_id: pid });
      }
    });
  const { error: eM } = await supabase.from('tournoi_equipe_membres').insert(membresLignes);
  if (eM) return { ok: false, error: eM.message };

  revalidatePath(`/outils/tournoi/${tournoiId}`);
  return { ok: true };
}

// ------------------------------------------------------------- les parties

export type ResultatComposition =
  | { ok: true; numero: number; revancheForcee: boolean; repetitionsAdversaires: number }
  | { ok: false; error: string };

/**
 * Compose la partie suivante et la persiste. Le moteur décide, cette fonction
 * ne fait que traduire sa proposition en lignes : c'est ce découplage qui
 * permet de simuler les appariements sans base (`scripts/verifier-moteur.ts`).
 */
export async function composerProchainePartie(tournoiId: number): Promise<ResultatComposition> {
  const { supabase, erreur } = await contexteCA();
  if (erreur) return { ok: false, error: erreur };

  const complet = await getTournoiComplet(tournoiId);
  if (!complet) return { ok: false, error: 'Tournoi introuvable.' };
  const { tournoi, participants, equipesPermanentes, parties } = complet;

  if (tournoi.format === 'poules') return composerPartieDePoules(supabase, complet);

  if (parties.length >= tournoi.nbParties) {
    return { ok: false, error: `Les ${tournoi.nbParties} parties sont déjà composées.` };
  }
  const derniere = parties[parties.length - 1];
  if (derniere) {
    const incomplets = derniere.rencontres.filter((r) => !scoreValide(r, tournoi.pointsVictoire)).length;
    if (incomplets > 0) {
      return {
        ok: false,
        error: `${incomplets} résultat(s) manquant(s) en partie ${derniere.numero} : les appariements de la suivante en dépendent.`,
      };
    }
  }

  if (tournoi.format === 'equipes_fixes') {
    if (equipesPermanentes.length < 2) {
      return { ok: false, error: "Composez d'abord les équipes de départ." };
    }
    const max = partiesMaxSansRevanche(equipesPermanentes.length);
    if (tournoi.nbParties > max) {
      return {
        ok: false,
        error: `${equipesPermanentes.length} équipes ne permettent que ${max} parties sans revanche. Réduisez le nombre de parties.`,
      };
    }
  } else if (participants.length < tournoi.tailleEquipe * 2) {
    return { ok: false, error: 'Effectif insuffisant pour composer deux équipes.' };
  }

  const numero = parties.length + 1;
  let proposition;
  try {
    proposition = composerAvecLeMoteur(
      numero,
      parametresDe(tournoi),
      equipesPermanentes,
      participants.map((p) => p.id),
      parties,
    );
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Composition impossible.' };
  }

  const { data: partie, error: ePartie } = await supabase
    .from('tournoi_parties')
    .insert({ tournoi_id: tournoiId, numero, revanche_forcee: proposition.revancheForcee })
    .select('id')
    .single();
  if (ePartie || !partie) return { ok: false, error: ePartie?.message ?? 'Création de la partie impossible.' };

  // En mêlée les équipes sont créées pour cette partie ; en équipes fixes
  // elles existent déjà et on réutilise leurs ids.
  const idsEquipes: number[] = [];
  if (tournoi.format === 'melee') {
    const { data: creees, error } = await supabase
      .from('tournoi_equipes')
      .insert(
        proposition.equipes.map((e) => ({ tournoi_id: tournoiId, partie_id: partie.id, numero: e.numero })),
      )
      .select('id, numero');
    if (error || !creees) {
      await supabase.from('tournoi_parties').delete().eq('id', partie.id);
      return { ok: false, error: error?.message ?? 'Création des équipes impossible.' };
    }
    const parNumero = new Map(creees.map((c) => [c.numero, c.id]));
    proposition.equipes.forEach((e) => idsEquipes.push(parNumero.get(e.numero)!));

    const membres = proposition.equipes.flatMap((e, i) =>
      e.membres.map((pid) => ({ equipe_id: idsEquipes[i], participant_id: pid })),
    );
    const { error: eM } = await supabase.from('tournoi_equipe_membres').insert(membres);
    if (eM) {
      await supabase.from('tournoi_parties').delete().eq('id', partie.id);
      return { ok: false, error: eM.message };
    }
  } else {
    proposition.equipes.forEach((e) => idsEquipes.push(e.id!));
  }

  const { error: eR } = await supabase.from('tournoi_rencontres').insert(
    proposition.rencontres.map((r) => ({
      partie_id: partie.id,
      terrain: r.terrain,
      equipe_a_id: idsEquipes[r.indexA],
      equipe_b_id: idsEquipes[r.indexB],
    })),
  );
  if (eR) {
    await supabase.from('tournoi_parties').delete().eq('id', partie.id);
    return { ok: false, error: eR.message };
  }

  if (proposition.indexExempt != null) {
    await supabase
      .from('tournoi_parties')
      .update({ equipe_exempte_id: idsEquipes[proposition.indexExempt] })
      .eq('id', partie.id);
  }

  if (tournoi.statut === 'preparation') {
    await supabase.from('tournois').update({ statut: 'en_cours' }).eq('id', tournoiId);
  }

  revalidatePath(`/outils/tournoi/${tournoiId}`);
  return {
    ok: true,
    numero,
    revancheForcee: proposition.revancheForcee,
    repetitionsAdversaires: proposition.repetitionsAdversaires,
  };
}

/**
 * Format « poules » : le moteur des poules décide (poules, puis tableaux), cette
 * fonction vérifie que la partie précédente est saisie en entier et enregistre.
 */
async function composerPartieDePoules(
  supabase: Awaited<ReturnType<typeof createClient>>,
  complet: NonNullable<Awaited<ReturnType<typeof getTournoiComplet>>>,
): Promise<ResultatComposition> {
  const { tournoi, parties } = complet;
  const derniere = parties[parties.length - 1];
  if (derniere) {
    const incomplets = derniere.rencontres.filter((r) => !scoreValide(r, tournoi.pointsVictoire)).length;
    if (incomplets > 0) {
      return {
        ok: false,
        error: `${incomplets} résultat(s) manquant(s) en partie ${derniere.numero} : la suite en dépend.`,
      };
    }
  }
  const params = await lireParametresPoules(supabase, tournoi.id);
  if (!params) return { ok: false, error: "Ce tournoi n'est pas un tournoi à poules." };

  const etat = await lireEtatPoules(supabase, tournoi.id, params);
  if (etat.ctx.poules.length === 0) {
    return { ok: false, error: "Tirez d'abord les poules (onglet « Poules »)." };
  }

  const numero = etat.parties.length + 1;
  let suite;
  try {
    suite = composerPartiePoules(etat.ctx);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Composition impossible.' };
  }
  if (suite.fini) {
    return { ok: false, error: "Poules et tableaux sont joués : il n'y a plus rien à composer. Vous pouvez clôturer le tournoi." };
  }

  const r = await enregistrerPartiePoules(supabase, tournoi.id, numero, suite.proposition);
  if (!r.ok) return { ok: false, error: r.error };

  if (tournoi.statut === 'preparation') {
    await supabase.from('tournois').update({ statut: 'en_cours' }).eq('id', tournoi.id);
  }
  revalidatePath(`/outils/tournoi/${tournoi.id}`);
  return { ok: true, numero, revancheForcee: false, repetitionsAdversaires: 0 };
}

/** Tire les poules au sort (refait le tirage s'il existe déjà). Réservé à la préparation : avant la première partie. */
export async function tirerLesPoules(tournoiId: number): Promise<Resultat> {
  const { supabase, erreur } = await contexteCA();
  if (erreur) return { ok: false, error: erreur };
  const params = await lireParametresPoules(supabase, tournoiId);
  if (!params) return { ok: false, error: "Ce tournoi n'est pas un tournoi à poules." };
  const r = await tirerEtEnregistrerPoules(supabase, tournoiId, params);
  if (!r.ok) return { ok: false, error: r.error };
  revalidatePath(`/outils/tournoi/${tournoiId}`);
  return { ok: true };
}

/** Club de chaque équipe, pour que le tirage évite de réunir deux équipes du même club. */
export async function enregistrerClubsEquipes(
  tournoiId: number,
  clubs: { equipeId: number; club: string | null }[],
): Promise<Resultat> {
  const { supabase, erreur } = await contexteCA();
  if (erreur) return { ok: false, error: erreur };
  const params = await lireParametresPoules(supabase, tournoiId);
  if (!params) return { ok: false, error: "Ce tournoi n'est pas un tournoi à poules." };
  const { count } = await supabase
    .from('tournoi_tableau_places')
    .select('id', { count: 'exact', head: true })
    .eq('tournoi_id', tournoiId);
  if ((count ?? 0) > 0) return { ok: false, error: 'Les tableaux sont constitués : les clubs ne peuvent plus changer.' };
  const r = await enregistrerClubsEnBase(supabase, tournoiId, clubs);
  if (!r.ok) return { ok: false, error: r.error };
  revalidatePath(`/outils/tournoi/${tournoiId}`);
  return { ok: true };
}

/** N'autorise que la suppression de la DERNIÈRE partie : retirer une partie du
 *  milieu invaliderait les appariements de toutes les suivantes. */
export async function annulerDernierePartie(tournoiId: number): Promise<Resultat> {
  const { supabase, erreur } = await contexteCA();
  if (erreur) return { ok: false, error: erreur };

  const { data: parties } = await supabase
    .from('tournoi_parties')
    .select('id, numero')
    .eq('tournoi_id', tournoiId)
    .order('numero', { ascending: false })
    .limit(1);
  const derniere = parties?.[0];
  if (!derniere) return { ok: false, error: 'Aucune partie à annuler.' };

  // Les équipes de mêlée et les rencontres partent en cascade (on delete cascade).
  const { error } = await supabase.from('tournoi_parties').delete().eq('id', derniere.id);
  if (error) return { ok: false, error: error.message };

  const { count } = await supabase
    .from('tournoi_parties')
    .select('id', { count: 'exact', head: true })
    .eq('tournoi_id', tournoiId);
  await supabase
    .from('tournois')
    .update({ statut: (count ?? 0) === 0 ? 'preparation' : 'en_cours' })
    .eq('id', tournoiId);

  revalidatePath(`/outils/tournoi/${tournoiId}`);
  return { ok: true };
}

// -------------------------------------------------------------- les scores

/**
 * Enregistre un score. Un score vide (les deux à null) est accepté : c'est la
 * façon d'effacer une saisie erronée. Sinon on exige un vainqueur au but —
 * un match nul ou deux scores sous le but ne se classeraient pas.
 */
export async function enregistrerScore(
  rencontreId: number,
  scoreA: number | null,
  scoreB: number | null,
): Promise<Resultat> {
  const { supabase, erreur } = await contexteCA();
  if (erreur) return { ok: false, error: erreur };

  const { data: rencontre } = await supabase
    .from('tournoi_rencontres')
    .select('id, partie_id, tournoi_parties (tournoi_id, tournois (points_victoire))')
    .eq('id', rencontreId)
    .maybeSingle();
  if (!rencontre) return { ok: false, error: 'Rencontre introuvable.' };

  type Jointure = { tournoi_parties: { tournoi_id: number; tournois: { points_victoire: number } } };
  const j = rencontre as unknown as Jointure;
  const tournoiId = j.tournoi_parties.tournoi_id;
  const but = j.tournoi_parties.tournois.points_victoire;

  const vide = scoreA == null && scoreB == null;
  if (!vide && !scoreValide({ scoreA, scoreB }, but)) {
    return { ok: false, error: `Score invalide : le vainqueur doit être à ${but} au moins, et il faut un vainqueur.` };
  }

  const { error } = await supabase
    .from('tournoi_rencontres')
    .update({ score_a: scoreA, score_b: scoreB, modifie_le: new Date().toISOString() })
    .eq('id', rencontreId);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/outils/tournoi/${tournoiId}`);
  return { ok: true };
}

/** Clôture le tournoi. Refusé tant qu'un résultat manque : le classement
 *  final serait faux, et c'est lui qu'on affiche et qu'on imprime. */
export async function cloturerTournoi(tournoiId: number): Promise<Resultat> {
  const { supabase, erreur } = await contexteCA();
  if (erreur) return { ok: false, error: erreur };

  const complet = await getTournoiComplet(tournoiId);
  if (!complet) return { ok: false, error: 'Tournoi introuvable.' };
  const manquants = complet.parties
    .flatMap((p) => p.rencontres)
    .filter((r) => !scoreValide(r, complet.tournoi.pointsVictoire)).length;
  if (manquants > 0) return { ok: false, error: `${manquants} résultat(s) encore à saisir.` };
  if (complet.tournoi.format === 'poules') {
    if (!complet.vuePoules?.fini) {
      const suite = complet.vuePoules?.prochaine;
      return { ok: false, error: suite ? `Il reste à jouer : ${suite}.` : 'Les poules et les tableaux ne sont pas terminés.' };
    }
  } else if (complet.parties.length < complet.tournoi.nbParties) {
    return { ok: false, error: `Il reste ${complet.tournoi.nbParties - complet.parties.length} partie(s) à jouer.` };
  }

  const { error } = await supabase.from('tournois').update({ statut: 'termine' }).eq('id', tournoiId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/outils/tournoi/${tournoiId}`);
  return { ok: true };
}

export async function rouvrirTournoi(tournoiId: number): Promise<Resultat> {
  const { supabase, erreur } = await contexteCA();
  if (erreur) return { ok: false, error: erreur };
  const { error } = await supabase.from('tournois').update({ statut: 'en_cours' }).eq('id', tournoiId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/outils/tournoi/${tournoiId}`);
  return { ok: true };
}
