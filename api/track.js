// Vercel Serverless Function: erfasst anonyme Besucher-Sessions + dauerhaften IP-Verlauf in Upstash Redis (v2)
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
  if (req.method !== "POST") return res.status(405).json({ error: "Nur POST erlaubt" });
  if (!URL_ || !TOKEN) return res.status(200).json({ ok: false }); // Tracking nicht konfiguriert - App laeuft trotzdem

  const sid = String((req.body && req.body.sid) || "").replace(/[^a-z0-9]/gi, "").slice(0, 40);
  const event = (req.body && req.body.event) === "start" ? "start" : "beat";
  if (!sid) return res.status(400).json({ error: "sid fehlt" });

  const h = req.headers;
  const ip = String(h["x-forwarded-for"] || "").split(",")[0].trim() || "unbekannt";
  const land = h["x-vercel-ip-country"] || "";
  const stadt = decodeURIComponent(h["x-vercel-ip-city"] || "").replace(/\+/g, " ");
  const now = Math.floor(Date.now() / 1000);
  const day = new Date().toISOString().slice(0, 10);

  const cmds = [
    ["ZADD", "online", String(now), sid],
    ["HSET", "sess:" + sid, "ip", ip, "last", String(now), "land", land, "stadt", stadt],
    ["HSETNX", "sess:" + sid, "start", String(now)],
    ["EXPIRE", "sess:" + sid, "86400"],
    ["SADD", "day:" + day, sid],
    ["EXPIRE", "day:" + day, "7776000"]
  ];
  if (event === "start") {
    cmds.push(["INCR", "stat:sessions"]);
    // Dauerhafter Besucher-Verlauf (neueste zuerst, max. 1000 Eintraege)
    cmds.push(["LPUSH", "visitlog", JSON.stringify({ ts: now, ip, land, stadt })]);
    cmds.push(["LTRIM", "visitlog", "0", "999"]);
    // Zaehler pro IP (fuer "haeufigste Besucher")
    cmds.push(["ZINCRBY", "ipcount", "1", ip]);
  } else {
    cmds.push(["INCRBY", "stat:duration", "20"]);
  }

  try { await redis(cmds); return res.status(200).json({ ok: true }); }
  catch (err) { return res.status(200).json({ ok: false }); }
};
