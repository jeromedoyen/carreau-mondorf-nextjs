# notes-vocales

Service webhook Telegram → transcription (Groq, Whisper large-v3-turbo) → Supabase, pour capter les mémos vocaux "pense-bête" même quand le PC de Jérôme est éteint. Voir `main.py`.

Sert aussi d'endpoint `/transcrire` pour la déclaration vocale des participations à un concours dans l'app Next.js — deux usages, une seule brique de transcription.

## Déploiement sur Render

1. Sur [render.com](https://render.com), **New → Web Service**, connecter le repo `carreau-mondorf-nextjs`, **Root Directory**: `services/notes-vocales`.
2. Runtime: Python 3. Build command: `pip install -r requirements.txt`. Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`.
3. Variables d'environnement à définir dans Render:
   - `TELEGRAM_BOT_TOKEN` — token du bot (BotFather)
   - `TELEGRAM_CHAT_ID_AUTORISE` — ton chat_id Telegram (récupérable en envoyant un message au bot puis en consultant `https://api.telegram.org/bot<TOKEN>/getUpdates`)
   - `SUPABASE_URL` — même valeur que `NEXT_PUBLIC_SUPABASE_URL` dans l'app Next.js
   - `SUPABASE_SERVICE_ROLE_KEY` — clé service_role Supabase (jamais la clé anon)
   - `GROQ_API_KEY` — clé gratuite sur [console.groq.com](https://console.groq.com), même valeur que côté app Next.js si tu veux mutualiser le quota (2000 requêtes/jour, largement suffisant pour les deux usages)
   - `TRANSCRIPTION_API_SECRET` — secret partagé avec l'app Next.js (`NOTES_VOCALES_SECRET`), pour l'endpoint `/transcrire`
4. Une fois déployé, noter l'URL Render (ex. `https://notes-vocales.onrender.com`).

## Enregistrer le webhook Telegram

Une seule fois, après déploiement :

```bash
curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://notes-vocales.onrender.com/webhook/telegram"
```

## Notes

- Tier gratuit Render : le service se met en veille après inactivité et se réveille au premier appel (délai de quelques secondes sur le premier appel après une pause). Sans impact pour le pense-bête Telegram (traitement en différé). Pour `/transcrire` (usage synchrone, quelqu'un attend une réponse), voir le point suivant.
- Transcription via l'API Groq depuis le 03/08/2026 (remplace faster-whisper, mesuré à 85-90 s pour 13 s d'audio sur ce tier gratuit — inutilisable pour un usage synchrone). Groq tourne à ~220x le temps réel, gratuit jusqu'à 2000 requêtes/jour.
- Le service ignore tout vocal ne venant pas de `TELEGRAM_CHAT_ID_AUTORISE`, pour éviter qu'un tiers ayant trouvé le bot (les bots Telegram ne sont pas privés par défaut) puisse écrire dans `notes_vocales`.
- Aucun traitement automatique du contenu : seule la transcription est faite ici. La lecture, le tri et l'action restent manuels via `/pb`.
