import 'server-only';
import fs from 'fs';
import path from 'path';

let baseConnaissance: string | null = null;

/** BASE_CONNAISSANCE_FONCTIONNALITES.md injecté dans le prompt système de
 *  Caro (28/07/2026, demande Jérôme : "permet à Caro d'y avoir accès pour
 *  améliorer les réponses") — même principe que chargerLogoClub()
 *  (email.ts) : lu une fois, mis en cache, jamais modifié en cours
 *  d'exécution (le fichier ne change qu'au déploiement suivant). Racine
 *  du projet plutôt que public/ : ce n'est pas un asset servi au
 *  navigateur, seulement une lecture serveur. */
export function chargerBaseConnaissance(): string {
  if (!baseConnaissance) {
    baseConnaissance = fs.readFileSync(path.join(process.cwd(), 'BASE_CONNAISSANCE_FONCTIONNALITES.md'), 'utf-8');
  }
  return baseConnaissance;
}
