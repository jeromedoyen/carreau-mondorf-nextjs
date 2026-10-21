/**
 * Tests du contrôle des droits dans les migrations.
 * Lancer : node --test scripts/droits-migrations.test.js   (ou npm run db:droits:test)
 */
/* eslint-disable @typescript-eslint/no-require-imports -- script Node en CommonJS, comme appliquer-migrations.js */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { tablesSansDroits, auditer, PREMIERE_MIGRATION_SOUMISE } = require('./droits-migrations');

test('une table avec ses droits ne ressort pas', () => {
  const sql = `
    create table public.clients (id uuid primary key);
    grant select, insert, update, delete on public.clients to service_role;
  `;
  assert.deepEqual(tablesSansDroits(sql), []);
});

test('une table sans aucun droit ressort', () => {
  assert.deepEqual(tablesSansDroits('create table public.clients (id uuid primary key);'), ['clients']);
});

test('le schéma est facultatif, la casse et les guillemets sont neutralisés', () => {
  const sql = `
    create table "Clients" (id int);
    grant select on public."clients" to authenticated;
  `;
  assert.deepEqual(tablesSansDroits(sql), []);
});

test('create table if not exists est reconnu', () => {
  assert.deepEqual(tablesSansDroits('create table if not exists public.t (id int);'), ['t']);
});

test('un droit accordé au seul rôle postgres ne compte pas', () => {
  const sql = `
    create table public.t (id int);
    grant all on public.t to postgres;
  `;
  assert.deepEqual(tablesSansDroits(sql), ['t']);
});

test('un droit de fonction ou de séquence ne couvre pas la table', () => {
  const sql = `
    create table public.t (id int);
    grant execute on function public.f() to authenticated;
    grant usage on sequence public.t_id_seq to authenticated;
  `;
  assert.deepEqual(tablesSansDroits(sql), ['t']);
});

test('un grant mis en commentaire ne compte pas, un create mis en commentaire ne ressort pas', () => {
  const sql = `
    -- create table public.fantome (id int);
    /* create table public.autre (id int); */
    create table public.t (id int);
    -- grant select on public.t to anon;
    /* grant select on public.t to anon; */
  `;
  assert.deepEqual(tablesSansDroits(sql), ['t']);
});

test('la déclaration « sans-grant » exempte la table nommée, pas les autres', () => {
  const sql = `
    -- sans-grant: journal_interne : lue seulement par une fonction security definer
    create table public.journal_interne (id int);
    create table public.exposee (id int);
  `;
  assert.deepEqual(tablesSansDroits(sql), ['exposee']);
});

test('grant sur toutes les tables du schéma public couvre le fichier', () => {
  const sql = `
    create table public.a (id int);
    create table public.b (id int);
    grant select, insert on all tables in schema public to service_role;
  `;
  assert.deepEqual(tablesSansDroits(sql), []);
});

test('un grant sur toutes les tables d’un autre schéma ne couvre rien', () => {
  const sql = `
    create table public.a (id int);
    grant select on all tables in schema prive to service_role;
  `;
  assert.deepEqual(tablesSansDroits(sql), ['a']);
});

test('grant sur une liste de tables, écrit sur plusieurs lignes', () => {
  const sql = `
    create table public.a (id int);
    create table public.b (id int);
    create table public.c (id int);
    grant select
      on table public.a, public.b
      to anon,
         authenticated;
  `;
  assert.deepEqual(tablesSansDroits(sql), ['c']);
});

test('tables temporaires et tables d’un autre schéma sont ignorées', () => {
  const sql = `
    create temp table tmp_import (id int);
    create temporary table tmp2 (id int);
    create table private.secret (id int);
    create table extensions.outil (id int);
  `;
  assert.deepEqual(tablesSansDroits(sql), []);
});

test('une vue créée sans droits ressort, un create or replace view n’est pas contrôlé', () => {
  const sql = `
    create view public.v_nouvelle as select 1;
    create or replace view public.v_remplacee as select 1;
    create materialized view public.mv as select 1;
  `;
  assert.deepEqual(tablesSansDroits(sql), ['v_nouvelle', 'mv']);
});

test('une table non couverte ressort même si une autre l’est', () => {
  const sql = `
    create table public.a (id int);
    create table public.b (id int);
    grant select on public.a to authenticated;
  `;
  assert.deepEqual(tablesSansDroits(sql), ['b']);
});

test('auditer sépare les infractions des anciennes migrations', () => {
  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'droits-'));
  try {
    const ancienne = '0000_ancienne.sql';
    const fautive = `${PREMIERE_MIGRATION_SOUMISE}_fautive.sql`;
    const propre = `${PREMIERE_MIGRATION_SOUMISE}_propre.sql`;
    fs.writeFileSync(path.join(dossier, ancienne), 'create table public.vieille (id int);');
    fs.writeFileSync(path.join(dossier, fautive), 'create table public.neuve (id int);');
    fs.writeFileSync(
      path.join(dossier, propre),
      'create table public.ok (id int); grant select on public.ok to service_role;',
    );
    const { soumis, historiques } = auditer([ancienne, fautive, propre], dossier);
    assert.deepEqual(soumis, [{ fichier: fautive, tables: ['neuve'] }]);
    assert.deepEqual(historiques, [{ fichier: ancienne, tables: ['vieille'] }]);
  } finally {
    fs.rmSync(dossier, { recursive: true, force: true });
  }
});
