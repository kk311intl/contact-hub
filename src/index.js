import { CONFIG_KEY, DEFAULT_CONFIG, MAX_BODY_BYTES, adminLanguage, detectLanguage, normalizeConfig, validateConfig } from "./config.js";
import { AUTH_KEY, clearSessionCookie, createPasswordRecord, createSession, credentialsValid, sameOrigin, sessionCookie, sessionValid } from "./auth.js";
import { renderAdmin, renderForbidden, renderHome, renderLogin, renderNotFound } from "./render.js";
import { uiFor } from "./i18n.js";
import { newVisitorCookie, visitorCookieValid, visitorIpHash } from "./visitors.js";
export { VisitorCounter } from "./visitors.js";

const securityHeaders = {
  "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' https: data:; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()"
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const lang = adminLanguage(env.ADMIN_LANGUAGE);
    const message = uiFor(lang).api;
    try {
      if (url.pathname === "/api/profile") return request.method === "GET" ? json(await loadConfig(env), 200, { "Cache-Control": "no-store" }) : methodNotAllowed("GET", lang);
      if (url.pathname === "/api/admin/config") return handleAdminApi(request, env, url, lang);
      if (url.pathname === "/api/admin/password") return handlePasswordApi(request, env, url, lang);
      if (url.pathname === "/admin/login") return handleLogin(request, env, url, lang);
      if (url.pathname === "/admin/logout") return handleLogout(request, url, lang);
      if (url.pathname === "/admin" || url.pathname === "/admin/") {
        if (request.method !== "GET" && request.method !== "HEAD") return methodNotAllowed("GET, HEAD", lang);
        if (!(await adminSessionValid(request, env))) return redirect("/admin/login");
        return html(renderAdmin(await loadConfig(env), lang), 200, { "Cache-Control": "no-store" });
      }
      if (url.pathname === "/" && (request.method === "GET" || request.method === "HEAD")) {
        const config = await loadConfig(env);
        const publicLang = detectLanguage(request.headers.get("Accept-Language") || "");
        const headers = { "Cache-Control": "no-store" };
        let visitorCount = null;
        if (request.method === "GET" && env.VISITOR_COUNTER) {
          try {
            const existing = await visitorCookieValid(request, env.SESSION_SECRET);
            const ip = await visitorIpHash(request, env.SESSION_SECRET);
            const stub = env.VISITOR_COUNTER.get(env.VISITOR_COUNTER.idFromName("site"));
            const response = await stub.fetch("https://counter.invalid/visit", { method: "POST", body: JSON.stringify({ existing, ip, day: new Date().toISOString().slice(0, 10) }) });
            const result = await response.json();
            visitorCount = result.count;
            if (result.counted && !existing) headers["Set-Cookie"] = await newVisitorCookie(env.SESSION_SECRET, url.protocol === "https:");
          } catch (error) {
            console.error("Visitor counter failed", error instanceof Error ? error.message : "Unknown error");
          }
        }
        return html(renderHome(config, publicLang, url.origin, visitorCount, env.LEGACY_PUBLIC_UI === "true"), 200, headers);
      }
      const asset = await env.ASSETS.fetch(request);
      if (asset.status !== 404) return withSecurity(asset);
      if (url.pathname.startsWith("/api/")) return json({ error: message.notFound }, 404);
      return html(renderNotFound(detectLanguage(request.headers.get("Accept-Language") || "")), 404);
    } catch (error) {
      console.error("Request failed", error instanceof Error ? error.message : "Unknown error");
      return url.pathname.startsWith("/api/") ? json({ error: message.serverError }, 500) : html(renderNotFound(url.pathname.startsWith("/admin") ? lang : detectLanguage(request.headers.get("Accept-Language") || "")), 500);
    }
  }
};

async function handleAdminApi(request, env, url, lang) {
  const message = uiFor(lang).api;
  if (!(await adminSessionValid(request, env))) return json({ error: message.unauthorized }, 401);
  if (request.method === "GET") return json(await loadConfig(env), 200, { "Cache-Control": "no-store" });
  if (request.method !== "PUT") return methodNotAllowed("GET, PUT", lang);
  if (!sameOrigin(request)) return json({ error: message.invalidOrigin }, 403);
  const contentType = request.headers.get("Content-Type") || "";
  if (!contentType.toLowerCase().startsWith("application/json")) return json({ error: message.jsonRequired }, 415);
  const declaredLength = Number(request.headers.get("Content-Length") || 0);
  if (declaredLength > MAX_BODY_BYTES) return json({ error: message.bodyTooLarge }, 413);
  const bodyText = await request.text();
  if (new TextEncoder().encode(bodyText).byteLength > MAX_BODY_BYTES) return json({ error: message.bodyTooLarge }, 413);
  let candidate;
  try { candidate = JSON.parse(bodyText); } catch { return json({ error: message.invalidJson }, 400); }
  const config = normalizeConfig(candidate);
  const errors = validateConfig(config, lang);
  if (errors.length) return json({ error: message.validationFailed, details: errors }, 400);
  await env.PROFILE_KV.put(CONFIG_KEY, JSON.stringify(config));
  return json(config, 200, { "Cache-Control": "no-store" });
}

async function loadConfig(env) {
  const stored = await env.PROFILE_KV.get(CONFIG_KEY, "json");
  return stored ? normalizeConfig(stored) : normalizeConfig(DEFAULT_CONFIG);
}

async function handleLogin(request, env, url, lang) {
  const message = uiFor(lang).api;
  if (request.method === "GET" || request.method === "HEAD") {
    if (await adminSessionValid(request, env)) return redirect("/admin");
    return html(renderLogin(await loadConfig(env), "", lang), 200, { "Cache-Control": "no-store" });
  }
  if (request.method !== "POST") return methodNotAllowed("GET, HEAD, POST", lang);
  const config = await loadConfig(env);
  if (!sameOrigin(request)) return html(renderLogin(config, message.loginOrigin, lang), 403, { "Cache-Control": "no-store" });
  const length = Number(request.headers.get("Content-Length") || 0);
  if (length > 4096) return html(renderLogin(config, message.loginTooLarge, lang), 413, { "Cache-Control": "no-store" });
  const type = request.headers.get("Content-Type") || "";
  if (!type.toLowerCase().startsWith("application/x-www-form-urlencoded")) return html(renderLogin(config, message.loginFormat, lang), 415, { "Cache-Control": "no-store" });
  const body = await request.text();
  if (new TextEncoder().encode(body).byteLength > 4096) return html(renderLogin(config, message.loginTooLarge, lang), 413, { "Cache-Control": "no-store" });
  const data = new URLSearchParams(body);
  const password = String(data.get("password") || "");
  const auth = await loadAuth(env);
  if (!(await credentialsValid(password, env, auth))) return html(renderLogin(config, message.passwordWrong, lang), 401, { "Cache-Control": "no-store" });
  const token = await createSession(env.SESSION_SECRET);
  return redirect("/admin", { "Set-Cookie": sessionCookie(token, url.protocol === "https:") });
}

async function handlePasswordApi(request, env, url, lang) {
  const message = uiFor(lang).api;
  if (!(await adminSessionValid(request, env))) return json({ error: message.unauthorized }, 401);
  if (request.method !== "POST") return methodNotAllowed("POST", lang);
  if (!sameOrigin(request)) return json({ error: message.invalidOrigin }, 403);
  if (!(request.headers.get("Content-Type") || "").toLowerCase().startsWith("application/json")) return json({ error: message.jsonRequired }, 415);
  const body = await request.text();
  if (new TextEncoder().encode(body).byteLength > 4096) return json({ error: message.bodyTooLarge }, 413);
  let input;
  try { input = JSON.parse(body); } catch { return json({ error: message.invalidJson }, 400); }
  const currentPassword = typeof input.currentPassword === "string" ? input.currentPassword : "";
  const newPassword = typeof input.newPassword === "string" ? input.newPassword : "";
  if (!newPassword) return json({ error: message.newPasswordEmpty }, 400);
  const auth = await loadAuth(env);
  if (!(await credentialsValid(currentPassword, env, auth))) return json({ error: message.currentPasswordWrong }, 400);
  const record = await createPasswordRecord(newPassword);
  await env.PROFILE_KV.put(AUTH_KEY, JSON.stringify(record));
  return json({ ok: true }, 200, { "Set-Cookie": clearSessionCookie(url.protocol === "https:"), "Cache-Control": "no-store" });
}

async function handleLogout(request, url, lang) {
  if (request.method !== "POST") return methodNotAllowed("POST", lang);
  if (!sameOrigin(request)) return html(renderForbidden(lang), 403);
  return redirect("/", { "Set-Cookie": clearSessionCookie(url.protocol === "https:") });
}

async function adminSessionValid(request, env) {
  const auth = await loadAuth(env);
  return sessionValid(request, env.SESSION_SECRET, auth?.changedAt || 0);
}

async function loadAuth(env) {
  const stored = await env.PROFILE_KV.get(AUTH_KEY, "json");
  return stored && typeof stored === "object" ? stored : null;
}

function html(body, status = 200, extra = {}) {
  return new Response(body, { status, headers: { "Content-Type": "text/html; charset=utf-8", ...securityHeaders, ...extra } });
}
function json(body, status = 200, extra = {}) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json; charset=utf-8", ...securityHeaders, ...extra } });
}
function methodNotAllowed(allow, lang) { return json({ error: lang === "zh-TW" ? "不支援此請求方法" : lang === "ja" ? "この操作は許可されていません" : "Method not allowed" }, 405, { Allow: allow }); }
function redirect(location, headers = {}) { return new Response(null, { status: 303, headers: { Location: location, ...securityHeaders, ...headers } }); }
function withSecurity(response) { const headers = new Headers(response.headers); Object.entries(securityHeaders).forEach(([key, value]) => headers.set(key, value)); return new Response(response.body, { status: response.status, statusText: response.statusText, headers }); }
