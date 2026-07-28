import type { Metadata } from 'next';
import Link from 'next/link';
import {
  CalendarRange,
  ShieldCheck,
  CalendarClock,
  Euro,
  Clock,
  RefreshCw,
  IdCard,
  Trophy,
  MessageCircleQuestion,
  ScrollText,
  PenTool,
  UserPlus,
} from 'lucide-react';
import { estMembreCA } from '@/lib/membres';

export const metadata: Metadata = { title: 'Outils' };

/** Grille d'outils (28/07/2026, demande Jérôme — remplace le menu
 *  déroulant "Outils" par une vraie page d'atterrissage) : un bloc par
 *  outil (icône + nom + description courte), 4 par ligne. Le point de nav
 *  "Outils" (OutilsMenu.tsx) pointe maintenant directement ici plutôt que
 *  d'ouvrir un menu au survol. */
const OUTILS = [
  { href: '/membres/demandes', label: 'Demandes d’adhésion', description: 'Traiter les demandes en attente', Icon: UserPlus },
  { href: '/saisons', label: 'Saisons', description: 'Gérer les saisons du club', Icon: CalendarRange },
  { href: '/federation', label: 'Contrôle fédération', description: 'Écarts avec les données fédérales', Icon: ShieldCheck },
  { href: '/federation/calendrier', label: 'Calendrier fédération', description: 'Tournois et matchs à venir', Icon: CalendarClock },
  { href: '/outils/paiements', label: 'Appel à cotisation', description: 'Créer un appel de paiement', Icon: Euro },
  { href: '/outils/paiements-en-attente', label: 'Paiements en attente', description: 'Valider les paiements reçus', Icon: Clock },
  { href: '/outils/renouvellement', label: 'Renouvellement', description: 'Relancer les adhésions', Icon: RefreshCw },
  { href: '/outils/fiches-membres', label: 'Fiches membres', description: 'Classeur PDF et exports', Icon: IdCard },
  { href: '/outils/statistiques-benevoles', label: 'Statistiques bénévoles', description: 'Classement des participations', Icon: Trophy },
  { href: '/outils/assistant-questions', label: 'Questions posées à Caro', description: "Diagnostic d'usage de l'assistant", Icon: MessageCircleQuestion },
  { href: '/outils/journal', label: 'Journal des actions', description: 'Qui a fait quoi, quand', Icon: ScrollText },
  { href: '/outils/signatures', label: 'Signatures électroniques', description: 'Envoyer et suivre des signatures', Icon: PenTool },
];

export default async function OutilsPage() {
  const ca = await estMembreCA();

  if (!ca) {
    return (
      <main className="mx-auto max-w-5xl px-5 py-16 text-center">
        <p className="font-score text-[13px] tracking-[0.2em] text-terracotta">ACCÈS RESTREINT</p>
        <h1 className="font-display mt-1 text-3xl italic">Réservé au comité</h1>
        <Link
          href="/connexion"
          className="mt-5 inline-block rounded-lg bg-terracotta px-4 py-2.5 text-[14px] text-white transition-opacity hover:opacity-90"
        >
          Se connecter
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-5 py-12">
      <header className="entree mb-8">
        <p className="font-score text-[13px] tracking-[0.2em] text-terracotta">COMITÉ</p>
        <h1 className="font-display mt-1 text-4xl italic">Outils</h1>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {OUTILS.map(({ href, label, description, Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex flex-col items-start gap-2.5 rounded-2xl border border-ligne bg-sable-carte p-4 shadow-[0_1px_3px_rgba(36,27,18,.04)] transition-transform hover:-translate-y-0.5 hover:border-terracotta"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-terracotta/10 text-terracotta">
              <Icon size={17} />
            </span>
            <span>
              <span className="block font-display text-[14.5px]">{label}</span>
              <span className="mt-0.5 block text-[11.5px] leading-snug text-encre-douce">{description}</span>
            </span>
          </Link>
        ))}
      </div>
    </main>
  );
}
