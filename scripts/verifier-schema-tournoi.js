/**
 * Vérifie que le schéma du module Tournoi (0059) supporte réellement le
 * scénario complet : création, participants, équipes, parties, rencontres,
 * scores, puis les cascades de suppression.
 *
 * Tout se joue DANS UNE TRANSACTION ANNULÉE à la fin : rien n'est laissé en
 * base. C'est ce qui permet de le lancer sur la production sans arrière-pensée.
 *
 *   node scripts/verifier-schema-tournoi.js
 */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

function lireUrl() {
  const chemin = path.join(__dirname, '..', '.env.local');
  const contenu = fs.readFileSync(chemin, 'utf8');
  const ligne = contenu.split('\n').find((l) => l.startsWith('DATABASE_URL='));
  if (!ligne) throw new Error('DATABASE_URL absent de .env.local');
  return ligne.slice('DATABASE_URL='.length).trim();
}

let echecs = 0;
function verifier(libelle, condition, detail) {
  const ok = !!condition;
  if (!ok) echecs++;
  console.log(`  ${ok ? 'OK  ' : 'ÉCHEC'} ${libelle}${detail && !ok ? ` — ${detail}` : ''}`);
}

(async () => {
  const client = new Client({ connectionString: lireUrl(), ssl: { rejectUnauthorized: false } });
  await client.connect();

  try {
    console.log('\n=== Tables et colonnes créées ===');
    const tables = [
      'tournois',
      'tournoi_participants',
      'tournoi_parties',
      'tournoi_equipes',
      'tournoi_equipe_membres',
      'tournoi_rencontres',
    ];
    const { rows: presentes } = await client.query(
      `select table_name from information_schema.tables
       where table_schema = 'public' and table_name = any($1)`,
      [tables],
    );
    for (const t of tables) {
      verifier(t, presentes.some((r) => r.table_name === t));
    }

    console.log('\n=== RLS active et policies CA ===');
    const { rows: rls } = await client.query(
      `select c.relname, c.relrowsecurity, count(p.polname)::int as nb_policies
       from pg_class c
       left join pg_policy p on p.polrelid = c.oid
       where c.relname = any($1)
       group by c.relname, c.relrowsecurity`,
      [tables],
    );
    for (const t of tables) {
      const r = rls.find((x) => x.relname === t);
      verifier(`${t} : RLS activée + policy`, r && r.relrowsecurity && r.nb_policies > 0,
        r ? `rls=${r.relrowsecurity} policies=${r.nb_policies}` : 'table absente');
    }

    console.log('\n=== Scénario complet (transaction annulée) ===');
    await client.query('begin');

    const { rows: [t] } = await client.query(
      `insert into tournois (nom, date_tournoi, format, taille_equipe, nb_parties, nb_terrains, cree_par_email)
       values ('Test schéma', current_date, 'equipes_fixes', 3, 4, 6, 'test@local') returning id`,
    );
    verifier('tournoi créé', !!t.id);

    // 12 participants répartis en 4 équipes de 3
    const noms = Array.from({ length: 12 }, (_, i) => `Joueur ${i + 1}`);
    const { rows: parts } = await client.query(
      `insert into tournoi_participants (tournoi_id, nom, equipe_depart, ordre)
       select $1, n, ((ord - 1) / 3) + 1, ord - 1
       from unnest($2::text[]) with ordinality as u(n, ord) returning id`,
      [t.id, noms],
    );
    verifier('12 participants insérés', parts.length === 12, `${parts.length}`);

    const { rows: eqs } = await client.query(
      `insert into tournoi_equipes (tournoi_id, partie_id, numero)
       select $1, null, g from generate_series(1,4) g returning id, numero`,
      [t.id],
    );
    verifier('4 équipes permanentes', eqs.length === 4);

    for (let i = 0; i < 4; i++) {
      await client.query(
        `insert into tournoi_equipe_membres (equipe_id, participant_id) select $1, unnest($2::bigint[])`,
        [eqs[i].id, parts.slice(i * 3, i * 3 + 3).map((p) => p.id)],
      );
    }
    const { rows: [{ count: nbMembres }] } = await client.query(
      `select count(*)::int from tournoi_equipe_membres m
       join tournoi_equipes e on e.id = m.equipe_id where e.tournoi_id = $1`, [t.id]);
    verifier('12 appartenances', nbMembres === 12, `${nbMembres}`);

    const { rows: [p1] } = await client.query(
      `insert into tournoi_parties (tournoi_id, numero) values ($1, 1) returning id`, [t.id]);
    const { rows: rencs } = await client.query(
      `insert into tournoi_rencontres (partie_id, terrain, equipe_a_id, equipe_b_id)
       values ($1, 1, $2, $3), ($1, 2, $4, $5) returning id`,
      [p1.id, eqs[0].id, eqs[1].id, eqs[2].id, eqs[3].id]);
    verifier('2 rencontres créées', rencs.length === 2);

    await client.query(`update tournoi_rencontres set score_a = 13, score_b = 7 where id = $1`, [rencs[0].id]);
    const { rows: [score] } = await client.query(`select score_a, score_b from tournoi_rencontres where id = $1`, [rencs[0].id]);
    verifier('score enregistré', score.score_a === 13 && score.score_b === 7);

    console.log('\n=== Contraintes ===');
    const refuse = async (libelle, sql, params) => {
      try {
        await client.query('savepoint sp');
        await client.query(sql, params);
        await client.query('rollback to savepoint sp');
        verifier(libelle, false, 'accepté alors que ça devrait être refusé');
      } catch {
        await client.query('rollback to savepoint sp');
        verifier(libelle, true);
      }
    };
    await refuse('format inconnu refusé',
      `insert into tournois (nom, date_tournoi, format, taille_equipe, nb_parties, nb_terrains, cree_par_email)
       values ('x', current_date, 'quadrettes', 3, 4, 6, 'a@b')`);
    await refuse("taille d'équipe 4 refusée",
      `insert into tournois (nom, date_tournoi, format, taille_equipe, nb_parties, nb_terrains, cree_par_email)
       values ('x', current_date, 'melee', 4, 4, 6, 'a@b')`);
    await refuse('une équipe contre elle-même refusée',
      `insert into tournoi_rencontres (partie_id, terrain, equipe_a_id, equipe_b_id) values ($1, 3, $2, $2)`,
      [p1.id, eqs[0].id]);
    await refuse('score négatif refusé',
      `update tournoi_rencontres set score_a = -1 where id = $1`, [rencs[0].id]);
    await refuse('même licencié deux fois dans un tournoi refusé',
      `insert into tournoi_participants (tournoi_id, personne_id, nom)
       select $1, p.id, 'doublon' from personnes p limit 1;
       insert into tournoi_participants (tournoi_id, personne_id, nom)
       select $1, p.id, 'doublon 2' from personnes p limit 1;`, [t.id]);

    console.log('\n=== Cascades de suppression ===');
    await client.query(`delete from tournoi_parties where id = $1`, [p1.id]);
    const { rows: [{ count: restantes }] } = await client.query(
      `select count(*)::int from tournoi_rencontres where partie_id = $1`, [p1.id]);
    verifier('supprimer une partie supprime ses rencontres', restantes === 0, `${restantes}`);

    await client.query(`delete from tournois where id = $1`, [t.id]);
    const { rows: [{ count: pRest }] } = await client.query(
      `select count(*)::int from tournoi_participants where tournoi_id = $1`, [t.id]);
    const { rows: [{ count: mRest }] } = await client.query(
      `select count(*)::int from tournoi_equipe_membres m
       where m.equipe_id = any($1::bigint[])`, [eqs.map((e) => e.id)]);
    verifier('supprimer le tournoi supprime ses participants', pRest === 0, `${pRest}`);
    verifier('… et les appartenances aux équipes', mRest === 0, `${mRest}`);

    console.log('\n=== Journalisation (audit) ===');
    const { rows: journal } = await client.query(
      `select table_cible, action from journal_modifications
       where table_cible in ('tournois','tournoi_rencontres') and cree_le > now() - interval '2 minutes'`);
    verifier('création du tournoi journalisée',
      journal.some((j) => j.table_cible === 'tournois' && j.action === 'creation'));
    verifier('saisie de score journalisée',
      journal.some((j) => j.table_cible === 'tournoi_rencontres' && j.action === 'modification'));

    await client.query('rollback');
    console.log('\nTransaction annulée : rien n’a été laissé en base.');
  } catch (e) {
    await client.query('rollback').catch(() => {});
    console.error('\nErreur :', e.message);
    echecs++;
  } finally {
    await client.end();
  }

  console.log(echecs === 0 ? '\nTout est vert.\n' : `\n${echecs} vérification(s) en échec.\n`);
  process.exit(echecs === 0 ? 0 : 1);
})();
