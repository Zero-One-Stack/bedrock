---
name: add-design-token
description: Add a design token to the 3-tier (primitive/semantic/component) DTCG-aligned source of truth and regenerate the CSS custom properties, so components can reference it as var(--…). Use when the user wants a new color/spacing/radius/shadow/typography/motion/elevation/z-index/opacity/density value, when a review flags a hardcoded CSS value or a component using a primitive token directly, or when building needs a value with no token yet. Enforces the state-sibling rule — adding an interactive color-{bg,text,border} token without -hover/-pressed/-disabled siblings is rejected. Never hand-edit generated CSS.
---

# Add Design Token

Add a token to the typed/DTCG source of truth and regenerate CSS variables. **Read
`.claude/rules/styling-and-tokens.md` first**, and inspect the repo's `tokens/` folder so you
edit the right tier and match existing naming.

## Decide the tier

1. **Primitive** (raw scale value: a specific blue, a spacing step, a duration, a cubic-bezier,
   a shadow stack) → `tokens/primitive/`. Components never reference these directly — they
   exist to feed semantics.
2. **Semantic** (intent, aliasing a primitive: `color-feedback-danger`, `space-inset-md`,
   `motion-duration-base`, `elevation-2`, `z-modal`) → `tokens/semantic/`. **This is what
   components use.** Most new tokens for a component need are semantic and should `{alias}` an
   existing primitive — add the primitive too only if the raw value doesn't exist yet.
3. **Component** (per-component override: `button-bg-primary`) → `tokens/component/`. Only when
   a component must diverge from the semantic default.

**Reuse first.** If an existing token covers the need, use it — no duplicates.

## Required-group check (run before scaffolding)

`styling-and-tokens.md` enumerates the **required semantic groups** every repo must ship
(color base + state, color feedback, spacing, sizing, typography, radius, motion
duration+easing, elevation, z-index, opacity, breakpoints; density is optional). Before adding
a one-off token, check whether the *group* itself is missing — if so, scaffold the whole
group (e.g. all five `motion-duration-*` levels at once) rather than dribble in one value.

## State-sibling rule (enforced)

Interactive surface tokens (`color-bg-emphasis`, `color-bg-interactive`,
`color-text-on-emphasis`, `color-border-interactive`, …) are reactive: components expect their
hover/pressed/disabled (and sometimes selected) variants to resolve. **The skill rejects an
interactive color token added without its full state-sibling set.** Narrative tokens
(`color-text-default`, `color-bg-surface`, `color-border-default`) ship without siblings —
body copy doesn't hover.

Adding `color-bg-emphasis` → the skill creates **five tokens in one change**:

- `color-bg-emphasis`              (default)
- `color-bg-emphasis-hover`        (hover surface)
- `color-bg-emphasis-pressed`      (active/pressed surface)
- `color-bg-emphasis-selected`     (selected surface — when component supports selected state)
- `color-bg-emphasis-disabled`     (disabled surface — must meet 3:1 contrast against text)

Each sibling aliases a primitive (a darker/lighter step on the same scale, or the muted
companion for disabled). If you don't know which primitive to alias, add the primitive scale
first (`color-blue-{500,600,700}` etc.) then alias.

### When to skip siblings (the boundary the skill checks)

| Group | Sibling required? | Examples |
| --- | --- | --- |
| **Interactive surface** | ✅ Full state set | `color-bg-emphasis`, `color-bg-interactive`, `color-text-on-emphasis`, `color-border-interactive` |
| **Narrative** | ❌ No siblings | `color-text-{default,muted,subtle,inverse}`, `color-bg-{surface,muted,canvas}`, `color-border-{default,strong,subtle}` |
| **Feedback** (the subtle/strong pair *is* the state) | ❌ No siblings | `color-feedback-{info,success,warning,danger}[-subtle]` |
| **Decorative** | ❌ No siblings | `color-bg-decorative-*`, brand-only tokens |

The skill asks "is this an interactive surface?" before allowing a skip; the answer + the
reason is recorded in `project-specifics.md`.

## Group-specific naming (use these prefixes — don't invent)

| Adding a… | Goes to | Naming |
| --- | --- | --- |
| Color (text/bg/border) | semantic/color.json | `color-{text\|bg\|border}-<intent>` + state siblings |
| Color (feedback) | semantic/color.json | `color-feedback-{info\|success\|warning\|danger}[-subtle]` |
| Spacing | semantic/space.json | `space-{inset\|stack\|inline}-{xs\|sm\|md\|lg\|xl}` |
| Sizing | semantic/size.json | `size-control-{sm\|md\|lg}`, `size-icon-{xs\|sm\|md\|lg}` |
| Typography | semantic/typography.json | `text-{display\|heading\|body\|label\|caption}-{sm\|md\|lg}` |
| Radius | semantic/radius.json | `radius-{control\|surface\|pill\|full}` |
| Motion duration | semantic/motion.json | `motion-duration-{fast\|base\|slow\|slower}` — no `instant`/0ms level |
| Motion easing | semantic/motion.json | `motion-easing-{standard\|emphasized\|decelerate\|accelerate}` |
| Elevation | semantic/elevation.json | `elevation-{0\|1\|2\|3\|4\|5}` |
| z-index | semantic/z-index.json | `z-{base\|dropdown\|sticky\|overlay\|modal\|popover\|toast\|tooltip}` |
| Opacity | semantic/opacity.json | `opacity-{disabled\|muted\|overlay\|backdrop}` |
| Density (optional) | semantic/density.json | `density-{compact\|comfortable\|spacious}` |
| Breakpoint | primitive/breakpoint.json | `bp-{sm\|md\|lg\|xl\|2xl}` — no `xs` (the mobile base is the no-prefix default) |

If a new token doesn't fit any prefix above, that's a smell — confirm with the user it's a
real new dimension before adding a new group.

## Steps

1. Add the DTCG entry (`$value`, `$type`; reference other tokens with `{group.token}` aliases)
   to the correct tier file. If TS-authored, preserve the typing/`as const`.
2. For an interactive color-bg/-text/-border, add the **full state-sibling set** in the same
   change.
3. A semantic/component token must alias a primitive, not embed a new literal.
4. Regenerate via the repo's token build script (Style Dictionary / Terrazzo, e.g.
   `pnpm tokens:build`). **Never hand-edit the generated `:root` stylesheet.**
5. If the repo emits a JS token re-export for Satori-rendered files (`shared/tokens/og.ts` —
   see `styling-and-tokens.md`'s Satori carve-out), confirm the new token appears there too
   *only* if it's used in OG/icon files.
6. Confirm the new `var(--…)` appears in the generated output.
7. Report the exact variable name (or set of variable names) to use, e.g.
   `var(--color-bg-emphasis)` + state siblings + the primitives they alias.

## Rules

- ❌ Never hand-edit generated CSS — change the source and regenerate.
- ❌ No duplicate tokens; no embedding literals in semantic/component tiers.
- ❌ Adding an interactive `color-{bg,text,border}-…` token without its `-hover`, `-pressed`,
  `-disabled` (and `-selected` where applicable) siblings.
- ❌ Adding a one-off motion duration / easing / elevation / z-index value when the entire
  group is missing — scaffold the group, not the single token.
- ❌ Naming outside the documented prefixes — `color-button-bg` belongs in the **component**
  tier, not semantic; `--ui-fast` is a renamed motion duration, etc.
- ✅ One source of truth, three tiers, DTCG-aligned; theming = override the semantic tier under a selector.
- ✅ State siblings ship together; group baselines scaffold together; all required semantic
  groups present per `styling-and-tokens.md`.
