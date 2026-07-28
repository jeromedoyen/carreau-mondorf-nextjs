import { createClient } from './supabase/server';

export type QuestionAssistant = {
  id: number;
  email: string;
  question: string;
  creeLe: string;
};

/** Journal des questions posées à Caro (28/07/2026) — diagnostic UX pour
 *  le CA : repérer où les licenciés se perdent réellement dans l'app,
 *  pas juste leur donner une aide. RLS ("lecture CA uniquement",
 *  migration 0040) filtre déjà côté base ; pas de garde applicative
 *  supplémentaire nécessaire ici. */
export async function getQuestionsAssistant(limite = 200): Promise<QuestionAssistant[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('assistant_questions')
    .select('id, email, question, cree_le')
    .order('cree_le', { ascending: false })
    .limit(limite);
  if (error) throw error;
  return (data ?? []).map((q) => ({ id: q.id, email: q.email, question: q.question, creeLe: q.cree_le }));
}
