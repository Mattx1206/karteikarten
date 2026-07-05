// Vercel Serverless Function: liefert Besucherstatistiken fuer das Admin-Dashboard (passwortgeschuetzt)
const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

async function redis(cmds) {
    const r = await fetch(URL_ + "/pipeline", {
          method: "POST",
          headers: { "Authorization": "Bearer " + TOKEN, "Content-Type": "application/json" },
          body: JSON.stringify(cmds)
    });
    if (!r.ok) throw new Error("Redis " + r.status);
    return r.json();
}

module.exports = async (req, res) => {
    const admin = process.env.ADMIN_KEY;
    if (!admin) return res.status(501).json({ error: "ADMIN_KEY ist nicht konfiguriert (Vercel: Settings -> Environment Variables)" });
    const given = req.headers["x-admin-key"];
    if (given !== admin) return res.status(401).json({ error: "Falsches Passwort" });
    if (!URL_ || !TOKEN) return res.status(501).json({ error: "Datenbank nicht verbunden (Vercel: Storage -> Upstash Redis anlegen)" });

    const now = Math.floor(Date.now() / 1000);
    const days = [];
    for (let i = 13; i >= 0; i--) days.push(new Date(Date.now() - i * 86400000).toISOString().slice(0, 10));

    const base = [
          ["ZREMRANGEBYSCORE", "online", "-inf", String(now - 75)],
          ["ZRANGE", "online", "0", "-1"],
          ["GET", "stat:sessions"],
          ["GET", "stat:duration"]
        ].concat(days.map(d => ["SCARD", "day:" + d]));

    try {
          const r1 = await redis(base);
          const onlineSids = r1[1].result || [];
          const total = parseInt(r1[2].result || "0", 10);
          const durationTotal = parseInt(r1[3].result || "0", 10);
          const tage = days.map((d, i) => ({ datum: d, besucher: Number(r1[4 + i].result || 0) }));

      let online = [];
          if (onlineSids.length) {
                  const r2 = await redis(onlineSids.slice(0, 100).map(s => ["HGETALL", "sess:" + s]));
                  online = r2.map((x, i) => {
                            const h = x.result || [];
                            const o = {};
                            for (let j = 0; j < h.length; j += 2) o[h[j]] = h[j + 1];
                            return {
                                        id: onlineSids[i].slice(0, 8),
                                        ip: o.ip || "unbekannt",
                                        aktivSeitSek: o.start ? Math.max(0, now - parseInt(o.start, 10)) : null,
                                        zuletztVorSek: o.last ? Math.max(0, now - parseInt(o.last, 10)) : null
                            };
                  });
          }

      return res.status(200).json({
              gesamtBesuche: total,
              heute: tage[tage.length - 1].besucher,
              geradeOnline: online.length,
              durchschnittSek: total ? Math.round(durationTotal / total) : 0,
              tage,
              online
      });
    } catch (err) {
          return res.status(500).json({ error: String((err && err.message) || err) });
    }
};
