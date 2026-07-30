# notes-vocales

Service webhook Telegram → transcription (faster-whisper) → Supabase, pour capter les mémos vocaux "pense-bête" même quand le PC de Jérôme est éteint. Voir `main.py`.

## Déploiement sur Render

1. Sur [render.com](https://render.com), **New → Web Service**, connecter le repo `carreau-mondorf-nextjs`, **Root Directory**: `services/notes-vocales`.
2. Runtime: Python 3. Build command: `pip install -r requirements.txt`. Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`.
3. Variables d'environnement à définir dans Render:
   - `TELEGRAM_BOT_TOKEN` — token du bot (BotFather)
   - `TELEGRAM_CHAT_ID_AUTORISE` — ton chat_id Telegram (récupérable en envoyant un message au bot puis en consultant `https://api.telegram.org/bot<TOKEN>/getUpdates`)
   - `SUPABASE_URL` — même valeur que `NEXT_PUBLIC_SUPABASE_URL` dans l'app Next.js
   - `SUPABASE_SERVICE_ROLE_KEY` — clé service_role Supabase (jamais la clé anon)
4. Une fois déployé, noter l'URL Render (ex. `https://notes-vocales.onrender.com`).

## Enregistrer le webhook Telegram

Une seule fois, après déploiement :

```bash
curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://notes-vocales.onrender.com/webhook/telegram"
```

## Notes

- Tier gratuit Render : le service se met en veille après inactivité et se réveille au premier appel (délai de quelques secondes sur le premier vocal envoyé après une pause — sans impact puisque la transcription se fait de toute façon en différé).
- Le service ignore tout vocal ne venant pas de `TELEGRAM_CHAT_ID_AUTORISE`, pour éviter qu'un tiers ayant trouvé le bot (les bots Telegram ne sont pas privés par défaut) puisse écrire dans `notes_vocales`.
- Aucun traitement automatique du contenu : seule la transcription est faite ici. La lecture, le tri et l'action restent manuels via `/pb`.
