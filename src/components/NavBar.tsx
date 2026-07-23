import Link from 'next/link';
import Image from 'next/image';
import { AuthNavLink } from './AuthNavLink';

export function NavBar() {
  return (
    <nav className="sticky top-0 z-30 border-b border-ligne/70 bg-sable/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center gap-7 px-5 py-3.5">
        <Link href="/" className="flex items-center gap-2.5">
          <Image
            src="/logo.png"
            alt="Carreau Mondorf"
            width={500}
            height={261}
            priority
            className="h-[34px] w-auto"
          />
          <span className="font-display text-[17px] font-semibold tracking-tight">
            Carreau Mondorf
          </span>
        </Link>
        <div className="flex items-center gap-6 text-[13.5px] font-medium">
          <Link
            href="/national-d2"
            className="text-encre-douce transition-colors hover:text-terracotta"
          >
            National D2
          </Link>
          <Link
            href="/promotion"
            className="text-encre-douce transition-colors hover:text-terracotta"
          >
            Promotion
          </Link>
          <Link
            href="/calendrier"
            className="text-encre-douce transition-colors hover:text-terracotta"
          >
            Calendrier
          </Link>
          <Link
            href="/membres"
            className="text-encre-douce transition-colors hover:text-terracotta"
          >
            Membres
          </Link>
          <AuthNavLink />
        </div>
      </div>
    </nav>
  );
}
