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

## `shared/config` — environment variables and feature flags

Direct `process.env` reads in slice code are the most common way secrets leak into the
client bundle. The kit's answer: a typed, Zod-parsed config layer in `shared/config/` that's
**split by reachability** (server-only secrets vs. browser-safe public values). Slices import
the typed config; they never touch `process.env` directly.

```ts
// src/shared/config/env.server.ts — server-only. NEVER imported from a client module.
import 'server-only';
import { z } from 'zod';

const ServerEnv = z.object({
  DATABASE_URL: z.string().url(),
  STRIPE_SECRET_KEY: z.string().min(1),
  AUTH_SECRET: z.string().min(32),
  // …everything that must stay on the server.
});

export const env = ServerEnv.parse(process.env);
```

```ts
// src/shared/config/env.client.ts — safe to import from anywhere.
import { z } from 'zod';

// NEXT_PUBLIC_* vars are inlined at build time. Validate them so a missing/empty value
// fails the build instead of crashing at runtime.
const ClientEnv = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
});

export const env = ClientEnv.parse({
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
});
```

```ts
// src/shared/config/flags.ts — feature flags, evaluated server-side from env or a flag service.
import 'server-only';
import { z } from 'zod';

const Flags = z.object({
  newCheckout: z.boolean().default(false),
  betaSearch: z.boolean().default(false),
});

export const flags = Flags.parse({
  newCheckout: process.env.FLAG_NEW_CHECKOUT === '1',
  betaSearch: process.env.FLAG_BETA_SEARCH === '1',
});
```

Rules:

- ❌ **`process.env` accessed anywhere outside `shared/config/`.** Slices import the typed
  config object; the raw env is encapsulated.
- ❌ **`env.server.ts` without `import 'server-only';`** — guarantees the file refuses to
  bundle into the client. The PreToolUse hook ALREADY rejects entity `*.queries.ts` without
  this directive; the same hardening can be extended to `env.server.ts` per repo.
- ❌ **A secret in `env.client.ts` or behind a `NEXT_PUBLIC_*` name.** `NEXT_PUBLIC_*` is
  inlined into the JS bundle; anyone can read it. The name itself is a self-documenting
  promise that the value is safe to expose.
- ❌ **Schema-less env reads** (`const url = process.env.DATABASE_URL!`). The non-null
  assertion turns a missing env var into a 3-AM production crash instead of a build failure.
  Always parse with Zod.
- ❌ **Feature flags read from `process.env` directly inside a slice** — flag evaluation
  belongs to `shared/config/flags.ts`; slices import the typed `flags` object.
- ✅ Two files: `env.server.ts` (server-only, Zod-parsed) and `env.client.ts` (browser-safe,
  Zod-parsed). Both validated at module load — a missing value fails the build, not the page.
- ✅ Server-only `flags.ts` parses runtime flag state once; features read the typed object.
  For per-user flags (LaunchDarkly etc.), `flags.ts` exposes a server function the page
  calls, not direct SDK access from slices.
- ✅ Public client-safe values cross the RSC boundary; secrets never do.

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
