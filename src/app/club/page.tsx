import type { Metadata } from 'next';
import Image from 'next/image';
import { MapPin, Mail, Navigation, Users } from 'lucide-react';
import { CLUB, DISCIPLINES, COMITE, ITINERAIRES } from '@/lib/club';

export const metadata: Metadata = {
  title: 'Le Club',
  description:
    'Club Carreau Boules et Pétanque Mondorf a.s.b.l. — pétanque et boules lyonnaises à Mondorf-les-Bains, Luxembourg.',
};

const MAPS_BOULODROME =
  'https://www.google.com/maps/search/?api=1&query=1+rue+Dr+Jean+Th%C3%A9odore+Kirpach+L-5620+Mondorf-les-Bains';

function urlItineraire(origine: string) {
  const destination = encodeURIComponent(
    '1 rue Dr Jean Théodore Kirpach L-5620 Mondorf-les-Bains'
  );
  return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origine)}&destination=${destination}&travelmode=driving`;
}

/** Glyphe Facebook minimal en SVG inline — lucide-react n'a plus d'icônes de
 *  marque (retirées du set), pas la peine d'ajouter une dépendance pour ça. */
function IconeFacebook({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M13.5 21v-7.5h2.5l.4-3H13.5V8.5c0-.9.25-1.5 1.55-1.5H16.5V4.3C16.2 4.26 15.2 4.17 14 4.17c-2.4 0-4 1.46-4 4.15V10.5H7.5v3H10V21h3.5Z" />
    </svg>
  );
}

export default function ClubPage() {
  return (
    <main className="mx-auto max-w-5xl px-5 py-14">
      {/* ---------- Hero ---------- */}
      <header className="entree mb-16 text-center">
        <Image
          src="/logo.png"
          alt="Carreau Mondorf"
          width={500}
          height={261}
          priority
          className="mx-auto h-24 w-auto"
        />
        <h1 className="font-display mt-6 text-[clamp(2rem,6vw,3.25rem)] italic leading-tight">
          Club Carreau Boules &amp; Pétanque Mondorf
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-encre-douce">
          {CLUB.baseline}
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <a
            href={CLUB.facebook}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-pin px-5 py-2.5 text-[13.5px] font-medium text-sable-carte transition-transform hover:-translate-y-0.5"
          >
            <IconeFacebook className="h-4 w-4" />
            Rejoindre notre groupe Facebook
          </a>
          <a
            href={`mailto:${CLUB.email}`}
            className="inline-flex items-center gap-2 rounded-full border border-ligne bg-sable-carte px-5 py-2.5 text-[13.5px] font-medium text-encre transition-transform hover:-translate-y-0.5"
          >
            <Mail size={16} />
            Nous écrire
          </a>
          <a
            href={MAPS_BOULODROME}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-ligne bg-sable-carte px-5 py-2.5 text-[13.5px] font-medium text-encre transition-transform hover:-translate-y-0.5"
          >
            <MapPin size={16} />
            Voir le boulodrome sur la carte
          </a>
        </div>
      </header>

      {/* ---------- Disciplines ---------- */}
      <section className="mb-16">
        <p className="font-score text-[13px] tracking-[0.2em] text-terracotta">LE CLUB</p>
        <h2 className="font-display mt-1 mb-6 text-2xl italic">Deux disciplines, un seul terrain</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {DISCIPLINES.map((d, i) => (
            <div
              key={d.titre}
              className="rounded-2xl border border-ligne bg-sable-carte p-6 shadow-[0_1px_3px_rgba(36,27,18,.04)]"
            >
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-full font-display text-[14px] font-semibold ${
                  ['bg-terracotta/15 text-terracotta-dark', 'bg-pin/15 text-pin', 'bg-laiton/20 text-laiton'][i]
                }`}
              >
                {['P', 'B', '♥'][i]}
              </div>
              <h3 className="font-display mt-3.5 text-[15px]">{d.titre}</h3>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-encre-douce">{d.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- Infos pratiques ---------- */}
      <section className="mb-16">
        <p className="font-score text-[13px] tracking-[0.2em] text-terracotta">INFOS PRATIQUES</p>
        <h2 className="font-display mt-1 mb-6 text-2xl italic">Nous trouver et nous rejoindre</h2>
        <div className="divide-y divide-ligne overflow-hidden rounded-2xl border border-ligne bg-sable-carte">
          {[
            { k: 'Boulodrome', v: CLUB.boulodrome.adresse, note: CLUB.boulodrome.note },
            { k: 'Siège social', v: CLUB.siegeSocial },
            { k: 'Cotisation annuelle', v: CLUB.cotisation },
            { k: 'Association', v: `${CLUB.nomComplet} — ${CLUB.rcs}` },
            { k: 'Email', v: CLUB.email, href: `mailto:${CLUB.email}` },
          ].map((ligne) => (
            <div key={ligne.k} className="flex flex-col gap-1 px-5 py-4 sm:flex-row sm:items-start sm:gap-5">
              <div className="shrink-0 text-[11.5px] font-medium uppercase tracking-wide text-encre-douce/70 sm:w-40">
                {ligne.k}
              </div>
              <div className="text-[14px] text-encre">
                {ligne.href ? (
                  <a href={ligne.href} className="text-terracotta hover:underline">
                    {ligne.v}
                  </a>
                ) : (
                  ligne.v
                )}
                {ligne.note && <span className="mt-0.5 block text-[12.5px] text-encre-douce">{ligne.note}</span>}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- Comment venir ---------- */}
      <section className="mb-16">
        <p className="text-center font-score text-[13px] tracking-[0.2em] text-terracotta">COMMENT VENIR</p>
        <h2 className="font-display mt-1 mb-2 text-center text-2xl italic">Depuis les quatre frontières</h2>
        <p className="mx-auto mb-8 max-w-md text-center text-[13.5px] leading-relaxed text-encre-douce">
          Le boulodrome est à quelques minutes de la France, de l&apos;Allemagne et de la Belgique — voici le
          meilleur point de repère selon d&apos;où vous venez.
        </p>

        <div className="mx-auto mb-5 max-w-2xl rounded-2xl bg-encre px-6 py-4 text-center text-sable-carte">
          <p className="font-score text-[13px] tracking-[0.1em]">BOULODROME CARREAU MONDORF</p>
          <p className="mt-0.5 text-[13.5px] text-sable-carte/80">{CLUB.boulodrome.adresse}</p>
        </div>

        <div className="mx-auto grid max-w-2xl grid-cols-1 gap-3.5 sm:grid-cols-2">
          {ITINERAIRES.map((it) => (
            <div
              key={it.pays}
              className="rounded-2xl border border-ligne bg-sable-carte p-5 shadow-[0_1px_3px_rgba(36,27,18,.04)]"
            >
              <span className="text-xl">{it.drapeau}</span>
              <p className="font-display mt-1.5 text-[14.5px]">{it.pays}</p>
              <p className="text-[12px] text-encre-douce">{it.via}</p>
              <div className="mt-3 flex gap-5">
                <div>
                  <div className="font-score text-lg">{it.distance}</div>
                  <div className="text-[10px] uppercase tracking-wide text-encre-douce/70">distance</div>
                </div>
                <div>
                  <div className="font-score text-lg">{it.duree}</div>
                  <div className="text-[10px] uppercase tracking-wide text-encre-douce/70">en voiture</div>
                </div>
              </div>
              <p className="mt-3 text-[12px] leading-relaxed text-encre-douce">{it.route}</p>
              <a
                href={urlItineraire(it.origine)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-ligne px-3 py-1.5 text-[12px] font-medium text-terracotta hover:border-terracotta"
              >
                <Navigation size={13} />
                Itinéraire depuis {it.via.split(': ')[1]}
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- Comité ---------- */}
      <section className="mb-16">
        <p className="font-score text-[13px] tracking-[0.2em] text-terracotta">LE BUREAU</p>
        <h2 className="font-display mt-1 mb-6 text-2xl italic">Le comité directeur</h2>
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
          {COMITE.map((m) => (
            <div
              key={m.initiales}
              className="rounded-2xl border border-ligne bg-sable-carte p-5 text-center shadow-[0_1px_3px_rgba(36,27,18,.04)]"
            >
              <div className="mx-auto mb-3 h-14 w-14 overflow-hidden rounded-full border border-ligne bg-sable">
                {m.photo ? (
                  <Image src={m.photo} alt="" width={56} height={56} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Users size={20} className="text-encre-douce" />
                  </div>
                )}
              </div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-terracotta">{m.role}</p>
              <p className="mt-0.5 text-[13px] font-medium">{m.nom}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- CTA Facebook ---------- */}
      <section className="rounded-2xl bg-pin px-8 py-10 text-center text-sable-carte">
        <h2 className="font-display text-2xl italic">Envie de nous rejoindre ?</h2>
        <p className="mx-auto mt-2 max-w-md text-[14px] leading-relaxed text-sable-carte/80">
          Que vous soyez joueur confirmé ou simplement curieux de découvrir la pétanque et les boules lyonnaises,
          notre groupe Facebook est le meilleur moyen de suivre la vie du club et de passer nous voir au
          boulodrome.
        </p>
        <a
          href={CLUB.facebook}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-laiton px-6 py-2.5 text-[13.5px] font-semibold text-encre transition-transform hover:-translate-y-0.5"
        >
          <IconeFacebook className="h-4 w-4" />
          Rejoindre le groupe Facebook
        </a>
      </section>

      <footer className="mt-14 border-t border-ligne pt-6 text-center text-[12px] leading-relaxed text-encre-douce/70">
        {CLUB.nomComplet} — {CLUB.rcs}
        <br />
        {CLUB.siegeSocial}
      </footer>
    </main>
  );
}
