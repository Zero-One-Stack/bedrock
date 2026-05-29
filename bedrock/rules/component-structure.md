# Rule: Component & File Structure (within FSD)

> **Non-negotiable.** Read before creating or editing any component. **Placement is governed by
> `feature-sliced-design.md`** (which layer → which slice → which segment); *this* file is the
> file-per-concern contract for the component *inside* its `ui/` segment, the `shared/ui` atomic
> sub-convention, the no-cycles rule, and the Storybook title convention. **Multi-part composition
> patterns** (Tabs/Dialog/Menu namespaces), **polymorphism via `asChild`**, and the **approved
> headless behavior library** live in `component-composition.md`. The `/scaffold-component` skill
> generates this file set. If two of these rules ever seem to disagree on *where* something goes,
> FSD wins.

## Where a component goes (decide first — full rule in `feature-sliced-design.md`)

A component is always in the **`ui/` segment of a slice**, on the layer that matches what it is:

```
Generic + reusable + business-agnostic (a <Button>, <DataTable>, <Icon>)?
  → shared/ui/<component>/          (the design system; see the atomic sub-convention below)
Read-only view of ONE domain model (<EmployeeCard>, <GrievanceRow>)?  — no actions, no fetching
  → entities/<model>/ui/<component>/
The UI of ONE user action that mutates state (<FileGrievanceForm>, <ApproveButton>)?
  → features/<action>/ui/<component>/
A complete self-contained block composing entities + features (<GrievanceDashboard>)?
  → widgets/<block>/ui/<component>/
A route's whole screen?
  → pages/<route>/ui/<Page>.tsx     (composes widgets/features; no business logic)
```

Mis-leveling is a review finding. An entity component with a "Delete" button belongs in a **feature**;
a "shared" component that only makes sense for one domain belongs in that **entity/feature**; a block
used on exactly one page that's never reused **stays in that page** (don't promote it to a widget —
the insignificant-slice trap, `feature-sliced-design.md`).

## The `shared/ui` atomic sub-convention (optional, FSD-legal)

`shared` has **segments, not slices**, so you may *group* the design system inside `shared/ui` by
atomic level without violating FSD:

```
shared/ui/
├── atoms/        single indivisible elements (button, input, icon, badge)
├── molecules/    small compositions of atoms (form field = label+input+error, search bar)
└── organisms/    larger self-contained presentational sections (data table, nav bar)
```

This is purely a `shared/ui` *folder grouping* — it is **not** a set of FSD layers, and atomic level
imposes **no extra import direction beyond FSD's** (everything here is in `shared`, the bottom layer).
A flat `shared/ui/<component>/` (no atomic folders) is equally valid; pick one per repo and record it
in `project-specifics.md`. Business-bearing components never live here — those go in
`entities`/`features`/`widgets`.

> **Why keep atomic at all?** It's the gap-filler FSD endorses: atomic design organizes the
> *presentational primitives*, FSD organizes the *business layers above them*. Storybook titles below
> still mirror this grouping.

### Heuristics — atom / molecule / organism

Atomic theory is famously slippery; in practice the kit uses these heuristics. They're not
hard gates — a reviewer makes the call — but they end "is `<SearchBar>` an atom or a
molecule?" arguments without a vote.

| Level | "It IS this if…" | "It is NOT this if…" |
| --- | --- | --- |
| **Atom** | A single semantic HTML element + its variants (`<Button>`, `<Input>`, `<Icon>`, `<Badge>`, `<Spinner>`, `<Avatar>`, `<Label>`, `<Kbd>`). Renders no other named subcomponent of its own. Imports no other atom by name. | It imports another atom (`<Button>` rendering an `<Icon>` is a `molecule`); it owns local state across multiple parts (`<Combobox>` with an open/closed state machine and 3 subcomponents is an `organism`). |
| **Molecule** | A small composition of **≤3 atoms** with **one purpose** (a `Field` = `Label + Input + ErrorText`; a `SearchBar` = `Icon + Input + IconButton`). May own minimal local state for its single purpose (the field's `id` wiring, the search bar's debounced query). | It composes **more than 3 atoms**, owns layout zones, or coordinates state across multiple subcomponents → `organism`. It needs no atoms, only one HTML element → `atom`. |
| **Organism** | A larger self-contained block: composes **molecules** (and/or atoms), owns local state across multiple subcomponents, defines named layout regions (header / body / footer slot). Examples: `DataTable`, `NavBar`, `Dialog`, `Tabs`, `Menu`, `Accordion`. **Still presentational** — no domain reads, no Server Actions. | It fetches data, calls a mutation, or carries business terminology (an `EmployeeCard` is an **entity** view, not an organism — `feature-sliced-design.md` § "Choosing the right layer"). |

The 30-second test (apply in this order):

1. **Does it import another atom?** → at least a molecule.
2. **Does it own state across >3 atoms or define named subcomponent slots?** → organism.
3. **Does it touch domain data (entity reads, feature actions, business terms)?** → it's
   not in `shared/ui` at all — promote it to `entities/<x>/ui/`, `features/<x>/ui/`, or
   `widgets/<x>/ui/`.
4. **None of the above + single semantic element?** → atom.

Borderline calls (and how the kit resolves them):

- **Button with an Icon child** — the `<Button>` itself stays an **atom** (it's still one
  semantic element + variants); the consumer composes `<Button><Icon name="x"/></Button>`.
  Don't conflate "consumer might render N children" with "the component imports atoms."
- **Field (Label + Input + Error)** — **molecule**, by far the most common one. The pattern
  is so universal that the kit's M6 (form primitives) lists `Field` as a required atom-set
  member; "molecule" is the right level.
- **Dialog / Tabs / Menu** — **organism**. They are multi-part by definition (`Dialog.Root`,
  `Dialog.Content`, `Dialog.Title`, …); see `component-composition.md`'s namespace rule.
- **DataTable** — **organism**. Even if it has only one "named" subcomponent (`Column`), it
  owns sort/filter/pagination state across multiple atoms.
- **A presentational `<UserAvatar>` showing a user's photo** — if it's truly business-
  agnostic (takes `src` and `alt` as props), it's an atom (avatar). If it accepts a `User`
  domain object and knows how to derive the avatar from it, it's an **entity view**
  (`entities/user/ui/UserAvatar.tsx`), not a shared atom.

Migration notes:

- A component classified as atom that grows past the boundary (suddenly imports two other
  atoms; suddenly owns state across them) **moves up** — file moves `atoms/x/` → `molecules/x/`.
  The slice's `index.ts` updates; consumers don't change because they always imported via
  the slice public API.
- The reverse move (an organism that's been simplified back to a single semantic element)
  is also legal; do it during the same refactor that simplified it.
- Borderline reclassifications are **a `project-specifics.md` decision** the first time;
  after that the precedent applies. Don't re-litigate per component.

## Project layout (Next.js App Router + FSD — see `feature-sliced-design.md`)

```
/                              repo root
├── app/                       NEXT.JS ROUTING ONLY — thin re-exports of @/pages/*
│   ├── layout.tsx             injects providers + fonts/reset; zero layout styling
│   ├── page.tsx               export { HomePage as default } from '@/pages/home'
│   └── <route>/page.tsx       export { XPage as default, metadata } from '@/pages/<route>'
└── src/
    ├── app/                   FSD app layer: providers/ ('use client' shell), styles/  — no slices
    ├── pages/<route>/         page slice: ui/ (the screen, RSC), api/ (route reads)
    ├── widgets/<block>/       widget slice: ui/ model/ api/
    ├── features/<action>/     feature slice: ui/ model/ api/ (Server Action) — singular action name
    ├── entities/<model>/      entity slice: ui/ (read-only) model/ (Zod+types) api/ (queries) [@x/]
    └── shared/                no slices — segments only
        ├── ui/                design system (atomic sub-convention optional)
        ├── api/               base fetch/client, query-client setup
        ├── lib/               framework-light helpers (incl. the shared cx)
        ├── config/            env, feature-flag plumbing
        ├── tokens/            design tokens (styling-and-tokens.md)
        └── styles/            tokens.css (generated) + globals
    └── test-utils/            provider-wrapped render (see testing.md)
```

### Dependency boundaries (enforced — Steiger + dependency-cruiser + eslint-plugin-boundaries)

The direction is FSD's, not atomic's:

```
app → pages → widgets → features → entities → shared
```

- ❌ Any **upward** import (e.g. `entities` → `features`).
- ❌ Any **same-layer slice** import — except an `@x` cross-import on `entities` (`feature-sliced-design.md`).
- ❌ A deep import past a slice's `index.ts` (public-API sidestep).
- ✅ `shared/ui` may use `shared/lib`/`shared/tokens` (same-layer *segments* are fine in `shared`).
- ✅ Everything imports **downward** through the target slice's public API.

### No circular dependencies (direction is necessary but not sufficient)

Downward direction prevents *upward* edges; it does **not** prevent cycles. Cycles still form
**within a slice** and — most often — **through barrels**. A cycle causes `undefined` imports at
runtime (a value read before the other module finished initializing), flaky "works sometimes" bugs,
and broken tree-shaking. **Cycles are banned.**

The dominant source is the **barrel re-export loop**:

```
shared/ui/index.ts        →  export { Icon } from './atoms/icon';  export { Button } from './atoms/button'
shared/ui/atoms/button/index.ts →  import { Icon } from '../..'   // ← imports the segment barrel
// barrel → button → barrel : a cycle. Button mounts before Icon is defined → undefined.
```

Avoid it with three habits:

- **Import siblings by their leaf path, never via the shared barrel.** Inside a slice, a component
  imports `from '../icon'`, **not** `from '..'` / the slice's own `index.ts`. A slice's `index.ts` is
  for *outside* consumers; a folder never imports its own (or its parent's) barrel.
- **`index.ts` re-exports the public API explicitly** — `export { X } from './x'` — **never**
  `export *`. Broad `export *` is what turns a barrel into a cycle hub (and an FSD public-API smell).
- **Extract the shared piece downward.** If two modules genuinely need each other, the common part
  belongs in a lower layer both depend on (a type in `shared/lib`, an entity), breaking the cycle by
  direction.

**Detect, don't eyeball.** Wire up at least one, matched to the repo (Recon):
- **Lint (dev-time):** `import/no-cycle` (`["error", { "maxDepth": "∞", "ignoreExternal": true }]`)
  — ignores `import type`. Computationally heavy; scope it if lint slows.
- **CI / on demand:** `madge --circular <src>` (direct cycles) or `dpdm` (the indirect ones madge misses).
- **FSD / Nx:** Steiger surfaces public-API loops; `@nx/enforce-module-boundaries` errors on project cycles.

`/verify-build` runs this check and treats a new cycle as a failure.

## Naming

- Folders & files: **kebab-case** (`employee-card/`, `employee-card.tsx`).
- Component exports: **PascalCase** (`export function EmployeeCard`); prefer **named exports**.
- Slice folders: **entities singular noun** (`employee`), **features action phrase** (`file-grievance`).
- Segment folders are the fixed set (`ui/ model/ api/ lib/ config/`) — never essence-named (`components/`, `hooks/`).

## The component contract (file-per-concern, inside the slice's `ui/` segment)

Every non-trivial component owns a folder under its slice's `ui/`:

```
ui/employee-card/
├── index.ts                       # this component's public surface (re-exported up to the slice's index.ts)
├── employee-card.tsx              # component + exported props type
├── employee-card.props.ts         # named props fixtures for stories & tests
├── employee-card.variants.ts      # variant recipe — only when the component has size/intent/tone (component-composition.md)
├── employee-card.behavior.ts      # useEmployeeCardBehavior() hook — only when interaction logic outgrows .tsx (component-composition.md)
├── employee-card.styles.ts        # token-derived dynamic vars (imports the shared cx; only if needed)
├── employee-card.module.css       # CSS Module — token vars only (or engine-equivalent — styling-engine.md)
├── employee-card.composition.tsx  # wrapper supplying providers/sample data
├── employee-card.test.tsx         # Testing Library (.test or .spec — match the repo)
└── employee-card.stories.tsx      # Storybook (title + matrix per storybook.md)
```

Rules:
- **Props type** declared and exported from `*.tsx`. Extend the underlying element's props when wrapping one.
- **Props fixtures** in `*.props.ts`; stories *and* tests import them. Never inline a large fixture in a test.
- **No inline styles** in the `.tsx`. Styling lives in `.styles.ts` / `.module.css`.
- **Use the repo's shared `cx`/class-merge util** (one per project, in `shared/lib/`). Recon for it
  first; import it. Define a local `cx` **only if the repo has none** — then put it in `shared/lib/`
  and reuse it, never re-declare `cx` per component folder.
- **The slice's `index.ts` exports the public API only** — the components meant for outside consumers,
  not every internal file. No `export *` of internals.
- Provide a `dataTestId` prop with a sensible default; apply it.
- No hardcoded user-facing strings — accept via props (presentational `shared/ui`) or `useTranslation`.
- A trivial wrapper may collapse to `*.tsx` + `index.ts` + `*.test.tsx` + `*.stories.tsx`.

### Storybook (see `storybook.md` for the full contract)

Every component file has a sibling `*.stories.tsx`. The Storybook `title` mirrors the FSD
address (`Shared/Atoms/<Name>`, `Entities/<Model>/<Name>`, etc.) — **the full title table,
the autodocs requirement, the play-function rule, the theme/viewport/forced-colors/RTL matrix,
the a11y addon configuration, and the visual-regression policy all live in `storybook.md`.**
The component's file set just needs to include the stories file; the contract for what goes
inside is centralized.

## Templates

> Generic patterns, not literal code. `input-field` is a stand-in name; the `var(--…)` tokens and the
> `@/shared/lib/cx` alias are **illustrative** — substitute the repo's real token names and alias
> (Step 0 Recon). This example is a `shared/ui` atom; an entity/feature component is the same contract
> at a different address. Don't copy a token or alias from here without confirming it exists.

### `input-field.tsx`

```tsx
import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import styles from './input-field.module.css';
import { cx } from '@/shared/lib/cx'; // the repo's shared class-merge util — verify its real path (Recon)

export type InputFieldVariant = 'rounded' | 'pill';

export type InputFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  inputLabel?: string;
  helperText?: string;
  errorText?: string;
  isRequired?: boolean;
  isInvalid?: boolean;
  variant?: InputFieldVariant;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  onValueChange?: (value: string) => void;
  dataTestId?: string;
};

export const InputField = forwardRef<HTMLInputElement, InputFieldProps>(function InputField(
  { inputLabel, helperText, errorText, isRequired, isInvalid, variant = 'rounded',
    leftIcon, rightIcon, onValueChange, dataTestId = 'input-field', className, id, ...rest },
  ref
) {
  const inputId = id ?? dataTestId;
  return (
    <div className={cx(styles.root, isInvalid && styles.invalid)}>
      {inputLabel && (
        <label htmlFor={inputId} className={styles.label}>
          {inputLabel}
          {isRequired && <span className={styles.required} aria-hidden>*</span>}
        </label>
      )}
      {helperText && <p className={styles.helper}>{helperText}</p>}
      <div className={cx(styles.field, styles[variant])}>
        {leftIcon && <span className={styles.leftIcon}>{leftIcon}</span>}
        <input
          id={inputId}
          ref={ref}
          className={cx(styles.input, className)}
          aria-invalid={isInvalid || undefined}
          aria-describedby={errorText ? `${inputId}-error` : undefined}
          data-testid={dataTestId}
          onChange={(e) => onValueChange?.(e.target.value)}
          {...rest}
        />
        {rightIcon && <span className={styles.rightIcon}>{rightIcon}</span>}
      </div>
      {errorText && <p id={`${inputId}-error`} className={styles.error} role="alert">{errorText}</p>}
    </div>
  );
});
```

### `index.ts`

```ts
export { InputField } from './input-field';
export type { InputFieldProps, InputFieldVariant } from './input-field';
```

### `input-field.styles.ts` — only token-derived dynamic vars (often empty/omitted)

`cx` is **not** defined here — import the repo's shared util (see the `.tsx` import). This file exists
only for dynamic, token-referencing CSS-var helpers; if there are none, omit the file.

```ts
// Example: expose a runtime value as a CSS var pointing at a token (never a raw literal).
export const accentVar = (token: `--${string}`) => ({ ['--accent' as string]: `var(${token})` });
```

If the repo has **no** shared `cx`, create one once in `shared/lib/cx.ts` and import it everywhere:

```ts
// shared/lib/cx.ts (create once per repo; do not duplicate per component)
export const cx = (...classes: Array<string | false | undefined>): string =>
  classes.filter(Boolean).join(' ');
```

### `input-field.module.css` — token vars only (see styling-and-tokens.md)

> The `var(--…)` names below are **illustrative**. Use the repo's actual token names (Recon); a
> `var(--…)` that doesn't exist resolves to nothing and the style silently disappears.

```css
.root  { display: flex; flex-direction: column; gap: var(--space-stack-xs); }
.label { font: var(--text-label-md); color: var(--color-text-default); }
.required { color: var(--color-feedback-danger); margin-inline-start: var(--space-inline-xs); }
.helper { font: var(--text-body-sm); color: var(--color-text-muted); }
.error  { font: var(--text-body-sm); color: var(--color-feedback-danger); }
.field  { display: flex; align-items: center; gap: var(--space-inline-xs);
  border: 1px solid var(--color-border-default); background: var(--color-bg-surface);
  block-size: var(--size-control-md); padding-inline: var(--space-inset-sm); }
.rounded { border-radius: var(--radius-control); }
.pill    { border-radius: var(--radius-pill); }
.field:hover { border-color: var(--color-border-strong); }
.invalid .field { background: var(--color-feedback-danger-subtle); border-color: var(--color-feedback-danger); }
.input { flex: 1; border: 0; outline: 0; background: transparent;
  font: var(--text-body-md); color: var(--color-text-default); }
```

### `input-field.props.ts`

```ts
import type { InputFieldProps } from './input-field';

export const DefaultInputFieldProps: InputFieldProps = { inputLabel: 'Label', variant: 'rounded' };
export const ErrorInputFieldProps: InputFieldProps = {
  inputLabel: 'Label', errorText: 'Descriptive error message', isInvalid: true, isRequired: true,
};
```

### `input-field.composition.tsx`

```tsx
import { InputField, type InputFieldProps } from './input-field';
import { DefaultInputFieldProps } from './input-field.props';

export const InputFieldWrapper = (props: InputFieldProps = DefaultInputFieldProps) => (
  <InputField {...props} />
);
```

### `input-field.stories.tsx` (title mirrors the FSD path)

```tsx
import type { Meta, StoryObj } from '@storybook/react';
import { InputField } from './input-field';
import { InputFieldWrapper } from './input-field.composition';
import { DefaultInputFieldProps, ErrorInputFieldProps } from './input-field.props';

const meta: Meta<typeof InputField> = { title: 'Shared/Atoms/Input Field', component: InputFieldWrapper };
export default meta;
export const Default: StoryObj<typeof InputFieldWrapper> = { args: { ...DefaultInputFieldProps } };
export const Error: StoryObj<typeof InputFieldWrapper> = { args: { ...ErrorInputFieldProps } };
```

### `input-field.test.tsx` (see testing.md)

```tsx
import { render, screen } from '@/test-utils';
import { InputFieldWrapper } from './input-field.composition';
import * as Props from './input-field.props';

describe('<InputField />', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders the label', () => {
    render(<InputFieldWrapper {...Props.DefaultInputFieldProps} />);
    expect(screen.getByText('Label')).toBeInTheDocument();
  });

  it('exposes invalid state to assistive tech', () => {
    render(<InputFieldWrapper {...Props.ErrorInputFieldProps} />);
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('Descriptive error message');
  });
});
```

## Barrel exports (public API only)

Each component folder's `index.ts` exports just its public surface; the **slice's** root `index.ts`
re-exports the components meant for outside consumers — **not** internal files, **never `export *`**.
This *is* the FSD public-API barrier (`feature-sliced-design.md`): outsiders import
`@/entities/employee`, never `@/entities/employee/ui/employee-card`.

## Next.js specifics

- **Server Components by default.** Add `'use client'` only on the interactive leaf — and that leaf
  lives in a **feature** or **widget**, never at the top of a page/route.
- **Root route files re-export the FSD `pages` layer**; page screens live in `src/pages/<route>/ui/`.
- Colocate `loading.tsx`/`error.tsx` beside the **route** in root `app/`; use `(route groups)` to
  organize without changing URLs.

## Checklist — a component is "done" when

- [ ] Placed on the correct FSD layer/slice/`ui` segment (`feature-sliced-design.md`); imports downward; no same-layer/deep import.
- [ ] All required files exist; the slice `index.ts` exports public API only; no inline styles.
- [ ] Props type exported from `.tsx`; fixtures in `.props.ts`.
- [ ] CSS Module uses only semantic/component token vars — no literals, no primitives.
- [ ] No hardcoded user-facing strings.
- [ ] **Accessible (WCAG 2.2 AA — `accessibility.md`):** semantic element, keyboard-operable, visible focus, errors associated/announced, targets ≥ 44px, `jest-axe` clean.
- [ ] **Responsive (`responsive-design.md`):** mobile-first; breakpoints from tokens; reusable components use `@container`; no overflow at 320px.
- [ ] **Performant (`performance.md`):** `'use client'` only on the feature/widget leaf; `next/image`/`next/font`; heavy client code split; no CLS.
- [ ] Story per state + viewport; title mirrors the FSD path.
- [ ] Tests pass, coverage ≥ 80%, lint/typecheck/format/a11y clean; Steiger + depcruise pass; no new cycle.
- [ ] Exported from the slice's `index.ts`.

## Sources
- [Feature-Sliced Design — Slices and segments](https://feature-sliced.design/docs/reference/slices-segments)
- [FSD — Atomic Design and FSD (how they compose)](https://feature-sliced.design/blog/atomic-design-architecture)
- [Next.js — Project structure & organization](https://nextjs.org/docs/app/getting-started/project-structure)
- [Robin Wieruch — React Folder Structure Best Practices](https://www.robinwieruch.de/react-folder-structure/)
