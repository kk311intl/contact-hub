const COOKIE_NAME = "contact_admin";
const SESSION_SECONDS = 12 * 60 * 60;
export const AUTH_KEY = "admin_auth";
const PASSWORD_ITERATIONS = 100_000;

export async function credentialsValid(password, env, stored = null) {
  if (!password) return false;
  if (stored) return verifyPassword(password, stored);
  if (!env.ADMIN_PASSWORD) return false;
  const [actual, expected] = await Promise.all([
    digest(password),
    digest(env.ADMIN_PASSWORD)
  ]);
  return constantTimeEqual(actual, expected);
}

export async function createSession(secret, now = Date.now(), revision = "") {
  if (!secret) throw new Error("Missing SESSION_SECRET");
  const issued = Math.floor(now / 1000);
  const expires = Math.floor(now / 1000) + SESSION_SECONDS;
  const payload = `v1.${issued}.${expires}`;
  return `${payload}.${await sign(payload, sessionKey(secret, revision))}`;
}

export async function sessionValid(request, secret, minimumIssued = 0, now = Date.now(), revision = "") {
  if (!secret) return false;
  const token = readCookie(request.headers.get("Cookie") || "", COOKIE_NAME);
  const [version, issuedText, expiresText, signature, extra] = token?.split(".") || [];
  if (version !== "v1" || extra || !/^\d+$/.test(issuedText || "") || !/^\d+$/.test(expiresText || "") || !signature) return false;
  const issued = Number(issuedText);
  const expires = Number(expiresText);
  if (!Number.isSafeInteger(issued) || issued < minimumIssued || !Number.isSafeInteger(expires) || expires <= Math.floor(now / 1000)) return false;
  const expected = await sign(`${version}.${issuedText}.${expiresText}`, sessionKey(secret, revision));
  return constantTimeEqual(new TextEncoder().encode(signature), new TextEncoder().encode(expected));
}

export async function createPasswordRecord(password, now = Date.now()) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return {
    salt: base64Url(salt),
    hash: base64Url(await derivePassword(password, salt, PASSWORD_ITERATIONS)),
    iterations: PASSWORD_ITERATIONS,
    changedAt: Math.floor(now / 1000),
    sessionRevision: crypto.randomUUID()
  };
}

function sessionKey(secret, revision) {
  return revision ? `${secret}:${revision}` : secret;
}

export async function loadAuth(env) {
  const stored = await env.PROFILE_KV.get(AUTH_KEY, "json");
  return stored && typeof stored === "object" ? stored : null;
}

export async function adminSessionValid(request, env) {
  const auth = await loadAuth(env);
  return sessionValid(request, env.SESSION_SECRET, auth?.changedAt || 0, Date.now(), auth?.sessionRevision || "");
}

async function verifyPassword(password, record) {
  if (!record || typeof record.salt !== "string" || typeof record.hash !== "string" || !Number.isInteger(record.iterations) || record.iterations < 50_000 || record.iterations > 500_000) return false;
  let salt;
  try { salt = fromBase64Url(record.salt); } catch { return false; }
  const actual = new TextEncoder().encode(base64Url(await derivePassword(password, salt, record.iterations)));
  return constantTimeEqual(actual, new TextEncoder().encode(record.hash));
}

export function sessionCookie(token, secure = true) {
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_SECONDS}${secure ? "; Secure" : ""}`;
}

export function clearSessionCookie(secure = true) {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure ? "; Secure" : ""}`;
}

export function sameOrigin(request) {
  const origin = request.headers.get("Origin");
  return Boolean(origin) && origin === new URL(request.url).origin;
}

async function sign(payload, secret) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return base64Url(new Uint8Array(signature));
}

async function digest(value) {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
}

function constantTimeEqual(left, right) {
  if (left.length !== right.length) return false;
  let different = 0;
  for (let index = 0; index < left.length; index += 1) different |= left[index] ^ right[index];
  return different === 0;
}

function base64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - value.length % 4) % 4);
  const binary = atob(base64);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function derivePassword(password, salt, iterations) {
  const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, material, 256));
}

function readCookie(header, name) {
  for (const part of header.split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return value.join("=");
  }
  return "";
}
