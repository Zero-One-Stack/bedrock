# Rule: Frontend Security

> **Non-negotiable.** A frontend is an attacker-facing surface. These are the baseline controls
> for every project; a violation is a Blocker in review. This rule covers **client-side** risk
> (XSS, secrets, auth handling, dependencies); server/API hardening lives with the backend.

## The bans (a reviewer fails the change on any)

- ❌ **Injecting un-sanitized HTML** (React's raw-HTML escape hatch). If HTML truly must be
  rendered, sanitize first (e.g. DOMPurify) and justify it in `project-specifics.md`. Never feed
  the raw-HTML prop user input, API data, or URL params directly. Prefer rendering text, not HTML.
- ❌ **Secrets in client code.** Anything in the browser bundle is public. No API keys, tokens, or
  credentials in client components or `NEXT_PUBLIC_*` env vars unless the value is genuinely public.
  Server-only secrets stay in server code / server env, never shipped to the client.
- ❌ **Building URLs/HTML/queries by string-concatenating user input.** Use the platform (URL APIs,
  parameterized requests); validate input with Zod at the boundary (see `services-and-data.md`).
- ❌ **`href`/`src` from untrusted data without scheme-checking** (`javascript:` URL injection).
  Allow only `http(s):`/`mailto:`/relative; reject the rest.
- ❌ **`target="_blank"` without `rel="noopener noreferrer"`** (reverse-tabnabbing).
- ❌ **Tokens in `localStorage`** when the app is XSS-reachable. Prefer httpOnly, Secure,
  SameSite cookies for session/auth; if a store must hold a token, document the threat model.
- ❌ **Logging PII or secrets** (reinforces `typescript-and-quality.md`). No tokens, no personal data.
- ❌ **Adding a dependency without vetting it** — see below.

## Auth & session (client side)

- The client **reflects** auth state; it does not enforce it. Real authorization is server-side.
  Never gate sensitive data by hiding UI alone — the data must be protected at the API.
- Read session from the agreed mechanism (httpOnly cookie + a server check, or the provider's
  hook); don't hand-roll token parsing. Record the project's model in `project-specifics.md` → *Auth*.
- Handle expiry/refresh through the data layer (React Query + the auth client), not ad-hoc in components.
- Protected routes/segments: guard on the server (middleware / Server Component check), not only client redirects.

## Dependencies (supply chain)

- **Vet before adding:** is it maintained, widely used, reasonably sized, and does it actually
  need to run in the client bundle? Prefer the platform or an existing dep over a new one.
- Don't add a dep to save a few lines; each one is attack surface and bundle weight (ties to `performance.md`).
- Keep `npm audit` / the repo's audit step clean; address advisories, don't suppress them.
- "Always latest, never pin" (`CLAUDE.md`) is for *intentional* currency — still verify the
  package is legitimate (not a typosquat) and review what a major bump changes.

## Rendering & Next.js specifics

- Sanitize any HTML you must inject; default to rendering as text.
- Be deliberate about what crosses the server→client boundary — **don't pass secrets or full
  server objects into client components** as props; pass only what the client needs.
- Consider a Content-Security-Policy (via headers/middleware) for apps handling sensitive data;
  note the project's stance in `project-specifics.md`.
- Validate and escape data going into `<script>`/JSON embedded in the document.

## Checklist — a security-relevant change is "done" when

- [ ] No un-sanitized raw-HTML injection; user/API HTML sanitized or rendered as text.
- [ ] No secrets in client bundle / `NEXT_PUBLIC_*`; server secrets stay server-side.
- [ ] External `href`/`src` scheme-checked; `_blank` links have `rel="noopener noreferrer"`.
- [ ] Auth state read from the sanctioned mechanism; sensitive data protected at the API, not just hidden.
- [ ] Any new dependency vetted (maintained, needed, legit); audit clean.
- [ ] No PII/secrets logged.

## Sources
- [OWASP — Cross-Site Scripting Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [OWASP — DOM-based XSS Prevention](https://cheatsheetseries.owasp.org/cheatsheets/DOM_based_XSS_Prevention_Cheat_Sheet.html)
- [Next.js — Content Security Policy](https://nextjs.org/docs/app/guides/content-security-policy)
