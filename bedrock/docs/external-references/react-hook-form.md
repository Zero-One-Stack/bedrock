# React Hook Form — the kit's `Controller` pattern

**Verified against:** `react-hook-form@7.x` and `@hookform/resolvers@5.x` (latest at
2026-05). API has been stable across v7 minor releases for ~2 years; the resolver package
has its own major. Verify both in Recon.

## The kit's stance

Form state belongs to **React Hook Form + Zod**, not to component primitives or to React
Query. Per `form-primitives.md`, every form primitive (`<Input>`, `<Combobox>`, `<Switch>`,
`<DateField>`, …) is **stateless** — accepts `value` / `onChange` / `onBlur` / `ref` /
`disabled` / `invalid` props. RHF's `Controller` is the canonical glue between RHF's
internal state and those primitives.

This pattern works the same for primitives backed by **any** approved headless library
(Base UI, Radix, React Aria, Ariakit) and for the kit's native primitives.

## The canonical feature form

```tsx
// features/file-grievance/ui/file-grievance-form.tsx
'use client';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Field, Input, Combobox, Switch } from '@/shared/ui';
import { CreateGrievanceSchema, type CreateGrievanceInput } from '../model/schema';
import { fileGrievance } from '../api/file-grievance.action';

export function FileGrievanceForm({ onSuccess }: { onSuccess?: () => void }) {
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
    reset,
  } = useForm<CreateGrievanceInput>({
    resolver: zodResolver(CreateGrievanceSchema),
    defaultValues: { title: '', severity: 'low', urgent: false },
    mode: 'onBlur',                              // validate after blur (default 'onSubmit')
  });

  const onSubmit = async (values: CreateGrievanceInput) => {
    await fileGrievance(values);                 // Server Action
    reset();
    onSuccess?.();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* Single-line text input */}
      <Controller
        control={control}
        name="title"
        render={({ field, fieldState }) => (
          <Field
            label="Grievance title"
            required
            helpText="A short summary the panel sees first."
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

      {/* Compound (Combobox wraps the project's headless lib) */}
      <Controller
        control={control}
        name="severity"
        render={({ field, fieldState }) => (
          <Field label="Severity" required errorText={fieldState.error?.message}>
            <Combobox
              value={field.value}
              onValueChange={field.onChange}
              onBlur={field.onBlur}
              options={SEVERITY_OPTIONS}
              invalid={!!fieldState.error}
            />
          </Field>
        )}
      />

      {/* Boolean (Switch — same shape) */}
      <Controller
        control={control}
        name="urgent"
        render={({ field }) => (
          <Field label="Mark as urgent">
            <Switch
              checked={field.value}
              onCheckedChange={field.onChange}
              onBlur={field.onBlur}
            />
          </Field>
        )}
      />

      <button type="submit" disabled={isSubmitting || !isDirty}>
        {isSubmitting ? 'Filing…' : 'File grievance'}
      </button>
    </form>
  );
}
```

## Why `Controller` everywhere (and not `register`)

`register` works for native HTML inputs that forward refs to a real DOM node. **It fails for
most headless components** because they wrap multiple internal elements and don't forward a
single `ref` cleanly. `Controller` makes RHF's state explicit (`field.value`,
`field.onChange`), works with any prop shape (e.g. Switch's `checked` / `onCheckedChange`),
and gives you `fieldState.error` for free.

**Use `register` only** for plain `<input>` / `<textarea>` with no headless wrapping —
which in this kit means almost never (the form primitives baseline wraps every common input
with a headless lib for a11y reasons).

## Resolver shape (RHF ↔ Zod ↔ error messages)

```ts
import { zodResolver } from '@hookform/resolvers/zod';

useForm({
  resolver: zodResolver(CreateGrievanceSchema),
});
```

The resolver runs Zod's `safeParse` on submit (or per the `mode` setting), maps Zod's
`error.issues[*].path` to RHF's nested `formState.errors`, and uses Zod's `message` strings
as the error text. The kit's `<Field>` molecule reads `errorText` and surfaces it via
`role="alert"` + `aria-describedby` (per `form-primitives.md`).

## Async submit + Server Action

`handleSubmit` accepts async functions. `formState.isSubmitting` reflects the promise; the
button disables automatically.

```ts
const onSubmit = async (values: CreateGrievanceInput) => {
  try {
    await fileGrievance(values);   // throws on validation/server error
    reset();
  } catch (err) {
    // Server-returned errors don't flow into formState.errors automatically.
    // The kit's pattern: throw a typed error, catch here, setError per field.
    if (err instanceof ServerValidationError) {
      for (const [name, message] of Object.entries(err.fieldErrors)) {
        setError(name as keyof CreateGrievanceInput, { type: 'server', message });
      }
    }
  }
};
```

## Controlled vs uncontrolled — the kit defaults to uncontrolled

RHF is uncontrolled by design — `register` and `Controller` both internally manage the
state. The kit doesn't expose a "controlled form" pattern; if a parent needs to read form
values mid-edit, use `watch()` or `useWatch()` — don't re-design the form as controlled.

```ts
const titleValue = useWatch({ control, name: 'title' });   // re-renders only when title changes
```

## Form Provider (when the form spans multiple components)

For a wizard or a form split across widgets/features, use `<FormProvider>` so children read
from the same form context without prop-drilling `control`.

```tsx
import { FormProvider, useFormContext } from 'react-hook-form';

<FormProvider {...form}>
  <Step1 />
  <Step2 />
</FormProvider>;

// In Step1.tsx:
const { control } = useFormContext<MyFormInput>();
```

The kit's wizards-as-widgets pattern (`feature-sliced-design.md`) uses this — the wizard
widget owns the FormProvider; each step is a feature that reads from context.

## Sources

- [React Hook Form — Controller](https://react-hook-form.com/docs/usecontroller/controller)
- [`zodResolver`](https://github.com/react-hook-form/resolvers#zod)
- [FormProvider](https://react-hook-form.com/docs/formprovider)
