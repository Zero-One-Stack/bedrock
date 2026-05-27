# Rule: Observability — errors, monitoring, analytics

> **Non-negotiable.** A shipped frontend tells you when it breaks and how it's used — without
> leaking PII. Every app has **error boundaries** so a failure degrades gracefully, an **error
> tracker** so failures reach you, and **analytics** that never log personal data.

## Why

Errors that only show as a blank screen, and features you can't tell are used, are invisible
failures. Observability is the feedback loop that keeps the other rules honest in production.

## Error boundaries (graceful failure)

- **Next.js route errors:** an `error.tsx` beside each route segment (and `global-error.tsx` at
  the root) catches render errors so the user sees a recovery UI, not a white screen. Pair with
  the `loading.tsx`/`error.tsx` the architect already plans (`architecture.md`).
- **Component-level boundaries** around risky/independent regions (a widget, a third-party embed)
  so one failure doesn't take down the page.
- The fallback UI is **accessible** (`role="alert"`, a real retry control — `accessibility.md`)
  and **i18n'd** (`i18n.md`), with a way to recover (retry / navigate away).
- ❌ Swallowing errors silently (empty `catch`, `catch` that only `console.log`s). Report it.

## Error & performance tracking

- Wire an error tracker (commonly **Sentry**) once, at the app root, via the provider's official
  setup. Capture unhandled errors + the error-boundary catches; record release/version for triage.
- Capture enough context to debug (route, action) but **scrub PII** (`beforeSend` / data
  scrubbing) — no emails, tokens, health/financial data in the payload.
- Track Core Web Vitals in the field (`performance.md`) — `next/third-parties` or the tracker's
  Web-Vitals integration — so LCP/INP/CLS are measured on real users, not just in the lab.
- Record the chosen tracker + DSN location (env, not committed) in `project-specifics.md`.

## Analytics & logging

- Analytics events are **named by intent** and carry **no PII**. Get consent where required
  (the project's privacy stance goes in `project-specifics.md`).
- Frontend logging stays minimal: no committed `console.log` (`typescript-and-quality.md`),
  dev-only logging behind `NODE_ENV`, and **never** secrets or personal data in logs.
- Don't block render or hurt INP with analytics — load trackers via `next/script`/`next/third-parties`
  with a non-blocking strategy.

## Hard rules

- ❌ A route/app with **no error boundary** (white-screen on failure).
- ❌ Silent error swallowing; `catch` that hides the failure.
- ❌ **PII or secrets** in error reports, analytics events, or logs.
- ❌ Render-blocking or INP-harming analytics/3rd-party scripts.
- ✅ `error.tsx` per segment + root; accessible, i18n'd, recoverable fallback.
- ✅ Error tracker wired with release + PII scrubbing; field Web-Vitals captured.

## Checklist — an app/feature is observable when

- [ ] Each route segment has `error.tsx`; root has `global-error.tsx`; risky regions are wrapped.
- [ ] Error tracker captures unhandled + boundary errors, tagged with release, PII scrubbed.
- [ ] Field Web-Vitals reported.
- [ ] Analytics events are intent-named, PII-free, non-blocking; logging carries no PII/secrets.

## Sources
- [Next.js — Error Handling (`error.tsx` / `global-error.tsx`)](https://nextjs.org/docs/app/getting-started/error-handling)
- [Sentry — Next.js setup](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [web.dev — Measure Web Vitals in the field](https://web.dev/articles/vitals-field-measurement-best-practices)
