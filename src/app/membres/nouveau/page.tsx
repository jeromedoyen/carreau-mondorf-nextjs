import type { Metadata } from 'next';
import Link from 'next/link';
import { MembreForm, type PrefillDemande } from '@/components/MembreForm';
import { estMembreCA, getPersonneParEmail } from '@/lib/membres';
import { getSaisonActive } from '@/lib/saisons';
import { getDemande } from '@/lib/demandes';
import type { PersonneAvecAdhesion } from '@/lib/types';

export const metadata: Metadata = { title: 'Nouveau membre' };

export default async function NouveauMembrePage({
  searchParams,
}: {
  searchParams: Promise<{ demandeId?: string }>;
}) {
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

  const [{ demandeId }, saisonActive] = await Promise.all([searchParams, getSaisonActive()]);

  let prefill: PrefillDemande | undefined;
  let demandeIdNum: number | undefined;
  let personneExistante: PersonneAvecAdhesion | undefined;
  let estReinscription = false;

  if (demandeId) {
    const demande = await getDemande(Number(demandeId));
    if (demande && demande.statut === 'a_traiter') {
      demandeIdNum = demande.id;
      estReinscription = demande.typeDemande === 'Réinscription';

      // Une Réinscription concerne une personne déjà connue (elle a déjà un
      // accès de connexion) : on édite sa fiche existante — retrouvée par
      // email — plutôt que d'en créer une nouvelle. Si aucune fiche ne
      // correspond (cas anormal), on retombe sur le flux Inscription
      // classique plutôt que de bloquer le traitement de la demande.
      if (estReinscription) {
        personneExistante = (await getPersonneParEmail(demande.email, saisonActive)) ?? undefined;
      }

      if (!personneExistante) {
        prefill = {
          nom: demande.nom,
          prenom: demande.prenom,
          sexe: demande.sexe,
          dateNaissance: demande.dateNaissance,
          nationalite: demande.nationalite,
          adresse: demande.adresse,
          codePostalVille: demande.codePostalVille,
          telephone: demande.telephone,
          email: demande.email,
          droitImage: demande.droitImage,
          typeAdhesionSouhaite: demande.typeAdhesionSouhaite,
        };
      }
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-5 py-12">
      <Link href="/membres" className="text-[13px] text-encre-douce hover:text-terracotta">
        ← Membres
      </Link>
      <header className="entree mt-4 mb-8">
        <p className="font-score text-[13px] tracking-[0.2em] text-terracotta">
          {demandeIdNum ? `${estReinscription ? 'RÉINSCRIPTION' : 'DEMANDE'} À TRAITER · ` : ''}RÉSERVÉ AU CA
        </p>
        <h1 className="font-display mt-1 text-3xl italic">
          {personneExistante ? `${personneExistante.prenom} ${personneExistante.nom}` : 'Nouveau membre'}
        </h1>
      </header>
      <MembreForm
        saisonActuelle={saisonActive}
        prefill={prefill}
        personne={personneExistante}
        demandeId={demandeIdNum}
      />
    </main>
  );
}
