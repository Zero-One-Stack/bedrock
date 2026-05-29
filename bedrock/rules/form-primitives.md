# Rule: Form primitives — the baseline set

> **Non-negotiable.** Every kit-compliant repo ships a baseline set of form primitives in
> `shared/ui/` BEFORE any feature builds a form. The baseline below is the minimum surface;
> projects extend it with domain-specific primitives but never replace these. Each primitive
> wraps the project's chosen **headless behavior library** (`component-composition.md`) and
> integrates with **React Hook Form + Zod** (`services-and-data.md`). The styling engine is
> the project's choice (`styling-engine.md`).

## Why this rule exists

Without a baseline, every form in the app re-invents `Field` differently, half the inputs
miss `aria-describedby` wiring, the team builds three flavors of `Combobox` (one of which
fails AA), and a year later there's no single component that handles `disabled + invalid +
required` consistently. The kit names the 15 primitives once so the discussion is
"which ones does this project need" — not "what shape should `<Input>` have."

## The baseline (15 primitives)

The set is structured: **3 wrappers** (Field/Label/HelpText), **3 text inputs**
(Input/Textarea/NumberInput), **4 choice inputs** (Select/Combobox/Checkbox/Radio), **1
toggle** (Switch), **1 range** (Slider), **2 specialized** (DateField/FileInput), **1
error** (ErrorText). Track which exist with `audit-design-system` (M8 — pending).

| Primitive | What it owns | Headless wrapping (illustrative — verify per the adopted lib) |
| --- | --- | --- |
| `<Field>` | The molecule wrapper: composes `Label + (Input\|Combobox\|…) + HelpText + ErrorText`; wires `id`/`aria-describedby`/`aria-invalid`/`aria-required` between them; receives RHF `Controller` props. | Pure composition — no headless dep needed. |
| `<Label>` | The visible label + the `htmlFor` association. | Native `<label>`; no headless needed. |
| `<HelpText>` | Description below the input; auto-linked via `aria-describedby`. | Pure presentational. |
| `<ErrorText>` | The error message slot; live region; auto-linked via `aria-describedby` and toggles `aria-invalid`. | Pure presentational; relies on RHF's `formState.errors`. |
| `<Input>` | A single-line text input + its variants (size/intent/tone). | Native `<input>` (or the headless lib's Input if it ships one). |
| `<Textarea>` | A multi-line text input. | Native `<textarea>`. |
| `<NumberInput>` | A numeric input with min/max/step + spinbuttons. | Base UI `NumberField`, Radix has no native equiv (compose), Ariakit `NumberInput`. |
| `<Select>` | A native select wrapped for styling. **For searchable / async / multi → use `<Combobox>`.** | Native `<select>`; styling is the engine's choice; no headless lib for the *native* version. |
| `<Combobox>` | Searchable / filterable / async-loaded options; full keyboard nav, ARIA listbox/combobox roles, type-to-select. | Base UI `Autocomplete`, Radix has no native (use Downshift or @ariakit/react). The hardest a11y nut in the set — DO NOT hand-roll. |
| `<Checkbox>` | Boolean state, indeterminate state, group support. | Base UI `Checkbox`, Radix `Checkbox`, React Aria `Checkbox`, Ariakit `Checkbox`. |
| `<Radio>` | Radio group; arrow-key nav; roving tabindex. | Base UI `RadioGroup`, Radix `RadioGroup`, etc. |
| `<Switch>` | On/off toggle with proper role + state. | Base UI `Switch`, Radix `Switch`, etc. |
| `<Slider>` | Single or range slider; keyboard nav; ARIA roles. | Base UI `Slider`, Radix `Slider`, etc. |
| `<DateField>` | Locale-aware date entry; calendar popover; min/max; keyboard nav. | React Aria `DateField` + `Calendar` (strongest a11y/i18n); Base UI / Radix do not ship date primitives yet. **Adopt React Aria for this primitive even if the rest of the system uses another lib** — record the carve-out in `project-specifics.md`. |
| `<FileInput>` | File picker (single / multiple); drag-and-drop affordance; accessible button + selected-file list. | Native `<input type="file">` + styled wrapper; behavior trivial enough to author without a headless lib. |

> **Where they live.** Atom-level wrappers (Label, Input, HelpText, ErrorText, Textarea,
> Switch, Checkbox, Radio, NumberInput, Slider, FileInput, native Select) live in
> `shared/ui/atoms/` (or flat `shared/ui/` if the repo skips the atomic sub-convention).
> Compound primitives (Field, Combobox, DateField) are **molecules** per `component-structure.md`
> heuristics — they import multiple atoms.

## RHF + Zod integration (the contract every primitive satisfies)

Every form primitive is **headless-of-form-state** by default — it accepts standard input
props (`value`, `onChange`, `onBlur`, `ref`, `disabled`, `invalid`, …) so it works with
**any** form solution (RHF, native, controlled-from-parent). The kit's standard form solution
is **React Hook Form + Zod** (`services-and-data.md`), and the canonical wiring uses RHF's
`Controller` inside the feature, leaving the primitives stateless.

```tsx
// features/file-grievance/ui/file-grievance-form.tsx
'use client';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Field, Input, Combobox, Switch } from '@/shared/ui';
import { CreateGrievanceSchema, type CreateGrievanceInput } from '../model/schema';
import { fileGrievance } from '../api/file-grievance.action';

export function FileGrievanceForm() {
  const { control, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<CreateGrievanceInput>({ resolver: zodResolver(CreateGrievanceSchema) });

  return (
    <form onSubmit={handleSubmit((v) => fileGrievance(v))}>
      <Controller
        control={control}
        name="title"
        render={({ field, fieldState }) => (
          <Field
            label="Grievance title"
            required
            helpText="A short summary the panel will see first."
            errorText={fieldState.error?.message}
          >
            <Input
              {...field}
              invalid={!!fieldState.error}
              autoComplete="off"
            />
          </Field>
        )}
      />
      <Controller
        control={control}
        name="category"
        render={({ field, fieldState }) => (
          <Field label="Category" required errorText={fieldState.error?.message}>
            <Combobox {...field} options={CATEGORY_OPTIONS} invalid={!!fieldState.error} />
          </Field>
        )}
      />
      {/* …more fields… */}
      <button type="submit" disabled={isSubmitting}>File grievance</button>
    </form>
  );
}
```

What the form primitives DON'T own:

- **Form state.** RHF (or the project's chosen form lib) owns it. Primitives are stateless.
- **Validation.** Zod owns it. Errors come in as a prop (`errorText`) and the primitive
  surfaces them; the primitive never validates.
- **Submission.** The feature's Server Action handles that (`services-and-data.md`).
- **Domain shapes.** A `<Field>` knows nothing about `CreateGrievanceInput` — it knows
  `label`, `error`, `id`.

## The Field molecule (the most important one)

`Field` is the wrapper every other primitive renders inside. It owns the ARIA wiring that's
the most common a11y mistake in hand-rolled forms — every input needs:

- An `id` (so the label's `htmlFor` works).
- An `aria-describedby` pointing at the **HelpText** id AND the **ErrorText** id (when
  errored).
- `aria-invalid="true"` when in error state.
- `aria-required="true"` when required.

Doing this correctly across 100 fields without a wrapper is impossible; the wrapper does it
once.

```tsx
// shared/ui/molecules/field/field.tsx
import { Children, cloneElement, isValidElement, useId, type ReactElement } from 'react';
import { Label } from '@/shared/ui';
import styles from './field.module.css';

export type FieldProps = {
  label: string;
  required?: boolean;
  helpText?: string;
  errorText?: string;
  children: ReactElement;        // exactly one input-shaped child
  id?: string;                    // override; defaults to useId()
};

export function Field({ label, required, helpText, errorText, children, id: idProp }: FieldProps) {
  const reactId = useId();
  const id = idProp ?? reactId;
  const helpId = helpText ? `${id}-help` : undefined;
  const errorId = errorText ? `${id}-error` : undefined;

  if (!isValidElement(children) || Children.count(children) !== 1) {
    throw new Error('<Field> expects exactly one input element as children.');
  }
  const child = children as ReactElement<any>;

  const wired = cloneElement(child, {
    id,
    'aria-describedby': [helpId, errorId].filter(Boolean).join(' ') || undefined,
    'aria-invalid': errorText ? true : child.props['aria-invalid'],
    'aria-required': required || child.props['aria-required'],
  });

  return (
    <div className={styles.root}>
      <Label htmlFor={id} required={required}>{label}</Label>
      {helpText && <p id={helpId} className={styles.help}>{helpText}</p>}
      {wired}
      {errorText && <p id={errorId} role="alert" className={styles.error}>{errorText}</p>}
    </div>
  );
}
```

The arity check + `cloneElement` wiring is identical to the `Slot` pattern from
`component-composition.md` — Field is a `Slot`-shaped molecule whose merged props are the
ARIA attributes.

## Hard rules

- ❌ A feature that needs `<Combobox>` / `<DateField>` / `<Switch>` builds its own inline —
  **add the primitive to `shared/ui` first**. A "just for this form" primitive is the
  inconsistency-cancer entry point.
- ❌ A form primitive validating its own value. Validation is Zod; the primitive surfaces
  `errorText` props.
- ❌ A form primitive holding form state across renders. RHF/Controller owns it.
- ❌ Hand-rolled `<Combobox>`, `<DateField>`, `<Switch>`, `<Slider>`, `<Radio>` — every one
  of those is a known a11y nightmare. Wrap a headless primitive (`component-composition.md`).
  Exception: the kit's `<Select>` baseline IS the native `<select>` (it's fully accessible
  without a headless lib).
- ❌ A `<Field>` accepting 0 or ≥2 children. Field is Slot-shaped — exactly one input
  element. The Field helper throws.
- ❌ Missing `aria-describedby` wiring between Field/HelpText/ErrorText/input — that's why
  Field exists. Don't bypass Field for input primitives that need labels/help/error.
- ❌ A form primitive importing from `entities/` or `features/` — primitives are
  business-agnostic (`feature-sliced-design.md` § shared rules).
- ✅ The 15-primitive baseline ships before the second form is built.
- ✅ Every primitive accepts `value`/`onChange`/`onBlur`/`ref`/`disabled`/`invalid` so RHF's
  `Controller` wires it without adapters.
- ✅ Compound primitives (Combobox/DateField) wrap an approved headless lib; the wrapper
  applies token-styled classes.
- ✅ Where a single headless lib doesn't cover everything (e.g. React Aria for `DateField`
  while the rest of the kit uses Base UI), the carve-out is recorded in
  `project-specifics.md` per `component-composition.md`'s migration carve-out.

## Checklist — the form-primitive set is "complete" when

- [ ] All 15 baseline primitives exist in `shared/ui/`, exported from the slice barrel.
- [ ] Each primitive has the standard `component-structure.md` file set (`.tsx`, `.props.ts`,
      `.module.css`/engine equivalent, `.composition.tsx`, `.stories.tsx`, `.test.tsx`).
- [ ] Each interactive primitive passes `jest-axe` (`accessibility.md`).
- [ ] `<Field>` correctly wires `id` / `aria-describedby` / `aria-invalid` / `aria-required`;
      throws on wrong child arity.
- [ ] `<Combobox>`, `<DateField>`, `<Switch>`, `<Slider>`, `<Radio>` wrap an approved headless
      library (per `component-composition.md`).
- [ ] `Controller`-based wiring documented in at least one feature's form (the canonical
      pattern lives in `services-and-data.md`'s form section + this file).

## Sources
- [WAI-ARIA Authoring Practices — Combobox pattern](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/)
- [WAI-ARIA Authoring Practices — Date Picker pattern](https://www.w3.org/WAI/ARIA/apg/patterns/datepicker-dialog/)
- [WAI-ARIA Authoring Practices — Switch pattern](https://www.w3.org/WAI/ARIA/apg/patterns/switch/)
- [React Hook Form — Controller](https://react-hook-form.com/docs/usecontroller/controller)
- [Base UI — form primitives](https://base-ui.com/react/components/checkbox)
- [Radix Primitives — form-shaped components](https://www.radix-ui.com/primitives)
- [React Aria — form primitives](https://react-spectrum.adobe.com/react-aria/forms.html)
