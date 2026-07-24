import Link from 'next/link';
import Image from 'next/image';
import { AuthNavLink } from './AuthNavLink';
import { NavLinks } from './NavLinks';

export function NavBar() {
  return (
    <nav className="sticky top-0 z-30 border-b border-ligne/70 bg-sable/85 backdrop-blur-md">
      <div className="relative mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-3.5">
        <Link href="/" className="flex min-w-0 items-center gap-2.5">
          <Image
            src="/logo.png"
            alt="Carreau Mondorf"
            width={500}
            height={261}
            priority
            className="h-[34px] w-auto shrink-0"
          />
          <span className="font-display truncate text-[17px] font-semibold tracking-tight">
            Carreau Mondorf
          </span>
        </Link>
        <div className="flex shrink-0 items-center gap-6 text-[13.5px] font-medium">
          <NavLinks />
          <AuthNavLink />
        </div>
      </div>
    </nav>
  );
}
