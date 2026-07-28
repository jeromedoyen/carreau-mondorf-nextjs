'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, Download } from 'lucide-react';
import { supprimerQuestionAssistant } from '@/lib/actions/assistant';
import type { QuestionAssistant } from '@/lib/assistantQuestions';

function formaterDate(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

/** Export "meilleur format exploitable" (28/07/2026, demande Jérôme,
 *  destiné à être retransmis pour analyse) — JSON structuré plutôt qu'un
 *  CSV/PDF : facile à relire, pas d'ambiguïté d'échappement. Ne reprend
 *  jamais l'identité de la personne (email exclu), seulement la question
 *  et sa date — l'analyse porte sur CE qui est demandé, pas sur QUI. */
function exporterJson(questions: QuestionAssistant[]) {
  const contenu = JSON.stringify(
    questions.map((q) => ({ question: q.question, date: q.creeLe })),
    null,
    2
  );
  const blob = new Blob([contenu], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `questions-caro-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function ListeQuestionsAssistant({ questions }: { questions: QuestionAssistant[] }) {
  const router = useRouter();
  const [enCours, setEnCours] = useState<number | null>(null);

  async function supprimer(id: number) {
    if (!window.confirm('Supprimer cette question de la liste ?')) return;
    setEnCours(id);
    await supprimerQuestionAssistant(id);
    setEnCours(null);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={() => exporterJson(questions)}
        disabled={questions.length === 0}
        className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-ligne bg-sable-carte px-3 py-2 text-[12.5px] font-medium text-encre transition-colors hover:border-terracotta hover:text-terracotta disabled:opacity-40"
      >
        <Download size={14} />
        Exporter (JSON, sans identité)
      </button>

      {questions.length === 0 ? (
        <p className="text-[13.5px] text-encre-douce">Aucune question posée pour l&apos;instant.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {questions.map((q) => (
            <div key={q.id} className="flex items-start justify-between gap-3 rounded-xl border border-ligne bg-sable-carte p-4">
              <div>
                <p className="text-[13.5px] text-encre">{q.question}</p>
                <p className="mt-1.5 text-[11px] text-encre-douce">
                  {q.email} · {formaterDate(q.creeLe)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => supprimer(q.id)}
                disabled={enCours === q.id}
                aria-label="Supprimer"
                className="flex-shrink-0 text-encre-douce/50 hover:text-danger disabled:opacity-40"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
