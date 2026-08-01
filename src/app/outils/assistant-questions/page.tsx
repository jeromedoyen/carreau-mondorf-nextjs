import type { Metadata } from 'next';
import Link from 'next/link';
import { estMembreCA } from '@/lib/membres';
import { getQuestionsAssistant } from '@/lib/assistantQuestions';
import { ListeQuestionsAssistant } from '@/components/ListeQuestionsAssistant';

export const metadata: Metadata = { title: 'Questions posées à Caro' };

export default async function AssistantQuestionsPage() {
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

  const questions = await getQuestionsAssistant();

  return (
    <main className="mx-auto max-w-3xl px-5 py-12">
      <header className="entree mb-8">
        <p className="font-score text-[13px] tracking-[0.2em] text-terracotta">OUTILS · COMITÉ</p>
        <h1 className="font-display mt-1 text-4xl italic">Questions posées à Caro</h1>
        <p className="mt-3 max-w-lg text-[13.5px] text-encre-douce">
          Diagnostic d&apos;usage : ce que les licenciés demandent à l&apos;assistant, dans l&apos;ordre le plus
          récent — utile pour repérer où l&apos;application n&apos;est pas assez claire par elle-même.
        </p>
      </header>

      <ListeQuestionsAssistant questions={questions} />
    </main>
  );
}
