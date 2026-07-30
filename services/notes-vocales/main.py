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
from fastapi import FastAPI, Request
from faster_whisper import WhisperModel
from supabase import create_client

TELEGRAM_BOT_TOKEN = os.environ["TELEGRAM_BOT_TOKEN"]
TELEGRAM_API = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}"
SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_ROLE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
# Autorisé à envoyer des vocaux au bot - évite qu'un tiers ayant trouvé
# le bot Telegram (public par nature) puisse écrire dans notes_vocales.
TELEGRAM_CHAT_ID_AUTORISE = os.environ["TELEGRAM_CHAT_ID_AUTORISE"]

app = FastAPI()
supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
# "small" : bon compromis précision/RAM pour le tier gratuit Render.
modele = WhisperModel("small", device="cpu", compute_type="int8")


@app.post("/webhook/telegram")
async def recevoir_webhook(request: Request):
    update = await request.json()
    message = update.get("message", {})
    chat_id = str(message.get("chat", {}).get("id", ""))
    voix = message.get("voice")

    if not voix or chat_id != TELEGRAM_CHAT_ID_AUTORISE:
        return {"ok": True}

    async with httpx.AsyncClient() as client:
        info_fichier = await client.get(f"{TELEGRAM_API}/getFile", params={"file_id": voix["file_id"]})
        chemin_telegram = info_fichier.json()["result"]["file_path"]

        with tempfile.NamedTemporaryFile(suffix=".ogg", delete=False) as f:
            reponse = await client.get(f"https://api.telegram.org/file/bot{TELEGRAM_BOT_TOKEN}/{chemin_telegram}")
            f.write(reponse.content)
            chemin_local = f.name

    segments, _ = modele.transcribe(chemin_local, language="fr")
    texte = " ".join(segment.text.strip() for segment in segments).strip()
    os.remove(chemin_local)

    if texte:
        supabase.table("notes_vocales").insert({
            "texte": texte,
            "duree_secondes": voix.get("duration"),
        }).execute()

    return {"ok": True}


@app.get("/")
async def sante():
    return {"status": "ok"}
