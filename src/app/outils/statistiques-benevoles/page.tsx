import type { Metadata } from 'next';
import Link from 'next/link';
import { Trophy, Users, Clock, HeartHandshake } from 'lucide-react';
import { estMembreCA } from '@/lib/membres';
import { getStatistiquesBenevoles } from '@/lib/statistiquesBenevoles';
import { couleurCategorie } from '@/lib/categoriesCreneau';

export const metadata: Metadata = { title: 'Statistiques bénévoles' };

const MEDAILLE = ['#c9a227', '#9aa5ad', '#a9631f'] as const; // or, argent, bronze
const MEDAILLE_FOND = ['#faf3d8', '#eef0f1', '#f5e3d4'] as const;

function formaterDate(iso: string): string {
  if (!iso) return '—';
  return new Date(`${iso}T00:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default async function StatistiquesBenevolesPage() {
  const ca = await estMembreCA();

  if (!ca) {
    return (
      <main className="mx-auto max-w-5xl px-5 py-16 text-center">
        <p className="font-score text-[13px] tracking-[0.2em] text-terracotta">ACCÈS RESTREINT</p>
        <h1 className="font-display mt-1 text-3xl italic">Accès restreint</h1>
        <Link
          href="/connexion"
          className="mt-5 inline-block rounded-lg bg-terracotta px-4 py-2.5 text-[14px] text-white transition-opacity hover:opacity-90"
        >
          Se connecter
        </Link>
      </main>
    );
  }

  const { classement, parCategorie, parManifestation, totalMembres, totalExternes } = await getStatistiquesBenevoles();

  const totalParticipations = classement.reduce((s, c) => s + c.participations, 0);
  const totalHeures = Math.round(classement.reduce((s, c) => s + c.heures, 0) * 10) / 10;
  const podium = classement.slice(0, 3);
  const maxParticipationsCategorie = Math.max(...parCategorie.map((c) => c.participations), 1);
  const maxParticipationsManif = Math.max(...parManifestation.map((m) => m.participations), 1);

  return (
    <main className="mx-auto max-w-4xl px-5 py-12">
      <header className="entree mb-9">
        <p className="font-score text-[13px] tracking-[0.2em] text-terracotta">OUTILS · COMITÉ</p>
        <h1 className="font-display mt-1 text-4xl italic">Statistiques bénévoles</h1>
        <p className="mt-3 max-w-lg text-[13.5px] text-encre-douce">
          Toutes les participations enregistrées, toutes saisons confondues — qui donne du temps, sur quelles
          tâches, pour quelles manifestations.
        </p>
      </header>

      {classement.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-ligne bg-sable-carte px-5 py-14 text-center">
          <HeartHandshake size={28} className="text-pin" />
          <p className="text-[14px] text-encre-douce">Aucune affectation enregistrée pour l&apos;instant.</p>
        </div>
      ) : (
        <>
          {/* Chiffres clés */}
          <div className="mb-8 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <div className="rounded-xl border border-ligne bg-sable-carte p-4">
              <div className="flex items-center gap-1.5 text-[10.5px] uppercase tracking-wide text-encre-douce">
                <HeartHandshake size={13} /> Participations
              </div>
              <div className="font-score mt-1 text-2xl">{totalParticipations}</div>
            </div>
            <div className="rounded-xl border border-ligne bg-sable-carte p-4">
              <div className="flex items-center gap-1.5 text-[10.5px] uppercase tracking-wide text-encre-douce">
                <Clock size={13} /> Heures cumulées
              </div>
              <div className="font-score mt-1 text-2xl">{totalHeures}</div>
            </div>
            <div className="rounded-xl border border-ligne bg-sable-carte p-4">
              <div className="flex items-center gap-1.5 text-[10.5px] uppercase tracking-wide text-encre-douce">
                <Users size={13} /> Membres
              </div>
              <div className="font-score mt-1 text-2xl">{totalMembres}</div>
            </div>
            <div className="rounded-xl border border-ligne bg-sable-carte p-4">
              <div className="flex items-center gap-1.5 text-[10.5px] uppercase tracking-wide text-encre-douce">
                <Users size={13} /> Externes
              </div>
              <div className="font-score mt-1 text-2xl">{totalExternes}</div>
            </div>
          </div>

          {/* Podium */}
          <div className="mb-9">
            <h2 className="font-display mb-3 flex items-center gap-2 text-lg italic">
              <Trophy size={18} className="text-laiton" /> Top 3
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {podium.map((b, i) => (
                <div
                  key={b.nom}
                  className="flex flex-col items-center gap-1.5 rounded-2xl border border-ligne p-5 text-center shadow-[0_1px_3px_rgba(36,27,18,.04)]"
                  style={{ backgroundColor: MEDAILLE_FOND[i] }}
                >
                  <div
                    className="font-score flex h-9 w-9 items-center justify-center rounded-full text-[15px] text-white"
                    style={{ backgroundColor: MEDAILLE[i] }}
                  >
                    {i + 1}
                  </div>
                  <span className="font-display mt-1 text-[16px]">{b.nom}</span>
                  <span className="text-[12px] text-encre-douce">
                    {b.participations} participation{b.participations > 1 ? 's' : ''} · {b.heures} h
                  </span>
                  {b.tacheFrequente && (
                    <span className="mt-1 rounded-full bg-white/60 px-2.5 py-0.5 text-[10.5px] text-encre-douce">
                      surtout {b.tacheFrequente.toLowerCase()}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Répartition par catégorie */}
          <div className="mb-9">
            <h2 className="font-display mb-3 text-lg italic">Par type de tâche</h2>
            <div className="flex flex-col rounded-2xl border border-ligne bg-sable-carte p-4">
              {parCategorie.map((c) => (
                <div
                  key={c.categorie}
                  className="grid grid-cols-[110px_1fr_90px] items-center gap-3 border-t border-ligne py-2 text-[12.5px] first:border-t-0"
                >
                  <span className="text-encre">{c.categorie}</span>
                  <span className="block h-[14px] overflow-hidden rounded-full bg-sable">
                    <span
                      className="block h-full rounded-full transition-[width] duration-500"
                      style={{ width: `${(c.participations / maxParticipationsCategorie) * 100}%`, background: couleurCategorie(c.categorie) }}
                    />
                  </span>
                  <span className="text-right text-encre-douce">
                    {c.participations} · {c.heures} h
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Répartition par manifestation */}
          <div className="mb-9">
            <h2 className="font-display mb-3 text-lg italic">Par manifestation</h2>
            <div className="flex flex-col rounded-2xl border border-ligne bg-sable-carte p-4">
              {parManifestation.map((m) => (
                <div
                  key={m.manifestation}
                  className="grid grid-cols-[1fr_1fr_130px] items-center gap-3 border-t border-ligne py-2 text-[12.5px] first:border-t-0"
                >
                  <span className="truncate text-encre">{m.manifestation}</span>
                  <span className="block h-[14px] overflow-hidden rounded-full bg-sable">
                    <span
                      className="block h-full rounded-full bg-terracotta transition-[width] duration-500"
                      style={{ width: `${(m.participations / maxParticipationsManif) * 100}%` }}
                    />
                  </span>
                  <span className="text-right text-encre-douce">
                    {m.participations} participation{m.participations > 1 ? 's' : ''} · {m.benevoles} pers.
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Classement complet */}
          <div>
            <h2 className="font-display mb-3 text-lg italic">Classement complet</h2>
            <div className="overflow-x-auto rounded-2xl border border-ligne bg-sable-carte">
              <table className="w-full min-w-[640px] border-collapse text-[12.5px]">
                <thead>
                  <tr className="border-b border-ligne text-left text-[10.5px] uppercase tracking-wide text-encre-douce">
                    <th className="px-4 py-2.5 font-medium">#</th>
                    <th className="px-4 py-2.5 font-medium">Nom</th>
                    <th className="px-4 py-2.5 font-medium">Statut</th>
                    <th className="px-4 py-2.5 font-medium text-right">Participations</th>
                    <th className="px-4 py-2.5 font-medium text-right">Manifestations</th>
                    <th className="px-4 py-2.5 font-medium text-right">Heures</th>
                    <th className="px-4 py-2.5 font-medium">Tâche fréquente</th>
                    <th className="px-4 py-2.5 font-medium">Dernière participation</th>
                  </tr>
                </thead>
                <tbody>
                  {classement.map((b, i) => (
                    <tr key={b.nom} className="border-b border-ligne last:border-b-0">
                      <td className="px-4 py-2 text-encre-douce">{i + 1}</td>
                      <td className="px-4 py-2 font-medium text-encre">{b.nom}</td>
                      <td className="px-4 py-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10.5px] font-medium ${
                            b.estMembre ? 'bg-pin/10 text-pin' : 'bg-encre-douce/10 text-encre-douce'
                          }`}
                        >
                          {b.estMembre ? 'Membre' : 'Externe'}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right font-medium text-encre">{b.participations}</td>
                      <td className="px-4 py-2 text-right text-encre-douce">{b.manifestations}</td>
                      <td className="px-4 py-2 text-right text-encre-douce">{b.heures}</td>
                      <td className="px-4 py-2 text-encre-douce">{b.tacheFrequente || '—'}</td>
                      <td className="px-4 py-2 text-encre-douce">{formaterDate(b.derniereParticipation)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
