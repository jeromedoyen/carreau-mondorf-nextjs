'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { pdf } from '@react-pdf/renderer';
import { ArrowRight, ListChecks, ExternalLink, CheckCircle2, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { creerEtSignerProtocole, verifierEtFinaliserProtocole } from '@/lib/actions/protocoleManifestation';
import { reveillerDocumenso } from '@/lib/reveillerDocumenso';
import { ProtocoleManifestationPdf } from './ProtocoleManifestationPdf';

const AUJOURDHUI = new Date().toISOString().slice(0, 10);
const INTERVALLE_SONDAGE_MS = 5000;

type Etape =
  | { nom: 'formulaire' }
  | { nom: 'attente'; demandeSignatureId: number; urlSignature: string }
  | { nom: 'email-envoye' }
  | { nom: 'signe' };

/** Formulaire "Demande d'organisation de manifestation" (04/08/2026) —
 *  remplace la fiche papier "Protocole Manifestation". Flux validé avec
 *  Jérôme : le demandeur est son propre et unique signataire — à la
 *  validation, le PDF se génère, s'uploade, et Documenso s'ouvre dans un
 *  **nouvel onglet** (retour Jérôme, 04/08/2026 : rediriger l'onglet
 *  courant faisait perdre le fil, l'utilisateur ne revenait jamais sur
 *  l'app). L'onglet d'origine affiche un écran d'attente qui sonde
 *  automatiquement le statut (verifierEtFinaliserProtocole) — dès que la
 *  signature est détectée, le document est archivé et le CA notifié par
 *  e-mail (PDF signé en pièce jointe), sans action CA nécessaire. */
export function FormulaireProtocoleManifestation({ monNom }: { monNom: string | null }) {
  const router = useRouter();
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [etape, setEtape] = useState<Etape>({ nom: 'formulaire' });
  const sondageActif = useRef(false);

  useEffect(() => {
    if (etape.nom !== 'attente') return;
    const { demandeSignatureId } = etape;

    async function sonder() {
      if (sondageActif.current) return;
      sondageActif.current = true;
      try {
        const resultat = await verifierEtFinaliserProtocole(demandeSignatureId);
        if (resultat.ok && resultat.signe) setEtape({ nom: 'signe' });
      } finally {
        sondageActif.current = false;
      }
    }

    sonder();
    const intervalle = setInterval(sonder, INTERVALLE_SONDAGE_MS);
    return () => clearInterval(intervalle);
  }, [etape]);

  async function soumettre(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErreur(null);
    setEnCours(true);
    reveillerDocumenso();

    const fd = new FormData(e.currentTarget);
    const donnees = {
      dateDemande: AUJOURDHUI,
      nomPrestation: String(fd.get('nomPrestation') || '').trim(),
      datePrestation: String(fd.get('datePrestation') || ''),
      responsables: String(fd.get('responsables') || '').trim(),
      deroulement: String(fd.get('deroulement') || '').trim(),
      animations: String(fd.get('animations') || '').trim(),
      personnesAidantes: String(fd.get('personnesAidantes') || '').trim(),
    };

    if (!donnees.nomPrestation || !donnees.datePrestation || !donnees.responsables || !donnees.deroulement) {
      setErreur('Merci de compléter les champs obligatoires.');
      setEnCours(false);
      return;
    }

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setErreur('Session expirée, reconnecte-toi.');
        setEnCours(false);
        return;
      }

      const blob = await pdf(<ProtocoleManifestationPdf donnees={donnees} />).toBlob();
      const chemin = `${user.id}/${Date.now()}-protocole.pdf`;
      const { error: errUpload } = await supabase.storage.from('documents-protocole').upload(chemin, blob, {
        contentType: 'application/pdf',
      });
      if (errUpload) {
        setErreur(`Échec de la génération du document : ${errUpload.message}`);
        setEnCours(false);
        return;
      }

      const resultat = await creerEtSignerProtocole({ cheminStorage: chemin, ...donnees });
      if (!resultat.ok) {
        setErreur(resultat.error);
        setEnCours(false);
        return;
      }

      if (resultat.urlSignature) {
        window.open(resultat.urlSignature, '_blank', 'noopener,noreferrer');
        setEtape({ nom: 'attente', demandeSignatureId: resultat.demandeSignatureId, urlSignature: resultat.urlSignature });
        setEnCours(false);
        return;
      }

      // Filet de sécurité si Documenso n'a pas renvoyé de lien direct :
      // la demande existe et l'e-mail de signature classique part quand même.
      setEtape({ nom: 'email-envoye' });
      setEnCours(false);
    } catch (e) {
      setErreur(`Erreur inattendue : ${(e as Error).message}`);
      setEnCours(false);
    }
  }

  if (etape.nom === 'signe') {
    return (
      <div className="rounded-2xl border border-ligne bg-sable-carte p-6 text-center">
        <CheckCircle2 size={32} className="mx-auto text-pin" />
        <h2 className="font-display mt-3 text-xl italic">Demande signée et transmise</h2>
        <p className="mt-2 text-[13.5px] text-encre-douce">
          Ton document est signé, archivé, et le comité vient de le recevoir par e-mail.
        </p>
        <button
          type="button"
          onClick={() => router.push('/manifestations')}
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-terracotta px-4 py-2 text-[13px] font-medium text-white transition-opacity hover:opacity-90"
        >
          Retour aux manifestations
        </button>
      </div>
    );
  }

  if (etape.nom === 'attente') {
    return (
      <div className="rounded-2xl border border-ligne bg-sable-carte p-6 text-center">
        <Loader2 size={28} className="mx-auto animate-spin text-terracotta" />
        <h2 className="font-display mt-3 text-xl italic">En attente de ta signature</h2>
        <p className="mt-2 text-[13.5px] text-encre-douce">
          Ta session de signature s&apos;est ouverte dans un nouvel onglet. Une fois signé, reviens simplement ici —
          cette page se met à jour toute seule.
        </p>
        <a
          href={etape.urlSignature}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-2 rounded-full border border-ligne bg-sable px-4 py-2 text-[13px] font-medium text-encre-douce transition-colors hover:border-terracotta hover:text-terracotta"
        >
          <ExternalLink size={14} />
          Rouvrir la session de signature
        </a>
      </div>
    );
  }

  if (etape.nom === 'email-envoye') {
    return (
      <div className="rounded-2xl border border-ligne bg-sable-carte p-6 text-center">
        <h2 className="font-display text-xl italic">Demande envoyée</h2>
        <p className="mt-2 text-[13.5px] text-encre-douce">
          Un e-mail pour signer ton document vient de t&apos;être envoyé. Une fois signé, il sera transmis au CA.
        </p>
        <button
          type="button"
          onClick={() => router.push('/manifestations')}
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-terracotta px-4 py-2 text-[13px] font-medium text-white transition-opacity hover:opacity-90"
        >
          Retour aux manifestations
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={soumettre} className="flex flex-col gap-4">
      <div className="rounded-2xl border border-ligne bg-sable-carte p-5">
        <div className="flex flex-col gap-1">
          <label className="text-[12.5px] font-semibold text-encre-douce">Date de la demande</label>
          <input
            type="text"
            disabled
            value={new Date(AUJOURDHUI + 'T00:00:00').toLocaleDateString('fr-FR', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
            className="rounded-lg border border-ligne bg-sable/60 px-3 py-2 text-[14px] text-encre-douce"
          />
        </div>

        <div className="mt-4 flex flex-col gap-1">
          <label className="text-[12.5px] font-semibold text-encre-douce">
            Nom de la prestation <span className="text-terracotta">*</span>
          </label>
          <input
            name="nomPrestation"
            required
            placeholder="ex. Anniversaire des 50 ans de Marc"
            className="rounded-lg border border-ligne bg-sable px-3 py-2 text-[14px] outline-none focus:border-terracotta"
          />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label className="text-[12.5px] font-semibold text-encre-douce">
              Date de la prestation <span className="text-terracotta">*</span>
            </label>
            <input
              type="date"
              name="datePrestation"
              required
              className="rounded-lg border border-ligne bg-sable px-3 py-2 text-[14px] outline-none focus:border-terracotta"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[12.5px] font-semibold text-encre-douce">
              Responsable(s) / organisateur(s) <span className="text-terracotta">*</span>
            </label>
            <input
              name="responsables"
              required
              defaultValue={monNom ?? ''}
              className="rounded-lg border border-ligne bg-sable px-3 py-2 text-[14px] outline-none focus:border-terracotta"
            />
            <span className="text-[11px] text-encre-douce/80">Modifiable pour ajouter des co-organisateurs</span>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-ligne bg-sable-carte p-5">
        <div className="flex flex-col gap-1">
          <label className="text-[12.5px] font-semibold text-encre-douce">
            Déroulement <span className="text-terracotta">*</span>
          </label>
          <textarea
            name="deroulement"
            required
            rows={3}
            placeholder="Horaires prévus, grandes lignes de la journée…"
            className="rounded-lg border border-ligne bg-sable px-3 py-2 text-[14px] outline-none focus:border-terracotta"
          />
        </div>
        <div className="mt-4 flex flex-col gap-1">
          <label className="text-[12.5px] font-semibold text-encre-douce">Animations, services, prestations prévues</label>
          <textarea
            name="animations"
            rows={2}
            placeholder="Traiteur, musique, bar, matériel…"
            className="rounded-lg border border-ligne bg-sable px-3 py-2 text-[14px] outline-none focus:border-terracotta"
          />
        </div>
        <div className="mt-4 flex flex-col gap-1">
          <label className="text-[12.5px] font-semibold text-encre-douce">Personnes aidantes</label>
          <textarea
            name="personnesAidantes"
            rows={2}
            placeholder="Qui t'aide à préparer / ranger ?"
            className="rounded-lg border border-ligne bg-sable px-3 py-2 text-[14px] outline-none focus:border-terracotta"
          />
        </div>
      </div>

      <div className="flex items-start gap-3 rounded-2xl border border-pin/30 bg-pin/5 p-4">
        <ListChecks size={18} className="mt-0.5 shrink-0 text-pin" />
        <p className="text-[12.5px] leading-relaxed text-encre-douce">
          Le club doit être restitué dans l&apos;état de propreté et de rangement dans lequel il a été mis à ta
          disposition. En cas d&apos;utilisation du bar, compléter la fiche des consommations. Personnes
          extérieures : règlement sur place. Membres : facturation ultérieure.
        </p>
      </div>

      {erreur && <p className="text-[12.5px] text-danger">{erreur}</p>}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="submit"
          disabled={enCours}
          className="inline-flex items-center gap-2 rounded-full bg-terracotta px-6 py-3 text-[14px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {enCours ? 'Génération…' : 'Valider et signer'}
          {!enCours && <ArrowRight size={16} />}
        </button>
        <p className="max-w-xs text-[11.5px] text-encre-douce">
          Tu ouvriras ensuite ta session de signature — comptez une minute.
        </p>
      </div>
    </form>
  );
}
