# Karteikarten-App – Veröffentlichung auf Vercel

Öffentliche Web-App: Word/PowerPoint/Notizen hochladen → KI erstellt Karteikarten → lernen & bearbeiten. Im Lernmodus kann die Antwort eingetippt oder eingesprochen werden (Spracheingabe: Chrome/Edge/Safari) und wird automatisch als richtig/falsch bewertet. Jeder Nutzer speichert seine Karten lokal im eigenen Browser.

## Projektstruktur

```
karteikarten-vercel/
├── index.html        ← die App
├── api/generate.js   ← KI: Karten aus Text erstellen
├── api/check.js      ← KI: getippte/gesprochene Antworten bewerten
├── api/answer.js     ← KI: einzelne Frage beantworten
└── README.md
```

## Veröffentlichen (ca. 5 Minuten)

**Variante A – über GitHub (nur Browser, empfohlen):**

1. Auf https://github.com kostenlos anmelden → „New repository“ → Name z. B. `karteikarten` → Create.
2. „uploading an existing file“ anklicken und den **Inhalt** dieses Ordners hineinziehen (`index.html` und den `api`-Ordner). Committen.
   - Hinweis: Falls der `api`-Ordner sich nicht per Drag & Drop hochladen lässt, „Add file → Create new file“ wählen und als Dateiname `api/generate.js` eingeben (der Ordner wird automatisch erstellt), Inhalt einfügen. Genauso für `api/answer.js`.
3. Auf https://vercel.com kostenlos anmelden (mit GitHub-Konto) → „Add New → Project“ → das Repository `karteikarten` importieren → **Deploy**.
4. Fertig – du bekommst eine öffentliche Adresse wie `https://karteikarten.vercel.app`, die du mit allen teilen kannst.

**Variante B – per Kommandozeile:**

```
npm i -g vercel
cd karteikarten-vercel
vercel --prod
```

## KI aktivieren (API-Key)

Ohne Key funktioniert die App trotzdem – der Import erkennt Fragen dann automatisch anhand der Textstruktur. Für echte KI-Generierung:

1. Auf https://console.anthropic.com einen API-Key erstellen (Guthaben nötig, Pay-as-you-go).
2. In Vercel: Projekt → **Settings → Environment Variables** → Name `ANTHROPIC_API_KEY`, Wert = dein Key → Save.
3. Unter **Deployments** das letzte Deployment → „Redeploy“.

## Wichtig zu wissen

- **Kosten:** Die KI läuft über deinen API-Key – jede Generierung (auch von fremden Besuchern) kostet dich ein paar Cent-Bruchteile (Modell: Claude Haiku, sehr günstig). Setze in der Anthropic-Konsole ein Monatslimit, damit nichts aus dem Ruder läuft.
- **Daten:** Karten werden nur im Browser des jeweiligen Nutzers gespeichert (localStorage) – es gibt keine zentrale Datenbank und keine Konten.
- **Eigene Domain:** In Vercel unter Settings → Domains kostenlos verknüpfbar.
