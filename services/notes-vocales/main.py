"""Service webhook Telegram -> transcription -> Supabase.

Reçoit les mémos vocaux envoyés par Jérôme au bot Telegram, les transcrit
avec faster-whisper (local, gratuit, tourne dans ce service Render) et
insère le texte dans la table Supabase `notes_vocales` (statut
`a_traiter`), lue ensuite par la commande /pb côté Claude Code. Aucun
traitement automatique du contenu : ce service ne fait que capter et
transcrire, jamais interpréter ni agir.
"""

import os
import tempfile

import httpx
from fastapi import BackgroundTasks, FastAPI, Request
from faster_whisper import WhisperModel

TELEGRAM_BOT_TOKEN = os.environ["TELEGRAM_BOT_TOKEN"]
TELEGRAM_API = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}"
SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_ROLE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
# Autorisé à envoyer des vocaux au bot - évite qu'un tiers ayant trouvé
# le bot Telegram (public par nature) puisse écrire dans notes_vocales.
TELEGRAM_CHAT_ID_AUTORISE = os.environ["TELEGRAM_CHAT_ID_AUTORISE"]

app = FastAPI()
# Appel direct à l'API REST Supabase (PostgREST) plutôt que le SDK
# supabase-py : ce dernier valide la clé côté client en s'attendant à un
# JWT classique et rejette le nouveau format sb_secret_/sb_publishable_
# avec "Invalid API key", alors que la clé est en réalité valide.
SUPABASE_HEADERS = {
    "apikey": SUPABASE_SERVICE_ROLE_KEY,
    "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
    "Content-Type": "application/json",
}
# "base" (pas "small") : le tier gratuit Render est limité à 512 Mo de
# RAM, "small" dépasse cette limite au chargement (OOM). Chargé à la
# demande plutôt qu'à l'import, pour ne pas consommer de mémoire tant
# qu'aucun vocal n'est arrivé.
_modele = None


def obtenir_modele():
    global _modele
    if _modele is None:
        _modele = WhisperModel("base", device="cpu", compute_type="int8")
    return _modele


# Ids Telegram update_id déjà traités - Telegram réémet le même webhook
# tant qu'il ne reçoit pas de 200 assez vite (la transcription prenait
# largement plus que son délai d'attente), ce qui a produit des dizaines
# de doublons de la même note avant ce correctif. En mémoire seulement
# (une instance, tier gratuit) : suffisant puisque Telegram ne réessaie
# que sur une fenêtre courte après l'envoi initial.
_updates_traites = set()


async def traiter_vocal(voix: dict):
    async with httpx.AsyncClient() as client:
        info_fichier = await client.get(f"{TELEGRAM_API}/getFile", params={"file_id": voix["file_id"]})
        chemin_telegram = info_fichier.json()["result"]["file_path"]

        with tempfile.NamedTemporaryFile(suffix=".ogg", delete=False) as f:
            reponse = await client.get(f"https://api.telegram.org/file/bot{TELEGRAM_BOT_TOKEN}/{chemin_telegram}")
            f.write(reponse.content)
            chemin_local = f.name

    segments, _ = obtenir_modele().transcribe(chemin_local, language="fr")
    texte = " ".join(segment.text.strip() for segment in segments).strip()
    os.remove(chemin_local)

    if texte:
        async with httpx.AsyncClient() as client:
            await client.post(
                f"{SUPABASE_URL}/rest/v1/notes_vocales",
                headers=SUPABASE_HEADERS,
                json={"texte": texte, "duree_secondes": voix.get("duration")},
            )


@app.post("/webhook/telegram")
async def recevoir_webhook(request: Request, background_tasks: BackgroundTasks):
    update = await request.json()
    update_id = update.get("update_id")
    message = update.get("message", {})
    chat_id = str(message.get("chat", {}).get("id", ""))
    voix = message.get("voice")

    if not voix or chat_id != TELEGRAM_CHAT_ID_AUTORISE or update_id in _updates_traites:
        return {"ok": True}

    _updates_traites.add(update_id)
    # Répond immédiatement à Telegram (avant transcription, qui prend du
    # temps) pour éviter qu'il ne réessaie et double le traitement.
    background_tasks.add_task(traiter_vocal, voix)
    return {"ok": True}


@app.get("/")
async def sante():
    return {"status": "ok"}
