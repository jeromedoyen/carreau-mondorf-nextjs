'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getTournoiComplet, parametresDe } from '@/lib/tournoi/donnees';
import {
  composerProchainePartie as composerAvecLeMoteur,
  partiesMaxSansRevanche,
  repartirEffectif,
  scoreValide,
  type FormatTournoi,
} from '@/lib/tournoi/moteur';

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
};

function validerParametres(d: DonneesTournoi): string | null {
  if (!d.nom.trim()) return 'Le nom du tournoi est obligatoire.';
  if (!d.dateTournoi) return 'La date est obligatoire.';
  if (![1, 2, 3].includes(d.tailleEquipe)) return "La taille d'équipe doit être 1, 2 ou 3.";
  if (d.nbParties < 1 || d.nbParties > 12) return 'Le nombre de parties doit être compris entre 1 et 12.';
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
      nb_parties: d.nbParties,
      nb_terrains: d.nbTerrains,
      points_victoire: d.pointsVictoire,
      notes: d.notes?.trim() || null,
      cree_par_email: email,
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
    if (d.nbParties < complet.parties.length) {
      return { ok: false, error: `${complet.parties.length} parties sont déjà composées.` };
    }
  }

  const { error } = await supabase
    .from('tournois')
    .update({
      nom: d.nom.trim(),
      date_tournoi: d.dateTournoi,
      format: d.format,
      taille_equipe: d.tailleEquipe,
      nb_parties: d.nbParties,
      nb_terrains: d.nbTerrains,
      points_victoire: d.pointsVictoire,
      notes: d.notes?.trim() || null,
      modifie_le: new Date().toISOString(),
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

  // Les équipes permanentes dépendent de la liste : elles seront refaites.
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
  if (complet.tournoi.format !== 'equipes_fixes') {
    return { ok: false, error: 'Les équipes de départ ne concernent que le format à équipes fixes.' };
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
  if (complet.parties.length < complet.tournoi.nbParties) {
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
