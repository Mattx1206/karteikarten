// Vercel Serverless Function: beantwortet eine einzelne Karteikarten-Frage (Anthropic API)
const MODEL = "claude-haiku-4-5";

module.exports = async (req, res) => {
    if (req.method !== "POST") return res.status(405).json({ error: "Nur POST erlaubt" });

    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) return res.status(501).json({ error: "ANTHROPIC_API_KEY ist nicht konfiguriert" });

    const question = String((req.body && req.body.question) || "").slice(0, 1000);
    const draft = String((req.body && req.body.draft) || "").slice(0, 2000);
    if (!question.trim()) return res.status(400).json({ error: "Keine Frage übergeben" });

    let prompt = "Beantworte die folgende Lern-/Prüfungsfrage kurz, korrekt und prüfungstauglich auf Deutsch. Antworte NUR mit der Antwort selbst, ohne Einleitung.\nFrage: " + question;
    if (draft.trim()) prompt += "\nBisheriger Antwortentwurf (verbessern/vervollständigen): " + draft;

    try {
          const r = await fetch("https://api.anthropic.com/v1/messages", {
                  method: "POST",
                  headers: {
                            "x-api-key": key,
                            "anthropic-version": "2023-06-01",
                            "content-type": "application/json"
                  },
                  body: JSON.stringify({
                            model: MODEL,
                            max_tokens: 1000,
                            messages: [{ role: "user", content: prompt }]
                  })
          });
          if (!r.ok) {
                  const detail = (await r.text()).slice(0, 300);
                  return res.status(502).json({ error: "KI-Dienst-Fehler (" + r.status + ")", detail });
          }
          const data = await r.json();
          const answer = (data.content || []).map(c => c.text || "").join("").trim();
          if (!answer) return res.status(500).json({ error: "Keine Antwort erhalten" });
          return res.status(200).json({ answer });
    } catch (err) {
          return res.status(500).json({ error: String((err && err.message) || err) });
    }
};
