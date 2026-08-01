import type { Metadata } from 'next';
import { ConfirmerConnexionForm } from '@/components/ConfirmerConnexionForm';

export const metadata: Metadata = { title: 'Connexion' };

export default async function AuthCallbackPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md items-center justify-center px-5 py-12">
      <ConfirmerConnexionForm code={code ?? null} />
    </main>
  );
}
