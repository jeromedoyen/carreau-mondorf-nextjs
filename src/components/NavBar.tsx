import Link from 'next/link';
import { AuthNavLink } from './AuthNavLink';
import { LogoNavLink } from './LogoNavLink';
import { NavLinks } from './NavLinks';

export function NavBar() {
  return (
    <nav className="sticky top-0 z-30 border-b border-ligne/70 bg-sable/85 backdrop-blur-md print:hidden">
      <div className="relative mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-3.5">
        <LogoNavLink />
        <div className="flex shrink-0 items-center gap-4 text-[13.5px] font-medium md:gap-6">
          <Link
            href="/manifestations"
            className="text-encre-douce transition-colors hover:text-terracotta md:hidden"
          >
            Manif.
          </Link>
          <NavLinks />
          <Link href="/club" className="text-encre-douce transition-colors hover:text-terracotta">
            Le Club
          </Link>
          <Link href="/moncaro" className="text-encre-douce transition-colors hover:text-terracotta">
            Moncaro
          </Link>
          <AuthNavLink />
        </div>
      </div>
    </nav>
  );
}
