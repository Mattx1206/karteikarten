// Vercel Serverless Function: bewertet eine eingetippte/eingesprochene Antwort (Anthropic API)
const MODEL = "claude-haiku-4-5";

module.exports = async (req, res) => {
    if (req.method !== "POST") return res.status(405).json({ error: "Nur POST erlaubt" });

    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) return res.status(501).json({ error: "ANTHROPIC_API_KEY ist nicht konfiguriert" });

    const question = String((req.body && req.body.question) || "").slice(0, 1000);
    const correct = String((req.body && req.body.correct) || "").slice(0, 3000);
    const user = String((req.body && req.body.user) || "").slice(0, 3000);
    if (!question || !correct || !user) return res.status(400).json({ error: "question, correct und user werden benötigt" });

    const prompt = "Du bist ein fairer Lehrer. Vergleiche die Schülerantwort mit der Musterlösung.\nFrage: " + question + "\nMusterlösung: " + correct + "\nSchülerantwort: " + user + "\nIst die Schülerantwort inhaltlich im Wesentlichen richtig? Andere Formulierungen sowie Sprech- oder Tippfehler sind ok - es zählt der Inhalt.\nAntworte NUR mit JSON: {\"richtig\": true, \"feedback\": \"ein kurzer Satz Begründung\"}";

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
                            max_tokens: 300,
                            messages: [{ role: "user", content: prompt }]
                  })
          });
          if (!r.ok) {
                  const detail = (await r.text()).slice(0, 300);
                  return res.status(502).json({ error: "KI-Dienst-Fehler (" + r.status + ")", detail });
          }
          const data = await r.json();
          const out = (data.content || []).map(c => c.text || "").join("");
          const s = out.indexOf("{"), e = out.lastIndexOf("}");
          if (s < 0 || e <= s) return res.status(500).json({ error: "Unerwartetes KI-Ergebnis" });

      let j;
          try { j = JSON.parse(out.slice(s, e + 1)); }
          catch (err) { return res.status(500).json({ error: "KI-Antwort konnte nicht gelesen werden" }); }

      return res.status(200).json({
              correct: !!(j.richtig !== undefined ? j.richtig : j.correct),
              feedback: String(j.feedback || "")
      });
    } catch (err) {
          return res.status(500).json({ error: String((err && err.message) || err) });
    }
};
