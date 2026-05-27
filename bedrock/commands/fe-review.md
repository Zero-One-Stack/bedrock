---
description: Review the current frontend changes against this kit's engineering philosophy (Feature-Sliced Design, token-only styling, React Query/RHF+Zod, testing rules, no Effector/Chakra, strict TS).
---

Review the current changes against this project's engineering philosophy.

Launch the **frontend-reviewer** agent on the current diff (branch diff, PR, or staged
changes — pick what's relevant; honor $ARGUMENTS if a target is given).

It should read `.claude/CLAUDE.md` and the relevant `.claude/rules/` (incl.
`feature-sliced-design.md`), then check FSD placement + dependency boundaries (downward-only
imports, no same-layer slice import except an `@x` cross-import on `entities`, no deep import
past a slice's `index.ts` public-API barrier; correct layer — `shared/ui` vs `entities/<model>`
vs `features/<action>` vs `widgets/<block>` vs `pages/<route>`; no business terminology in
`shared`, no mutation/action button in an `entity`, segments named by purpose not essence), the
component contract, **token-only styling (flag any literal CSS value, primitive-token use in
components, Chakra, CSS framework, or CSS-in-JS)**, React Query / RHF+Zod usage, the 13 testing
rules + coverage + behavior-not-implementation, strict-TypeScript (no `any`), accessibility,
i18n, and the hard bans (**no Effector**).

Return findings grouped by Blocker / Should fix / Nit, each with file:line, the rule it
breaks, and the fix — ending with a merge verdict.
