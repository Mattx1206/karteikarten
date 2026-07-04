// Vercel Serverless Function: erstellt Karteikarten aus Lerntext (Anthropic API)
const MODEL = "claude-haiku-4-5";

module.exports = async (req, res) => {
    if (req.method !== "POST") return res.status(405).json({ error: "Nur POST erlaubt" });

    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) return res.status(501).json({ error: "ANTHROPIC_API_KEY ist nicht konfiguriert" });

    let text = req.body && req.body.text;
    if (typeof text !== "string" || !text.trim()) return res.status(400).json({ error: "Kein Text übergeben" });
    text = text.slice(0, 15000);

    const prompt = "Du bist ein Lern-Assistent. Erstelle aus dem folgenden Lernmaterial deutsche Karteikarten (Frage-Antwort-Paare).\nRegeln:\n- Wenn der Text bereits Fragen enthält, übernimm sie und formuliere vollständige, korrekte Antworten (auch für unbeantwortete Fragen).\n- Sonst erstelle sinnvolle Fragen zu den wichtigsten Fakten und Konzepten.\n- Antworten kurz, präzise und prüfungstauglich.\n- Antworte AUSSCHLIESSLICH mit einem JSON-Array, ohne weiteren Text, im Format:\n[{\"q\":\"Frage\",\"a\":\"Antwort\"}]\n\nLERNMATERIAL:\n" + text;

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
                            max_tokens: 4000,
                            messages: [{ role: "user", content: prompt }]
                  })
          });
          if (!r.ok) {
                  const detail = (await r.text()).slice(0, 300);
                  return res.status(502).json({ error: "KI-Dienst-Fehler (" + r.status + ")", detail });
          }
          const data = await r.json();
          const out = (data.content || []).map(c => c.text || "").join("");
          const s = out.indexOf("["), e = out.lastIndexOf("]");
          if (s < 0 || e <= s) return res.status(500).json({ error: "Keine Karten im KI-Ergebnis gefunden" });

      let cards;
          try { cards = JSON.parse(out.slice(s, e + 1)); }
          catch (err) { return res.status(500).json({ error: "KI-Antwort konnte nicht gelesen werden" }); }

      cards = (Array.isArray(cards) ? cards : [])
            .map(c => ({
                      q: String((c && (c.q || c.frage || c.question)) || "").trim(),
                      a: String((c && (c.a || c.antwort || c.answer)) || "").trim()
            }))
            .filter(c => c.q);

      return res.status(200).json({ cards });
    } catch (err) {
          return res.status(500).json({ error: String((err && err.message) || err) });
    }
};
