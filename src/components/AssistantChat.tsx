'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import {
  MessageCircle,
  X,
  Send,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  GripHorizontal,
  Sun,
  Cloud,
  CloudRain,
  CloudSnow,
  CloudLightning,
  CloudFog,
  Droplets,
} from 'lucide-react';
import { obtenirAccueilAssistant, type AccueilAssistant } from '@/lib/actions/assistant';
import type { Meteo } from '@/lib/meteo';

// L'API de reconnaissance vocale n'a pas de types dans lib.dom.d.ts — on ne
// déclare que ce dont on se sert réellement (28/07/2026, demande Jérôme :
// saisie vocale des questions).
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

const LARGEUR_PANNEAU = 360;
const HAUTEUR_PANNEAU_MAX = 520;
const MARGE = 12;

const ICONES_METEO: Record<Meteo['icone'], typeof Sun> = {
  soleil: Sun,
  nuage: Cloud,
  pluie: CloudRain,
  neige: CloudSnow,
  orage: CloudLightning,
  brouillard: CloudFog,
};

function CarteMeteo({ meteo }: { meteo: Meteo }) {
  const Icone = ICONES_METEO[meteo.icone];
  return (
    <div className="flex items-center gap-3 rounded-xl border border-ligne bg-white px-3 py-2.5">
      <Icone size={26} className="flex-shrink-0 text-terracotta" />
      <div className="text-[12px] leading-snug">
        <div className="font-medium text-encre">
          {meteo.libelle} · {meteo.temperature}°C
        </div>
        <div className="flex items-center gap-2.5 text-encre-douce">
          <span>
            {meteo.temperatureMin}° / {meteo.temperatureMax}°
          </span>
          <span className="flex items-center gap-1">
            <Droplets size={11} /> {meteo.probabilitePluie}%
          </span>
        </div>
      </div>
    </div>
  );
}

/** Découpe un texte contenant des liens Markdown `[label](/route)` (voir
 *  le prompt système, assistantPrompt.ts) en fragments texte + liens
 *  cliquables — pas de librairie Markdown complète, on n'a besoin que de
 *  ce seul motif. */
function rendreTexteAvecLiens(texte: string, cleBase: string) {
  const regex = /\[([^\]]+)\]\((\/[^\s)]*)\)/g;
  const morceaux: React.ReactNode[] = [];
  let dernierIndex = 0;
  let match: RegExpExecArray | null;
  let i = 0;
  while ((match = regex.exec(texte)) !== null) {
    if (match.index > dernierIndex) morceaux.push(texte.slice(dernierIndex, match.index));
    morceaux.push(
      <Link key={`${cleBase}-lien-${i++}`} href={match[2]} className="font-medium text-terracotta underline underline-offset-2 hover:opacity-80">
        {match[1]}
      </Link>
    );
    dernierIndex = match.index + match[0].length;
  }
  if (dernierIndex < texte.length) morceaux.push(texte.slice(dernierIndex));
  return morceaux;
}

/** Choisit la voix française la plus "naturelle" disponible dans le
 *  navigateur (28/07/2026, retour Jérôme : la voix par défaut est trop
 *  robotique) — les voix "Google français"/"Natural" sonnent nettement
 *  mieux que la voix système basique quand elles existent, sinon on garde
 *  la première voix fr-FR trouvée. */
function choisirVoixFrancaise(): SpeechSynthesisVoice | null {
  const voix = window.speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith('fr'));
  if (voix.length === 0) return null;
  const preferee = voix.find((v) => /google|natural|online/i.test(v.name));
  return preferee ?? voix[0];
}

/** Bulle d'aide flottante "Caro" (28/07/2026, demande Jérôme) — un
 *  assistant qui n'aide qu'à UTILISER l'app (navigation, où trouver
 *  quoi) et donne la météo du jour, pas connecté aux données du club (cf.
 *  src/lib/assistantPrompt.ts). Rendu uniquement pour un licencié connecté
 *  (cf. AppChrome.tsx). Déplaçable (glisser le titre), avec saisie et
 *  lecture vocale — toutes deux via les API navigateur natives (Web
 *  Speech), gratuites, pas de service tiers. */
export function AssistantChat() {
  const [ouvert, setOuvert] = useState(false);
  const [saisie, setSaisie] = useState('');
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [enEcoute, setEnEcoute] = useState(false);
  const [lectureVocale, setLectureVocale] = useState(false);
  const [micDisponible, setMicDisponible] = useState(false);
  const [accueil, setAccueil] = useState<AccueilAssistant | null>(null);

  const panneauRef = useRef<HTMLDivElement>(null);
  const glisseRef = useRef<{ decalageX: number; decalageY: number } | null>(null);
  const reconnaissanceRef = useRef<ReconnaissanceVocale | null>(null);
  const dernierMessageLuRef = useRef<string | null>(null);
  const voixRef = useRef<SpeechSynthesisVoice | null>(null);
  const accueilDejaCharge = useRef(false);

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: '/api/assistant' }),
  });
  const enCours = status === 'submitted' || status === 'streaming';

  useEffect(() => {
    setMicDisponible(!!(window.SpeechRecognition || window.webkitSpeechRecognition));
    const rafraichirVoix = () => {
      voixRef.current = choisirVoixFrancaise();
    };
    rafraichirVoix();
    window.speechSynthesis.addEventListener('voiceschanged', rafraichirVoix);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', rafraichirVoix);
  }, []);

  // Carte d'accueil (salutation + météo), une seule fois à la première
  // ouverture — pas un message du chat, pas d'appel au modèle.
  useEffect(() => {
    if (!ouvert || accueilDejaCharge.current) return;
    accueilDejaCharge.current = true;
    obtenirAccueilAssistant().then(setAccueil).catch(() => {});
  }, [ouvert]);

  // Lecture vocale de la dernière réponse une fois complète (28/07/2026).
  useEffect(() => {
    if (!lectureVocale || status !== 'ready') return;
    const dernier = messages[messages.length - 1];
    if (!dernier || dernier.role !== 'assistant' || dernier.id === dernierMessageLuRef.current) return;
    const texte = dernier.parts
      .map((p) => (p.type === 'text' ? p.text : ''))
      .join(' ')
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      .trim();
    if (!texte) return;
    dernierMessageLuRef.current = dernier.id;
    const utterance = new SpeechSynthesisUtterance(texte);
    utterance.lang = 'fr-FR';
    utterance.pitch = 1.05;
    utterance.rate = 1;
    if (voixRef.current) utterance.voice = voixRef.current;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }, [status, messages, lectureVocale]);

  function envoyer(e: React.FormEvent) {
    e.preventDefault();
    if (!saisie.trim() || enCours) return;
    sendMessage({ text: saisie.trim() });
    setSaisie('');
  }

  function basculerEcoute() {
    if (enEcoute) {
      reconnaissanceRef.current?.stop();
      return;
    }
    const Constructeur = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Constructeur) return;
    const reco = new Constructeur();
    reco.lang = 'fr-FR';
    reco.continuous = false;
    reco.interimResults = false;
    reco.onresult = (ev) => {
      const transcript = ev.results[0]?.[0]?.transcript;
      if (transcript) setSaisie((s) => (s ? `${s} ${transcript}` : transcript));
    };
    reco.onerror = () => setEnEcoute(false);
    reco.onend = () => setEnEcoute(false);
    reconnaissanceRef.current = reco;
    reco.start();
    setEnEcoute(true);
  }

  function basculerLecture() {
    if (lectureVocale) window.speechSynthesis.cancel();
    setLectureVocale((v) => !v);
  }

  function demarrerGlisse(e: React.PointerEvent) {
    const panneau = panneauRef.current;
    if (!panneau) return;
    const rect = panneau.getBoundingClientRect();
    glisseRef.current = { decalageX: e.clientX - rect.left, decalageY: e.clientY - rect.top };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }
  function pendantGlisse(e: React.PointerEvent) {
    if (!glisseRef.current) return;
    const largeur = panneauRef.current?.offsetWidth ?? LARGEUR_PANNEAU;
    const hauteur = panneauRef.current?.offsetHeight ?? HAUTEUR_PANNEAU_MAX;
    const x = Math.min(Math.max(e.clientX - glisseRef.current.decalageX, MARGE), window.innerWidth - largeur - MARGE);
    const y = Math.min(Math.max(e.clientY - glisseRef.current.decalageY, MARGE), window.innerHeight - hauteur - MARGE);
    setPosition({ x, y });
  }
  function finGlisse() {
    glisseRef.current = null;
  }

  const stylePosition = position ? { left: position.x, top: position.y, right: 'auto', bottom: 'auto' } : undefined;

  return (
    <>
      {ouvert && (
        <div
          ref={panneauRef}
          style={stylePosition}
          className={`fixed z-40 flex h-[min(520px,70vh)] w-[min(360px,calc(100vw-24px))] flex-col overflow-hidden rounded-2xl border border-ligne bg-sable-carte shadow-[0_12px_40px_-8px_rgba(36,27,18,.35)] ${
            !position ? 'bottom-[calc(84px+env(safe-area-inset-bottom))] right-4 md:bottom-6' : ''
          }`}
        >
          <div
            onPointerDown={demarrerGlisse}
            onPointerMove={pendantGlisse}
            onPointerUp={finGlisse}
            className="flex cursor-grab items-center justify-between border-b border-ligne bg-marine px-4 py-3 text-white active:cursor-grabbing"
          >
            <span className="flex items-center gap-2 font-display text-[15px] italic">
              <GripHorizontal size={14} className="opacity-60" />
              <Image src="/logo.png" alt="" width={22} height={22} className="rounded-full bg-white/90 object-contain p-0.5" />
              Caro
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={basculerLecture}
                aria-label={lectureVocale ? 'Désactiver la lecture vocale' : 'Activer la lecture vocale'}
                aria-pressed={lectureVocale}
                className={lectureVocale ? 'text-white' : 'text-white/60 hover:text-white'}
              >
                {lectureVocale ? <Volume2 size={16} /> : <VolumeX size={16} />}
              </button>
              <button type="button" onClick={() => setOuvert(false)} aria-label="Fermer" className="text-white/80 hover:text-white">
                <X size={16} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3">
            {messages.length === 0 && (
              <div className="flex flex-col gap-3">
                <p className="text-[13px] text-encre">
                  {accueil?.salutation ?? 'Bonjour'}
                  {accueil?.prenom ? ` ${accueil.prenom}` : ''} !
                </p>
                {accueil?.meteo && <CarteMeteo meteo={accueil.meteo} />}
                <p className="text-[12.5px] text-encre-douce">
                  Pose-moi une question sur l&apos;application — où trouver une page, comment faire telle action.
                  Je n&apos;ai pas accès aux données du club (paiements, membres...), pour ça direction{' '}
                  <span className="font-medium text-encre">Mon Caro</span> ou le comité.
                </p>
              </div>
            )}
            <div className="flex flex-col gap-2.5">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`max-w-[85%] rounded-xl px-3 py-2 text-[12.5px] leading-snug ${
                    m.role === 'user' ? 'ml-auto bg-terracotta text-white' : 'bg-sable text-encre'
                  }`}
                >
                  {m.parts.map((part, i) => {
                    if (part.type === 'text') return <span key={i}>{rendreTexteAvecLiens(part.text, m.id)}</span>;
                    if (part.type === 'tool-meteo' && 'output' in part && part.output) {
                      return (
                        <div key={i} className="mt-1">
                          <CarteMeteo meteo={part.output as Meteo} />
                        </div>
                      );
                    }
                    return null;
                  })}
                </div>
              ))}
              {enCours && <div className="max-w-[85%] rounded-xl bg-sable px-3 py-2 text-[12.5px] text-encre-douce">…</div>}
            </div>
          </div>

          <form onSubmit={envoyer} className="flex items-center gap-2 border-t border-ligne p-2.5">
            {micDisponible && (
              <button
                type="button"
                onClick={basculerEcoute}
                aria-label={enEcoute ? "Arrêter l'écoute" : 'Dicter ma question'}
                aria-pressed={enEcoute}
                className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border transition-colors ${
                  enEcoute ? 'border-danger bg-danger/10 text-danger' : 'border-ligne bg-white text-encre-douce hover:text-terracotta'
                }`}
              >
                {enEcoute ? <MicOff size={15} /> : <Mic size={15} />}
              </button>
            )}
            <input
              type="text"
              value={saisie}
              onChange={(e) => setSaisie(e.target.value)}
              placeholder={enEcoute ? 'Je t’écoute…' : 'Écris ta question…'}
              className="min-w-0 flex-1 rounded-lg border border-ligne bg-white px-3 py-2 text-[13px] text-encre outline-none focus:border-terracotta"
            />
            <button
              type="submit"
              disabled={!saisie.trim() || enCours}
              aria-label="Envoyer"
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-terracotta text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              <Send size={15} />
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOuvert((v) => !v)}
        aria-label={ouvert ? 'Fermer Caro' : 'Ouvrir Caro, l’assistant d’aide'}
        className="fixed bottom-[calc(84px+env(safe-area-inset-bottom))] right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-terracotta text-white shadow-[0_6px_18px_-4px_rgba(193,82,43,.6)] transition-transform hover:scale-105 md:bottom-6"
      >
        {ouvert ? <X size={20} /> : <MessageCircle size={20} />}
      </button>
    </>
  );
}
