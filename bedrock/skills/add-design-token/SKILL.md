---
name: add-design-token
description: Add a design token to the 3-tier (primitive/semantic/component) DTCG-aligned source of truth and regenerate the CSS custom properties, so components can reference it as var(--…). Use when the user wants a new color/spacing/radius/shadow/typography/motion value, when a review flags a hardcoded CSS value or a component using a primitive token directly, or when building needs a value with no token yet. Never hand-edit generated CSS.
---

# Add Design Token

Add a token to the typed/DTCG source of truth and regenerate CSS variables. **Read
`.claude/rules/styling-and-tokens.md` first**, and inspect the repo's `tokens/` folder so you
edit the right tier and match existing naming.

## Decide the tier

1. **Primitive** (raw scale value: a specific blue, a spacing step) → `tokens/primitive/`.
   Components never reference these directly — they exist to feed semantics.
2. **Semantic** (intent, aliasing a primitive: `color-feedback-danger`, `space-inset-md`) →
   `tokens/semantic/`. **This is what components use.** Most new tokens for a component need
   are semantic and should `{alias}` an existing primitive — add the primitive too only if the
   raw value doesn't exist yet.
3. **Component** (per-component override: `button-bg-primary`) → `tokens/component/`. Only when
   a component must diverge from the semantic default.

**Reuse first.** If an existing token covers the need, use it — no duplicates.

## Steps

1. Add the DTCG entry (`$value`, `$type`; reference other tokens with `{group.token}` aliases)
   to the correct tier file. If TS-authored, preserve the typing/`as const`.
2. A semantic/component token must alias a primitive, not embed a new literal.
3. Regenerate via the repo's token build script (Style Dictionary / Terrazzo, e.g.
   `pnpm tokens:build`). **Never hand-edit the generated `:root` stylesheet.**
4. Confirm the new `var(--…)` appears in the generated output.
5. Report the exact variable name to use, e.g. `var(--color-feedback-warning)`.

## Rules

- ❌ Never hand-edit generated CSS — change the source and regenerate.
- ❌ No duplicate tokens; no embedding literals in semantic/component tiers.
- ✅ One source of truth, three tiers, DTCG-aligned; theming = override the semantic tier under a selector.
