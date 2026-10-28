# -*- coding: utf-8 -*-
"""
BilimAI — AI elektron doska (server)

O'rnatish:        pip install -r requirements.txt
Ishga tushirish:  python main.py            (brauzer o'zi ochiladi)
          yoki:   uvicorn main:app --reload
Manzil:           http://127.0.0.1:8000

Internetga (Render.com):
  Build Command:  pip install -r requirements.txt
  Start Command:  uvicorn main:app --host 0.0.0.0 --port $PORT --proxy-headers --forwarded-allow-ips="*"
  Environment:    GEMINI_API_KEY = <kalitingiz>
"""

import json
import mimetypes
import os
import re
import threading
import urllib.error
import urllib.request
import webbrowser
from collections import OrderedDict

import edge_tts
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse, Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

VERSIYA = "1.0.0"
PAPKA = os.path.dirname(os.path.abspath(__file__))
SOZLAMA_FAYLI = os.path.join(PAPKA, "sozlamalar.json")
MODELLAR = ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.5-pro"]

mimetypes.add_type("text/javascript", ".mjs")  # pdf.js uchun (Windows ba'zan .mjs ni tanimaydi)

app = FastAPI(title="BilimAI", version=VERSIYA)
app.mount("/static", StaticFiles(directory=os.path.join(PAPKA, "static")), name="static")


# ---------------- sozlamalar (Gemini kaliti) ----------------
def sozlamalar():
    s = {"gemini_kalit": os.environ.get("GEMINI_API_KEY", ""), "model": MODELLAR[0]}
    try:
        with open(SOZLAMA_FAYLI, encoding="utf-8") as f:
            s.update({k: v for k, v in json.load(f).items() if v})
    except (OSError, ValueError):
        pass
    return s


def faqat_shu_kompyuter(request: Request):
    """Kalitni faqat shu kompyuterdan o'zgartirish mumkin."""
    if request.client and request.client.host not in ("127.0.0.1", "::1", "localhost"):
        raise HTTPException(403, "Sozlamalarni faqat server ishlayotgan kompyuterdan o'zgartirish mumkin.")


# ---------------- sahifa ----------------
@app.get("/")
def bosh_sahifa():
    return FileResponse(os.path.join(PAPKA, "templates", "index.html"))


@app.get("/favicon.ico")
def favicon():
    return FileResponse(os.path.join(PAPKA, "static", "icons", "icon-32.png"), media_type="image/png")


@app.get("/robots.txt")
def robots(request: Request):
    baza = str(request.base_url).rstrip("/")
    return Response(f"User-agent: *\nAllow: /\nSitemap: {baza}/sitemap.xml\n", media_type="text/plain")


@app.get("/sitemap.xml")
def sitemap(request: Request):
    baza = str(request.base_url).rstrip("/")
    xml = ('<?xml version="1.0" encoding="UTF-8"?>\n'
           '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
           f'<url><loc>{baza}/</loc><changefreq>weekly</changefreq><priority>1.0</priority></url></urlset>\n')
    return Response(xml, media_type="application/xml")


@app.get("/api/holat")
def holat():
    s = sozlamalar()
    k = s["gemini_kalit"]
    return {"versiya": VERSIYA, "ai": bool(k), "model": s["model"], "modellar": MODELLAR,
            "kalit": ("…" + k[-4:]) if k else ""}


class Sozlama(BaseModel):
    gemini_kalit: str | None = None
    model: str | None = None


@app.post("/api/sozlama")
def sozlama_saqla(body: Sozlama, request: Request):
    faqat_shu_kompyuter(request)
    s = sozlamalar()
    if body.gemini_kalit is not None:
        s["gemini_kalit"] = body.gemini_kalit.strip()
    if body.model in MODELLAR:
        s["model"] = body.model
    with open(SOZLAMA_FAYLI, "w", encoding="utf-8") as f:
        json.dump({"gemini_kalit": s["gemini_kalit"], "model": s["model"]}, f, ensure_ascii=False, indent=2)
    return holat()


# ---------------- ovoz (edge-tts: Madina, Sardor) ----------------
ZAXIRA_OVOZLAR = [
    {"ShortName": "uz-UZ-MadinaNeural", "Locale": "uz-UZ", "FriendlyName": "Madina"},
    {"ShortName": "uz-UZ-SardorNeural", "Locale": "uz-UZ", "FriendlyName": "Sardor"},
]
KERAKLI_TILLAR = ("uz-", "ru-RU", "en-US", "en-GB", "tr-TR", "kk-KZ")
_ovozlar_kesh = None
_audio_kesh: "OrderedDict[str, bytes]" = OrderedDict()


@app.get("/api/ovozlar")
async def ovozlar():
    global _ovozlar_kesh
    if _ovozlar_kesh is None:
        try:
            hammasi = await edge_tts.list_voices()
            _ovozlar_kesh = sorted(
                ({"ShortName": v["ShortName"], "Locale": v["Locale"],
                  "FriendlyName": v["ShortName"].split("-")[-1].replace("Neural", "")}
                 for v in hammasi if v["Locale"].startswith(KERAKLI_TILLAR)),
                key=lambda v: (not v["Locale"].startswith("uz"), v["Locale"], v["FriendlyName"]))
        except Exception:
            return ZAXIRA_OVOZLAR          # internet yo'q — keyinroq qayta urinadi
    return _ovozlar_kesh or ZAXIRA_OVOZLAR


class OvozSorov(BaseModel):
    matn: str
    ovoz: str = "uz-UZ-MadinaNeural"
    tezlik: float = 1.0
    ohang: float = 1.0


@app.post("/api/ovoz")
async def ovoz(s: OvozSorov):
    matn = s.matn.strip()[:5000]
    if not matn:
        raise HTTPException(400, "Matn bo'sh")
    rate = f"{int(round((s.tezlik - 1) * 100)):+d}%"
    pitch = f"{int(round((s.ohang - 1) * 40)):+d}Hz"
    kalit = f"{s.ovoz}|{rate}|{pitch}|{matn}"
    if kalit not in _audio_kesh:
        bufer = bytearray()
        for _ in range(3):
            try:
                bufer.clear()
                async for b in edge_tts.Communicate(matn, s.ovoz, rate=rate, pitch=pitch).stream():
                    if b["type"] == "audio":
                        bufer.extend(b["data"])
                if bufer:
                    break
            except Exception:
                continue
        if not bufer:
            raise HTTPException(502, "Ovoz yaratilmadi. Internetni tekshiring.")
        _audio_kesh[kalit] = bytes(bufer)
        while len(_audio_kesh) > 400:
            _audio_kesh.popitem(last=False)
    return Response(_audio_kesh[kalit], media_type="audio/mpeg",
                    headers={"Cache-Control": "private, max-age=86400"})


# ---------------- AI: slaydni tushuntirish (Gemini) ----------------
CHIZMALAR = ("uchburchak a b c | tugri a b | pifagor a b | teng_tomonli a | teng_yonli yon asos | "
             "burchaklar A B | yuz asos balandlik | turlar | burchak_turlari | tushish massa balandlik | "
             "mayatnik burchak | ish kuch masofa")


def prompt_tuz(sarlavha, matn, mavzu, sarlavhalar, rasm):
    rasm_izoh = ("Slaydda rasm bor va u doskada ko'rsatiladi; unga «@ rasm» qatori bilan ishora qilishing mumkin.\n"
                 if rasm else "")
    return f"""Sen tajribali, mehribon o'qituvchisan. Elektron doskada dars o'tyapsan.
Quyidagi slayd uchun doska ssenariysini yoz.

FORMAT (har biri alohida qator):
- matn          → doskaga yoziladigan qisqa punkt (ko'pi bilan 9 so'z)
= formula       → formula, oddiy matnda (masalan: Eₖ = mv²/2, a² + b² = c²)
! chizma        → faqat mavzuga aniq mos kelsa va FAQAT shu ro'yxatdan: {CHIZMALAR}
                  (aniq sonlar bilan, masalan: ! pifagor 3 4)
@ matn          → doskaga oldin yozilgan yozuvni ko'rsatish (o'sha yozuvning boshidan bir necha so'z)
oddiy qator     → o'qituvchining og'zaki tushuntirishi; u o'zidan OLDINGI qator yozilayotganda aytiladi.

QOIDALAR:
- Har bir punkt, formula, chizma yoki @ dan keyin 1–3 gaplik tushuntirish yoz.
- 3–5 ta punkt; agar mavzuga mos bo'lsa 1 ta formula va 1 ta misol.
- Jami og'zaki nutq 80–170 so'z, sodda va jonli, o'quvchiga murojaat qilib.
- Hammasi o'zbek tilida, lotin alifbosida.
- Og'zaki qatorlarda formulalarni so'z bilan o'qi ("E ka teng m v kvadrat bo'lingan ikkiga"), sonlarni so'z bilan yoz.
- Slayd matnidagi fikrlarni saqla, ortiqcha narsa to'qima.
- "#" bilan sarlavha yozma. Faqat ssenariy qatorlarini qaytar — izoh, markdown yoki ``` yo'q.

Dars mavzusi: {mavzu}
Darsdagi slaydlar: {sarlavhalar}
{rasm_izoh}Slayd sarlavhasi: {sarlavha}
Slayddagi matn:
{matn}
"""


def gemini(prompt, kalit, model):
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
    data = json.dumps({"contents": [{"parts": [{"text": prompt}]}],
                       "generationConfig": {"temperature": 0.6, "maxOutputTokens": 2048}}).encode()
    so = urllib.request.Request(url, data=data, method="POST",
                                headers={"Content-Type": "application/json", "x-goog-api-key": kalit})
    try:
        with urllib.request.urlopen(so, timeout=90) as j:
            javob = json.load(j)
    except urllib.error.HTTPError as e:
        matn = e.read().decode("utf-8", "ignore")
        if e.code in (400, 401, 403) and ("API key" in matn or "API_KEY" in matn or e.code != 400):
            raise HTTPException(400, "Gemini kaliti noto'g'ri. «Sozlamalar»da kalitni tekshiring.")
        if e.code == 429:
            raise HTTPException(429, "Gemini limiti tugadi. Bir daqiqadan keyin qayta urinib ko'ring.")
        raise HTTPException(502, f"Gemini xatosi ({e.code}).")
    except (urllib.error.URLError, TimeoutError):
        raise HTTPException(502, "Gemini'ga ulanib bo'lmadi. Internetni tekshiring.")
    try:
        return "".join(p.get("text", "") for p in javob["candidates"][0]["content"]["parts"])
    except (KeyError, IndexError):
        raise HTTPException(502, "Gemini javob bermadi. Qayta urinib ko'ring.")


def tozala(matn):
    qatorlar = []
    for q in matn.replace("\r", "").split("\n"):
        q = q.strip()
        if not q or q.startswith("```") or q.startswith("#"):
            continue
        q = re.sub(r"^\*\s+", "- ", q)            # markdown "* punkt" -> "- punkt"
        q = re.sub(r"\*\*(.+?)\*\*", r"\1", q)    # **qalin** -> qalin
        if q.startswith("!") and not re.match(r"^!\s*(rasm\b|" + "|".join(
                x.split()[0] for x in CHIZMALAR.split(" | ")) + r")\b", q):
            continue                               # ro'yxatda yo'q chizma
        qatorlar.append(q)
    return "\n".join(qatorlar)


class Tushuntir(BaseModel):
    sarlavha: str
    matn: str = ""
    mavzu: str = ""
    sarlavhalar: list[str] = []
    rasm: bool = False


@app.post("/api/tushuntir")
def tushuntir(t: Tushuntir):
    s = sozlamalar()
    if not s["gemini_kalit"]:
        raise HTTPException(400, "Avval «Sozlamalar»da Gemini kalitini kiriting.")
    prompt = prompt_tuz(t.sarlavha, t.matn[:4000] or "(matn yo'q)", t.mavzu or t.sarlavha,
                        ", ".join(t.sarlavhalar[:40]), t.rasm)
    natija = tozala(gemini(prompt, s["gemini_kalit"], s["model"]))
    if not natija:
        raise HTTPException(502, "AI bo'sh javob qaytardi. Qayta urinib ko'ring.")
    return {"qatorlar": natija}


if __name__ == "__main__":
    import uvicorn
    threading.Timer(1.5, lambda: webbrowser.open("http://127.0.0.1:8000")).start()
    uvicorn.run(app, host="127.0.0.1", port=8000)