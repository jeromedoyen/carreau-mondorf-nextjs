import Link from 'next/link';
import { CircleDot } from 'lucide-react';

export function NavBar() {
  return (
    <nav className="sticky top-0 z-30 border-b border-ligne/70 bg-sable/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center gap-7 px-5 py-3.5">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-pin text-sable-carte">
            <CircleDot size={17} strokeWidth={2.2} />
          </span>
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
        </div>
      </div>
    </nav>
  );
}
