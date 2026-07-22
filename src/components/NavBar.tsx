import Link from 'next/link';

export function NavBar() {
  return (
    <nav className="border-b border-[var(--ligne)] bg-[var(--carte)]">
      <div className="mx-auto flex max-w-[1080px] items-center gap-5 px-5 py-3 text-[13px]">
        <Link href="/" className="font-semibold">
          Carreau Mondorf
        </Link>
        <Link href="/national-d2" className="text-[var(--gris-txt)] hover:text-[var(--encre)]">
          National D2
        </Link>
        <Link href="/promotion" className="text-[var(--gris-txt)] hover:text-[var(--encre)]">
          Promotion
        </Link>
      </div>
    </nav>
  );
}
