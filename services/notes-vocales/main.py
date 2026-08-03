"""Service webhook Telegram -> transcription -> Supabase.

Reçoit les mémos vocaux envoyés par Jérôme au bot Telegram, les transcrit
et insère le texte dans la table Supabase `notes_vocales` (statut
`a_traiter`), lue ensuite par la commande /pb côté Claude Code. Aucun
traitement automatique du contenu : ce service ne fait que capter et
transcrire, jamais interpréter ni agir.

Transcription via l'API Groq (Whisper large-v3-turbo) depuis le
03/08/2026 — remplace faster-whisper en local, qui mettait 85 à 90
secondes pour 13 secondes d'audio sur le tier gratuit Render (mesuré lors
du chantier de déclaration vocale des concours, cf. app Next.js). Groq
tourne à ~220x le temps réel, gratuit jusqu'à 2000 requêtes/jour — très
au-delà du volume d'un pense-bête personnel.
"""

import os
import tempfile

import httpx
from fastapi import BackgroundTasks, FastAPI, File, Header, HTTPException, Request, UploadFile

TELEGRAM_BOT_TOKEN = os.environ["TELEGRAM_BOT_TOKEN"]
TELEGRAM_API = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}"
SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_ROLE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
# Autorisé à envoyer des vocaux au bot - évite qu'un tiers ayant trouvé
# le bot Telegram (public par nature) puisse écrire dans notes_vocales.
TELEGRAM_CHAT_ID_AUTORISE = os.environ["TELEGRAM_CHAT_ID_AUTORISE"]
# Secret partagé avec l'app Next.js pour /transcrire (déclaration vocale
# d'une participation à un concours). Volontairement distinct du garde
# Telegram ci-dessus : ce bot-là reste le pense-bête perso de Jérôme, alors
# que /transcrire sert n'importe quel licencié, via le backend de l'app.
TRANSCRIPTION_API_SECRET = os.environ.get("TRANSCRIPTION_API_SECRET")
# L'endpoint est public (protégé par le seul secret) : on plafonne la
# taille pour qu'une fuite du secret ne permette pas de saturer le service.
TAILLE_MAX_AUDIO = 10 * 1024 * 1024
GROQ_API_KEY = os.environ["GROQ_API_KEY"]

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
async def transcrire_via_groq(chemin_local: str, nom_fichier: str) -> str:
    async with httpx.AsyncClient(timeout=60) as client:
        with open(chemin_local, "rb") as f:
            reponse = await client.post(
                "https://api.groq.com/openai/v1/audio/transcriptions",
                headers={"Authorization": f"Bearer {GROQ_API_KEY}"},
                files={"file": (nom_fichier, f)},
                data={"model": "whisper-large-v3-turbo", "language": "fr", "response_format": "json"},
            )
        reponse.raise_for_status()
        return (reponse.json().get("text") or "").strip()


# Ids Telegram update_id déjà traités - Telegram réémet le même webhook
# tant qu'il ne reçoit pas de 200 assez vite (la transcription prenait
# largement plus que son délai d'attente), ce qui a produit des dizaines
# de doublons de la même note avant ce correctif. En mémoire seulement
# (une instance, tier gratuit) : suffisant puisque Telegram ne réessaie
# que sur une fenêtre courte après l'envoi initial.
_updates_traites = set()


async def inserer_note(texte: str, duree_secondes: int | None):
    if not texte:
        return
    async with httpx.AsyncClient() as client:
        await client.post(
            f"{SUPABASE_URL}/rest/v1/notes_vocales",
            headers=SUPABASE_HEADERS,
            json={"texte": texte, "duree_secondes": duree_secondes},
        )


async def traiter_vocal(voix: dict):
    async with httpx.AsyncClient() as client:
        info_fichier = await client.get(f"{TELEGRAM_API}/getFile", params={"file_id": voix["file_id"]})
        chemin_telegram = info_fichier.json()["result"]["file_path"]

        with tempfile.NamedTemporaryFile(suffix=".ogg", delete=False) as f:
            reponse = await client.get(f"https://api.telegram.org/file/bot{TELEGRAM_BOT_TOKEN}/{chemin_telegram}")
            f.write(reponse.content)
            chemin_local = f.name

    try:
        texte = await transcrire_via_groq(chemin_local, "vocal.ogg")
    finally:
        os.remove(chemin_local)

    await inserer_note(texte, voix.get("duration"))


@app.post("/webhook/telegram")
async def recevoir_webhook(request: Request, background_tasks: BackgroundTasks):
    update = await request.json()
    update_id = update.get("update_id")
    message = update.get("message", {})
    chat_id = str(message.get("chat", {}).get("id", ""))
    voix = message.get("voice")
    # Texte tapé directement dans Telegram (demande via /pb, 01/08/2026) -
    # pas de passage par le transcripteur voix -> texte, insertion directe.
    texte = message.get("text")

    if chat_id != TELEGRAM_CHAT_ID_AUTORISE or update_id in _updates_traites:
        return {"ok": True}
    if not voix and not texte:
        return {"ok": True}

    _updates_traites.add(update_id)
    if voix:
        # Répond immédiatement à Telegram (avant transcription, qui prend
        # du temps) pour éviter qu'il ne réessaie et double le traitement.
        background_tasks.add_task(traiter_vocal, voix)
    else:
        background_tasks.add_task(inserer_note, texte.strip(), None)
    return {"ok": True}


@app.post("/transcrire")
async def transcrire(
    fichier: UploadFile = File(...),
    authorization: str = Header(default=""),
):
    """Transcrit un audio et renvoie le texte, sans rien écrire en base.

    Appelé par le backend Next.js (déclaration vocale d'une participation
    à un concours). Contrairement au webhook Telegram, la réponse est
    synchrone : l'appelant a besoin du texte pour la suite du traitement.
    """
    if not TRANSCRIPTION_API_SECRET:
        raise HTTPException(status_code=503, detail="TRANSCRIPTION_API_SECRET non configuré.")
    if authorization != f"Bearer {TRANSCRIPTION_API_SECRET}":
        raise HTTPException(status_code=401, detail="Secret invalide.")

    contenu = await fichier.read()
    if not contenu:
        raise HTTPException(status_code=400, detail="Fichier audio vide.")
    if len(contenu) > TAILLE_MAX_AUDIO:
        raise HTTPException(status_code=413, detail="Audio trop volumineux (10 Mo maximum).")

    nom_fichier = fichier.filename or "vocal.webm"
    with tempfile.NamedTemporaryFile(suffix=os.path.splitext(nom_fichier)[1] or ".webm", delete=False) as f:
        f.write(contenu)
        chemin_local = f.name

    try:
        texte = await transcrire_via_groq(chemin_local, nom_fichier)
    finally:
        os.remove(chemin_local)

    return {"texte": texte}


@app.get("/")
async def sante():
    return {"status": "ok"}
