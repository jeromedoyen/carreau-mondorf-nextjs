'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { traiterDeclarationVocale } from '@/lib/actions/declarationVocale';

type Etat = 'verification' | 'refuse' | 'pret' | 'enregistrement' | 'envoi' | 'termine';

const DUREE_MAX_SECONDES = 90;

/** Déclaration d'un concours au vocal + selfie d'équipe, depuis le
 *  téléphone (idée Jérôme du 03/08/2026). Alternative au formulaire de
 *  saisie : même résultat en base, mais utilisable au bord du terrain.
 *
 *  Le traitement (transcription, extraction, rapprochement des noms) se
 *  fait côté serveur et peut prendre plusieurs dizaines de secondes — le
 *  service de transcription est sur un hébergement gratuit qui se met en
 *  veille. L'écran l'annonce clairement plutôt que de laisser croire à un
 *  blocage. */
export function DeclarationVocaleForm({ saison }: { saison: string }) {
  const [etat, setEtat] = useState<Etat>('verification');
  const [monId, setMonId] = useState<number | null>(null);
  const [secondes, setSecondes] = useState(0);
  const [audio, setAudio] = useState<Blob | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const enregistreurRef = useRef<MediaRecorder | null>(null);
  const morceauxRef = useRef<Blob[]>([]);

  useEffect(() => {
    let annule = false;
    const supabase = createClient();
    supabase.rpc('est_licencie', { p_saison: saison }).then(async ({ data: licencie }) => {
      if (annule) return;
      if (!licencie) {
        setEtat('refuse');
        return;
      }
      const { data: id } = await supabase.rpc('mon_id_personne');
      if (annule) return;
      setMonId(id);
      setEtat('pret');
    });
    return () => {
      annule = true;
    };
  }, [saison]);

  // Compteur de durée + arrêt automatique : un vocal trop long fait grossir
  // l'upload et la transcription pour rien, la déclaration tient en 30 s.
  useEffect(() => {
    if (etat !== 'enregistrement') return;
    const minuteur = setInterval(() => setSecondes((s) => s + 1), 1000);
    return () => clearInterval(minuteur);
  }, [etat]);

  useEffect(() => {
    if (etat === 'enregistrement' && secondes >= DUREE_MAX_SECONDES) arreterEnregistrement();
  }, [etat, secondes]);

  async function demarrerEnregistrement() {
    setErreur(null);
    try {
      const flux = await navigator.mediaDevices.getUserMedia({ audio: true });
      const enregistreur = new MediaRecorder(flux);
      morceauxRef.current = [];
      enregistreur.ondataavailable = (e) => {
        if (e.data.size > 0) morceauxRef.current.push(e.data);
      };
      enregistreur.onstop = () => {
        setAudio(new Blob(morceauxRef.current, { type: enregistreur.mimeType || 'audio/webm' }));
        flux.getTracks().forEach((piste) => piste.stop());
      };
      enregistreur.start();
      enregistreurRef.current = enregistreur;
      setSecondes(0);
      setAudio(null);
      setEtat('enregistrement');
    } catch {
      setErreur(
        "Impossible d'accéder au micro. Autorise le microphone pour ce site dans les réglages de ton navigateur, puis réessaie."
      );
    }
  }

  function arreterEnregistrement() {
    enregistreurRef.current?.stop();
    enregistreurRef.current = null;
    setEtat('pret');
  }

  async function envoyer() {
    if (!audio || !monId) return;
    setErreur(null);
    setEtat('envoi');

    const supabase = createClient();
    const base = `concours/${monId}/${Date.now()}`;

    // Le chemin doit commencer par concours/<mon id>/ : c'est ce que la
    // policy RLS du bucket vérifie (migration 0053).
    const cheminAudio = `${base}-vocal.webm`;
    const { error: errAudio } = await supabase.storage
      .from('photos-concours')
      .upload(cheminAudio, audio, { contentType: audio.type || 'audio/webm' });
    if (errAudio) {
      setEtat('pret');
      setErreur(`Échec de l'envoi du vocal : ${errAudio.message}`);
      return;
    }

    let cheminPhoto: string | null = null;
    if (photo) {
      const extension = photo.name.split('.').pop() || 'jpg';
      cheminPhoto = `${base}-equipe.${extension}`;
      const { error: errPhoto } = await supabase.storage
        .from('photos-concours')
        .upload(cheminPhoto, photo, { contentType: photo.type });
      if (errPhoto) {
        setEtat('pret');
        setErreur(`Échec de l'envoi de la photo : ${errPhoto.message}`);
        return;
      }
    }

    const resultat = await traiterDeclarationVocale({ saison, audioChemin: cheminAudio, photoChemin: cheminPhoto });
    if (!resultat.ok) {
      setEtat('pret');
      setErreur(resultat.error);
      return;
    }

    setMessage(
      resultat.statut === 'enregistre'
        ? `C'est enregistré : ${resultat.resume}. Ta participation apparaît ci-dessous, la trésorerie prend le relais.`
        : `J'ai bien reçu ta déclaration (${resultat.resume}), mais il me manque une précision — je viens de t'envoyer un e-mail, réponds-y simplement.`
    );
    setAudio(null);
    setPhoto(null);
    setEtat('termine');
  }

  if (etat === 'verification') {
    return (
      <div className="rounded-2xl border border-ligne bg-sable-carte p-6 text-[13.5px] text-encre-douce">Chargement…</div>
    );
  }

  if (etat === 'refuse') {
    return (
      <div className="rounded-2xl border border-ligne bg-sable-carte p-6 text-center text-[13.5px] text-encre-douce">
        La déclaration de concours est réservée aux licenciés.
      </div>
    );
  }

  if (etat === 'termine') {
    return (
      <div className="flex flex-col gap-4 rounded-2xl border border-ligne bg-sable-carte p-6">
        <p className="text-[13.5px] text-encre-douce">{message}</p>
        <button
          type="button"
          onClick={() => {
            setMessage(null);
            setEtat('pret');
          }}
          className="self-start rounded-xl bg-terracotta px-4 py-2 text-[13px] text-white"
        >
          Déclarer un autre concours
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 rounded-2xl border border-ligne bg-sable-carte p-6">
      <div>
        <h2 className="font-display mb-2 text-xl italic">Déclarer au vocal</h2>
        <p className="text-[13px] text-encre-douce">
          Enregistre-toi en précisant que tu déclares <strong>en tant que chef d&apos;équipe</strong>, puis&nbsp;: la
          ville du concours, le nom de tes partenaires, et le montant d&apos;inscription payé par l&apos;équipe
          (dis si le repas est compris).
        </p>
        <p className="mt-2 rounded-xl bg-sable p-3 text-[12.5px] italic text-encre-douce">
          « Je déclare pour mon équipe, on est au concours de Differdange, je suis avec Paul Martin et Jean-Marie
          Weber, on a payé 30 euros d&apos;inscription, repas compris. »
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {etat === 'enregistrement' ? (
          <button
            type="button"
            onClick={arreterEnregistrement}
            className="flex items-center justify-center gap-2 rounded-xl bg-terracotta px-4 py-3 text-[14px] text-white"
          >
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-white" />
            Arrêter l&apos;enregistrement ({secondes}s)
          </button>
        ) : (
          <button
            type="button"
            onClick={demarrerEnregistrement}
            disabled={etat === 'envoi'}
            className="rounded-xl border border-ligne bg-sable px-4 py-3 text-[14px] disabled:opacity-50"
          >
            {audio ? 'Réenregistrer le vocal' : 'Enregistrer mon vocal'}
          </button>
        )}
        {audio && etat !== 'enregistrement' && (
          <p className="text-[12.5px] text-encre-douce">Vocal enregistré ({secondes}s) — prêt à envoyer.</p>
        )}
      </div>

      <label className="flex flex-col gap-2">
        <span className="text-[13px]">Photo de l&apos;équipe (facultatif)</span>
        <input
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
          disabled={etat === 'envoi'}
          className="text-[12.5px] text-encre-douce"
        />
      </label>

      {erreur && <p className="text-[13px] text-terracotta">{erreur}</p>}

      <button
        type="button"
        onClick={envoyer}
        disabled={!audio || etat === 'envoi' || etat === 'enregistrement'}
        className="rounded-xl bg-terracotta px-4 py-3 text-[14px] text-white disabled:opacity-50"
      >
        {etat === 'envoi' ? 'Traitement en cours…' : 'Envoyer ma déclaration'}
      </button>
      {etat === 'envoi' && (
        <p className="text-[12.5px] text-encre-douce">
          Transcription et analyse en cours — cela peut prendre jusqu&apos;à une minute la première fois de la
          journée. Ne ferme pas cette page.
        </p>
      )}
    </div>
  );
}
