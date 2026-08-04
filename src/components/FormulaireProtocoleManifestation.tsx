'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { pdf } from '@react-pdf/renderer';
import { ArrowRight, ListChecks } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { creerEtSignerProtocole } from '@/lib/actions/protocoleManifestation';
import { reveillerDocumenso } from '@/lib/reveillerDocumenso';
import { ProtocoleManifestationPdf } from './ProtocoleManifestationPdf';

const AUJOURDHUI = new Date().toISOString().slice(0, 10);

/** Formulaire "Demande d'organisation de manifestation" (04/08/2026) —
 *  remplace la fiche papier "Protocole Manifestation". Flux validé avec
 *  Jérôme : le demandeur est son propre et unique signataire — à la
 *  validation, le PDF se génère, s'uploade, et le navigateur est redirigé
 *  directement vers la session de signature Documenso (urlSignature),
 *  sans repasser par l'e-mail. Le CA reçoit la demande une fois signée
 *  (déjà géré côté /outils/signatures, aucun code supplémentaire ici). */
export function FormulaireProtocoleManifestation({ monNom }: { monNom: string | null }) {
  const router = useRouter();
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [emailEnvoye, setEmailEnvoye] = useState(false);

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
        window.location.href = resultat.urlSignature;
        return;
      }

      // Filet de sécurité si Documenso n'a pas renvoyé de lien direct :
      // la demande existe et l'e-mail de signature classique part quand même.
      setEmailEnvoye(true);
      setEnCours(false);
    } catch (e) {
      setErreur(`Erreur inattendue : ${(e as Error).message}`);
      setEnCours(false);
    }
  }

  if (emailEnvoye) {
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
