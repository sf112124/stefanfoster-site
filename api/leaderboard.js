// Poké-folio leaderboard. Scores live in a Redis sorted set (Upstash, connected through Vercel Storage).
// GET  /api/leaderboard          -> { ok, top: [{ name, score, look, folio, chats, reels, badge, alysha, lvl }] }
// POST /api/leaderboard {id, name, look, folio, chats, reels, badge, alysha, lvl, team (every level in your folio added up)}
const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const KEY = "pokefolio:board", INFO = "pokefolio:info";
const redis = async (...cmd) => {
  const r = await fetch(URL_, { method: "POST", headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" }, body: JSON.stringify(cmd) });
  const j = await r.json(); if (j.error) throw new Error(j.error); return j.result;
};
const clampInt = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.floor(Number(v) || 0)));
const clean = (s) => String(s || "").replace(/[^\p{L}\p{N} ._'-]/gu, "").trim().slice(0, 12).toUpperCase() || "PLAYER";
const BAD = /fuck|shit|cunt|nigg|fag|rape|nazi|hitler|porn|dick|cock|pussy|whore|slut/i;
module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (!URL_ || !TOKEN) return res.status(200).json({ ok: false, reason: "no-store", top: [] });
  try {
    if (req.method === "POST") {
      const b = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
      const id = String(b.id || "").replace(/[^a-z0-9]/gi, "").slice(0, 24); if (id.length < 8) return res.status(400).json({ ok: false });
      let name = clean(b.name); if (BAD.test(name)) name = "PLAYER";
      const e = { name, look: String(b.look || "").replace(/[^a-z0-9_-]/gi, "").slice(0, 24), folio: clampInt(b.folio, 0, 9), chats: clampInt(b.chats, 0, 30), reels: clampInt(b.reels, 0, 8), badge: b.badge ? 1 : 0, alysha: b.alysha ? 1 : 0, lvl: clampInt(b.lvl, 1, 40), team: clampInt(b.team, 0, 1200) };
      const score = e.folio * 100 + e.chats * 40 + e.reels * 25 + e.badge * 300 + e.alysha * 600 + e.lvl * 5 + e.team * 3;
      const prev = await redis("ZSCORE", KEY, id);
      if (prev == null || score >= Number(prev)) { await redis("ZADD", KEY, score, id); await redis("HSET", INFO, id, JSON.stringify({ ...e, score })); }
      return res.status(200).json({ ok: true, score });
    }
    const ids = await redis("ZREVRANGE", KEY, 0, 19);
    const infos = ids.length ? await redis("HMGET", INFO, ...ids) : [];
    const top = infos.map((s) => { try { return JSON.parse(s); } catch (e) { return null; } }).filter(Boolean);
    return res.status(200).json({ ok: true, top });
  } catch (err) { return res.status(200).json({ ok: false, reason: "error", top: [] }); }
};
