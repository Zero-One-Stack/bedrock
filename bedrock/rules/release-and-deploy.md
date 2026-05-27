# Rule: Release, Deploy & the Server Surface ⛨

> **Non-negotiable (enterprise overlay).** Shipping is part of the architecture, not an afterthought
> bolted on at the end. Every system has a defined **promotion path** (where code goes from merge to
> production), a **rollback** that's faster than a fix-forward, and **feature flags** to decouple
> deploy from release. And in Next.js the **server surface** (Route Handlers, Server Actions, the
> BFF boundary) is real application code that the constitution governs — it is not "just config."

## Why this exists

`ci.md` gets a change *merged* (the green gate). It says nothing about what happens *after* merge:
which environments it flows through, how a bad deploy is reverted, how a feature is turned on for
10% of users without a redeploy. For independently-deployed, multi-team systems
(`monorepo-architecture.md` Tier 2/3) this is load-bearing — deploys aren't atomic
(`contracts-and-versioning.md`), so the *release* discipline is what keeps a partial rollout from
becoming an outage. And because Next.js App Router blurs client/server, the API surface it owns must
be governed like any other code, or security and boundaries leak through the back door.

---

## Part 1 — Release & deploy

### Environments & promotion

- A defined path: **PR preview → staging → production** (names/stages are repo-specific — Recon).
  Each environment is reproducible from the same artifact; **build once, promote the same build** —
  don't rebuild per environment (rebuilds drift).
- **Deploy ≠ release.** Ship code dark behind a flag; *release* by flipping the flag. This lets the
  deploy be boring and the release be controlled.
- Record the provider + promotion path + environment list in `project-specifics.md`.

### Feature flags (decouple deploy from release)

- New/risky behavior ships behind a flag, default **off** in production. Turn it on progressively.
- Flags are **temporary by default** — a shipped, fully-rolled-out flag is debt; give it a removal
  date (a time-boxed entry, like a waiver — `governance.md`). A permanent flag is a config switch and
  should be named/owned as one.
- Don't branch core architecture on a flag long-term; flags gate *features*, not *boundaries*.

### Progressive rollout & rollback

- **Canary / progressive rollout** for anything user-facing at scale: a small % first, watch the
  signals (`observability.md` — error rate, Web-Vitals, the key funnel), then widen. Automate the
  rollback trigger on a signal breach where the platform supports it.
- **Rollback is the first response, not fix-forward.** A revert/redeploy-previous must be faster than
  diagnosing in prod. Keep the previous artifact deployable. Practice it.
- **Forward-compatible data:** a deploy that changed a contract or data shape must be rollback-safe —
  which is exactly why breaking changes go expand→migrate→contract (`contracts-and-versioning.md`),
  so rolling back the producer doesn't strand the consumers.

### Independent deploys (Tier 2/3)

- Each zone/remote deploys on its **own cadence**; a failed deploy of one must not take down others
  (`monorepo-architecture.md`). The shared contract is the only coupling (`contracts-and-versioning.md`).
- Prefer **`affected`** pipelines — only changed apps build/test/deploy.

---

## Part 2 — The server surface (Route Handlers, Server Actions, the BFF boundary)

Next.js App Router code runs on the server too. That code is governed — it's where auth, secrets,
and data-source access actually live.

### Where server code lives & what it may do

- **Route Handlers** (`app/**/route.ts`) and **Server Actions** (`'use server'`) are the app's API
  surface. Keep them **thin**: validate input, call a service/domain function, return. **No business
  logic inline** — same discipline as a route `page.tsx` composing features (`architecture.md`).
- A **BFF / API surface is a contract** (`contracts-and-versioning.md`) — version it, own it
  (`team-ownership.md`), and document it in the system architecture (`system-architecture.md` §4).
- Server-side data fetching calls the service `api/` functions directly; client interactivity uses
  the React Query hooks (`services-and-data.md`). One data layer, two entry points — don't fork it.

### Security at the server boundary (defers to `security.md`)

- **Validate every input with Zod at the server boundary** — a Server Action / Route Handler is a
  public entry point; never trust the caller. Treat a Server Action like a POST endpoint.
- **Authn/authz on every server entry point** — do not assume the client checked. Secrets stay
  server-only (never `NEXT_PUBLIC_*`); the deny-list keeps the agent out of secret files
  (`governance.md`).
- A Server Action is **callable by anyone who can reach the page** — re-check permissions inside it.

---

## Hard rules

- ❌ A multi-team / independently-deployed system with **no defined promotion path or rollback** —
  "deploy = merge to main and hope" doesn't scale past one team.
- ❌ **Rebuilding per environment** instead of promoting one artifact (introduces env drift).
- ❌ A **permanent, unremoved feature flag** with no owner/removal date (config debt that hides dead paths).
- ❌ A **rollback-unsafe deploy** — a breaking contract/data change not staged expand→migrate→contract.
- ❌ **Business logic inline** in a Route Handler / Server Action (keep them thin; call a service).
- ❌ An **unvalidated or unauthenticated** Server Action / Route Handler — it's a public entry point.
- ✅ Build-once-promote; deploy-dark-then-release-by-flag; canary + fast rollback; flags time-boxed;
  thin, validated, authenticated server surface that calls the one shared data/service layer.

## Checklist

- [ ] Promotion path (preview → staging → prod) + provider recorded in `project-specifics.md`.
- [ ] Same artifact promoted across environments (no per-env rebuild).
- [ ] Risky changes behind a default-off flag with an owner + removal date.
- [ ] Rollback path exists and is faster than fix-forward; previous artifact kept deployable.
- [ ] Breaking contract/data changes are rollback-safe (expand→migrate→contract).
- [ ] Route Handlers / Server Actions are thin, Zod-validated, and authenticated.

## Sources
- [Next.js — Route Handlers](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [Next.js — Server Actions & mutations (security)](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)
- [Feature flags / decoupling deploy from release — Martin Fowler](https://martinfowler.com/articles/feature-toggles.html)
- [Progressive delivery / canary releases](https://martinfowler.com/bliki/CanaryRelease.html)
- [Blue-green deployment](https://martinfowler.com/bliki/BlueGreenDeployment.html)
