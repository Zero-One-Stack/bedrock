# Rule: Storybook (the design-system contract)

> **Non-negotiable.** Every component in `shared/ui` (and every entity/feature/widget
> component with visual variants) has a Storybook entry. Stories are CSF3 with **autodocs**,
> a **`play` function** for interactive atoms, a **viewport × theme × `forced-colors` × LTR/RTL**
> matrix for visual states, the **a11y addon** running as a blocking CI gate, and a **visual
> regression** gate (Chromatic OR Playwright snapshots — pick one). Storybook is the **contract**
> for the design system: if it isn't a story, it doesn't exist.

## Why this exists

Without Storybook discipline, the design system rots into "the components that happen to be
in the production app today." Reviewers can't see all states; a11y regressions slip in
because nobody opened the component in isolation; designers can't audit; visual regression
runs against assembled pages instead of atoms (10x slower, 10x noisier). Storybook done
right is a **contract test for the component layer** — and it's the only place that catches
forced-colors / dark / RTL combinations before users do.

## Title convention (mirrors the FSD tree)

Story `title` strings must match the FSD layer/slice/`ui/`-segment address. This makes the
Storybook sidebar a 1:1 mirror of the codebase — reviewers can find every component the same
way in either tool.

| Component placement | Storybook `title` |
| --- | --- |
| `shared/ui/atoms/<name>/` (atomic sub-convention) | `Shared/Atoms/<Name>` |
| `shared/ui/molecules/<name>/` | `Shared/Molecules/<Name>` |
| `shared/ui/organisms/<name>/` | `Shared/Organisms/<Name>` |
| `shared/ui/<name>/` (flat layout) | `Shared/<Name>` |
| `entities/<model>/ui/<name>/` | `Entities/<Model>/<Name>` |
| `features/<action>/ui/<name>/` | `Features/<Action>/<Name>` |
| `widgets/<block>/ui/<name>/` | `Widgets/<Block>/<Name>` |
| `pages/<route>/ui/<name>/` (page-private UI) | `Pages/<Route>/<Name>` |

`<Name>` is the human display name (`Employee Card`, not `EmployeeCard`). Stories under the
same component file always group under one tree node — don't split a component's stories
across multiple title strings.

## CSF3 + autodocs (every component)

Every `*.stories.tsx` uses **CSF3** (Component Story Format 3) with the typed `Meta` and
`StoryObj` exports, and **autodocs** generates a documentation page from the component's
props type, JSDoc, and rendered stories — no hand-authored MDX needed for the common case.

```tsx
// shared/ui/atoms/button/button.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './button';
import { Default, Loading, DisabledProps } from './button.props';

const meta: Meta<typeof Button> = {
  title: 'Shared/Atoms/Button',
  component: Button,
  tags: ['autodocs'],     // generates a Docs page from this file
  parameters: {
    a11y: { test: 'error' },        // a11y violations FAIL the story (not just warn)
    layout: 'centered',
  },
};
export default meta;
type Story = StoryObj<typeof Button>;

export const Primary: Story = { args: { ...Default, intent: 'primary' } };
export const Subtle: Story = { args: { ...Default, intent: 'subtle' } };
export const Disabled: Story = { args: { ...DisabledProps } };
export const Loading: Story = { args: { ...Loading } };
```

`tags: ['autodocs']` is **mandatory** for every component story file. The Docs page is the
canonical entry point for designers + reviewers; without autodocs they read source files.

## `play` functions for interactive atoms

Every component with **interaction behavior** (Button click handlers, Input focus + change,
Combobox keyboard nav, Dialog open/close) ships a `play` function exercising the happy path
with Testing Library / `@storybook/testing-library`. The play function makes Storybook a
**runnable** spec — Chromatic captures the post-interaction state, and the story doubles as
an integration-test fixture.

```tsx
import { userEvent, within, expect } from '@storybook/test';

export const TypeAndSubmit: Story = {
  args: { ...Default },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole('textbox', { name: /grievance title/i });
    await userEvent.type(input, 'Late paychecks for the warehouse crew');
    await expect(input).toHaveValue('Late paychecks for the warehouse crew');
    await userEvent.click(canvas.getByRole('button', { name: /file grievance/i }));
    await expect(canvas.getByRole('alert')).toHaveTextContent(/filed/i);
  },
};
```

Rules:

- Every atom/molecule with state (Button, Input, Combobox, Switch, Slider, Tabs, Dialog,
  Menu, …) has at least **one** `play` story exercising the happy path.
- `play` uses Testing Library queries (`getByRole`, `getByLabelText`) — never CSS selectors
  or `data-testid` for the test queries (testids are fine as targets but `getByRole` is the
  primary discovery mechanism). Keeps stories accessible-by-construction.
- `play` failures **fail CI** (Chromatic captures and surfaces them; `@storybook/test-runner`
  is the CI runner).
- `play` does NOT test business logic — that's `*.test.tsx` (unit/integration in
  `testing.md`). `play` validates the component's interaction surface, not its consumers.

## The story matrix (theme × viewport × forced-colors × direction)

Every component with visual states ships stories that exercise the matrix the design system
must hold up under. The matrix is configured ONCE per repo in `.storybook/preview.ts`, not
per-story:

```ts
// .storybook/preview.ts
import type { Preview } from '@storybook/react';

const preview: Preview = {
  globalTypes: {
    theme:     { description: 'Theme',          defaultValue: 'light',       toolbar: { items: ['light', 'dark'] } },
    direction: { description: 'Text direction', defaultValue: 'ltr',         toolbar: { items: ['ltr', 'rtl'] } },
    brand:     { description: 'Brand',          defaultValue: 'default',     toolbar: { items: ['default'] /* + per-repo brands */ } },
  },
  parameters: {
    viewport: {
      viewports: {
        mobile:  { name: 'Mobile (375)',  styles: { width: '375px',  height: '812px' } },
        tablet:  { name: 'Tablet (768)',  styles: { width: '768px',  height: '1024px' } },
        desktop: { name: 'Desktop (1280)', styles: { width: '1280px', height: '800px' } },
      },
    },
    backgrounds: { disable: true },       // theme decorator handles background
    a11y:        { test: 'error' },       // violations FAIL by default; per-story override allowed
  },
  decorators: [
    (Story, ctx) => {
      const { theme, direction, brand } = ctx.globals;
      document.documentElement.setAttribute('data-theme', theme);
      document.documentElement.setAttribute('data-brand', brand);
      document.documentElement.setAttribute('dir', direction);
      return <Story />;
    },
  ],
};
export default preview;
```

The **visual regression** gate (Chromatic / Playwright) captures the full matrix per
component-state, so the matrix is global state — individual stories don't iterate viewports
themselves. The reviewer changes the toolbar; the snapshot service captures all combos in CI.

## a11y addon (`@storybook/addon-a11y`)

Mandatory addon. Configuration in `.storybook/main.ts`:

```ts
// Storybook 8/9 shape — verify against the INSTALLED major before copying (see below).
addons: ['@storybook/addon-essentials', '@storybook/addon-a11y', '@storybook/addon-interactions'],
```

> ⚠️ **Version currency — check the installed major, don't copy this.** This rule and the bundled
> `docs/external-references/storybook-9.md` were written against Storybook 9, and the addon
> surface has since changed. In **Storybook 10** the `addon-essentials` bundle was **removed** —
> docs are now `@storybook/addon-docs`, and the former essentials pieces (controls, viewport,
> backgrounds) are built in:
>
> ```ts
> // Storybook 10
> addons: ['@storybook/addon-docs', '@storybook/addon-a11y'],
> ```
>
> Framework packages also moved: `@storybook/nextjs` (webpack) and `@storybook/nextjs-vite`
> (vite) are the Next.js options, and `Meta`/`StoryObj` are imported from the **framework**
> package (`@storybook/nextjs`), not `@storybook/react`. Confirm the current shape from the
> installed version's docs — this is exactly the Step 0 "verify, not recall" gate.
>
> **Theme decorator:** the examples below toggle `data-theme`. If the project's provider uses
> `attribute="class"` (the `next-themes` default in many repos), the decorator must toggle
> `class="dark"` instead — otherwise every dark-mode story silently renders light and the
> stories lie about dark mode. Match the app's mechanism (`theming.md`), not the example.

The kit's parameter `a11y: { test: 'error' }` makes axe violations **fail the story** in the
test runner (not just warn in the addon panel). For the rare legitimate violation (e.g. a
contrast issue waived by design), the story overrides per-rule:

```ts
parameters: {
  a11y: {
    test: 'error',
    config: { rules: [{ id: 'color-contrast', enabled: false }] },
  },
},
```

Every such override **requires a comment** explaining why, and a logged entry in
`project-specifics.md` per `governance.md`'s waiver mechanism. No silent disables.

## Visual regression — Chromatic OR Playwright snapshots (pick one)

The kit doesn't mandate which; both work, the policy is "one of them runs on every PR and a
visual change requires explicit approval."

| | Chromatic | Playwright snapshots |
| --- | --- | --- |
| Setup | `chromatic` CLI in CI; SaaS account | `playwright` already in repo (E2E); add per-story screenshot specs |
| Cost | Per-snapshot-month pricing | Free; you maintain the runner |
| Coverage | Auto-captures every story × viewport × theme × forced-colors | You author the matrix per story (more boilerplate) |
| When to pick | Multi-app / multi-repo design system; design review workflow integrated | Lean monorepo; engineering-only review; budget-conscious |

Record the choice in `project-specifics.md`. Don't run both — they capture overlapping
surfaces and double the CI bill.

## `forced-colors` story per atom

Every interactive atom ships a `forced-colors` story (the Storybook a11y addon ships a toolbar
toggle). The matrix in CI captures it; locally the story is for designer + a11y review.

```tsx
export const ForcedColors: Story = {
  args: { ...Default },
  parameters: {
    forcedColors: 'active',          // addon-a11y simulates the mode
  },
};
```

If the rule can't be enforced via the addon (older Storybook majors), the story file
documents it via a `Default` story with a CSS class that wraps in `@media (forced-colors:
active)`-aware rules — see `theming.md` for the technique.

## Hard rules

- ❌ A `shared/ui` component without a `*.stories.tsx` file. No story → not part of the
  design system → fails `audit-design-system`.
- ❌ A story file missing `tags: ['autodocs']`.
- ❌ An interactive atom without at least one `play` function exercising the happy path.
- ❌ Per-story `viewport`/`theme`/`direction` configuration — the matrix lives in
  `preview.ts`.
- ❌ The a11y addon installed but not blocking CI (`test: 'error'` missing or set to
  `'warn'`). Defeats the point.
- ❌ Disabling an a11y rule per-story without a comment + a `project-specifics.md` waiver.
- ❌ Running both Chromatic AND Playwright snapshots — pick one.
- ❌ Storybook `title` that doesn't match the FSD address.
- ❌ `play` querying by `data-testid` or CSS selector — use `getByRole` + accessible name.
- ✅ Every component has a `*.stories.tsx` with autodocs.
- ✅ Interactive components have `play` functions exercising the happy path.
- ✅ The theme/viewport/forced-colors/direction matrix is global.
- ✅ a11y violations fail CI; visual regression runs on every PR.
- ✅ `title` mirrors the FSD address; sidebar reads like the codebase.

## Checklist — a component's Storybook coverage is "complete" when

- [ ] `<name>.stories.tsx` exists with the correct FSD-mirrored title.
- [ ] `tags: ['autodocs']` is set; the Docs tab renders.
- [ ] Stories cover the variant matrix from `*.variants.ts` (one story per intent × size
      tone, or one parameterized story per axis).
- [ ] Interactive atoms have a `play` function for the happy path.
- [ ] Each story has named `args` (no inline literal-stuffed args — reuse `*.props.ts`).
- [ ] The story passes a11y in light + dark + forced-colors.
- [ ] The visual regression baseline is committed; PR diffs are reviewed.
- [ ] No per-story matrix overrides (theme/viewport/direction live globally).

## Sources

**Bundled reference snippets:**
- `docs/external-references/storybook-9.md` — the kit's full preview.ts config (theme/viewport/forced-colors/RTL matrix), main.ts addons, CSF3 + autodocs template, play function shape, test-runner CI setup, Chromatic vs Playwright snapshot trade-off.

**Library docs:**
- [Storybook — CSF3 + autodocs](https://storybook.js.org/docs/writing-stories/autodocs)
- [Storybook — `play` functions](https://storybook.js.org/docs/writing-stories/play-function)
- [`@storybook/addon-a11y` — test mode](https://storybook.js.org/docs/writing-tests/accessibility-testing)
- [Storybook — visual testing](https://storybook.js.org/docs/writing-tests/visual-testing)
- [Chromatic](https://www.chromatic.com/)
- [Playwright — Visual comparisons](https://playwright.dev/docs/test-snapshots)
