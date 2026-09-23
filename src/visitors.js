const COOKIE_NAME = "contact_visitor";
const COOKIE_AGE = 60 * 60 * 24 * 365 * 5;
const encoder = new TextEncoder();

export class VisitorCounter {
  constructor(ctx) {
    this.sql = ctx.storage.sql;
    this.sql.exec("CREATE TABLE IF NOT EXISTS totals (id INTEGER PRIMARY KEY, visitors INTEGER NOT NULL, day TEXT NOT NULL, daily INTEGER NOT NULL)");
    this.sql.exec("INSERT OR IGNORE INTO totals (id, visitors, day, daily) VALUES (1, 0, '', 0)");
    this.sql.exec("CREATE TABLE IF NOT EXISTS daily_ips (ip TEXT PRIMARY KEY, visits INTEGER NOT NULL)");
  }

  async fetch(request) {
    const { existing, ip, day } = await request.json();
    return Response.json(this.visit(existing, ip, day));
  }

  visit(existing, ip, day) {
    let total = this.sql.exec("SELECT visitors, day, daily FROM totals WHERE id = 1").one();
    if (total.day !== day) {
      this.sql.exec("DELETE FROM daily_ips");
      this.sql.exec("UPDATE totals SET day = ?, daily = 0 WHERE id = 1", day);
      total = { ...total, day, daily: 0 };
    }
    let counted = existing;
    if (!existing && total.daily < 2000) {
      const visits = this.sql.exec("SELECT visits FROM daily_ips WHERE ip = ?", ip).toArray()[0]?.visits || 0;
      if (visits < 30) {
        this.sql.exec("INSERT INTO daily_ips (ip, visits) VALUES (?, 1) ON CONFLICT(ip) DO UPDATE SET visits = visits + 1", ip);
        this.sql.exec("UPDATE totals SET visitors = visitors + 1, daily = daily + 1 WHERE id = 1");
        counted = true;
      }
    }
    return { count: total.visitors + (counted && !existing ? 1 : 0), counted };
  }
}

export async function visitorCookieValid(request, secret) {
  const token = request.headers.get("Cookie")?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${COOKIE_NAME}=`))?.slice(COOKIE_NAME.length + 1) || "";
  const [id, signature, extra] = token.split(".");
  if (!/^[a-f0-9-]{36}$/.test(id || "") || !signature || extra) return false;
  return signature === await sign(id, secret);
}

export async function newVisitorCookie(secret, secure = true) {
  const id = crypto.randomUUID();
  return `${COOKIE_NAME}=${id}.${await sign(id, secret)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${COOKIE_AGE}${secure ? "; Secure" : ""}`;
}

export async function visitorIpHash(request, secret) {
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  return sign(`${new Date().toISOString().slice(0, 10)}:${ip}`, secret);
}

async function sign(value, secret) {
  if (!secret) throw new Error("Missing SESSION_SECRET");
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const bytes = new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(value)));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
