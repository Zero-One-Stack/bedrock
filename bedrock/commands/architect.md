---
description: Plan a frontend feature/app before building — decompose into FSD layers (app/pages/widgets/features/entities/shared), a data & state plan, Server-vs-client boundaries, and a component inventory, then route units to the builders.
---

Plan the frontend work for **$ARGUMENTS** (or the current request) *before* any component is written.

Launch the **frontend-architect** agent. It should do Step 0 Recon (read the repo's existing
FSD layers/slices, route re-exports, entity/feature `api`, and component inventory — never guess
structure), read `.claude/rules/feature-sliced-design.md` + `architecture.md` +
`component-structure.md` + `services-and-data.md`, then produce the six-section build plan:

1. **Scope & decomposition** — FSD layer map: which routes (root `app/.../page.tsx` re-exports) →
   `pages/<route>` → `widgets/<block>` → `features/<action>` → `entities/<model>` → `shared`
   (new vs. existing; entities = singular nouns, features = action phrases; don't over-slice).
2. **Data & state plan** — server reads (entity `api/` — server-only `<model>.queries.ts` for RSC + client `<model>.hooks.ts` for React Query) vs. server writes (feature `api/` Server Actions) vs. client vs. form state.
3. **Render & boundary plan** — Server Components by default; the root `app/` thin re-export holds no logic; the `'use client'` leaf lives in a **feature/widget**, never atop a page/route; where Suspense/`loading`/`error` boundaries sit.
4. **Component inventory** — every unit placed on its FSD layer/slice/`ui` segment (`shared/ui` vs `entities/<model>/ui` vs `features/<action>/ui` vs `widgets/<block>/ui` vs `pages/<route>/ui`), new-vs-reuse, tokens needed.
5. **Build order & routing** — ordered, bottom-up handoff (FSD import direction): `shared → entities → features → widgets → pages → route`: tokens (`/add-design-token`) → services (`/scaffold-service`) → components leaves-first (`component-builder`) → route wiring → `/verify-build` + `frontend-reviewer`.
6. **Risks & open questions** — surface ambiguities; don't invent answers.

It plans and routes — it does **not** write the implementation. End with the first concrete
command to run. For multi-app/monorepo-sharing questions, use `/monorepo` (monorepo-architect) instead.
