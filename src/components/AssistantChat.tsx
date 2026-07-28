'use client';

import { useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { MessageCircle, X, Send } from 'lucide-react';

/** Bulle d'aide flottante (28/07/2026, demande Jérôme) — un assistant qui
 *  n'aide qu'à UTILISER l'app (navigation, où trouver quoi), pas connecté
 *  aux données du club (cf. src/lib/assistantPrompt.ts). Rendu uniquement
 *  pour un licencié connecté (cf. AppChrome.tsx), pour limiter l'usage —
 *  et donc le coût, même minime — aux vrais membres. */
export function AssistantChat() {
  const [ouvert, setOuvert] = useState(false);
  const [saisie, setSaisie] = useState('');
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: '/api/assistant' }),
  });
  const enCours = status === 'submitted' || status === 'streaming';

  function envoyer(e: React.FormEvent) {
    e.preventDefault();
    if (!saisie.trim() || enCours) return;
    sendMessage({ text: saisie.trim() });
    setSaisie('');
  }

  return (
    <>
      {ouvert && (
        <div className="fixed bottom-[calc(84px+env(safe-area-inset-bottom))] right-4 z-40 flex h-[min(520px,70vh)] w-[min(360px,calc(100vw-32px))] flex-col overflow-hidden rounded-2xl border border-ligne bg-sable-carte shadow-[0_12px_40px_-8px_rgba(36,27,18,.35)] md:bottom-6">
          <div className="flex items-center justify-between border-b border-ligne bg-marine px-4 py-3 text-white">
            <span className="font-display text-[15px] italic">Besoin d&apos;aide ?</span>
            <button type="button" onClick={() => setOuvert(false)} aria-label="Fermer" className="opacity-80 hover:opacity-100">
              <X size={16} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3">
            {messages.length === 0 && (
              <p className="text-[12.5px] text-encre-douce">
                Pose une question sur l&apos;application — où trouver une page, comment faire telle action. Je
                n&apos;ai pas accès aux données du club (paiements, membres...), pour ça direction{' '}
                <span className="font-medium text-encre">Mon Caro</span> ou le comité.
              </p>
            )}
            <div className="flex flex-col gap-2.5">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`max-w-[85%] rounded-xl px-3 py-2 text-[12.5px] leading-snug ${
                    m.role === 'user' ? 'ml-auto bg-terracotta text-white' : 'bg-sable text-encre'
                  }`}
                >
                  {m.parts.map((part, i) =>
                    part.type === 'text' ? <span key={i}>{part.text}</span> : null
                  )}
                </div>
              ))}
              {enCours && <div className="max-w-[85%] rounded-xl bg-sable px-3 py-2 text-[12.5px] text-encre-douce">…</div>}
            </div>
          </div>

          <form onSubmit={envoyer} className="flex items-center gap-2 border-t border-ligne p-2.5">
            <input
              type="text"
              value={saisie}
              onChange={(e) => setSaisie(e.target.value)}
              placeholder="Écris ta question…"
              className="flex-1 rounded-lg border border-ligne bg-white px-3 py-2 text-[13px] text-encre outline-none focus:border-terracotta"
            />
            <button
              type="submit"
              disabled={!saisie.trim() || enCours}
              aria-label="Envoyer"
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-terracotta text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              <Send size={15} />
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOuvert((v) => !v)}
        aria-label={ouvert ? "Fermer l'assistant" : "Ouvrir l'assistant d'aide"}
        className="fixed bottom-[calc(84px+env(safe-area-inset-bottom))] right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-terracotta text-white shadow-[0_6px_18px_-4px_rgba(193,82,43,.6)] transition-transform hover:scale-105 md:bottom-6"
      >
        {ouvert ? <X size={20} /> : <MessageCircle size={20} />}
      </button>
    </>
  );
}
