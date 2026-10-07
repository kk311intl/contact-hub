import worker, { readBody } from "./site.js";
import { VisitorCounter as BaseCounter } from "./visitors.js";
import { Analytics, classify, dashboard, STYLES, client, statsFor } from "./analytics.js";
import { adminSessionValid, sameOrigin } from "./auth.js";
import { adminLanguage } from "./config.js";
import { uiFor } from "./i18n.js";

const rootRedirect = () => new Response(null, { status: 303, headers: { Location: "/", "Cache-Control": "no-store" } });
const alias = (request, path) => { const url = new URL(request.url); url.pathname = path; url.search = ""; return new Request(url, request); };

const SHELL = `(async () => {
const mode = document.documentElement.dataset.contactView;
let remembered;
try { remembered = sessionStorage.getItem('contact-view'); } catch {}
if (mode === 'auto' && remembered === 'admin') {
  try {
    const response = await fetch('/', { headers: { 'X-Contact-View': 'admin' }, cache: 'no-store' });
    if (!response.ok) throw new Error('View unavailable');
    const html = await response.text();
    document.open(); document.write(html); document.close();
    return;
  } catch { /* Keep the public page and its entry usable when offline. */ }
}
if (mode !== 'auto') {
  try { sessionStorage.setItem('contact-view', mode); } catch {}
  history.replaceState(null, '', '/');
}
document.querySelectorAll('script[data-shell-src]').forEach(placeholder => {
  const script = document.createElement('script');
  script.type = 'module'; script.src = placeholder.dataset.shellSrc;
  placeholder.replaceWith(script);
});
function view(mode) {
  // Native navigation keeps beforeunload protection; cancelled navigation changes no state.
  const form = document.createElement('form');
  form.method = 'POST'; form.action = '/'; form.hidden = true;
  for (const [name, value] of [['_contact_action', 'view'], ['view', mode]]) {
    const input = document.createElement('input'); input.type = 'hidden';
    input.name = name; input.value = value; form.append(input);
  }
  document.body.append(form); form.requestSubmit(); form.remove();
}
let clicks = 0, started = 0;
document.querySelector('[data-visitors] summary')?.addEventListener('click', event => {
  const now = Date.now();
  if (!clicks || now - started > 5000) { clicks = 0; started = now; }
  if (++clicks === 5) { event.preventDefault(); event.stopImmediatePropagation(); clicks = 0; view('admin'); }
}, true);
document.querySelectorAll('.login-back, .login-mark, .admin-brand, .view-site').forEach(link => link.addEventListener('click', event => {
  event.preventDefault();
  view('public');
}));
})();`;

function shell(response, mode = "auto") {
  if (!response.headers.get("Content-Type")?.includes("text/html")) return response;
  return new HTMLRewriter()
    .on('html', { element(el) { el.setAttribute('data-contact-view', mode); } })
    // Basic public controls load independently; redirects wait until the admin view is resolved.
    .on('script[src="/inapp-redirect.js"]', { element(el) { el.setAttribute('data-shell-src', el.getAttribute('src')); el.removeAttribute('src'); el.setAttribute('type', 'application/x-contact-script'); } })
    .on('form[action="/admin/login"]', { element(el) { el.setAttribute("action", "/"); el.append('<input type="hidden" name="_contact_action" value="login">', { html: true }); } })
    .on('form[action="/admin/logout"]', { element(el) { el.setAttribute("action", "/"); el.append('<input type="hidden" name="_contact_action" value="logout">', { html: true }); } })
    .on("body", { element(el) { el.append('<script src="/admin-shell.js" defer></script>', { html: true }); } })
    .transform(response);
}

async function adminView(request, env, ctx) {
  const get = new Request(request.url, { headers: request.headers });
  const response = await worker.fetch(alias(get, '/admin'), env, ctx);
  if (response.status === 303) {
    await response.body?.cancel();
    return shell(await worker.fetch(alias(get, '/admin/login'), env, ctx), 'admin');
  }
  return shell(response.status === 200 ? adminTabs(response, env.ADMIN_LANGUAGE) : response, 'admin');
}

function adminTabs(response, language) {
  const ui = statsFor(language);
  return new HTMLRewriter()
    .on("head", { element(el) { el.append('<link rel="stylesheet" href="/admin/analytics.css">', { html: true }); } })
    .on(".admin-nav", { element(el) { el.append(`<button type="button" data-section-button="analytics">${ui.title}</button>`, { html: true }); } })
    .on(".admin-main", { element(el) { el.append(`<section class="editor-section" data-section="analytics"><div class="section-heading"><h2 tabindex="-1">${ui.title}</h2><p>${ui.intro}</p></div><div data-analytics-content aria-live="polite"></div></section>`, { html: true }); } })
    .on("body", { element(el) { el.append('<script type="module" src="/admin/analytics.js"></script>', { html: true }); } })
    .transform(response);
}

export class VisitorCounter extends BaseCounter {
  constructor(ctx) {
    super(ctx);
    this.storage = ctx.storage;
  }

  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/analytics") {
      this.analytics ||= new Analytics(this.storage);
      if (this.writeFailure) {
        this.analytics.recordFailure(this.writeFailure);
        this.writeFailure = null;
      }
      return Response.json(this.analytics.report(Number(url.searchParams.get("days"))));
    }
    const input = await request.clone().json();
    const response = await super.fetch(request);
    if (input.analytics) {
      try {
        this.analytics ||= new Analytics(this.storage);
        this.analytics.record(input.analytics);
        if (this.writeFailure) {
          this.analytics.recordFailure(this.writeFailure);
          this.writeFailure = null;
        }
      } catch {
        // Flush once storage recovers; never store the request or error details.
        this.writeFailure = new Date().toISOString();
      }
    }
    return response;
  }
}

export default {
  async fetch(request, env, ctx) {
    try {
      return await fetchRequest(request, env, ctx);
    } catch {
      const message = uiFor(adminLanguage(env.ADMIN_LANGUAGE)).api.serverError;
      const headers = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
      return new URL(request.url).pathname.startsWith('/api/')
        ? Response.json({ error: message }, { status: 500, headers })
        : new Response(message, { status: 500, headers: { ...headers, "Content-Type": "text/plain; charset=utf-8" } });
    }
  }
};

async function fetchRequest(request, env, ctx) {
    const url = new URL(request.url);
    const lang = adminLanguage(env.ADMIN_LANGUAGE);
    const message = uiFor(lang).api;
    const stats = statsFor(lang);
    if (url.pathname === "/admin-shell.js") return new Response(SHELL, { headers: { "Content-Type": "text/javascript; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
    if (["/admin", "/admin/", "/admin/login", "/admin/analytics"].includes(url.pathname) && ["GET", "HEAD"].includes(request.method)) return adminView(request, env, ctx);
    if (url.pathname === "/" && request.method === "POST") {
      if (!sameOrigin(request)) return new Response(message.invalidOrigin, { status: 403 });
      if (!(request.headers.get('Content-Type') || '').toLowerCase().startsWith('application/x-www-form-urlencoded')) return new Response(message.loginFormat, { status: 415 });
      const body = await readBody(request, 4096);
      if (body === null) return new Response(message.bodyTooLarge, { status: 413 });
      const data = new URLSearchParams(body);
      const action = data.get("_contact_action");
      if (action === 'view' && ['admin', 'public'].includes(data.get('view'))) {
        if (data.get('view') === 'admin') return adminView(request, env, ctx);
        return shell(await worker.fetch(new Request(request.url, { headers: request.headers }), env, ctx), 'public');
      }
      if (!["login", "logout"].includes(action)) return new Response(message.notFound, { status: 400 });
      const forwarded = new Request(request.url, { method: 'POST', headers: request.headers, body });
      const response = await worker.fetch(alias(forwarded, `/admin/${action}`), env, ctx);
      const headers = new Headers(response.headers);
      if (response.status === 303) {
        const getHeaders = new Headers(request.headers);
        // Render the next view in this same tab, including when storage is disabled.
        const session = headers.get('Set-Cookie')?.split(';')[0];
        if (session) {
          const cookies = (getHeaders.get('Cookie') || '').split(';').map(value => value.trim()).filter(value => value && !value.startsWith('contact_admin='));
          getHeaders.set('Cookie', [...cookies, session].join('; '));
        }
        const get = new Request(request.url, { headers: getHeaders });
        const next = action === 'login' ? await adminView(get, env, ctx) : shell(await worker.fetch(get, env, ctx), 'public');
        const nextHeaders = new Headers(next.headers);
        for (const cookie of headers.getSetCookie()) nextHeaders.append('Set-Cookie', cookie);
        return new Response(next.body, { status: next.status, headers: nextHeaders });
      }
      return shell(new Response(response.body, { status: response.status, headers }), 'admin');
    }
    if (url.pathname === "/" && ["GET", "HEAD"].includes(request.method) && request.headers.get('X-Contact-View') === 'admin') return adminView(request, env, ctx);
    const analyticsPage = url.pathname === "/api/admin/analytics";
    const analyticsStyle = url.pathname === "/admin/analytics.css";
    const analyticsScript = url.pathname === "/admin/analytics.js";
    if (analyticsPage || analyticsStyle || analyticsScript) {
      // Reuse the existing authentication and session-revocation checks.
      if (!['GET', 'HEAD'].includes(request.method)) return new Response(null, { status: 405, headers: { Allow: 'GET, HEAD', 'Cache-Control': 'no-store' } });
      if (!(await adminSessionValid(request, env))) {
        if (analyticsPage) return new Response(stats.signIn, { status: 401, headers: { "Cache-Control": "no-store" } });
        return rootRedirect();
      }
      const headers = new Headers({ 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Content-Security-Policy': "default-src 'self'; frame-ancestors 'none'; base-uri 'none'", 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY' });
      if (analyticsStyle || analyticsScript) {
        headers.set("Content-Type", analyticsStyle ? "text/css; charset=utf-8" : "text/javascript; charset=utf-8");
        return new Response(request.method === "HEAD" ? null : analyticsStyle ? STYLES : client(lang), { headers });
      }
      let content;
      try {
        const counter = env.VISITOR_COUNTER.get(env.VISITOR_COUNTER.idFromName("site"));
        const result = await counter.fetch(`https://counter.invalid/analytics?days=${[1, 7, 30].includes(Number(url.searchParams.get("days"))) ? Number(url.searchParams.get("days")) : 7}`);
        if (!result.ok) throw new Error("Statistics unavailable");
        content = dashboard(await result.json(), lang);
      } catch {
        return new Response(stats.failed, { status: 503, headers: { "Cache-Control": "no-store" } });
      }
      return new Response(request.method === "HEAD" ? null : content, { headers });
    }
    if (url.pathname === "/" && request.method === "GET" && env.VISITOR_COUNTER) {
      const analytics = classify(request);
      const namespace = env.VISITOR_COUNTER;
      // Add metadata to the existing single counter call, not a second request.
      const extended = { ...env, VISITOR_COUNTER: {
        idFromName: name => namespace.idFromName(name),
        get: id => ({ fetch: (target, options) => namespace.get(id).fetch(target, { ...options, body: JSON.stringify({ ...JSON.parse(options.body), analytics }) }) })
      } };
      return shell(await worker.fetch(request, extended, ctx));
    }
    const response = await worker.fetch(request, env, ctx);
    return url.pathname === "/" ? shell(response) : response;
}
