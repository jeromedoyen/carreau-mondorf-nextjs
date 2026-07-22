import Link from 'next/link';

export default function Home() {
  return (
    <main className="mx-auto flex max-w-[1080px] flex-1 flex-col items-center justify-center gap-6 px-5 py-8 text-center">
      <div>
        <h1 className="text-3xl">Carreau Mondorf — Compétition</h1>
        <p className="mt-2 text-[var(--gris-txt)]">
          Prototype de reconstruction en Next.js — National D2 &amp; Promotion.
        </p>
      </div>
      <div className="flex gap-3">
        <Link
          href="/national-d2"
          className="rounded-[30px] bg-[var(--bleu)] px-5 py-2.5 text-[13.5px] font-medium text-white"
        >
          National D2
        </Link>
      </div>
    </main>
  );
}
