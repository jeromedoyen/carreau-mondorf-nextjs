'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { envoyerEmail, chargerLogoClub } from '@/lib/email';
import { emailRemboursementConcours, emailRemboursementPartenaire } from '@/lib/emailTemplates';

type Resultat = { ok: true; genere?: number } | { ok: false; error: string };

async function verifierTresorerie(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data } = await supabase.rpc('est_membre_tresorerie');
  return !!data;
}

/** Regroupe joueurs_cm ("Nom1, Nom2, Nom3") en liste de noms canoniques —
 *  même découpage que reduireStatistiquesD2 (src/lib/stats.ts), dupliqué
 *  ici volontairement : ce module n'a pas besoin du reste du calcul
 *  statistique, juste de la liste des 9 joueurs d'une rencontre. */
function joueursDeParty(joueursCm: string): string[] {
  return String(joueursCm || '')
    .split(',')
    .map((n) => n.trim())
    .filter(Boolean);
}

/** Génère (ou complète) la liste "Championnat D2" des participations à
 *  rembourser : une ligne par joueur ayant réellement joué une rencontre à
 *  l'extérieur (domicile = false, statut = 'Jouée'), déduits de
 *  parties_d2.joueurs_cm — cahier des charges §1 "9 joueurs connus via
 *  résultats, stats". Idempotent (index anti-doublon sur
 *  rencontre_d2_id+personne_id) : peut être relancé après chaque nouvelle
 *  rencontre jouée sans dupliquer les lignes déjà générées. */
export async function genererListeChampionnatD2(saison: string): Promise<Resultat> {
  const supabase = await createClient();
  if (!(await verifierTresorerie(supabase))) return { ok: false, error: 'Action réservée à la trésorerie.' };

  const { data: rencontresData, error: errR } = await supabase
    .from('rencontres_d2')
    .select('id, date, club_adverse')
    .eq('saison', saison)
    .eq('domicile', false)
    .eq('statut', 'Jouée');
  if (errR) return { ok: false, error: errR.message };
  const rencontres = rencontresData ?? [];
  if (!rencontres.length) return { ok: true, genere: 0 };

  const { data: partiesData, error: errP } = await supabase
    .from('parties_d2')
    .select('rencontre_id, joueurs_cm')
    .in('rencontre_id', rencontres.map((r) => r.id))
    .eq('supprime', false);
  if (errP) return { ok: false, error: errP.message };

  const { data: personnesData, error: errPer } = await supabase
    .from('personnes')
    .select('id, nom, prenom')
    .eq('supprime', false);
  if (errPer) return { ok: false, error: errPer.message };
  const idParNom = new Map((personnesData ?? []).map((p) => [`${p.prenom} ${p.nom}`, p.id]));

  const joueursParRencontre = new Map<number, Set<string>>();
  for (const p of partiesData ?? []) {
    const set = joueursParRencontre.get(p.rencontre_id) ?? new Set<string>();
    for (const nom of joueursDeParty(p.joueurs_cm)) set.add(nom);
    joueursParRencontre.set(p.rencontre_id, set);
  }

  const lignes: { saison: string; type: string; source: string; personne_id: number; rencontre_d2_id: number; date: string; club: string | null }[] = [];
  for (const r of rencontres) {
    const noms = joueursParRencontre.get(r.id);
    if (!noms) continue;
    for (const nom of noms) {
      const personneId = idParNom.get(nom);
      if (!personneId) continue; // nom non reconnu dans le registre — ignoré plutôt que planté, cohérent avec le reste du projet
      lignes.push({
        saison,
        type: 'Championnat_D2',
        source: 'auto',
        personne_id: personneId,
        rencontre_d2_id: r.id,
        date: r.date,
        club: r.club_adverse,
      });
    }
  }
  if (!lignes.length) return { ok: true, genere: 0 };

  const { error, count } = await supabase
    .from('participations_concours')
    .upsert(lignes, { onConflict: 'rencontre_d2_id, personne_id', ignoreDuplicates: true, count: 'exact' });
  if (error) return { ok: false, error: error.message };

  revalidatePath('/outils/remboursements');
  return { ok: true, genere: count ?? lignes.length };
}

export async function validerParticipation(id: number): Promise<Resultat> {
  const supabase = await createClient();
  if (!(await verifierTresorerie(supabase))) return { ok: false, error: 'Action réservée à la trésorerie.' };

  const { error } = await supabase.from('participations_concours').update({ statut: 'valide' }).eq('id', id);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/outils/remboursements');
  return { ok: true };
}

/** Corrige le montant d'une participation "hors pays" (règle non définie —
 *  jamais calculée automatiquement, cf. migration 0047) ou toute autre
 *  correction manuelle du trésorier avant validation/paiement. */
export async function corrigerMontantParticipation(id: number, montant: number): Promise<Resultat> {
  const supabase = await createClient();
  if (!(await verifierTresorerie(supabase))) return { ok: false, error: 'Action réservée à la trésorerie.' };
  if (!(montant >= 0)) return { ok: false, error: 'Montant invalide.' };

  const { error } = await supabase.from('participations_concours').update({ montant_final: montant }).eq('id', id);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/outils/remboursements');
  return { ok: true };
}

/** Marque une participation payée et envoie les notifications (cahier des
 *  charges §4) : email au joueur/chef d'équipe avec le détail, email aux
 *  partenaires (si triplette/doublette manuelle) les invitant à se
 *  tourner vers le chef pour la répartition. Les échecs d'envoi d'email
 *  n'annulent pas le paiement déjà enregistré (le virement réel a déjà eu
 *  lieu hors de l'app) — juste journalisés côté serveur. */
export async function marquerParticipationPayee(id: number): Promise<Resultat> {
  const supabase = await createClient();
  if (!(await verifierTresorerie(supabase))) return { ok: false, error: 'Action réservée à la trésorerie.' };

  const { data: participation, error: errGet } = await supabase
    .from('participations_concours')
    .select('id, type, chef_equipe_id, personne_id, club, date, montant_final, personnes!participations_concours_personne_id_fkey(nom, prenom, email)')
    .eq('id', id)
    .maybeSingle();
  if (errGet || !participation) return { ok: false, error: errGet?.message ?? 'Introuvable.' };
  if (participation.montant_final == null) {
    return { ok: false, error: 'Montant non défini — corrige le montant avant de marquer payé (cas "hors pays" notamment).' };
  }

  const { error } = await supabase
    .from('participations_concours')
    .update({ statut: 'paye', paye_le: new Date().toISOString() })
    .eq('id', id);
  if (error) return { ok: false, error: error.message };

  await envoyerNotificationsPaiement(supabase, participation);

  revalidatePath('/outils/remboursements');
  return { ok: true };
}

type ParticipationAvecPersonne = {
  id: number;
  type: string;
  chef_equipe_id: number | null;
  personne_id: number;
  club: string | null;
  date: string;
  montant_final: number | null;
  personnes: { nom: string; prenom: string; email: string | null } | { nom: string; prenom: string; email: string | null }[] | null;
};

/** Envoie les notifications de paiement (cahier des charges §4) : email au
 *  bénéficiaire réel du virement (joueur en Championnat/Promotion, chef
 *  d'équipe en concours manuel) avec le détail, puis — uniquement s'il
 *  s'agit d'un chef d'équipe — un email distinct à chacun de ses
 *  partenaires les invitant à se tourner vers lui pour la répartition.
 *  Échecs d'envoi non bloquants : le paiement réel a déjà eu lieu hors de
 *  l'app, on ne veut pas laisser une participation "non payée" juste à
 *  cause d'un souci SMTP passager. */
async function envoyerNotificationsPaiement(
  supabase: Awaited<ReturnType<typeof createClient>>,
  participation: ParticipationAvecPersonne
) {
  try {
    const beneficiaire = Array.isArray(participation.personnes) ? participation.personnes[0] : participation.personnes;
    if (!beneficiaire?.email || participation.montant_final == null) return;

    const libelleConcours = `${
      participation.type === 'Championnat_D2'
        ? 'National D2'
        : participation.type === 'Promotion'
          ? 'Promotion'
          : participation.type === 'Concours_National'
            ? 'championnat national'
            : 'concours'
    }${participation.club ? ` — ${participation.club}` : ''} (${new Date(participation.date + 'T00:00:00').toLocaleDateString('fr-FR')})`;
    const estChef = participation.chef_equipe_id === participation.personne_id;

    let partenaires: { prenom: string; nom: string; email: string | null }[] = [];
    if (estChef) {
      const { data: coequipiers } = await supabase
        .from('participations_concours')
        .select('personnes!participations_concours_personne_id_fkey(nom, prenom, email)')
        .eq('chef_equipe_id', participation.chef_equipe_id)
        .eq('date', participation.date)
        .neq('personne_id', participation.personne_id)
        .eq('supprime', false);
      partenaires = (coequipiers ?? [])
        .map((c) => (Array.isArray(c.personnes) ? c.personnes[0] : c.personnes))
        .filter((l): l is { nom: string; prenom: string; email: string | null } => !!l);
    }

    const logo = chargerLogoClub();
    await envoyerEmail({
      destinataire: beneficiaire.email,
      sujet: 'Remboursement de tes frais de concours',
      html: emailRemboursementConcours({
        prenom: beneficiaire.prenom,
        concours: libelleConcours,
        montant: participation.montant_final,
        estChefEquipe: estChef,
        partenaires: partenaires.map((p) => `${p.prenom} ${p.nom}`),
      }),
      attachments: [{ filename: 'logo.png', content: logo, cid: 'logo-club' }],
    });

    for (const partenaire of partenaires) {
      if (!partenaire.email) continue;
      await envoyerEmail({
        destinataire: partenaire.email,
        sujet: 'Remboursement de ton concours — répartition',
        html: emailRemboursementPartenaire({
          prenom: partenaire.prenom,
          concours: libelleConcours,
          nomChefEquipe: `${beneficiaire.prenom} ${beneficiaire.nom}`,
        }),
        attachments: [{ filename: 'logo.png', content: logo, cid: 'logo-club' }],
      });
    }
  } catch {
    // Échec d'envoi non bloquant — le paiement reste enregistré.
  }
}

export async function supprimerParticipation(id: number): Promise<Resultat> {
  const supabase = await createClient();
  if (!(await verifierTresorerie(supabase))) return { ok: false, error: 'Action réservée à la trésorerie.' };

  const { error } = await supabase.from('participations_concours').update({ supprime: true }).eq('id', id);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/outils/remboursements');
  return { ok: true };
}

export async function enregistrerMontantRemboursementConcours(montant: number): Promise<Resultat> {
  const supabase = await createClient();
  if (!(await verifierTresorerie(supabase))) return { ok: false, error: 'Action réservée à la trésorerie.' };
  if (!(montant >= 0)) return { ok: false, error: 'Montant invalide.' };

  const { error } = await supabase
    .from('parametres_club')
    .update({ montant_remboursement_concours: montant, maj_le: new Date().toISOString() })
    .eq('id', 1);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/outils/remboursements');
  return { ok: true };
}

// --- Saisie manuelle (côté joueur / chef d'équipe) ---

/** Un licencié quelconque déclare sa participation (comme chef d'équipe) à
 *  un concours hors championnat/promotion — cahier des charges §3. Vérifie
 *  lui-même (via mon_id_personne(), pas via l'entrée client) que le chef
 *  d'équipe désigné est bien l'utilisateur connecté : la RLS autorise déjà
 *  toute insertion "manuel" par un licencié, cette vérification applicative
 *  est ce qui empêche réellement quelqu'un de se faire passer pour chef
 *  d'une équipe qui n'est pas la sienne. */
export async function creerParticipationManuelle(data: {
  saison: string;
  date: string;
  club: string;
  pays: string;
  horsCalendrier: boolean;
  horsPays: boolean;
  inscriptionMontant: number;
  repasInclus: boolean;
  partenaireIds: number[]; // autres joueurs de l'équipe, en plus du chef
  notes?: string;
}): Promise<Resultat> {
  const supabase = await createClient();
  const { data: autorise } = await supabase.rpc('est_utilisateur_autorise');
  if (!autorise) return { ok: false, error: 'Réservé aux licenciés connectés.' };

  const { data: monId } = await supabase.rpc('mon_id_personne');
  if (!monId) return { ok: false, error: 'Aucune fiche licencié trouvée pour ta session — contacte le comité.' };
  if (!data.date || !data.club.trim() || !(data.inscriptionMontant > 0)) {
    return { ok: false, error: 'Date, club et montant d\'inscription obligatoires.' };
  }

  // Anti-doublon (cahier des charges §3.2) : un concours déjà enregistré
  // (même date + club, tous joueurs de l'équipe confondus) ne doit pas être
  // resaisi par un partenaire — vérifié en amont avec un message clair,
  // plutôt qu'un rejet muet côté base.
  const idsEquipe = [monId, ...data.partenaireIds];
  const { data: existants } = await supabase
    .from('participations_concours')
    .select('id, personne_id')
    .eq('date', data.date)
    .ilike('club', data.club.trim())
    .eq('source', 'manuel')
    .eq('supprime', false)
    .in('personne_id', idsEquipe);
  if (existants && existants.length > 0) {
    return { ok: false, error: 'Ce concours est déjà enregistré pour un ou plusieurs joueurs de cette équipe.' };
  }

  const base = {
    saison: data.saison,
    type: 'Concours' as const,
    source: 'manuel' as const,
    chef_equipe_id: monId,
    date: data.date,
    club: data.club.trim(),
    pays: data.pays || 'LU',
    hors_calendrier: data.horsCalendrier,
    hors_pays: data.horsPays,
    inscription_montant: data.inscriptionMontant,
    repas_inclus: data.repasInclus,
    notes: data.notes?.trim() || null,
  };

  const lignes = idsEquipe.map((personneId) => ({ ...base, personne_id: personneId }));
  const { error } = await supabase.from('participations_concours').insert(lignes);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/concours');
  revalidatePath('/outils/remboursements');
  return { ok: true };
}
