'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { Mic, MicOff, Sparkles, CheckCircle2 } from 'lucide-react';

// Mêmes déclarations que AssistantChat.tsx — l'API de reconnaissance vocale
// n'a pas de types dans lib.dom.d.ts.
interface EvenementResultatVocal extends Event {
  results: { [index: number]: { [index: number]: { transcript: string } } } & { length: number };
}
interface ReconnaissanceVocale extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((ev: EvenementResultatVocal) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
}
declare global {
  interface Window {
    SpeechRecognition?: new () => ReconnaissanceVocale;
    webkitSpeechRecognition?: new () => ReconnaissanceVocale;
  }
}

function choisirVoixFrancaise(): SpeechSynthesisVoice | null {
  const voix = window.speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith('fr'));
  if (voix.length === 0) return null;
  const preferee = voix.find((v) => /google|natural|online/i.test(v.name));
  return preferee ?? voix[0];
}

function nettoyerPourLecture(texte: string): string {
  return texte.replace(/[*_`#~]+/g, '').replace(/\s+/g, ' ').trim();
}

type ResultatOutil = { trouve?: boolean; ok?: boolean; ids?: number[]; error?: string };

/** Chat vocal plein écran pour la déclaration de concours assistée par IA
 *  (pense-bête #125, 05/08/2026). Contrairement à Caro (bulle optionnelle,
 *  lecture vocale à activer manuellement), ici la voix est le mode
 *  principal : lecture automatique de chaque réponse, puis réécoute
 *  automatique une fois la lecture terminée — tour de parole enchaîné,
 *  pas besoin de re-cliquer le micro à chaque échange. La saisie texte
 *  reste toujours disponible en repli (navigateur sans micro, environnement
 *  bruyant, préférence personnelle). */
export function ConcoursIaChat() {
  const [saisie, setSaisie] = useState('');
  const [enEcoute, setEnEcoute] = useState(false);
  const [micDisponible, setMicDisponible] = useState(false);
  const [termine, setTermine] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const reconnaissanceRef = useRef<ReconnaissanceVocale | null>(null);
  const dernierMessageLuRef = useRef<string | null>(null);
  const voixRef = useRef<SpeechSynthesisVoice | null>(null);
  const zoneMessagesRef = useRef<HTMLDivElement>(null);
  // React (Strict Mode, dev) invoque les effets deux fois au montage — sans
  // ce garde, le message d'accueil partait deux fois en double, laissant
  // useChat bloqué dans un état "streaming" qui ne revenait jamais à
  // "ready" et gelait le bouton Envoyer (bug constaté en test, 05/08/2026).
  const accueilDejaEnvoye = useRef(false);

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: '/api/concours-ia' }),
    onError: (err) => setErreur(err.message || "Une erreur s'est produite, réessaie dans un instant."),
  });
  const enCours = status === 'submitted' || status === 'streaming';

  useEffect(() => {
    setMicDisponible(!!(window.SpeechRecognition || window.webkitSpeechRecognition));
    const rafraichirVoix = () => {
      voixRef.current = choisirVoixFrancaise();
    };
    rafraichirVoix();
    window.speechSynthesis.addEventListener('voiceschanged', rafraichirVoix);
    // Premier message d'accueil, une seule fois — voir accueilDejaEnvoye plus haut.
    if (!accueilDejaEnvoye.current) {
      accueilDejaEnvoye.current = true;
      sendMessage({ text: 'Bonjour, je veux déclarer ma participation à un concours.' });
    }
    return () => window.speechSynthesis.removeEventListener('voiceschanged', rafraichirVoix);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    zoneMessagesRef.current?.scrollTo({ top: zoneMessagesRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  function demarrerEcoute() {
    const Constructeur = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Constructeur) return;
    const reco = new Constructeur();
    reco.lang = 'fr-FR';
    reco.continuous = false;
    reco.interimResults = false;
    reco.onresult = (ev) => {
      const transcript = ev.results[0]?.[0]?.transcript;
      if (transcript?.trim()) {
        setErreur(null);
        sendMessage({ text: transcript.trim() });
      }
    };
    reco.onerror = () => setEnEcoute(false);
    reco.onend = () => setEnEcoute(false);
    reconnaissanceRef.current = reco;
    reco.start();
    setEnEcoute(true);
  }

  function basculerEcoute() {
    if (enEcoute) {
      reconnaissanceRef.current?.stop();
      return;
    }
    demarrerEcoute();
  }

  // Lecture vocale de chaque réponse, puis ré-écoute automatique une fois
  // la synthèse terminée — c'est ce qui fait "tour de parole" plutôt qu'un
  // chat classique où il faut recliquer le micro à chaque fois.
  useEffect(() => {
    if (status !== 'ready') return;
    const dernier = messages[messages.length - 1];
    if (!dernier || dernier.role !== 'assistant' || dernier.id === dernierMessageLuRef.current) return;

    const enregistrementReussi = dernier.parts.some(
      (p) => p.type === 'tool-enregistrerDeclaration' && 'output' in p && (p.output as ResultatOutil)?.ok
    );
    if (enregistrementReussi) setTermine(true);

    const texte = nettoyerPourLecture(dernier.parts.map((p) => (p.type === 'text' ? p.text : '')).join(' '));
    if (!texte) return;
    dernierMessageLuRef.current = dernier.id;

    const utterance = new SpeechSynthesisUtterance(texte);
    utterance.lang = 'fr-FR';
    utterance.pitch = 1.05;
    utterance.rate = 1;
    if (voixRef.current) utterance.voice = voixRef.current;
    utterance.onend = () => {
      if (micDisponible && !enregistrementReussi) demarrerEcoute();
    };
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, messages, micDisponible]);

  function envoyer(e: React.FormEvent) {
    e.preventDefault();
    if (!saisie.trim() || enCours) return;
    setErreur(null);
    window.speechSynthesis.cancel();
    sendMessage({ text: saisie.trim() });
    setSaisie('');
  }

  return (
    <div className="mx-auto flex max-w-xl flex-1 flex-col px-5 py-8">
      <header className="mb-6 flex items-center gap-3">
        <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-marine/10 text-marine">
          <Sparkles size={18} />
        </span>
        <div>
          <p className="font-score text-[12px] tracking-[0.2em] text-marine">DÉCLARATION ASSISTÉE</p>
          <h1 className="font-display text-2xl italic">Parle-moi de ton concours</h1>
        </div>
      </header>

      <div ref={zoneMessagesRef} className="mb-4 flex-1 space-y-2.5 overflow-y-auto">
        {messages
          .filter((m) => m.role === 'user' || m.parts.some((p) => p.type === 'text'))
          .map((m) => (
            <div
              key={m.id}
              className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-[13.5px] leading-snug ${
                m.role === 'user' ? 'ml-auto bg-terracotta text-white' : 'bg-sable-carte text-encre border border-ligne'
              }`}
            >
              {m.parts.map((part, i) => (part.type === 'text' ? <span key={i}>{part.text}</span> : null))}
            </div>
          ))}
        {enCours && (
          <div className="max-w-[85%] rounded-xl border border-ligne bg-sable-carte px-3.5 py-2.5 text-[13.5px] text-encre-douce">
            …
          </div>
        )}
        {erreur && (
          <div className="max-w-[90%] rounded-xl border border-danger/30 bg-danger/10 px-3.5 py-2.5 text-[13px] text-danger">
            {erreur}
          </div>
        )}
      </div>

      {termine ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-ligne bg-sable-carte p-6 text-center">
          <CheckCircle2 size={28} className="text-succes" />
          <p className="text-[13.5px] text-encre">C&apos;est enregistré, merci !</p>
          <Link
            href="/concours"
            className="rounded-lg bg-terracotta px-4 py-2 text-[13px] text-white transition-opacity hover:opacity-90"
          >
            Retour à mes concours
          </Link>
        </div>
      ) : (
        <form onSubmit={envoyer} className="flex items-center gap-2 border-t border-ligne pt-3">
          {micDisponible && (
            <button
              type="button"
              onClick={basculerEcoute}
              aria-label={enEcoute ? "Arrêter l'écoute" : 'Parler'}
              aria-pressed={enEcoute}
              className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full border transition-colors ${
                enEcoute
                  ? 'border-danger bg-danger/10 text-danger animate-pulse'
                  : 'border-marine/40 bg-marine/10 text-marine hover:bg-marine/15'
              }`}
            >
              {enEcoute ? <MicOff size={18} /> : <Mic size={18} />}
            </button>
          )}
          <input
            type="text"
            value={saisie}
            onChange={(e) => setSaisie(e.target.value)}
            placeholder={enEcoute ? 'Je t’écoute…' : 'Ou écris ta réponse…'}
            className="min-w-0 flex-1 rounded-lg border border-ligne bg-sable-carte px-3 py-2.5 text-[13.5px] text-encre outline-none focus:border-terracotta"
          />
          <button
            type="submit"
            disabled={!saisie.trim() || enCours}
            className="flex-shrink-0 rounded-lg bg-terracotta px-4 py-2.5 text-[13px] text-white transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            Envoyer
          </button>
        </form>
      )}
    </div>
  );
}
